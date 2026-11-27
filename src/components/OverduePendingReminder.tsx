import React, { useState } from 'react';
import { 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  CreditCard, 
  Building2, 
  Calendar, 
  Eye, 
  Send, 
  X,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { ServiceRecord } from '../types';
import { OverduePendingSummary } from '../utils/pendingReminder';
import { formatCurrency, formatDate } from '../utils/formatters';

interface OverduePendingReminderProps {
  overdueSummary: OverduePendingSummary;
  onFilterPending: () => void;
  onOpenPaymentModal?: (service: ServiceRecord) => void;
  onViewPhotos?: (service: ServiceRecord) => void;
}

export const OverduePendingReminder: React.FC<OverduePendingReminderProps> = ({
  overdueSummary,
  onFilterPending,
  onOpenPaymentModal,
  onViewPhotos,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (overdueSummary.count === 0) {
    return null;
  }

  // Se o usuário dispensou temporariamente, exibe um mini badge discreto
  if (isDismissed) {
    return (
      <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/60 rounded-xl px-3.5 py-2 text-xs text-amber-900 shadow-2xs transition">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
          <span className="font-medium">
            <strong>{overdueSummary.count}</strong> serviço(s) pendente(s) há mais de 30 dias ({formatCurrency(overdueSummary.totalBalance)}).
          </span>
        </div>
        <button
          onClick={() => setIsDismissed(false)}
          className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer text-xs ml-2"
        >
          Ver Lembrete
        </button>
      </div>
    );
  }

  return (
    <div className="bg-linear-to-r from-amber-50/90 via-orange-50/60 to-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 text-slate-800 shadow-2xs transition-all relative overflow-hidden">
      {/* Decorative left accent line */}
      <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-linear-to-b from-amber-400 via-orange-400 to-amber-500" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Side: Icon, Badge and Summary Text */}
        <div className="flex items-start sm:items-center gap-3">
          <div className="relative p-2.5 bg-amber-100/90 text-amber-800 rounded-xl shrink-0 mt-0.5 sm:mt-0 shadow-2xs">
            <Clock className="w-5 h-5 text-amber-700" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-amber-200/80 text-amber-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-300/80">
                {overdueSummary.count} {overdueSummary.count === 1 ? 'serviço' : 'serviços'} &gt; 30 dias
              </span>
            </div>

            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
              Existem <strong>{overdueSummary.count} {overdueSummary.count === 1 ? 'serviço com status pendente' : 'serviços com status pendente'}</strong> há mais de um mês sem confirmação de quitação, totalizando{' '}
              <strong className="text-amber-900 font-bold">{formatCurrency(overdueSummary.totalBalance)}</strong> a receber.
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1.5 bg-white hover:bg-amber-100/70 border border-amber-300/80 text-amber-900 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>{isExpanded ? 'Ocultar Lista' : 'Ver Detalhes'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onFilterPending}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Filtrar tabela por serviços pendentes"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar Tabela</span>
          </button>

          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-amber-700/70 hover:text-amber-900 hover:bg-amber-100/60 rounded-lg transition cursor-pointer"
            title="Minimizar lembrete"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Details List */}
      {isExpanded && (
        <div className="mt-3.5 pt-3.5 border-t border-amber-200/70 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider mb-2">
            Relação de serviços pendentes que requerem acompanhamento:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {overdueSummary.services.map((item) => (
              <div 
                key={item.id}
                className="bg-white/95 rounded-xl border border-amber-200/90 p-3 shadow-2xs hover:border-amber-400 transition flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-xs text-slate-900 truncate max-w-[200px]" title={item.storeName}>
                        {item.storeName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {item.storeCnpj}
                      </p>
                    </div>

                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-300">
                      <Clock className="w-3 h-3 text-amber-700" />
                      {item.daysPending} dias
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 mt-1.5 line-clamp-1 font-medium" title={item.description}>
                    {item.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(item.date)}
                    </span>
                    <span>•</span>
                    <span className="font-bold text-amber-800">
                      Valor Pendente: {formatCurrency(item.balancePending)}
                    </span>
                  </div>
                </div>

                {/* Quick actions for this specific overdue service */}
                <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                  {onViewPhotos && item.photos && item.photos.length > 0 && (
                    <button
                      onClick={() => onViewPhotos(item)}
                      className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-[10px] font-semibold border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3 h-3 text-slate-500" />
                      <span>Fotos ({item.photos.length})</span>
                    </button>
                  )}

                  {onOpenPaymentModal && (
                    <button
                      onClick={() => onOpenPaymentModal(item)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                    >
                      <CreditCard className="w-3 h-3" />
                      <span>Baixar Pagamento</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
