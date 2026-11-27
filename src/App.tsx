import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onFirebaseAuthStateChanged, auth } from './lib/firebase';
import { processGoogleAuthUser, executeGoogleLogout } from './utils/googleAuthService';
import { 
  PlusCircle, 
  Building2, 
  Search, 
  Calendar, 
  FileSpreadsheet, 
  Layers, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  Receipt,
  CheckCircle2,
  Filter,
  Cloud,
  RefreshCw,
  WifiOff,
  Users,
  HardHat,
  CalendarClock,
  Wrench,
  ArrowRight,
  ChevronRight,
  Eye,
  Briefcase,
  LayoutGrid,
  List,
  CalendarDays,
  CreditCard,
  ClipboardList
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { 
  AppNotification, 
  AppPage,
  PixPaymentConfig,
  FinancialSummary, 
  ObraRecord,
  PaymentMethod, 
  PaymentStatus, 
  ServicePhoto, 
  ServiceRecord, 
  StoreProfile, 
  SyncLogEntry,
  SyncSettings,
  SyncStatus,
  UserProfile,
  VisitaRecord
} from './types';
import { 
  loadNotifications, 
  loadServices, 
  loadStores, 
  saveNotifications, 
  saveServices, 
  saveStores, 
  saveUser,
  logoutUser,
  syncStoresWithUserProfiles,
  loadObras,
  saveObras,
  loadVisitas,
  saveVisitas
} from './utils/storage';
import { 
  getNotificationPermission, 
 
  requestNotificationPermission, 
  triggerMobileAndBrowserNotification 
} from './utils/notifications';
import { 
  addSyncLog, 
  broadcastDataChange, 
  createAutoBackupSnapshot, 
  loadSyncLogs, 
  loadSyncSettings, 
  saveSyncSettings, 
  subscribeCrossTabSync 
} from './utils/sync';
import { formatCurrency } from './utils/formatters';
import { formatDocument, cleanDocument } from './utils/cnpj';
import {
  loadPixPaymentConfig,
  DEFAULT_PIX_PAYMENT_CONFIG,
  savePixPaymentConfig
} from './utils/pixPaymentStorage';
import { 
  syncWithCloudDatabase,
  saveCloudNotification,
  deleteCloudNotification,
  listenCloudNotifications,
  saveCloudService,
  deleteCloudService,
  listenCloudServices,
  saveCloudStore,
  deleteCloudStore,
  listenCloudStores,
  listenCloudUserProfiles,
  saveCloudObra,
  deleteCloudObra,
  listenCloudObras,
  saveCloudVisita,
  deleteCloudVisita,
  listenCloudVisitas,
  fetchCloudUserProfileByEmail,
  fetchAuthorizedClientData,
  listenClientAccessChanges,
  listenAuthorizedClientData,
  markClientNotificationAsRead,
  listenClientNotifications,
  listenClientApprovalStatus,
  flushCloudOutbox,
  getLastCloudWriteError
} from './utils/cloudDatabase';
import { mergeWithPendingWrites, countPendingWrites } from './utils/cloudOutbox';

// Components
import { Navbar } from './components/Navbar';
import { AppNavigation } from './components/AppNavigation';
import { DashboardKPIs } from './components/DashboardKPIs';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { ServicesTable } from './components/ServicesTable';
import { PaidServicesModal } from './components/PaidServicesModal';
import { ServiceModal } from './components/ServiceModal';
import { QuickDebitModal } from './components/QuickDebitModal';
import { QuickPaymentModal } from './components/QuickPaymentModal';
import { StoreModal } from './components/StoreModal';
import { PhotoGalleryModal } from './components/PhotoGalleryModal';
import { ExportModal } from './components/ExportModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { NotificationCenterModal } from './components/NotificationCenterModal';
import { InAppNotificationToast } from './components/InAppNotificationToast';
import { AutoSyncModal } from './components/AutoSyncModal';
import { FirebaseBackupScheduleModal } from './components/FirebaseBackupScheduleModal';
import { DashboardBackupScheduleCard } from './components/DashboardBackupScheduleCard';
import { InstallBanner } from './components/pwa/install-banner';
import { OverduePendingReminder } from './components/OverduePendingReminder';
import { GenerateReceiptModal } from './components/GenerateReceiptModal';
import { AuthGate } from './components/AuthGate';
import { getOverduePendingSummary, isServiceOverduePending } from './utils/pendingReminder';
import { createClientReceiptNotification } from './utils/receiptGenerator';
import { 
  checkShouldRunScheduledBackup, 
  executeScheduledFirebaseBackup, 
  loadScheduledBackupConfig 
} from './utils/backupScheduler';

// Dedicated Page Components
import { ObrasPage } from './components/pages/ObrasPage';
import { VisitasPage } from './components/pages/VisitasPage';
import { ClientesPage } from './components/pages/ClientesPage';
import { ComprovantesPage } from './components/pages/ComprovantesPage';
import { EmpresaPage } from './components/pages/EmpresaPage';

import { PlayStoreApkModal } from './components/PlayStoreApkModal';
import { loadWhatsAppConfig } from './utils/whatsappStorage';

// --- Controle local de avisos já exibidos (evita som/aviso duplicado) --------
function readIdSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed.filter((id: unknown): id is string => typeof id === "string") : []);
  } catch {
    return new Set<string>();
  }
}

function writeIdSet(key: string, ids: Set<string>) {
  try {
    // Mantém só os 800 mais recentes para não crescer indefinidamente.
    localStorage.setItem(key, JSON.stringify([...ids].slice(-800)));
  } catch {
    // ignore
  }
}

const ADMIN_ALERTED_VISITS_KEY = 'samines_admin_alerted_visit_requests_v1';
const ADMIN_SEEN_VISITS_KEY = 'samines_admin_seen_visit_requests_v1';
const loadAlertedVisitRequestIds = () => readIdSet(ADMIN_ALERTED_VISITS_KEY);
const saveAlertedVisitRequestIds = (ids: Set<string>) => writeIdSet(ADMIN_ALERTED_VISITS_KEY, ids);
const clientAlertedKey = (uid: string) => `samines_client_alerted_notifications_v1_${uid}`;

/** Página onde o aviso deve acender o contador do botão. */
function notificationPage(notification: AppNotification): AppPage | null {
  const category = notification.category
    || (notification.type === 'comprovante' ? 'comprovante'
      : notification.serviceId ? 'servico'
      : undefined);
  if (category === 'servico' || category === 'pagamento') return 'servicos';
  if (category === 'visita' || category === 'orcamento') return 'visitas';
  if (category === 'comprovante') return 'comprovantes';
  if (category === 'obra') return 'obras';
  return null;
}

export default function App() {
  // --- Global App States ---
  // Dados empresariais só são carregados após o Firebase confirmar o administrador.
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [stores, setStores] = useState<StoreProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  // Chave estável dos estabelecimentos autorizados: evita reinstalar os listeners
  // do cliente só porque o array foi recriado com o mesmo conteúdo.
  const authorizedStoreKey = [...new Set(user?.authorizedStoreIds || [])].filter(Boolean).sort().join('|');
  const [authReady, setAuthReady] = useState(false);
  const [accessApprovalStatus, setAccessApprovalStatus] = useState<'none' | 'pending' | 'checking' | 'rejected' | 'no_stores'>('none');
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const [pixConfig, setPixConfig] = useState<PixPaymentConfig>(DEFAULT_PIX_PAYMENT_CONFIG);

  // --- Active Page Navigation State ---
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard');

  // --- Obras & Visitas States ---
  const [obras, setObras] = useState<ObraRecord[]>([]);
  const [visitas, setVisitas] = useState<VisitaRecord[]>([]);

  // --- Filter & Search States ---
  const [selectedStoreId, setSelectedStoreId] = useState<string>('todas');
  const [monthFilter, setMonthFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [serviceViewMode, setServiceViewMode] = useState<'detalhes' | 'lista' | 'calendario'>('lista');

  // --- Modals States ---
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isPaidServicesModalOpen, setIsPaidServicesModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceRecord | null>(null);

  const [isDebitModalOpen, setIsDebitModalOpen] = useState(false);
  const [selectedServiceForDebit, setSelectedServiceForDebit] = useState<ServiceRecord | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedServiceForPayment, setSelectedServiceForPayment] = useState<ServiceRecord | null>(null);

  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeToEditFromClientPage, setStoreToEditFromClientPage] = useState<StoreProfile | null>(null);

  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [selectedServiceForPhoto, setSelectedServiceForPhoto] = useState<ServiceRecord | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isPlayStoreApkModalOpen, setIsPlayStoreApkModalOpen] = useState(false);
  const [isGoogleAuthModalOpen, setIsGoogleAuthModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [activeToastNotification, setActiveToastNotification] = useState<AppNotification | null>(null);
  const clientNotificationIdsRef = useRef<Set<string>>(new Set());
  const [isAutoSyncModalOpen, setIsAutoSyncModalOpen] = useState(false);
  const [isFirebaseBackupModalOpen, setIsFirebaseBackupModalOpen] = useState(false);
  const [backupScheduleTab, setBackupScheduleTab] = useState<'schedule' | 'drive' | 'history'>('schedule');
  const [isGenerateReceiptModalOpen, setIsGenerateReceiptModalOpen] = useState(false);
  const [preSelectedReceiptServiceId, setPreSelectedReceiptServiceId] = useState<string | undefined>(undefined);
  const [initialStoreIdForService, setInitialStoreIdForService] = useState<string | undefined>(undefined);

  // --- Auto-Sync States ---
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => 
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'synced'
  );
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() => loadSyncSettings());
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);

  // Notification permission
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Remove credenciais antigas de API do WhatsApp que possam ter ficado no navegador.
  useEffect(() => {
    loadWhatsAppConfig();
  }, []);

  // Prevent infinite loops and thread lockups during cross-tab/storage sync
  const isRemoteSyncRef = useRef(false);
  const servicesRef = useRef(services);
  const storesRef = useRef(stores);
  servicesRef.current = services;
  storesRef.current = stores;

  // A identidade da aplicação é reconstruída exclusivamente pelo observador do Firebase Auth.
  // Perfis pendentes nunca recebem sessão de aplicação nem acesso aos dados.
  useEffect(() => {
    let active = true;
    let authEventId = 0;
    let approvalUnsubscribe: (() => void) | null = null;
    let approvalActivationInProgress = false;

    const observeClientApproval = (firebaseUser: NonNullable<typeof auth.currentUser>, eventId: number) => {
      if (approvalUnsubscribe) return;

      approvalUnsubscribe = listenClientApprovalStatus(firebaseUser.uid, (status) => {
        if (!active || eventId !== authEventId || auth.currentUser?.uid !== firebaseUser.uid) return;

        if (status === 'pending') {
          setAccessApprovalStatus('pending');
          return;
        }

        if (status === 'rejected') {
          setAccessApprovalStatus('rejected');
          return;
        }

        if (status !== 'approved') {
          setAccessApprovalStatus('checking');
          return;
        }

        if (approvalActivationInProgress) return;
        approvalActivationInProgress = true;
        setAccessApprovalStatus('checking');

        void (async () => {
          try {
            const approvedResult = await processGoogleAuthUser({
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              uid: firebaseUser.uid,
              emailVerified: firebaseUser.emailVerified,
            });

            if (!active || eventId !== authEventId || auth.currentUser?.uid !== firebaseUser.uid) return;

            if (
              !approvedResult.success ||
              approvedResult.profile?.role !== 'client' ||
              approvedResult.profile.status !== 'active' ||
              !(approvedResult.profile.authorizedStoreIds || []).length
            ) {
              // Aprovado, mas sem nenhum estabelecimento ativo: cadastro mantido, acesso bloqueado.
              setAccessApprovalStatus(
                approvedResult.profile?.status === 'blocked' ? 'rejected'
                  : approvedResult.success ? 'no_stores' : 'checking'
              );
              return;
            }

            const clientData = await fetchAuthorizedClientData(
              approvedResult.profile.authorizedStoreIds || []
            );

            if (!active || eventId !== authEventId || auth.currentUser?.uid !== firebaseUser.uid) return;

            if (clientData.stores.length === 0) {
              setAccessApprovalStatus('no_stores');
              return;
            }

            setStores(clientData.stores);
            setServices(clientData.services);
            setObras(clientData.obras);
            setVisitas(clientData.visitas);
            setNotifications([]);
            setUser(approvedResult.profile);
            setAccessApprovalStatus('none');
          } catch (error) {
            console.warn('[ClientApproval] Aguardando validação dos vínculos e dados:', error);
            if (active && eventId === authEventId) {
              setAccessApprovalStatus('checking');
            }
          } finally {
            approvalActivationInProgress = false;
          }
        })();
      });
    };
    const unsubscribe = onFirebaseAuthStateChanged(auth, async (firebaseUser) => {
      if (!active) return;
      const currentEventId = ++authEventId;
      if (approvalUnsubscribe) { approvalUnsubscribe(); approvalUnsubscribe = null; }
      approvalActivationInProgress = false;
      setAccessApprovalStatus('none');

      // Revoga imediatamente a sessão anterior enquanto a nova identidade é validada.
      // Isso impede que uma sessão administrativa continue visível durante a troca de conta.
      setAuthReady(false);
      setUser(null);
      setServices([]);
      setStores([]);
      setNotifications([]);
      setObras([]);
      setVisitas([]);
      setPixConfig(DEFAULT_PIX_PAYMENT_CONFIG);
      setSyncLogs([]);
      setCurrentPage('dashboard');
      setSelectedStoreId('todas');
      setSearchQuery('');
      setServiceToEdit(null);
      setSelectedServiceForDebit(null);
      setSelectedServiceForPayment(null);
      setSelectedServiceForPhoto(null);
      setStoreToEditFromClientPage(null);
      setIsServiceModalOpen(false);
      setIsPaidServicesModalOpen(false);
      setIsDebitModalOpen(false);
      setIsPaymentModalOpen(false);
      setIsStoreModalOpen(false);
      setIsPhotoModalOpen(false);
      setIsExportModalOpen(false);
      setIsPlayStoreApkModalOpen(false);
      setIsGoogleAuthModalOpen(false);
      setIsNotificationModalOpen(false);
      setIsAutoSyncModalOpen(false);
      setIsFirebaseBackupModalOpen(false);
      setIsGenerateReceiptModalOpen(false);
      isRemoteSyncRef.current = false;

      if (!firebaseUser) {
        setAccessApprovalStatus('none');
        setAuthReady(true);
        return;
      }

      try {
        const result = await processGoogleAuthUser({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          uid: firebaseUser.uid,
          emailVerified: firebaseUser.emailVerified,
        });
        if (!active || currentEventId !== authEventId) return;
        if (result.success && result.profile?.role === 'admin' && result.profile.status === 'active') {
          // Só após autenticação administrativa confirmada, reabre o cache local do gestor.
          setServices(loadServices());
          setStores(loadStores());
          setNotifications(loadNotifications());
          setObras(loadObras());
          setVisitas(loadVisitas());
          setPixConfig(loadPixPaymentConfig());
          setSyncLogs(loadSyncLogs());
          setSyncSettings(loadSyncSettings());
          setUser(result.profile);
        } else if (result.success && result.profile?.role === 'client' && result.profile.status === 'active' && (result.profile.authorizedStoreIds || []).length > 0) {
          // Cliente não reabre cache local: recebe exclusivamente dados remotos dos storeIds aprovados.
          const clientData = await fetchAuthorizedClientData(result.profile.authorizedStoreIds || []);
          if (!active || currentEventId !== authEventId) return;
          setStores(clientData.stores);
          setServices(clientData.services);
          setObras(clientData.obras);
          setVisitas(clientData.visitas);
          setNotifications([]);
          setUser(result.profile);
        } else if (result.success && result.profile?.role === 'client') {
          const alreadyReviewed = (result as { isNewAccount?: boolean }).isNewAccount === false;
          setAccessApprovalStatus(
            result.profile.status === 'blocked' ? 'rejected'
              : alreadyReviewed ? 'no_stores'
              : 'pending'
          );
          observeClientApproval(firebaseUser, currentEventId);
        }
      } catch (error) {
        console.error('[Auth] Não foi possível reconstruir a sessão:', error);
        if (active && currentEventId === authEventId) {
          setUser(null);
          if (firebaseUser.email?.toLowerCase() !== 'empreiteirosaminesoficial@gmail.com') {
            setAccessApprovalStatus('checking');
            observeClientApproval(firebaseUser, currentEventId);
          }
        }
      } finally {
        if (active && currentEventId === authEventId) setAuthReady(true);
      }
    });
    return () => {
      active = false;
      authEventId += 1;
      if (approvalUnsubscribe) approvalUnsubscribe();
      unsubscribe();
    };
  }, []);

  // Revogação em tempo real: mudanças no pedido, membership ou estado do estabelecimento
  // removem imediatamente da memória os dados que deixaram de estar autorizados.
  useEffect(() => {
    if (!authReady || user?.role !== 'client' || !user.id) return;
    const uid = user.id;
    let currentIds = [...(user.authorizedStoreIds || [])];
    let active = true;
    let refreshing = false;
    let refreshPending = false;

    // Sem nenhum estabelecimento autorizado: remove os dados da memória, mas NÃO
    // encerra a conta. A sessão é reavaliada e o cliente vê a tela "sem
    // estabelecimentos"; o acesso volta sozinho quando o ADM vincular uma loja.
    const clearAndLogout = () => {
      if (!active || auth.currentUser?.uid !== uid) return;
      setServices([]); setStores([]); setNotifications([]); setObras([]); setVisitas([]);
      setUser(null);
      window.location.reload();
    };

    const refreshAuthorization = async () => {
      if (!active || auth.currentUser?.uid !== uid || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
      if (currentIds.length === 0) { clearAndLogout(); return; }
      if (refreshing) { refreshPending = true; return; }
      refreshing = true;
      do {
        refreshPending = false;
        try {
          const clientData = await fetchAuthorizedClientData(currentIds);
          if (!active || auth.currentUser?.uid !== uid) return;
          const validIds = clientData.stores.map((store) => store.id);
          if (validIds.length === 0) {
            clearAndLogout();
            return;
          }
          setStores(clientData.stores);
          setServices(clientData.services);
          setObras(clientData.obras);
          setVisitas(clientData.visitas);
          setUser((previous) => previous?.id === uid
            ? { ...previous, authorizedStoreIds: validIds }
            : previous);
        } catch (error) {
          // Permissão negada = vínculo revogado: oculta os dados. Falha de rede/servidor
          // apenas mantém o que já estava autorizado na tela (persistência no celular).
          const code = (error as { code?: string })?.code || '';
          if (active && auth.currentUser?.uid === uid && code.includes('permission-denied')) {
            setServices([]); setStores([]); setNotifications([]); setObras([]); setVisitas([]);
          }
          console.warn('[ClientAccess] Falha ao atualizar vínculos autorizados:', error);
        }
      } while (refreshPending && active);
      refreshing = false;
    };

    // Sem conexão: mantém os dados já autorizados visíveis; revogações são
    // aplicadas assim que a conexão voltar (handleOnline → refreshAuthorization).
    const handleOffline = () => {};
    const handleOnline = () => { void refreshAuthorization(); };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    const unsubscribe = listenClientAccessChanges(uid, currentIds, (latestIds) => {
      currentIds = [...latestIds];
      void refreshAuthorization();
    });
    return () => {
      active = false;
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      unsubscribe();
    };
  }, [authReady, user?.id, user?.role, authorizedStoreKey]);

  // Dados autorizados do cliente permanecem sincronizados em tempo real.
  useEffect(() => {
    if (!authReady || user?.role !== 'client' || user.status !== 'active' || !user.id) return;

    const uid = user.id;
    const storeIds = [...new Set(user.authorizedStoreIds || [])].filter(Boolean);

    if (storeIds.length === 0 || !isOnline) return;

    let active = true;

    const unsubscribe = listenAuthorizedClientData(storeIds, (data) => {
      if (!active || auth.currentUser?.uid !== uid) return;
      setServices(data.services);
      setObras(data.obras);
      // Solicitações de visita do próprio cliente ainda não confirmadas continuam visíveis.
      setVisitas(mergeWithPendingWrites('visitas', data.visitas)
        .filter((item) => Boolean(item.storeId && storeIds.includes(item.storeId))));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [authReady, isOnline, user?.id, user?.role, user?.status, authorizedStoreKey]);

  // Clientes recebem somente notificações direcionadas aos CNPJs/estabelecimentos aprovados.
  useEffect(() => {
    if (!authReady || user?.role !== 'client' || user.status !== 'active' || !isOnline) {
      clientNotificationIdsRef.current = new Set();
      return;
    }

    const storeIds = [...new Set(user.authorizedStoreIds || [])].filter(Boolean);
    if (storeIds.length === 0) {
      setNotifications([]);
      return;
    }

    clientNotificationIdsRef.current = new Set();
    const uid = user.id;

    const unsubscribe = listenClientNotifications(uid, storeIds, (clientNotifications) => {
      setNotifications(clientNotifications);

      // Cada aviso toca/aparece uma única vez por aparelho, mesmo que o listener
      // seja reinstalado (reconexão, troca de vínculos) ou a página recarregada.
      const alerted = readIdSet(clientAlertedKey(uid));
      const fresh = clientNotifications.filter((notification) => !notification.read && !alerted.has(notification.id));
      clientNotifications.forEach((notification) => alerted.add(notification.id));
      writeIdSet(clientAlertedKey(uid), alerted);
      if (fresh.length === 0) return;

      const newest = fresh[0];
      setActiveToastNotification(newest);
      const isVisit = newest.category === 'visita' || newest.category === 'orcamento' || Boolean(newest.visitaId);
      // Som e vibração não dependem da permissão de notificação do navegador;
      // a permissão só controla o pop-up do sistema operacional.
      void triggerMobileAndBrowserNotification({
        title: fresh.length > 1 ? `${fresh.length} novas atualizações` : newest.title,
        body: fresh.length > 1 ? newest.title : newest.body,
        type: newest.type,
        sound: isVisit ? 'visit' : undefined,
      });
    });

    return () => unsubscribe();
  }, [authReady, isOnline, user?.id, user?.role, user?.status, authorizedStoreKey]);

  // Sincronização inicial e sempre que o usuário conectar/mudar de perfil
  useEffect(() => {
    setNotificationPermission(getNotificationPermission());
    if (!authReady || user?.role !== 'admin' || user.status !== 'active' || !isOnline) return;
    let active = true;
    syncStoresWithUserProfiles(stores);

    if (typeof navigator !== 'undefined' && navigator.onLine) {
      // 1. Sincroniza dados consolidados com o Firestore (serviços, lojas, perfis, notificações, obras e visitas)
      syncWithCloudDatabase().then((res) => {
        if (active && res && res.downloadedCount > 0) {
          setStores(loadStores());
          setServices(loadServices());
          setNotifications(loadNotifications());
          setObras(loadObras());
          setVisitas(loadVisitas());
        }
      }).catch((err) => {
        console.warn('Sincronização inicial com Firestore:', err);
      });

      // 2. Se o usuário estiver logado com o mesmo e-mail, sincroniza o perfil da nuvem imediatamente
      if (user?.email) {
        fetchCloudUserProfileByEmail(user.email).then((cloudProf) => {
          if (!active || !cloudProf) return;
          setUser((prev) => {
            // A resposta atrasada nunca pode recriar uma sessão depois do logout/troca de conta.
            if (!prev || prev.role !== 'admin' || prev.status !== 'active' || prev.email.toLowerCase() !== user.email.toLowerCase()) return prev;
            const hasDiff =
              prev.name !== cloudProf.name ||
              prev.clientDocument !== cloudProf.clientDocument ||
              prev.phone !== cloudProf.phone ||
              (prev.clientDocuments || []).join(',') !== (cloudProf.clientDocuments || []).join(',');
            if (hasDiff) {
              // Campos de identidade/autorização (role, status, email e id) vêm somente do Firebase Auth.
              const merged = {
                ...prev,
                name: cloudProf.name || prev.name,
                avatar: cloudProf.avatar || prev.avatar,
                clientDocument: cloudProf.clientDocument,
                clientDocuments: cloudProf.clientDocuments,
                phone: cloudProf.phone,
              };
              saveUser(merged);
              return merged;
            }
            return prev;
          });
        }).catch(() => {});
      }
    }
    return () => { active = false; };
  }, [authReady, isOnline, user?.email, user?.role, user?.status]);

  // Listeners em tempo real do Firebase Firestore (sincronização bidirecional entre dispositivos e contas com o mesmo perfil)
  useEffect(() => {
    if (!authReady || user?.role !== 'admin' || user.status !== 'active') return;
    if (!isOnline) return;
    let active = true;
    let initialVisitsSnapshot = true;
    let knownVisitRequestIds = new Set<string>();

    // Notificações em tempo real
    const unsubNotifs = listenCloudNotifications((cloudNotifs) => {
      if (!active || isRemoteSyncRef.current) return;
      setNotifications(cloudNotifs);
      saveNotifications(cloudNotifs);
    });

    // Listener de servicos
    const unsubServices = listenCloudServices((cloudServices) => {
      if (!active || isRemoteSyncRef.current) return;
      // Mantém por cima as alterações locais ainda não confirmadas pelo Firestore,
      // para que um serviço recém-criado/editado não suma da tela.
      const merged = mergeWithPendingWrites('services', cloudServices);
      setServices(merged);
      saveServices(merged);
    });

    // Listener de lojas e clientes
    const unsubStores = listenCloudStores((cloudStores) => {
      if (!active || isRemoteSyncRef.current) return;
      setStores(cloudStores);
      saveStores(cloudStores);
      syncStoresWithUserProfiles(cloudStores);
    });

    // Listener de perfis
    const unsubProfiles = listenCloudUserProfiles((cloudProfilesMap) => {
      if (!active || isRemoteSyncRef.current || !user?.email) return;
      const emailNorm = user.email.toLowerCase();
      const updatedProfile = cloudProfilesMap[emailNorm];
      if (updatedProfile) {
        setUser((prev) => {
          if (!prev || prev.role !== 'admin' || prev.status !== 'active' || prev.email.toLowerCase() !== emailNorm) return prev;
          const hasDiff =
            prev.name !== updatedProfile.name ||
            prev.clientDocument !== updatedProfile.clientDocument ||
            prev.phone !== updatedProfile.phone ||
            (prev.clientDocuments || []).join(',') !== (updatedProfile.clientDocuments || []).join(',');
          if (hasDiff) {
            const merged = {
              ...prev,
              name: updatedProfile.name || prev.name,
              avatar: updatedProfile.avatar || prev.avatar,
              clientDocument: updatedProfile.clientDocument,
              clientDocuments: updatedProfile.clientDocuments,
              phone: updatedProfile.phone,
            };
            saveUser(merged);
            return merged;
          }
          return prev;
        });
      }
    });

    // Obras em tempo real
    const unsubObras = listenCloudObras((cloudObras) => {
      if (!active || isRemoteSyncRef.current) return;
      const merged = mergeWithPendingWrites('obras', cloudObras);
      setObras(merged);
      saveObras(merged);
    });

    // Listener de visitas: recebe em tempo real as solicitações feitas pelos clientes.
    const unsubVisitas = listenCloudVisitas((cloudVisitas) => {
      if (!active || isRemoteSyncRef.current) return;
      const merged = mergeWithPendingWrites('visitas', cloudVisitas);
      setVisitas(merged);
      saveVisitas(merged);

      // Aviso ao ADM: somente visual (sem som), uma vez por solicitação, inclusive
      // para pedidos que chegaram enquanto o app estava fechado.
      const alerted = loadAlertedVisitRequestIds();
      const fresh = merged.filter((item) => item.status === 'solicitada' && !alerted.has(item.id));
      if (fresh.length === 0) return;
      fresh.forEach((item) => alerted.add(item.id));
      saveAlertedVisitRequestIds(alerted);

      const newest = [...fresh].sort((x, y) => (y.createdAt || '').localeCompare(x.createdAt || ''))[0];
      const title = fresh.length > 1 ? `${fresh.length} novas solicitações de visita` : 'Nova solicitação de visita';
      const body = fresh.length > 1
        ? `A mais recente: ${newest.clientName}, para ${newest.date}${newest.time ? ` às ${newest.time}` : ''}.`
        : `${newest.clientName} solicitou visita para ${newest.date}${newest.time ? ` às ${newest.time}` : ''}.`;

      fresh.forEach((item) => {
        // Id fixo por solicitação: várias abas/aparelhos do ADM não duplicam o histórico.
        void addNotificationRecord({
          title: 'Nova solicitação de visita 📅',
          body: `${item.clientName} solicitou visita para ${item.date}${item.time ? ` às ${item.time}` : ''}.`,
          type: 'novo_servico',
          storeId: item.storeId,
          category: 'visita',
          visitaId: item.id,
          dedupeId: `notif_visitreq_${item.id}`,
          audience: 'admin',
        });
      });

      setActiveToastNotification({
        id: `toast_visitreq_${newest.id}`,
        title,
        body,
        type: 'novo_servico',
        timestamp: new Date().toISOString(),
        read: false,
        audience: 'admin',
        category: 'visita',
        visitaId: newest.id,
      });
      void triggerMobileAndBrowserNotification({ title, body, type: 'novo_servico', silent: true });
    });

    return () => {
      active = false;
      unsubNotifs();
      unsubServices();
      unsubStores();
      unsubProfiles();
      unsubObras();
      unsubVisitas();
    };
  }, [authReady, isOnline, user?.email, user?.role, user?.status]);

  // Reenvio automático da fila de gravações pendentes (ADM e cliente):
  // ao entrar, ao reconectar e a cada 30 s enquanto houver pendências.
  useEffect(() => {
    if (!authReady || !user || user.status !== 'active' || !isOnline) return;
    let active = true;
    const collections = user.role === 'admin'
      ? (['services', 'obras', 'visitas'] as const)
      : (['visitas'] as const);
    const flush = () => {
      if (!active || countPendingWrites() === 0) return;
      void flushCloudOutbox([...collections]).then((result) => {
        if (result.sent > 0) console.info(`[CloudOutbox] ${result.sent} alteração(ões) pendente(s) enviada(s).`);
      });
    };
    flush();
    const intervalId = window.setInterval(flush, 30000);
    window.addEventListener('online', flush);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('online', flush);
    };
  }, [authReady, isOnline, user?.id, user?.role, user?.status]);

  // Save services changes to localStorage and broadcast safely without re-render loop
  useEffect(() => {
    if (!authReady || user?.role !== 'admin' || user.status !== 'active') return;
    saveServices(services);
    if (isRemoteSyncRef.current) return;
    if (syncSettings.autoSyncEnabled && syncSettings.crossTabSyncEnabled) {
      broadcastDataChange('servicos_atualizados');
    }
  }, [services, syncSettings.autoSyncEnabled, syncSettings.crossTabSyncEnabled]);

  // Save stores changes to localStorage and broadcast safely
  useEffect(() => {
    if (!authReady || user?.role !== 'admin' || user.status !== 'active') return;
    saveStores(stores);
    syncStoresWithUserProfiles(stores);
    if (isRemoteSyncRef.current) return;
    if (syncSettings.autoSyncEnabled && syncSettings.crossTabSyncEnabled) {
      broadcastDataChange('lojas_atualizadas');
    }
  }, [stores, syncSettings.autoSyncEnabled, syncSettings.crossTabSyncEnabled]);

  useEffect(() => {
    if (!authReady || user?.role !== 'admin' || user.status !== 'active') return;
    saveNotifications(notifications);
  }, [notifications, authReady, user?.role, user?.status]);

  useEffect(() => {
    if (!authReady || user?.role !== 'admin' || user.status !== 'active') return;
    saveUser(user);
  }, [user, authReady]);

  // Real-time Cross-Tab Auto Sync listener (guarded against cascading feedback loops)
  useEffect(() => {
    if (!authReady || user?.role !== 'admin' || user.status !== 'active' || !syncSettings.crossTabSyncEnabled) return;

    const unsubscribe = subscribeCrossTabSync((reason) => {
      isRemoteSyncRef.current = true;
      const refreshedServices = loadServices();
      const refreshedStores = loadStores();
      const refreshedNotifs = loadNotifications();

      setServices(refreshedServices);
      setStores(refreshedStores);
      setNotifications(refreshedNotifs);
      // A sessão Firebase permanece válida; logout entre abas é propagado pelo Auth observer.
      syncStoresWithUserProfiles(refreshedStores);

      setSyncStatus('syncing');
      setTimeout(() => {
        setSyncStatus(navigator.onLine ? 'synced' : 'offline');
        isRemoteSyncRef.current = false;
      }, 500);

      const updatedLogs = addSyncLog({
        timestamp: new Date().toISOString(),
        action: 'Sincronização Automática Entre Abas',
        itemCount: refreshedServices.length,
        status: 'success',
        details: `Atualização sincronizada instantaneamente com outra aba (${reason}).`,
      });
      setSyncLogs(updatedLogs);
    });

    return unsubscribe;
  }, [syncSettings.crossTabSyncEnabled, authReady, user?.role, user?.status]);

  // Online / Offline Network detection
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus('syncing');
      const updatedLogs = addSyncLog({
        timestamp: new Date().toISOString(),
        action: 'Conexão Restaurada',
        itemCount: services.length,
        status: 'success',
        details: 'Rede restabelecida. Sincronização automática em segundo plano reativada.',
      });
      setSyncLogs(updatedLogs);

      setTimeout(() => {
        setSyncStatus('synced');
      }, 700);
    };

    const handleOffline = () => {
      setSyncStatus('offline');
      const updatedLogs = addSyncLog({
        timestamp: new Date().toISOString(),
        action: 'Modo Offline Ativado',
        itemCount: services.length,
        status: 'warning',
        details: 'Sem conexão com a internet. Todos os novos dados continuam salvos com segurança localmente.',
      });
      setSyncLogs(updatedLogs);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [services.length]);

  // Periodic heartbeat background sync (lightweight, uses refs to avoid resetting timer)
  useEffect(() => {
    if (!syncSettings.autoSyncEnabled || syncSettings.syncIntervalSeconds <= 0) return;

    const intervalId = setInterval(() => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setSyncStatus('offline');
        return;
      }

      createAutoBackupSnapshot(servicesRef.current, storesRef.current);
      const now = new Date().toISOString();
      setSyncSettings(prev => {
        const next = { ...prev, lastSyncedAt: now };
        saveSyncSettings(next);
        return next;
      });

      setSyncStatus('synced');
    }, syncSettings.syncIntervalSeconds * 1000);

    return () => clearInterval(intervalId);
  }, [syncSettings.autoSyncEnabled, syncSettings.syncIntervalSeconds]);

  // Automated Scheduled Firebase Backup Runner (Checks scheduled hours every 25 seconds)
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const backupInterval = setInterval(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      const currentConfig = loadScheduledBackupConfig();
      if (!currentConfig.enabled) return;

      const check = checkShouldRunScheduledBackup(currentConfig, new Date());
      if (check.shouldRun) {
        console.log(`[BackupScheduler] Horário programado atingido (${check.timeStr}). Realizando backup automático no Firebase...`);
        const res = await executeScheduledFirebaseBackup('scheduled', {
          slotKey: check.slotKey,
          timeStr: check.timeStr,
        }, user?.email || 'sistema');

        if (res.success && res.backup && currentConfig.notifyOnSuccess) {
          addNotificationRecord({
            title: 'Backup no Firebase Concluído! ☁️',
            body: `Cópia redundante #${res.backup.id.slice(-8)} gravada com sucesso no Firestore (${res.backup.servicesCount} serviços e ${res.backup.storesCount} lojas).`,
            type: 'status',
          });
        }
      }
    }, 25000);

    return () => clearInterval(backupInterval);
  }, [user?.role, user?.email]);

  // Handler for manual sync trigger
  const handleTriggerManualSync = async () => {
    setSyncStatus('syncing');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const latestServices = loadServices();
    const latestStores = loadStores();
    setServices(latestServices);
    setStores(latestStores);
    createAutoBackupSnapshot(latestServices, latestStores);

    const now = new Date().toISOString();
    const nextSettings = { ...syncSettings, lastSyncedAt: now };
    setSyncSettings(nextSettings);
    saveSyncSettings(nextSettings);

    const nextLogs = addSyncLog({
      timestamp: now,
      action: 'Sincronização Manual Forçada',
      itemCount: latestServices.length,
      status: 'success',
      details: `Todos os ${latestServices.length} registros e ${latestStores.length} lojas foram validados e salvos com sucesso.`,
    });
    setSyncLogs(nextLogs);

    setSyncStatus(navigator.onLine ? 'synced' : 'offline');
  };

  const handleUpdateSyncSettings = (newSettings: SyncSettings) => {
    if (isClient) return;
    setSyncSettings(newSettings);
    saveSyncSettings(newSettings);
  };

  const handleClearSyncLogs = () => {
    if (isClient) return;
    localStorage.removeItem('gestao_servicos_sync_logs_v1');
    setSyncLogs([]);
  };

  const handleReloadAllData = () => {
    if (isClient) return;
    setServices(loadServices());
    setStores(loadStores());
    setNotifications(loadNotifications());
    void executeGoogleLogout().catch((error) => console.warn('[Auth] Falha ao encerrar sessão Firebase:', error));
    setUser(null);
  };

  // Request browser/mobile push notifications
  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setNotificationPermission(getNotificationPermission());
    if (granted && user?.role === 'client') {
      setActiveToastNotification({
        id: `permission_${Date.now()}`,
        title: 'Notificações Ativadas! 🔔',
        body: 'Você receberá avisos dos serviços, visitas e atualizações dos seus estabelecimentos.',
        type: 'status',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }
  };

  // Helper to add internal notification and broadcast push + audio
  const addNotificationRecord = async (params: {
    title: string;
    body: string;
    type: AppNotification['type'];
    serviceId?: string;
    storeId?: string;
    category?: AppNotification['category'];
    visitaId?: string;
    /** Id fixo para evitar avisos duplicados (ex.: duas abas do ADM recebendo o mesmo evento). */
    dedupeId?: string;
    /** Força o aviso a ficar só no histórico do ADM, mesmo com estabelecimento associado. */
    audience?: 'admin' | 'client';
  }) => {
    const notificationId = params.dedupeId || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const targetStoreId = params.storeId
      || (params.serviceId ? services.find((service) => service.id === params.serviceId)?.storeId : undefined);
    const category: AppNotification['category'] = params.category
      || (params.type === 'pagamento' ? 'pagamento'
        : params.type === 'comprovante' ? 'comprovante'
        : params.serviceId ? 'servico'
        : undefined);

    if (targetStoreId && params.audience !== 'admin') {
      // Avisos de serviços/visitas/obras vão exclusivamente para o cliente daquele estabelecimento.
      const clientNotification: AppNotification = {
        id: `${notificationId}_client`,
        title: params.title,
        body: params.body,
        type: params.type,
        timestamp: new Date().toISOString(),
        read: false,
        serviceId: params.serviceId,
        visitaId: params.visitaId,
        storeId: targetStoreId,
        audience: 'client',
        category,
      };
      saveCloudNotification(clientNotification).then((saved) => {
        if (!saved) console.warn('[Notifications] Não foi possível enviar aviso ao cliente.');
      });
      return;
    }

    // Avisos sem estabelecimento associado permanecem no histórico administrativo.
    const adminNotification: AppNotification = {
      id: notificationId,
      title: params.title,
      body: params.body,
      type: params.type,
      timestamp: new Date().toISOString(),
      read: false,
      serviceId: params.serviceId,
      visitaId: params.visitaId,
      storeId: targetStoreId,
      audience: 'admin',
      category,
    };

    setNotifications((prev) => (prev.some((n) => n.id === adminNotification.id) ? prev : [adminNotification, ...prev]));
    saveCloudNotification(adminNotification).catch(() => {});
  };

  // Role-based authorization & data isolation
  const isClient = user?.role === 'client';

  // Stores visible to current user (Admins see all; Clients only see their own stores)
  const visibleStores = useMemo(() => {
    if (!user || !isClient) return stores;
    const authorizedIds = new Set(user.authorizedStoreIds || []);
    return stores.filter((store) => authorizedIds.has(store.id));
  }, [stores, isClient, user?.authorizedStoreIds]);

  // Keep selectedStoreId in sync if a client changes or store is no longer accessible
  useEffect(() => {
    if (isClient && selectedStoreId !== 'todas') {
      const hasAccess = visibleStores.some(s => s.id === selectedStoreId);
      if (!hasAccess) {
        setSelectedStoreId('todas');
      }
    }
  }, [isClient, selectedStoreId, visibleStores]);

  // Clientes não podem acessar a área administrativa de gerenciamento de clientes.
  useEffect(() => {
    if (isClient && currentPage === 'clientes') setCurrentPage('dashboard');
  }, [isClient, currentPage]);

  // Services accessible to this user
  const userServices = useMemo(() => {
    if (!user || !isClient) return services;
    const allowed = new Set(user.authorizedStoreIds || []);
    return services.filter((service) => allowed.has(service.storeId));
  }, [services, isClient, user?.authorizedStoreIds]);

  // Obras accessible to this user
  const userObras = useMemo(() => {
    if (!user || !isClient) return obras;
    const allowed = new Set(user.authorizedStoreIds || []);
    return obras.filter((obra) => allowed.has(obra.storeId));
  }, [obras, isClient, user?.authorizedStoreIds]);

  // Visitas accessible to this user
  const userVisitas = useMemo(() => {
    if (!user || !isClient) return visitas;
    const allowed = new Set(user.authorizedStoreIds || []);
    return visitas.filter((visita) => Boolean(visita.storeId && allowed.has(visita.storeId)));
  }, [visitas, isClient, user?.authorizedStoreIds]);

  // --- Contadores de novidades nos botões (zeram ao abrir a página) ---
  const [seenVisitRequestIds, setSeenVisitRequestIds] = useState<Set<string>>(() => readIdSet(ADMIN_SEEN_VISITS_KEY));

  const navNewCounts = useMemo<Partial<Record<AppPage, number>>>(() => {
    if (!user) return {};
    if (!isClient) {
      // ADM: solicitações de visita ainda não vistas.
      const pendingRequests = visitas.filter((v) => v.status === 'solicitada' && !seenVisitRequestIds.has(v.id)).length;
      return { visitas: pendingRequests };
    }
    // Cliente: avisos não lidos agrupados pela página correspondente.
    const counts: Partial<Record<AppPage, number>> = {};
    notifications.forEach((notification) => {
      if (notification.read || notification.audience !== 'client') return;
      const page = notificationPage(notification);
      if (page) counts[page] = (counts[page] || 0) + 1;
    });
    return counts;
  }, [user, isClient, visitas, seenVisitRequestIds, notifications]);

  // Ao abrir uma página, zera o contador dela sem apagar o histórico de notificações.
  useEffect(() => {
    if (!user || user.status !== 'active') return;
    if (!isClient) {
      if (currentPage !== 'visitas') return;
      const requestIds = visitas.filter((v) => v.status === 'solicitada').map((v) => v.id);
      if (requestIds.every((id) => seenVisitRequestIds.has(id))) return;
      const next = new Set<string>(seenVisitRequestIds);
      requestIds.forEach((id) => next.add(id));
      writeIdSet(ADMIN_SEEN_VISITS_KEY, next);
      setSeenVisitRequestIds(next);
      return;
    }
    const toMark = notifications.filter((notification) =>
      !notification.read && notification.audience === 'client' && notificationPage(notification) === currentPage
    );
    if (toMark.length === 0) return;
    const markedIds = new Set(toMark.map((notification) => notification.id));
    setNotifications((prev) => prev.map((notification) =>
      markedIds.has(notification.id) ? { ...notification, read: true } : notification
    ));
    toMark.forEach((notification) => {
      void markClientNotificationAsRead(user.id, notification);
    });
  }, [currentPage, isClient, user?.id, user?.status, visitas, notifications, seenVisitRequestIds]);

  // --- Filtering Services ---
  const filteredServices = useMemo(() => {
    return userServices.filter((s) => {
      // Store filter
      if (selectedStoreId !== 'todas' && s.storeId !== selectedStoreId) {
        return false;
      }
      // Month filter
      if (monthFilter !== 'todos' && !s.date.startsWith(monthFilter)) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'todos') {
        if (statusFilter === 'pendente_30d') {
          if (!isServiceOverduePending(s)) return false;
        } else if (s.paymentStatus !== statusFilter) {
          return false;
        }
      }
      // Search query (service description, store name, category, CNPJ, notes)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesDesc = s.description.toLowerCase().includes(q);
        const matchesStore = s.storeName.toLowerCase().includes(q);
        const matchesCategory = s.category.toLowerCase().includes(q);
        const matchesCnpj = s.storeCnpj.toLowerCase().includes(q);
        const matchesNotes = s.notes ? s.notes.toLowerCase().includes(q) : false;
        if (!matchesDesc && !matchesStore && !matchesCategory && !matchesCnpj && !matchesNotes) {
          return false;
        }
      }
      return true;
    });
  }, [userServices, selectedStoreId, monthFilter, statusFilter, searchQuery]);

  // List of available months for filter
  const monthsAvailable = useMemo(() => {
    return Array.from(new Set(userServices.map(s => s.date.slice(0, 7)))).sort().reverse();
  }, [userServices]);

  // --- Financial Summary Calculation ---
  const summary: FinancialSummary = useMemo(() => {
    let totalCharged = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalDebits = 0;

    filteredServices.forEach((s) => {
      const charged = s.valueCharged || 0;
      const paid = s.valuePaid || 0;
      const debit = s.valueDebit || 0;

      totalCharged += charged;
      totalPaid += paid;
      totalDebits += debit;

      const balance = (charged + debit) - paid;
      if (balance > 0 && s.paymentStatus !== 'cancelado') {
        totalPending += balance;
      }
    });

    const totalGross = totalCharged + totalDebits;
    const paidPercentage = totalGross > 0 ? (totalPaid / totalGross) * 100 : 0;
    // O valor de +38% soma apenas com débito extra/custo (não soma com valor cobrado, total recebido, a receber ou taxa de liquidação)
    const totalNotaFiscal = totalDebits * 1.38;
    const totalImpostoNF = totalDebits * 0.38;

    return {
      totalCharged,
      totalPaid,
      totalPending,
      totalDebits,
      netBalance: totalCharged - totalDebits,
      paidPercentage,
      totalServicesCount: filteredServices.length,
      totalNotaFiscal,
      totalImpostoNF,
    };
  }, [filteredServices]);

  // Lembrete Automático: Serviços com status 'pendente' há mais de 30 dias
  const overduePendingSummary = useMemo(() => {
    return getOverduePendingSummary(userServices, 30);
  }, [userServices]);

  // Contagem de fotos e comprovantes para a aba de Comprovantes
  const totalComprovantesCount = useMemo(() => {
    return userServices.reduce((acc, s) => acc + (s.photos ? s.photos.length : 0), 0);
  }, [userServices]);

  const handleFilterOverduePending = () => {
    setStatusFilter('pendente_30d');
    const tableEl = document.getElementById('services-table-section');
    if (tableEl) {
      tableEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Active store object name if filtered
  const activeStore = stores.find(st => st.id === selectedStoreId);

  // Helper: Synchronize every admin action with associated client CNPJ/CPF profiles
  const logAdminActionSync = (
    actionName: string,
    details: string,
    storeCnpj?: string,
    storeName?: string
  ) => {
    const docLabel = storeCnpj ? ` [${storeCnpj}]` : '';
    const nameLabel = storeName ? ` • ${storeName}` : '';
    const fullDetails = `${details}${docLabel}${nameLabel}`;

    const updatedLogs = addSyncLog({
      timestamp: new Date().toISOString(),
      action: actionName,
      itemCount: 1,
      status: 'success',
      details: fullDetails,
    });
    setSyncLogs(updatedLogs);

    // Synchronize client profiles with latest store and service definitions
    syncStoresWithUserProfiles(stores);
  };

  // --- Handlers: Service Management ---
  const handleOpenNewService = (storeId?: string) => {
    if (isClient) return;
    setServiceToEdit(null);
    setInitialStoreIdForService(storeId);
    setIsServiceModalOpen(true);
  };

  const handleEditService = (service: ServiceRecord) => {
    if (isClient) return;
    setServiceToEdit(service);
    setIsServiceModalOpen(true);
  };

  const handleSaveService = (serviceData: Partial<ServiceRecord>) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    if (serviceToEdit) {
      // Edit existing
      const targetStore = stores.find(st => st.id === (serviceData.storeId || serviceToEdit.storeId));
      const updatedRecord: ServiceRecord = {
        ...serviceToEdit,
        ...serviceData,
        storeId: targetStore ? targetStore.id : (serviceData.storeId || serviceToEdit.storeId),
        storeName: targetStore ? targetStore.nomeFantasia : (serviceData.storeName || serviceToEdit.storeName),
        storeCnpj: targetStore ? targetStore.cnpj : (serviceData.storeCnpj || serviceToEdit.storeCnpj),
        updatedAt: new Date().toISOString(),
      } as ServiceRecord;

      const updatedList = services.map((s) => {
        if (s.id === serviceToEdit.id) {
          return updatedRecord;
        }
        return s;
      });
      setServices(updatedList);
      saveCloudService(updatedRecord).catch(() => {});

      addNotificationRecord({
        title: 'Serviço Atualizado 📝',
        body: `O serviço "${updatedRecord.description}" foi atualizado com sucesso e sincronizado.`,
        type: 'status',
        serviceId: serviceToEdit.id,
        storeId: updatedRecord.storeId,
      });

      logAdminActionSync(
        'Serviço Atualizado',
        `Serviço "${updatedRecord.description}" alterado com efeito imediato no perfil do cliente`,
        updatedRecord.storeCnpj,
        updatedRecord.storeName
      );
    } else {
      // Create new service
      const targetStore = stores.find(st => st.id === serviceData.storeId) || stores[0];
      if (!targetStore) {
        window.alert('Cadastre um estabelecimento antes de criar um serviço.');
        return;
      }
      const newId = `serv_${Date.now()}`;
      const newRecord: ServiceRecord = {
        id: newId,
        storeId: targetStore.id,
        storeName: targetStore.nomeFantasia,
        storeCnpj: targetStore.cnpj,
        date: serviceData.date || new Date().toISOString().slice(0, 10),
        description: serviceData.description || 'Novo Serviço',
        category: serviceData.category || 'Geral',
        valueCharged: serviceData.valueCharged || 0,
        valuePaid: serviceData.valuePaid || 0,
        valueDebit: serviceData.valueDebit || 0,
        paymentStatus: serviceData.paymentStatus || 'pendente',
        paymentMethod: serviceData.paymentMethod || 'PIX',
        dueDate: serviceData.dueDate,
        notes: serviceData.notes,
        photos: serviceData.photos || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setServices([newRecord, ...services]);
      saveCloudService(newRecord).catch(() => {});


      // Native mobile & browser alert
      addNotificationRecord({
        title: 'Novo Registro de Serviço! 📋',
        body: `Serviço "${newRecord.description}" (${formatCurrency(newRecord.valueCharged)}) adicionado para ${newRecord.storeName}.`,
        type: 'novo_servico',
        serviceId: newId,
        storeId: targetStore.id,
      });

      logAdminActionSync(
        'Serviço Cadastrado',
        `Novo serviço "${newRecord.description}" (${formatCurrency(newRecord.valueCharged)}) vinculado e sincronizado`,
        newRecord.storeCnpj,
        newRecord.storeName
      );
    }
  };

  const handleDeleteService = (serviceId: string) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    const target = services.find(s => s.id === serviceId);
    setServices(prev => prev.filter(s => s.id !== serviceId));
    deleteCloudService(serviceId).catch(() => {});
    if (selectedServiceForPhoto?.id === serviceId) setSelectedServiceForPhoto(null);

    if (target) {
      logAdminActionSync(
        'Serviço Excluído',
        `Serviço "${target.description}" removido e sincronizado com o perfil`,
        target.storeCnpj,
        target.storeName
      );
    }
  };

  // --- Handlers: Quick Debit Addition ---
  const handleOpenDebitModal = (service: ServiceRecord) => {
    if (isClient) return;
    setSelectedServiceForDebit(service);
    setIsDebitModalOpen(true);
  };

  const handleConfirmDebit = (service: ServiceRecord, additionalDebit: number, reason: string) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    const updatedDebit = (service.valueDebit || 0) + additionalDebit;
    const noteAppend = reason ? ` [Débito +${formatCurrency(additionalDebit)}: ${reason}]` : '';

    const updatedList = services.map((s) => {
      if (s.id === service.id) {
        return {
          ...s,
          valueDebit: updatedDebit,
          notes: s.notes ? s.notes + noteAppend : noteAppend.trim(),
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    setServices(updatedList);
    const updated = updatedList.find(s => s.id === service.id);
    if (updated) saveCloudService(updated).catch(() => {});


    // Notification alert
    addNotificationRecord({
      title: 'Valor de Débito Acrescentado! ⚠️',
      body: `+${formatCurrency(additionalDebit)} adicionado ao serviço "${service.description}" (${service.storeName}). Motivo: ${reason || 'Custos extras'}.`,
      type: 'debito',
      serviceId: service.id,
      storeId: service.storeId,
    });

    logAdminActionSync(
      'Débito Acrescentado',
      `Débito de +${formatCurrency(additionalDebit)} acrescentado ao serviço "${service.description}". Saldo atualizado`,
      service.storeCnpj,
      service.storeName
    );
  };

  // --- Handlers: Quick Payment Addition ---
  const handleOpenPaymentModal = (service: ServiceRecord) => {
    if (isClient) return;
    setSelectedServiceForPayment(service);
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = (
    service: ServiceRecord,
    paymentAmount: number,
    method: PaymentMethod,
    paymentDate: string
  ) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    const newPaidTotal = (service.valuePaid || 0) + paymentAmount;
    const totalDue = (service.valueCharged || 0) + (service.valueDebit || 0);
    const isPaidInFull = newPaidTotal >= totalDue;

    const newStatus: PaymentStatus = isPaidInFull ? 'pago' : 'parcial';

    const updatedList = services.map((s) => {
      if (s.id === service.id) {
        return {
          ...s,
          valuePaid: newPaidTotal,
          paymentStatus: newStatus,
          paymentMethod: method,
          paidDate: isPaidInFull ? paymentDate : s.paidDate,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    setServices(updatedList);
    const updated = updatedList.find(s => s.id === service.id);
    if (updated) saveCloudService(updated).catch(() => {});


    // Celebration confetti
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    addNotificationRecord({
      title: 'Pagamento Recebido! 💰',
      body: `Recebido ${formatCurrency(paymentAmount)} via ${method} para "${service.description}" (${service.storeName}). Status: ${newStatus.toUpperCase()}.`,
      type: 'pagamento',
      serviceId: service.id,
      storeId: service.storeId,
    });

    logAdminActionSync(
      'Pagamento Confirmado',
      `Recebido ${formatCurrency(paymentAmount)} via ${method} para "${service.description}". Status: ${newStatus.toUpperCase()}`,
      service.storeCnpj,
      service.storeName
    );
  };

  // --- Handlers: Status Dropdown Quick Change ---
  const handleStatusChange = (service: ServiceRecord, newStatus: PaymentStatus) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    let newPaid = service.valuePaid;
    const totalDue = service.valueCharged + (service.valueDebit || 0);

    if (newStatus === 'pago') {
      newPaid = totalDue;
  
      try {
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
      } catch {}

      addNotificationRecord({
        title: 'Status Alterado: PAGO! ✅',
        body: `Serviço "${service.description}" marcado como quitado integralmente (${formatCurrency(totalDue)}).`,
        type: 'pagamento',
        serviceId: service.id,
        storeId: service.storeId,
      });
    }

    const updatedList = services.map((s) => {
      if (s.id === service.id) {
        return {
          ...s,
          paymentStatus: newStatus,
          valuePaid: newPaid,
          paidDate: newStatus === 'pago' ? new Date().toISOString().slice(0, 10) : s.paidDate,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    setServices(updatedList);
    const updated = updatedList.find(s => s.id === service.id);
    if (updated) saveCloudService(updated).catch(() => {});

    logAdminActionSync(
      'Status Atualizado',
      `Status do serviço "${service.description}" alterado para "${newStatus.toUpperCase()}"`,
      service.storeCnpj,
      service.storeName
    );
  };

  // --- Handlers: Photos Management ---
  const handleViewPhotos = (service: ServiceRecord) => {
    setSelectedServiceForPhoto(service);
    setIsPhotoModalOpen(true);
  };

  const handleAddPhotosToService = (serviceId: string, newPhotos: ServicePhoto[]) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    const updatedList = services.map((s) => {
      if (s.id === serviceId) {
        const mergedPhotos = [...(s.photos || []), ...newPhotos];
        return {
          ...s,
          photos: mergedPhotos,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    setServices(updatedList);
    const currentSelected = updatedList.find(s => s.id === serviceId);
    if (currentSelected) setSelectedServiceForPhoto(currentSelected);
    // Fotos também precisam chegar ao cliente (antes ficavam só no aparelho do ADM).
    if (currentSelected) {
      saveCloudService(currentSelected).then((saved) => {
        if (!saved) {
          const reason = getLastCloudWriteError();
          console.warn('[Fotos] Serviço mantido na fila de reenvio:', reason);
          if (reason && reason.includes('1 MB')) window.alert(reason);
        }
      });
    }

    addNotificationRecord({
      title: 'Fotos Anexadas ao Serviço 📷',
      body: `${newPhotos.length} foto(s) anexada(s) com sucesso ao serviço.`,
      type: 'status',
      serviceId,
      storeId: currentSelected?.storeId,
    });

    logAdminActionSync(
      'Fotos Sincronizadas',
      `${newPhotos.length} foto(s) anexada(s) ao serviço "${currentSelected?.description || ''}"`,
      currentSelected?.storeCnpj,
      currentSelected?.storeName
    );
  };

  const handleDeletePhotoFromService = (serviceId: string, photoId: string) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    const updatedList = services.map((s) => {
      if (s.id === serviceId) {
        const filtered = (s.photos || []).filter(p => p.id !== photoId);
        return {
          ...s,
          photos: filtered,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    setServices(updatedList);
    const currentSelected = updatedList.find(s => s.id === serviceId);
    if (currentSelected) setSelectedServiceForPhoto(currentSelected);
    // Fotos também precisam chegar ao cliente (antes ficavam só no aparelho do ADM).
    if (currentSelected) {
      saveCloudService(currentSelected).then((saved) => {
        if (!saved) {
          const reason = getLastCloudWriteError();
          console.warn('[Fotos] Serviço mantido na fila de reenvio:', reason);
          if (reason && reason.includes('1 MB')) window.alert(reason);
        }
      });
    }

    logAdminActionSync(
      'Foto Removida',
      `Foto removida do serviço "${currentSelected?.description || ''}"`,
      currentSelected?.storeCnpj,
      currentSelected?.storeName
    );
  };

  // --- Handlers: Store Management ---
  const handleSaveStore = (newStore: StoreProfile) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    const storeToSave: StoreProfile = (isClient && user)
      ? { ...newStore, ownerEmail: newStore.ownerEmail || user.email }
      : newStore;

    const cleanNewDoc = cleanDocument(storeToSave.cleanCnpj || storeToSave.cnpj);
    const isValidDoc = cleanNewDoc.length === 11 || cleanNewDoc.length === 14;

    // Strict unification: ONLY unify if the clean document (11 or 14 digits) is strictly identical,
    // or if editing the exact same record by id. Different CNPJ/CPF are NEVER unified!
    // Primeiro preserva o registro exato em edição. Só procura pelo documento
    // quando for um cadastro novo, evitando atualizar silenciosamente outro ID.
    const exactExistingIndex = stores.findIndex(st => st.id === storeToSave.id);
    const existingIndex = exactExistingIndex >= 0
      ? exactExistingIndex
      : stores.findIndex(st => {
          const cleanExistingDoc = cleanDocument(st.cleanCnpj || st.cnpj);
          return isValidDoc && cleanExistingDoc === cleanNewDoc;
        });

    let canonicalId = storeToSave.id;

    if (existingIndex >= 0) {
      // Unify and update existing store
      const existing = stores[existingIndex];
      canonicalId = existing.id;

      // Merge authorized Google emails for this business
      const authEmailsSet = new Set<string>();
      if (existing.ownerEmail) authEmailsSet.add(existing.ownerEmail.toLowerCase());
      if (existing.authorizedEmails) existing.authorizedEmails.forEach(e => authEmailsSet.add(e.toLowerCase()));
      if (storeToSave.ownerEmail) authEmailsSet.add(storeToSave.ownerEmail.toLowerCase());
      if (storeToSave.authorizedEmails) storeToSave.authorizedEmails.forEach(e => authEmailsSet.add(e.toLowerCase()));
      if (isClient && user?.email) authEmailsSet.add(user.email.toLowerCase());

      const unifiedStore: StoreProfile = {
        ...existing,
        ...storeToSave,
        id: existing.id, // preserve canonical ID so all services remain linked
        cnpj: storeToSave.cnpj || existing.cnpj,
        cleanCnpj: cleanNewDoc || existing.cleanCnpj,
        documentType: storeToSave.documentType || existing.documentType,
        nomeFantasia: storeToSave.nomeFantasia || existing.nomeFantasia,
        razaoSocial: storeToSave.razaoSocial || existing.razaoSocial,
        ownerEmail: storeToSave.ownerEmail || existing.ownerEmail,
        authorizedEmails: Array.from(authEmailsSet),
        status: storeToSave.status || existing.status || 'active',
        blockedReason: storeToSave.status === 'blocked' 
          ? (storeToSave.blockedReason || existing.blockedReason || 'Acesso suspenso pelo administrador')
          : undefined,
        blockedAt: storeToSave.status === 'blocked'
          ? (storeToSave.blockedAt || existing.blockedAt || new Date().toISOString())
          : undefined,
        updatedAt: new Date().toISOString(),
      };

      const updatedStores = [...stores];
      updatedStores[existingIndex] = unifiedStore;
      setStores(updatedStores);
      setSelectedStoreId(canonicalId);
      saveCloudStore(unifiedStore).catch(() => {});

      // Update associated services to reflect unified store name and document
      setServices(prev => prev.map(s => {
        const serviceDoc = cleanDocument(s.storeCnpj || '');
        if (s.storeId === canonicalId || s.storeId === storeToSave.id || (isValidDoc && serviceDoc === cleanNewDoc)) {
          const updatedS = {
            ...s,
            storeId: canonicalId,
            storeName: unifiedStore.nomeFantasia,
            storeCnpj: unifiedStore.cnpj,
          };
          saveCloudService(updatedS).catch(() => {});
          return updatedS;
        }
        return s;
      }));

      if (storeToSave.status === 'blocked' && existing.status !== 'blocked') {
        addNotificationRecord({
          title: 'Cliente Bloqueado 🚫',
          body: `O cliente "${unifiedStore.nomeFantasia}" foi bloqueado pelo administrador. Motivo: ${unifiedStore.blockedReason || 'Suspensão temporária'}.`,
          type: 'aviso',
        });
        logAdminActionSync(
          'Cliente Bloqueado',
          `Acesso de "${unifiedStore.nomeFantasia}" suspenso pelo administrador. Motivo: ${unifiedStore.blockedReason}`,
          unifiedStore.cnpj,
          unifiedStore.nomeFantasia
        );
      } else if (storeToSave.status === 'active' && existing.status === 'blocked') {
        addNotificationRecord({
          title: 'Cliente Reativado ✅',
          body: `O cliente "${unifiedStore.nomeFantasia}" foi reativado com sucesso pelo administrador.`,
          type: 'novo_servico',
          storeId: unifiedStore.id,
        });
        logAdminActionSync(
          'Cliente Reativado',
          `Acesso de "${unifiedStore.nomeFantasia}" desbloqueado e ativado pelo administrador`,
          unifiedStore.cnpj,
          unifiedStore.nomeFantasia
        );
      } else {
        addNotificationRecord({
          title: 'Cadastro Atualizado com Sucesso! 🔄',
          body: `O cadastro do ${unifiedStore.documentType || 'documento'} ${unifiedStore.cnpj} foi atualizado para "${unifiedStore.nomeFantasia}".`,
          type: 'novo_servico',
          storeId: unifiedStore.id,
        });

        logAdminActionSync(
          'Perfil Atualizado',
          `Perfil "${unifiedStore.nomeFantasia}" atualizado e sincronizado com os acessos deste documento`,
          unifiedStore.cnpj,
          unifiedStore.nomeFantasia
        );
      }
    } else {
      // New distinct store registration
      const newRecord: StoreProfile = {
        ...storeToSave,
        status: storeToSave.status || 'active',
        authorizedEmails: isClient && user?.email ? [user.email.toLowerCase()] : [],
        createdAt: new Date().toISOString(),
      };
      setStores(prev => [newRecord, ...prev]);
      setSelectedStoreId(newRecord.id);
      saveCloudStore(newRecord).catch(() => {});

      addNotificationRecord({
        title: `${storeToSave.documentType === 'CPF' ? 'Perfil CPF' : 'Loja CNPJ'} Cadastrado! 🏢`,
        body: `"${storeToSave.nomeFantasia}" (${storeToSave.cnpj}) cadastrado com sucesso.`,
        type: 'novo_servico',
      });

      logAdminActionSync(
        'Novo Cadastro Sincronizado',
        `Novo ${storeToSave.documentType === 'CPF' ? 'CPF' : 'CNPJ'} "${storeToSave.nomeFantasia}" registrado com perfil de acesso criado`,
        storeToSave.cnpj,
        storeToSave.nomeFantasia
      );
    }

    // Synchronize client profile with the registered document
    if (isClient && user) {
      const docs = new Set<string>(user.clientDocuments || []);
      if (user.clientDocument) docs.add(user.clientDocument);
      docs.add(storeToSave.cnpj);
      const updatedUser: UserProfile = {
        ...user,
        clientDocument: user.clientDocument || storeToSave.cnpj,
        clientDocuments: Array.from(docs),
      };
      setUser(updatedUser);
      saveUser(updatedUser);
    }
  };

  const handleDeleteStore = (storeId: string) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    const target = stores.find(st => st.id === storeId);
    const targetCleanDoc = target ? cleanDocument(target.cleanCnpj || target.cnpj) : '';

    setStores(prev => prev.filter(st => st.id !== storeId));
    deleteCloudStore(storeId).catch(() => {});

    // Remove da tela somente os serviços DESTE estabelecimento (por storeId).
    // Antes a comparação também usava o CNPJ, o que apagava serviços de outra loja
    // cadastrada com o mesmo documento. Os registros continuam no Firebase como
    // histórico; sem o cadastro da loja, nenhum cliente consegue acessá-los.
    void targetCleanDoc;
    setServices(prev => prev.filter(s => s.storeId !== storeId));

    if (selectedStoreId === storeId) {
      setSelectedStoreId('todas');
    }
    if (target) {
      addNotificationRecord({
        title: 'Cliente e Serviços Removidos 🗑️',
        body: `O estabelecimento "${target.nomeFantasia}" foi excluído. Os demais estabelecimentos e vínculos não foram alterados.`,
        type: 'aviso',
      });

      logAdminActionSync(
        'Cliente Excluído',
        `Cliente "${target.nomeFantasia}" e todos os seus serviços e valores foram zerados e excluídos`,
        target.cnpj,
        target.nomeFantasia
      );
    }
  };

  const handleResetAllServices = () => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    setServices([]);
    saveServices([]);
    addNotificationRecord({
      title: 'Dados Zerados 🧹',
      body: 'Todos os registros de serviços, valores cobrados, recebidos e débitos foram zerados.',
      type: 'aviso',
    });

    logAdminActionSync(
      'Dados de Serviços Zerados',
      'Todos os registros de serviços, valores cobrados, recebidos e débitos foram zerados no sistema'
    );
  };

  // --- Handlers: Obras Management ---
  const handleSaveObra = (obra: ObraRecord) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    setObras((prev) => {
      const exists = prev.findIndex(o => o.id === obra.id);
      let updated: ObraRecord[];
      if (exists >= 0) {
        updated = [...prev];
        updated[exists] = obra;
      } else {
        updated = [obra, ...prev];
      }
      saveObras(updated);
      return updated;
    });

    saveCloudObra(obra).catch(() => {});

    addNotificationRecord({
      title: 'Obra Atualizada 🏗️',
      body: `Canteiro "${obra.title}" atualizado com sucesso (${obra.progressPercent}% concluída).`,
      type: 'status',
      storeId: obra.storeId,
      category: 'obra',
    });
  };

  const handleDeleteObra = (id: string) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    setObras((prev) => {
      const updated = prev.filter(o => o.id !== id);
      saveObras(updated);
      return updated;
    });

    deleteCloudObra(id).catch(() => {});
  };

  // --- Handlers: Visitas Management ---
  const handleSaveVisita = (visita: VisitaRecord) => {
    if (isClient) {
      // Clientes só podem criar solicitações vinculadas a um estabelecimento autorizado.
      if (visita.status !== 'solicitada' || !visita.storeId || !user?.id) return;
      const clientRequest = { ...visita, createdByUid: user.id };
      setVisitas((prev) => {
        const updated = [clientRequest, ...prev.filter((item) => item.id !== clientRequest.id)];
        saveVisitas(updated);
        return updated;
      });
      saveCloudVisita(clientRequest).then((saved) => {
        if (saved) {
          setActiveToastNotification({
            id: `toast_visit_sent_${clientRequest.id}`,
            title: 'Solicitação de visita enviada ✅',
            body: `Sua solicitação para ${clientRequest.date}${clientRequest.time ? ` às ${clientRequest.time}` : ''} foi enviada. Você será avisado quando a equipe confirmar.`,
            type: 'novo_servico',
            timestamp: new Date().toISOString(),
            read: true,
            audience: 'client',
            category: 'visita',
          });
          return;
        }
        const reason = getLastCloudWriteError() || 'Falha desconhecida.';
        console.warn('[Visitas] Solicitação mantida na fila de reenvio:', reason);
        window.alert(`Sua solicitação de visita ainda não chegou à equipe.\n\n${reason}\n\nEla ficou guardada neste aparelho e será reenviada automaticamente.`);
      });
      return;
    }
    const previousVisita = visitas.find((item) => item.id === visita.id);
    setVisitas((prev) => {
      const exists = prev.findIndex(v => v.id === visita.id);
      let updated: VisitaRecord[];
      if (exists >= 0) {
        updated = [...prev];
        updated[exists] = visita;
      } else {
        updated = [visita, ...prev];
      }
      saveVisitas(updated);
      return updated;
    });

    saveCloudVisita(visita).catch(() => {});

    const notifTitle = visita.notificationTitle?.trim()
      ? visita.notificationTitle.trim()
      : `Nova Visita: ${visita.clientName} 📋`;
    
    const notifBody = visita.notes?.trim()
      ? `${visita.notes.trim()}`
      : `Registro de visita para "${visita.clientName}" adicionado ao sistema.`;

    const statusLabel: Record<string, string> = {
      solicitada: 'solicitada', agendada: 'agendada', realizada: 'realizada', cancelada: 'cancelada',
    };
    addNotificationRecord({
      title: previousVisita && previousVisita.status !== visita.status
        ? `Visita ${statusLabel[visita.status] || visita.status}: ${visita.clientName} 📋`
        : notifTitle,
      body: previousVisita && previousVisita.status !== visita.status
        ? `Sua visita de ${visita.date}${visita.time ? ` às ${visita.time}` : ''} agora está ${statusLabel[visita.status] || visita.status}.${visita.notes?.trim() ? ` ${visita.notes.trim()}` : ''}`
        : notifBody,
      type: 'novo_servico',
      storeId: visita.storeId,
      category: visita.purpose === 'orcamento' && visita.estimatedBudgetProposal ? 'orcamento' : 'visita',
      visitaId: visita.id,
    });
  };

  const handleDeleteVisita = (id: string) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    setVisitas((prev) => {
      const updated = prev.filter(v => v.id !== id);
      saveVisitas(updated);
      return updated;
    });

    deleteCloudVisita(id).catch(() => {});
  };

  const handleEditStoreFromClientPage = (store: StoreProfile) => {
    setSelectedStoreId(store.id);
    setIsStoreModalOpen(true);
  };

  // --- Handlers: Notification Center & Monday Pix Reminder ---
  const handleMarkAllNotificationsAsRead = () => {
    if (isClient) return;
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      updated.forEach(n => saveCloudNotification(n).catch(() => {}));
      return updated;
    });
  };

  const handleClearAllNotifications = () => {
    if (isClient) return;
    notifications.forEach(n => deleteCloudNotification(n.id).catch(() => {}));
    setNotifications([]);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (notif.serviceId) {
      const target = services.find(s => s.id === notif.serviceId);
      if (target) {
        setSelectedServiceForPhoto(target);
      }
    }

    const updated = { ...notif, read: true };

    if (isClient) {
      if (user?.id && notif.storeId) {
        void markClientNotificationAsRead(user.id, notif);
      }
      setNotifications(prev => prev.map(n => n.id === notif.id ? updated : n));
      return;
    }

    saveCloudNotification(updated).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === notif.id ? updated : n));
  };

  const handleUpdatePixConfig = (newCfg: PixPaymentConfig) => {
    // Perfil do cliente é somente consulta: registros administrativos não podem ser alterados.
    if (user?.role !== 'admin') return;
    if (isClient) return;
    setPixConfig(newCfg);
    savePixPaymentConfig(newCfg);
  };

  // Lembretes automáticos de PIX e confirmação manual de backup foram desativados.
  // O backup diário às 04:00 continua ativo pelo agendador dedicado.

  // Aguarda o Firebase confirmar a identidade antes de renderizar qualquer área protegida.
  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">
        Verificando sessão segura...
      </div>
    );
  }

  // Reutiliza a tela de carregamento existente enquanto o acesso aguarda aprovação.
  if (accessApprovalStatus !== 'none' && !user) {
    const rejected = accessApprovalStatus === 'rejected';
    const checking = accessApprovalStatus === 'checking';
    const noStores = accessApprovalStatus === 'no_stores';

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 px-6">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          {!rejected && !noStores && (
            <div className="h-10 w-10 rounded-full border-4 border-emerald-700/20 border-t-emerald-700 animate-spin" />
          )}
          <h2 className="text-lg font-semibold text-slate-800">
            {rejected ? 'Solicitação não aprovada'
              : noStores ? 'Nenhum estabelecimento liberado'
              : checking ? 'Validando sua autorização' : 'Cadastro recebido'}
          </h2>
          <p>
            {rejected
              ? 'Sua solicitação foi rejeitada ou seu acesso foi suspenso. Entre em contato com o administrador.'
              : noStores
                ? 'Seu cadastro continua ativo, mas no momento não há nenhum estabelecimento liberado para a sua conta. Assim que o administrador vincular um estabelecimento, o acesso será aberto automaticamente.'
              : checking
                ? 'Estamos confirmando a aprovação e os estabelecimentos vinculados à sua conta. Seus dados permanecem protegidos durante essa verificação.'
                : 'Seu cadastro foi recebido e está aguardando a liberação do administrador. Assim que o acesso for aprovado, o sistema será aberto automaticamente.'}
          </p>
          {(rejected || noStores) && (
            <button
              type="button"
              onClick={() => { void executeGoogleLogout(); }}
              className="rounded-lg bg-emerald-800 px-5 py-2.5 font-medium text-white"
            >
              {rejected ? 'Voltar ao login' : 'Sair desta conta'}
            </button>
          )}
        </div>
      </div>
    );
  }
  // Somente o observador Firebase pode restaurar a sessão administrativa.
  if (!user) {
    return <AuthGate onLogin={(loggedInUser) => {
      const currentFirebaseUser = auth.currentUser;
    const sameVerifiedIdentity = Boolean(
      currentFirebaseUser && currentFirebaseUser.uid === loggedInUser.id &&
      currentFirebaseUser.email?.toLowerCase() === loggedInUser.email.toLowerCase() &&
      currentFirebaseUser.emailVerified === true
    );
    const validAdmin = loggedInUser.role === 'admin' && loggedInUser.status === 'active' &&
      currentFirebaseUser?.email?.toLowerCase() === 'empreiteirosaminesoficial@gmail.com';
    const validClient = loggedInUser.role === 'client' && loggedInUser.status === 'active' &&
      (loggedInUser.authorizedStoreIds || []).length > 0;
    if (sameVerifiedIdentity && validAdmin) {
      setUser(loggedInUser);
    } else if (sameVerifiedIdentity && validClient) {
      // Evita exibir uma sessão cliente vazia enquanto a carga filtrada por storeId termina.
      void fetchAuthorizedClientData(loggedInUser.authorizedStoreIds || []).then((clientData) => {
        if (auth.currentUser?.uid !== loggedInUser.id) return;
        setStores(clientData.stores);
        setServices(clientData.services);
        setObras(clientData.obras);
        setVisitas(clientData.visitas);
        setNotifications([]);
        setUser(loggedInUser);
      }).catch((error) => console.warn('[ClientData] Falha ao abrir portal autorizado:', error));
    }
    }} stores={stores} />;
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-full bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-700 selection:text-white safe-padding-bottom">
      {/* Google PWA Install Banner & Status */}
      <InstallBanner />
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogout={() => {
          logoutUser();
          void executeGoogleLogout().catch((error) => console.warn('[Auth] Falha ao encerrar sessão Firebase:', error));
          setUser(null);
        }}
        stores={visibleStores}
        selectedStoreId={selectedStoreId}
        onSelectStore={setSelectedStoreId}
        notifications={notifications}
        syncStatus={syncStatus}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onOpenAutoSync={() => setIsAutoSyncModalOpen(true)}
        onOpenNewService={handleOpenNewService}
        onOpenStoresModal={() => setIsStoreModalOpen(true)}
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onOpenGoogleAuth={() => setIsGoogleAuthModalOpen(true)}
        onOpenNotifications={() => setIsNotificationModalOpen(true)}
        onRequestPermission={handleRequestPermission}
        notificationPermission={notificationPermission}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-4 sm:space-y-5">
        
        {/* Navigation Tabs with Active Page Highlight Banner */}
        <AppNavigation
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          counts={{
            services: userServices.length,
            obras: userObras.length,
            visitas: userVisitas.length,
            stores: visibleStores.length,
            comprovantes: totalComprovantesCount,
          }}
          newCounts={navNewCounts}
          isClient={isClient}
        />

        {/* Client Portal Status Banner */}
        {isClient && (
          visibleStores.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl mt-0.5">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-sm">Nenhum estabelecimento ou CNPJ/CPF vinculado ainda</h3>
                  <p className="text-xs text-amber-700 mt-1 max-w-2xl leading-relaxed">
                    Para visualizar os relatórios, solicite ao gestor o vínculo do estabelecimento à sua conta Google ({user.email}). O acesso só é liberado após aprovação individual; informar CPF/CNPJ não concede autorização.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-emerald-900 shadow-2xs">
              <div className="flex items-center gap-2.5 font-medium flex-wrap">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>
                  Portal do Cliente: <strong>{user.name}</strong> ({user.email}) • Exibindo <strong>{visibleStores.length} loja(s)/obra(s)</strong> {user.clientDocument ? `[${formatDocument(user.clientDocument)}]` : ''}
                </span>
                <span className="bg-emerald-200/80 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  Sincronizado com o Administrador
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  onClick={() => setIsStoreModalOpen(true)}
                  className="text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer"
                >
                  + Cadastrar CNPJ/CPF
                </button>
                <span className="text-emerald-300">|</span>
                <button
                  onClick={() => setIsGoogleAuthModalOpen(true)}
                  className="text-emerald-700 hover:text-emerald-950 font-bold underline cursor-pointer"
                >
                  Alternar Perfil
                </button>
              </div>
            </div>
          )
        )}

        {/* ================= PAGE 1: DASHBOARD ================= */}
        {currentPage === 'dashboard' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Lembrete Automático no Dashboard: Notificação Visual Sutil para Serviços Pendentes > 30 dias */}
            <OverduePendingReminder
              overdueSummary={overduePendingSummary}
              onFilterPending={() => {
                setCurrentPage('servicos');
                handleFilterOverduePending();
              }}
              onOpenPaymentModal={isClient ? undefined : handleOpenPaymentModal}
              onViewPhotos={handleViewPhotos}
            />

            {/* Dashboard Financial Summary KPIs */}
            <DashboardKPIs
              summary={summary}
              isClient={isClient}
              selectedStoreName={activeStore?.nomeFantasia}
              selectedMonthName={monthFilter !== 'todos' ? monthFilter : undefined}
              overduePendingCount={overduePendingSummary.count}
              onFilterOverduePending={() => {
                setCurrentPage('servicos');
                handleFilterOverduePending();
              }}
            />

            {/* Analytics Charts: Monthly Evolution & Payment Status */}
            <AnalyticsCharts
              services={filteredServices}
              stores={visibleStores}
            />

            {/* Executive Quick Panels: Obras & Visitas Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Obras Preview Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
                        <HardHat className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">Obras & Canteiros Recentes</h3>
                        <p className="text-xs text-slate-500">Andamento das frentes de engenharia ativas</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('obras')}
                      className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver todas ({obras.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {obras.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma obra cadastrada ainda.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {obras.slice(0, 3).map((obra) => (
                        <div key={obra.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{obra.title}</h4>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                              obra.status === 'concluida' ? 'bg-emerald-100 text-emerald-800' :
                              obra.status === 'em_andamento' ? 'bg-sky-100 text-sky-800' :
                              obra.status === 'planejamento' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800'
                            }`}>
                              {obra.progressPercent}% concluída
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div
                              className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(100, Math.max(0, obra.progressPercent))}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center justify-between">
                            <span>{obra.storeName}</span>
                            <span>Prazo: {obra.targetEndDate}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage('obras')}
                  className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <HardHat className="w-4 h-4 text-amber-600" />
                  <span>Acessar Painel Completo de Obras</span>
                </button>
              </div>

              {/* Visitas Preview Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-700 flex items-center justify-center font-bold">
                        <CalendarClock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm">Próximas Visitas Técnicas</h3>
                        <p className="text-xs text-slate-500">Agendamentos de medição, vistorias e orçamentos</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentPage('visitas')}
                      className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ver todas ({visitas.length})</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {visitas.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma visita técnica agendada.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {visitas.slice(0, 3).map((visita) => (
                        <div key={visita.id} className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 truncate">{visita.clientName}</h4>
                            <p className="text-[11px] text-slate-500 truncate">{visita.address || 'Endereço a confirmar'}</p>
                            <span className="text-[10px] text-purple-700 font-semibold bg-purple-100/80 px-2 py-0.5 rounded-full inline-block mt-1">
                              {visita.purpose === 'orcamento' ? 'Orçamento' :
                               visita.purpose === 'vistoria_previa' ? 'Vistoria Prévia' :
                               visita.purpose === 'entrega_tecnica' ? 'Entrega Técnica' :
                               visita.purpose === 'emergencial' ? 'Emergencial' : 'Acompanhamento'}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-xs font-extrabold text-slate-800 block">{visita.date}</span>
                            <span className="text-[11px] text-slate-500 block">{visita.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage('visitas')}
                  className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CalendarClock className="w-4 h-4 text-purple-600" />
                  <span>Acessar Painel de Visitas & Agendamentos</span>
                </button>
              </div>
            </div>


            {/* Quick access to Serviços table */}
            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sky-950 text-sm">
                    Gestão Completa de Lançamentos & Serviços ({filteredServices.length})
                  </h4>
                  <p className="text-xs text-sky-700">
                    Acesse a tabela operacional com filtros por status, datas, abatimento de débitos e anexos fotográficos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('servicos')}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition cursor-pointer shadow-xs"
              >
                <span>Abrir Página de Serviços</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ================= PAGE 2: OBRAS ================= */}
        {currentPage === 'obras' && (
          <div className="animate-in fade-in duration-200">
            <ObrasPage
              obras={userObras}
              onSaveObra={handleSaveObra}
              onDeleteObra={handleDeleteObra}
              stores={visibleStores}
              user={user}
              onOpenStoreModal={() => setIsStoreModalOpen(true)}
            />
          </div>
        )}

        {/* ================= PAGE 3: SERVIÇOS ================= */}
        {currentPage === 'servicos' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Top Control Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-3 flex-wrap">
                {isClient && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 border border-sky-200 rounded-xl text-sky-950 text-xs font-bold shadow-2xs">
                    <ClipboardList className="w-4 h-4 text-sky-600" />
                    <span>Serviços Executados ({filteredServices.length})</span>
                  </div>
                )}

                {/* Botões para exibir em: Detalhes, Lista, Calendario (apenas ícones) */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setServiceViewMode('detalhes')}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                      serviceViewMode === 'detalhes'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title="Exibir em modo Detalhes (Cards com fotos e valores)"
                    aria-label="Exibir em modo Detalhes"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceViewMode('lista')}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                      serviceViewMode === 'lista'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title="Exibir em modo Lista (Tabela com colunas)"
                    aria-label="Exibir em modo Lista"
                  >
                    <List className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setServiceViewMode('calendario')}
                    className={`p-2 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                      serviceViewMode === 'calendario'
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                    title="Exibir em modo Calendário (Grade mensal com dias)"
                    aria-label="Exibir em modo Calendário"
                  >
                    <CalendarDays className="w-4 h-4" />
                  </button>
                </div>

                {/* Filtro por Status */}
                <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-2xs text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-slate-700 font-medium focus:outline-hidden cursor-pointer"
                  >
                    <option value="todos">Todos os Status</option>
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                    <option value="pendente_30d">⏳ Pendente (&gt; 30 dias)</option>
                    <option value="parcial">Parcial</option>
                    <option value="atrasado">Em Atraso</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>

                {statusFilter !== 'todos' && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('todos');
                    }}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition text-xs font-medium cursor-pointer"
                  >
                    Limpar
                  </button>
                )}


                {/* Botões de Ação Administrativa (Gestão) */}
                {!isClient && (
                  <>
                    {/* Atalho separado para consultar serviços totalmente quitados */}
                    <button
                      type="button"
                      id="btn-servicos-pagos"
                      onClick={() => setIsPaidServicesModalOpen(true)}
                      className="px-3.5 py-1.5 bg-sky-700 hover:bg-sky-800 active:bg-sky-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ml-auto"
                      title="Consultar somente serviços totalmente pagos"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Serviços Pagos</span>
                    </button>
                    {/* Botão de Novo serviço — página principal preservada */}
                    <button
                      type="button"
                      id="btn-servicos-cadastrar-novo"
                      onClick={() => handleOpenNewService()}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                      title="Novo serviço"
                    >
                      <PlusCircle className="w-4 h-4 text-white" />
                      <span>Novo serviço</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Overdue Pending Reminder */}
            <OverduePendingReminder
              overdueSummary={overduePendingSummary}
              onFilterPending={handleFilterOverduePending}
              onOpenPaymentModal={isClient ? undefined : handleOpenPaymentModal}
              onViewPhotos={handleViewPhotos}
            />

            {/* Main Services Table with Filters & Actions */}
            <div id="services-table-section">
              <ServicesTable
                services={filteredServices}
                stores={visibleStores}
                monthFilter={monthFilter}
                onMonthFilterChange={setMonthFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onViewPhotos={handleViewPhotos}
                onAddDebit={handleOpenDebitModal}
                onAddPayment={handleOpenPaymentModal}
                onEditService={handleEditService}
                onDeleteService={handleDeleteService}
                onStatusChange={handleStatusChange}
                onOpenNewService={handleOpenNewService}
                isClientReadOnly={isClient}
                viewMode={serviceViewMode}
                onViewModeChange={setServiceViewMode}
              />
            </div>
          </div>
        )}

        {/* ================= PAGE 4: VISITAS ================= */}
        {currentPage === 'visitas' && (
          <div className="animate-in fade-in duration-200">
            <VisitasPage
              visitas={userVisitas}
              onSaveVisita={handleSaveVisita}
              onDeleteVisita={handleDeleteVisita}
              stores={visibleStores}
              user={user}
            />
          </div>
        )}

        {/* ================= PAGE 5: CLIENTES (Apenas Gestão) ================= */}
        {currentPage === 'clientes' && !isClient && (
          <div className="animate-in fade-in duration-200">
            <ClientesPage
              stores={visibleStores}
              services={services}
              onOpenStoreModal={() => setIsStoreModalOpen(true)}
              onEditStore={handleEditStoreFromClientPage}
              onDeleteStore={handleDeleteStore}
              onAddServiceForStore={(st) => handleOpenNewService(st.id)}
              user={user}
            />
          </div>
        )}

        {/* ================= PAGE 6: COMPROVANTES ================= */}
        {currentPage === 'comprovantes' && (
          <div className="animate-in fade-in duration-200">
            <ComprovantesPage
              services={userServices}
              stores={visibleStores}
              onOpenPhotoModal={handleViewPhotos}
              onOpenGenerateReceipt={!isClient ? () => {
                setPreSelectedReceiptServiceId(undefined);
                setIsGenerateReceiptModalOpen(true);
              } : undefined}
            />
          </div>
        )}

        {/* ================= PAGE 7: CONHEÇA A EMPRESA ================= */}
        {currentPage === 'empresa' && (
          <div className="animate-in fade-in duration-200">
            <EmpresaPage
              pixConfig={pixConfig}
              onUpdatePixConfig={handleUpdatePixConfig}
              onOpenStoreModal={() => setIsStoreModalOpen(true)}
              onOpenPlayStoreModal={() => setIsPlayStoreApkModalOpen(true)}
              user={user}
            />
          </div>
        )}


      </main>

      {/* Botão flutuante: contato direto com o WhatsApp oficial, sem API */}
      <a
        href="https://wa.me/556131421406"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com Empreiteiro Saminês pelo WhatsApp"
        title="Fale conosco pelo WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-xl ring-4 ring-white/80 transition hover:scale-105 hover:bg-[#1ebe5d] focus:outline-none focus:ring-4 focus:ring-emerald-300"
      >
        <svg viewBox="0 0 32 32" className="h-8 w-8" fill="currentColor" aria-hidden="true">
          <path d="M16.02 3C8.85 3 3.02 8.78 3.02 15.9c0 2.28.61 4.5 1.77 6.44L3 29l6.85-1.78a13.1 13.1 0 0 0 6.17 1.55h.01c7.16 0 12.99-5.78 12.99-12.9A12.8 12.8 0 0 0 16.02 3Zm0 23.58h-.01a10.9 10.9 0 0 1-5.55-1.51l-.4-.24-4.07 1.06 1.09-3.94-.26-.41a10.65 10.65 0 0 1-1.66-5.64c0-5.97 4.88-10.82 10.87-10.82a10.8 10.8 0 0 1 10.83 10.82c0 5.97-4.87 10.68-10.84 10.68Zm5.96-8.1c-.33-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.74.16-.22.32-.85 1.06-1.04 1.28-.19.21-.38.24-.71.08-.33-.16-1.39-.51-2.65-1.62-.98-.86-1.64-1.92-1.83-2.25-.19-.32-.02-.5.14-.66.15-.14.33-.38.49-.57.16-.19.22-.32.33-.54.11-.21.06-.4-.03-.57-.08-.16-.74-1.77-1.01-2.43-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.4-.3.32-1.14 1.11-1.14 2.71s1.17 3.14 1.33 3.36c.16.21 2.3 3.49 5.58 4.89.78.34 1.39.55 1.86.7.78.25 1.49.22 2.05.13.63-.09 1.93-.78 2.2-1.54.27-.76.27-1.41.19-1.54-.08-.14-.3-.22-.63-.38Z"/>
        </svg>
      </a>

      {/* Footer / System status */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">Sistema Online & Sincronizado</span>
            <span className="text-slate-400">•</span>
            <span>Conta: {user.email}</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Empreiteiro Saminês • Suporte a PWA, Notificações Mobile & Exportação PDF/Excel
          </p>
        </div>
      </footer>

      {/* --- Modals Layer --- */}

      {/* 1. Add / Edit Service Modal */}
      <ServiceModal
        isOpen={isServiceModalOpen && !isClient}
        onClose={() => setIsServiceModalOpen(false)}
        onSave={handleSaveService}
        onDelete={handleDeleteService}
        serviceToEdit={serviceToEdit}
        stores={stores}
        initialStoreId={initialStoreIdForService}
        onOpenStoreModal={() => {
          setIsServiceModalOpen(false);
          setIsStoreModalOpen(true);
        }}
      />

      {/* 2. Quick Debit Addition Modal */}
      <QuickDebitModal
        isOpen={isDebitModalOpen && !isClient}
        onClose={() => setIsDebitModalOpen(false)}
        service={selectedServiceForDebit}
        onConfirm={handleConfirmDebit}
      />

      {/* 3. Quick Payment Liquidation Modal */}
      <QuickPaymentModal
        isOpen={isPaymentModalOpen && !isClient}
        onClose={() => setIsPaymentModalOpen(false)}
        service={selectedServiceForPayment}
        onConfirm={handleConfirmPayment}
      />

      {/* 4. Store Profiles & CNPJ Lookup Modal */}
      <StoreModal
        isOpen={isStoreModalOpen && !isClient}
        onClose={() => setIsStoreModalOpen(false)}
        stores={stores}
        services={services}
        onSaveStore={handleSaveStore}
        onDeleteStore={handleDeleteStore}
        onResetAllServices={handleResetAllServices}
        onSelectStoreToFilter={setSelectedStoreId}
        user={user}
      />

      {/* 5. Service Photo Gallery Modal */}
      <PhotoGalleryModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        service={selectedServiceForPhoto}
        onAddPhotos={handleAddPhotosToService}
        onDeletePhoto={handleDeletePhotoFromService}
        readOnly={isClient}
      />

      {/* 6. Export to PDF or Excel Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        services={userServices}
        stores={visibleStores}
      />

      {/* 6.1 Play Store & APK Generation Modal */}
      <PlayStoreApkModal
        isOpen={isPlayStoreApkModalOpen && !isClient}
        onClose={() => setIsPlayStoreApkModalOpen(false)}
      />

      {/* 7. Google Auth Profile Modal */}
      <GoogleAuthModal
        isOpen={isGoogleAuthModalOpen}
        onClose={() => setIsGoogleAuthModalOpen(false)}
        user={user}
        onUpdateUser={setUser}
        stores={stores}
        onUpdateStores={setStores}
        services={userServices}
        obras={userObras}
        visitas={userVisitas}
        onOpenStoreModal={() => setIsStoreModalOpen(true)}
        onPageChange={setCurrentPage}
        onLogout={() => {
          logoutUser();
          void executeGoogleLogout().catch((error) => console.warn('[Auth] Falha ao encerrar sessão Firebase:', error));
          setUser(null);
          setIsGoogleAuthModalOpen(false);
        }}
      />

      {/* 8. Mobile & Browser Notification Center Modal (apenas gestão/admin) */}
      {!isClient && (
        <NotificationCenterModal
          isOpen={isNotificationModalOpen && !isClient}
          onClose={() => setIsNotificationModalOpen(false)}
          notifications={notifications}
          onMarkAllAsRead={handleMarkAllNotificationsAsRead}
          onClearAll={handleClearAllNotifications}
          onNotificationClick={handleNotificationClick}
        />
      )}

      {/* 9. Automatic Data Synchronization & Cloud Backup Modal */}
      <AutoSyncModal
        isOpen={isAutoSyncModalOpen && !isClient}
        onClose={() => setIsAutoSyncModalOpen(false)}
        syncStatus={syncStatus}
        syncSettings={syncSettings}
        onUpdateSettings={handleUpdateSyncSettings}
        syncLogs={syncLogs}
        onClearLogs={handleClearSyncLogs}
        onTriggerSync={handleTriggerManualSync}
        services={services}
        stores={stores}
        user={user}
        onReloadData={handleReloadAllData}
      />

      {/* 10. Scheduled Firebase Backup & Cloud Redundancy Modal */}
      <FirebaseBackupScheduleModal
        isOpen={isFirebaseBackupModalOpen && !isClient}
        onClose={() => setIsFirebaseBackupModalOpen(false)}
        user={user}
        onReloadData={handleReloadAllData}
        initialTab={backupScheduleTab}
      />

      <PaidServicesModal
        isOpen={isPaidServicesModalOpen && !isClient}
        onClose={() => setIsPaidServicesModalOpen(false)}
        services={userServices.filter((service) =>
          service.paymentStatus === 'pago' &&
          (selectedStoreId === 'todas' || service.storeId === selectedStoreId)
        )}
      />

      {/* 11. Modal para Gerar Comprovante com Valor Recebido e Notificação ao Cliente */}
      <GenerateReceiptModal
        isOpen={isGenerateReceiptModalOpen && !isClient}
        onClose={() => {
          setIsGenerateReceiptModalOpen(false);
          setPreSelectedReceiptServiceId(undefined);
        }}
        services={services}
        stores={stores}
        currentUser={user}
        preSelectedServiceId={preSelectedReceiptServiceId}
        onReceiptGenerated={({ receipt, updatedService, notificationMessage }) => {
          // Atualiza o serviço no sistema
          setServices((prev) =>
            prev.map((s) => (s.id === updatedService.id ? updatedService : s))
          );
          saveServices(
            services.map((s) => (s.id === updatedService.id ? updatedService : s))
          );
          // Antes o serviço atualizado (valor pago/comprovante) ficava só no aparelho do ADM.
          saveCloudService(updatedService).then((saved) => {
            if (!saved) console.warn('[Comprovante] Serviço mantido na fila de reenvio:', getLastCloudWriteError());
          });

          // Gera notificação para o cliente cadastrado
          const targetStore = stores.find((st) => st.id === receipt.storeId);
          const clientNotif = createClientReceiptNotification({
            receipt,
            store: targetStore,
          });

          const targetedClientNotification: AppNotification = {
            ...clientNotif,
            storeId: receipt.storeId,
            serviceId: updatedService.id,
            audience: 'client',
            category: 'comprovante',
          };
          saveCloudNotification(targetedClientNotification).catch((error) => {
            console.warn('[Notifications] Falha ao enviar comprovante ao cliente:', error);
          });

          addSyncLog({
            timestamp: new Date().toISOString(),
            action: 'Comprovante Emitido & Notificado',
            itemCount: 1,
            status: 'success',
            details: `Comprovante #${receipt.receiptNumber} gerado para ${receipt.storeName} (${formatCurrency(receipt.amountReceived)}). Notificação enviada ao cliente cadastrado.`,
          });
        }}
      />


      {/* Pop-up na tela ("Pus-pus de tela") com barra de progresso, ícone temático e clique de ação */}
      <InAppNotificationToast
        notification={activeToastNotification}
        onDismiss={() => setActiveToastNotification(null)}
        onActionClick={(notif) => {
          handleNotificationClick(notif);
          setActiveToastNotification(null);
        }}
      />

    </div>
  );
}