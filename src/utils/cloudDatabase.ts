import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  getDocsFromServer,
  setDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy, 
  limit, 
  getDocFromServer,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  AuthSettings, 
  CloudBackupItem, 
  CloudDatabaseStatus, 
  ServiceRecord, 
  StoreProfile, 
  SyncSettings, 
  UserProfile,
  AppNotification,
  ObraRecord,
  VisitaRecord
} from '../types';
import {
  cleanForFirestore,
  markPendingUpsert,
  markPendingDelete,
  clearPendingUpsert,
  clearPendingDelete,
  getPendingWrites,
  mergeWithPendingWrites,
  isInitialUploadDone,
  setInitialUploadDone,
  describeFirestoreError,
  type OutboxCollection,
} from './cloudOutbox';
import { 
  loadAuthSettings, 
  loadServices, 
  loadStores, 
  loadUser, 
  saveAuthSettings, 
  saveServices, 
  saveStores, 
  saveUser, 
  loadAllUserProfiles, 
  saveAllUserProfiles,
  loadDeletedUserEmails,
  loadNotifications,
  saveNotifications,
  loadObras,
  saveObras,
  loadVisitas,
  saveVisitas
} from './storage';
import { addSyncLog, loadSyncSettings, saveSyncSettings } from './sync';

const SETTINGS_DOC_ID = 'app_config';
const SETTINGS_COLLECTION = 'settings';
const PUBLIC_ASSETS_COLLECTION = 'publicAssets';
const APP_BRANDING_DOC_ID = 'branding';
const BACKUPS_COLLECTION = 'backups';
const SERVICES_COLLECTION = 'services';
const STORES_COLLECTION = 'stores';
const PROFILES_COLLECTION = 'userProfiles';
const NOTIFICATIONS_COLLECTION = 'notifications';
const OBRAS_COLLECTION = 'obras';
const VISITAS_COLLECTION = 'visitas';

const OUTBOX_TO_FIRESTORE: Record<OutboxCollection, string> = {
  services: SERVICES_COLLECTION,
  obras: OBRAS_COLLECTION,
  visitas: VISITAS_COLLECTION,
};

/** Última falha de gravação, em linguagem simples, para exibir ao usuário. */
let lastCloudWriteError: string | null = null;
export function getLastCloudWriteError(): string | null {
  return lastCloudWriteError;
}

let flushInProgress: Promise<{ sent: number; failed: number }> | null = null;

/**
 * Reenvia ao Firestore todas as gravações/exclusões que ficaram na fila local.
 * Seguro para chamar várias vezes (execuções simultâneas são unificadas).
 */
export function flushCloudOutbox(
  collections: OutboxCollection[] = ['services', 'obras', 'visitas']
): Promise<{ sent: number; failed: number }> {
  if (flushInProgress) return flushInProgress;
  flushInProgress = (async () => {
    let sent = 0;
    let failed = 0;
    if (!auth.currentUser || (typeof navigator !== 'undefined' && !navigator.onLine)) {
      return { sent, failed };
    }
    for (const name of collections) {
      const collectionName = OUTBOX_TO_FIRESTORE[name];
      const pending = getPendingWrites(name);
      for (const record of pending.upserts) {
        if (!record?.id) continue;
        try {
          await setDoc(doc(db, collectionName, record.id), cleanForFirestore(record), { merge: true });
          clearPendingUpsert(name, record);
          sent++;
        } catch (err) {
          failed++;
          lastCloudWriteError = describeFirestoreError(err);
          console.warn(`[CloudOutbox] Reenvio pendente falhou (${name}/${record.id}):`, err);
        }
      }
      for (const id of pending.deletes) {
        try {
          await deleteDoc(doc(db, collectionName, id));
          clearPendingDelete(name, id);
          sent++;
        } catch (err) {
          failed++;
          lastCloudWriteError = describeFirestoreError(err);
          console.warn(`[CloudOutbox] Exclusão pendente falhou (${name}/${id}):`, err);
        }
      }
    }
    if (failed === 0 && sent > 0) lastCloudWriteError = null;
    return { sent, failed };
  })().finally(() => {
    flushInProgress = null;
  });
  return flushInProgress;
}

/**
 * Concilia uma coleção local (cache do ADM) com o Firestore.
 *
 * Regra: a nuvem é a fonte da verdade. Itens locais só são enviados quando
 * estão na fila de pendências — assim um serviço excluído em outro aparelho
 * não "ressuscita" ao abrir o app neste. Na primeira execução desta versão,
 * itens que existem só no cache local (por exemplo, serviços que nunca
 * subiram por causa do erro de campos `undefined`) entram na fila uma vez,
 * para que nada criado antes da correção seja perdido.
 */
async function reconcileCollection<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  name: OutboxCollection,
  localItems: T[]
): Promise<{ merged: T[]; uploaded: number; downloaded: number } | null> {
  const collectionName = OUTBOX_TO_FIRESTORE[name];
  const remoteSnap = await getDocs(collection(db, collectionName)).catch((err) => {
    console.warn(`[CloudDatabase] Não foi possível ler ${collectionName}; cache local mantido:`, err);
    return null;
  });
  if (!remoteSnap) return null;

  const remoteMap = new Map<string, T>();
  remoteSnap.forEach((d) => {
    const item = d.data() as T;
    if (item?.id) remoteMap.set(item.id, item);
  });

  if (!isInitialUploadDone(name)) {
    localItems.forEach((item) => {
      if (!item?.id) return;
      const remote = remoteMap.get(item.id);
      const localTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      const remoteTime = remote ? new Date(remote.updatedAt || remote.createdAt || 0).getTime() : 0;
      if (!remote || localTime > remoteTime) markPendingUpsert(name, item);
    });
  }

  const before = getPendingWrites(name);
  const result = await flushCloudOutbox([name]);
  if (!isInitialUploadDone(name) && result.failed === 0) setInitialUploadDone(name);

  // Reflete no mapa remoto o que acabou de ser confirmado.
  const stillPending = getPendingWrites(name);
  const stillPendingUpserts = new Set(stillPending.upserts.map((item: any) => item.id));
  const stillPendingDeletes = new Set(stillPending.deletes);
  before.upserts.forEach((item: any) => {
    if (item?.id && !stillPendingUpserts.has(item.id)) remoteMap.set(item.id, item);
  });
  before.deletes.forEach((id) => {
    if (!stillPendingDeletes.has(id)) remoteMap.delete(id);
  });

  const merged = mergeWithPendingWrites(name, [...remoteMap.values()]);
  const localById = new Map(localItems.map((item) => [item.id, item]));
  let downloaded = 0;
  merged.forEach((item) => {
    const local = localById.get(item.id);
    if (!local || (local.updatedAt || '') !== (item.updatedAt || '')) downloaded++;
  });
  const mergedIds = new Set(merged.map((item) => item.id));
  localItems.forEach((item) => {
    if (!mergedIds.has(item.id)) downloaded++;
  });

  return { merged, uploaded: result.sent, downloaded };
}

/**
 * Verifica o status da conexão em tempo real com o banco de dados Firebase Firestore
 */
export async function checkCloudDatabaseStatus(): Promise<CloudDatabaseStatus> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      connected: false,
      lastChecked: new Date().toISOString(),
      databaseId: '(default)',
      error: 'Dispositivo em modo offline (dados seguros em cache local)',
    };
  }

  try {
    // Testa conectividade com documento de verificação com timeout seguro
    const fetchCheck = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutCheck = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 3500)
    );
    // Uma falha no teste do servidor significa indisponibilidade real; não
    // podemos anunciar conexão ativa com base apenas no cache local.
    await Promise.race([fetchCheck, timeoutCheck]);

    // Busca contagem de backups existentes na nuvem
    let totalBackups = 0;
    let lastBackupAt: string | undefined;

    try {
      const backupsSnap = await getDocs(collection(db, BACKUPS_COLLECTION));
      totalBackups = backupsSnap.size;
      backupsSnap.forEach((d) => {
        const data = d.data();
        if (data.timestamp && (!lastBackupAt || data.timestamp > lastBackupAt)) {
          lastBackupAt = data.timestamp;
        }
      });
    } catch {
      // Não bloqueia caso ainda não haja coleção
    }

    return {
      connected: true,
      lastChecked: new Date().toISOString(),
      databaseId: '(default)',
      totalCloudBackups: totalBackups,
      lastBackupAt: lastBackupAt,
    };
  } catch (err: any) {
    console.warn('[CloudDatabase] Falha ao verificar status:', err?.message || err);
    return {
      connected: false,
      lastChecked: new Date().toISOString(),
      error: err?.message || 'Falha de comunicação com o Firestore',
    };
  }
}

/**
 * Salva as configurações atuais do aplicativo no Banco de Dados em Nuvem (Firestore)
 */
export async function saveCloudAppSettings(
  customSettings?: {
    syncSettings?: SyncSettings;
    authSettings?: AuthSettings;
    updatedBy?: string;
  }
): Promise<boolean> {
  try {
    const sync = customSettings?.syncSettings || loadSyncSettings();
    const auth = customSettings?.authSettings || loadAuthSettings();
    const currentUser = loadUser();

    const payload = {
      id: SETTINGS_DOC_ID,
      syncSettings: sync,
      authSettings: auth,
      updatedAt: new Date().toISOString(),
      updatedBy: customSettings?.updatedBy || currentUser?.email || 'empreiteirosaminesoficial@gmail.com',
    };

    await setDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID), payload, { merge: true });

    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Configurações Salvas na Nuvem',
      itemCount: 1,
      status: 'success',
      details: 'Configurações de sincronização e autenticação gravadas no Firestore com sucesso.',
    });

    return true;
  } catch (err: any) {
    console.error('[CloudDatabase] Erro ao salvar configurações no Firestore:', err);
    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Erro ao Salvar Configurações na Nuvem',
      itemCount: 0,
      status: 'error',
      details: err?.message || 'Falha ao gravar configurações no banco de dados.',
    });
    return false;
  }
}

/**
 * Carrega as configurações do aplicativo salvas no Banco de Dados em Nuvem
 */
export async function loadCloudAppSettings(): Promise<{
  syncSettings?: SyncSettings;
  authSettings?: AuthSettings;
  updatedAt?: string;
  updatedBy?: string;
} | null> {
  try {
    const docSnap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();

    if (data.syncSettings) {
      saveSyncSettings(data.syncSettings);
    }
    if (data.authSettings) {
      saveAuthSettings(data.authSettings);
    }

    return {
      syncSettings: data.syncSettings,
      authSettings: data.authSettings,
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    };
  } catch (err) {
    console.warn('[CloudDatabase] Configurações não encontradas ou erro de leitura:', err);
    return null;
  }
}

/**
 * Cria um Snapshot Completo de Backup de Dados no Firestore
 */
export async function createCloudBackup(notes?: string, userEmail?: string): Promise<CloudBackupItem | null> {
  try {
    const services = loadServices();
    const stores = loadStores();
    const profilesRecord = loadAllUserProfiles();
    const profiles = Object.values(profilesRecord);
    const currentUser = loadUser();

    const timestamp = new Date().toISOString();
    const dateFormatted = timestamp.replace(/[:.-]/g, '').substring(0, 15);
    const backupId = `backup_${dateFormatted}_${Math.random().toString(36).substring(2, 6)}`;

    // Remove imagens excessivamente pesadas apenas se excederem o tamanho seguro
    const sanitizedServices = services.map(s => {
      if (s.photos && s.photos.length > 5) {
        return { ...s, photos: s.photos.slice(0, 5) };
      }
      return s;
    });

    const backupData: CloudBackupItem = {
      id: backupId,
      timestamp,
      version: '2.0.0',
      createdBy: userEmail || currentUser?.email || 'empreiteirosaminesoficial@gmail.com',
      servicesCount: sanitizedServices.length,
      storesCount: stores.length,
      profilesCount: profiles.length,
      services: sanitizedServices,
      stores: stores,
      userProfiles: profiles,
      notes: notes || 'Backup em nuvem com preservação integral de dados',
    };

    // Grava o documento de backup no Firestore
    const docPayload = {
      id: backupData.id,
      timestamp: backupData.timestamp,
      version: backupData.version,
      createdBy: backupData.createdBy,
      servicesCount: backupData.servicesCount,
      storesCount: backupData.storesCount,
      profilesCount: backupData.profilesCount,
      notes: backupData.notes,
      services: JSON.stringify(backupData.services),
      stores: JSON.stringify(backupData.stores),
      userProfiles: JSON.stringify(backupData.userProfiles),
    };

    await setDoc(doc(db, BACKUPS_COLLECTION, backupId), docPayload);

    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Backup em Nuvem Criado',
      itemCount: services.length + stores.length + profiles.length,
      status: 'success',
      details: `Backup #${backupId} gravado no Firestore (${services.length} serviços, ${stores.length} lojas, ${profiles.length} usuários).`,
    });

    return backupData;
  } catch (err: any) {
    console.error('[CloudDatabase] Erro ao criar backup na nuvem:', err);
    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Falha na Criação de Backup em Nuvem',
      itemCount: 0,
      status: 'error',
      details: err?.message || 'Falha ao gravar backup no banco de dados Firestore.',
    });
    throw err;
  }
}

/**
 * Lista todos os backups armazenados no Banco de Dados em Nuvem
 */
export async function listCloudBackups(limitCount: number = 20): Promise<CloudBackupItem[]> {
  try {
    const backupsQuery = query(
      collection(db, BACKUPS_COLLECTION),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(backupsQuery).catch(async () => {
      // Fallback sem orderBy se índice ainda não criado
      return await getDocs(collection(db, BACKUPS_COLLECTION));
    });

    const backups: CloudBackupItem[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      let parsedServices: ServiceRecord[] = [];
      let parsedStores: StoreProfile[] = [];
      let parsedProfiles: UserProfile[] = [];

      try {
        parsedServices = typeof data.services === 'string' ? JSON.parse(data.services) : data.services || [];
      } catch {
        parsedServices = [];
      }

      try {
        parsedStores = typeof data.stores === 'string' ? JSON.parse(data.stores) : data.stores || [];
      } catch {
        parsedStores = [];
      }

      try {
        parsedProfiles = typeof data.userProfiles === 'string' ? JSON.parse(data.userProfiles) : data.userProfiles || [];
      } catch {
        parsedProfiles = [];
      }

      backups.push({
        id: data.id || docSnap.id,
        timestamp: data.timestamp || new Date().toISOString(),
        version: data.version || '1.0.0',
        createdBy: data.createdBy || 'Sistema',
        servicesCount: data.servicesCount || parsedServices.length,
        storesCount: data.storesCount || parsedStores.length,
        profilesCount: data.profilesCount || parsedProfiles.length,
        notes: data.notes,
        services: parsedServices,
        stores: parsedStores,
        userProfiles: parsedProfiles,
      });
    });

    // Ordenação garantida por timestamp decrescente
    backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return backups;
  } catch (err) {
    console.warn('[CloudDatabase] Falha ao listar backups:', err);
    return [];
  }
}

/**
 * Restaura o aplicativo a partir de um backup na nuvem
 */
export async function restoreCloudBackup(backup: CloudBackupItem): Promise<{
  success: boolean;
  servicesCount: number;
  storesCount: number;
  profilesCount: number;
}> {
  try {
    if (backup.services && Array.isArray(backup.services) && backup.services.length > 0) {
      saveServices(backup.services);
    }

    if (backup.stores && Array.isArray(backup.stores) && backup.stores.length > 0) {
      saveStores(backup.stores);
    }

    if (backup.userProfiles && Array.isArray(backup.userProfiles) && backup.userProfiles.length > 0) {
      const profilesToSave: Record<string, UserProfile> = {};
      backup.userProfiles.forEach(p => {
        if (p.email) profilesToSave[p.email.toLowerCase()] = p;
      });
      saveAllUserProfiles(profilesToSave);
    }

    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Restauração de Backup em Nuvem',
      itemCount: (backup.services?.length || 0) + (backup.stores?.length || 0),
      status: 'success',
      details: `Restauração concluída a partir do backup #${backup.id}.`,
    });

    return {
      success: true,
      servicesCount: backup.services?.length || 0,
      storesCount: backup.stores?.length || 0,
      profilesCount: backup.userProfiles?.length || 0,
    };
  } catch (err: any) {
    console.error('[CloudDatabase] Erro na restauração de backup:', err);
    throw err;
  }
}

/**
 * Exclui um backup armazenado na nuvem
 */
export async function deleteCloudBackup(backupId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, BACKUPS_COLLECTION, backupId));
    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Backup em Nuvem Excluído',
      itemCount: 1,
      status: 'success',
      details: `Backup #${backupId} removido da nuvem.`,
    });
    return true;
  } catch (err: any) {
    console.error('[CloudDatabase] Erro ao excluir backup da nuvem:', err);
    return false;
  }
}

/**
 * Sincronização Inteligente Bidirecional de Dados com o Firestore:
 * - Salva alterações locais no banco de dados em nuvem
 * - Puxa atualizações recentes que foram salvas na nuvem
 */
export async function syncWithCloudDatabase(): Promise<{
  success: boolean;
  uploadedCount: number;
  downloadedCount: number;
  error?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.email?.trim().toLowerCase() !== 'empreiteirosaminesoficial@gmail.com' || currentUser.emailVerified !== true) {
    return { success: false, uploadedCount: 0, downloadedCount: 0, error: 'Sincronização global permitida somente para o administrador Google verificado.' };
  }
  try {
    const localServices = loadServices();
    const localStores = loadStores();
    const localProfilesRecord = loadAllUserProfiles();
    const localProfiles = Object.values(localProfilesRecord);

    // 1. Sincroniza Configurações
    await saveCloudAppSettings();

    // 2. Busca e Mescla Serviços da Nuvem
    let uploadedCount = 0;
    let downloadedCount = 0;

    const servicesResult = await reconcileCollection<ServiceRecord>('services', localServices);
    if (servicesResult) {
      uploadedCount += servicesResult.uploaded;
      downloadedCount += servicesResult.downloaded;
      saveServices(servicesResult.merged);
    }

    // 3. Sincroniza Lojas / Clientes
    const remoteStoresSnap = await getDocs(collection(db, STORES_COLLECTION)).catch(() => null);
    const remoteStoresMap = new Map<string, StoreProfile>();

    if (remoteStoresSnap && !remoteStoresSnap.empty) {
      remoteStoresSnap.forEach((d) => {
        const s = d.data() as StoreProfile;
        if (s.id) remoteStoresMap.set(s.id, s);
      });
    }

    const mergedStores: StoreProfile[] = [...localStores];
    remoteStoresMap.forEach((remoteStore, id) => {
      const localIndex = mergedStores.findIndex((s) => s.id === id);
      if (localIndex === -1) {
        mergedStores.push(remoteStore);
        downloadedCount++;
      }
    });

    for (const store of localStores) {
      const remote = remoteStoresMap.get(store.id);
      if (!remote) {
        await setDoc(doc(db, STORES_COLLECTION, store.id), {
          ...store,
          updatedAt: store.updatedAt || new Date().toISOString(),
        }, { merge: true });
        uploadedCount++;
      }
    }

    if (downloadedCount > 0) {
      saveStores(mergedStores);
    }

    // 4. Sincroniza Perfis de Usuário
    const deletedEmailsList = loadDeletedUserEmails().map(e => e.toLowerCase());
    const remoteProfilesSnap = await getDocs(collection(db, PROFILES_COLLECTION)).catch(() => null);
    const remoteProfilesMap = new Map<string, UserProfile>();

    if (remoteProfilesSnap && !remoteProfilesSnap.empty) {
      for (const d of remoteProfilesSnap.docs) {
        const p = d.data() as UserProfile;
        const pEmail = (p.email || '').trim().toLowerCase();
        // Se o perfil remoto estiver na lista de excluídos pelo administrador, remove do Firestore
        if (pEmail && deletedEmailsList.includes(pEmail)) {
          await deleteDoc(d.ref).catch(() => {});
        } else if (pEmail) {
          remoteProfilesMap.set(pEmail, p);
        }
      }
    }

    const mergedProfiles = [...localProfiles].filter(p => !deletedEmailsList.includes(p.email.toLowerCase()));
    remoteProfilesMap.forEach((remoteProf, email) => {
      if (deletedEmailsList.includes(email)) return;
      const localIdx = mergedProfiles.findIndex(p => p.email.toLowerCase() === email);
      if (localIdx === -1) {
        mergedProfiles.push(remoteProf);
        downloadedCount++;
      } else {
        const localTime = new Date(mergedProfiles[localIdx].statusUpdatedAt || 0).getTime();
        const remoteTime = new Date(remoteProf.statusUpdatedAt || 0).getTime();
        if (remoteTime > localTime) {
          mergedProfiles[localIdx] = remoteProf;
        }
      }
    });

    for (const prof of localProfiles) {
      if (deletedEmailsList.includes(prof.email.toLowerCase())) continue;
      const safeDocId = prof.email.toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
      await setDoc(doc(db, PROFILES_COLLECTION, safeDocId), prof, { merge: true });
    }

    const profilesToSave: Record<string, UserProfile> = {};
    mergedProfiles.forEach((p) => {
      if (p.email && !deletedEmailsList.includes(p.email.toLowerCase())) {
        profilesToSave[p.email.toLowerCase()] = p;
      }
    });
    saveAllUserProfiles(profilesToSave);

    // 5. Sincroniza Notificações do Sistema
    const localNotifications = loadNotifications();
    const remoteNotifsSnap = await getDocs(collection(db, NOTIFICATIONS_COLLECTION)).catch(() => null);
    const remoteNotifsMap = new Map<string, AppNotification>();

    if (remoteNotifsSnap && !remoteNotifsSnap.empty) {
      remoteNotifsSnap.forEach((d) => {
        const notif = d.data() as AppNotification;
        if (notif.id) remoteNotifsMap.set(notif.id, notif);
      });
    }

    const mergedNotifs: AppNotification[] = [...localNotifications];
    remoteNotifsMap.forEach((remoteNotif, id) => {
      const localIdx = mergedNotifs.findIndex((n) => n.id === id);
      if (localIdx === -1) {
        mergedNotifs.push(remoteNotif);
        downloadedCount++;
      } else {
        if (remoteNotif.read && !mergedNotifs[localIdx].read) {
          mergedNotifs[localIdx] = remoteNotif;
        }
      }
    });

    for (const notif of localNotifications) {
      if (!remoteNotifsMap.has(notif.id)) {
        await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notif.id), notif, { merge: true }).catch(() => {});
        uploadedCount++;
      }
    }

    mergedNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    saveNotifications(mergedNotifs);

    // 6. Sincroniza Obras (nuvem como fonte da verdade + fila de pendências)
    const obrasResult = await reconcileCollection<ObraRecord>('obras', loadObras());
    if (obrasResult) {
      uploadedCount += obrasResult.uploaded;
      downloadedCount += obrasResult.downloaded;
      saveObras(obrasResult.merged);
    }

    // 7. Sincroniza Visitas Técnicas (inclui solicitações enviadas pelos clientes)
    const visitasResult = await reconcileCollection<VisitaRecord>('visitas', loadVisitas());
    if (visitasResult) {
      uploadedCount += visitasResult.uploaded;
      downloadedCount += visitasResult.downloaded;
      saveVisitas(visitasResult.merged);
    }

    // Atualiza o registro de sincronização
    const now = new Date().toISOString();
    const currentSyncSettings = loadSyncSettings();
    saveSyncSettings({
      ...currentSyncSettings,
      lastSyncedAt: now,
    });

    addSyncLog({
      timestamp: now,
      action: 'Sincronização com Banco de Dados Nuvem',
      itemCount: uploadedCount + downloadedCount,
      status: 'success',
      details: `Firestore sincronizado: ${uploadedCount} enviados para a nuvem, ${downloadedCount} baixados/atualizados.`,
    });

    return {
      success: true,
      uploadedCount,
      downloadedCount,
    };
  } catch (err: any) {
    console.error('[CloudDatabase] Erro durante a sincronização em nuvem:', err);
    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Erro na Sincronização em Nuvem',
      itemCount: 0,
      status: 'error',
      details: err?.message || 'Falha ao sincronizar dados com o Firestore.',
    });
    return {
      success: false,
      uploadedCount: 0,
      downloadedCount: 0,
      error: err?.message || 'Erro de comunicação',
    };
  }
}

/**
 * Remove um perfil de usuário do Firestore na nuvem imediatamente
 */
export async function deleteCloudUserProfile(email: string): Promise<boolean> {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail || normEmail === 'empreiteirosaminesoficial@gmail.com') return false;

  try {
    const safeDocId = normEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    await deleteDoc(doc(db, PROFILES_COLLECTION, safeDocId));
    return true;
  } catch (err) {
    console.warn('[CloudDatabase] Aviso: Não foi possível deletar documento remoto no Firestore:', err);
    return false;
  }
}

/**
 * Salva ou atualiza um perfil de usuário no Firestore na nuvem imediatamente
 */
export async function saveCloudUserProfile(profile: UserProfile): Promise<boolean> {
  const normEmail = (profile.email || '').trim().toLowerCase();
  if (!normEmail) return false;

  try {
    const safeDocId = normEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    await setDoc(doc(db, PROFILES_COLLECTION, safeDocId), profile, { merge: true });
    return true;
  } catch (err) {
    console.warn('[CloudDatabase] Aviso ao salvar perfil no Firestore:', err);
    return false;
  }
}

/**
 * Busca o perfil de um usuário específico diretamente do Firestore pelo e-mail
 */
export async function fetchCloudUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail) return null;
  try {
    const safeDocId = normEmail.replace(/[^a-zA-Z0-9_-]/g, '_');
    const docSnap = await getDoc(doc(db, PROFILES_COLLECTION, safeDocId));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao buscar perfil por email:', err);
    return null;
  }
}

/**
 * Listener em tempo real para Perfis de Usuário no Firestore
 */
export function listenCloudUserProfiles(callback: (profilesMap: Record<string, UserProfile>) => void): Unsubscribe {
  return onSnapshot(collection(db, PROFILES_COLLECTION), (snapshot) => {
    const profiles: Record<string, UserProfile> = {};
    const deletedList = loadDeletedUserEmails().map(e => e.toLowerCase());
    snapshot.forEach((d) => {
      const p = d.data() as UserProfile;
      const email = (p.email || '').trim().toLowerCase();
      if (email && !deletedList.includes(email)) {
        profiles[email] = p;
      }
    });
    callback(profiles);
  }, (error) => {
    console.warn('[CloudDatabase] Erro no listener de perfis:', error);
  });
}

/**
 * Salva ou atualiza um cadastro de loja/cliente no Firestore imediatamente
 */
export async function saveCloudStore(store: StoreProfile): Promise<boolean> {
  if (!store || !store.id) return false;
  try {
    await setDoc(doc(db, STORES_COLLECTION, store.id), {
      ...store,
      updatedAt: store.updatedAt || new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[CloudDatabase] Aviso ao salvar estabelecimento no Firestore:', err);
    return false;
  }
}

/**
 * Exclui uma loja/estabelecimento do Firestore imediatamente
 */
export async function deleteCloudStore(storeId: string): Promise<boolean> {
  if (!storeId) return false;
  try {
    await deleteDoc(doc(db, STORES_COLLECTION, storeId));
    return true;
  } catch (err) {
    console.warn('[CloudDatabase] Aviso ao excluir loja no Firestore:', err);
    return false;
  }
}

/**
 * Busca todas as lojas do Firestore
 */
export async function fetchCloudStores(): Promise<StoreProfile[]> {
  try {
    const snap = await getDocs(collection(db, STORES_COLLECTION));
    const stores: StoreProfile[] = [];
    snap.forEach((d) => {
      const s = d.data() as StoreProfile;
      if (s.id) stores.push(s);
    });
    return stores;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao buscar lojas do Firestore:', err);
    return [];
  }
}

/**
 * Listener em tempo real para Lojas/Clientes no Firestore
 */
export function listenCloudStores(callback: (stores: StoreProfile[]) => void): Unsubscribe {
  return onSnapshot(collection(db, STORES_COLLECTION), (snapshot) => {
    const stores: StoreProfile[] = [];
    snapshot.forEach((d) => {
      const s = d.data() as StoreProfile;
      if (s.id) stores.push(s);
    });
    callback(stores);
  }, (error) => {
    console.warn('[CloudDatabase] Erro no listener de lojas:', error);
  });
}

/**
 * Salva ou atualiza um serviço no Firestore imediatamente
 */
export async function saveCloudService(service: ServiceRecord): Promise<boolean> {
  if (!service || !service.id || !service.storeId) return false;
  const record = cleanForFirestore({
    ...service,
    updatedAt: service.updatedAt || new Date().toISOString(),
  }) as ServiceRecord;
  // Registra antes de enviar: se a página recarregar ou a rede cair, o envio é refeito.
  markPendingUpsert('services', record);
  try {
    await setDoc(doc(db, SERVICES_COLLECTION, record.id), record, { merge: true });
    clearPendingUpsert('services', record);
    lastCloudWriteError = null;
    return true;
  } catch (err) {
    lastCloudWriteError = describeFirestoreError(err);
    console.warn('[CloudDatabase] Falha ao salvar serviço no Firestore (mantido na fila de reenvio):', err);
    return false;
  }
}

/**
 * Exclui um serviço do Firestore
 */
export async function deleteCloudService(serviceId: string): Promise<boolean> {
  if (!serviceId) return false;
  markPendingDelete('services', serviceId);
  try {
    await deleteDoc(doc(db, SERVICES_COLLECTION, serviceId));
    clearPendingDelete('services', serviceId);
    lastCloudWriteError = null;
    return true;
  } catch (err) {
    lastCloudWriteError = describeFirestoreError(err);
    console.warn('[CloudDatabase] Falha ao excluir serviço no Firestore (mantido na fila de reenvio):', err);
    return false;
  }
}

/**
 * Busca todos os serviços do Firestore
 */
export async function fetchCloudServices(): Promise<ServiceRecord[]> {
  try {
    const snap = await getDocs(collection(db, SERVICES_COLLECTION));
    const services: ServiceRecord[] = [];
    snap.forEach((d) => {
      const s = d.data() as ServiceRecord;
      if (s.id) services.push(s);
    });
    return services;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao buscar serviços do Firestore:', err);
    return [];
  }
}

/**
 * Listener em tempo real para Serviços no Firestore
 */
export function listenCloudServices(callback: (services: ServiceRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, SERVICES_COLLECTION), (snapshot) => {
    const services: ServiceRecord[] = [];
    snapshot.forEach((d) => {
      const s = d.data() as ServiceRecord;
      if (s.id) services.push(s);
    });
    callback(services);
  }, (error) => {
    console.warn('[CloudDatabase] Erro no listener de serviços:', error);
  });
}

/**
 * Salva uma notificação no Firestore na nuvem imediatamente
 */
export async function saveCloudNotification(notification: AppNotification): Promise<boolean> {
  if (!notification || !notification.id) return false;
  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, notification.id), cleanForFirestore(notification), { merge: true });
    return true;
  } catch (err) {
    console.warn('[CloudDatabase] Aviso ao salvar notificação no Firestore:', err);
    return false;
  }
}

/**
 * Exclui uma notificação do Firestore
 */
export async function deleteCloudNotification(notificationId: string): Promise<boolean> {
  if (!notificationId) return false;
  try {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, notificationId));
    return true;
  } catch (err) {
    console.warn('[CloudDatabase] Aviso ao excluir notificação no Firestore:', err);
    return false;
  }
}

/**
 * Busca todas as notificações salvas no Firestore
 */
export async function fetchCloudNotifications(): Promise<AppNotification[]> {
  try {
    const snap = await getDocs(collection(db, NOTIFICATIONS_COLLECTION));
    const notifs: AppNotification[] = [];
    snap.forEach((d) => {
      const n = d.data() as AppNotification;
      if (n.id && n.audience !== 'client') notifs.push(n);
    });
    notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return notifs;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao buscar notificações do Firestore:', err);
    return [];
  }
}

/**
 * Listener em tempo real para Notificações no Firestore
 */
export function listenCloudNotifications(callback: (notifications: AppNotification[]) => void): Unsubscribe {
  return onSnapshot(collection(db, NOTIFICATIONS_COLLECTION), (snapshot) => {
    const notifs: AppNotification[] = [];
    snapshot.forEach((d) => {
      const n = d.data() as AppNotification;
      if (n.id && n.audience !== 'client') notifs.push(n);
    });
    notifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(notifs);
  }, (error) => {
    console.warn('[CloudDatabase] Erro no listener de notificações:', error);
  });
}

/**
 * Escuta serviços, obras e visitas dos estabelecimentos autorizados do cliente.
 */
export function listenAuthorizedClientData(
  storeIds: string[],
  callback: (data: { services: ServiceRecord[]; obras: ObraRecord[]; visitas: VisitaRecord[] }) => void
): Unsubscribe {
  const uniqueStoreIds = [...new Set(storeIds.filter((id) => typeof id === 'string' && id.trim()))];

  if (uniqueStoreIds.length === 0) {
    callback({ services: [], obras: [], visitas: [] });
    return () => {};
  }

  const servicesByStore = new Map<string, Map<string, ServiceRecord>>();
  const obrasByStore = new Map<string, Map<string, ObraRecord>>();
  const visitasByStore = new Map<string, Map<string, VisitaRecord>>();

  const emit = () => {
    callback({
      services: uniqueStoreIds.flatMap((id) => [...(servicesByStore.get(id)?.values() || [])]),
      obras: uniqueStoreIds.flatMap((id) => [...(obrasByStore.get(id)?.values() || [])]),
      visitas: uniqueStoreIds.flatMap((id) => [...(visitasByStore.get(id)?.values() || [])]),
    });
  };

  const unsubscribers: Unsubscribe[] = [];

  uniqueStoreIds.forEach((storeId) => {
    unsubscribers.push(
      onSnapshot(
        query(collection(db, SERVICES_COLLECTION), where('storeId', '==', storeId)),
        (snapshot) => {
          const current = new Map<string, ServiceRecord>();
          snapshot.forEach((d) => {
            const item = d.data() as ServiceRecord;
            if (item.id && item.storeId === storeId) current.set(item.id, item);
          });
          servicesByStore.set(storeId, current);
          emit();
        },
        (error) => {
          console.warn(`[CloudDatabase] Erro nos serviços autorizados (${storeId}):`, error);
        }
      ),
      onSnapshot(
        query(collection(db, OBRAS_COLLECTION), where('storeId', '==', storeId)),
        (snapshot) => {
          const current = new Map<string, ObraRecord>();
          snapshot.forEach((d) => {
            const item = d.data() as ObraRecord;
            if (item.id && item.storeId === storeId) current.set(item.id, item);
          });
          obrasByStore.set(storeId, current);
          emit();
        },
        (error) => {
          console.warn(`[CloudDatabase] Erro nas obras autorizadas (${storeId}):`, error);
        }
      ),
      onSnapshot(
        query(collection(db, VISITAS_COLLECTION), where('storeId', '==', storeId)),
        (snapshot) => {
          const current = new Map<string, VisitaRecord>();
          snapshot.forEach((d) => {
            const item = d.data() as VisitaRecord;
            if (item.id && item.storeId === storeId) current.set(item.id, item);
          });
          visitasByStore.set(storeId, current);
          emit();
        },
        (error) => {
          console.warn(`[CloudDatabase] Erro nas visitas autorizadas (${storeId}):`, error);
        }
      )
    );
  });

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}

/**
 * Registra a leitura individual de uma notificação pelo cliente.
 */
export async function markClientNotificationAsRead(
  uid: string,
  notification: AppNotification
): Promise<boolean> {
  if (!uid || !notification?.id || !notification.storeId || notification.audience !== 'client') {
    return false;
  }

  try {
    const readDocId = `${uid}__${notification.id}`;
    await setDoc(doc(db, 'notificationReads', readDocId), {
      uid,
      notificationId: notification.id,
      storeId: notification.storeId,
      read: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('[CloudDatabase] Erro ao registrar leitura individual:', error);
    return false;
  }
}

/**
 * Escuta notificações autorizadas e as leituras individuais do cliente.
 */
export function listenClientNotifications(
  uid: string,
  storeIds: string[],
  callback: (notifications: AppNotification[]) => void
): Unsubscribe {
  const uniqueStoreIds = [...new Set(storeIds.filter((id) => typeof id === 'string' && id.trim()))];

  if (!uid || uniqueStoreIds.length === 0) {
    callback([]);
    return () => {};
  }

  const notificationsByStore = new Map<string, Map<string, AppNotification>>();
  const readNotificationIds = new Set<string>();

  const emit = () => {
    const merged = uniqueStoreIds.flatMap((storeId) =>
      [...(notificationsByStore.get(storeId)?.values() || [])]
    ).map((notification) => ({
      ...notification,
      read: notification.read || readNotificationIds.has(notification.id),
    }));

    merged.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    callback(merged);
  };

  const unsubscribers: Unsubscribe[] = uniqueStoreIds.map((storeId) =>
    onSnapshot(
      query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('storeId', '==', storeId),
        where('audience', '==', 'client')
      ),
      (snapshot) => {
        const current = new Map<string, AppNotification>();
        snapshot.forEach((d) => {
          const notification = d.data() as AppNotification;
          if (notification.id && notification.storeId === storeId && notification.audience === 'client') {
            current.set(notification.id, notification);
          }
        });
        notificationsByStore.set(storeId, current);
        emit();
      },
      (error) => {
        console.warn(`[CloudDatabase] Erro nas notificações do estabelecimento ${storeId}:`, error);
      }
    )
  );

  unsubscribers.push(
    onSnapshot(
      query(collection(db, 'notificationReads'), where('uid', '==', uid)),
      (snapshot) => {
        readNotificationIds.clear();
        snapshot.forEach((d) => {
          const data = d.data();
          if (data.uid === uid && data.read === true && typeof data.notificationId === 'string') {
            readNotificationIds.add(data.notificationId);
          }
        });
        emit();
      },
      (error) => {
        console.warn('[CloudDatabase] Erro ao receber leituras individuais:', error);
      }
    )
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
export async function saveCloudObra(obra: ObraRecord): Promise<boolean> {
  if (!obra || !obra.id || !obra.storeId) return false;
  const record = cleanForFirestore({
    ...obra,
    updatedAt: obra.updatedAt || new Date().toISOString(),
  }) as ObraRecord;
  // Registra antes de enviar: se a página recarregar ou a rede cair, o envio é refeito.
  markPendingUpsert('obras', record);
  try {
    await setDoc(doc(db, OBRAS_COLLECTION, record.id), record, { merge: true });
    clearPendingUpsert('obras', record);
    lastCloudWriteError = null;
    return true;
  } catch (err) {
    lastCloudWriteError = describeFirestoreError(err);
    console.warn('[CloudDatabase] Falha ao salvar obra no Firestore (mantido na fila de reenvio):', err);
    return false;
  }
}

/**
 * Listener em tempo real para Obras no Firestore
 */
export function listenCloudObras(callback: (obras: ObraRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, OBRAS_COLLECTION), (snapshot) => {
    const obras: ObraRecord[] = [];
    snapshot.forEach((d) => {
      const o = d.data() as ObraRecord;
      if (o.id) obras.push(o);
    });
    callback(obras);
  }, (error) => {
    console.warn('[CloudDatabase] Erro no listener de obras:', error);
  });
}

/**
 * Salva uma Visita Técnica no Firestore
 */
export async function saveCloudVisita(visita: VisitaRecord): Promise<boolean> {
  if (!visita || !visita.id || !visita.storeId) return false;
  const record = cleanForFirestore({
    ...visita,
    updatedAt: visita.updatedAt || new Date().toISOString(),
  }) as VisitaRecord;
  // Registra antes de enviar: se a página recarregar ou a rede cair, o envio é refeito.
  markPendingUpsert('visitas', record);
  try {
    await setDoc(doc(db, VISITAS_COLLECTION, record.id), record, { merge: true });
    clearPendingUpsert('visitas', record);
    lastCloudWriteError = null;
    return true;
  } catch (err) {
    lastCloudWriteError = describeFirestoreError(err);
    console.warn('[CloudDatabase] Falha ao salvar visita no Firestore (mantido na fila de reenvio):', err);
    return false;
  }
}

/**
 * Listener em tempo real para Visitas Técnicas no Firestore
 */
export function listenCloudVisitas(callback: (visitas: VisitaRecord[]) => void): Unsubscribe {
  return onSnapshot(collection(db, VISITAS_COLLECTION), (snapshot) => {
    const visitas: VisitaRecord[] = [];
    snapshot.forEach((d) => {
      const v = d.data() as VisitaRecord;
      if (v.id) visitas.push(v);
    });
    callback(visitas);
  }, (error) => {
    console.warn('[CloudDatabase] Erro no listener de visitas:', error);
  });
}

/**
 * Remove uma Obra do Firestore
 */
export async function deleteCloudObra(obraId: string): Promise<boolean> {
  if (!obraId) return false;
  markPendingDelete('obras', obraId);
  try {
    await deleteDoc(doc(db, OBRAS_COLLECTION, obraId));
    clearPendingDelete('obras', obraId);
    lastCloudWriteError = null;
    return true;
  } catch (err) {
    lastCloudWriteError = describeFirestoreError(err);
    console.warn('[CloudDatabase] Falha ao excluir obra no Firestore (mantido na fila de reenvio):', err);
    return false;
  }
}

/**
 * Busca todas as Obras salvas no Firestore
 */
export async function fetchCloudObras(): Promise<ObraRecord[]> {
  try {
    const snap = await getDocs(collection(db, OBRAS_COLLECTION));
    const obras: ObraRecord[] = [];
    snap.forEach((d) => {
      const o = d.data() as ObraRecord;
      if (o.id) obras.push(o);
    });
    return obras;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao buscar obras do Firestore:', err);
    return [];
  }
}

/**
 * Remove uma Visita do Firestore
 */
export async function deleteCloudVisita(visitaId: string): Promise<boolean> {
  if (!visitaId) return false;
  markPendingDelete('visitas', visitaId);
  try {
    await deleteDoc(doc(db, VISITAS_COLLECTION, visitaId));
    clearPendingDelete('visitas', visitaId);
    lastCloudWriteError = null;
    return true;
  } catch (err) {
    lastCloudWriteError = describeFirestoreError(err);
    console.warn('[CloudDatabase] Falha ao excluir visita no Firestore (mantido na fila de reenvio):', err);
    return false;
  }
}

/**
 * Busca todas as Visitas salvas no Firestore
 */
export async function fetchCloudVisitas(): Promise<VisitaRecord[]> {
  try {
    const snap = await getDocs(collection(db, VISITAS_COLLECTION));
    const visitas: VisitaRecord[] = [];
    snap.forEach((d) => {
      const v = d.data() as VisitaRecord;
      if (v.id) visitas.push(v);
    });
    return visitas;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao buscar visitas do Firestore:', err);
    return [];
  }
}

/**
 * Busca todos os perfis de clientes salvos no Firestore
 */
export async function fetchCloudUserProfiles(): Promise<UserProfile[]> {
  try {
    const remoteProfilesSnap = await getDocs(collection(db, PROFILES_COLLECTION));
    if (!remoteProfilesSnap || remoteProfilesSnap.empty) return [];
    const profiles: UserProfile[] = [];
    const deletedList = loadDeletedUserEmails().map(e => e.toLowerCase());
    remoteProfilesSnap.forEach((d) => {
      const p = d.data() as UserProfile;
      const email = (p.email || '').trim().toLowerCase();
      if (email && !deletedList.includes(email)) {
        profiles.push(p);
      }
    });
    return profiles;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao buscar perfis remotos do Firestore:', err);
    return [];
  }
}

/**
 * Salva o logotipo do aplicativo no Firestore para sincronização em tempo real entre todas as contas e dispositivos
 */
export async function saveCloudAppLogo(logoDataUrl: string): Promise<boolean> {
  if (!logoDataUrl) return false;
  try {
    const payload = {
      customLogoUrl: logoDataUrl,
      logoUpdatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, PUBLIC_ASSETS_COLLECTION, APP_BRANDING_DOC_ID), payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao salvar logotipo na nuvem:', err);
    return false;
  }
}

/**
 * Busca o logotipo oficial do sistema gravado no Firestore
 */
export async function fetchCloudAppLogo(): Promise<string | null> {
  try {
    const publicSnap = await getDoc(doc(db, PUBLIC_ASSETS_COLLECTION, APP_BRANDING_DOC_ID));
    if (publicSnap.exists()) {
      const publicLogo = publicSnap.data()?.customLogoUrl;
      if (typeof publicLogo === 'string' && publicLogo) return publicLogo;
    }

    // Migração de compatibilidade: o logo antigo ficava em settings/app_config,
    // documento que clientes não podem ler. Somente o ADM consulta e migra esse documento legado.
    const currentUser = auth.currentUser;
    const isVerifiedAdmin = Boolean(
      currentUser?.emailVerified &&
      currentUser.email?.trim().toLowerCase() === 'empreiteirosaminesoficial@gmail.com'
    );
    if (!isVerifiedAdmin) return null;

    const legacySnap = await getDoc(doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID));
    const legacyLogo = legacySnap.exists() ? legacySnap.data()?.customLogoUrl : null;
    if (typeof legacyLogo === 'string' && legacyLogo) {
      await setDoc(doc(db, PUBLIC_ASSETS_COLLECTION, APP_BRANDING_DOC_ID), {
        customLogoUrl: legacyLogo,
        logoUpdatedAt: new Date().toISOString(),
      }, { merge: true });
      return legacyLogo;
    }
    return null;
  } catch (err) {
    console.warn('[CloudDatabase] Erro ao buscar logotipo na nuvem:', err);
    return null;
  }
}

/**
 * Ouvinte em tempo real para sincronizar o logotipo entre todos os navegadores, celulares e contas conectadas
 */
export function listenCloudAppLogo(callback: (logoUrl: string | null) => void): Unsubscribe {
  return onSnapshot(doc(db, PUBLIC_ASSETS_COLLECTION, APP_BRANDING_DOC_ID), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      callback(data?.customLogoUrl || null);
    } else {
      callback(null);
    }
  }, (err) => {
    console.warn('[CloudDatabase] Erro no ouvinte de logotipo da nuvem:', err);
  });
}

/** Carrega somente os documentos dos estabelecimentos explicitamente aprovados para o UID atual. */
export async function fetchAuthorizedClientData(storeIds: string[]): Promise<{
  stores: StoreProfile[];
  services: ServiceRecord[];
  obras: ObraRecord[];
  visitas: VisitaRecord[];
}> {
  const ids = Array.from(new Set(storeIds.filter((id) => typeof id === 'string' && id.length > 0)));
  if (!auth.currentUser || ids.length === 0) return { stores: [], services: [], obras: [], visitas: [] };

  // Leituras de autorização precisam vir do servidor; cache local nunca concede acesso.
  const storeResults = await Promise.all(ids.map(async (storeId) => {
    const snap = await getDocFromServer(doc(db, STORES_COLLECTION, storeId));
    return snap.exists() ? ({ ...snap.data(), id: snap.id } as StoreProfile) : null;
  }));
  const authorizedStores = storeResults.filter((store): store is StoreProfile => Boolean(store));
  const validIds = new Set(authorizedStores.map((store) => store.id));

  const loadByStore = async <T,>(collectionName: string): Promise<T[]> => {
    const groups = await Promise.all(Array.from(validIds).map(async (storeId) => {
      const result = await getDocsFromServer(query(collection(db, collectionName), where('storeId', '==', storeId)));
      return result.docs.map((item) => ({ ...item.data(), id: item.id } as T));
    }));
    return groups.flat();
  };

  const [services, obras, visitas] = await Promise.all([
    loadByStore<ServiceRecord>(SERVICES_COLLECTION),
    loadByStore<ObraRecord>(OBRAS_COLLECTION),
    loadByStore<VisitaRecord>(VISITAS_COLLECTION),
  ]);
  return { stores: authorizedStores, services, obras, visitas };
}

/** Observa o pedido, os vínculos e os estabelecimentos do cliente para revogar/atualizar a sessão em tempo real.
 * Reconciliamos os ouvintes quando a lista aprovada muda, incluindo estabelecimentos adicionados após o login.
 * Qualquer remoção, bloqueio ou erro de leitura falha de forma segura e invalida a sessão de dados do cliente.
 */
export function listenClientAccessChanges(
  uid: string,
  initialStoreIds: string[],
  onAccessChange: (latestStoreIds: string[]) => void
): Unsubscribe {
  const requestRef = doc(db, 'accessRequests', uid);
  const membershipUnsubscribers = new Map<string, Unsubscribe>();
  let latestStoreIds = Array.from(
    new Set(initialStoreIds.filter((id) => typeof id === 'string' && id.length > 0))
  ).sort();
  let stopped = false;

  const publishIds = (ids: string[]) => {
    if (!stopped) onAccessChange([...ids]);
  };

  const removeOnlyThisStore = (storeId: string) => {
    if (stopped || !latestStoreIds.includes(storeId)) return;
    latestStoreIds = latestStoreIds.filter((id) => id !== storeId);
    const unsubscribe = membershipUnsubscribers.get(storeId);
    if (unsubscribe) {
      unsubscribe();
      membershipUnsubscribers.delete(storeId);
    }
    publishIds(latestStoreIds);
  };

  const reconcileMembershipListeners = (ids: string[]) => {
    const nextIds = new Set(ids);

    for (const [storeId, unsubscribe] of membershipUnsubscribers) {
      if (!nextIds.has(storeId)) {
        unsubscribe();
        membershipUnsubscribers.delete(storeId);
      }
    }

    for (const storeId of nextIds) {
      if (membershipUnsubscribers.has(storeId)) continue;

      const memberRef = doc(db, STORES_COLLECTION, storeId, 'members', uid);
      const storeRef = doc(db, STORES_COLLECTION, storeId);
      let memberConfirmed = false;
      let storeConfirmed = false;
      let memberValid = false;
      let storeValid = false;

      const reconcileThisStore = () => {
        if (memberConfirmed && !memberValid) {
          removeOnlyThisStore(storeId);
          return;
        }
        if (storeConfirmed && !storeValid) {
          removeOnlyThisStore(storeId);
        }
      };

      const unsubscribeMember = onSnapshot(
        memberRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            memberConfirmed = true;
            memberValid = false;
            reconcileThisStore();
            return;
          }

          const member = snapshot.data();
          memberConfirmed = true;
          memberValid =
            member.status === 'active' &&
            member.uid === uid &&
            member.storeId === storeId;

          reconcileThisStore();
        },
        (error) => {
          console.warn(`[ClientAccess] Falha temporária ao verificar vínculo ${storeId}:`, error);
          // Erro de leitura não prova que o administrador revogou o vínculo.
        }
      );

      const unsubscribeStore = onSnapshot(
        storeRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            storeConfirmed = true;
            storeValid = false;
            reconcileThisStore();
            return;
          }

          const store = snapshot.data();
          storeConfirmed = true;
          storeValid = store.status === undefined || store.status === 'active';

          reconcileThisStore();
        },
        (error) => {
          console.warn(`[ClientAccess] Falha temporária ao verificar estabelecimento ${storeId}:`, error);
          // Preserva os outros vínculos em caso de erro temporário.
        }
      );

      membershipUnsubscribers.set(storeId, () => {
        unsubscribeMember();
        unsubscribeStore();
      });
    }
  };

  reconcileMembershipListeners(latestStoreIds);

  const unsubscribeRequest = onSnapshot(
    requestRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        latestStoreIds = [];
        reconcileMembershipListeners([]);
        publishIds([]);
        return;
      }

      const data = snapshot.data();
      const nextIds =
        data.status === 'approved' && Array.isArray(data.storeIds)
          ? Array.from(
              new Set(
                data.storeIds.filter(
                  (value: unknown): value is string =>
                    typeof value === 'string' && value.length > 0
                )
              )
            ).sort()
          : [];

      if (data.status !== 'approved' || nextIds.length === 0) {
        latestStoreIds = [];
        reconcileMembershipListeners([]);
        publishIds([]);
        return;
      }

      const changed = nextIds.join('|') !== latestStoreIds.join('|');
      latestStoreIds = nextIds;
      reconcileMembershipListeners(nextIds);

      if (changed) publishIds(nextIds);
    },
    (error) => {
      console.warn('[ClientAccess] Falha temporária ao observar solicitação:', error);
      // Não revoga a sessão por erro de rede ou permissão.
    }
  );

  return () => {
    stopped = true;
    unsubscribeRequest();
    membershipUnsubscribers.forEach((unsubscribe) => unsubscribe());
    membershipUnsubscribers.clear();
  };
}

// Observa exclusivamente a solicitação de acesso do próprio usuário.
export function listenClientApprovalStatus(
  uid: string,
  callback: (status: 'pending' | 'approved' | 'rejected' | 'missing' | 'error') => void
): Unsubscribe {
  const requestRef = doc(db, 'accessRequests', uid);

  return onSnapshot(
    requestRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback('missing');
        return;
      }

      const status = snapshot.data().status;
      if (status === 'pending' || status === 'approved' || status === 'rejected') {
        callback(status);
      } else {
        callback('missing');
      }
    },
    (error) => {
      console.warn('[ClientApproval] Falha ao observar solicitação:', error);
      callback('error');
    }
  );
}
