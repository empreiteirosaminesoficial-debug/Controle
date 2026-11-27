import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Building2, 
  Search, 
  Plus, 
  Check, 
  AlertCircle, 
  Trash2, 
  MapPin, 
  Phone, 
  Mail, 
  Store,
  User,
  ShieldCheck,
  Pencil,
  Users,
  ArrowLeft,
  AlertTriangle,
  Briefcase,
  Save,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { DocumentType, ServiceRecord, StoreProfile, UserProfile } from '../types';
import { 
  cleanDocument, 
  formatCnpj, 
  formatCpf, 
  formatDocument, 
  isValidCnpj, 
  isValidCpf, 
  lookupCnpj,
  lookupCpf,
  lookupDocument,
  lookupCep,
  getReceitaFederalCpfInfo,
  ReceitaFederalCpfInfo
} from '../utils/cnpj';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores: StoreProfile[];
  services?: ServiceRecord[];
  user?: UserProfile;
  onSaveStore: (store: StoreProfile) => void;
  onDeleteStore: (storeId: string) => void;
  onResetAllServices?: () => void;
  onSelectStoreToFilter: (storeId: string) => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({
  isOpen,
  onClose,
  stores,
  services = [],
  user,
  onSaveStore,
  onDeleteStore,
  onResetAllServices,
  onSelectStoreToFilter,
}) => {
  const isClient = user?.role === 'client';

  // Navigation tab: 'list' (view, search, edit, delete) | 'form' (create or edit)
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<StoreProfile | null>(null);
  const [showResetAllServicesConfirm, setShowResetAllServicesConfirm] = useState(false);

  // Form fields
  const [docType, setDocType] = useState<DocumentType>('CNPJ');
  const [docInput, setDocInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [razaoSocial, setRazaoSocial] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [cep, setCep] = useState('');
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [situacaoCadastral, setSituacaoCadastral] = useState('');
  const [receitaFederalCpf, setReceitaFederalCpf] = useState<ReceitaFederalCpfInfo | null>(null);

  // Reset or setup when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setStoreToDelete(null);
      setError('');
      setSuccessMsg('');

      // If there are stores, show the list by default. If empty, open form directly
      if (stores.length > 0) {
        setActiveTab('list');
      } else {
        resetForm();
        setActiveTab('form');
      }
    }
  }, [isOpen, stores.length]);

  if (!isOpen) return null;

  // Filter stores if client
  const displayedStores = isClient
    ? stores.filter(st => {
        const userEmailNorm = (user?.email || '').trim().toLowerCase();
        const ownerEmailNorm = (st.ownerEmail || '').trim().toLowerCase();
        const storeEmailNorm = (st.email || '').trim().toLowerCase();
        const authEmails = (st.authorizedEmails || []).map(e => e.trim().toLowerCase());

        const userDocClean = cleanDocument(user?.clientDocument || '');
        const userDocsClean = new Set((user?.clientDocuments || []).map(d => cleanDocument(d)));
        if (userDocClean) userDocsClean.add(userDocClean);

        const storeDocClean = cleanDocument(st.cleanCnpj || st.cnpj || '');

        const matchesEmail = Boolean(
          userEmailNorm && (
            ownerEmailNorm === userEmailNorm ||
            storeEmailNorm === userEmailNorm ||
            authEmails.includes(userEmailNorm)
          )
        );

        const matchesDoc = Boolean(
          storeDocClean && (
            (userDocClean && userDocClean === storeDocClean) ||
            userDocsClean.has(storeDocClean)
          )
        );

        return matchesEmail || matchesDoc;
      })
    : stores;

  // Filtered by search term
  const filteredStores = displayedStores.filter(st => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    const matchesName = st.nomeFantasia.toLowerCase().includes(q);
    const matchesRazao = (st.razaoSocial || '').toLowerCase().includes(q);
    const matchesDoc = st.cnpj.toLowerCase().includes(q) || cleanDocument(st.cnpj).includes(q);
    const matchesCity = (st.municipio || '').toLowerCase().includes(q);
    const matchesEmail = (st.ownerEmail || '').toLowerCase().includes(q) || (st.email || '').toLowerCase().includes(q);

    return matchesName || matchesRazao || matchesDoc || matchesCity || matchesEmail;
  });

  const resetForm = () => {
    setEditingStoreId(null);
    setDocType('CNPJ');
    setDocInput('');
    setDataNascimento('');
    setCep('');
    setIsLoadingCep(false);
    setRazaoSocial('');
    setNomeFantasia('');
    setLogradouro('');
    setNumero('');
    setBairro('');
    setMunicipio('');
    setUf('');
    setTelefone('');
    setEmail('');
    setOwnerEmail(isClient && user?.email ? user.email : '');
    setSituacaoCadastral('');
    setReceitaFederalCpf(null);
    setError('');
    setSearchSuccess(false);
    setSuccessMsg('');
  };

  const handleStartCreate = () => {
    resetForm();
    if (isClient && user?.email) {
      setOwnerEmail(user.email);
      setEmail(user.email);
      if (user.clientDocument) {
        const clean = cleanDocument(user.clientDocument);
        if (clean.length === 11) {
          setDocType('CPF');
          setDocInput(formatCpf(clean));
          handleSearchOrValidate(clean);
        } else {
          setDocType('CNPJ');
          setDocInput(formatCnpj(clean));
          handleSearchOrValidate(clean);
        }
      }
    }
    setActiveTab('form');
  };

  const handleStartEdit = (st: StoreProfile) => {
    setEditingStoreId(st.id);
    const isCpf = st.documentType === 'CPF' || (st.cleanCnpj && st.cleanCnpj.length === 11);
    setDocType(isCpf ? 'CPF' : 'CNPJ');
    setDocInput(st.cnpj);
    setNomeFantasia(st.nomeFantasia || '');
    setRazaoSocial(st.razaoSocial || '');
    setDataNascimento(st.dataNascimento || '');
    setCep(st.cep || '');
    setLogradouro(st.logradouro || '');
    setNumero(st.numero || '');
    setBairro(st.bairro || '');
    setMunicipio(st.municipio || '');
    setUf(st.uf || '');
    setTelefone(st.telefone || '');
    setEmail(st.email || '');
    setOwnerEmail(st.ownerEmail || (isClient && user?.email ? user.email : ''));
    setSituacaoCadastral(st.situacaoCadastral || 'Não consultada');
    if (isCpf && st.cnpj) {
      setReceitaFederalCpf(getReceitaFederalCpfInfo(st.cnpj));
    } else {
      setReceitaFederalCpf(null);
    }
    setError('');
    setSearchSuccess(true);
    setActiveTab('form');
  };

  const handleDocTypeToggle = (type: DocumentType) => {
    setDocType(type);
    setDocInput('');
    setError('');
    setSearchSuccess(false);
    setReceitaFederalCpf(null);
    setSituacaoCadastral('Não consultada');
  };

  const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = cleanDocument(raw);

    setError('');
    setSuccessMsg('');
    setSearchSuccess(false);

    // Mantém o tipo escolhido manualmente pelo usuário.
    if (docType === 'CPF') {
      const formatted = formatCpf(raw);
      setDocInput(formatted);
      setReceitaFederalCpf(null);

      if (clean.length === 11) {
        handleSearchOrValidate(clean, 'CPF');
      }
      return;
    }

    // CNPJ permanece CNPJ mesmo quando chega a 11 dígitos.
    const formatted = formatCnpj(raw);
    setDocInput(formatted);

    if (clean.length === 14) {
      handleSearchOrValidate(clean, 'CNPJ');
    }
  };
  const handleDataNascimentoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (raw.length <= 2) {
      setDataNascimento(raw);
    } else if (raw.length <= 4) {
      setDataNascimento(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setDataNascimento(`${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`);
    }
  };

  const handleSearchOrValidate = async (overrideDoc?: string, forcedType?: DocumentType) => {
    const rawVal = overrideDoc !== undefined ? overrideDoc : docInput;
    const clean = cleanDocument(rawVal);
    const activeType = forcedType || docType;
    if (activeType !== docType) {
      setDocType(activeType);
    }

    if (activeType === 'CNPJ') {
      if (clean.length !== 14) {
        setError('CNPJ deve conter 14 dígitos numéricos.');
        return;
      }
      if (!isValidCnpj(clean)) {
        setError('CNPJ inválido (dígitos verificadores incorretos).');
        return;
      }

      setIsLoading(true);
      setError('');
      setSuccessMsg('');

      try {
        const res = await lookupCnpj(clean);
        if (res.success && res.profile) {
          setRazaoSocial(res.profile.razaoSocial || '');
          setNomeFantasia(res.profile.nomeFantasia || res.profile.razaoSocial || '');
          if (res.profile.dataNascimento) setDataNascimento(res.profile.dataNascimento);
          if (res.profile.cep) setCep(res.profile.cep);
          setLogradouro(res.profile.logradouro || '');
          setNumero(res.profile.numero || '');
          setBairro(res.profile.bairro || '');
          setMunicipio(res.profile.municipio || '');
          setUf(res.profile.uf || '');
          setTelefone(res.profile.telefone || '');
          setSituacaoCadastral(res.profile.situacaoCadastral || 'Não consultada');
          setReceitaFederalCpf(null);
          if (!email) {
            setEmail(res.profile.email || (isClient ? user?.email || '' : ''));
          }
          if (!ownerEmail && isClient && user?.email) {
            setOwnerEmail(user.email);
          }
          setSearchSuccess(true);
          setSuccessMsg('Dados do CNPJ encontrados em fontes públicas e preenchidos automaticamente!');
        } else {
          setError(res.error || 'Não foi possível buscar na Receita. Preencha os campos abaixo.');
          setSearchSuccess(true);
        }
      } catch {
        setError('Erro na consulta online. Preencha as informações manualmente.');
        setSearchSuccess(true);
      } finally {
        setIsLoading(false);
      }
    } else {
      // CPF validation & Receita Federal intelligent fiscal region & database autofill
      if (clean.length !== 11) {
        setError('CPF deve conter exatamente 11 dígitos numéricos.');
        return;
      }
      if (!isValidCpf(clean)) {
        setError('CPF informado é inválido pelo algoritmo oficial da Receita Federal (dígitos verificadores incorretos).');
        return;
      }

      setIsLoading(true);
      setError('');
      setSuccessMsg('');

      try {
        let visitasList: any[] = [];
        let obrasList: any[] = [];
        try {
          visitasList = JSON.parse(localStorage.getItem('gestao_servicos_visitas_v1') || '[]');
          obrasList = JSON.parse(localStorage.getItem('gestao_servicos_obras_v1') || '[]');
        } catch {}

        const res = await lookupDocument(clean, { stores, user, services, visitas: visitasList, obras: obrasList });
        if (res.success && res.profile) {
          if (res.profile.razaoSocial) {
            setRazaoSocial(res.profile.razaoSocial);
          }
          if (res.profile.nomeFantasia) {
            setNomeFantasia(res.profile.nomeFantasia);
          }
          if (res.profile.dataNascimento) {
            setDataNascimento(res.profile.dataNascimento);
          }
          if (res.profile.cep) {
            setCep(res.profile.cep);
          }
          if (res.profile.logradouro) setLogradouro(res.profile.logradouro);
          if (res.profile.numero) setNumero(res.profile.numero);
          if (res.profile.bairro) setBairro(res.profile.bairro);
          if (res.profile.municipio) setMunicipio(res.profile.municipio);
          if (res.profile.uf) setUf(res.profile.uf);
          if (res.profile.telefone) setTelefone(res.profile.telefone);
          if (res.profile.email) setEmail(res.profile.email);
          if (res.profile.ownerEmail) setOwnerEmail(res.profile.ownerEmail);
          setSituacaoCadastral(res.profile.situacaoCadastral || 'Não consultada');

          const rf = ('receitaFederal' in res && res.receitaFederal) ? res.receitaFederal : getReceitaFederalCpfInfo(clean);
          setReceitaFederalCpf(rf || null);

          setSearchSuccess(true);
          setSuccessMsg(res.message || 'CPF validado pelos dígitos verificadores. Situação cadastral e titularidade não consultadas.');

          // Focus on name input if empty so the user can easily type
          setTimeout(() => {
            const nameEl = document.getElementById('store-form-nome-fantasia') as HTMLInputElement | null;
            if (nameEl && !nameEl.value) {
              nameEl.focus();
            }
          }, 120);
        } else {
          setError(res.error || 'Não foi possível processar o CPF.');
        }
      } catch {
        setError('Erro ao processar busca pelo CPF.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const clean = cleanDocument(raw).slice(0, 8);
    const formatted = clean.length > 5 ? `${clean.slice(0, 5)}-${clean.slice(5, 8)}` : clean;
    setCep(formatted);
    if (clean.length === 8) {
      handleSearchCep(clean);
    }
  };

  const handleSearchCep = async (overrideCep?: string) => {
    const clean = cleanDocument(overrideCep !== undefined ? overrideCep : cep);
    if (clean.length !== 8) {
      setError('Informe um CEP com 8 dígitos para preenchimento automático.');
      return;
    }
    setIsLoadingCep(true);
    try {
      const res = await lookupCep(clean);
      if (res.success) {
        if (res.logradouro) setLogradouro(res.logradouro);
        if (res.bairro) setBairro(res.bairro);
        if (res.municipio) setMunicipio(res.municipio);
        if (res.uf) setUf(res.uf);
        setSuccessMsg(`Endereço preenchido pelo CEP: ${res.logradouro || ''}, ${res.bairro || ''} - ${res.municipio || ''}/${res.uf || ''}`);
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setError(res.error || 'CEP não encontrado.');
      }
    } catch {
      setError('Falha ao buscar CEP.');
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cleanDocument(docInput);

    if (docType === 'CNPJ') {
      if (clean.length !== 14 || !isValidCnpj(clean)) {
        setError('CNPJ inválido.');
        return;
      }
    } else {
      if (clean.length !== 11 || !isValidCpf(clean)) {
        setError('CPF inválido.');
        return;
      }
    }

    if (!nomeFantasia.trim()) {
      setError('Informe um nome de identificação para o cliente ou loja.');
      return;
    }

    const formattedDoc = docType === 'CNPJ' ? formatCnpj(clean) : formatCpf(clean);

    // Ao editar um cadastro existente, não permita assumir CPF/CNPJ de outro ID.
    const conflictingStore = stores.find((store) =>
      store.id !== editingStoreId &&
      cleanDocument(store.cleanCnpj || store.cnpj || '') === clean
    );
    if (editingStoreId && conflictingStore) {
      setError(`Este documento já está cadastrado em \"${conflictingStore.nomeFantasia || conflictingStore.cnpj}\". Abra o cadastro existente para editá-lo; não crie outro estabelecimento.`);
      return;
    }

    // If editing existing by ID, preserve that ID
    const existing = editingStoreId 
      ? stores.find(s => s.id === editingStoreId)
      : stores.find(st => cleanDocument(st.cleanCnpj || st.cnpj) === clean);

    const storeToSave: StoreProfile = {
      id: existing ? existing.id : `store_${Date.now()}`,
      documentType: docType,
      cnpj: formattedDoc,
      cleanCnpj: clean,
      ownerEmail: (isClient ? user?.email : ownerEmail.trim()) || existing?.ownerEmail || undefined,
      razaoSocial: razaoSocial.trim() || nomeFantasia.trim(),
      nomeFantasia: nomeFantasia.trim(),
      dataNascimento: dataNascimento.trim() || undefined,
      cep: cep.trim() || undefined,
      logradouro: logradouro.trim() || existing?.logradouro || undefined,
      numero: numero.trim() || existing?.numero || undefined,
      bairro: bairro.trim() || existing?.bairro || undefined,
      municipio: municipio.trim() || existing?.municipio || undefined,
      uf: uf.trim().toUpperCase() || existing?.uf || undefined,
      telefone: telefone.trim() || existing?.telefone || undefined,
      email: email.trim() || existing?.email || undefined,
      situacaoCadastral: situacaoCadastral || 'Não consultada',
      status: existing?.status || 'active',
      color: existing?.color || (docType === 'CPF' ? '#e11d48' : '#0284c7'),
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSaveStore(storeToSave);
    setSuccessMsg(editingStoreId ? 'Cadastro atualizado com sucesso!' : 'Novo cliente cadastrado com sucesso!');
    resetForm();
    setActiveTab('list');

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const handleConfirmDelete = () => {
    if (storeToDelete) {
      onDeleteStore(storeToDelete.id);
      setSuccessMsg(`O cliente "${storeToDelete.nomeFantasia}" foi excluído.`);
      setStoreToDelete(null);
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    }
  };

  // Helper to count services for a store
  const getServicesCount = (st: StoreProfile) => {
    const clean = cleanDocument(st.cleanCnpj || st.cnpj);
    return services.filter(s => s.storeId === st.id || (clean && cleanDocument(s.storeCnpj || '') === clean)).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isClient ? 'Meus Estabelecimentos (CNPJ / CPF)' : 'Gerenciamento de Clientes & Lojas'}
              </h3>
              <p className="text-xs text-slate-500">
                {isClient 
                  ? 'Cadastre e gerencie seus CNPJs e CPFs vinculados à sua conta Google' 
                  : 'Edite, exclua ou cadastre novos clientes e lojas com isolamento de CNPJ/CPF'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 sm:px-6 pt-3 pb-2 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="tab-btn-client-list"
              onClick={() => {
                setActiveTab('list');
                setEditingStoreId(null);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Lista de Clientes ({displayedStores.length})</span>
            </button>

            <button
              id="tab-btn-add-client"
              onClick={handleStartCreate}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'form' && !editingStoreId
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Novo Cliente / CNPJ</span>
            </button>

            {editingStoreId && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1">
                <Pencil className="w-3 h-3 text-amber-700" />
                <span>Modo Edição Ativo</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isClient && activeTab === 'list' && (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Admin: Excluir • Bloquear • Ativar</span>
              </div>
            )}

            {activeTab === 'form' && (
              <button
                onClick={() => {
                  setActiveTab('list');
                  setEditingStoreId(null);
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar à Lista</span>
              </button>
            )}
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="mx-5 sm:mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Delete Confirmation Modal / Inline Sheet */}
        {storeToDelete && (
          <div id="store-delete-confirm-box" className="mx-5 sm:mx-6 mt-3 p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-rose-950 text-sm">
                  Confirmar Exclusão de "{storeToDelete.nomeFantasia}"?
                </h4>
                <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                  Documento: <strong className="font-mono">{storeToDelete.cnpj}</strong> {storeToDelete.razaoSocial ? `(${storeToDelete.razaoSocial})` : ''}.
                </p>
                <div className="text-[11px] text-rose-900 bg-rose-100/90 p-2.5 rounded-lg mt-2 border border-rose-300 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-950">
                    <span>⚠️ Atenção:</span>
                  </p>
                  <p>
                    Ao excluir este cliente, <strong>todos os serviços, valores cobrados, recebidos e débitos vinculados a ele serão completamente zerados e removidos do sistema</strong>.
                  </p>
                  {getServicesCount(storeToDelete) > 0 && (
                    <p className="font-semibold text-rose-800 pt-0.5">
                      Total de registros a serem zerados: {getServicesCount(storeToDelete)} serviço(s).
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-rose-200">
              <button
                id="btn-cancel-delete-store"
                type="button"
                onClick={() => setStoreToDelete(null)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-store"
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir e Zerar Serviços</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Reset All Services Confirmation Modal */}
        {showResetAllServicesConfirm && (
          <div id="reset-all-services-box" className="mx-5 sm:mx-6 mt-3 p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-3 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-amber-950 text-sm">
                  Zerar Todos os Serviços e Valores Financeiros?
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  Esta ação irá apagar todos os lançamentos de serviços, zerando o total cobrado, recebido, saldo em aberto e débitos em todo o aplicativo. Seus clientes e cadastros de CNPJ/CPF serão mantidos.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
              <button
                id="btn-cancel-reset-all"
                type="button"
                onClick={() => setShowResetAllServicesConfirm(false)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-reset-all"
                type="button"
                onClick={() => {
                  if (onResetAllServices) {
                    onResetAllServices();
                    setSuccessMsg('Todos os serviços e valores financeiros foram zerados com sucesso!');
                    setTimeout(() => setSuccessMsg(''), 4000);
                  }
                  setShowResetAllServicesConfirm(false);
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Zerar Todos os Serviços</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {/* VIEW 1: LIST OF CLIENTS WITH SEARCH, EDIT AND DELETE */}
          {activeTab === 'list' && (
            <div className="space-y-3.5">
              
              {/* Search & Counter Strip */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por nome, CNPJ/CPF, cidade ou e-mail..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onResetAllServices && services.length > 0 && !isClient && (
                    <button
                      id="btn-trigger-reset-all-services"
                      type="button"
                      onClick={() => setShowResetAllServicesConfirm(true)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Apagar todos os serviços e zerar valores financeiros do sistema"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span className="hidden sm:inline">Zerar Serviços & Valores</span>
                      <span className="sm:hidden">Zerar Dados</span>
                    </button>
                  )}

                  <button
                    id="btn-add-new-client"
                    onClick={handleStartCreate}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Cadastrar Novo Cliente</span>
                  </button>
                </div>
              </div>

              {/* Stores Cards List */}
              {filteredStores.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-700 text-sm">
                      {searchTerm ? 'Nenhum cliente encontrado com este filtro' : 'Nenhum cliente cadastrado ainda'}
                    </h5>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      {searchTerm 
                        ? 'Tente pesquisar com outro termo ou limpe a busca para visualizar todos os clientes.'
                        : 'Clique no botão abaixo para cadastrar seu primeiro cliente ou estabelecimento por CNPJ ou CPF.'}
                    </p>
                  </div>
                  {!searchTerm && (
                    <button
                      onClick={handleStartCreate}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cadastrar Primeiro Cliente</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredStores.map((st) => {
                    const isCpf = st.documentType === 'CPF' || (st.cleanCnpj && st.cleanCnpj.length === 11);
                    const sCount = getServicesCount(st);
                    const fullAddress = [st.logradouro, st.numero, st.bairro, st.municipio, st.uf].filter(Boolean).join(', ');

                    return (
                      <div
                        key={st.id}
                        className="p-4 rounded-2xl bg-white hover:bg-slate-50/70 border border-slate-200 hover:border-sky-300 transition shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3.5 group"
                      >
                        {/* Info Block */}
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white text-xs shrink-0 ${
                              isCpf ? 'bg-rose-600' : 'bg-sky-600'
                            }`}>
                              {isCpf ? '👤' : '🏬'}
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 text-sm block truncate">
                                {st.nomeFantasia}
                              </span>
                              {st.razaoSocial && st.razaoSocial !== st.nomeFantasia && (
                                <span className="text-[11px] text-slate-500 block truncate">
                                  {st.razaoSocial}
                                </span>
                              )}
                            </div>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                              isCpf ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                            }`}>
                              <span>{isCpf ? 'CPF:' : 'CNPJ:'}</span>
                              <strong>{st.cnpj}</strong>
                            </span>

                            {isCpf ? (
                              <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>CPF: dígitos válidos • situação não consultada</span>
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0">
                                {st.situacaoCadastral || 'Não consultada'}
                              </span>
                            )}
                            {sCount > 0 && (
                              <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shrink-0">
                                <Briefcase className="w-2.5 h-2.5" />
                                <span>{sCount} {sCount === 1 ? 'obra/serviço' : 'obras/serviços'}</span>
                              </span>
                            )}
                          </div>

                          {/* Metadata row */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 pt-0.5">
                            {st.dataNascimento && (
                              <span className="flex items-center gap-1 font-mono text-[10px] text-slate-500">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{isCpf ? 'Nasc:' : 'Abertura:'} {st.dataNascimento}</span>
                              </span>
                            )}
                            {st.ownerEmail && (
                              <span className="flex items-center gap-1 font-mono text-sky-700 font-semibold">
                                <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <span>Google Portal: {st.ownerEmail}</span>
                              </span>
                            )}
                            {st.telefone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{st.telefone}</span>
                              </span>
                            )}
                            {fullAddress && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-xs">{fullAddress}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Ver Serviços, Editar, Excluir */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap justify-end">
                          {/* Filter dashboard button */}
                          <button
                            type="button"
                            onClick={() => {
                              onSelectStoreToFilter(st.id);
                              onClose();
                            }}
                            className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Filtrar serviços deste cliente no painel principal"
                          >
                            <span>Ver Serviços</span>
                          </button>

                          {!isClient && (
                            <>
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => handleStartEdit(st)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                                title="Editar dados cadastrais, endereço e contatos deste cliente"
                              >
                                <Pencil className="w-3.5 h-3.5 text-slate-600" />
                                <span>Editar</span>
                              </button>

                              {/* Delete Button */}
                              <button
                                id={`btn-delete-store-${st.id}`}
                                type="button"
                                onClick={() => setStoreToDelete(st)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                                title="Excluir este cliente e zerar seus serviços vinculados"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Excluir</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW 2: FORM FOR CREATING OR EDITING A CLIENT */}
          {activeTab === 'form' && (
            <div className="space-y-4">
              
              {/* Form Title & Banner */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl text-white font-bold ${editingStoreId ? 'bg-amber-600' : 'bg-sky-600'}`}>
                    {editingStoreId ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      {editingStoreId ? `Editar Cliente: "${nomeFantasia || 'Carregando...'}"` : 'Cadastrar Novo Cliente / Estabelecimento'}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {editingStoreId 
                        ? 'Atualize os dados cadastrais, e-mail de acesso ao portal e endereço.' 
                        : 'Cadastre empresa (CNPJ) ou pessoa física (CPF) com consulta automática.'}
                    </p>
                  </div>
                </div>

                {/* Type Switcher Pills */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDocTypeToggle('CNPJ')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                      docType === 'CNPJ' 
                        ? 'bg-sky-600 text-white shadow-2xs' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>CNPJ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDocTypeToggle('CPF')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                      docType === 'CPF' 
                        ? 'bg-rose-600 text-white shadow-2xs' 
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>CPF</span>
                  </button>
                </div>
              </div>

              {/* Document Input and Validate button */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-3">
                <label className="font-bold text-slate-800 block text-xs">
                  Número do {docType === 'CNPJ' ? 'CNPJ da Empresa' : 'CPF do Titular'} *
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    {docType === 'CNPJ' ? (
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    ) : (
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                    )}
                    <input
                      type="text"
                      value={docInput}
                      onChange={handleDocChange}
                      placeholder={docType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                      maxLength={docType === 'CNPJ' ? 18 : 14}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSearchOrValidate()}
                    disabled={isLoading}
                    className={`px-4 py-2 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                      docType === 'CNPJ'
                        ? 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'
                        : 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                    }`}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 animate-spin" />
                        <span>{docType === 'CNPJ' ? 'Consultando CNPJ...' : 'Validando CPF...'}</span>
                      </span>
                    ) : docType === 'CNPJ' ? (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Consultar CNPJ</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Validar dígitos do CPF</span>
                      </>
                    )}
                  </button>
                </div>

                {error && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-xs">{error}</span>
                  </div>
                )}

                {/* Receita Federal Official Card for CPF */}
                {docType === 'CPF' && receitaFederalCpf && !error && (
                  <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl space-y-2.5 animate-in fade-in">
                    <div className="flex items-start gap-2.5 border-b border-sky-200 pb-2">
                      <ShieldCheck className="w-5 h-5 text-sky-700 shrink-0" />
                      <div>
                        <p className="font-extrabold text-sky-950 text-xs">Validação matemática do CPF</p>
                        <p className="text-[11px] text-sky-900">CPF: <strong className="font-mono">{receitaFederalCpf.formattedCpf}</strong> • Dígitos verificadores válidos. Isso não confirma titularidade nem situação cadastral.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                        <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Indicador regional pelo 9º dígito</span>
                        <span className="font-extrabold text-sky-950">{receitaFederalCpf.regiaoFiscalNome}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-sky-100">
                        <span className="text-[10px] text-slate-500 font-bold block mb-0.5">Abrangência regional indicativa</span>
                        <span className="font-extrabold text-sky-950">{receitaFederalCpf.estadosAbrangidos.join(', ')}</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                      Não foi feita consulta oficial à Receita Federal. Nome, nascimento, endereço e situação cadastral não são obtidos por esta validação. Dados históricos locais podem ser sugeridos, mas devem ser conferidos pelo administrador.
                    </p>
                  </div>
                )}

                {/* Generic Success Alert for CNPJ or Database match */}
                {searchSuccess && !error && (!receitaFederalCpf || docType === 'CNPJ') && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span className="font-semibold text-xs">
                      {successMsg || (docType === 'CNPJ' 
                        ? 'Dados do CNPJ verificados na Receita Federal! Informações preenchidas abaixo.' 
                        : 'Dados do cliente localizados com sucesso! Confira e edite as informações abaixo.')}
                    </span>
                  </div>
                )}
              </div>

              {/* Complete Form Fields */}
              <form onSubmit={handleSaveStore} className="p-4 sm:p-5 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {docType === 'CNPJ' ? 'Nome Fantasia da Loja / Cliente *' : 'Nome do Local / Obra (Ex: Apartamento 42) *'}
                    </label>
                    <input
                      id="store-form-nome-fantasia"
                      type="text"
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      required
                      placeholder={docType === 'CNPJ' ? 'Ex: Supermercado Central' : 'Ex: Residência Jardins / Dr. Carlos'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {docType === 'CNPJ' ? 'Razão Social Oficial' : 'Nome Completo do Titular'}
                    </label>
                    <input
                      id="store-form-razao-social"
                      type="text"
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      placeholder={docType === 'CNPJ' ? 'Ex: Comercial Central LTDA' : 'Ex: Carlos Eduardo de Souza'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{docType === 'CNPJ' ? 'Data de Abertura / Fundação' : 'Data de Nascimento'}</span>
                    </label>
                    <input
                      id="store-form-data-nascimento"
                      type="text"
                      value={dataNascimento}
                      onChange={handleDataNascimentoChange}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition font-mono"
                    />
                  </div>
                </div>

                {/* Google Portal Access Email */}
                <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-xl space-y-1.5">
                  <label className="font-bold text-sky-950 block flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-600" />
                    <span>E-mail Google do Cliente (para Acesso ao Portal do Cliente)</span>
                  </label>
                  <p className="text-[11px] text-sky-800">
                    Ao informar a conta Google do cliente, ele poderá fazer login no sistema e visualizar apenas os serviços desta loja/CNPJ.
                  </p>
                  {isClient ? (
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-800 bg-white px-3 py-2 rounded-lg border border-slate-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>{user?.email}</span>
                      <span className="text-[10px] text-emerald-700 font-sans font-semibold ml-auto">
                        Vinculado à sua conta Google ativa
                      </span>
                    </div>
                  ) : (
                    <input
                      type="email"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="cliente@gmail.com ou empresa@gmail.com"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-2 focus:ring-sky-500 transition font-mono text-xs"
                    />
                  )}
                </div>

                {/* Contacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">E-mail Comercial de Contato</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contato@empresa.com.br"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                    />
                  </div>
                </div>

                {/* Address Section */}
                <div className="border-t border-slate-200 pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 block text-xs flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Endereço da Loja / Obra</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Preenchimento automático por CEP</span>
                  </div>

                  {/* CEP Quick Lookup */}
                  <div className="flex items-end gap-2 max-w-sm">
                    <div className="flex-1">
                      <label className="font-medium text-slate-600 block mb-1 text-[11px]">
                        CEP (Busca Automática)
                      </label>
                      <input
                        type="text"
                        value={cep}
                        onChange={handleCepChange}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSearchCep()}
                      disabled={isLoadingCep}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition border border-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Search className={`w-3.5 h-3.5 ${isLoadingCep ? 'animate-spin' : ''}`} />
                      <span>{isLoadingCep ? 'Buscando...' : 'Buscar CEP'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="font-medium text-slate-600 block mb-1 text-[11px]">Logradouro / Rua / Avenida</label>
                      <input
                        type="text"
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                        placeholder="Rua, Avenida..."
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-600 block mb-1 text-[11px]">Número</label>
                      <input
                        type="text"
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        placeholder="123"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-medium text-slate-600 block mb-1 text-[11px]">Bairro</label>
                      <input
                        type="text"
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                        placeholder="Centro"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-600 block mb-1 text-[11px]">Município / Cidade</label>
                      <input
                        type="text"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                        placeholder="São Paulo"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
                      />
                    </div>
                    <div>
                      <label className="font-medium text-slate-600 block mb-1 text-[11px]">UF (Estado)</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={uf}
                        onChange={(e) => setUf(e.target.value)}
                        placeholder="SP"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 uppercase focus:bg-white focus:ring-2 focus:ring-sky-500 transition font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Situação cadastral: CPF não é consultado oficialmente neste fluxo. */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs block">
                        {docType === 'CPF' ? 'Situação cadastral do CPF' : 'Situação cadastral do CNPJ'}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {docType === 'CPF' ? 'Não consultada. A validação confirma apenas os dígitos verificadores.' : 'Dados informados pela fonte pública de consulta de CNPJ.'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-slate-700 bg-white px-3 py-1 rounded-lg border border-slate-200 font-bold self-start sm:self-auto shrink-0">
                    {docType === 'CPF' ? 'Não consultada' : `Situação: ${situacaoCadastral || 'não informada'}`}
                  </span>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200">
                  {editingStoreId ? (
                    <button
                      type="button"
                      onClick={() => {
                        const targetStore = stores.find((s) => s.id === editingStoreId);
                        if (targetStore) {
                          setStoreToDelete(targetStore);
                        }
                      }}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Excluir Cliente</span>
                    </button>
                  ) : <div />}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setActiveTab('list');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={`px-5 py-2 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer ${
                        editingStoreId
                          ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                          : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {editingStoreId ? 'Salvar Alterações do Cliente' : 'Confirmar & Cadastrar Cliente'}
                      </span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Total de {displayedStores.length} {displayedStores.length === 1 ? 'cliente cadastrado' : 'clientes cadastrados'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              id="btn-save-alteracoes-store"
              onClick={(e) => {
                if (activeTab === 'form') {
                  handleSaveStore(e);
                } else {
                  onClose();
                }
              }}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
