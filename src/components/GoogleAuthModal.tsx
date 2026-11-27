import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle,
  ShieldCheck,
  LogIn,
  UserCheck,
  Trash2,
  Ban,
  Unlock,
  AlertTriangle,
  Search,
  Store,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
  Users,
  Filter,
  Save,
  RefreshCw,
  Paperclip,
  Building2,
  Plus,
  LogOut,
  Mail,
  Phone
} from 'lucide-react';
import { ServiceRecord, StoreProfile, UserProfile } from '../types';
import { cleanDocument, formatCnpj, formatCpf, isValidCpf, isValidCnpj, getReceitaFederalCpfInfo } from '../utils/cnpj';
import { formatCurrency } from '../utils/formatters';
import { useAppLogo } from '../utils/logoManager';
import { 
  loadAllUserProfiles, 
  saveAllUserProfiles,
  syncStoresWithUserProfiles,
  blockUserProfile,
  activateUserProfile,
  deleteUserProfile,
  loadStores,
  saveStores,
  saveUser,
  logoutUser
} from '../utils/storage';
import { deleteCloudUserProfile, saveCloudUserProfile, saveCloudStore, fetchCloudUserProfiles } from '../utils/cloudDatabase';
import { AppPage, ObraRecord, VisitaRecord } from '../types';
import { ClientGoogleDriveBackupCard } from './ClientGoogleDriveBackupCard';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser: (updated: UserProfile) => void;
  onOpenStoreModal?: () => void;
  stores?: StoreProfile[];
  onUpdateStores?: (stores: StoreProfile[]) => void;
  services?: ServiceRecord[];
  obras?: ObraRecord[];
  visitas?: VisitaRecord[];
  onPageChange?: (page: AppPage) => void;
  onLogout?: () => void;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  onOpenStoreModal,
  stores,
  onUpdateStores,
  services,
  obras,
  visitas,
  onPageChange,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'switch'>('profile');
  const [editName, setEditName] = useState(user?.name || 'Empreiteiro Samines Oficial');
  const [editPhone, setEditPhone] = useState(user?.phone || '(11) 98765-4321');
  const [editDocument, setEditDocument] = useState(user?.clientDocument || '51.849.204/0001-88');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profilesList, setProfilesList] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);

  // Anexar Clientes / Estabelecimentos State
  const [profileToAttach, setProfileToAttach] = useState<UserProfile | null>(null);
  const [selectedStoreIdsForAttach, setSelectedStoreIdsForAttach] = useState<string[]>([]);
  const [attachSearch, setAttachSearch] = useState('');
  const [customDocInputForAttach, setCustomDocInputForAttach] = useState('');
  const [attachedExtraDocs, setAttachedExtraDocs] = useState<string[]>([]);
  const [isSavingAttach, setIsSavingAttach] = useState(false);
  
  // Custom login state
  
  // Admin action state
  const [profileToBlock, setProfileToBlock] = useState<UserProfile | null>(null);
  const [blockReasonInput, setBlockReasonInput] = useState('');
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(null);
  const [confirmDeleteAllClients, setConfirmDeleteAllClients] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const { logoUrl } = useAppLogo();

  const isAdmin = user?.role === 'admin' || (user?.email ? user.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com' : false);

  const refreshProfiles = async (notify: boolean = false) => {
    const currentStores = stores && stores.length > 0 ? stores : loadStores();
    if (currentStores.length > 0) {
      syncStoresWithUserProfiles(currentStores);
    }
    const local = loadAllUserProfiles();
    setProfilesList(Object.values(local));

    try {
      const cloudProfiles = await fetchCloudUserProfiles();
      if (cloudProfiles && cloudProfiles.length > 0) {
        const updatedLocal = { ...loadAllUserProfiles() };
        let hasNew = false;
        cloudProfiles.forEach(cp => {
          const emailKey = cp.email.toLowerCase();
          if (!updatedLocal[emailKey]) {
            updatedLocal[emailKey] = cp;
            hasNew = true;
          }
        });
        if (hasNew) {
          saveAllUserProfiles(updatedLocal);
          setProfilesList(Object.values(updatedLocal));
        }
      }
      if (notify) {
        showFeedback('Lista de clientes e perfis sincronizada com sucesso!', 'success');
      }
    } catch {
      // Offline fallback
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshingCloud(true);
    await refreshProfiles(true);
    setIsRefreshingCloud(false);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('profile');
      setEditName(user?.name || 'Empreiteiro Samines Oficial');
      setEditPhone(user?.phone || '(11) 98765-4321');
      setEditDocument(user?.clientDocument || '51.849.204/0001-88');
      refreshProfiles(false);
      setSearchTerm('');
      setStatusFilter('all');
      setProfileToBlock(null);
      setProfileToDelete(null);
      setFeedbackMsg(null);
    }
  }, [isOpen, user?.email]);

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) return;
    setIsSavingProfile(true);
    const updated: UserProfile = {
      ...user,
      name: editName.trim() || user.name,
      phone: editPhone.trim() || user.phone,
      clientDocument: editDocument.trim() || user.clientDocument,
    };
    onUpdateUser(updated);
    saveUser(updated);
    saveCloudUserProfile(updated).catch(() => {});
    showFeedback('Dados do perfil oficial atualizados com sucesso!', 'success');
    setIsSavingProfile(false);
  };

  const showFeedback = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4500);
  };

  // Filtered profiles list (Exclui a sessÃ£o/perfil do administrador da listagem)
  const filteredProfiles = useMemo(() => {
    return profilesList.filter((prof) => {
      // A sessÃ£o do administrador nÃ£o deve aparecer na listagem de clientes
      const isMasterAdmin = prof.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com' || prof.role === 'admin';
      if (isMasterAdmin) return false;

      // Status filter
      const isBlocked = prof.status === 'blocked';
      if (statusFilter === 'active' && isBlocked) return false;
      if (statusFilter === 'blocked' && !isBlocked) return false;

      // Search term
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const matchName = prof.name.toLowerCase().includes(q);
      const matchEmail = prof.email.toLowerCase().includes(q);
      const matchDoc = (prof.clientDocument || '').toLowerCase().includes(q) ||
        cleanDocument(prof.clientDocument || '').includes(q);
      const matchOtherDocs = (prof.clientDocuments || []).some(d => 
        d.toLowerCase().includes(q) || cleanDocument(d).includes(q)
      );

      return matchName || matchEmail || matchDoc || matchOtherDocs;
    });
  }, [profilesList, statusFilter, searchTerm]);

  const clientProfiles = useMemo(() => {
    return profilesList.filter(p => p.email.toLowerCase() !== 'empreiteirosaminesoficial@gmail.com' && p.role !== 'admin');
  }, [profilesList]);

  const activeCount = clientProfiles.filter(p => p.status !== 'blocked').length;
  const blockedCount = clientProfiles.filter(p => p.status === 'blocked').length;

  const handleLogout = () => {
    onClose();
    if (onLogout) {
      onLogout();
    } else {
      logoutUser();
      window.location.reload();
    }
  };

  // Helper para obter lojas e estabelecimentos vinculados a determinado perfil
  const getAttachedStoresForProfile = (prof: UserProfile): StoreProfile[] => {
    const currentStores = stores && stores.length > 0 ? stores : loadStores();
    const profEmail = prof.email.toLowerCase();
    const docsClean = new Set((prof.clientDocuments || []).map(d => cleanDocument(d)));
    if (prof.clientDocument) docsClean.add(cleanDocument(prof.clientDocument));

    return currentStores.filter(st => {
      const stClean = cleanDocument(st.cleanCnpj || st.cnpj);
      const isEmailMatch = (st.authorizedEmails || []).some(e => e.toLowerCase() === profEmail) ||
        (st.ownerEmail && st.ownerEmail.toLowerCase() === profEmail);
      const isDocMatch = Boolean(stClean && docsClean.has(stClean));
      return isEmailMatch || isDocMatch;
    });
  };

  const allStoresAvailable = useMemo(() => {
    return stores && stores.length > 0 ? stores : loadStores();
  }, [stores, isOpen]);

  const filteredStoresForAttach = useMemo(() => {
    if (!attachSearch.trim()) return allStoresAvailable;
    const q = attachSearch.toLowerCase();
    return allStoresAvailable.filter(st => {
      const matchName = (st.nomeFantasia && st.nomeFantasia.toLowerCase().includes(q)) ||
        (st.razaoSocial && st.razaoSocial.toLowerCase().includes(q));
      const matchDoc = (st.cnpj && st.cnpj.includes(q)) || (st.cleanCnpj && st.cleanCnpj.includes(q));
      const matchCity = Boolean(st.municipio && st.municipio.toLowerCase().includes(q));
      return matchName || matchDoc || matchCity;
    });
  }, [allStoresAvailable, attachSearch]);

  const handleOpenAttachModal = (prof: UserProfile) => {
    setProfileToDelete(null);
    setProfileToBlock(null);
    setProfileToAttach(prof);
    setAttachSearch('');
    setCustomDocInputForAttach('');

    const currentStores = stores && stores.length > 0 ? stores : loadStores();
    const profEmail = prof.email.toLowerCase();
    const profDocsClean = new Set((prof.clientDocuments || []).map(d => cleanDocument(d)));
    if (prof.clientDocument) profDocsClean.add(cleanDocument(prof.clientDocument));

    const matchedStoreIds: string[] = [];
    const matchedDocsClean = new Set<string>();

    currentStores.forEach(st => {
      const stClean = cleanDocument(st.cleanCnpj || st.cnpj);
      const isEmailAuthorized = (st.authorizedEmails || []).some(e => e.toLowerCase() === profEmail) ||
        (st.ownerEmail && st.ownerEmail.toLowerCase() === profEmail);
      const isDocMatched = Boolean(stClean && profDocsClean.has(stClean));

      if (isEmailAuthorized || isDocMatched) {
        matchedStoreIds.push(st.id);
        if (stClean) matchedDocsClean.add(stClean);
      }
    });

    const extras: string[] = [];
    (prof.clientDocuments || []).forEach(d => {
      const clean = cleanDocument(d);
      if (clean && !matchedDocsClean.has(clean)) {
        extras.push(d);
      }
    });

    setSelectedStoreIdsForAttach(matchedStoreIds);
    setAttachedExtraDocs(extras);
  };

  const handleToggleStoreForAttach = (storeId: string) => {
    setSelectedStoreIdsForAttach(prev => 
      prev.includes(storeId) ? prev.filter(id => id !== storeId) : [...prev, storeId]
    );
  };

  const handleSelectAllStores = () => {
    const currentStores = stores && stores.length > 0 ? stores : loadStores();
    setSelectedStoreIdsForAttach(currentStores.map(s => s.id));
  };

  const handleDeselectAllStores = () => {
    setSelectedStoreIdsForAttach([]);
  };

  const handleAddCustomDocToAttach = () => {
    const clean = cleanDocument(customDocInputForAttach);
    if (!clean || (clean.length !== 11 && clean.length !== 14)) {
      showFeedback('Informe um documento vÃ¡lido: CPF (11 dÃ­gitos) ou CNPJ (14 dÃ­gitos).', 'warning');
      return;
    }
    if (clean.length === 11 && !isValidCpf(clean)) {
      showFeedback('O CPF informado possui dÃ­gitos verificadores invÃ¡lidos.', 'warning');
      return;
    }
    if (clean.length === 14 && !isValidCnpj(clean)) {
      showFeedback('O CNPJ informado possui dÃ­gitos verificadores invÃ¡lidos.', 'warning');
      return;
    }

    const formatted = clean.length === 11 ? formatCpf(clean) : formatCnpj(clean);
    const currentStores = stores && stores.length > 0 ? stores : loadStores();
    const existingStore = currentStores.find(st => cleanDocument(st.cleanCnpj || st.cnpj) === clean);
    if (existingStore) {
      if (!selectedStoreIdsForAttach.includes(existingStore.id)) {
        setSelectedStoreIdsForAttach(prev => [...prev, existingStore.id]);
      }
      showFeedback(`Estabelecimento "${existingStore.nomeFantasia}" selecionado!`, 'success');
    } else {
      if (!attachedExtraDocs.includes(formatted)) {
        setAttachedExtraDocs(prev => [...prev, formatted]);
        showFeedback(`Documento ${formatted} adicionado Ã  lista de anexo!`, 'success');
      }
    }
    setCustomDocInputForAttach('');
  };

  const handleRemoveExtraDoc = (docToRemove: string) => {
    setAttachedExtraDocs(prev => prev.filter(d => d !== docToRemove));
  };

  const handleSaveAttachedStores = async (prof: UserProfile) => {
    setIsSavingAttach(true);
    try {
      const currentStores = [...(stores && stores.length > 0 ? stores : loadStores())];
      const profEmail = prof.email.toLowerCase();
      const allSelectedDocsSet = new Set<string>();

      // Atualiza os authorizedEmails em cada loja
      const updatedStores = currentStores.map(st => {
        const isSelected = selectedStoreIdsForAttach.includes(st.id);
        const authEmails = new Set((st.authorizedEmails || []).map(e => e.toLowerCase()));

        if (isSelected) {
          authEmails.add(profEmail);
          allSelectedDocsSet.add(st.cnpj);
          if (st.cleanCnpj) {
            allSelectedDocsSet.add(st.cleanCnpj.length === 11 ? formatCpf(st.cleanCnpj) : formatCnpj(st.cleanCnpj));
          }
        } else {
          authEmails.delete(profEmail);
        }

        const updatedStore: StoreProfile = {
          ...st,
          authorizedEmails: Array.from(authEmails),
          updatedAt: new Date().toISOString(),
        };

        saveCloudStore(updatedStore).catch(() => {});
        return updatedStore;
      });

      // Adiciona documentos extras digitados avulsos
      attachedExtraDocs.forEach(d => allSelectedDocsSet.add(d));

      const docArray = Array.from(allSelectedDocsSet);
      const primaryDoc = docArray[0] || undefined;
      const isCpfOnly = docArray.length > 0 && docArray.every(d => cleanDocument(d).length === 11);
      const roleLabel = docArray.length === 0 ? 'Cliente / Lojista' : (isCpfOnly ? 'Cliente CPF' : 'Cliente CNPJ');

      // Atualiza o perfil de usuÃ¡rio
      const allProfiles = loadAllUserProfiles();
      const existingProfile = allProfiles[profEmail] || prof;
      const updatedProfile: UserProfile = {
        ...existingProfile,
        clientDocument: primaryDoc,
        clientDocuments: docArray,
        roleLabel,
        statusUpdatedAt: new Date().toISOString(),
      };

      allProfiles[profEmail] = updatedProfile;
      saveAllUserProfiles(allProfiles);
      saveStores(updatedStores);
      if (onUpdateStores) {
        onUpdateStores(updatedStores);
      }

      saveCloudUserProfile(updatedProfile).catch(() => {});

      if ((user?.email || '').toLowerCase() === profEmail) {
        onUpdateUser(updatedProfile);
      }

      setProfilesList(Object.values(allProfiles));
      setProfileToAttach(null);
      showFeedback(`Estabelecimentos e documentos anexados com sucesso ao perfil de "${prof.name}"!`, 'success');
    } catch (err: any) {
      showFeedback(err?.message || 'Erro ao anexar estabelecimentos.', 'error');
    } finally {
      setIsSavingAttach(false);
    }
  };

  // Administrative Actions
  const handleConfirmBlock = () => {
    if (!profileToBlock) return;
    const reason = blockReasonInput.trim() || 'Acesso suspenso pelo administrador';
    const updated = blockUserProfile(profileToBlock.email, reason);

    if (updated) {
      saveCloudUserProfile(updated).catch(() => {});
      setProfilesList(prev => prev.map(p => p.email.toLowerCase() === profileToBlock.email.toLowerCase() ? updated : p));
      showFeedback(`O acesso de "${profileToBlock.name}" foi BLOQUEADO com sucesso.`, 'warning');
      if ((user?.email || '').toLowerCase() === profileToBlock.email.toLowerCase()) {
        onUpdateUser(updated);
      }
    }
    setProfileToBlock(null);
    setBlockReasonInput('');
  };

  const handleActivateProfile = (prof: UserProfile) => {
    const updated = activateUserProfile(prof.email);
    if (updated) {
      saveCloudUserProfile(updated).catch(() => {});
      setProfilesList(prev => prev.map(p => p.email.toLowerCase() === prof.email.toLowerCase() ? updated : p));
      showFeedback(`O acesso de "${prof.name}" foi ATIVADO com sucesso!`, 'success');
      if ((user?.email || '').toLowerCase() === prof.email.toLowerCase()) {
        onUpdateUser(updated);
      }
    }
  };

  const handleConfirmDelete = () => {
    if (!profileToDelete) return;
    const emailToDelete = profileToDelete.email;
    const name = profileToDelete.name;
    const success = deleteUserProfile(emailToDelete);

    if (success) {
      setProfilesList(prev => prev.filter(p => p.email.toLowerCase() !== emailToDelete.toLowerCase()));
      showFeedback(`O acesso ao sistema de "${name}" (${emailToDelete}) foi EXCLUÃDO com sucesso.`, 'success');
    }
    setProfileToDelete(null);
  };

  const handleSaveAllChanges = () => {
    const allProfiles = loadAllUserProfiles();
    profilesList.forEach(p => {
      allProfiles[p.email.toLowerCase()] = p;
    });
    saveAllUserProfiles(allProfiles);

    if (stores && stores.length > 0) {
      syncStoresWithUserProfiles(stores);
    }

    showFeedback('Todas as alteraÃ§Ãµes de acesso foram salvas com sucesso pelo Administrador!', 'success');
  };

  const getProfileStats = (prof: UserProfile) => {
    if (prof.role === 'admin' || !services) return null;
    const cleanUserDoc = cleanDocument(prof.clientDocument || '');
    const userDocsSet = new Set((prof.clientDocuments || []).map(d => cleanDocument(d)));
    if (cleanUserDoc) userDocsSet.add(cleanUserDoc);

    const profServices = services.filter(s => {
      const cleanServiceDoc = cleanDocument(s.storeCnpj || '');
      return cleanServiceDoc && userDocsSet.has(cleanServiceDoc);
    });

    const totalCharged = profServices.reduce((sum, s) => sum + (s.valueCharged || 0) + (s.valueDebit || 0), 0);
    const totalPaid = profServices.reduce((sum, s) => sum + (s.valuePaid || 0), 0);
    const totalPending = Math.max(0, totalCharged - totalPaid);

    return {
      count: profServices.length,
      totalCharged,
      totalPaid,
      totalPending,
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 bg-slate-50/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white rounded-xl shadow-2xs border border-slate-200/80 p-1">
              <img
                src={logoUrl}
                alt="Logo Empreiteiro SaminÃªs"
                className="w-full h-full object-contain filter drop-shadow-xs"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = '/logo-transparent.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900">Empreiteiro SaminÃªs â€¢ Acesso ao Google</h3>
                {isAdmin && (
                  <span className="bg-indigo-100 text-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-600" />
                    <span>Painel do Administrador</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {isAdmin 
                  ? 'Gerencie registros de perfil locais; status e vÃ­nculos cadastrais nÃ£o concedem acesso aos dados.' 
                  : 'Perfis de CNPJ e CPF sincronizados com as aÃ§Ãµes do Administrador'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition cursor-pointer"
            title="Fechar janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs flex-1">
          
          {/* Action Feedback Banner */}
          {feedbackMsg && (
            <div className={`p-3 rounded-xl border flex items-center gap-2 animate-in fade-in ${
              feedbackMsg.type === 'error'
                ? 'bg-rose-50 border-rose-300 text-rose-800 font-semibold'
                : feedbackMsg.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
            }`}>
              {feedbackMsg.type === 'error' ? (
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              ) : feedbackMsg.type === 'warning' ? (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Current Active Google Session */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conta Conectada Atual</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                user?.role === 'client' 
                  ? 'bg-emerald-100 text-emerald-800' 
                  : 'bg-indigo-100 text-indigo-800'
              }`}>
                <ShieldCheck className="w-3 h-3" />
                <span>{user?.role === 'client' ? 'Portal do Cliente (Restrito ao CNPJ/CPF)' : 'Administrador Oficial (Acesso Total)'}</span>
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={user?.avatar && !user.avatar.includes('unsplash') ? user.avatar : '/logo-transparent.png'}
                  alt={user?.name || 'UsuÃ¡rio'}
                  className="w-11 h-11 rounded-full border-2 border-emerald-500 object-contain bg-white shadow-2xs shrink-0 p-0.5"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = '/logo-transparent.png';
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm block truncate">{user?.name}</span>
                    {user?.status === 'blocked' ? (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                        <Ban className="w-2.5 h-2.5" /> Bloqueado
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Ativo
                      </span>
                    )}
                  </div>
                  <span className="text-slate-500 text-[11px] font-mono block truncate">{user?.email}</span>
                  {user?.role === 'client' && user?.clientDocument && (
                    <span className="text-[10px] text-sky-700 font-semibold block mt-0.5">
                      Documento vinculado: <strong className="font-mono">{user.clientDocument}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Quick action: client actions & BotÃ£o de Sair */}
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {user?.role === 'client' && (
                  <>
                    {onOpenStoreModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenStoreModal();
                        }}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Store className="w-3 h-3" />
                        <span>Cadastrar CNPJ/CPF</span>
                      </button>
                    )}
                  </>
                )}

                {/* BotÃ£o de Sair da Conta / Desconectar */}
                <button
                  type="button"
                  id="btn-session-logout"
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs hover:shadow-xs"
                  title="Sair desta conta e desconectar deste dispositivo"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              id="tab-my-profile"
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'profile' ? 'bg-white text-emerald-950 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Meu Perfil & Empresas</span>
            </button>
            <button
              id="tab-manage-google-profiles"
              type="button"
              onClick={() => setActiveTab('switch')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'switch' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isAdmin ? 'Perfis legados (Admin)' : 'Perfis de Clientes'}</span>
            </button>

          </div>

          {/* Tab 0: Meu Perfil Oficial & Empresas Cadastradas */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in">
              {/* Profile Card & Form */}
              <form onSubmit={handleSaveProfile} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-slate-900 text-xs">Dados do Meu Perfil Oficial</span>
                  </div>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Conta Google Autenticada</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Nome Completo */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nome Oficial do Gestor / UsuÃ¡rio *
                    </label>
                    <input
                      id="input-profile-name"
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      placeholder="Ex: Empreiteiro Samines Oficial"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* E-mail (Google Account) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      E-mail Conectado ao Google
                    </label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 text-xs font-mono">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user?.email || 'empreiteirosaminesoficial@gmail.com'}</span>
                    </div>
                  </div>

                  {/* Documento CNPJ / CPF */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Documento Oficial (CNPJ / CPF)
                    </label>
                    <input
                      id="input-profile-doc"
                      type="text"
                      value={editDocument}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\D/g, '').slice(0, 14);
                        if (clean.length === 11) {
                          setEditDocument(formatCpf(clean));
                        } else if (clean.length === 14) {
                          setEditDocument(formatCnpj(clean));
                        } else {
                          setEditDocument(e.target.value);
                        }
                      }}
                      placeholder="51.849.204/0001-88"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-mono font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Telefone / WhatsApp */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Telefone / WhatsApp Comercial
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        id="input-profile-phone"
                        type="text"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="(11) 98765-4321"
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 gap-2 flex-wrap">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Perfil seguro & sincronizado no Firestore e Cloud Database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-profile-form-logout"
                      onClick={handleLogout}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      title="Sair da conta e desconectar deste dispositivo"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      <span>Sair da Conta</span>
                    </button>
                    <button
                      id="btn-save-my-profile"
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingProfile ? 'Salvando...' : 'Salvar Dados do Perfil'}</span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Backup do cliente fica dentro de Meu Perfil, nunca no Dashboard. */}
              {user?.role === 'client' && user && (
                <ClientGoogleDriveBackupCard
                  user={user}
                  services={services || []}
                  stores={stores || []}
                  obras={obras || []}
                  visitas={visitas || []}
                />
              )}

              {/* SeÃ§Ã£o Minhas Empresas & Estabelecimentos Cadastrados */}
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-200/80 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <div>
                      <h4 className="font-extrabold text-emerald-950 text-xs">
                        Empresas & Estabelecimentos Cadastrados ({allStoresAvailable.length})
                      </h4>
                      <p className="text-[10px] text-emerald-800">
                        Lojas, redes e clientes vinculados para controle de notas, obras e serviÃ§os
                      </p>
                    </div>
                  </div>
                  {onOpenStoreModal && (
                    <button
                      id="btn-cadastrar-empresa-modal"
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenStoreModal();
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Cadastrar Empresa</span>
                    </button>
                  )}
                </div>

                {allStoresAvailable.length === 0 ? (
                  <div className="p-5 text-center bg-white rounded-xl border border-dashed border-emerald-300 space-y-2">
                    <Building2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <p className="font-bold text-slate-800 text-xs">Nenhuma empresa/estabelecimento cadastrado ainda</p>
                    <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                      Cadastre a primeira empresa, loja ou cliente para associar serviÃ§os, orÃ§amentos e relatÃ³rios financeiros.
                    </p>
                    {onOpenStoreModal && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenStoreModal();
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition inline-flex items-center gap-1.5 shadow-xs cursor-pointer mt-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Cadastrar Empresa Agora</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {allStoresAvailable.map((st) => {
                      const isCpf = st.documentType === 'CPF' || cleanDocument(st.cleanCnpj || st.cnpj).length === 11;
                      return (
                        <div
                          key={st.id}
                          className="p-2.5 bg-white border border-emerald-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs hover:border-emerald-400 transition"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs truncate">
                                {st.nomeFantasia || st.razaoSocial}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                isCpf ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isCpf ? 'Pessoa FÃ­sica / CPF' : 'Pessoa JurÃ­dica / CNPJ'}
                              </span>
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono">
                                {st.situacaoCadastral || 'NÃ£o consultada'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span>Doc: {st.cnpj}</span>
                              {st.municipio && <span>â€¢ {st.municipio}/{st.uf || ''}</span>}
                            </div>
                          </div>
                          {onOpenStoreModal && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onOpenStoreModal();
                              }}
                              className="px-2.5 py-1 text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg text-[11px] font-bold border border-slate-200 hover:border-emerald-300 transition shrink-0 cursor-pointer"
                              title="Editar dados desta empresa"
                            >
                              Editar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Tab 1: Profiles Management / Switching */}
          {activeTab === 'switch' && (
            <div className="space-y-3">
              {/* Search & Status Filter Controls for Administrator & Users */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    id="input-search-google-profiles"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar por nome, e-mail Google ou documento..."
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

                {/* Status Filter Pills & Refresh */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      statusFilter === 'all'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    Todos ({clientProfiles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('active')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      statusFilter === 'active'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ativos ({activeCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter('blocked')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      statusFilter === 'blocked'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <Ban className="w-3 h-3" />
                    <span>Bloqueados ({blockedCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshingCloud}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 disabled:opacity-50"
                    title="Buscar e atualizar clientes cadastrados na nuvem"
                  >
                    <RefreshCw className={`w-3 h-3 text-indigo-600 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
                    <span>Sincronizar</span>
                  </button>
                </div>
              </div>

              {/* Profiles List */}
              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {filteredProfiles.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <p className="font-semibold text-slate-700">Nenhum cliente cadastrado no momento</p>
                    <p className="text-slate-500 text-[11px]">Quando novos clientes se cadastrarem no sistema, eles aparecerÃ£o automaticamente aqui.</p>
                    <button
                      type="button"
                      onClick={handleManualRefresh}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs cursor-pointer mt-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
                      <span>Atualizar Lista da Nuvem</span>
                    </button>
                  </div>
                ) : (
                  filteredProfiles.map((prof) => {
                    const isActive = (user?.email || '').toLowerCase() === prof.email.toLowerCase();
                    const isMasterAdmin = prof.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com';
                    const isBlocked = prof.status === 'blocked';
                    const doc = prof.clientDocument;
                    const stats = getProfileStats(prof);
                    const attachedStores = getAttachedStoresForProfile(prof);
                    const isAttaching = profileToAttach?.email.toLowerCase() === prof.email.toLowerCase();
                    const isConfirmingBlock = profileToBlock?.email.toLowerCase() === prof.email.toLowerCase();
                    const isConfirmingDelete = profileToDelete?.email.toLowerCase() === prof.email.toLowerCase();

                    return (
                      <div
                        key={prof.email}
                        className={`p-3.5 rounded-xl border transition flex flex-col gap-3 group ${
                          isBlocked
                            ? 'border-rose-300 bg-rose-50/50'
                            : isActive
                              ? 'border-sky-500 bg-sky-50/70 shadow-xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Profile Info */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <img
                            src={prof.avatar && !prof.avatar.includes('unsplash') ? prof.avatar : '/logo-transparent.png'}
                            alt={prof.name}
                            className="w-10 h-10 rounded-full border border-slate-200 object-contain bg-white shrink-0 mt-0.5 p-0.5 shadow-2xs"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = '/logo-transparent.png';
                            }}
                          />
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-xs truncate">{prof.name}</span>
                              
                              {/* Role Badge */}
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                isMasterAdmin
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isMasterAdmin ? 'Admin Oficial' : (doc && cleanDocument(doc).length === 11 ? 'Cliente CPF' : 'Cliente CNPJ')}
                              </span>

                              {/* Status Badge */}
                              {isBlocked ? (
                                <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <Ban className="w-2.5 h-2.5 text-rose-600" />
                                  <span>BLOQUEADO</span>
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>ATIVO</span>
                                </span>
                              )}

                              {isActive && (
                                <span className="bg-sky-100 text-sky-800 text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <UserCheck className="w-2.5 h-2.5" /> SessÃ£o Atual
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-500 font-mono block truncate">{prof.email}</span>
                            
                            {/* Estabelecimentos / Lojas Vinculadas */}
                            <div className="pt-1 space-y-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-semibold">
                                <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Estabelecimentos Anexados ({attachedStores.length}):</span>
                              </div>
                              <div className="flex items-center gap-1 flex-wrap">
                                {attachedStores.map(st => {
                                  const isCpf = st.documentType === 'CPF' || cleanDocument(st.cleanCnpj || st.cnpj).length === 11;
                                  return (
                                    <span
                                      key={st.id}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10px] font-medium"
                                      title={`${st.razaoSocial} - ${st.cnpj}`}
                                    >
                                      <span className="font-bold max-w-[130px] truncate">{st.nomeFantasia || st.razaoSocial}</span>
                                      <span className={`text-[8px] font-extrabold px-1 rounded ${isCpf ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                        {isCpf ? 'CPF' : 'CNPJ'}
                                      </span>
                                      <span className="font-mono text-[9px] text-emerald-700">{st.cnpj}</span>
                                    </span>
                                  );
                                })}
                                {attachedStores.length === 0 && (
                                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium inline-block">
                                    Nenhum cliente/loja anexado ainda. Clique em "Anexar" para selecionar.
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Block warning reason */}
                            {isBlocked && (
                              <div className="text-[10px] text-rose-800 bg-rose-100/70 border border-rose-200 px-2 py-0.5 rounded flex items-center gap-1 font-medium">
                                <ShieldAlert className="w-3 h-3 text-rose-600 shrink-0" />
                                <span><strong>Motivo:</strong> {prof.statusReason || 'Suspenso pelo administrador'}</span>
                              </div>
                            )}

                            {/* Real-time stats synchronized from Administrator */}
                            {stats && (
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] pt-0.5">
                                <span className="text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded font-medium">
                                  {stats.count} serviÃ§o(s)
                                </span>
                                <span className="text-slate-700 font-semibold">
                                  Total: {formatCurrency(stats.totalCharged)}
                                </span>
                                {stats.totalPending > 0 ? (
                                  <span className="text-amber-700 bg-amber-50 px-1 py-0.2 rounded font-semibold">
                                    Pendente: {formatCurrency(stats.totalPending)}
                                  </span>
                                ) : stats.count > 0 ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded font-semibold">
                                    Quitado 100%
                                  </span>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons: Conectar, Anexar, Bloquear/Ativar, Excluir */}
                        <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 flex-wrap justify-end">
                          {/* Admin Controls: Anexar, Ativar, Bloquear, Excluir (Aparece APENAS para o Administrador) */}
                          {isAdmin && !isMasterAdmin && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* BotÃ£o Anexar Estabelecimentos / Clientes */}
                              <button
                                id={`btn-attach-stores-${prof.email}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isAttaching) {
                                    setProfileToAttach(null);
                                  } else {
                                    handleOpenAttachModal(prof);
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs ${
                                  isAttaching
                                    ? 'bg-amber-600 text-white'
                                    : 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white'
                                }`}
                                title="Vincular dados cadastrais ao perfil; isso nÃ£o concede acesso ao Firestore"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>{isAttaching ? 'Fechar Anexo' : 'Anexar'}</span>
                              </button>

                              {/* BotÃ£o para Ativar o Acesso */}
                              {isBlocked ? (
                                <button
                                  id={`btn-activate-user-${prof.email}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActivateProfile(prof);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                                  title="Marcar perfil local como ativo; nÃ£o concede acesso aos dados"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Ativar</span>
                                </button>
                              ) : (
                                <button
                                  id={`btn-activate-user-${prof.email}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleActivateProfile(prof);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Status local ativo; autorizaÃ§Ã£o real por estabelecimento ainda nÃ£o configurada"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Perfil ativo</span>
                                </button>
                              )}

                              {/* BotÃ£o para Bloquear o Acesso */}
                              {isBlocked ? (
                                <button
                                  id={`btn-block-user-${prof.email}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProfileToDelete(null);
                                    setProfileToAttach(null);
                                    setProfileToBlock(prof);
                                    setBlockReasonInput(prof.statusReason || '');
                                  }}
                                  className="px-2.5 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Acesso Bloqueado (Clique para gerenciar o motivo)"
                                >
                                  <Ban className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Bloqueado</span>
                                </button>
                              ) : (
                                <button
                                  id={`btn-block-user-${prof.email}`}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProfileToDelete(null);
                                    setProfileToAttach(null);
                                    setProfileToBlock(prof);
                                    setBlockReasonInput('');
                                  }}
                                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                                  title="Bloquear o acesso deste usuÃ¡rio ao sistema"
                                >
                                  <Ban className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Bloquear</span>
                                </button>
                              )}

                              {/* BotÃ£o para Excluir o Acesso ao Sistema */}
                              <button
                                id={`btn-delete-user-${prof.email}`}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProfileToBlock(null);
                                  setProfileToAttach(null);
                                  setProfileToDelete(prof);
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 hover:border-rose-300 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Excluir o acesso deste usuÃ¡rio ao sistema"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>Excluir</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Inline Box para Anexar Clientes & Estabelecimentos ao Perfil */}
                      {isAttaching && (
                        <div id={`box-attach-stores-${prof.email}`} className="w-full mt-2 p-3.5 bg-amber-50/95 border-2 border-amber-400 rounded-2xl space-y-3 animate-in fade-in shadow-xs">
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                            <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                              <Paperclip className="w-4 h-4 text-amber-700 shrink-0" />
                              <span>VÃ­nculos cadastrais de "{prof.name}"</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProfileToAttach(null)}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <p className="text-[11px] text-amber-900 leading-relaxed">
                            Associe os documentos ao cadastro local. Este vÃ­nculo nÃ£o libera leitura de obras, serviÃ§os ou relatÃ³rios; a autorizaÃ§Ã£o efetiva por estabelecimento ainda precisa ser implementada no Firestore.
                          </p>

                          {/* Search inside stores list */}
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                            <input
                              type="text"
                              value={attachSearch}
                              onChange={(e) => setAttachSearch(e.target.value)}
                              placeholder="Buscar por nome da loja, CNPJ, CPF ou cidade..."
                              className="w-full pl-8 pr-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          {/* Quick selection actions */}
                          <div className="flex items-center justify-between text-[11px] text-amber-950 px-1 font-semibold">
                            <span>
                              {selectedStoreIdsForAttach.length} de {allStoresAvailable.length} selecionado(s)
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleSelectAllStores}
                                className="text-amber-800 hover:text-amber-950 underline cursor-pointer"
                              >
                                Marcar Todos
                              </button>
                              <span className="text-amber-300">|</span>
                              <button
                                type="button"
                                onClick={handleDeselectAllStores}
                                className="text-amber-800 hover:text-amber-950 underline cursor-pointer"
                              >
                                Desmarcar Todos
                              </button>
                            </div>
                          </div>

                          {/* List of stores with checkboxes */}
                          <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-amber-200/80 rounded-xl p-2 bg-white/90">
                            {filteredStoresForAttach.length === 0 ? (
                              <div className="p-4 text-center text-slate-500 text-xs">
                                Nenhum estabelecimento encontrado.
                              </div>
                            ) : (
                              filteredStoresForAttach.map((st) => {
                                const isSelected = selectedStoreIdsForAttach.includes(st.id);
                                const isCpf = st.documentType === 'CPF' || cleanDocument(st.cleanCnpj || st.cnpj).length === 11;

                                return (
                                  <div
                                    key={st.id}
                                    onClick={() => handleToggleStoreForAttach(st.id)}
                                    className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2.5 cursor-pointer transition select-none ${
                                      isSelected
                                        ? 'bg-amber-100/80 border-amber-400 text-amber-950 font-bold'
                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}}
                                        className="w-4 h-4 text-amber-600 rounded-sm focus:ring-amber-500 border-slate-300 cursor-pointer pointer-events-none"
                                      />
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5 truncate">
                                          <span className="truncate">{st.nomeFantasia || st.razaoSocial}</span>
                                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                            isCpf ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'
                                          }`}>
                                            {isCpf ? 'CPF' : 'CNPJ'}
                                          </span>
                                        </div>
                                        <div className="text-[10px] text-slate-500 font-mono truncate">
                                          {st.cnpj} {st.municipio ? `â€¢ ${st.municipio}/${st.uf || ''}` : ''}
                                        </div>
                                      </div>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                                      isSelected ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                      {isSelected ? 'Anexado' : 'NÃ£o vinculado'}
                                    </span>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Extra CNPJ/CPF input */}
                          <div className="pt-2 border-t border-amber-200">
                            <label className="block text-[10px] font-bold text-amber-950 mb-1">
                              Ou adicione outro CNPJ ou CPF diretamente:
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={customDocInputForAttach}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/\D/g, '').slice(0, 14);
                                  if (clean.length === 11) {
                                    setCustomDocInputForAttach(formatCpf(clean));
                                  } else if (clean.length === 14) {
                                    setCustomDocInputForAttach(formatCnpj(clean));
                                  } else {
                                    setCustomDocInputForAttach(e.target.value);
                                  }
                                }}
                                placeholder="00.000.000/0001-00 ou 000.000.000-00"
                                className="flex-1 px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                              />
                              <button
                                type="button"
                                onClick={handleAddCustomDocToAttach}
                                className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold shrink-0 cursor-pointer transition flex items-center gap-1"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar</span>
                              </button>
                            </div>
                            {attachedExtraDocs.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1.5">
                                <span className="text-[10px] text-amber-900 font-semibold">Documentos extras:</span>
                                {attachedExtraDocs.map((docStr) => (
                                  <span
                                    key={docStr}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-950 font-mono text-[10px] font-bold"
                                  >
                                    <span>{docStr}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveExtraDoc(docStr)}
                                      className="hover:text-rose-700 cursor-pointer"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Save & Cancel Buttons */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
                            <button
                              type="button"
                              onClick={() => {
                                setProfileToAttach(null);
                                setAttachSearch('');
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition"
                            >
                              Cancelar
                            </button>
                            <button
                              id={`btn-save-attach-${prof.email}`}
                              type="button"
                              disabled={isSavingAttach}
                              onClick={() => handleSaveAttachedStores(prof)}
                              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{isSavingAttach ? 'Salvando...' : 'Salvar vÃ­nculo cadastral'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Confirmation for Block (Appears directly inside this card) */}
                      {isConfirmingBlock && (
                        <div id={`box-confirm-block-${prof.email}`} className="w-full mt-1 p-3 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-2.5 animate-in fade-in">
                          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                            <Ban className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Bloquear o acesso de "{prof.name}" ({prof.email})?</span>
                          </div>
                          <p className="text-[11px] text-amber-900 leading-relaxed">
                            Ao confirmar o bloqueio, este usuÃ¡rio terÃ¡ seu login suspenso no sistema atÃ© que o administrador libere o acesso.
                          </p>
                          <div>
                            <label className="block text-[10px] font-bold text-amber-950 mb-1">
                              Motivo do Bloqueio (Opcional):
                            </label>
                            <input
                              id={`input-block-reason-${prof.email}`}
                              type="text"
                              value={blockReasonInput}
                              onChange={(e) => setBlockReasonInput(e.target.value)}
                              placeholder="Ex: Pagamento pendente, cadastro em revisÃ£o..."
                              className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileToBlock(null);
                                setBlockReasonInput('');
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition"
                            >
                              Cancelar
                            </button>
                            <button
                              id={`btn-confirm-block-inline-${prof.email}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmBlock();
                              }}
                              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Confirmar Bloqueio</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Inline Confirmation for Delete (Appears directly inside this card) */}
                      {isConfirmingDelete && (
                        <div id={`box-confirm-delete-${prof.email}`} className="w-full mt-1 p-3 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2.5 animate-in fade-in">
                          <div className="flex items-center gap-2 text-rose-950 font-bold text-xs">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>Confirmar exclusÃ£o de "{prof.name}" ({prof.email})?</span>
                          </div>
                          <p className="text-[11px] text-rose-800 leading-relaxed">
                            Esta conta Google serÃ¡ removida da lista de acessos. Os serviÃ§os e o histÃ³rico no sistema continuarÃ£o preservados com seguranÃ§a.
                          </p>
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProfileToDelete(null);
                              }}
                              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition"
                            >
                              Cancelar
                            </button>
                            <button
                              id={`btn-confirm-delete-inline-${prof.email}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleConfirmDelete();
                              }}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Sim, Excluir Perfil</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })
                )}
              </div>
            </div>
          )}

          {/* Explanation note */}
          <div className="p-3 bg-sky-50/70 border border-sky-200/80 rounded-xl text-[11px] text-sky-950 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Perfis legados:</strong> bloqueio, ativaÃ§Ã£o e associaÃ§Ã£o documental alteram apenas registros administrativos locais. NÃ£o concedem nem revogam autorizaÃ§Ã£o de leitura no Firestore. O acesso de clientes permanece bloqueado atÃ© a implementaÃ§Ã£o de vÃ­nculos aprovados por estabelecimento.
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="text-[11px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>Painel do Administrador â€¢ Controle de Acessos</span>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">
                SessÃ£o conectada ao Google
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="btn-close-google-modal"
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>

            {/* BotÃ£o para Salvar AlteraÃ§Ãµes (Apenas para o Administrador) */}
            {isAdmin && (
              <button
                id="btn-save-admin-changes"
                type="button"
                onClick={handleSaveAllChanges}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Salvar todas as alteraÃ§Ãµes de acesso no sistema"
              >
                <Save className="w-4 h-4" />
                <span>Salvar AlteraÃ§Ãµes</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

