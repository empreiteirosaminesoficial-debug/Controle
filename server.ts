import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json({ limit: '25mb' }));

  // Rotas administrativas validam o ID token diretamente no Firebase Auth.
  // Nunca confia em e-mail, papel ou UID enviados no corpo da requisição.
  const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
  let firebaseApiKey = process.env.FIREBASE_API_KEY || '';
  try {
    if (!firebaseApiKey && fs.existsSync(firebaseConfigPath)) {
      const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
      firebaseApiKey = config.apiKey || '';
    }
  } catch (error) {
    console.error('[Auth] Não foi possível carregar a configuração pública do Firebase.');
  }

  const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      const authorization = req.headers.authorization || '';
      const tokenMatch = authorization.match(/^Bearer\s+(.+)$/i);
      if (!tokenMatch) {
        res.status(401).json({ message: 'Autenticação Firebase obrigatória.' });
        return;
      }
      if (!firebaseApiKey) {
        res.status(503).json({ message: 'Verificação de autenticação indisponível no servidor.' });
        return;
      }

      const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: tokenMatch[1] }),
      });
      if (!verifyResponse.ok) {
        res.status(401).json({ message: 'Sessão Firebase inválida ou expirada.' });
        return;
      }
      const verification = await verifyResponse.json() as { users?: Array<{ email?: string; emailVerified?: boolean }> };
      const verifiedUser = verification.users?.[0];
      if (verifiedUser?.email?.trim().toLowerCase() !== 'empreiteirosaminesoficial@gmail.com' || verifiedUser.emailVerified !== true) {
        res.status(403).json({ message: 'Apenas o administrador verificado pode executar esta operação.' });
        return;
      }
      next();
    })().catch((error) => {
      console.error('[Auth] Falha ao validar token Firebase:', error?.message || 'erro desconhecido');
      if (!res.headersSent) res.status(503).json({ message: 'Não foi possível validar a sessão no momento.' });
    });
  };

  // Helper function to format ISO date YYYY-MM-DD to DD/MM/AAAA
  function formatIsoDateToBr(dateStr?: string): string {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
      const [year, month, day] = cleanStr.slice(0, 10).split('-');
      return `${day}/${month}/${year}`;
    }
    return cleanStr;
  }

  // Helper function to format CEP 00000000 to 00000-000
  function formatCep(cepStr?: string): string {
    if (!cepStr) return '';
    const digits = cepStr.replace(/\D/g, '').slice(0, 8);
    if (digits.length === 8) {
      return `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    return digits;
  }

  // 1. Free Public Document Lookup API (CNPJ & CPF)
  app.all(['/api/consultar-documento', '/api/consulta-documento'], async (req: Request, res: Response) => {
    try {
      const rawDoc = (req.query.doc || req.body?.doc || req.body?.documento || '').toString();
      const clean = rawDoc.replace(/\D/g, '');

      if (!clean) {
        return res.status(400).json({ success: false, message: 'Documento não informado (informe CPF ou CNPJ).' });
      }

      // Check if CNPJ (14 digits)
      if (clean.length === 14) {
        // Step 1: BrasilAPI (Free, no token required)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const bResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (bResponse.ok) {
            const data: any = await bResponse.json();
            const birthOrFoundingDate = formatIsoDateToBr(data.data_inicio_atividade);
            const formattedCep = formatCep(data.cep);

            return res.json({
              success: true,
              tipo: 'CNPJ',
              source: 'brasilapi',
              documento: clean,
              profile: {
                razaoSocial: data.razao_social || data.nome_fantasia || '',
                nomeFantasia: data.nome_fantasia || data.razao_social || '',
                dataNascimento: birthOrFoundingDate,
                cep: formattedCep,
                logradouro: data.logradouro || '',
                numero: data.numero || '',
                bairro: data.bairro || '',
                municipio: data.municipio || '',
                uf: data.uf || '',
                telefone: data.ddd_telefone_1 || '',
                email: data.email || '',
                atividadePrincipal: data.cnae_fiscal_descricao || '',
                situacaoCadastral: data.descricao_situacao_cadastral || '',
              },
            });
          }
        } catch (bErr) {
          console.warn('BrasilAPI CNPJ lookup timed out or failed, attempting ReceitaWS fallback:', bErr);
        }

        // Step 2: ReceitaWS Fallback (Free tier)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const rResponse = await fetch(`https://receitaws.com.br/v1/cnpj/${clean}`, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (rResponse.ok) {
            const data: any = await rResponse.json();
            if (data.status !== 'ERROR') {
              return res.json({
                success: true,
                tipo: 'CNPJ',
                source: 'receitaws',
                documento: clean,
                profile: {
                  razaoSocial: data.nome || data.fantasia || '',
                  nomeFantasia: data.fantasia || data.nome || '',
                  dataNascimento: data.abertura || '',
                  cep: formatCep(data.cep),
                  logradouro: data.logradouro || '',
                  numero: data.numero || '',
                  bairro: data.bairro || '',
                  municipio: data.municipio || '',
                  uf: data.uf || '',
                  telefone: data.telefone || '',
                  email: data.email || '',
                  situacaoCadastral: data.situacao || '',
                },
              });
            }
          }
        } catch (rErr) {
          console.warn('ReceitaWS CNPJ fallback failed:', rErr);
        }

        return res.status(404).json({
          success: false,
          tipo: 'CNPJ',
          message: 'CNPJ não encontrado nas fontes públicas consultadas ou serviços temporariamente indisponíveis.',
        });
      }

      // CPF: valida apenas os dígitos verificadores. Não existe consulta oficial de titularidade/status neste endpoint.
      if (clean.length === 11) {
        let sum = 0;
        for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
        let digit = 11 - (sum % 11);
        if (digit === 10 || digit === 11) digit = 0;
        const validFirst = digit === parseInt(clean.charAt(9), 10);

        sum = 0;
        for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
        digit = 11 - (sum % 11);
        if (digit === 10 || digit === 11) digit = 0;
        const validSecond = digit === parseInt(clean.charAt(10), 10);

        if (!validFirst || !validSecond || /^(\d)\1{10}$/.test(clean)) {
          return res.status(400).json({ success: false, tipo: 'CPF', message: 'CPF inválido: os dígitos verificadores não conferem.' });
        }

        const regionDigit = parseInt(clean.charAt(8), 10);
        const regionMap: Record<number, { numero: number; nome: string; estados: string[] }> = {
          1: { numero: 1, nome: '1ª Região Fiscal', estados: ['DF', 'GO', 'MT', 'MS', 'TO'] },
          2: { numero: 2, nome: '2ª Região Fiscal', estados: ['AC', 'AM', 'AP', 'PA', 'RO', 'RR'] },
          3: { numero: 3, nome: '3ª Região Fiscal', estados: ['CE', 'MA', 'PI'] },
          4: { numero: 4, nome: '4ª Região Fiscal', estados: ['AL', 'PB', 'PE', 'RN'] },
          5: { numero: 5, nome: '5ª Região Fiscal', estados: ['BA', 'SE'] },
          6: { numero: 6, nome: '6ª Região Fiscal', estados: ['MG'] },
          7: { numero: 7, nome: '7ª Região Fiscal', estados: ['ES', 'RJ'] },
          8: { numero: 8, nome: '8ª Região Fiscal', estados: ['SP'] },
          9: { numero: 9, nome: '9ª Região Fiscal', estados: ['PR', 'SC'] },
          0: { numero: 10, nome: '10ª Região Fiscal', estados: ['RS'] },
        };
        const region = regionMap[regionDigit];
        return res.json({
          success: true,
          tipo: 'CPF',
          source: 'check_digits_only',
          officialLookup: false,
          documento: clean,
          profile: {},
          receitaFederal: {
            cpf: clean,
            formattedCpf: `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`,
            isValid: true,
            regiaoFiscalNumero: region.numero,
            regiaoFiscalNome: region.nome,
            estadosAbrangidos: region.estados,
            officialLookup: false,
            situacaoCadastral: 'Não consultada',
            mensagem: 'Validação matemática dos dígitos. Não houve consulta oficial de titularidade, endereço ou situação cadastral.',
          },
          message: 'CPF validado pelos dígitos verificadores. Informe os dados pessoais manualmente ou confira dados históricos locais.',
        });
      }

      return res.status(400).json({
        success: false,
        message: 'Documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ).',
      });
    } catch (err: any) {
      console.error('Erro na consulta de documento:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Erro interno na consulta.' });
    }
  });

  // WhatsApp: contato feito diretamente pelo link wa.me no navegador, sem API ou proxy no servidor.

  // 5. Upload and update PWA Logo across all assets with Sharp Icon Resizing
  app.post('/api/upload-logo', requireAdmin, async (req: Request, res: Response) => {
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ message: 'Nenhuma imagem foi enviada.' });
      }

      const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      const buffer = matches && matches[2]
        ? Buffer.from(matches[2], 'base64')
        : Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');

      const publicDir = path.resolve(__dirname, 'public');
      const distDir = path.resolve(__dirname, 'dist');

      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      // Generate pristine multi-resolution icons using sharp
      let compressedBase64 = imageBase64;
      try {
        const buf512 = await sharp(buffer)
          .resize(512, 512, { fit: 'inside' })
          .png({ quality: 90, compressionLevel: 8 })
          .toBuffer();
        compressedBase64 = `data:image/png;base64,${buf512.toString('base64')}`;

        const buf192 = await sharp(buffer).resize(192, 192, { fit: 'inside' }).png().toBuffer();
        const buf256 = await sharp(buffer).resize(256, 256, { fit: 'inside' }).png().toBuffer();
        const buf384 = await sharp(buffer).resize(384, 384, { fit: 'inside' }).png().toBuffer();
        const buf180 = await sharp(buffer).resize(180, 180, { fit: 'inside' }).png().toBuffer();
        const buf32 = await sharp(buffer).resize(32, 32, { fit: 'inside' }).png().toBuffer();

        fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);
        fs.writeFileSync(path.join(publicDir, 'logo-transparent.png'), buf512);
        fs.writeFileSync(path.join(publicDir, 'logo-512.png'), buf512);
        fs.writeFileSync(path.join(publicDir, 'logo-maskable-512.png'), buf512);
        fs.writeFileSync(path.join(publicDir, 'logo-384.png'), buf384);
        fs.writeFileSync(path.join(publicDir, 'logo-256.png'), buf256);
        fs.writeFileSync(path.join(publicDir, 'logo-192.png'), buf192);
        fs.writeFileSync(path.join(publicDir, 'logo-maskable-192.png'), buf192);
        fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf180);
        fs.writeFileSync(path.join(publicDir, 'favicon-32.png'), buf32);

        if (fs.existsSync(distDir)) {
          fs.writeFileSync(path.join(distDir, 'logo.png'), buffer);
          fs.writeFileSync(path.join(distDir, 'logo-transparent.png'), buf512);
          fs.writeFileSync(path.join(distDir, 'logo-512.png'), buf512);
          fs.writeFileSync(path.join(distDir, 'logo-maskable-512.png'), buf512);
          fs.writeFileSync(path.join(distDir, 'logo-384.png'), buf384);
          fs.writeFileSync(path.join(distDir, 'logo-256.png'), buf256);
          fs.writeFileSync(path.join(distDir, 'logo-192.png'), buf192);
          fs.writeFileSync(path.join(distDir, 'logo-maskable-192.png'), buf192);
          fs.writeFileSync(path.join(distDir, 'apple-touch-icon.png'), buf180);
          fs.writeFileSync(path.join(distDir, 'favicon-32.png'), buf32);
        }
      } catch (sharpErr) {
        console.warn('Fallback ao salvar logo sem sharp:', sharpErr);
        fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);
        fs.writeFileSync(path.join(publicDir, 'logo-transparent.png'), buffer);
      }

      return res.json({
        success: true,
        message: 'Logotipo atualizado com sucesso em todos os recursos do PWA!',
        compressedBase64,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Erro ao salvar logo:', error);
      return res.status(500).json({ message: error?.message || 'Falha ao salvar imagem do logotipo.' });
    }
  });

  // GET current app logo info and version
  app.get('/api/app-logo', (_req: Request, res: Response) => {
    try {
      const logoPath = path.resolve(__dirname, 'public', 'logo-transparent.png');
      if (fs.existsSync(logoPath)) {
        const stats = fs.statSync(logoPath);
        return res.json({
          success: true,
          logoUrl: `/logo-transparent.png?v=${stats.mtimeMs}`,
          updatedAt: stats.mtime.toISOString(),
        });
      }
      return res.json({ success: true, logoUrl: '/logo-transparent.png' });
    } catch {
      return res.json({ success: true, logoUrl: '/logo-transparent.png' });
    }
  });

  // Web App Manifest com no-cache e injeção de versão de ícones em tempo real
  app.get(['/manifest.json', '/manifest.webmanifest'], (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    try {
      const manifestPath = path.resolve(__dirname, 'public', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const raw = fs.readFileSync(manifestPath, 'utf8');
        const manifest = JSON.parse(raw);
        const logoPath = path.resolve(__dirname, 'public', 'logo-transparent.png');
        const v = fs.existsSync(logoPath) ? Math.floor(fs.statSync(logoPath).mtimeMs) : Date.now();
        if (Array.isArray(manifest.icons)) {
          manifest.icons = manifest.icons.map((ic: any) => ({
            ...ic,
            src: ic.src.split('?')[0] + `?v=${v}`,
          }));
        }
        return res.json(manifest);
      }
    } catch (err) {
      console.warn('Erro ao servir manifest dinâmico:', err);
    }
    return res.sendFile(path.resolve(__dirname, 'public', 'manifest.json'));
  });

  // Service Worker sem cache intermediário para permitir atualização imediata do PWA
  app.get('/sw.js', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.resolve(__dirname, 'public', 'sw.js'));
  });

  // 8. Google Play Digital Asset Links for TWA (Android APK / Play Store)
  app.get('/.well-known/assetlinks.json', (_req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    const assetlinksPath = path.resolve(__dirname, 'public', '.well-known', 'assetlinks.json');
    if (fs.existsSync(assetlinksPath)) {
      return res.sendFile(assetlinksPath);
    }
    return res.json([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.empreiteirosamines.app',
          sha256_cert_fingerprints: [
            '14:6D:E9:7D:0F:52:AB:7B:8E:22:98:8C:87:66:35:E1:68:57:3E:45:9E:C9:83:8B:2A:42:35:10:7C:3A:FB:65'
          ]
        }
      }
    ]);
  });

  // 9. Download completo do código-fonte do PWA em ZIP
  app.get(['/api/download-pwa-zip', '/download-pwa-zip', '/api/download-project-zip'], requireAdmin, (_req: Request, res: Response) => {
    try {
      const zipPath = path.resolve(__dirname, 'public', 'empreiteiro-samines-pwa-codigo-completo.zip');
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="empreiteiro-samines-pwa-codigo-completo.zip"');
      return res.sendFile(zipPath);
    } catch (err: any) {
      console.error('Erro ao disponibilizar ZIP:', err);
      return res.status(500).json({ error: 'Erro ao gerar download do arquivo ZIP.' });
    }
  });

  // --- Serve Application ---
  const isDev = process.env.NODE_ENV === 'development';
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'));

  if (!isDev && hasDist) {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development mode with Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Empreiteiro Saminês rodando na porta ${PORT}`);
  });
}

startServer();
