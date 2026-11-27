import React, { useState } from 'react';
import { 
  Receipt, 
  Image as ImageIcon, 
  Search, 
  Download, 
  ExternalLink, 
  Calendar, 
  Building2, 
  DollarSign, 
  CheckCircle2, 
  FileCheck,
  X,
  Eye,
  Filter,
  Plus
} from 'lucide-react';
import { ServicePhoto, ServiceRecord, StoreProfile } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { getInstallmentsWithLegacy, openConsolidatedReceipt } from '../../utils/consolidatedReceipt';

interface ComprovantesPageProps {
  services: ServiceRecord[];
  stores: StoreProfile[];
  onOpenPhotoModal: (service: ServiceRecord) => void;
  onOpenGenerateReceipt?: () => void;
}

interface ProofItem {
  id: string;
  serviceId: string;
  serviceName: string;
  storeName: string;
  date: string;
  value: number;
  paymentMethod: string;
  paymentStatus: string;
  photo: ServicePhoto;
  isReceipt: boolean;
}

export const ComprovantesPage: React.FC<ComprovantesPageProps> = ({
  services,
  stores,
  onOpenPhotoModal,
  onOpenGenerateReceipt,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'comprovantes' | 'fotos'>('todos');
  const [selectedProof, setSelectedProof] = useState<ProofItem | null>(null);

  // Flatten all photos and receipts from all services
  const allProofItems: ProofItem[] = [];

  services.forEach((s) => {
    if (s.photos && s.photos.length > 0) {
      s.photos.forEach((p, idx) => {
        const isReceipt = (p.caption && p.caption.toLowerCase().includes('comprovante')) ||
          (p.name && (p.name.toLowerCase().includes('pix') || p.name.toLowerCase().includes('recibo') || p.name.toLowerCase().includes('comprovante')));

        allProofItems.push({
          id: `${s.id}_${p.id || idx}`,
          serviceId: s.id,
          serviceName: s.description,
          storeName: s.storeName,
          date: s.paidDate || s.date,
          value: s.valuePaid > 0 ? s.valuePaid : s.valueCharged,
          paymentMethod: s.paymentMethod,
          paymentStatus: s.paymentStatus,
          photo: p,
          isReceipt: isReceipt || false,
        });
      });
    }
  });

  const filteredItems = allProofItems.filter((item) => {
    if (filterType === 'comprovantes' && !item.isReceipt) return false;
    if (filterType === 'fotos' && item.isReceipt) return false;

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.serviceName.toLowerCase().includes(q) ||
      item.storeName.toLowerCase().includes(q) ||
      (item.photo.caption && item.photo.caption.toLowerCase().includes(q)) ||
      (item.photo.name && item.photo.name.toLowerCase().includes(q))
    );
  });

  const handleDownloadImage = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename || 'comprovante_samines.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const totalAttachments = allProofItems.length;
  const receiptsCount = allProofItems.filter(i => i.isReceipt).length;
  const photosCount = allProofItems.filter(i => !i.isReceipt).length;

  // Serviços com parcelas registradas ou comprovante de quitação.
  const paymentServices = services
    .filter((s) => s.consolidatedReceipt || (s.paymentHistory && s.paymentHistory.length > 0))
    .sort((a, b) => (b.consolidatedReceipt?.generatedAt || b.updatedAt || '').localeCompare(a.consolidatedReceipt?.generatedAt || a.updatedAt || ''));
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {paymentServices.length > 0 && (
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Parcelas e comprovantes de quitação</h3>
              <p className="text-xs text-slate-500">Histórico de pagamentos por serviço. Ao quitar, o comprovante consolidado é gerado automaticamente.</p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {paymentServices.map((service) => {
              const installments = getInstallmentsWithLegacy(service);
              const due = (service.valueCharged || 0) + (service.valueDebit || 0);
              const remaining = Math.max(0, due - (service.valuePaid || 0));
              const expanded = expandedServiceId === service.id;
              return (
                <li key={service.id} className="py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedServiceId(expanded ? null : service.id)}
                      className="text-left min-w-0 cursor-pointer"
                    >
                      <p className="text-sm font-bold text-slate-800 truncate">{service.serviceTitle || service.description}</p>
                      <p className="text-xs text-slate-500">
                        {service.storeName} · {installments.length} parcela(s) · pago {formatCurrency(service.valuePaid || 0)} de {formatCurrency(due)}
                        {remaining > 0.009 ? ` · falta ${formatCurrency(remaining)}` : ''}
                      </p>
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      {service.consolidatedReceipt ? (
                        <button
                          type="button"
                          onClick={() => openConsolidatedReceipt(service)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Comprovante de quitação
                        </button>
                      ) : (
                        <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-extrabold uppercase">Em aberto</span>
                      )}
                    </div>
                  </div>
                  {expanded && (
                    <table className="mt-2 w-full text-xs">
                      <thead>
                        <tr className="text-slate-500 text-left">
                          <th className="py-1 pr-2">Data</th>
                          <th className="py-1 pr-2">Forma</th>
                          <th className="py-1 pr-2">Recibo</th>
                          <th className="py-1 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installments.map((item) => (
                          <tr key={item.id} className="border-t border-slate-100">
                            <td className="py-1 pr-2">{item.date.split('-').reverse().join('/')}</td>
                            <td className="py-1 pr-2 uppercase">{item.method}</td>
                            <td className="py-1 pr-2">{item.receiptNumber || (item.note ? <span className="text-slate-400">{item.note}</span> : '—')}</td>
                            <td className="py-1 text-right font-bold">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-600 text-white rounded-xl shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Central de Comprovantes & Fotos</h2>
              <p className="text-xs text-slate-500">Recibos de quitação PIX/Boleto, relatórios fotográficos de antes, durante e depois das obras</p>
            </div>
          </div>
        </div>

        {onOpenGenerateReceipt && (
          <button
            type="button"
            onClick={onOpenGenerateReceipt}
            className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Gera Comprovante</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total de Anexos</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">{totalAttachments}</span>
          <span className="text-[11px] text-slate-500">Documentos e mídias vinculadas</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-600 block tracking-wider">Comprovantes Financeiros</span>
          <span className="text-xl font-extrabold text-amber-700 mt-1 block">{receiptsCount}</span>
          <span className="text-[11px] text-amber-600">Quitações e recibos de pagamento</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-200 bg-sky-50/30 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase text-sky-600 block tracking-wider">Fotos de Execução</span>
          <span className="text-xl font-extrabold text-sky-700 mt-1 block">{photosCount}</span>
          <span className="text-[11px] text-sky-600">Evidências de vistorias e obras</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por serviço, loja ou descrição do anexo..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilterType('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === 'todos' ? 'bg-slate-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({allProofItems.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('comprovantes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === 'comprovantes' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Comprovantes ({receiptsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('fotos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterType === 'fotos' ? 'bg-sky-600 text-white shadow-2xs' : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
            }`}
          >
            Fotos de Obras ({photosCount})
          </button>
        </div>
      </div>

      {/* Grid of Proof Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
            <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-bold text-sm">Nenhum comprovante ou foto encontrado</p>
            <p className="text-slate-500 text-xs mt-0.5">Anexe fotos e comprovantes diretamente nos serviços na página de Serviços.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Media Thumbnail */}
              <div 
                className="relative h-44 bg-slate-100 overflow-hidden cursor-pointer"
                onClick={() => setSelectedProof(item)}
              >
                <img
                  src={item.photo.dataUrl}
                  alt={item.photo.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                
                {/* Badge Overlay */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs backdrop-blur-xs ${
                    item.isReceipt 
                      ? 'bg-amber-600/90 text-white' 
                      : 'bg-sky-600/90 text-white'
                  }`}>
                    {item.isReceipt ? 'Comprovante' : 'Foto da Obra'}
                  </span>
                </div>

                <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <span className="p-2 bg-white/90 text-slate-800 rounded-full shadow-md">
                    <Eye className="w-4 h-4" />
                  </span>
                </div>
              </div>

              {/* Media Details */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs leading-snug line-clamp-1">
                    {item.photo.caption || item.photo.name || 'Arquivo Anexado'}
                  </h4>

                  <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 font-medium">
                    <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{item.storeName}</span>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-tight">
                    {item.serviceName}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Valor:</span>
                    <strong className="text-slate-800 font-extrabold">{formatCurrency(item.value)}</strong>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDownloadImage(item.photo.dataUrl, item.photo.name)}
                    className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                    title="Baixar arquivo original"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Lightbox / Zoom Modal */}
      {selectedProof && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {selectedProof.photo.caption || selectedProof.photo.name || 'Visualização do Anexo'}
                </h3>
                <span className="text-xs text-slate-500">{selectedProof.storeName} • {selectedProof.serviceName}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center overflow-auto flex-1 max-h-[60vh]">
              <img
                src={selectedProof.photo.dataUrl}
                alt={selectedProof.photo.name}
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Valor do serviço: <strong>{formatCurrency(selectedProof.value)}</strong></span>
                <span className="mx-2 text-slate-300">•</span>
                <span className="text-slate-500">Pagamento: <strong>{selectedProof.paymentMethod} ({selectedProof.paymentStatus})</strong></span>
              </div>

              <button
                type="button"
                onClick={() => handleDownloadImage(selectedProof.photo.dataUrl, selectedProof.photo.name)}
                className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Imagem</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
