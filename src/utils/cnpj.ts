import { DocumentType, StoreProfile } from '../types';

/**
 * Removes non-numeric characters from document (CNPJ or CPF)
 */
export function cleanDocument(doc: string): string {
  return (doc || '').replace(/\D/g, '');
}

/**
 * Removes non-numeric characters from CNPJ (kept for backwards compatibility)
 */
export function cleanCnpj(cnpj: string): string {
  return cleanDocument(cnpj);
}

/**
 * Removes non-numeric characters from CPF
 */
export function cleanCpf(cpf: string): string {
  return cleanDocument(cpf);
}

/**
 * Formats a CPF string into XXX.XXX.XXX-XX (11 digits)
 */
export function formatCpf(cpf: string): string {
  const digits = cleanDocument(cpf).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Formats a CNPJ string into XX.XXX.XXX/XXXX-XX (14 digits)
 */
export function formatCnpj(cnpj: string): string {
  const digits = cleanDocument(cnpj).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formats any document based on type or length
 */
export function formatDocument(doc: string, type?: DocumentType): string {
  const digits = cleanDocument(doc);
  if (type === 'CPF' || (!type && digits.length <= 11)) {
    return formatCpf(digits);
  }
  return formatCnpj(digits);
}

/**
 * Validates a Brazilian CPF using official check digits algorithm
 */
export function isValidCpf(cpf: string): boolean {
  const digits = cleanDocument(cpf);
  if (digits.length !== 11) return false;

  // Check for common invalid sequences like 00000000000, 11111111111, etc.
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // Calculate first check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(9), 10)) return false;

  // Calculate second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(digits.charAt(10), 10)) return false;

  return true;
}

/**
 * Validates a Brazilian CNPJ using the check digits algorithm
 */
export function isValidCnpj(cnpj: string): boolean {
  const digits = cleanDocument(cnpj);
  if (digits.length !== 14) return false;

  // Check for common invalid sequences like 00000000000000, 11111111111111
  if (/^(\d)\1{13}$/.test(digits)) return false;

  // Calculate first check digit
  let size = 12;
  let numbers = digits.substring(0, size);
  let pos = size - 7;
  let sum = 0;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(12), 10)) return false;

  // Calculate second check digit
  size = 13;
  numbers = digits.substring(0, size);
  pos = size - 7;
  sum = 0;
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(13), 10)) return false;

  return true;
}

/**
 * Validates document based on DocumentType ('CNPJ' or 'CPF')
 */
export function isValidDocument(doc: string, type: DocumentType): boolean {
  return type === 'CPF' ? isValidCpf(doc) : isValidCnpj(doc);
}

export interface CnpjLookupResult {
  success: boolean;
  profile?: Partial<StoreProfile>;
  message?: string;
  error?: string;
}

/**
 * Helper to format ISO date YYYY-MM-DD to Brazilian DD/MM/AAAA
 */
export function formatIsoDateToBr(dateStr?: string): string {
  if (!dateStr) return '';
  const cleanStr = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(cleanStr)) {
    const [year, month, day] = cleanStr.slice(0, 10).split('-');
    return `${day}/${month}/${year}`;
  }
  return cleanStr;
}

/**
 * Look up CNPJ using server-side API proxy with direct BrasilAPI and ReceitaWS fallbacks
 */
export async function lookupCnpj(rawCnpj: string): Promise<CnpjLookupResult> {
  const clean = cleanCnpj(rawCnpj);
  if (clean.length !== 14) {
    return { success: false, error: 'CNPJ deve conter 14 dígitos numéricos' };
  }

  // 1. Try server-side proxy route (/api/consultar-documento) to prevent any CORS issues
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const proxyRes = await fetch(`/api/consultar-documento?doc=${clean}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (proxyRes.ok) {
      const pData = await proxyRes.json();
      if (pData.success && pData.profile) {
        return {
          success: true,
          profile: {
            cnpj: formatCnpj(clean),
            cleanCnpj: clean,
            documentType: 'CNPJ',
            ...pData.profile,
          },
        };
      }
    }
  } catch {
    // Continue to client-side fallback
  }

  // 2. Direct BrasilAPI client-side lookup (100% free, no token)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const birthOrFoundingDate = formatIsoDateToBr(data.data_inicio_atividade);
      const cepClean = cleanDocument(data.cep || '');
      const formattedCep = cepClean.length === 8 ? `${cepClean.slice(0, 5)}-${cepClean.slice(5)}` : (data.cep || '');

      return {
        success: true,
        profile: {
          cnpj: formatCnpj(clean),
          cleanCnpj: clean,
          documentType: 'CNPJ',
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
      };
    }
  } catch {
    // Continue to ReceitaWS fallback
  }

  // 3. ReceitaWS direct fallback
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const rRes = await fetch(`https://receitaws.com.br/v1/cnpj/${clean}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (rRes.ok) {
      const data = await rRes.json();
      if (data.status !== 'ERROR') {
        const cepClean = cleanDocument(data.cep || '');
        const formattedCep = cepClean.length === 8 ? `${cepClean.slice(0, 5)}-${cepClean.slice(5)}` : (data.cep || '');

        return {
          success: true,
          profile: {
            cnpj: formatCnpj(clean),
            cleanCnpj: clean,
            documentType: 'CNPJ',
            razaoSocial: data.nome || data.fantasia || '',
            nomeFantasia: data.fantasia || data.nome || '',
            dataNascimento: data.abertura || '',
            cep: formattedCep,
            logradouro: data.logradouro || '',
            numero: data.numero || '',
            bairro: data.bairro || '',
            municipio: data.municipio || '',
            uf: data.uf || '',
            telefone: data.telefone || '',
            email: data.email || '',
            situacaoCadastral: data.situacao || '',
          },
        };
      }
    }
  } catch {
    // Fallback to local default
  }

  return { success: false, error: 'Não foi possível consultar este CNPJ nas fontes públicas disponíveis. Nenhum dado foi inventado; preencha manualmente ou tente novamente mais tarde.' };
}

export interface ReceitaFederalCpfInfo {
  cpf: string;
  formattedCpf: string;
  isValid: boolean;
  regiaoFiscalNumero: number;
  regiaoFiscalNome: string;
  estadosAbrangidos: string[];
  officialLookup: false;
  situacaoCadastral: 'Não consultada';
  natureza: 'Pessoa Física';
  mensagem: string;
}

export interface CpfLookupResult {
  success: boolean;
  profile?: Partial<StoreProfile>;
  source?: 'database' | 'profile' | 'visita' | 'service' | 'obra' | 'current_client' | 'new';
  receitaFederal?: ReceitaFederalCpfInfo;
  message?: string;
  error?: string;
  lgpdNotice?: boolean;
}

/** Valida os dígitos do CPF e informa apenas a região fiscal indicativa codificada no 9º dígito.
 * Não consulta titularidade, endereço nem situação cadastral na Receita Federal.
 */
export function getReceitaFederalCpfInfo(rawCpf: string): ReceitaFederalCpfInfo | null {
  const clean = cleanDocument(rawCpf);
  if (clean.length !== 11 || !isValidCpf(clean)) return null;

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
  return {
    cpf: clean,
    formattedCpf: formatCpf(clean),
    isValid: true,
    regiaoFiscalNumero: region.numero,
    regiaoFiscalNome: region.nome,
    estadosAbrangidos: region.estados,
    officialLookup: false,
    situacaoCadastral: 'Não consultada',
    natureza: 'Pessoa Física',
    mensagem: 'CPF validado pelos dígitos verificadores. Não houve consulta oficial de titularidade ou situação cadastral.',
  };
}

/** Valida CPF e reaproveita somente dados históricos existentes; nunca inventa endereço ou situação cadastral. */
export function lookupCpf(
  rawCpf: string,
  context?: {
    stores?: StoreProfile[];
    user?: any;
    visitas?: any[];
    services?: any[];
    obras?: any[];
  }
): CpfLookupResult {
  const clean = cleanDocument(rawCpf);
  if (clean.length !== 11) return { success: false, error: 'CPF deve conter exatamente 11 dígitos numéricos.' };
  if (!isValidCpf(clean)) return { success: false, error: 'CPF inválido: os dígitos verificadores não conferem.' };

  const cpfInfo = getReceitaFederalCpfInfo(clean) || undefined;
  const baseProfile: Partial<StoreProfile> = {
    cnpj: formatCpf(clean), cleanCnpj: clean, documentType: 'CPF',
    situacaoCadastral: 'Não consultada',
    atividadePrincipal: 'Pessoa Física / Contratante Residencial',
  };
  const localMessage = 'CPF validado pelos dígitos verificadores. Dados encontrados no histórico local; confira antes de salvar. A situação cadastral não foi consultada.';

  let storesList = context?.stores;
  if (!storesList && typeof window !== 'undefined') {
    try { storesList = JSON.parse(localStorage.getItem('gestao_servicos_stores_v1') || '[]'); } catch {}
  }
  const existingStore = storesList?.find((store) => cleanDocument(store.cleanCnpj || store.cnpj) === clean);
  if (existingStore) {
    return { success: true, source: 'database', receitaFederal: cpfInfo, message: localMessage, profile: {
      ...baseProfile,
      nomeFantasia: existingStore.nomeFantasia || '', razaoSocial: existingStore.razaoSocial || existingStore.nomeFantasia || '',
      dataNascimento: existingStore.dataNascimento || '', cep: existingStore.cep || '', logradouro: existingStore.logradouro || '',
      numero: existingStore.numero || '', bairro: existingStore.bairro || '', municipio: existingStore.municipio || '', uf: existingStore.uf || '',
      telefone: existingStore.telefone || '', email: existingStore.email || '', ownerEmail: existingStore.ownerEmail || '',
      atividadePrincipal: existingStore.atividadePrincipal || baseProfile.atividadePrincipal,
    } };
  }

  if (typeof window !== 'undefined') {
    try {
      const profiles = JSON.parse(localStorage.getItem('gestao_servicos_user_profiles_v2') || '{}');
      for (const profileEmail of Object.keys(profiles)) {
        const profile = profiles[profileEmail];
        const primary = cleanDocument(profile.clientDocument || '');
        const documents = (profile.clientDocuments || []).map((item: string) => cleanDocument(item));
        if ((primary && primary === clean) || documents.includes(clean)) {
          return { success: true, source: 'profile', receitaFederal: cpfInfo, message: localMessage, profile: {
            ...baseProfile, nomeFantasia: profile.name || '', razaoSocial: profile.name || '', dataNascimento: profile.dataNascimento || profile.birthDate || '',
            cep: profile.cep || '', logradouro: profile.logradouro || '', numero: profile.numero || '', bairro: profile.bairro || '',
            municipio: profile.municipio || '', uf: profile.uf || '', email: profile.email || profileEmail,
            ownerEmail: profile.email || profileEmail, telefone: profile.phone || '',
          } };
        }
      }
    } catch {}
  }

  let visitasList = context?.visitas;
  if (!visitasList && typeof window !== 'undefined') {
    try { visitasList = JSON.parse(localStorage.getItem('gestao_servicos_visitas_v1') || '[]'); } catch {}
  }
  const matchedVisita = visitasList?.find((visita) => cleanDocument(visita.clientDocument || '') === clean);
  if (matchedVisita) {
    return { success: true, source: 'visita', receitaFederal: cpfInfo, message: localMessage, profile: {
      ...baseProfile, nomeFantasia: matchedVisita.clientName || '', razaoSocial: matchedVisita.clientName || '',
      telefone: matchedVisita.clientPhone || '', logradouro: matchedVisita.address || '', cep: matchedVisita.cep || '',
      bairro: matchedVisita.bairro || '', municipio: matchedVisita.municipio || '', uf: matchedVisita.uf || '',
    } };
  }

  let servicesList = context?.services;
  if (!servicesList && typeof window !== 'undefined') {
    try { servicesList = JSON.parse(localStorage.getItem('gestao_servicos_services_v1') || '[]'); } catch {}
  }
  const matchedService = servicesList?.find((service: any) => cleanDocument(service.clientDocument || service.storeCnpj || '') === clean);
  if (matchedService?.storeName) {
    return { success: true, source: 'service', receitaFederal: cpfInfo, message: localMessage, profile: {
      ...baseProfile, nomeFantasia: matchedService.storeName, razaoSocial: matchedService.storeName,
      logradouro: matchedService.location || '', bairro: matchedService.bairro || '', municipio: matchedService.municipio || '', uf: matchedService.uf || '',
    } };
  }

  let obrasList = context?.obras;
  if (!obrasList && typeof window !== 'undefined') {
    try { obrasList = JSON.parse(localStorage.getItem('gestao_servicos_obras_v1') || '[]'); } catch {}
  }
  const matchedObra = obrasList?.find((obra: any) => cleanDocument(obra.clientDocument || '') === clean);
  if (matchedObra && (matchedObra.clientName || matchedObra.name)) {
    return { success: true, source: 'obra', receitaFederal: cpfInfo, message: localMessage, profile: {
      ...baseProfile, nomeFantasia: matchedObra.clientName || matchedObra.name, razaoSocial: matchedObra.clientName || matchedObra.name,
      logradouro: matchedObra.address || matchedObra.location || '', cep: matchedObra.cep || '',
      bairro: matchedObra.bairro || '', municipio: matchedObra.city || '', uf: matchedObra.state || '',
    } };
  }

  if (context?.user?.role === 'client') {
    const primary = cleanDocument(context.user.clientDocument || '');
    const documents = (context.user.clientDocuments || []).map((item: string) => cleanDocument(item));
    if ((primary && primary === clean) || documents.includes(clean)) {
      return { success: true, source: 'current_client', receitaFederal: cpfInfo, message: localMessage, profile: {
        ...baseProfile, nomeFantasia: context.user.name || '', razaoSocial: context.user.name || '',
        dataNascimento: context.user.dataNascimento || context.user.birthDate || '', cep: context.user.cep || '',
        logradouro: context.user.logradouro || '', numero: context.user.numero || '', bairro: context.user.bairro || '',
        municipio: context.user.municipio || '', uf: context.user.uf || '', email: context.user.email || '',
        ownerEmail: context.user.email || '', telefone: context.user.phone || '',
      } };
    }
  }

  const clientName = context?.user?.role === 'client' ? (context.user.name || '') : '';
  const clientEmail = context?.user?.role === 'client' ? (context.user.email || '') : '';
  return {
    success: true, source: 'new', receitaFederal: cpfInfo, lgpdNotice: true,
    message: 'CPF validado pelos dígitos verificadores. Não houve consulta oficial de titularidade, endereço ou situação cadastral. Informe os dados do titular manualmente.',
    profile: {
      ...baseProfile, nomeFantasia: clientName, razaoSocial: clientName, dataNascimento: '', cep: '', logradouro: '',
      numero: '', bairro: '', municipio: '', uf: '', telefone: '', email: clientEmail, ownerEmail: clientEmail,
    },
  };
}

export interface CepLookupResult {
  success: boolean;
  logradouro?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  error?: string;
}

/**
 * Unified async document lookup function for both CPF and CNPJ
 */
export async function lookupDocument(
  rawDoc: string,
  context?: {
    stores?: StoreProfile[];
    user?: any;
    visitas?: any[];
    services?: any[];
    obras?: any[];
  }
): Promise<CnpjLookupResult | CpfLookupResult> {
  const clean = cleanDocument(rawDoc);
  if (clean.length === 14) {
    return lookupCnpj(clean);
  }
  if (clean.length === 11) {
    const localResult = lookupCpf(clean, context);
    // If we have an existing name in localResult, return it right away
    if (localResult.success && localResult.profile?.nomeFantasia) {
      return localResult;
    }
    // Try server-side lookup
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`/api/consultar-documento?doc=${clean}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const sData = await res.json();
        if (sData.success && sData.profile) {
          return {
            ...localResult,
            profile: {
              ...localResult.profile,
              ...sData.profile,
            },
            receitaFederal: {
              ...(localResult.receitaFederal || {}),
              ...(sData.receitaFederal || {}),
              estadosAbrangidos: (sData.receitaFederal?.estadosAbrangidos && sData.receitaFederal.estadosAbrangidos.length > 0)
                ? sData.receitaFederal.estadosAbrangidos
                : (localResult.receitaFederal?.estadosAbrangidos || []),
            },
          };
        }
      }
    } catch {}
    return localResult;
  }
  return {
    success: false,
    error: 'Documento deve conter 11 dígitos (CPF) ou 14 dígitos (CNPJ).',
  };
}

/**
 * Public CEP Lookup using BrasilAPI with ViaCEP fallback
 * Allows instant automatic filling of street, neighborhood, city and state
 */
export async function lookupCep(rawCep: string): Promise<CepLookupResult> {
  const clean = cleanDocument(rawCep).slice(0, 8);
  if (clean.length !== 8) {
    return { success: false, error: 'CEP deve conter 8 dígitos numéricos.' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${clean}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        cep: `${clean.slice(0, 5)}-${clean.slice(5, 8)}`,
        logradouro: data.street || '',
        bairro: data.neighborhood || '',
        municipio: data.city || '',
        uf: data.state || '',
      };
    }
  } catch {}

  // Fallback to ViaCEP
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (!data.erro) {
        return {
          success: true,
          cep: `${clean.slice(0, 5)}-${clean.slice(5, 8)}`,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          municipio: data.localidade || '',
          uf: data.uf || '',
        };
      }
    }
  } catch {}

  return { success: false, error: 'CEP não encontrado ou serviço indisponível.' };
}

