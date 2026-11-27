import React, { useState } from 'react';
import { 
  Users, 
  Building2, 
  PlusCircle, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Edit2, 
  Trash2,
  DollarSign,
  TrendingUp,
  Receipt,
  Plus
} from 'lucide-react';
import { ServiceRecord, StoreProfile, UserProfile } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { AccessRequestsManager } from './AccessRequestsManager';

interface ClientesPageProps {
  stores: StoreProfile[];
  services: ServiceRecord[];
  onOpenStoreModal: () => void;
  onEditStore: (store: StoreProfile) => void;
  onDeleteStore: (id: string) => void;
  onAddServiceForStore?: (store: StoreProfile) => void;
  user: UserProfile;
}

export const ClientesPage: React.FC<ClientesPageProps> = ({
  stores,
  services,
  onOpenStoreModal,
  onEditStore,
  onDeleteStore,
  onAddServiceForStore,
  user,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | 'CNPJ' | 'CPF'>('todos');
  const [showAccessRequests, setShowAccessRequests] = useState(false);

  const isAdmin = user?.role === 'admin' || (user?.email ? user.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com' : false);

  const filteredStores = stores.filter((st) => {
    if (typeFilter !== 'todos') {
      const isCpf = (st.documentType === 'CPF') || (st.cnpj.replace(/\D/g, '').length === 11);
      if (typeFilter === 'CPF' && !isCpf) return false;
      if (typeFilter === 'CNPJ' && isCpf) return false;
    }

    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      st.nomeFantasia.toLowerCase().includes(q) ||
      st.razaoSocial.toLowerCase().includes(q) ||
      st.cnpj.includes(q) ||
      (st.municipio && st.municipio.toLowerCase().includes(q)) ||
      (st.telefone && st.telefone.includes(q)) ||
      (st.email && st.email.toLowerCase().includes(q))
    );
  });

  // Calculate client stats
  const getClientStats = (storeId: string) => {
    const clientServices = services.filter(s => s.storeId === storeId);
    const totalCharged = clientServices.reduce((acc, s) => acc + (s.valueCharged || 0), 0);
    const totalPaid = clientServices.reduce((acc, s) => acc + (s.valuePaid || 0), 0);
    const totalPending = Math.max(0, totalCharged - totalPaid);
    return {
      count: clientServices.length,
      totalCharged,
      totalPaid,
      totalPending,
    };
  };

  const totalClients = stores.length;
  const cnpjCount = stores.filter(s => s.documentType !== 'CPF' && s.cnpj.replace(/\D/g, '').length !== 11).length;
  const cpfCount = stores.filter(s => s.documentType === 'CPF' || s.cnpj.replace(/\D/g, '').length === 11).length;
  const globalVolume = services.reduce((acc, s) => acc + (s.valueCharged || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Clientes & Estabelecimentos</h2>
              <p className="text-xs text-slate-500">Gestão cadastral, contratos corporativos CNPJ e clientes pessoa física CPF</p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => setShowAccessRequests((current) => !current)}
              aria-expanded={showAccessRequests}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{showAccessRequests ? 'Fechar liberações' : 'LIBERAÇÃO DE CADASTRO'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenStoreModal}
              className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Novo Cliente</span>
            </button>
          </div>
        )}
      </div>

      {isAdmin && showAccessRequests && <AccessRequestsManager stores={stores} />}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total de Clientes</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">{totalClients}</span>
          <span className="text-[11px] text-slate-500">Contratantes cadastrados</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600 block tracking-wider">Empresas (CNPJ)</span>
          <span className="text-xl font-extrabold text-emerald-700 mt-1 block">{cnpjCount}</span>
          <span className="text-[11px] text-emerald-600">Lojas e galpões comerciais</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-sky-200 bg-sky-50/30 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-sky-600 block tracking-wider">Pessoas Físicas (CPF)</span>
          <span className="text-xl font-extrabold text-sky-700 mt-1 block">{cpfCount}</span>
          <span className="text-[11px] text-sky-600">Obras residenciais</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Volume Contratado</span>
          <span className="text-xl font-extrabold text-slate-800 mt-1 block truncate">{formatCurrency(globalVolume)}</span>
          <span className="text-[11px] text-slate-500">Faturamento global em obras</span>
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
            placeholder="Buscar por nome, CNPJ/CPF, cidade ou telefone..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setTypeFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              typeFilter === 'todos' ? 'bg-slate-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({stores.length})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('CNPJ')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              typeFilter === 'CNPJ' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            CNPJ ({cnpjCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('CPF')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              typeFilter === 'CPF' ? 'bg-sky-600 text-white shadow-2xs' : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'
            }`}
          >
            CPF ({cpfCount})
          </button>
        </div>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStores.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-700 font-bold text-sm">Nenhum cliente encontrado</p>
            <p className="text-slate-500 text-xs mt-0.5">Cadastre um novo estabelecimento no botão superior.</p>
          </div>
        ) : (
          filteredStores.map((store) => {
            const isCpf = store.documentType === 'CPF' || store.cnpj.replace(/\D/g, '').length === 11;
            const stats = getClientStats(store.id);

            return (
              <div
                key={store.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between gap-4 group"
              >
                <div>
                  {/* Card Header Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isCpf 
                        ? 'bg-sky-100 text-sky-800 border-sky-200' 
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {isCpf ? 'Pessoa Física (CPF)' : 'Pessoa Jurídica (CNPJ)'}
                    </span>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{store.situacaoCadastral || 'Não consultada'}</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
                    {store.nomeFantasia}
                  </h3>

                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {store.razaoSocial}
                  </p>

                  <div className="mt-2.5 p-2 bg-slate-50 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium text-[11px]">{isCpf ? 'CPF:' : 'CNPJ:'}</span>
                      <strong className="font-mono text-slate-800">{store.cnpj}</strong>
                    </div>

                    {store.telefone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium text-[11px]">Telefone:</span>
                        <span className="text-slate-700">{store.telefone}</span>
                      </div>
                    )}

                    {store.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium text-[11px]">E-mail:</span>
                        <span className="text-slate-700 truncate max-w-[170px]">{store.email}</span>
                      </div>
                    )}

                    {store.municipio && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium text-[11px]">Local:</span>
                        <span className="text-slate-700 truncate">{store.municipio}/{store.uf || 'SP'}</span>
                      </div>
                    )}
                  </div>

                  {/* Financial Stats for this client */}
                  <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Serviços</span>
                      <strong className="text-slate-800 font-extrabold">{stats.count}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Contratado</span>
                      <strong className="text-slate-800 font-bold truncate block">{formatCurrency(stats.totalCharged)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Pago</span>
                      <strong className="text-emerald-700 font-bold truncate block">{formatCurrency(stats.totalPaid)}</strong>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Cadastrado em {store.createdAt ? store.createdAt.split('T')[0] : '2026'}
                  </span>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                      {onAddServiceForStore && (
                        <button
                          type="button"
                          onClick={() => onAddServiceForStore(store)}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Adicionar novo serviço para este cliente"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ Serviço</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onEditStore(store)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Editar Dados Cadastrais do Cliente"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Deseja realmente excluir o cliente "${store.nomeFantasia}"? Esta ação removerá o cadastro do estabelecimento.`)) {
                            onDeleteStore(store.id);
                          }
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer"
                        title="Excluir Cliente do Sistema"
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
    </div>
  );
};
