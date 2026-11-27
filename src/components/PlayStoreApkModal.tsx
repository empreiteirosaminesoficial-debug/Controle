import React, { useState } from 'react';
import { publishApkRelease } from '../utils/apkRelease';
import { 
  X, 
  Smartphone, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Play, 
  Share2,
  FileCode,
  Sparkles,
  HelpCircle,
  QrCode,
  Upload
} from 'lucide-react';
import { useAppLogo } from '../utils/logoManager';

interface PlayStoreApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PlayStoreApkModal: React.FC<PlayStoreApkModalProps> = ({ isOpen, onClose }) => {
  const { logoUrl } = useAppLogo();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pwabuilder' | 'direct_install' | 'console_guide' | 'publish'>('pwabuilder');
  const [apkFile, setApkFile] = useState<File | null>(null);
  const [apkVersion, setApkVersion] = useState('1.0.0');
  const [isPublishingApk, setIsPublishingApk] = useState(false);
  const [apkPublishMessage, setApkPublishMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-vyyn7cpx3u23hhljqmdfwa-807875782195.us-east1.run.app';
  // Use shared pre URL or current origin if running on real domain
  const productionUrl = currentOrigin.includes('localhost') 
    ? 'https://ais-pre-vyyn7cpx3u23hhljqmdfwa-807875782195.us-east1.run.app'
    : currentOrigin;

  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(productionUrl)}`;
  const packageId = 'com.empreiteirosamines.app';

  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header com estilo Google Play / Android */}
        <div className="bg-linear-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 relative overflow-hidden shrink-0">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 flex items-center justify-center shrink-0">
                <img
                  src={logoUrl || "/logo-transparent.png"}
                  alt="Logo Empreiteiro Saminês"
                  className="w-full h-full object-contain drop-shadow-md"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Gerador de APK & Play Store
                  </h2>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    PWA Android
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Publique o app <strong>Empreiteiro Saminês</strong> na Google Play Store ou gere o APK para instalar no celular
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('pwabuilder')}
            className={`py-2.5 px-4 rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'pwabuilder'
                ? 'bg-white border-emerald-600 text-emerald-800 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Gerar APK & Play Store (AAB)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('direct_install')}
            className={`py-2.5 px-4 rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'direct_install'
                ? 'bg-white border-sky-600 text-sky-800 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-sky-600" />
            <span>Instalar no Celular Agora</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('publish')}
            className={`py-2.5 px-4 rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'publish'
                ? 'bg-white border-violet-600 text-violet-800 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4 text-violet-600" />
            <span>Enviar APK para clientes</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('console_guide')}
            className={`py-2.5 px-4 rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
              activeTab === 'console_guide'
                ? 'bg-white border-slate-800 text-slate-900 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-slate-700" />
            <span>Passo a Passo Play Console</span>
          </button>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-xs">
          
          {/* TAB 1: GERAR APK & AAB VIA PWABUILDER */}
          {activeTab === 'pwabuilder' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Card Destaque: Botão PWABuilder Oficial */}
              <div className="p-4 sm:p-5 bg-linear-to-br from-emerald-50 via-white to-sky-50 rounded-2xl border-2 border-emerald-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-emerald-800 tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      Gerador Automático Oficial (PWABuilder / Google TWA)
                    </span>
                    <h3 className="text-base font-black text-slate-900 mt-1">
                      Gerar Pacote Android (APK + AAB) em 1 Clique
                    </h3>
                    <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                      O <strong>PWABuilder</strong> (ferramenta padrão recomendada pelo Google) analisa seu PWA e empacota instantaneamente o <strong>APK instalável</strong> para Android e o <strong>AAB assinado</strong> exigido para publicação na Google Play Store.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-2.5">
                  <a
                    href={pwaBuilderUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition transform hover:-translate-y-0.5 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Abrir PWABuilder & Baixar Pacote Play Store</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopy(productionUrl, 'prodUrl')}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl shadow-2xs transition cursor-pointer"
                  >
                    {copiedField === 'prodUrl' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">URL Copiada!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copiar URL do App</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Informações Técnicas do Pacote Prontas */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-sky-600" />
                  Dados Configurados para o Pacote Android
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Package Name (ID)</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <strong className="font-mono text-slate-900 text-xs">{packageId}</strong>
                      <button
                        onClick={() => handleCopy(packageId, 'packageId')}
                        className="text-slate-400 hover:text-sky-600 p-1"
                        title="Copiar Package ID"
                      >
                        {copiedField === 'packageId' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Nome do App na Tela Inicial</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <strong className="text-slate-900 text-xs">Empreiteiro Saminês</strong>
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">v1.0.0</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-slate-200 sm:col-span-2">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Verificação Digital Asset Links (Ativo no Servidor)</span>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <code className="text-[11px] font-mono text-emerald-700 truncate">
                        {productionUrl}/.well-known/assetlinks.json
                      </code>
                      <a
                        href="/.well-known/assetlinks.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-800 font-bold underline shrink-0 flex items-center gap-1 text-[11px]"
                      >
                        <span>Ver JSON</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status de Auditoria do PWA */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold uppercase text-emerald-900 tracking-wider">
                  Checklist de Conformidade Play Store & PWA
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Web App Manifest V2 (100% Válido)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ícones 192x192 e 512x512 com Maskable</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Service Worker com Suporte Offline</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>HTTPS com Certificado SSL Ativo</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INSTALAÇÃO DIRETA NO CELULAR SEM PRECISAR DE APK */}
          {activeTab === 'direct_install' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl space-y-2">
                <h3 className="font-extrabold text-sky-950 text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-sky-600" />
                  Instale Direto pelo Navegador com 1 Toque (Mais Rápido e Sem Burocracia)
                </h3>
                <p className="text-sky-900 text-xs leading-relaxed">
                  Como este sistema é um <strong>PWA (Progressive Web App)</strong>, você e seus clientes <strong>não precisam passar pela Play Store</strong> para ter o aplicativo instalado no celular com ícone na gaveta de aplicativos e inicialização em tela cheia.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                  Passo a passo no Android (Chrome):
                </h4>

                <ol className="space-y-2.5">
                  <li className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-900 block font-bold">Abra o link no Google Chrome no celular</strong>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        Acesse a URL do sistema no navegador do seu smartphone Android.
                      </span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-900 block font-bold">Toque nos 3 pontinhos (Menu do Chrome)</strong>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        No canto superior direito da tela do celular.
                      </span>
                    </div>
                  </li>

                  <li className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div>
                      <strong className="text-emerald-950 block font-bold">
                        Toque em "Instalar Aplicativo" ou "Adicionar à Tela Inicial"
                      </strong>
                      <span className="text-emerald-800 text-[11px] block mt-0.5">
                        O Android criará o app nativo automaticamente na tela com o logotipo oficial do Empreiteiro Saminês.
                      </span>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Compartilhar link */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="text-slate-900 block font-bold">Link de Instalação para Clientes:</strong>
                  <span className="text-slate-500 text-[11px] font-mono break-all">{productionUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(productionUrl, 'shareLink')}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {copiedField === 'shareLink' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copiar Link</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PASSO A PASSO NA GOOGLE PLAY CONSOLE */}
          {activeTab === 'console_guide' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
                <h3 className="font-extrabold text-sm flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  Como Publicar na Google Play Store (Conta Desenvolvedor)
                </h3>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Para que o app apareça na loja pública da Google Play Store, você precisa de uma conta de desenvolvedor do Google (taxa única de $25 paga ao Google).
                </p>
              </div>

              <div className="space-y-2.5">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-600 text-white font-extrabold text-[11px] rounded-full flex items-center justify-center">1</span>
                    <strong className="text-slate-900 font-bold">Gerar o arquivo .AAB no PWABuilder</strong>
                  </div>
                  <p className="text-slate-600 text-[11px] pl-7">
                    Na primeira aba, clique em "Abrir PWABuilder", selecione a opção <strong>Android</strong> e clique em <strong>"Generate Package"</strong>. Ele baixará um arquivo compactado contendo o arquivo <code>app-release.aab</code>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-600 text-white font-extrabold text-[11px] rounded-full flex items-center justify-center">2</span>
                    <strong className="text-slate-900 font-bold">Acesse o Google Play Console</strong>
                  </div>
                  <p className="text-slate-600 text-[11px] pl-7">
                    Acesse <a href="https://play.google.com/console" target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold underline">play.google.com/console</a> e clique no botão <strong>"Criar App"</strong>.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-600 text-white font-extrabold text-[11px] rounded-full flex items-center justify-center">3</span>
                    <strong className="text-slate-900 font-bold">Fazer Upload do Arquivo .AAB</strong>
                  </div>
                  <p className="text-slate-600 text-[11px] pl-7">
                    No menu lateral, vá em <strong>Produção &gt; Criar nova versão</strong> e envie o arquivo <code>.aab</code> gerado.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 bg-emerald-600 text-white font-extrabold text-[11px] rounded-full flex items-center justify-center">4</span>
                    <strong className="text-slate-900 font-bold">Preencher a Ficha da Play Store & Enviar para Análise</strong>
                  </div>
                  <p className="text-slate-600 text-[11px] pl-7">
                    Adicione descrição da empresa, o logotipo oficial e capturas de tela. Em poucos dias a equipe do Google aprova o aplicativo na loja!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PUBLICAR ARQUIVO APK PARA CLIENTES */}
          {activeTab === 'publish' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-4 bg-violet-50 border border-violet-200 rounded-2xl space-y-2">
                <h3 className="font-extrabold text-violet-950 text-sm">Disponibilizar APK para os clientes</h3>
                <p className="text-violet-900 text-xs leading-relaxed">
                  Selecione um arquivo APK já gerado, informe a versão e publique. O arquivo ficará disponível na página Conheça a Empresa para clientes autenticados.
                </p>
              </div>

              <form
                className="space-y-3 p-4 border border-slate-200 rounded-2xl"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!apkFile) {
                    setApkPublishMessage('Selecione o arquivo APK antes de publicar.');
                    return;
                  }
                  setIsPublishingApk(true);
                  setApkPublishMessage(null);
                  try {
                    const release = await publishApkRelease(apkFile, apkVersion);
                    setApkPublishMessage(`APK ${release.version} publicado com sucesso para os clientes.`);
                    setApkFile(null);
                    const fileInput = document.getElementById('published-apk-file') as HTMLInputElement | null;
                    if (fileInput) fileInput.value = '';
                  } catch (error: any) {
                    setApkPublishMessage(error?.message || 'Não foi possível publicar o APK.');
                  } finally {
                    setIsPublishingApk(false);
                  }
                }}
              >
                <div>
                  <label htmlFor="published-apk-file" className="block text-xs font-bold text-slate-700 mb-1">Arquivo APK</label>
                  <input
                    id="published-apk-file"
                    type="file"
                    accept=".apk,application/vnd.android.package-archive"
                    onChange={(event) => setApkFile(event.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Tamanho máximo: 200 MB.</p>
                </div>
                <div>
                  <label htmlFor="published-apk-version" className="block text-xs font-bold text-slate-700 mb-1">Versão do aplicativo</label>
                  <input
                    id="published-apk-version"
                    value={apkVersion}
                    onChange={(event) => setApkVersion(event.target.value)}
                    placeholder="Ex.: 1.0.1"
                    maxLength={32}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!apkFile || isPublishingApk}
                  className="px-4 py-2.5 rounded-xl bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {isPublishingApk ? 'Publicando APK...' : 'Publicar APK para clientes'}
                </button>
                {apkPublishMessage && (
                  <p role="status" className="text-xs font-semibold text-slate-700">{apkPublishMessage}</p>
                )}
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>PWA Totalmente Otimizado para Android & Play Store</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
