/**
 * Sistema Inteligente de Agendamento de Backups no Firebase Firestore
 * Garante redundância de dados, cópias temporais e segurança contínua para o administrador
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CloudBackupItem, ScheduledBackupConfig } from '../types';
import { createCloudBackup, deleteCloudBackup, listCloudBackups } from './cloudDatabase';
import { addSyncLog } from './sync';

const BACKUP_SCHEDULE_STORAGE_KEY = 'gestao_firebase_scheduled_backup_v1';
const SCHEDULE_SETTINGS_DOC = 'backup_schedule';
const SETTINGS_COLLECTION = 'settings';

export const DEFAULT_SCHEDULED_BACKUP_CONFIG: ScheduledBackupConfig = {
  enabled: true,
  times: ['04:00'],
  frequency: 'daily',
  customDays: [0, 1, 2, 3, 4, 5, 6], // Todos os dias da semana
  intervalHours: 6,
  maxRetentionCount: 15, // Mantém até 15 snapshots no Firebase para redundância
  notifyOnSuccess: false,
  lastExecutedAt: null,
  lastExecutedSlot: null,
  lastStatus: 'idle',
  googleDriveEnabled: true,
  googleDriveScheduledTime: '04:00',
  lastGoogleDriveBackupAt: null,
  lastGoogleDriveFileLink: null,
};

/**
 * Carrega a configuração de agendamento de backups salva localmente
 */
export function loadScheduledBackupConfig(): ScheduledBackupConfig {
  if (typeof window === 'undefined') return { ...DEFAULT_SCHEDULED_BACKUP_CONFIG };
  try {
    const raw = localStorage.getItem(BACKUP_SCHEDULE_STORAGE_KEY);
    if (!raw) {
      saveScheduledBackupConfig(DEFAULT_SCHEDULED_BACKUP_CONFIG);
      return { ...DEFAULT_SCHEDULED_BACKUP_CONFIG };
    }
    const parsed = JSON.parse(raw);
    // Política atual: backup diário único às 04:00.
    const timesWith4AM = ['04:00'];

    return {
      ...DEFAULT_SCHEDULED_BACKUP_CONFIG,
      ...parsed,
      times: timesWith4AM,
      notifyOnSuccess: false,
      googleDriveEnabled: parsed.googleDriveEnabled !== undefined ? parsed.googleDriveEnabled : true,
      googleDriveScheduledTime: parsed.googleDriveScheduledTime || '04:00',
    };
  } catch {
    return { ...DEFAULT_SCHEDULED_BACKUP_CONFIG };
  }
}

/**
 * Salva a configuração de agendamento localmente e agenda sincronização na nuvem
 */
export function saveScheduledBackupConfig(config: ScheduledBackupConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BACKUP_SCHEDULE_STORAGE_KEY, JSON.stringify(config));
    // Sincroniza em segundo plano com o Firestore para persistência global
    syncScheduleConfigToFirestore(config).catch((err) => {
      console.warn('[BackupScheduler] Aviso ao persistir agendamento no Firestore:', err);
    });
  } catch (err) {
    console.error('[BackupScheduler] Falha ao salvar configuração local:', err);
  }
}

/**
 * Persiste a configuração do agendador no documento settings/backup_schedule no Firestore
 */
export async function syncScheduleConfigToFirestore(config: ScheduledBackupConfig): Promise<boolean> {
  try {
    await setDoc(doc(db, SETTINGS_COLLECTION, SCHEDULE_SETTINGS_DOC), {
      ...config,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[BackupScheduler] Falha ao sincronizar agenda com Firestore:', err);
    return false;
  }
}

/**
 * Carrega a configuração do Firestore (se existir)
 */
export async function fetchScheduleConfigFromFirestore(): Promise<ScheduledBackupConfig | null> {
  try {
    const docSnap = await getDoc(doc(db, SETTINGS_COLLECTION, SCHEDULE_SETTINGS_DOC));
    if (docSnap.exists()) {
      const data = docSnap.data() as ScheduledBackupConfig;
      if (data && Array.isArray(data.times)) {
        saveScheduledBackupConfig(data);
        return data;
      }
    }
    return null;
  } catch (err) {
    console.warn('[BackupScheduler] Falha ao carregar agenda do Firestore:', err);
    return null;
  }
}

/**
 * Verifica se um dia específico da semana é permitido de acordo com a frequência
 */
function isDayAllowed(dayOfWeek: number, frequency: ScheduledBackupConfig['frequency'], customDays: number[]): boolean {
  if (frequency === 'daily') return true;
  if (frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (frequency === 'custom_days') return customDays.includes(dayOfWeek);
  return true;
}

/**
 * Calcula a data e o horário do próximo backup agendado
 */
export function calculateNextScheduledRun(
  config: ScheduledBackupConfig,
  referenceDate: Date = new Date()
): { nextDate: Date; timeStr: string; slotKey: string } | null {
  if (!config.enabled || !config.times || config.times.length === 0) {
    return null;
  }

  // Ordena horários em ordem cronológica
  const sortedTimes = [...config.times].sort();
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();
  const currentDate = referenceDate.getDate();

  // Verifica horários restantes para os próximos 8 dias
  for (let dayOffset = 0; dayOffset < 8; dayOffset++) {
    const checkDate = new Date(currentYear, currentMonth, currentDate + dayOffset);
    const dayOfWeek = checkDate.getDay();

    if (!isDayAllowed(dayOfWeek, config.frequency, config.customDays)) {
      continue;
    }

    for (const timeStr of sortedTimes) {
      const [h, m] = timeStr.split(':').map(Number);
      const scheduledCandidate = new Date(
        checkDate.getFullYear(),
        checkDate.getMonth(),
        checkDate.getDate(),
        h,
        m,
        0,
        0
      );

      // Se for no futuro (ou pelo menos 10 segundos no futuro)
      if (scheduledCandidate.getTime() > referenceDate.getTime() + 10000) {
        const dateKey = `${scheduledCandidate.getFullYear()}-${String(scheduledCandidate.getMonth() + 1).padStart(2, '0')}-${String(scheduledCandidate.getDate()).padStart(2, '0')}`;
        const slotKey = `${dateKey}_${timeStr}`;
        return {
          nextDate: scheduledCandidate,
          timeStr,
          slotKey,
        };
      }
    }
  }

  return null;
}

/**
 * Verifica se o momento atual coincide com algum horário agendado que ainda não foi executado
 */
export function checkShouldRunScheduledBackup(
  config: ScheduledBackupConfig,
  now: Date = new Date()
): { shouldRun: boolean; slotKey: string; timeStr: string } {
  if (!config.enabled || !config.times || config.times.length === 0) {
    return { shouldRun: false, slotKey: '', timeStr: '' };
  }

  const dayOfWeek = now.getDay();
  if (!isDayAllowed(dayOfWeek, config.frequency, config.customDays)) {
    return { shouldRun: false, slotKey: '', timeStr: '' };
  }

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentMinutesOfDay = currentHour * 60 + currentMinute;

  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  for (const timeStr of config.times) {
    const [h, m] = timeStr.split(':').map(Number);
    const scheduledMinutesOfDay = h * 60 + m;

    // Recuperação automática: um app web não consegue "acordar" às 04:00 se
    // estiver fechado. Antes, o backup só rodava se o app estivesse aberto entre
    // 04:00 e 04:02 — na prática quase nunca. Agora, se o horário de hoje já
    // passou e o backup do dia ainda não foi feito, ele roda na próxima vez que o
    // app estiver aberto (uma única vez por horário por dia).
    const diff = currentMinutesOfDay - scheduledMinutesOfDay;
    if (diff >= 0) {
      const slotKey = `${dateKey}_${timeStr}`;
      // Se este slot específico ainda não foi executado
      if (config.lastExecutedSlot !== slotKey) {
        return {
          shouldRun: true,
          slotKey,
          timeStr,
        };
      }
    }
  }

  return { shouldRun: false, slotKey: '', timeStr: '' };
}

/**
 * Executa o backup no Firebase e aplica a política de retenção e redundância
 */
export async function executeScheduledFirebaseBackup(
  triggerType: 'scheduled' | 'manual',
  slotInfo?: { slotKey?: string; timeStr?: string },
  adminEmail: string = 'empreiteirosaminesoficial@gmail.com'
): Promise<{
  success: boolean;
  backup?: CloudBackupItem;
  deletedOldBackupsCount: number;
  error?: string;
}> {
  const currentConfig = loadScheduledBackupConfig();
  
  // Atualiza status para 'running'
  saveScheduledBackupConfig({
    ...currentConfig,
    lastStatus: 'running',
  });

  try {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const noteText = triggerType === 'scheduled'
      ? `Backup Automático Agendado no Firebase (${slotInfo?.timeStr || formattedTime}) - Redundância Ativa`
      : `Backup Manual Realizado pelo Administrador (${adminEmail}) - Firebase Firestore`;

    // 1. Cria o Backup no Firebase Firestore
    const backupResult = await createCloudBackup(noteText, adminEmail);
    if (!backupResult) {
      throw new Error('Falha ao instanciar snapshot do backup no Firebase');
    }

    // 2. Aplica a Política de Retenção e Redundância
    let deletedCount = 0;
    if (currentConfig.maxRetentionCount > 0) {
      try {
        const allBackups = await listCloudBackups(50);
        if (allBackups.length > currentConfig.maxRetentionCount) {
          // Remove os backups mais antigos excedentes
          const excessBackups = allBackups.slice(currentConfig.maxRetentionCount);
          for (const oldBackup of excessBackups) {
            await deleteCloudBackup(oldBackup.id);
            deletedCount++;
          }
          if (deletedCount > 0) {
            addSyncLog({
              timestamp: new Date().toISOString(),
              action: 'Política de Redundância Aplicada',
              itemCount: deletedCount,
              status: 'success',
              details: `Removidos ${deletedCount} backups antigos do Firebase para manter a cota de redundância em ${currentConfig.maxRetentionCount} snapshots.`,
            });
          }
        }
      } catch (retentionErr) {
        console.warn('[BackupScheduler] Aviso ao aplicar retenção de backups:', retentionErr);
      }
    }

    // 3. Sincroniza com Google Drive se habilitado (especialmente às 04:00 da manhã)
    if (currentConfig.googleDriveEnabled) {
      try {
        const { loadServices, loadStores, loadObras, loadVisitas } = await import('./storage');
        const { uploadClientBackupToDrive } = await import('./googleDriveBackup');
        await uploadClientBackupToDrive({
          services: loadServices(),
          stores: loadStores(),
          obras: loadObras(),
          visitas: loadVisitas(),
          isAutoScheduled: slotInfo?.timeStr === '04:00' || formattedTime === '04:00',
          customNote: `Backup automático das 04:00 AM no Google Drive`,
        });
      } catch (driveErr) {
        console.warn('[BackupScheduler] Aviso ao sincronizar cópia no Google Drive:', driveErr);
      }
    }

    // 4. Atualiza configuração com novo horário de execução e próximo slot
    const nextRun = calculateNextScheduledRun(currentConfig, now);
    const updatedConfig: ScheduledBackupConfig = {
      ...currentConfig,
      lastExecutedAt: now.toISOString(),
      lastExecutedSlot: slotInfo?.slotKey || `${now.toISOString().split('T')[0]}_${formattedTime}`,
      lastStatus: 'success',
      lastError: undefined,
      nextScheduledAt: nextRun ? nextRun.nextDate.toISOString() : null,
    };
    saveScheduledBackupConfig(updatedConfig);

    addSyncLog({
      timestamp: now.toISOString(),
      action: triggerType === 'scheduled' ? 'Backup Agendado no Firebase' : 'Backup Manual no Firebase',
      itemCount: backupResult.servicesCount + backupResult.storesCount,
      status: 'success',
      details: `Snapshot #${backupResult.id} salvo no Firestore com ${backupResult.servicesCount} serviços e ${backupResult.storesCount} lojas.`,
    });

    return {
      success: true,
      backup: backupResult,
      deletedOldBackupsCount: deletedCount,
    };
  } catch (err: any) {
    console.error('[BackupScheduler] Erro ao executar backup no Firebase:', err);
    const updatedConfig: ScheduledBackupConfig = {
      ...currentConfig,
      lastStatus: 'error',
      lastError: err?.message || 'Erro desconhecido ao realizar backup no Firebase',
    };
    saveScheduledBackupConfig(updatedConfig);

    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Erro no Backup Agendado do Firebase',
      itemCount: 0,
      status: 'error',
      details: err?.message || 'Falha ao salvar snapshot agendado no Firebase Firestore.',
    });

    return {
      success: false,
      deletedOldBackupsCount: 0,
      error: err?.message || 'Falha na execução do backup',
    };
  }
}
