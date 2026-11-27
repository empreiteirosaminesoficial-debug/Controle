/**
 * Banco de Dados de Referência SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil)
 * Mantido pela CAIXA Econômica Federal e IBGE.
 * Títulos padronizados, códigos oficiais de composições e sugestões de valores médios unitários.
 */

export interface SinapiItem {
  code: string;           // Código oficial SINAPI
  title: string;          // Título padronizado do serviço
  category: string;       // Categoria correspondente no sistema
  unit: string;           // Unidade de medida (m², m, un, pt, m³, vb)
  suggestedPrice: number; // Preço unitário médio referencial SINAPI (R$)
  details?: string;       // Detalhes da composição ou especificação técnica
}

export const SINAPI_DATABASE: SinapiItem[] = [
  // --- PINTURA E ACABAMENTO ---
  {
    code: '88316',
    title: 'Pintura de Parede com Tinta Látex Acrílica (2 demãos)',
    category: 'Pintura & Acabamento',
    unit: 'm²',
    suggestedPrice: 28.50,
    details: 'Aplicação manual de duas demãos de tinta látex acrílica em paredes internas/externas com selador prévio.',
  },
  {
    code: '88317',
    title: 'Aplicação Manual de Massa Corrida em Parede / Teto (2 demãos)',
    category: 'Pintura & Acabamento',
    unit: 'm²',
    suggestedPrice: 22.80,
    details: 'Massa corrida PVA ou acrílica com lixamento manual e preparação de fundo.',
  },
  {
    code: '88318',
    title: 'Pintura de Esmalte Sintético em Superfícies de Madeira',
    category: 'Pintura & Acabamento',
    unit: 'm²',
    suggestedPrice: 38.90,
    details: 'Aplicação de esmalte sintético brilhante ou acetinado em portas, guarnições e esquadrias de madeira.',
  },
  {
    code: '100720',
    title: 'Pintura de Esmalte Sintético em Estrutura / Grade Metálica',
    category: 'Pintura & Acabamento',
    unit: 'm²',
    suggestedPrice: 42.10,
    details: 'Aplicação de primer zarcão anticorrosivo e duas demãos de tinta esmalte sintético.',
  },
  {
    code: '95305',
    title: 'Aplicação de Textura Acrílica com Rolo ou Desempenadeira',
    category: 'Pintura & Acabamento',
    unit: 'm²',
    suggestedPrice: 34.60,
    details: 'Aplicação de textura acrílica hidro-repelente (grafiato ou rústica) sobre reboco.',
  },
  {
    code: '88320',
    title: 'Aplicação de Verniz Poliuretano / Marítimo em Madeiras (2 demãos)',
    category: 'Pintura & Acabamento',
    unit: 'm²',
    suggestedPrice: 36.40,
    details: 'Lixamento e aplicação de duas demãos de verniz transparente brilhante ou acetinado.',
  },

  // --- CONSTRUÇÃO & REFORMA / ALVENARIA & ESTRUTURA ---
  {
    code: '87515',
    title: 'Alvenaria de Vedação de Blocos Cerâmicos Furados 9x19x19cm',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 68.90,
    details: 'Assentamento com argamassa mista de cimento, cal hidratada e areia, junta de 10mm.',
  },
  {
    code: '87520',
    title: 'Alvenaria de Vedação em Blocos de Concreto 14x19x39cm',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 79.50,
    details: 'Assentamento com argamassa de cimento e areia, para paredes com espessura de 14cm.',
  },
  {
    code: '87878',
    title: 'Chapisco Manual em Parede / Teto com Argamassa de Cimento e Areia',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 9.80,
    details: 'Traço 1:3 com espessura média de 5mm, para aderência do reboco.',
  },
  {
    code: '87879',
    title: 'Emboço / Massa Única em Parede com Argamassa Pronta',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 32.40,
    details: 'Aplicação manual de massa única para recebimento de revestimento cerâmico ou pintura.',
  },
  {
    code: '87880',
    title: 'Reboco com Argamassa de Cimento e Areia Fina (esp. 5mm)',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 26.70,
    details: 'Acabamento desempenado liso para pintura em ambientes internos e externos.',
  },
  {
    code: '87620',
    title: 'Execução de Contrapiso Regularizado com Argamassa (esp. 3 a 5cm)',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 35.80,
    details: 'Contrapiso farofa com acabamento desempenado para recebimento de piso.',
  },
  {
    code: '97082',
    title: 'Demolição Manual de Alvenaria de Bloco / Tijolo',
    category: 'Construção & Reforma',
    unit: 'm³',
    suggestedPrice: 94.30,
    details: 'Demolição com martelete/ponteiro manual e separação para entulho.',
  },
  {
    code: '97085',
    title: 'Demolição / Remoção de Contrapiso ou Piso Cimentado',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 24.50,
    details: 'Quebra manual ou mecânica de piso existente com recolhimento para ensacamento.',
  },
  {
    code: '98458',
    title: 'Impermeabilização de Lajes com Manta Asfáltica 3mm ou 4mm',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 98.70,
    details: 'Aplicação com maçarico de manta asfáltica armada com polietileno e primer asfáltico.',
  },
  {
    code: '98460',
    title: 'Impermeabilização de Viga Baldrame / Parede com Argamassa Polimérica',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 46.20,
    details: 'Aplicação de 3 demãos cruzadas de argamassa polimérica contra umidade ascendente.',
  },

  // --- REVESTIMENTOS & PISOS ---
  {
    code: '87255',
    title: 'Assentamento de Piso Cerâmico Esmaltado (dimensões até 60x60cm)',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 48.60,
    details: 'Assentamento com argamassa colante AC-I ou AC-II com rejuntamento cimentício.',
  },
  {
    code: '87260',
    title: 'Assentamento de Porcelanato Polido ou Retificado (Grandes Formatos)',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 72.80,
    details: 'Dupla colagem com argamassa colante AC-III, niveladores e rejunte acrílico/epóxi.',
  },
  {
    code: '87262',
    title: 'Revestimento Cerâmico de Parede / Azulejo (Cozinha e Banheiro)',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 54.20,
    details: 'Assentamento em parede com argamassa colante e rejunte impermeável antimofo.',
  },
  {
    code: '87270',
    title: 'Instalação de Rodapé de Madeira, MDF ou Poliestireno (h=7 a 15cm)',
    category: 'Construção & Reforma',
    unit: 'm',
    suggestedPrice: 26.50,
    details: 'Fixação com cola PU e buchas/parafusos com acabamento selado.',
  },
  {
    code: '87275',
    title: 'Instalação de Piso Vinílico ou Laminado Click / Colado',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 42.00,
    details: 'Preparação do contrapiso com massa niveladora, manta e réguas vinílicas.',
  },

  // --- FORROS & DRYWALL ---
  {
    code: '96523',
    title: 'Forro de Gesso Acartonado / Drywall Estruturado FGA',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 85.00,
    details: 'Forro aramado com perfis canaleta F530, tirantes, placas ST de 12.5mm e tabica metálica.',
  },
  {
    code: '96525',
    title: 'Divisória de Drywall Simples com Placas de Gesso (12.5mm)',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 98.40,
    details: 'Estrutura com guias e montantes de 70mm, isolamento acústico e tratamento de juntas.',
  },
  {
    code: '96530',
    title: 'Instalação de Forro de PVC Linear (esp. 8mm)',
    category: 'Construção & Reforma',
    unit: 'm²',
    suggestedPrice: 58.70,
    details: 'Estrutura metálica leve ou sarrafos de madeira com moldura perimeter tipo U.',
  },

  // --- ELÉTRICA & INFRAESTRUTURA ---
  {
    code: '91926',
    title: 'Ponto de Tomada / Interruptor Residencial Embutido Completo',
    category: 'Elétrica & Infraestrutura',
    unit: 'pt',
    suggestedPrice: 65.00,
    details: 'Caixa 4x2, eletroduto corrugado, cabo flexível 2.5mm² e placa com módulo 10A ou 20A.',
  },
  {
    code: '91930',
    title: 'Ponto de Iluminação em Teto com Fiação e Bocal / Luminária',
    category: 'Elétrica & Infraestrutura',
    unit: 'pt',
    suggestedPrice: 58.00,
    details: 'Caixa octogonal, passagem de fiação 1.5mm², retorno e acionamento.',
  },
  {
    code: '91940',
    title: 'Instalação de Luminária Plafon / Painel LED de Embutir ou Sobrepor',
    category: 'Elétrica & Infraestrutura',
    unit: 'un',
    suggestedPrice: 45.00,
    details: 'Corte no forro ou fixação em laje, conexão com fiação e teste de acendimento.',
  },
  {
    code: '91950',
    title: 'Instalação / Substituição de Disjuntor Termomagnético (Monopolar ou Bipolar)',
    category: 'Elétrica & Infraestrutura',
    unit: 'un',
    suggestedPrice: 38.00,
    details: 'Encaixe em trilho DIN no quadro elétrico, aperto dos bornes e teste de carga.',
  },
  {
    code: '91960',
    title: 'Instalação de Quadro de Distribuição Elétrica (QDE até 18 circuitos)',
    category: 'Elétrica & Infraestrutura',
    unit: 'un',
    suggestedPrice: 320.00,
    details: 'Fixação de quadro embutido ou sobrepor, organização de barramento neutro/terra e identificação.',
  },
  {
    code: '91970',
    title: 'Passagem de Cabo Flexível de Cobre 2.5mm² a 6.0mm² em Eletrodutos',
    category: 'Elétrica & Infraestrutura',
    unit: 'm',
    suggestedPrice: 4.80,
    details: 'Passagem com guia de nylon, lubrificação e conexão aos pontos de derivação.',
  },

  // --- HIDRÁULICA & SANEAMENTO ---
  {
    code: '89957',
    title: 'Ponto de Água Fria em Tubo Soldável PVC 25mm com Conexões',
    category: 'Hidráulica & Saneamento',
    unit: 'pt',
    suggestedPrice: 78.00,
    details: 'Rasgo em parede, tubulação rígida marrom de 25mm, joelhos com rosca e teste de estanqueidade.',
  },
  {
    code: '89960',
    title: 'Ponto de Esgoto Secundário / Primário PVC 40mm a 100mm',
    category: 'Hidráulica & Saneamento',
    unit: 'pt',
    suggestedPrice: 88.00,
    details: 'Tubulação de esgoto para pia, lavatório, vaso sanitário ou ralo com declividade mínima.',
  },
  {
    code: '86904',
    title: 'Instalação de Vaso Sanitário / Bacia com Caixa Acoplada',
    category: 'Hidráulica & Saneamento',
    unit: 'un',
    suggestedPrice: 145.00,
    details: 'Fixação no piso com parafusos, anel de vedação, engate flexível e vedação com silicone.',
  },
  {
    code: '86906',
    title: 'Instalação de Lavatório / Cuba com Torneira e Sifão',
    category: 'Hidráulica & Saneamento',
    unit: 'un',
    suggestedPrice: 110.00,
    details: 'Fixação em bancada, instalação de torneira/misturador, sifão sanfonado ou copo e válvula.',
  },
  {
    code: '86910',
    title: 'Instalação / Substituição de Chuveiro Elétrico ou Ducha',
    category: 'Hidráulica & Saneamento',
    unit: 'un',
    suggestedPrice: 65.00,
    details: 'Vedação com fita teflon na rosca 1/2", conexão elétrica com conector cerâmico/Wago e teste.',
  },
  {
    code: '89980',
    title: 'Instalação de Caixa D\'Água de Polietileno (500L a 1000L)',
    category: 'Hidráulica & Saneamento',
    unit: 'un',
    suggestedPrice: 280.00,
    details: 'Assentamento em base plana, instalação de flange, bóia mecânica e tubos de extravasor/ladrão.',
  },

  // --- CLIMATIZAÇÃO & AR-CONDICIONADO ---
  {
    code: '90776',
    title: 'Instalação de Ar-Condicionado Split Hi-Wall (9.000 a 12.000 BTUs)',
    category: 'Climatização & Ar-Condicionado',
    unit: 'un',
    suggestedPrice: 480.00,
    details: 'Fixação das unidades interna e externa, linha frigorígena até 3m, dreno, vácuo no sistema e teste.',
  },
  {
    code: '90780',
    title: 'Limpeza e Higienização Completa de Ar-Condicionado Split',
    category: 'Climatização & Ar-Condicionado',
    unit: 'un',
    suggestedPrice: 160.00,
    details: 'Desmontagem de carcaça, lavagem bactericida da serpentina, turbina, filtros e bandeja de condensado.',
  },

  // --- SERRALHERIA & ESTRUTURAS ---
  {
    code: '91312',
    title: 'Instalação de Porta de Madeira com Marco, Alizar e Fechadura',
    category: 'Serralheria & Estruturas',
    unit: 'un',
    suggestedPrice: 195.00,
    details: 'Chumbamento do batente com espuma PU, travamento, colocação de dobradiças e fechadura.',
  },
  {
    code: '91320',
    title: 'Instalação de Janela de Alumínio / Vidro com Guarnição',
    category: 'Serralheria & Estruturas',
    unit: 'm²',
    suggestedPrice: 85.00,
    details: 'Chumbamento do requadro, nível e prumo, fixação de folhas de correr ou basculantes.',
  },

  // --- LIMPEZA PÓS-OBRA ---
  {
    code: '95390',
    title: 'Limpeza Fina Pós-Obra em Pisos, Azulejos e Esquadrias',
    category: 'Limpeza Pós-Obra',
    unit: 'm²',
    suggestedPrice: 16.50,
    details: 'Remoção de respingos de tinta, restos de rejunte/cimento, aspiração e higienização geral.',
  },
  {
    code: '95395',
    title: 'Remoção de Entulho de Construção e Bota-Fora com Caçamba',
    category: 'Limpeza Pós-Obra',
    unit: 'vb',
    suggestedPrice: 380.00,
    details: 'Carga manual do entulho na caçamba estacionária de 5m³ e destinação em aterro licenciado.',
  },
];

/**
 * Busca itens SINAPI por código ou termo de texto (título, categoria, detalhes)
 */
export function searchSinapi(query: string, categoryFilter?: string): SinapiItem[] {
  const q = (query || '').toLowerCase().trim();
  const digitsOnly = q.replace(/\D/g, '');

  return SINAPI_DATABASE.filter((item) => {
    // Category filter
    if (categoryFilter && categoryFilter !== 'Todas' && item.category !== categoryFilter) {
      return false;
    }

    if (!q) return true;

    // Direct code match
    if (digitsOnly && item.code.includes(digitsOnly)) {
      return true;
    }

    // Text terms match
    const titleMatch = item.title.toLowerCase().includes(q);
    const categoryMatch = item.category.toLowerCase().includes(q);
    const detailsMatch = item.details?.toLowerCase().includes(q) || false;

    return titleMatch || categoryMatch || detailsMatch;
  });
}

/**
 * Recupera um item SINAPI pelo código oficial
 */
export function getSinapiByCode(code: string): SinapiItem | undefined {
  const cleanCode = (code || '').replace(/\D/g, '');
  return SINAPI_DATABASE.find((item) => item.code === cleanCode);
}
