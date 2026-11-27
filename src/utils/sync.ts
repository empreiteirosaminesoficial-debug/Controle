import { FullBackupData, ServiceRecord, StoreProfile, SyncLogEntry, SyncSettings, SyncStatus, UserProfile } from '../types';
import { loadNotifications, loadServices, loadStores, loadUser, saveNotifications, saveServices, saveStores, saveUser } from './storage';

const SYNC_SETTINGS_KEY = 'gestao_servicos_sync_settings_v1';
const SYNC_LOGS_KEY = 'gestao_servicos_sync_logs_v1';
const AUTO_BACKUP_KEY = 'gestao_servicos_auto_backup_v1';
const BROADCAST_CHANNEL_NAME = 'gestao_servicos_cross_tab_sync';

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  autoSyncEnabled: true,
  syncIntervalSeconds: 30,
  crossTabSyncEnabled: true,
  notifyOnSync: false,
  lastSyncedAt: new Date().toISOString(),
};

// Unique instance ID for this browser tab/session
export const TAB_SESSION_ID = `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;

// BroadcastChannel instance (with fallback check)
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (err) {
    console.warn('BroadcastChannel not supported or blocked:', err);
  }
}

/**
 * Loads sync settings from localStorage
 */
export function loadSyncSettings(): SyncSettings {
  try {
    const raw = localStorage.getItem(SYNC_SETTINGS_KEY);
    if (!raw) return DEFAULT_SYNC_SETTINGS;
    return { ...DEFAULT_SYNC_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SYNC_SETTINGS;
  }
}

/**
 * Saves sync settings to localStorage
 */
export function saveSyncSettings(settings: SyncSettings): void {
  try {
    localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Erro ao salvar configurações de sincronização:', err);
  }
}

/**
 * Loads recent sync activity logs
 */
export function loadSyncLogs(): SyncLogEntry[] {
  try {
    const raw = localStorage.getItem(SYNC_LOGS_KEY);
    if (!raw) {
      return [
        {
          id: 'log_init',
          timestamp: new Date().toISOString(),
          action: 'Inicialização do Motor de Sincronização',
          itemCount: 0,
          status: 'success',
          details: 'Sincronização automática em segundo plano ativada com sucesso.',
        },
      ];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Appends a log entry (keeps last 20 entries)
 */
export function addSyncLog(entry: Omit<SyncLogEntry, 'id'>): SyncLogEntry[] {
  try {
    const current = loadSyncLogs();
    const newEntry: SyncLogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    };
    const updated = [newEntry, ...current].slice(0, 25);
    localStorage.setItem(SYNC_LOGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

// Minimum interval between remote sync events (ms)
let lastRemoteSyncTime = 0;
let lastBackupTime = 0;
let broadcastThrottleTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Broadcasts a sync notification event to other tabs with throttling
 */
export function broadcastDataChange(reason: string = 'data_updated'): void {
  if (broadcastThrottleTimer) return;

  broadcastThrottleTimer = setTimeout(() => {
    broadcastThrottleTimer = null;
    const payload = {
      sourceTabId: TAB_SESSION_ID,
      timestamp: Date.now(),
      reason,
    };

    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(payload);
        return; // BroadcastChannel worked, no need for localStorage ping
      } catch (e) {
        console.warn('Falha ao enviar mensagem pelo BroadcastChannel:', e);
      }
    }

    // Only fallback to localStorage ping if BroadcastChannel unavailable
    try {
      localStorage.setItem('gestao_servicos_tab_ping', `${Date.now()}_${reason}`);
    } catch {}
  }, 200);
}

/**
 * Subscribes to cross-tab broadcast events safely without infinite loops
 */
export function subscribeCrossTabSync(callback: (reason: string) => void): () => void {
  const handleTrigger = (reason: string) => {
    const now = Date.now();
    // Debounce to prevent cascading updates
    if (now - lastRemoteSyncTime < 800) return;
    lastRemoteSyncTime = now;
    callback(reason);
  };

  const onBroadcast = (event: MessageEvent) => {
    if (event.data && event.data.sourceTabId && event.data.sourceTabId !== TAB_SESSION_ID) {
      handleTrigger(event.data.reason || 'cross_tab_sync');
    }
  };

  const onStorage = (event: StorageEvent) => {
    // Only respond to tab_ping from other windows
    if (event.key === 'gestao_servicos_tab_ping' && event.newValue) {
      handleTrigger('storage_ping_sync');
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', onBroadcast);
  }
  window.addEventListener('storage', onStorage);

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', onBroadcast);
    }
    window.removeEventListener('storage', onStorage);
  };
}

/**
 * Performs an automatic snapshot backup into localStorage (throttled and non-blocking)
 */
export function createAutoBackupSnapshot(services: ServiceRecord[], stores: StoreProfile[]): void {
  const now = Date.now();
  // Throttle backups: at most once every 60 seconds
  if (now - lastBackupTime < 60000) return;
  lastBackupTime = now;

  try {
    // Lighten snapshot by not duplicating heavy base64 strings if any
    const lightweightServices: ServiceRecord[] = services.map(s => ({
      ...s,
      photos: (s.photos || []).map(p => ({
        ...p,
        dataUrl: p.dataUrl && p.dataUrl.length > 200 ? '' : p.dataUrl,
      })),
    }));

    const snapshot: FullBackupData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      userEmail: 'empreiteirosaminesoficial@gmail.com',
      services: lightweightServices,
      stores,
      notifications: [],
      user: loadUser(),
    };

    localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Backup automático em segundo plano:', err);
  }
}

/**
 * Retrieves the latest auto-backup snapshot info
 */
export function getAutoBackupSnapshot(): FullBackupData | null {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Triggers a full JSON backup download to the user's computer/phone
 */
export function downloadBackupFile(services: ServiceRecord[], stores: StoreProfile[], user: UserProfile): void {
  const backup: FullBackupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    userEmail: user.email,
    services,
    stores,
    notifications: loadNotifications(),
    user,
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
  const downloadAnchor = document.createElement('a');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
  
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `backup_gestao_servicos_${dateStr}_${timeStr}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();

  addSyncLog({
    timestamp: new Date().toISOString(),
    action: 'Backup Manual Exportado',
    itemCount: services.length + stores.length,
    status: 'success',
    details: `Arquivo de backup JSON baixado contendo ${services.length} serviços e ${stores.length} lojas.`,
  });
}

/**
 * Restores all application data from an uploaded JSON backup file
 */
export function restoreBackupFile(jsonString: string): {
  success: boolean;
  servicesCount: number;
  storesCount: number;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString) as FullBackupData;
    
    if (!parsed || !Array.isArray(parsed.services) || !Array.isArray(parsed.stores)) {
      return {
        success: false,
        servicesCount: 0,
        storesCount: 0,
        error: 'Estrutura de arquivo JSON inválida. O arquivo precisa conter "services" e "stores".',
      };
    }

    // Save to persistent storage
    saveServices(parsed.services);
    saveStores(parsed.stores);
    if (parsed.notifications && Array.isArray(parsed.notifications)) {
      saveNotifications(parsed.notifications);
    }
    if (parsed.user && parsed.user.email) {
      saveUser(parsed.user);
    }

    // Broadcast change
    broadcastDataChange('backup_restored');

    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Restauração de Backup Concluída',
      itemCount: parsed.services.length + parsed.stores.length,
      status: 'success',
      details: `Restaurados ${parsed.services.length} serviços e ${parsed.stores.length} lojas com sucesso.`,
    });

    return {
      success: true,
      servicesCount: parsed.services.length,
      storesCount: parsed.stores.length,
    };
  } catch (err: any) {
    return {
      success: false,
      servicesCount: 0,
      storesCount: 0,
      error: err.message || 'Falha ao processar arquivo JSON.',
    };
  }
}
