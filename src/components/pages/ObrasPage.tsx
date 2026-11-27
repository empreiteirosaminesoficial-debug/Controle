import React, { useState } from 'react';
import { 
  HardHat, 
  PlusCircle, 
  Search, 
  Calendar, 
  MapPin, 
  UserCheck, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  FileText,
  X,
  Edit2,
  Trash2,
  ChevronRight,
  Filter,
  MessageCircle
} from 'lucide-react';
import { ObraRecord, ObraStatus, StoreProfile, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { loadWhatsAppConfig } from '../../utils/whatsappStorage';
import { formatTemplateMessage, sendWhatsAppMessage } from '../../utils/whatsappSender';

interface ObrasPageProps {
  obras: ObraRecord[];
  onSaveObra: (obra: ObraRecord) => void;
  onDeleteObra: (id: string) => void;
  stores: StoreProfile[];
  user: UserProfile;
  onOpenStoreModal?: () => void;
}

export const ObrasPage: React.FC<ObrasPageProps> = ({
  obras,
  onSaveObra,
  onDeleteObra,
  stores,
  user,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [storeFilter, setStoreFilter] = useState<string>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingObra, setEditingObra] = useState<ObraRecord | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [status, setStatus] = useState<ObraStatus>('em_andamento');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [estimatedBudget, setEstimatedBudget] = useState<number>(0);
  const [actualCost, setActualCost] = useState<number>(0);
  const [leadEngineer, setLeadEngineer] = useState('');
  const [notes, setNotes] = useState('');

  const isAdmin = user?.role === 'admin' || (user?.email ? user.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com' : false);

  const openNewModal = () => {
    setEditingObra(null);
    setTitle('');
    setSelectedStoreId(stores[0]?.id || '');
    setDescription('');
    setLocation(stores[0] ? `${stores[0].logradouro || ''}, ${stores[0].municipio || ''}` : '');
    setStartDate(new Date().toISOString().split('T')[0]);
    setTargetEndDate('');
    setStatus('em_andamento');
    setProgressPercent(10);
    setEstimatedBudget(15000);
    setActualCost(0);
    setLeadEngineer('Eng. Saminês & Equipe');
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (obra: ObraRecord) => {
    setEditingObra(obra);
    setTitle(obra.title);
    setSelectedStoreId(obra.storeId);
    setDescription(obra.description);
    setLocation(obra.location);
    setStartDate(obra.startDate);
    setTargetEndDate(obra.targetEndDate);
    setStatus(obra.status);
    setProgressPercent(obra.progressPercent);
    setEstimatedBudget(obra.estimatedBudget);
    setActualCost(obra.actualCost);
    setLeadEngineer(obra.leadEngineer || '');
    setNotes(obra.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const matchedStore = stores.find((store) => store.id === selectedStoreId);
    if (!selectedStoreId || !matchedStore) {
      window.alert('Selecione um estabelecimento cadastrado para vincular esta obra.');
      return;
    }

    const obraData: ObraRecord = {
      id: editingObra ? editingObra.id : `obra_${Date.now()}`,
      title: title.trim(),
      storeId: selectedStoreId,
      storeName: matchedStore.nomeFantasia,
      storeCnpj: matchedStore.cnpj,
      description: description.trim(),
      location: location.trim(),
      startDate,
      targetEndDate,
      completionDate: status === 'concluida' ? (editingObra?.completionDate || new Date().toISOString().split('T')[0]) : undefined,
      status,
      progressPercent: Number(progressPercent),
      estimatedBudget: Number(estimatedBudget),
      actualCost: Number(actualCost),
      leadEngineer: leadEngineer.trim() || 'Equipe Saminês',
      notes: notes.trim(),
      createdAt: editingObra ? editingObra.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveObra(obraData);
    setIsModalOpen(false);
  };

  // Filtered obras
  const filteredObras = obras.filter((o) => {
    if (statusFilter !== 'todos' && o.status !== statusFilter) return false;
    if (storeFilter !== 'todas' && o.storeId !== storeFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      o.title.toLowerCase().includes(q) ||
      o.storeName.toLowerCase().includes(q) ||
      o.location.toLowerCase().includes(q) ||
      o.description.toLowerCase().includes(q)
    );
  });

  // KPI calculations
  const totalObras = obras.length;
  const emAndamentoCount = obras.filter(o => o.status === 'em_andamento').length;
  const concluidasCount = obras.filter(o => o.status === 'concluida').length;
  const totalOrcamento = obras.reduce((acc, o) => acc + (o.estimatedBudget || 0), 0);
  const totalInvestido = obras.reduce((acc, o) => acc + (o.actualCost || 0), 0);

  const getStatusBadge = (st: ObraStatus) => {
    switch (st) {
      case 'em_andamento':
        return <span className="bg-sky-100 text-sky-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-sky-200"><Clock className="w-3 h-3 text-sky-600" /> Em Andamento</span>;
      case 'concluida':
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Concluída</span>;
      case 'planejamento':
        return <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-200"><AlertTriangle className="w-3 h-3 text-amber-600" /> Planejamento</span>;
      case 'pausada':
        return <span className="bg-slate-100 text-slate-700 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200">Pausada</span>;
    }
  };

  const handleNotifyObraWhatsApp = (obra: ObraRecord) => {
    const store = stores.find((s) => s.id === obra.storeId);
    const clientPhone = store?.telefone;
    const clientName = store?.nomeFantasia || obra.storeName || 'Cliente';
    const waConfig = loadWhatsAppConfig();

    const statusNames: Record<ObraStatus, string> = {
      planejamento: 'Planejamento Inicial',
      em_andamento: 'Em Execução / Andamento',
      concluida: 'Concluída / Entregue',
      pausada: 'Em Espera / Pausada',
    };

    const text = formatTemplateMessage(waConfig.templates.obraUpdate, {
      cliente: clientName,
      obra: obra.title,
      progresso: obra.progressPercent,
      status: statusNames[obra.status] || obra.status,
      data: new Date().toLocaleDateString('pt-BR'),
      detalhes: obra.description || 'Etapas sendo executadas conforme cronograma técnico de engenharia.',
    });

    sendWhatsAppMessage({
      phone: clientPhone,
      message: text,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-600 text-white rounded-xl shadow-xs">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Obras & Canteiros de Execução</h2>
              <p className="text-xs text-slate-500">Gestão técnica de cronogramas, custos, materiais e equipes de campo</p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openNewModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Cadastrar Nova Obra</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total de Obras</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">{totalObras}</span>
          <span className="text-[11px] text-slate-500">Canteiros registrados</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-200 bg-sky-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-sky-600 block tracking-wider">Em Andamento</span>
          <span className="text-xl font-extrabold text-sky-700 mt-1 block">{emAndamentoCount}</span>
          <span className="text-[11px] text-sky-600">Trabalho ativo hoje</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600 block tracking-wider">Concluídas</span>
          <span className="text-xl font-extrabold text-emerald-700 mt-1 block">{concluidasCount}</span>
          <span className="text-[11px] text-emerald-600">Entregues com garantia</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Orçamento Previsto</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1 block truncate">{formatCurrency(totalOrcamento)}</span>
          <span className="text-[11px] text-slate-500">Valor global projetado</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Custo Realizado</span>
          <span className="text-xl font-extrabold text-indigo-700 mt-1 block truncate">{formatCurrency(totalInvestido)}</span>
          <span className="text-[11px] text-indigo-600">Executado até o momento</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, cliente, localização..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline font-semibold">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-sky-500 transition cursor-pointer"
          >
            <option value="todos">Todos os Status</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluida">Concluídas</option>
            <option value="planejamento">Planejamento</option>
            <option value="pausada">Pausadas</option>
          </select>

          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-sky-500 transition cursor-pointer max-w-[200px] truncate"
          >
            <option value="todas">Todos os Clientes</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.nomeFantasia}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Obras Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredObras.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
            <HardHat className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-bold text-sm">Nenhuma obra encontrada</p>
            <p className="text-slate-500 text-xs mt-0.5">Tente alterar os filtros ou cadastre um novo canteiro.</p>
          </div>
        ) : (
          filteredObras.map((obra) => {
            const isCompleted = obra.status === 'concluida';

            return (
              <div
                key={obra.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {getStatusBadge(obra.status)}
                    <span className="text-[10px] font-mono font-bold text-slate-400">
                      ID: {obra.id.replace('obra_', '#')}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2 group-hover:text-sky-600 transition-colors">
                    {obra.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2 font-medium">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{obra.storeName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate text-[11px]">{obra.location || 'Local a definir'}</span>
                  </div>

                  {obra.description && (
                    <p className="text-xs text-slate-600 mt-3 line-clamp-3 bg-slate-50 p-2 rounded-lg leading-relaxed">
                      {obra.description}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">Progresso Físico</span>
                      <span className={isCompleted ? 'text-emerald-700' : 'text-sky-700'}>
                        {obra.progressPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-sky-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, obra.progressPercent))}%` }}
                      />
                    </div>
                  </div>

                  {/* Financials & Dates */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Orçamento Previsto</span>
                      <strong className="text-slate-800 font-bold">{formatCurrency(obra.estimatedBudget)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Custo Realizado</span>
                      <strong className="text-indigo-700 font-bold">{formatCurrency(obra.actualCost)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Data Início</span>
                      <span className="text-slate-700">{obra.startDate || 'Não inf.'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Previsão Entrega</span>
                      <span className="text-slate-700">{obra.targetEndDate || 'Em definição'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                    <span className="truncate max-w-[140px]">{obra.leadEngineer || 'Equipe Saminês'}</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleNotifyObraWhatsApp(obra)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                        title="Enviar atualização de andamento no WhatsApp do cliente"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(obra)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-sky-600 rounded-lg transition"
                          title="Editar Obra"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deseja realmente excluir o canteiro "${obra.title}"?`)) {
                              onDeleteObra(obra.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                          title="Excluir Obra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Nova / Editar Obra */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-600 text-white rounded-lg">
                  <HardHat className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingObra ? 'Editar Obra / Canteiro' : 'Cadastrar Nova Obra'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título da Obra *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reforma Estrutural de Galpão e Pintura Epóxi"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cliente / Loja *</label>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.nomeFantasia}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status da Obra</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ObraStatus)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium"
                  >
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                    <option value="planejamento">Planejamento</option>
                    <option value="pausada">Pausada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Localização / Endereço</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Rodovia Anhanguera, km 28, Galpão 4"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previsão Entrega</label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(e) => setTargetEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Progresso (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={progressPercent}
                    onChange={(e) => setProgressPercent(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Orçamento (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={estimatedBudget}
                    onChange={(e) => setEstimatedBudget(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custo Realizado (R$)</label>
                  <input
                    type="number"
                    min="0"
                    value={actualCost}
                    onChange={(e) => setActualCost(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Responsável Técnico / Engenheiro</label>
                <input
                  type="text"
                  value={leadEngineer}
                  onChange={(e) => setLeadEngineer(e.target.value)}
                  placeholder="Ex: Eng. Saminês ou Mestre Responsável"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição do Escopo</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes dos serviços previstos e fases da obra..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações Técnicas</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas de segurança, materiais de longo prazo ou pendências..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingObra ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja realmente excluir a obra "${editingObra.title}"?`)) {
                        onDeleteObra(editingObra.id);
                        setIsModalOpen(false);
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                    title="Excluir Obra"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Excluir Obra</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg font-bold cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 text-white rounded-lg font-bold shadow-xs cursor-pointer flex items-center gap-1.5 text-xs ${
                      editingObra
                        ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                        : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'
                    }`}
                  >
                    {editingObra ? <Edit2 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                    <span>{editingObra ? 'Salvar Alterações da Obra' : 'Cadastrar Obra'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
