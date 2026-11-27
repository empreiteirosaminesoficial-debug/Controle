/**
 * Sistema de Lembrete Diário para Confirmação de Backup Manual no Firestore
 * Garante que o administrador verifique e valide a redundância e segurança dos dados todos os dias.
 */

import { AppNotification, UserProfile } from '../types';
import { loadScheduledBackupConfig } from './backupScheduler';

export interface DailyBackupReminderData {
  lastConfirmedDate: string | null; // Formato YYYY-MM-DD
  lastConfirmedTimestamp: string | null; // ISO Timestamp
  lastConfirmedBy?: string;
  totalServicesAtBackup?: number;
  totalStoresAtBackup?: number;
  lastBackupId?: string;
  lastReminderSentDate?: string | null; // Para evitar notificações repetidas no mesmo dia
}

export type SecurityLevel = 'secure' | 'warning' | 'critical';

export interface SecurityStatusInfo {
  level: SecurityLevel;
  title: string;
  subtitle: string;
  confirmedToday: boolean;
  lastConfirmedFormatted: string;
  databaseId: string;
  pendingDays: number;
}

const STORAGE_KEY = 'gestao_daily_backup_reminder_v1';
const FIRESTORE_DATABASE_ID = '(default)';

/**
 * Retorna a data atual no fuso horário local no formato YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Carrega os dados de confirmação de backup diário do localStorage
 */
export function loadDailyBackupReminder(): DailyBackupReminderData {
  if (typeof window === 'undefined') {
    return {
      lastConfirmedDate: null,
      lastConfirmedTimestamp: null,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Verifica se houve execução recente pelo agendador de backups
      const sched = loadScheduledBackupConfig();
      if (sched.lastExecutedAt && sched.lastStatus === 'success') {
        const schedDate = sched.lastExecutedAt.split('T')[0];
        const initial: DailyBackupReminderData = {
          lastConfirmedDate: schedDate,
          lastConfirmedTimestamp: sched.lastExecutedAt,
          lastConfirmedBy: 'Rotina Automática Firestore',
        };
        saveDailyBackupReminder(initial);
        return initial;
      }

      return {
        lastConfirmedDate: null,
        lastConfirmedTimestamp: null,
      };
    }

    const parsed: DailyBackupReminderData = JSON.parse(raw);
    return parsed;
  } catch (err) {
    console.error('Falha ao ler dados de lembrete diário de backup:', err);
    return {
      lastConfirmedDate: null,
      lastConfirmedTimestamp: null,
    };
  }
}

/**
 * Salva os dados de confirmação de backup diário no localStorage
 */
export function saveDailyBackupReminder(data: DailyBackupReminderData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Falha ao salvar dados de lembrete diário de backup:', err);
  }
}

/**
 * Verifica se o backup já foi confirmado/realizado hoje
 */
export function isBackupConfirmedToday(): boolean {
  const reminderData = loadDailyBackupReminder();
  const today = getTodayDateString();

  if (reminderData.lastConfirmedDate === today) {
    return true;
  }

  // Verifica se o agendador executou com sucesso hoje
  const sched = loadScheduledBackupConfig();
  if (sched.lastExecutedAt && sched.lastStatus === 'success') {
    const schedDate = sched.lastExecutedAt.split('T')[0];
    if (schedDate === today) {
      // Sincroniza estado
      recordBackupConfirmedToday({
        userEmail: 'Agendador Automático Firestore',
        backupId: sched.lastExecutedSlot || undefined,
      });
      return true;
    }
  }

  return false;
}

/**
 * Registra a confirmação de backup para a data de hoje
 */
export function recordBackupConfirmedToday(details?: {
  userEmail?: string;
  servicesCount?: number;
  storesCount?: number;
  backupId?: string;
}): DailyBackupReminderData {
  const now = new Date();
  const today = getTodayDateString();
  const current = loadDailyBackupReminder();

  const updated: DailyBackupReminderData = {
    ...current,
    lastConfirmedDate: today,
    lastConfirmedTimestamp: now.toISOString(),
    lastConfirmedBy: details?.userEmail || current.lastConfirmedBy || 'Administrador',
    totalServicesAtBackup: details?.servicesCount ?? current.totalServicesAtBackup,
    totalStoresAtBackup: details?.storesCount ?? current.totalStoresAtBackup,
    lastBackupId: details?.backupId || current.lastBackupId,
  };

  saveDailyBackupReminder(updated);
  return updated;
}

/**
 * Calcula o nível de segurança atual e formata informações para o Card de Status
 */
export function getSecurityStatusInfo(reminderData: DailyBackupReminderData): SecurityStatusInfo {
  const today = getTodayDateString();
  const confirmedToday = reminderData.lastConfirmedDate === today;

  let pendingDays = 0;
  let lastConfirmedFormatted = 'Nenhum backup confirmado ainda';

  if (reminderData.lastConfirmedTimestamp) {
    try {
      const dateObj = new Date(reminderData.lastConfirmedTimestamp);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const year = dateObj.getFullYear();
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const mins = String(dateObj.getMinutes()).padStart(2, '0');

      if (reminderData.lastConfirmedDate === today) {
        lastConfirmedFormatted = `Hoje às ${hours}:${mins}`;
      } else {
        lastConfirmedFormatted = `${day}/${month}/${year} às ${hours}:${mins}`;
      }

      // Calcula diferença de dias
      const diffMs = Date.now() - dateObj.getTime();
      pendingDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch {
      lastConfirmedFormatted = reminderData.lastConfirmedTimestamp;
    }
  }

  if (confirmedToday) {
    return {
      level: 'secure',
      title: 'Segurança Máxima: Backup Confirmado Hoje',
      subtitle: `Cópia temporal gravada e validada no Cloud Firestore (${lastConfirmedFormatted})`,
      confirmedToday: true,
      lastConfirmedFormatted,
      databaseId: FIRESTORE_DATABASE_ID,
      pendingDays: 0,
    };
  }

  if (pendingDays <= 1) {
    return {
      level: 'warning',
      title: 'Lembrete Diário: Confirmação de Backup Pendente',
      subtitle: 'Nenhum backup manual foi confirmado para a data de hoje. Clique para confirmar e assegurar a integridade dos dados.',
      confirmedToday: false,
      lastConfirmedFormatted,
      databaseId: FIRESTORE_DATABASE_ID,
      pendingDays: Math.max(1, pendingDays),
    };
  }

  return {
    level: 'critical',
    title: 'Atenção Crítica: Backup Desatualizado',
    subtitle: `Último backup confirmado há ${pendingDays} dias. É recomendada a confirmação imediata da cópia de segurança.`,
    confirmedToday: false,
    lastConfirmedFormatted,
    databaseId: FIRESTORE_DATABASE_ID,
    pendingDays,
  };
}

/**
 * Dispara notificação no centro de notificações caso o backup diário ainda não tenha sido confirmado hoje
 */
export function checkAndTriggerDailyBackupReminder(params: {
  user: UserProfile | null;
  onNewNotification?: (notif: AppNotification) => void;
  force?: boolean;
}): AppNotification | null {
  const { user, onNewNotification, force = false } = params;
  if (!user) return null;

  // Apenas administradores recebem o lembrete de backup manual do sistema
  const isAdmin = user?.role === 'admin' || (user?.email && user.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com');
  if (!isAdmin) return null;

  const today = getTodayDateString();
  const reminderData = loadDailyBackupReminder();

  // Se já foi confirmado hoje, não notifica
  if (reminderData.lastConfirmedDate === today && !force) {
    return null;
  }

  // Se já enviou lembrete hoje e não é force, não repete para não incomodar
  if (reminderData.lastReminderSentDate === today && !force) {
    return null;
  }

  const notification: AppNotification = {
    id: `notif_backup_daily_${Date.now()}`,
    title: 'Lembrete Diário: Confirmação de Backup Firestore 🛡️',
    body: 'Por favor, confirme o backup diário dos dados para o Cloud Firestore para manter seus lançamentos, obras e cadastros 100% seguros.',
    type: 'aviso',
    timestamp: new Date().toISOString(),
    read: false,
  };

  // Marca que enviou o lembrete hoje
  saveDailyBackupReminder({
    ...reminderData,
    lastReminderSentDate: today,
  });

  if (onNewNotification) {
    onNewNotification(notification);
  }

  return notification;
}

/**
 * Limpa ou redefine a confirmação de backup diário
 */
export function clearDailyBackupConfirmation(): DailyBackupReminderData {
  const current = loadDailyBackupReminder();
  const updated: DailyBackupReminderData = {
    ...current,
    lastConfirmedDate: null,
    lastConfirmedTimestamp: null,
    lastBackupId: undefined,
  };
  saveDailyBackupReminder(updated);
  return updated;
}

