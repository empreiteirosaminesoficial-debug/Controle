import React, { useState, useRef } from 'react';
import { 
  CalendarClock, 
  PlusCircle, 
  Search, 
  MapPin, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Building2, 
  UserCheck, 
  FileText,
  DollarSign,
  X,
  Trash2,
  Filter,
  Check,
  Edit2,
  Save,
  Plus,
  LayoutGrid,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Camera,
  Image as ImageIcon,
  Bell,
  Eye,
  MessageCircle
} from 'lucide-react';
import { StoreProfile, UserProfile, VisitaPurpose, VisitaRecord, VisitaStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { loadWhatsAppConfig } from '../../utils/whatsappStorage';
import { formatTemplateMessage, sendWhatsAppMessage } from '../../utils/whatsappSender';

interface VisitasPageProps {
  visitas: VisitaRecord[];
  onSaveVisita: (visita: VisitaRecord) => void;
  onDeleteVisita: (id: string) => void;
  stores: StoreProfile[];
  user: UserProfile;
}

export const VisitasPage: React.FC<VisitasPageProps> = ({
  visitas,
  onSaveVisita,
  onDeleteVisita,
  stores,
  user,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [purposeFilter, setPurposeFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'detalhes' | 'lista' | 'calendario'>('detalhes');
  const [calendarDate, setCalendarDate] = useState(() => new Date());
  const [selectedCalendarDayVisitas, setSelectedCalendarDayVisitas] = useState<{ day: string; items: VisitaRecord[] } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVisita, setEditingVisita] = useState<VisitaRecord | null>(null);

  // Form states - simplified strictly to user specifications
  const [clientName, setClientName] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [requestedDate, setRequestedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [requestedTime, setRequestedTime] = useState('');
  const [requestedPurpose, setRequestedPurpose] = useState<VisitaPurpose>('orcamento');
  const [visitStatus, setVisitStatus] = useState<VisitaStatus>('agendada');
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = user?.role === 'admin' || (user?.email ? user.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com' : false);

  const handlePhotoFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          setPhotos((prev) => [...prev, result]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const openNewModal = () => {
    setEditingVisita(null);
    setSelectedStoreId(stores[0]?.id || '');
    const firstStore = stores[0];
    setClientName(firstStore ? firstStore.nomeFantasia : '');
    setNotificationTitle('');
    setNotes('');
    setPhotos([]);
    setRequestedDate(new Date().toISOString().slice(0, 10));
    setRequestedTime('');
    setRequestedPurpose('orcamento');
    setVisitStatus('agendada');
    setIsModalOpen(true);
  };

  const openEditModal = (visita: VisitaRecord) => {
    setEditingVisita(visita);
    setSelectedStoreId(visita.storeId || '');
    setClientName(visita.clientName);
    setNotificationTitle(visita.notificationTitle || '');
    setNotes(visita.notes || '');
    setPhotos(visita.photos || []);
    setRequestedDate(visita.date || new Date().toISOString().slice(0, 10));
    setRequestedTime(visita.time || '');
    setRequestedPurpose(visita.purpose || 'orcamento');
    setVisitStatus(visita.status);
    setIsModalOpen(true);
  };

  const handleStoreChange = (storeId: string) => {
    setSelectedStoreId(storeId);
    const st = stores.find(s => s.id === storeId);
    if (st) {
      setClientName(st.nomeFantasia);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    const matchedStore = stores.find((store) => store.id === selectedStoreId);
    if (!selectedStoreId || !matchedStore) {
      window.alert('Selecione um estabelecimento cadastrado para vincular esta visita.');
      return;
    }
    const finalStoreId = matchedStore.id;
    const todayDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);

    if (!isAdmin && !editingVisita) {
      const request: VisitaRecord = {
        id: `vis_req_${Date.now()}`,
        storeId: finalStoreId,
        clientName: matchedStore.nomeFantasia,
        clientDocument: matchedStore.cnpj || '',
        clientPhone: matchedStore.telefone || '',
        address: `${matchedStore.logradouro || ''}, ${matchedStore.municipio || ''}`.replace(/^, |, $/g, ''),
        date: requestedDate,
        time: requestedTime,
        purpose: requestedPurpose,
        technician: 'A definir pela equipe',
        status: 'solicitada',
        notificationTitle: `Solicitação de visita - ${matchedStore.nomeFantasia}`,
        notes: notes.trim(),
        createdByUid: user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveVisita(request);
      setIsModalOpen(false);
      return;
    }

    if (editingVisita) {
      const updatedVisita: VisitaRecord = {
        ...editingVisita,
        storeId: finalStoreId,
        clientName: clientName.trim(),
        notificationTitle: notificationTitle.trim() || `Visita Técnica - ${clientName.trim()}`,
        date: requestedDate,
        time: requestedTime || editingVisita.time,
        purpose: requestedPurpose,
        status: visitStatus,
        notes: notes.trim(),
        photos,
        updatedAt: new Date().toISOString(),
      };
      onSaveVisita(updatedVisita);
    } else {
      const newVisita: VisitaRecord = {
        id: `vis_${Date.now()}`,
        storeId: finalStoreId,
        clientName: clientName.trim(),
        clientDocument: matchedStore?.cnpj || '',
        clientPhone: matchedStore?.telefone || '',
        address: matchedStore ? `${matchedStore.logradouro || ''}, ${matchedStore.municipio || ''}` : '',
        date: todayDate,
        time: currentTime,
        purpose: 'orcamento',
        technician: 'Saminês & Equipe',
        status: 'realizada',
        notificationTitle: notificationTitle.trim() || `Nova Visita - ${clientName.trim()}`,
        notes: notes.trim(),
        photos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      onSaveVisita(newVisita);
    }

    setIsModalOpen(false);
  };

  const markAsCompleted = (visita: VisitaRecord) => {
    onSaveVisita({
      ...visita,
      status: 'realizada',
      updatedAt: new Date().toISOString(),
    });
  };

  // Filtered visitas
  const filteredVisitas = visitas.filter((v) => {
    if (statusFilter !== 'todos' && v.status !== statusFilter) return false;
    if (purposeFilter !== 'todos' && v.purpose !== purposeFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.clientName.toLowerCase().includes(q) ||
      v.address.toLowerCase().includes(q) ||
      (v.clientPhone && v.clientPhone.includes(q)) ||
      (v.notes && v.notes.toLowerCase().includes(q))
    );
  });

  const getPurposeLabel = (p: VisitaPurpose) => {
    switch (p) {
      case 'orcamento':
        return { label: 'Orçamento Técnico', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
      case 'vistoria_previa':
        return { label: 'Vistoria Prévia', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'acompanhamento':
        return { label: 'Acompanhamento de Obra', color: 'bg-sky-100 text-sky-800 border-sky-200' };
      case 'entrega_tecnica':
        return { label: 'Entrega Técnica Final', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'emergencial':
        return { label: 'Visita Emergencial', color: 'bg-rose-100 text-rose-800 border-rose-200' };
    }
  };

  const handleNotifyVisitaWhatsApp = (visita: VisitaRecord) => {
    const store = stores.find((s) => s.id === visita.storeId);
    const clientPhone = visita.clientPhone || store?.telefone;
    const clientName = visita.clientName || store?.nomeFantasia || 'Cliente';
    const waConfig = loadWhatsAppConfig();

    const purposeMap: Record<VisitaPurpose, string> = {
      orcamento: 'Orçamento Técnico',
      vistoria_previa: 'Vistoria Prévia',
      acompanhamento: 'Acompanhamento de Obra',
      entrega_tecnica: 'Entrega Técnica Final',
      emergencial: 'Visita Emergencial',
    };

    const text = formatTemplateMessage(waConfig.templates.visitaScheduled, {
      cliente: clientName,
      data: formatDate(visita.date),
      hora: visita.time || 'A combinar',
      endereco: visita.address || 'Endereço cadastrado',
      tecnico: visita.technician || 'Equipe Técnica Saminês',
      finalidade: visita.purpose ? purposeMap[visita.purpose] || visita.purpose : 'Vistoria Técnica',
    });

    sendWhatsAppMessage({
      phone: clientPhone,
      message: text,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Left side: Nova Visita button + View switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdmin ? (
            <button
              type="button"
              onClick={openNewModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/20 cursor-pointer"
              title="Abrir formulário de Nova Visita"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova Visita</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewModal}
              disabled={stores.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              title={stores.length ? 'Solicitar uma visita técnica para seu estabelecimento' : 'É necessário ter um estabelecimento aprovado para solicitar uma visita'}
            >
              <Plus className="w-4 h-4" />
              <span>Solicitar visita</span>
            </button>
          )}

          {/* View Mode Toggle: Detalhes, Lista, Calendario */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 px-2 hidden md:inline">Exibir em:</span>
            <button
              type="button"
              onClick={() => setViewMode('detalhes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'detalhes'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Exibir em modo Detalhes (Cards com fotos e resumo)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Detalhes</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'lista'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Exibir em modo Lista (Tabela resumida com fotos)"
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('calendario')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                viewMode === 'calendario'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              title="Exibir em modo Calendário (Grade mensal com agendamentos)"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Calendário</span>
            </button>
          </div>
        </div>

        {/* Right side: Search bar + Status & Purpose Filters */}
        <div className="flex items-center gap-2.5 flex-wrap w-full lg:w-auto">
          <div className="relative w-full sm:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, resumo..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="solicitada">Solicitada</option>
              <option value="agendada">Agendada</option>
              <option value="realizada">Realizada</option>
              <option value="cancelada">Cancelada</option>
            </select>

            <select
              value={purposeFilter}
              onChange={(e) => setPurposeFilter(e.target.value)}
              className="bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-xl px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
            >
              <option value="todos">Todas as Finalidades</option>
              <option value="orcamento">Orçamento Técnico</option>
              <option value="vistoria_previa">Vistoria Prévia</option>
              <option value="acompanhamento">Acompanhamento</option>
              <option value="entrega_tecnica">Entrega Técnica</option>
              <option value="emergencial">Emergencial</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================= MODE 1: DETALHES (CARDS) ================= */}
      {viewMode === 'detalhes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisitas.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
              <CalendarClock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-700 font-bold text-sm">Nenhuma visita técnica encontrada</p>
              <p className="text-slate-500 text-xs mt-0.5">Clique no botão abaixo para preencher o formulário.</p>
              <button
                type="button"
                onClick={openNewModal}
                className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Nova Visita</span>
              </button>
            </div>
          ) : (
            filteredVisitas.map((visita) => {
              const purposeInfo = getPurposeLabel(visita.purpose);
              const isDone = visita.status === 'realizada';
              const isCancelled = visita.status === 'cancelada';

              return (
                <div
                  key={visita.id}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 group ${
                    isDone ? 'border-emerald-200 bg-emerald-50/15' :
                    isCancelled ? 'border-rose-200 bg-rose-50/20' :
                    'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header badges */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${purposeInfo.color}`}>
                        {purposeInfo.label}
                      </span>

                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isDone ? 'bg-emerald-100 text-emerald-800' :
                        isCancelled ? 'bg-rose-100 text-rose-800' :
                        visita.status === 'solicitada' ? 'bg-amber-100 text-amber-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> :
                         isCancelled ? <XCircle className="w-3 h-3 text-rose-600" /> :
                         <Clock className={`w-3 h-3 ${visita.status === 'solicitada' ? 'text-amber-600' : 'text-indigo-600'}`} />}
                        <span>{visita.status === 'solicitada' ? 'Solicitada' : visita.status === 'agendada' ? 'Agendada' : visita.status === 'realizada' ? 'Realizada' : 'Cancelada'}</span>
                      </span>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {visita.clientName}
                    </h3>

                    {/* Título da Notificação */}
                    {visita.notificationTitle && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 bg-indigo-50 border border-indigo-200/80 px-2.5 py-1.5 rounded-lg mt-2 shadow-2xs">
                        <Bell className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{visita.notificationTitle}</span>
                      </div>
                    )}

                    <div className="space-y-1.5 mt-2.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-800">{visita.date ? formatDate(visita.date) : 'Data recente'}</span>
                        {visita.time && (
                          <>
                            <span className="text-slate-400">•</span>
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{visita.time}</span>
                          </>
                        )}
                      </div>

                      {visita.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] leading-tight text-slate-600 truncate">{visita.address}</span>
                        </div>
                      )}
                    </div>

                    {/* Resumo da Visita */}
                    {visita.notes && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-indigo-600" />
                          Resumo da Visita
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                          {visita.notes}
                        </p>
                      </div>
                    )}

                    {/* Fotos Anexadas */}
                    {visita.photos && visita.photos.length > 0 && (
                      <div className="mt-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5 flex items-center gap-1">
                          <Camera className="w-3 h-3 text-indigo-600" />
                          Fotos / Anexos ({visita.photos.length})
                        </span>
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {visita.photos.map((p, pIdx) => (
                            <div 
                              key={pIdx}
                              onClick={() => setSelectedPhotoModal(p)}
                              className="relative group shrink-0 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shadow-2xs hover:scale-105 transition-transform"
                            >
                              <img
                                src={p}
                                alt={`Foto ${pIdx + 1}`}
                                className="w-14 h-14 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[130px]">{visita.technician}</span>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleNotifyVisitaWhatsApp(visita)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Enviar confirmação desta visita no WhatsApp do cliente"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        {!isDone && !isCancelled && (
                          <button
                            type="button"
                            onClick={() => markAsCompleted(visita)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 shadow-2xs cursor-pointer"
                            title="Marcar visita como realizada"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Concluir</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEditModal(visita)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Editar Agendamento da Visita"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deseja excluir o agendamento de "${visita.clientName}"?`)) {
                              onDeleteVisita(visita.id);
                            }
                          }}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Excluir Visita"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ================= MODE 2: LISTA (TABELA RESUMIDA) ================= */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 select-none">
                  <th className="py-3 px-3.5 font-bold">Data & Horário</th>
                  <th className="py-3 px-3.5 font-bold">Cliente</th>
                  <th className="py-3 px-3.5 font-bold">Notificação & Resumo</th>
                  <th className="py-3 px-3.5 font-bold text-center">Fotos</th>
                  <th className="py-3 px-3.5 font-bold text-center">Status</th>
                  <th className="py-3 px-3.5 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVisitas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Nenhuma visita técnica encontrada com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredVisitas.map((v) => {
                    const isDone = v.status === 'realizada';
                    const isCancelled = v.status === 'cancelada';

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <strong className="text-slate-900 block">{v.date ? formatDate(v.date) : 'Recente'}</strong>
                          <span className="text-[11px] text-indigo-700 font-bold">{v.time || '09:00'}</span>
                        </td>

                        <td className="py-3 px-3.5">
                          <strong className="text-slate-900 block truncate max-w-[170px]">{v.clientName}</strong>
                          {v.address && <span className="text-[10px] text-slate-500 truncate block max-w-[170px]">{v.address}</span>}
                        </td>

                        <td className="py-3 px-3.5 max-w-[280px]">
                          {v.notificationTitle && (
                            <div className="flex items-center gap-1 font-bold text-indigo-900 text-xs truncate mb-0.5">
                              <Bell className="w-3 h-3 text-indigo-600 shrink-0" />
                              <span className="truncate">{v.notificationTitle}</span>
                            </div>
                          )}
                          {v.notes ? (
                            <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed" title={v.notes}>
                              {v.notes}
                            </p>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">Sem resumo</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {v.photos && v.photos.length > 0 ? (
                            <div className="flex items-center justify-center gap-1">
                              {v.photos.slice(0, 2).map((p, pIdx) => (
                                <img
                                  key={pIdx}
                                  src={p}
                                  alt="Foto"
                                  onClick={() => setSelectedPhotoModal(p)}
                                  className="w-8 h-8 rounded-md object-cover border border-slate-200 cursor-pointer hover:scale-110 transition shadow-2xs"
                                  title="Clique para ampliar"
                                />
                              ))}
                              {v.photos.length > 2 && (
                                <span 
                                  onClick={() => setSelectedPhotoModal(v.photos![0])}
                                  className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded cursor-pointer border border-indigo-200"
                                >
                                  +{v.photos.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-[11px]">-</span>
                          )}
                        </td>

                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                              isDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : isCancelled
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {v.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          {isAdmin ? (
                            <div className="flex items-center justify-end gap-1">
                              {!isDone && !isCancelled && (
                                <button
                                  type="button"
                                  onClick={() => markAsCompleted(v)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                                  title="Concluir Atendimento"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => openEditModal(v)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Deseja excluir o agendamento de "${v.clientName}"?`)) {
                                    onDeleteVisita(v.id);
                                  }
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">Somente Leitura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODE 3: CALENDÁRIO (GRADE MENSAL) ================= */}
      {viewMode === 'calendario' && (() => {
        const calYear = calendarDate.getFullYear();
        const calMonth = calendarDate.getMonth();
        const firstDayOfWeek = new Date(calYear, calMonth, 1).getDay();
        const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
        const calMonthLabel = calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        const prevMonth = () => {
          setCalendarDate(new Date(calYear, calMonth - 1, 1));
          setSelectedCalendarDayVisitas(null);
        };
        const nextMonth = () => {
          setCalendarDate(new Date(calYear, calMonth + 1, 1));
          setSelectedCalendarDayVisitas(null);
        };
        const todayMonth = () => {
          setCalendarDate(new Date());
          setSelectedCalendarDayVisitas(null);
        };

        return (
          <div className="space-y-4">
            {/* Calendar Month Navigation Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base capitalize">
                  {calMonthLabel}
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 transition cursor-pointer"
                  title="Mês Anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={todayMonth}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg text-slate-700 transition cursor-pointer"
                  title="Próximo Mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
              <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 text-center text-xs font-bold text-slate-700 py-2">
                <span className="text-rose-600">Domingo</span>
                <span>Segunda</span>
                <span>Terça</span>
                <span>Quarta</span>
                <span>Quinta</span>
                <span>Sexta</span>
                <span className="text-slate-500">Sábado</span>
              </div>

              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 text-xs">
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`blank-${i}`} className="min-h-[90px] bg-slate-50/40 p-1.5 text-slate-300">
                    <span className="text-[11px] select-none">-</span>
                  </div>
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dayStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const dayVisitas = filteredVisitas.filter((v) => v.date === dayStr);

                  const isToday = 
                    new Date().getDate() === dayNum && 
                    new Date().getMonth() === calMonth && 
                    new Date().getFullYear() === calYear;

                  return (
                    <div
                      key={`day-${dayNum}`}
                      onClick={() => {
                        if (dayVisitas.length > 0) {
                          setSelectedCalendarDayVisitas({ day: dayStr, items: dayVisitas });
                        }
                      }}
                      className={`min-h-[105px] p-2 transition-all flex flex-col justify-between ${
                        dayVisitas.length > 0 ? 'cursor-pointer hover:bg-indigo-50/50' : 'bg-white'
                      } ${isToday ? 'bg-indigo-50/70 border-2 border-indigo-400' : ''}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              isToday ? 'bg-indigo-600 text-white' : 'text-slate-800'
                            }`}
                          >
                            {dayNum}
                          </span>

                          {dayVisitas.length > 0 && (
                            <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-md">
                              {dayVisitas.length} vis
                            </span>
                          )}
                        </div>

                        {/* Visita Chips */}
                        <div className="space-y-1">
                          {dayVisitas.slice(0, 2).map((vis) => (
                            <div
                              key={vis.id}
                              className="p-1 rounded text-[10px] border border-indigo-200 bg-indigo-50 text-indigo-900 truncate flex items-center justify-between gap-1"
                              title={`${vis.time} - ${vis.clientName}: ${vis.address}`}
                            >
                              <span className="font-bold shrink-0">{vis.time}</span>
                              <span className="truncate">{vis.clientName}</span>
                            </div>
                          ))}

                          {dayVisitas.length > 2 && (
                            <div className="text-[10px] text-slate-500 font-bold text-center">
                              +{dayVisitas.length - 2} mais...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Details Panel */}
            {selectedCalendarDayVisitas && (
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        Visitas Técnicas do dia {formatDate(selectedCalendarDayVisitas.day)}
                      </h4>
                      <p className="text-xs text-slate-600">
                        {selectedCalendarDayVisitas.items.length} visita(s) agendada(s) neste dia
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCalendarDayVisitas(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                  >
                    Fechar painel
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {selectedCalendarDayVisitas.items.map((v) => (
                    <div
                      key={v.id}
                      className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-slate-900 truncate max-w-[170px]">{v.clientName}</strong>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                          {v.time}
                        </span>
                      </div>

                      <p className="text-slate-700 text-xs line-clamp-2">{v.address}</p>
                      <div className="text-[11px] text-slate-500">Técnico: {v.technician}</div>

                      {isAdmin && (
                        <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                          {v.status !== 'realizada' && (
                            <button
                              type="button"
                              onClick={() => markAsCompleted(v)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Concluir</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(v)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Modal Nova / Editar Visita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg text-white ${editingVisita ? 'bg-amber-600' : 'bg-indigo-600'}`}>
                  <CalendarClock className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {!isAdmin ? 'Solicitar visita técnica' : editingVisita ? 'Editar Visita Técnica' : 'Formulário: Nova Visita'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* 1. Nome do Cliente */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs flex items-center justify-between">
                  <span>Nome do Cliente: *</span>
                  {stores.length > 0 && (
                    <span className="text-[11px] font-medium text-indigo-600">
                      (Selecione o estabelecimento cadastrado)
                    </span>
                  )}
                </label>
                {stores.length > 0 && (
                  <select
                    value={selectedStoreId}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    className="w-full mb-1.5 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium bg-slate-50 text-xs"
                  >
                    <option value="">-- Selecione o estabelecimento vinculado --</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.nomeFantasia} ({s.cnpj})</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Digite o nome do cliente ou estabelecimento"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-xs text-slate-900"
                />
              </div>

              {!isAdmin && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Data desejada</label>
                    <input type="date" required min={new Date().toISOString().slice(0, 10)} value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Horário preferido</label>
                    <input type="time" value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-800 mb-1">Motivo da visita</label>
                    <select value={requestedPurpose} onChange={(e) => setRequestedPurpose(e.target.value as VisitaPurpose)} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs">
                      <option value="orcamento">Orçamento técnico</option>
                      <option value="vistoria_previa">Vistoria prévia</option>
                      <option value="acompanhamento">Acompanhamento de obra</option>
                      <option value="entrega_tecnica">Entrega técnica</option>
                      <option value="emergencial">Emergencial</option>
                    </select>
                  </div>
                </div>
              )}

              {isAdmin && editingVisita && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Data da visita</label>
                    <input type="date" required value={requestedDate} onChange={(e) => setRequestedDate(e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Horário</label>
                    <input type="time" value={requestedTime} onChange={(e) => setRequestedTime(e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs" />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Status</label>
                    <select value={visitStatus} onChange={(e) => setVisitStatus(e.target.value as VisitaStatus)} className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs">
                      <option value="solicitada">Solicitada</option>
                      <option value="agendada">Agendada</option>
                      <option value="realizada">Realizada</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>
              )}

              {/* 2. Título da Notificação (somente gestão) */}
              {isAdmin && <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Título da Notificação: *</span>
                </label>
                <input
                  type="text"
                  required
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  placeholder="Ex: Visita Técnica Concluída - Medição Finalizada"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium text-xs text-slate-900"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Este título será exibido na notificação do cliente e no painel do sistema.
                </p>
              </div>}

              {/* 3. Resumo da Visita */}
              <div>
                <label className="block font-bold text-slate-800 mb-1 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{isAdmin ? 'Resumo da Visita: *' : 'Descreva sua necessidade: *'}</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isAdmin ? 'Escreva o resumo da visita, observações técnicas, medições e orientações ao cliente...' : 'Informe o motivo da visita e os detalhes que nossa equipe precisa saber...'}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-normal text-xs text-slate-900 leading-relaxed"
                />
              </div>

              {/* 4. Anexos são opcionais para o administrador; solicitação do cliente é textual. */}
              {isAdmin && <div>
                <label className="block font-bold text-slate-800 mb-1.5 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Fotos / Imagens da Visita:</span>
                  </span>
                  {photos.length > 0 && (
                    <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                      {photos.length} foto(s) anexada(s)
                    </span>
                  )}
                </label>

                {/* Inputs de arquivo ocultos para câmera e galeria */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handlePhotoFiles(e.target.files)}
                />

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <Camera className="w-4 h-4 text-indigo-600" />
                    <span>Acessar Câmera</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>Galeria / Imagem</span>
                  </button>
                </div>

                {/* Grid de miniaturas das fotos anexadas */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    {photos.map((photo, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100 shadow-2xs">
                        <img
                          src={photo}
                          alt={`Anexo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition shadow-xs cursor-pointer opacity-90 hover:opacity-100"
                          title="Remover foto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>}

              {/* 5. Botão para Salvar */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingVisita ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja realmente excluir a visita de "${editingVisita.clientName}"?`)) {
                        onDeleteVisita(editingVisita.id);
                        setIsModalOpen(false);
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                    title="Excluir Visita"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Excluir</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold cursor-pointer text-xs transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold shadow-sm shadow-indigo-600/25 cursor-pointer flex items-center gap-2 text-xs transition"
                  >
                    <Bell className="w-4 h-4" />
                    <span>{isAdmin ? 'Salvar Visita & Notificar Cliente' : 'Enviar solicitação'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Visualizador de Foto em Tela Cheia */}
      {selectedPhotoModal && (
        <div 
          onClick={() => setSelectedPhotoModal(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl max-w-2xl w-full p-4 shadow-2xl border border-slate-800 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                Foto da Visita Técnica
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[70vh] flex items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              <img
                src={selectedPhotoModal}
                alt="Foto da Visita Ampliada"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
