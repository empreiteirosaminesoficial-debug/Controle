import React, { useState } from 'react';
import { 
  X, 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Building2, 
  Calendar, 
  Filter, 
  CheckCircle,
  FileCheck,
  PieChart,
  Sparkles,
  QrCode,
  ShieldCheck,
  ArrowRight,
  Archive
} from 'lucide-react';
import { ServiceRecord, StoreProfile } from '../types';
import { 
  exportServicesToExcel, 
  exportServicesToPdf, 
  exportMonthlyBalanceConsolidatedPdf 
} from '../utils/exporter';
import { formatCurrency } from '../utils/formatters';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceRecord[];
  stores: StoreProfile[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  services,
  stores,
}) => {
  const [selectedStoreId, setSelectedStoreId] = useState<string>('todas');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [isGeneratingConsolidated, setIsGeneratingConsolidated] = useState<boolean>(false);
  const [isGeneratingExcel, setIsGeneratingExcel] = useState<boolean>(false);

  if (!isOpen) return null;

  // Compute available months
  const monthsAvailable = Array.from(
    new Set(services.map((s) => s.date.slice(0, 7)))
  ).sort().reverse() as string[];

  // Filter services based on chosen export criteria
  const filteredServices = services.filter((s) => {
    if (selectedStoreId !== 'todas' && s.storeId !== selectedStoreId) return false;
    if (selectedMonth !== 'todos' && !s.date.startsWith(selectedMonth)) return false;
    if (selectedStatus !== 'todos' && s.paymentStatus !== selectedStatus) return false;
    return true;
  });

  const totalValue = filteredServices.reduce((acc, s) => acc + (s.valueCharged || 0), 0);
  const totalPaid = filteredServices.reduce((acc, s) => acc + (s.valuePaid || 0), 0);
  const totalDebit = filteredServices.reduce((acc, s) => acc + (s.valueDebit || 0), 0);
  const totalGross = totalValue + totalDebit;
  const balancePending = Math.max(0, totalGross - totalPaid);

  const selectedStoreObj = stores.find(st => st.id === selectedStoreId);

  const handleExportConsolidatedPdf = () => {
    setIsGeneratingConsolidated(true);
    try {
      exportMonthlyBalanceConsolidatedPdf(filteredServices, stores, {
        storeFilter: selectedStoreId,
        storeName: selectedStoreObj?.nomeFantasia,
        monthFilter: selectedMonth,
        clientDocument: selectedStoreObj?.cnpj,
      });
      setDownloadSuccess('BalanÃ§o Mensal Consolidado em PDF gerado com sucesso! Arquivo pronto para envio ao cliente.');
      setTimeout(() => setDownloadSuccess(null), 4500);
    } finally {
      setIsGeneratingConsolidated(false);
    }
  };

  const handleExportPdf = () => {
    exportServicesToPdf(filteredServices, stores, {
      storeName: selectedStoreObj?.nomeFantasia,
      monthFilter: selectedMonth !== 'todos' ? selectedMonth : undefined,
      statusFilter: selectedStatus,
    });
    setDownloadSuccess('RelatÃ³rio de ServiÃ§os em PDF gerado e baixado com sucesso!');
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  const handleExportExcel = async () => {
    if (isGeneratingExcel) return;

    setIsGeneratingExcel(true);

    try {
      await exportServicesToExcel(filteredServices, stores, {
        storeName: selectedStoreObj?.nomeFantasia,
        monthFilter: selectedMonth !== 'todos' ? selectedMonth : undefined,
        statusFilter: selectedStatus,
      });

      setDownloadSuccess('Planilha Excel (.xlsx) exportada e baixada com sucesso!');
      setTimeout(() => setDownloadSuccess(null), 4000);
    } catch (error) {
      console.error('Erro ao exportar planilha Excel:', error);
      window.alert('Não foi possível gerar a planilha Excel. Tente novamente.');
    } finally {
      setIsGeneratingExcel(false);
    }
  };

  const handleDownloadZip = () => {
    const link = document.createElement('a');
    link.href = '/api/download-pwa-zip';
    link.download = 'empreiteiro-samines-pwa-codigo-completo.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadSuccess('Download do cÃ³digo completo do PWA em ZIP iniciado!');
    setTimeout(() => setDownloadSuccess(null), 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">ExportaÃ§Ã£o de RelatÃ³rios e BalanÃ§os</h3>
              <p className="text-xs text-slate-500">Documentos executivos em PDF para clientes e planilhas de conferÃªncia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs overflow-y-auto">
          
          {downloadSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-xs">{downloadSuccess}</span>
              </div>
              <button 
                onClick={() => setDownloadSuccess(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold"
              >
                âœ•
              </button>
            </div>
          )}

          {/* Filter options for export */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-sky-600" />
              <span>ParÃ¢metros do RelatÃ³rio</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Store */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Loja / Cliente</label>
                <select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 transition font-medium"
                >
                  <option value="todas">Todas as Lojas</option>
                  {stores.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.nomeFantasia}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">MÃªs de CompetÃªncia</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 transition font-medium"
                >
                  <option value="todos">Todos os Meses</option>
                  {monthsAvailable.map((m) => {
                    const [year, month] = m.split('-');
                    const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
                    const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                    return (
                      <option key={m} value={m}>
                        {label.toUpperCase()}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Filtro de Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-sky-500 transition font-medium"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="pago">Apenas Pagos</option>
                  <option value="pendente">Apenas Pendentes</option>
                  <option value="parcial">Apenas Parciais</option>
                  <option value="atrasado">Em Atraso</option>
                </select>
              </div>
            </div>

            {/* Live Count & Financial Summary */}
            <div className="pt-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-slate-600 text-[11px] gap-2">
              <span>Registros selecionados: <strong className="text-slate-900">{filteredServices.length} serviÃ§os</strong></span>
              <div className="flex items-center gap-3">
                <span>Bruto: <strong className="text-slate-900">{formatCurrency(totalGross)}</strong></span>
                <span>â€¢</span>
                <span>Saldo a Receber: <strong className="text-sky-700 font-bold">{formatCurrency(balancePending)}</strong></span>
              </div>
            </div>
          </div>

          {/* FEATURED: BALANÃ‡O MENSAL CONSOLIDADO (PDF EXECUTIVO PARA CLIENTE) */}
          <div className="p-4 rounded-xl border-2 border-sky-300 bg-linear-to-br from-sky-50/90 via-indigo-50/40 to-slate-50 shadow-sm relative overflow-hidden space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-sky-600 text-white rounded-xl shadow-xs shrink-0">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-slate-900">
                      BalanÃ§o Mensal Consolidado (PDF Executivo)
                    </h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      Recomendado para envio ao cliente
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    RelatÃ³rio profissional consolidado contendo resumo financeiro executivo, 
                    <strong> grÃ¡ficos visuais de liquidez e categorias</strong>, simulaÃ§Ã£o com Nota Fiscal (+38%), 
                    <strong> dados bancÃ¡rios para acerto via PIX</strong>, espaÃ§o para assinaturas e detalhamento analÃ­tico.
                  </p>
                </div>
              </div>
            </div>

            {/* Checklist of elements in this report */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-1 text-[11px] text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>BalanÃ§o Financeiro</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>GrÃ¡ficos em Vetor</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>InstruÃ§Ãµes PIX</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Dupla Assinatura</span>
              </div>
            </div>

            <div className="pt-2 border-t border-sky-150 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 italic">
                Formato A4 pronto para impressÃ£o ou envio por WhatsApp/E-mail.
              </span>
              <button
                type="button"
                id="btn-export-consolidated-pdf"
                onClick={handleExportConsolidatedPdf}
                disabled={isGeneratingConsolidated || filteredServices.length === 0}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm shadow-sky-600/25 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isGeneratingConsolidated ? 'Gerando BalanÃ§o...' : 'Gerar BalanÃ§o Consolidado em PDF'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Secondary Action Cards (RelatÃ³rio simples & Excel) */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Outros Formatos de ExportaÃ§Ã£o:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* PDF Simples Card */}
              <div 
                onClick={handleExportPdf}
                className="p-3.5 bg-white hover:bg-rose-50/40 border border-slate-200 hover:border-rose-300 rounded-xl transition cursor-pointer group shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs">RelatÃ³rio Geral em PDF</h5>
                      <span className="text-[10px] text-slate-500">Listagem tabular</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Listagem de serviÃ§os com cabeÃ§alho simples e colunas numeradas.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-rose-600 font-bold text-xs">
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </div>
              </div>

              {/* Excel Card */}
              <div 
                onClick={isGeneratingExcel ? undefined : handleExportExcel}
                className="p-3.5 bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 rounded-xl transition cursor-pointer group shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs">Planilha Excel (.xlsx)</h5>
                      <span className="text-[10px] text-slate-500">MÃºltiplas abas</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Planilha completa com serviÃ§os, resumo e cadastros.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-emerald-700 font-bold text-xs">
                  <Download className="w-3.5 h-3.5" />
                  <span>{isGeneratingExcel ? 'Gerando planilha...' : 'Baixar Excel'}</span>
                </div>
              </div>

              {/* CÃ³digo Completo ZIP Card */}
              <div 
                onClick={handleDownloadZip}
                className="p-3.5 bg-white hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-400 rounded-xl transition cursor-pointer group shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs">CÃ³digo do PWA (.ZIP)</h5>
                      <span className="text-[10px] text-indigo-600 font-semibold">Projeto Completo</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    CÃ³digo-fonte completo do PWA, assets, Ã­cones, regras e scripts para rodar localmente.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-indigo-600 font-bold text-xs">
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar ZIP Completo</span>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Documentos gerados em conformidade e prontos para prestaÃ§Ã£o de contas</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

