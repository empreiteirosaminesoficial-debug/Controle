import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { ServiceRecord, StoreProfile } from '../types';
import { formatCurrency, formatDate, getStatusDetails } from './formatters';

export interface ExportFilterOptions {
  monthFilter?: string; // YYYY-MM
  storeFilter?: string;
  statusFilter?: string;
  storeName?: string;
}

/**
 * Generates and downloads a clean, professional PDF report of services
 */
export function exportServicesToPdf(
  services: ServiceRecord[],
  stores: StoreProfile[],
  options: ExportFilterOptions = {}
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Background bar (Empreiteiro SaminÃªs Emerald)
  doc.setFillColor(16, 85, 54);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('EMPREITEIRO SAMINÃŠS  â€¢  RELATÃ“RIO DE SERVIÃ‡OS', 14, 13);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const filterDesc = [
    options.storeName ? `Loja: ${options.storeName}` : 'Todas as Lojas',
    options.monthFilter ? `MÃªs: ${options.monthFilter}` : 'Todos os PerÃ­odos',
    options.statusFilter && options.statusFilter !== 'todos' ? `Status: ${options.statusFilter.toUpperCase()}` : 'Todos os Status',
  ].join(' | ');

  doc.text(`EmissÃ£o: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}  â€¢  Filtros: ${filterDesc}`, 14, 21);

  // Summary Metrics Section
  const totalCharged = services.reduce((acc, s) => acc + (s.valueCharged || 0), 0);
  const totalPaid = services.reduce((acc, s) => acc + (s.valuePaid || 0), 0);
  const totalDebits = services.reduce((acc, s) => acc + (s.valueDebit || 0), 0);
  const balancePending = (totalCharged + totalDebits) - totalPaid;

  const boxY = 33;
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const boxHeight = 16;

  const metrics = [
    { label: 'TOTAL COBRADO', value: formatCurrency(totalCharged), color: [15, 23, 42] },
    { label: 'TOTAL PAGO', value: formatCurrency(totalPaid), color: [16, 185, 129] },
    { label: 'NOTA FISCAL (+38%)', value: formatCurrency((totalCharged + totalDebits) * 1.38), color: [147, 51, 234] },
    { label: 'SALDO A RECEBER', value: formatCurrency(balancePending > 0 ? balancePending : 0), color: [2, 132, 199] },
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (boxWidth + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(m.label, x + 3, boxY + 5.5);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(m.color[0], m.color[1], m.color[2]);
    doc.text(m.value, x + 3, boxY + 12);
  });

  // Table Data
  const tableRows = services.map((s, index) => {
    const statusInfo = getStatusDetails(s.paymentStatus);
    const photosCount = s.photos ? s.photos.length : 0;
    return [
      String(index + 1),
      formatDate(s.date),
      s.storeName,
      s.description,
      s.category,
      formatCurrency(s.valueCharged),
      s.valueDebit > 0 ? formatCurrency(s.valueDebit) : '-',
      formatCurrency(s.valuePaid),
      statusInfo.label,
      photosCount > 0 ? `${photosCount} foto(s)` : 'Sem foto',
    ];
  });

  autoTable(doc, {
    startY: 54,
    head: [[
      '#',
      'Data',
      'Loja / CNPJ',
      'DescriÃ§Ã£o do ServiÃ§o',
      'Categoria',
      'Cobrado',
      'DÃ©bito',
      'Pago',
      'Status',
      'Fotos',
    ]],
    body: tableRows,
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [51, 65, 85],
      cellPadding: 2,
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 16 },
      2: { cellWidth: 26 },
      3: { cellWidth: 42 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18, halign: 'right' },
      6: { cellWidth: 15, halign: 'right' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 18, halign: 'center' },
      9: { cellWidth: 16, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      const pageCount = (doc.internal as unknown as { getNumberOfPages: () => number }).getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(
        `PÃ¡gina ${data.pageNumber} de ${pageCount}  â€¢  Empreiteiro SaminÃªs  â€¢  RelatÃ³rio Oficial de ServiÃ§os`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    },
  });

  const filename = `relatorio_servicos_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Generates and downloads an Excel (.xlsx) workbook of services and monthly summaries
 */
/**
 * Generates and downloads an Excel (.xlsx) workbook of services and monthly summaries
 */
export async function exportServicesToExcel(
  services: ServiceRecord[],
  stores: StoreProfile[],
  options: ExportFilterOptions = {}
): Promise<void> {
  const wb = new ExcelJS.Workbook();

  // Sheet 1: Detailed Services
  const wsServices = wb.addWorksheet('Serviços');

  wsServices.columns = [
    { header: 'Nº', key: 'numero', width: 6 },
    { header: 'Data', key: 'data', width: 12 },
    { header: 'Loja / Cliente', key: 'loja', width: 28 },
    { header: 'CNPJ', key: 'cnpj', width: 20 },
    { header: 'Descrição do Serviço', key: 'descricao', width: 35 },
    { header: 'Categoria', key: 'categoria', width: 18 },
    { header: 'Valor Cobrado (R$)', key: 'cobrado', width: 18 },
    { header: 'Débitos Adicionais (R$)', key: 'debitos', width: 18 },
    { header: 'Valor Pago (R$)', key: 'pago', width: 18 },
    { header: 'Saldo Devedor (R$)', key: 'saldo', width: 18 },
    { header: 'Status de Pagamento', key: 'status', width: 18 },
    { header: 'Forma de Pagamento', key: 'forma', width: 18 },
    { header: 'Data de Vencimento', key: 'vencimento', width: 15 },
    { header: 'Data de Pagamento', key: 'dataPagamento', width: 15 },
    { header: 'Qtd. Fotos', key: 'fotos', width: 10 },
    { header: 'Observações', key: 'observacoes', width: 30 },
  ];

  wsServices.addRows(
    services.map((s, idx) => ({
      numero: idx + 1,
      data: formatDate(s.date),
      loja: s.storeName,
      cnpj: s.storeCnpj,
      descricao: s.description,
      categoria: s.category,
      cobrado: s.valueCharged,
      debitos: s.valueDebit,
      pago: s.valuePaid,
      saldo: (s.valueCharged + s.valueDebit) - s.valuePaid,
      status: getStatusDetails(s.paymentStatus).label,
      forma: s.paymentMethod,
      vencimento: s.dueDate ? formatDate(s.dueDate) : '-',
      dataPagamento: s.paidDate ? formatDate(s.paidDate) : '-',
      fotos: s.photos?.length || 0,
      observacoes: s.notes || '',
    }))
  );

  // Sheet 2: Financial Summary by Store
  const storeSummaryMap = new Map<string, {
    nome: string;
    cnpj: string;
    totalCobrado: number;
    totalDebitos: number;
    totalPago: number;
    qtdServicos: number;
  }>();

  services.forEach((s) => {
    const key = s.storeId || s.storeName;
    const current = storeSummaryMap.get(key) || {
      nome: s.storeName,
      cnpj: s.storeCnpj,
      totalCobrado: 0,
      totalDebitos: 0,
      totalPago: 0,
      qtdServicos: 0,
    };

    current.totalCobrado += s.valueCharged || 0;
    current.totalDebitos += s.valueDebit || 0;
    current.totalPago += s.valuePaid || 0;
    current.qtdServicos += 1;

    storeSummaryMap.set(key, current);
  });

  const wsSummary = wb.addWorksheet('Resumo por Loja');

  wsSummary.columns = [
    { header: 'Loja / Cliente', key: 'loja', width: 30 },
    { header: 'CNPJ', key: 'cnpj', width: 22 },
    { header: 'Qtd. Serviços', key: 'quantidade', width: 14 },
    { header: 'Total Cobrado (R$)', key: 'cobrado', width: 18 },
    { header: 'Débitos Adicionais (R$)', key: 'debitos', width: 18 },
    { header: 'Total Pago (R$)', key: 'pago', width: 18 },
    { header: 'Saldo Pendente (R$)', key: 'saldo', width: 18 },
  ];

  wsSummary.addRows(
    Array.from(storeSummaryMap.values()).map((st) => ({
      loja: st.nome,
      cnpj: st.cnpj,
      quantidade: st.qtdServicos,
      cobrado: st.totalCobrado,
      debitos: st.totalDebitos,
      pago: st.totalPago,
      saldo: (st.totalCobrado + st.totalDebitos) - st.totalPago,
    }))
  );

  // Sheet 3: Store Profiles Register
  const wsStores = wb.addWorksheet('Perfis de Lojas');

  wsStores.columns = [
    { header: 'Razão Social', key: 'razaoSocial', width: 35 },
    { header: 'Nome Fantasia', key: 'nomeFantasia', width: 28 },
    { header: 'CNPJ', key: 'cnpj', width: 22 },
    { header: 'Município', key: 'municipio', width: 18 },
    { header: 'UF', key: 'uf', width: 6 },
    { header: 'Telefone', key: 'telefone', width: 18 },
    { header: 'Email', key: 'email', width: 25 },
    { header: 'Situação Cadastral', key: 'situacao', width: 16 },
  ];

  wsStores.addRows(
    stores.map((st) => ({
      razaoSocial: st.razaoSocial,
      nomeFantasia: st.nomeFantasia,
      cnpj: st.cnpj,
      municipio: st.municipio || '-',
      uf: st.uf || '-',
      telefone: st.telefone || '-',
      email: st.email || '-',
      situacao: st.situacaoCadastral || 'Não consultada',
    }))
  );

  // Format headers
  [wsServices, wsSummary, wsStores].forEach((ws) => {
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  });

  const filename = `planilha_servicos_${new Date().toISOString().slice(0, 10)}.xlsx`;
  const buffer = await wb.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer);
  const arrayBuffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;

  const blob = new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}export interface MonthlyBalancePdfOptions {
  monthFilter?: string; // YYYY-MM or 'todos'
  storeFilter?: string;
  storeName?: string;
  clientDocument?: string;
  pixKey?: string;
  pixKeyType?: string;
  observations?: string;
}

/**
 * Generates an executive consolidated monthly balance report in PDF
 * tailored professionally for client delivery with visual charts, financial KPIs,
 * tax NF simulation, and official PIX payment details.
 */
export function exportMonthlyBalanceConsolidatedPdf(
  services: ServiceRecord[],
  stores: StoreProfile[],
  options: MonthlyBalancePdfOptions = {}
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // 1. Identify Store / Client
  let selectedStore: StoreProfile | undefined;
  if (options.storeFilter && options.storeFilter !== 'todas') {
    selectedStore = stores.find((s) => s.id === options.storeFilter);
  } else if (services.length > 0 && services[0].storeId) {
    selectedStore = stores.find((s) => s.id === services[0].storeId);
  }

  const clientName = options.storeName || selectedStore?.nomeFantasia || selectedStore?.razaoSocial || 'Cliente / Empresa Parceira';
  const clientCnpj = options.clientDocument || selectedStore?.cnpj || (services.length > 0 ? services[0].storeCnpj : 'CNPJ NÃ£o Especificado');
  const clientCity = selectedStore?.municipio ? `${selectedStore.municipio} - ${selectedStore.uf || 'SP'}` : 'SÃ£o Paulo - SP';

  // 2. Format Month Period Label
  let periodLabel = 'TODOS OS PERÃODOS CONSOLIDADOS';
  if (options.monthFilter && options.monthFilter !== 'todos') {
    const [y, m] = options.monthFilter.split('-');
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    periodLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  }

  // 3. Compute Financial Totals
  const totalCharged = services.reduce((acc, s) => acc + (s.valueCharged || 0), 0);
  const totalDebits = services.reduce((acc, s) => acc + (s.valueDebit || 0), 0);
  const totalGross = totalCharged + totalDebits;
  const totalPaid = services.reduce((acc, s) => acc + (s.valuePaid || 0), 0);
  const balancePending = Math.max(0, totalGross - totalPaid);
  const totalWithNF = totalGross * 1.38;
  const totalTaxNF = totalGross * 0.38;
  const paidPercent = totalGross > 0 ? Math.min(100, Math.round((totalPaid / totalGross) * 100)) : 100;
  const pendingPercent = Math.max(0, 100 - paidPercent);

  // Status Breakdown
  const statusMap: Record<string, { count: number; total: number }> = {
    pago: { count: 0, total: 0 },
    pendente: { count: 0, total: 0 },
    parcial: { count: 0, total: 0 },
    atrasado: { count: 0, total: 0 },
  };

  services.forEach((s) => {
    const st = s.paymentStatus || 'pendente';
    if (!statusMap[st]) statusMap[st] = { count: 0, total: 0 };
    statusMap[st].count += 1;
    statusMap[st].total += (s.valueCharged || 0) + (s.valueDebit || 0);
  });

  // Category Breakdown for Visual Vector Chart
  const categoryMap = new Map<string, number>();
  services.forEach((s) => {
    const cat = s.category || 'Geral / ManutenÃ§Ã£o';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + (s.valueCharged || 0) + (s.valueDebit || 0));
  });
  const sortedCategories = Array.from(categoryMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // ---------------- PAGE 1: EXECUTIVE DASHBOARD & VISUAL BALANCING ----------------

  // Header Banner
  doc.setFillColor(15, 23, 42); // Slate-900 (Executive Navy)
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Emerald Top Stripe
  doc.setFillColor(16, 185, 129); // Emerald-500
  doc.rect(0, 0, pageWidth, 2.5, 'F');

  // Brand and Report Title
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('EMPREITEIRO SAMINÃŠS', margin, 13);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('BALANÃ‡O MENSAL CONSOLIDADO DE PRESTAÃ‡ÃƒO DE SERVIÃ‡OS', margin, 20);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  const nowIso = new Date();
  const dateFormatted = nowIso.toLocaleDateString('pt-BR');
  const timeFormatted = nowIso.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const codeId = `BAL-${nowIso.getFullYear()}${String(nowIso.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  doc.text(`EmissÃ£o: ${dateFormatted} Ã s ${timeFormatted}  â€¢  Documento Ref: #${codeId}  â€¢  Via Oficial do Cliente`, margin, 27);

  // Badge Status no canto superior direito
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(pageWidth - margin - 38, 8, 38, 7.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMONSTRATIVO OFICIAL', pageWidth - margin - 19, 13, { align: 'center' });

  // Client Identification Card
  let currentY = 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'FD');

  // Left Column: Client Data
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('CLIENTE / ESTABELECIMENTO:', margin + 4, currentY + 5.5);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(clientName.substring(0, 48), margin + 4, currentY + 11);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Documento (CNPJ/CPF): ${clientCnpj}  â€¢  Local: ${clientCity}`, margin + 4, currentY + 16.5);

  // Right Column: Reference Period
  const rightColX = margin + contentWidth - 62;
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('MÃŠS DE COMPETÃŠNCIA:', rightColX, currentY + 5.5);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 85, 54);
  doc.text(periodLabel, rightColX, currentY + 11);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Total de Itens: ${services.length} serviÃ§os cadastrados`, rightColX, currentY + 16.5);

  // Executive KPI Cards (5 Cards)
  currentY = 59;
  const cardGap = 2.5;
  const numCards = 5;
  const cardWidth = (contentWidth - cardGap * (numCards - 1)) / numCards;
  const cardHeight = 17;

  const kpis = [
    { label: 'MÃƒO DE OBRA', val: formatCurrency(totalCharged), sub: 'ServiÃ§os Base', color: [15, 23, 42], border: [226, 232, 240] },
    { label: 'DÃ‰BITOS MATERIAIS', val: formatCurrency(totalDebits), sub: 'Custos Adicionais', color: [217, 119, 6], border: [253, 230, 138] },
    { label: 'TOTAL BRUTO', val: formatCurrency(totalGross), sub: 'Total Cobrado', color: [15, 23, 42], border: [203, 213, 225] },
    { label: 'TOTAL QUITADO', val: formatCurrency(totalPaid), sub: `${paidPercent}% Liquidado`, color: [16, 185, 129], border: [167, 243, 208] },
    { label: 'SALDO A LIQUIDAR', val: formatCurrency(balancePending), sub: balancePending > 0 ? 'Pendente' : '100% Quitado', color: balancePending > 0 ? [2, 132, 199] : [16, 185, 129], border: balancePending > 0 ? [186, 230, 253] : [167, 243, 208] },
  ];

  kpis.forEach((k, idx) => {
    const cardX = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(k.border[0], k.border[1], k.border[2]);
    doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, cardX + 2.5, currentY + 4.5);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(k.color[0], k.color[1], k.color[2]);
    doc.text(k.val, cardX + 2.5, currentY + 10.5);

    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(k.sub, cardX + 2.5, currentY + 14.5);
  });

  // Nota Fiscal Simulation Box (+38%)
  currentY += cardHeight + 3.5;
  doc.setFillColor(250, 245, 255); // Purple-50
  doc.setDrawColor(233, 213, 255); // Purple-200
  doc.roundedRect(margin, currentY, contentWidth, 8, 1.5, 1.5, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(126, 34, 206); // Purple-700
  doc.text('SIMULAÃ‡ÃƒO COM EMISSÃƒO DE NOTA FISCAL (+38%):', margin + 3.5, currentY + 5.2);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(88, 28, 135);
  doc.text(
    `Valor com Nota Fiscal: ${formatCurrency(totalWithNF)} (AcrÃ©scimo de impostos/emissÃ£o: ${formatCurrency(totalTaxNF)} sobre o valor bruto)`,
    margin + 68,
    currentY + 5.2
  );

  // ---------------- VISUAL CHARTS SECTION (Vector JS-PDF) ----------------
  currentY += 12;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('ANÃLISE GRÃFICA & LIQUIDAÃ‡ÃƒO FINANCEIRA', margin, currentY);

  currentY += 4;

  // Chart 1: Liquidity Progress Bar
  const progBoxY = currentY;
  const progBoxHeight = 18;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, progBoxY, contentWidth, progBoxHeight, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('ÃNDICE DE LIQUIDAÃ‡ÃƒO DO BALANÃ‡O (PAGO VS PENDENTE):', margin + 3.5, progBoxY + 5);

  // Values text right aligned
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Quitado: ${formatCurrency(totalPaid)} (${paidPercent}%)  â€¢  Pendente: ${formatCurrency(balancePending)} (${pendingPercent}%)`,
    margin + contentWidth - 3.5,
    progBoxY + 5,
    { align: 'right' }
  );

  // The bar track
  const barY = progBoxY + 8;
  const barHeight = 6.5;
  const barWidth = contentWidth - 7;
  const barStartX = margin + 3.5;

  // Track background
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(barStartX, barY, barWidth, barHeight, 1.5, 1.5, 'F');

  // Paid portion (Emerald)
  if (paidPercent > 0) {
    const paidWidth = (paidPercent / 100) * barWidth;
    doc.setFillColor(16, 185, 129);
    doc.roundedRect(barStartX, barY, paidWidth, barHeight, 1.5, 1.5, 'F');
    if (paidWidth > 18) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${paidPercent}% PAGO`, barStartX + paidWidth / 2, barY + 4.5, { align: 'center' });
    }
  }

  // Pending portion (Sky/Amber)
  if (pendingPercent > 0) {
    const paidWidth = (paidPercent / 100) * barWidth;
    const pendingWidth = barWidth - paidWidth;
    doc.setFillColor(245, 158, 11);
    doc.roundedRect(barStartX + paidWidth, barY, pendingWidth, barHeight, 1.5, 1.5, 'F');
    if (pendingWidth > 20) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(`${pendingPercent}% A RECEBER`, barStartX + paidWidth + pendingWidth / 2, barY + 4.5, { align: 'center' });
    }
  }

  // Chart 2: Category Breakdown (Left Side) & Status Breakdown (Right Side)
  currentY += progBoxHeight + 3.5;
  const halfWidth = (contentWidth - 3) / 2;
  const chartCardHeight = 44;

  // Box Left: Categorias
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, halfWidth, chartCardHeight, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DISTRIBUIÃ‡ÃƒO POR CATEGORIA DE SERVIÃ‡O', margin + 3.5, currentY + 5.5);

  let catY = currentY + 9;
  if (sortedCategories.length === 0) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Nenhuma categoria registrada no perÃ­odo.', margin + 3.5, catY + 6);
  } else {
    sortedCategories.forEach(([catName, catVal]) => {
      const catPct = totalGross > 0 ? (catVal / totalGross) * 100 : 0;
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text(catName.substring(0, 22), margin + 3.5, catY + 3);

      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`${formatCurrency(catVal)} (${catPct.toFixed(0)}%)`, margin + halfWidth - 3.5, catY + 3, { align: 'right' });

      // Proportional bar
      const catBarTrackW = halfWidth - 7;
      const catBarFillW = Math.max(2, (catPct / 100) * catBarTrackW);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin + 3.5, catY + 4.2, catBarTrackW, 2.5, 0.5, 0.5, 'F');

      doc.setFillColor(14, 165, 233); // Sky-500
      doc.roundedRect(margin + 3.5, catY + 4.2, catBarFillW, 2.5, 0.5, 0.5, 'F');

      catY += 8.2;
    });
  }

  // Box Right: Status dos Pagamentos
  const rightBoxX = margin + halfWidth + 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(rightBoxX, currentY, halfWidth, chartCardHeight, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('SITUAÃ‡ÃƒO GERAL DOS SERVIÃ‡OS', rightBoxX + 3.5, currentY + 5.5);

  const statusItems = [
    { label: 'Quitados / Pagos', data: statusMap.pago, color: [16, 185, 129] },
    { label: 'Pendentes de Pagamento', data: statusMap.pendente, color: [245, 158, 11] },
    { label: 'Pagamentos Parciais', data: statusMap.parcial, color: [14, 165, 233] },
    { label: 'ServiÃ§os em Atraso', data: statusMap.atrasado, color: [244, 63, 94] },
  ];

  let stY = currentY + 9;
  statusItems.forEach((item) => {
    // Status color dot
    doc.setFillColor(item.color[0], item.color[1], item.color[2]);
    doc.circle(rightBoxX + 5, stY + 2.5, 1.8, 'F');

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(item.label, rightBoxX + 9, stY + 3.2);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${item.data.count} serv. â€¢ ${formatCurrency(item.data.total)}`,
      rightBoxX + halfWidth - 3.5,
      stY + 3.2,
      { align: 'right' }
    );

    // subtle separator line
    doc.setDrawColor(241, 245, 249);
    doc.line(rightBoxX + 3.5, stY + 6.5, rightBoxX + halfWidth - 3.5, stY + 6.5);

    stY += 8.2;
  });

  // Official PIX Liquidation Box
  currentY += chartCardHeight + 3.5;
  const pixBoxHeight = 24;
  doc.setFillColor(240, 253, 244); // Emerald-50
  doc.setDrawColor(167, 243, 208); // Emerald-200
  doc.roundedRect(margin, currentY, contentWidth, pixBoxHeight, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 85, 54);
  doc.text('DADOS BANCÃRIOS PARA LIQUIDAÃ‡ÃƒO & TRANSFERÃŠNCIA VIA PIX', margin + 4, currentY + 5.5);

  const pixKeyOfficial = options.pixKey || 'empreiteirosaminesoficial@gmail.com';
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('CHAVE PIX:', margin + 4, currentY + 11.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 85, 54);
  doc.text(pixKeyOfficial, margin + 22, currentY + 11.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('(Tipo: Chave E-mail)', margin + 74, currentY + 11.5);

  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text('Favorecido: Empreiteiro SaminÃªs Oficial  â€¢  InstituiÃ§Ã£o BancÃ¡ria: Mercado Pago / Banco Digital', margin + 4, currentY + 16.5);

  // Valor a liquidar no canto direito do box PIX
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('VALOR A LIQUIDAR:', margin + contentWidth - 4, currentY + 7.5, { align: 'right' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(balancePending > 0 ? 2 : 16, balancePending > 0 ? 132 : 185, balancePending > 0 ? 199 : 129);
  doc.text(formatCurrency(balancePending > 0 ? balancePending : totalGross), margin + contentWidth - 4, currentY + 13.5, { align: 'right' });

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('Enviar comprovante para baixa no sistema.', margin + contentWidth - 4, currentY + 18, { align: 'right' });

  // Signatures Section
  currentY += pixBoxHeight + 5;
  const sigBoxY = currentY;
  const sigLineWidth = (contentWidth - 20) / 2;

  // Prestador signature
  const sig1X = margin + 5;
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(sig1X, sigBoxY + 12, sig1X + sigLineWidth, sigBoxY + 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('EMPREITEIRO SAMINÃŠS', sig1X + sigLineWidth / 2, sigBoxY + 16, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Prestador de ServiÃ§os ResponsÃ¡vel', sig1X + sigLineWidth / 2, sigBoxY + 19.5, { align: 'center' });

  // Cliente signature
  const sig2X = margin + contentWidth - sigLineWidth - 5;
  doc.line(sig2X, sigBoxY + 12, sig2X + sigLineWidth, sigBoxY + 12);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(clientName.substring(0, 32).toUpperCase(), sig2X + sigLineWidth / 2, sigBoxY + 16, { align: 'center' });

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ciente e de Acordo â€¢ GestÃ£o / Financeiro', sig2X + sigLineWidth / 2, sigBoxY + 19.5, { align: 'center' });

  // ---------------- PAGE 2+: DETAILED ANALYTICAL SERVICE STATEMENT ----------------
  doc.addPage();

  // Page 2 Compact Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 18, 'F');

  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 1.8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text('EMPREITEIRO SAMINÃŠS  â€¢  DETALHAMENTO ANALÃTICO DOS SERVIÃ‡OS', margin, 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(203, 213, 225);
  doc.text(`Cliente: ${clientName} (${clientCnpj})  â€¢  CompetÃªncia: ${periodLabel}  â€¢  ${services.length} registros`, margin, 14.5);

  // Table Data
  const analyticalRows = services.map((s, index) => {
    const statusInfo = getStatusDetails(s.paymentStatus);
    const serviceTotal = (s.valueCharged || 0) + (s.valueDebit || 0);
    const balance = Math.max(0, serviceTotal - (s.valuePaid || 0));

    return [
      String(index + 1),
      formatDate(s.date),
      s.description,
      s.category || 'Geral',
      formatCurrency(s.valueCharged || 0),
      s.valueDebit > 0 ? formatCurrency(s.valueDebit) : '-',
      formatCurrency(serviceTotal),
      formatCurrency(s.valuePaid || 0),
      balance > 0 ? formatCurrency(balance) : 'Quitado',
      statusInfo.label,
    ];
  });

  autoTable(doc, {
    startY: 23,
    head: [[
      '#',
      'Data',
      'DescriÃ§Ã£o da Obra / ServiÃ§o',
      'Categoria',
      'Vlr. Cobrado',
      'DÃ©bito Mat.',
      'Total',
      'Vlr. Pago',
      'Saldo',
      'Status',
    ]],
    body: analyticalRows,
    foot: [[
      'TOTAIS',
      `${services.length} itens`,
      'Demonstrativo consolidado do perÃ­odo',
      '-',
      formatCurrency(totalCharged),
      formatCurrency(totalDebits),
      formatCurrency(totalGross),
      formatCurrency(totalPaid),
      formatCurrency(balancePending),
      balancePending > 0 ? 'Pendente' : '100% Quitado',
    ]],
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [51, 65, 85],
      cellPadding: 2,
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'left',
    },
    columnStyles: {
      0: { cellWidth: 7, halign: 'center' },
      1: { cellWidth: 16 },
      2: { cellWidth: 47 },
      3: { cellWidth: 20 },
      4: { cellWidth: 17, halign: 'right' },
      5: { cellWidth: 16, halign: 'right' },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 17, halign: 'right' },
      8: { cellWidth: 16, halign: 'right' },
      9: { cellWidth: 18, halign: 'center' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: margin, right: margin },
  });

  // Observations & Warranty Note at bottom of analytical table
  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 240;
  if (finalY < pageHeight - 25) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, finalY, contentWidth, 14, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('TERMOS DE GARANTIA & OBSERVAÃ‡Ã•ES TÃ‰CNICAS:', margin + 3.5, finalY + 4.5);

    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Todos os serviÃ§os foram executados sob rigoroso controle de qualidade. Garantia padrÃ£o de 90 dias apÃ³s conclusÃ£o da obra.',
      margin + 3.5,
      finalY + 8.5
    );
    doc.text(
      'Para dÃºvidas ou emissÃ£o de segunda via de comprovante, entre em contato atravÃ©s do canal oficial do Empreiteiro SaminÃªs.',
      margin + 3.5,
      finalY + 11.5
    );
  }

  // Draw Page Numbering & Security Footer on all pages
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);

    doc.text(
      `PÃ¡gina ${i} de ${totalPages}  â€¢  Empreiteiro SaminÃªs  â€¢  BalanÃ§o Mensal Oficial  â€¢  Documento Autenticado`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  // Download PDF
  const safeClient = clientName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 18);
  const safeMonth = options.monthFilter && options.monthFilter !== 'todos' ? options.monthFilter : nowIso.toISOString().slice(0, 7);
  const pdfFilename = `balanco_mensal_${safeClient}_${safeMonth}.pdf`;
  doc.save(pdfFilename);
}



