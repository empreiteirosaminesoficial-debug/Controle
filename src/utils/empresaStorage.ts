import { EmpresaProfile } from '../types';

const STORAGE_KEY = 'samines_empresa_profile_v2';

export const INITIAL_EMPRESA_DATA: EmpresaProfile = {
  nomeFantasia: 'Empreiteiro Saminês - Obras e Reformas',
  razaoSocial: 'Saminês Empreendimentos & Construções Ltda',
  cnpj: '51.849.204/0001-88',
  responsavelTecnico: 'Saminês (Mestre de Obras & Gestor Técnico)',
  regiaoAtendimento: 'Grande São Paulo, Jundiaí, Campinas e Interior',
  emissaoNotaFiscal: 'Disponível (+38% sobre débitos extras/custos)',
  emailCorporativo: 'empreiteirosaminesoficial@gmail.com',
  telefoneContato: '(11) 98765-4321',
  anosExperiencia: 'Mais de 15 anos de excelência, transparência e rigor técnico em reformas comerciais, obras corporativas, pisos industriais e instalações de alta complexidade.',
  descricaoInstitucional: 'Execução com equipe própria qualificada, equipamentos de alto desempenho, pontualidade rigorosa e garantia técnica documentada.',
  specialties: [
    {
      id: 'spec_1',
      title: 'Construção Civil & Alvenaria Estrutural',
      description: 'Execução e reformas de paredes, reforço estrutural de vigas e pilares, contrapiso industrial e assentamento de revestimentos de grande formato.',
      category: 'Construção',
    },
    {
      id: 'spec_2',
      title: 'Instalações Elétricas Prediais & Industriais (NR-10)',
      description: 'Montagem de quadros de distribuição trifásicos, passagem de circuitos de potência, iluminação técnica em LED, cabeamento estruturado e laudos.',
      category: 'Elétrica',
    },
    {
      id: 'spec_3',
      title: 'Pintura Epóxi Demarcatória & Acabamentos',
      description: 'Pintura protetiva com resina epóxi para pisos industriais de alto tráfego de empilhadeiras, sinalização de segurança e acabamentos finos.',
      category: 'Pintura',
    },
    {
      id: 'spec_4',
      title: 'Redes Hidráulicas & Sistemas de Esgoto',
      description: 'Substituição de tubulações de alta vazão, caixas separadoras de gordura, sistemas de drenagem pluvial e pressurização hidráulica.',
      category: 'Hidráulica',
    },
    {
      id: 'spec_5',
      title: 'Impermeabilização de Coberturas & Fachadas',
      description: 'Aplicação técnica de mantas asfálticas elastoméricas, hidrojateamento, vedação de calhas e tratamento definitivo contra infiltrações.',
      category: 'Impermeabilização',
    },
    {
      id: 'spec_6',
      title: 'Drywall, Forros & Isolamento Acústico',
      description: 'Divisórias termoacústicas em gesso acartonado, forros modulares removíveis para escritórios e adequações de layout corporativo.',
      category: 'Drywall',
    },
  ],
  guarantees: [
    {
      id: 'guar_1',
      title: 'Garantia Técnica de 90 Dias',
      description: 'Todos os serviços executados contam com garantia legal conforme Código de Defesa do Consumidor e acompanhamento pós-entrega.',
      badgeType: 'guarantee',
    },
    {
      id: 'guar_2',
      title: 'Pontualidade no Cronograma',
      description: 'Metodologia ágil com diário de obras digital, vistorias periódicas e entrega rigorosamente alinhada com a diretoria do cliente.',
      badgeType: 'clock',
    },
    {
      id: 'guar_3',
      title: 'Normas Regulamentadoras',
      description: 'Equipe com certificação em NR-10 (Segurança em Eletricidade), NR-35 (Trabalho em Altura) e uso mandatório de EPIs completos.',
      badgeType: 'award',
    },
  ],
};

export function loadEmpresaProfile(): EmpresaProfile {
  if (typeof window === 'undefined') return INITIAL_EMPRESA_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveEmpresaProfile(INITIAL_EMPRESA_DATA);
      return INITIAL_EMPRESA_DATA;
    }
    const parsed = JSON.parse(raw);
    return {
      ...INITIAL_EMPRESA_DATA,
      ...parsed,
      specialties: Array.isArray(parsed.specialties) ? parsed.specialties : INITIAL_EMPRESA_DATA.specialties,
      guarantees: Array.isArray(parsed.guarantees) ? parsed.guarantees : INITIAL_EMPRESA_DATA.guarantees,
    };
  } catch {
    return INITIAL_EMPRESA_DATA;
  }
}

export function saveEmpresaProfile(profile: EmpresaProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Falha ao salvar dados da empresa no localStorage:', err);
  }
}
