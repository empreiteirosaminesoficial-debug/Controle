import React, { useState } from 'react';
import { 
  Camera, 
  Calendar, 
  Building2, 
  MoreVertical, 
  PlusCircle, 
  CheckCircle2, 
  Receipt, 
  Edit3, 
  Trash2, 
  Eye, 
  DollarSign, 
  ArrowUpDown,
  Filter,
  Image as ImageIcon,
  Clock,
  LayoutGrid,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { PaymentStatus, ServiceRecord, StoreProfile } from '../types';
import { formatCurrency, formatDate, getStatusDetails } from '../utils/formatters';
import { calculateDaysPending, isServiceOverduePending } from '../utils/pendingReminder';

interface ServicesTableProps {
  services: ServiceRecord[];
  stores: StoreProfile[];
  monthFilter: string;
  onMonthFilterChange: (m: string) => void;
  statusFilter: string;
  onStatusFilterChange: (s: string) => void;
  onViewPhotos: (service: ServiceRecord) => void;
  onAddDebit: (service: ServiceRecord) => void;
  onAddPayment: (service: ServiceRecord) => void;
  onEditService: (service: ServiceRecord) => void;
  onDeleteService: (serviceId: string) => void;
  onStatusChange: (service: ServiceRecord, newStatus: PaymentStatus) => void;
  onOpenNewService?: () => void;
  isClientReadOnly?: boolean;
  viewMode?: 'detalhes' | 'lista' | 'calendario';
  onViewModeChange?: (mode: 'detalhes' | 'lista' | 'calendario') => void;
}

export const ServicesTable: React.FC<ServicesTableProps> = ({
  services,
  stores,
  monthFilter,
  onMonthFilterChange,
  statusFilter,
  onStatusFilterChange,
  onViewPhotos,
  onAddDebit,
  onAddPayment,
  onEditService,
  onDeleteService,
  onStatusChange,
  onOpenNewService,
  isClientReadOnly = false,
  viewMode: propViewMode,
  onViewModeChange,
}) => {
  const [internalViewMode, setInternalViewMode] = useState<'detalhes' | 'lista' | 'calendario'>('lista');
  const currentViewMode = propViewMode ?? internalViewMode;

  const setViewMode = (mode: 'detalhes' | 'lista' | 'calendario') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
    setInternalViewMode(mode);
  };

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'date' | 'value' | 'store'>('date');
  const [sortAsc, setSortAsc] = useState(false);

  // Calendar State
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDayServices, setSelectedCalendarDayServices] = useState<{ day: string; items: ServiceRecord[] } | null>(null);

  // Month list available in services
  const monthsAvailable = Array.from(
    new Set(services.map((s) => s.date.slice(0, 7)))
  ).sort().reverse() as string[];

  // Sorting
  const sortedServices = [...services].sort((a, b) => {
    if (sortField === 'date') {
      return sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    }
    if (sortField === 'value') {
      return sortAsc ? a.valueCharged - b.valueCharged : b.valueCharged - a.valueCharged;
    }
    if (sortField === 'store') {
      return sortAsc ? a.storeName.localeCompare(b.storeName) : b.storeName.localeCompare(a.storeName);
    }
    return 0;
  });

  const handleSort = (field: 'date' | 'value' | 'store') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Calendar calculations
  const calYear = calendarDate.getFullYear();
  const calMonth = calendarDate.getMonth();
  const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const prevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
    setSelectedCalendarDayServices(null);
  };
  const nextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
    setSelectedCalendarDayServices(null);
  };
  const todayMonth = () => {
    setCalendarDate(new Date());
    setSelectedCalendarDayServices(null);
  };

  const calMonthLabel = calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* ================= MODE 1: LISTA (TABELA TRADICIONAL) ================= */}
      {currentViewMode === 'lista' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 text-slate-600 border-b border-slate-200 select-none">
                <th 
                  onClick={() => handleSort('date')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-sky-600 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Data</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('store')}
                  className="py-3 px-3.5 font-semibold cursor-pointer hover:text-sky-600 transition"
                >
                  <div className="flex items-center gap-1">
                    <span>Loja / CNPJ ou CPF</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 font-semibold">Descrição do Serviço</th>
                <th className="py-3 px-3.5 font-semibold text-center">Fotos</th>
                <th 
                  onClick={() => handleSort('value')}
                  className="py-3 px-3.5 font-semibold text-right cursor-pointer hover:text-sky-600 transition"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Valor Cobrado</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-3.5 font-semibold text-right">Débito Extra</th>
                <th className="py-3 px-3.5 font-semibold text-right">Valor Pago</th>
                <th className="py-3 px-3.5 font-semibold text-center">Status Pagamento</th>
                <th className="py-3 px-3.5 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedServices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt className="w-8 h-8 text-slate-300 stroke-1" />
                      <p className="font-medium text-slate-600 text-sm">Nenhum serviço encontrado com os filtros aplicados</p>
                      <p className="text-xs text-slate-400">Crie um novo registro de serviço ou limpe os filtros.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedServices.map((service) => {
                  const statusDetails = getStatusDetails(service.paymentStatus);
                  const hasPhotos = service.photos && service.photos.length > 0;
                  const balancePending = (service.valueCharged + service.valueDebit) - service.valuePaid;
                  const daysPending = calculateDaysPending(service);
                  const isOverduePending = service.paymentStatus === 'pendente' && daysPending > 30;

                  return (
                    <tr 
                      key={service.id} 
                      className={`transition-colors group ${
                        isOverduePending 
                          ? 'bg-amber-50/50 hover:bg-amber-100/60 border-l-4 border-l-amber-500' 
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{formatDate(service.date)}</div>
                        {service.dueDate && (
                          <div className="text-[10px] text-slate-400">Venc: {formatDate(service.dueDate)}</div>
                        )}
                      </td>

                      {/* Store */}
                      <td className="py-3 px-3.5 max-w-[180px]">
                        <div className="font-bold text-slate-900 truncate" title={service.storeName}>
                          {service.storeName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{service.storeCnpj}</div>
                      </td>

                      {/* Description / SINAPI Title */}
                      <td className="py-3 px-3.5 max-w-[260px]">
                        {service.sinapiCode && (
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              SINAPI {service.sinapiCode}
                            </span>
                            {service.sinapiUnit && service.sinapiQuantity && (
                              <span className="text-[10px] text-emerald-700 font-bold font-mono">
                                ({service.sinapiQuantity} {service.sinapiUnit})
                              </span>
                            )}
                          </div>
                        )}
                        <div className="font-semibold text-slate-800 truncate" title={service.serviceTitle || service.description}>
                          {service.serviceTitle || service.description}
                        </div>
                        {service.serviceTitle && service.description && service.description !== service.serviceTitle && (
                          <div className="text-[11px] text-slate-500 truncate" title={service.description}>
                            {service.description}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                            {service.category}
                          </span>
                          {service.paymentMethod && (
                            <span className="text-[10px] text-slate-400">
                              • {service.paymentMethod}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Photos */}
                      <td className="py-3 px-3.5 text-center">
                        <button
                          onClick={() => onViewPhotos(service)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
                            hasPhotos 
                              ? 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200' 
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={hasPhotos ? `${service.photos.length} fotos anexadas` : 'Adicionar fotos'}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>{service.photos?.length || 0}</span>
                        </button>
                      </td>

                      {/* Value Charged */}
                      <td className="py-3 px-3.5 text-right font-medium text-slate-900 whitespace-nowrap">
                        {formatCurrency(service.valueCharged)}
                      </td>

                      {/* Debit Extra */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        {service.valueDebit > 0 ? (
                          <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[11px]">
                            +{formatCurrency(service.valueDebit)}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Value Paid */}
                      <td className="py-3 px-3.5 text-right font-medium whitespace-nowrap">
                        <span className={service.valuePaid > 0 ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                          {formatCurrency(service.valuePaid)}
                        </span>
                        {balancePending > 0 && service.valuePaid > 0 && (
                          <div className="text-[10px] text-rose-600 font-medium">
                            Falta: {formatCurrency(balancePending)}
                          </div>
                        )}
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusDetails.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDetails.bgClass}`} />
                          {statusDetails.label}
                        </span>
                        {isOverduePending && (
                          <div className="text-[10px] text-amber-700 font-bold mt-0.5 flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{daysPending}d pendente</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Photos button - accessible to everyone including clients */}
                          <button
                            onClick={() => onViewPhotos(service)}
                            title="Fotos do serviço"
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                          >
                            <Camera className="w-4 h-4 text-sky-600" />
                          </button>

                          {!isClientReadOnly && (
                            <>
                              {/* Quick Add Debit button */}
                              <button
                                onClick={() => onAddDebit(service)}
                                title="Adicionar débito ou custo extra"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>

                              {/* Quick Add Payment button */}
                              <button
                                onClick={() => onAddPayment(service)}
                                title="Registrar pagamento ou quitação manual"
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>

                              {/* Edit button */}
                              <button
                                onClick={() => onEditService(service)}
                                title="Editar serviço"
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => {
                                  if (confirm(`Excluir o registro "${service.description}"?`)) {
                                    onDeleteService(service.id);
                                  }
                                }}
                                title="Excluir registro"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= MODE 2: DETALHES (CARDS RICOS E COMPLETOS) ================= */}
      {currentViewMode === 'detalhes' && (
        <div className="p-4 bg-slate-50/40">
          {sortedServices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <Receipt className="w-8 h-8 text-slate-300 stroke-1 mx-auto mb-2" />
              <p className="font-medium text-slate-600 text-sm">Nenhum serviço encontrado com os filtros aplicados</p>
              <p className="text-xs text-slate-400 mt-1">Crie um novo serviço ou altere os filtros acima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedServices.map((service) => {
                const statusDetails = getStatusDetails(service.paymentStatus);
                const hasPhotos = service.photos && service.photos.length > 0;
                const balancePending = (service.valueCharged + service.valueDebit) - service.valuePaid;
                const daysPending = calculateDaysPending(service);
                const isOverduePending = service.paymentStatus === 'pendente' && daysPending > 30;

                return (
                  <div
                    key={service.id}
                    className={`bg-white rounded-2xl border p-4.5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 ${
                      isOverduePending 
                        ? 'border-amber-300 ring-2 ring-amber-100' 
                        : 'border-slate-200 hover:border-sky-300'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Card Header: Store & Date */}
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div>
                          <div className="flex items-center gap-1.5 text-slate-900 font-extrabold text-sm truncate max-w-[200px]" title={service.storeName}>
                            <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                            <span className="truncate">{service.storeName}</span>
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 ml-5 block">{service.storeCnpj}</span>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusDetails.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusDetails.bgClass}`} />
                            {statusDetails.label}
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{formatDate(service.date)}</span>
                        </div>
                      </div>

                      {/* Service Description */}
                      <div>
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {service.sinapiCode && (
                            <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              SINAPI {service.sinapiCode}
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                            {service.category}
                          </span>
                          {service.paymentMethod && (
                            <span className="text-[10px] font-medium text-slate-500">
                              • {service.paymentMethod}
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1 leading-relaxed">
                          {service.serviceTitle || service.description}
                        </h4>
                        {service.serviceTitle && service.description && service.description !== service.serviceTitle && (
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                            {service.description}
                          </p>
                        )}
                      </div>

                      {/* Financial KPI Box */}
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">Valor Cobrado</span>
                          <strong className="text-slate-900 font-extrabold text-xs">{formatCurrency(service.valueCharged)}</strong>
                          {service.valueDebit > 0 && (
                            <span className="text-[10px] text-amber-600 font-bold block">
                              +{formatCurrency(service.valueDebit)} débito
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-medium">Valor Pago</span>
                          <strong className="text-emerald-700 font-extrabold text-xs">{formatCurrency(service.valuePaid)}</strong>
                          {balancePending > 0 ? (
                            <span className="text-[10px] text-rose-600 font-bold block">
                              Pendente: {formatCurrency(balancePending)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-bold block">Quitado 100%</span>
                          )}
                        </div>
                      </div>

                      {/* Photo preview strip */}
                      {hasPhotos && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <div className="flex -space-x-1.5 overflow-hidden">
                            {service.photos.slice(0, 3).map((photo, i) => (
                              <img
                                key={photo.id || i}
                                src={photo.dataUrl}
                                alt={photo.name}
                                className="inline-block h-7 w-7 rounded-md object-cover ring-2 ring-white"
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => onViewPhotos(service)}
                            className="text-[11px] text-sky-700 hover:text-sky-900 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            <span>{service.photos.length} fotos anexadas</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onViewPhotos(service)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Ver fotos do serviço"
                        >
                          <Camera className="w-3.5 h-3.5 text-sky-600" />
                        </button>
                        {!isClientReadOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => onAddDebit(service)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Lançar débito ou material extra"
                            >
                              <Receipt className="w-3 h-3 text-amber-600" />
                              <span>+ Débito</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onAddPayment(service)}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                              title="Registrar pagamento ou quitação"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>+ Quitar</span>
                            </button>
                          </>
                        )}
                      </div>

                      {!isClientReadOnly && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onEditService(service)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer"
                            title="Editar Serviço"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Excluir o registro "${service.description}"?`)) {
                                onDeleteService(service.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition cursor-pointer"
                            title="Excluir Serviço"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= MODE 3: CALENDÁRIO (GRADE MENSAL INTERATIVA) ================= */}
      {currentViewMode === 'calendario' && (
        <div className="p-4 space-y-4">
          {/* Calendar Month Navigation Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-sky-600" />
              <h3 className="font-extrabold text-slate-900 text-base capitalize">
                {calMonthLabel}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevMonth}
                className="p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 transition cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={todayMonth}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                Mês Atual (Hoje)
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-2 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 transition cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
            {/* Day of Week Header */}
            <div className="grid grid-cols-7 bg-slate-100/90 border-b border-slate-200 text-center text-xs font-bold text-slate-700 py-2">
              <span className="text-rose-600">Domingo</span>
              <span>Segunda</span>
              <span>Terça</span>
              <span>Quarta</span>
              <span>Quinta</span>
              <span>Sexta</span>
              <span className="text-slate-500">Sábado</span>
            </div>

            {/* Days Matrix */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 text-xs">
              {/* Blank cells for offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`blank-${i}`} className="min-h-[90px] bg-slate-50/40 p-1.5 text-slate-300">
                  <span className="text-[11px] select-none">-</span>
                </div>
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayServices = sortedServices.filter((s) => s.date === dayStr);

                const isToday = 
                  new Date().getDate() === dayNum && 
                  new Date().getMonth() === calMonth && 
                  new Date().getFullYear() === calYear;

                const dayTotal = dayServices.reduce((acc, s) => acc + s.valueCharged + s.valueDebit, 0);

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => {
                      if (dayServices.length > 0) {
                        setSelectedCalendarDayServices({ day: dayStr, items: dayServices });
                      }
                    }}
                    className={`min-h-[105px] p-2 transition-all flex flex-col justify-between ${
                      dayServices.length > 0 ? 'cursor-pointer hover:bg-sky-50/50' : 'bg-white'
                    } ${isToday ? 'bg-sky-50/70 border-2 border-sky-400' : ''}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            isToday ? 'bg-sky-600 text-white' : 'text-slate-800'
                          }`}
                        >
                          {dayNum}
                        </span>

                        {dayServices.length > 0 && (
                          <span className="text-[10px] font-extrabold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded-md">
                            {dayServices.length} {dayServices.length === 1 ? 'sv' : 'svs'}
                          </span>
                        )}
                      </div>

                      {/* Service Chips inside Day */}
                      <div className="space-y-1">
                        {dayServices.slice(0, 2).map((srv) => {
                          const statusDetails = getStatusDetails(srv.paymentStatus);
                          return (
                            <div
                              key={srv.id}
                              className={`p-1 rounded text-[10px] border truncate flex items-center justify-between gap-1 ${statusDetails.badgeClass}`}
                              title={`${srv.storeName}: ${srv.description} (${formatCurrency(srv.valueCharged)})`}
                            >
                              <span className="truncate font-semibold">{srv.storeName}</span>
                              <span className="font-mono shrink-0">{formatCurrency(srv.valueCharged)}</span>
                            </div>
                          );
                        })}

                        {dayServices.length > 2 && (
                          <div className="text-[10px] text-slate-500 font-bold text-center">
                            +{dayServices.length - 2} mais...
                          </div>
                        )}
                      </div>
                    </div>

                    {dayTotal > 0 && (
                      <div className="text-right text-[10px] font-extrabold text-slate-600 pt-1 border-t border-slate-100">
                        {formatCurrency(dayTotal)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Details Panel */}
          {selectedCalendarDayServices && (
            <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-sky-600 text-white rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      Serviços do dia {formatDate(selectedCalendarDayServices.day)}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {selectedCalendarDayServices.items.length} registro(s) neste dia
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCalendarDayServices(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                >
                  Fechar painel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {selectedCalendarDayServices.items.map((service) => {
                  const statusDetails = getStatusDetails(service.paymentStatus);
                  const balancePending = (service.valueCharged + service.valueDebit) - service.valuePaid;

                  return (
                    <div
                      key={service.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 truncate max-w-[170px]" title={service.storeName}>
                          {service.storeName}
                        </strong>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusDetails.badgeClass}`}>
                          {statusDetails.label}
                        </span>
                      </div>

                      <p className="text-slate-700 text-xs line-clamp-2">{service.description}</p>

                      <div className="flex items-center justify-between pt-1 text-[11px] border-t border-slate-100">
                        <span className="text-slate-500">Cobrado: <strong>{formatCurrency(service.valueCharged)}</strong></span>
                        <span className="text-emerald-700 font-bold">Pago: {formatCurrency(service.valuePaid)}</span>
                      </div>

                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => onViewPhotos(service)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Camera className="w-3 h-3 text-sky-600" />
                          <span>Fotos ({service.photos?.length || 0})</span>
                        </button>
                        {!isClientReadOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => onAddPayment(service)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Quitar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditService(service)}
                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
