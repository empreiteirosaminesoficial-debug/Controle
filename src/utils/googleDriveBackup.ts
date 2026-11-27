/**
 * Utilitário de Integração Oficial com o Google Drive para Backup de Clientes
 * Horário Programado: Diariamente às 04:00 da manhã
 * Escopo: https://www.googleapis.com/auth/drive.file
 */

import { GoogleDriveBackupFile, ObraRecord, ServiceRecord, StoreProfile, VisitaRecord } from '../types';
import { getCachedAccessToken, requestDriveAccessToken } from '../lib/firebase';
import { addSyncLog } from './sync';
import { loadScheduledBackupConfig, saveScheduledBackupConfig } from './backupScheduler';

export const DRIVE_FOLDER_NAME = 'Backups Empreiteiro Saminês - Clientes';
const DRIVE_FILES_ENDPOINT = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_ENDPOINT = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,createdTime,size';

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  error?: string;
  size?: string;
}

/**
 * Localiza ou cria a pasta exclusiva de backups no Google Drive do usuário
 */
export async function getOrCreateDriveFolder(token: string): Promise<string | null> {
  try {
    // 1. Busca pasta existente
    const query = encodeURIComponent(`name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await fetch(`${DRIVE_FILES_ENDPOINT}?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Cria a pasta se não existir
    const createRes = await fetch(DRIVE_FILES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Pasta automatizada para armazenamento diário de cópias de segurança (backups às 04:00)',
      }),
    });

    if (createRes.ok) {
      const createdFolder = await createRes.json();
      return createdFolder.id;
    }

    return null;
  } catch (err) {
    console.warn('[Google Drive] Falha ao verificar/criar pasta de backups:', err);
    return null;
  }
}

/**
 * Realiza o upload do backup de clientes para o Google Drive
 */
export async function uploadClientBackupToDrive(params: {
  services: ServiceRecord[];
  stores: StoreProfile[];
  obras?: ObraRecord[];
  visitas?: VisitaRecord[];
  clientEmail?: string;
  clientName?: string;
  isAutoScheduled?: boolean;
  customNote?: string;
}): Promise<DriveUploadResult> {
  // 1. Garante o token do Google Drive
  let token = getCachedAccessToken();
  if (!token) {
    token = await requestDriveAccessToken();
  }

  if (!token) {
    return {
      success: false,
      error: 'Conexão com Google Drive necessária. Faça login ou autorize o acesso à sua conta Google.',
    };
  }

  try {
    // 2. Garante a pasta de destino
    const folderId = await getOrCreateDriveFolder(token);

    // 3. Monta o nome padronizado do arquivo com horário de referência (04:00 AM)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = params.isAutoScheduled ? '04-00' : now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
    const sanitizedClient = params.clientName 
      ? params.clientName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 20) 
      : 'Geral';

    const fileName = `Backup_Clientes_Samines_${sanitizedClient}_${dateStr}_${timeStr}.json`;

    // 4. Prepara o conteúdo detalhado do backup
    const totalCharged = params.services.reduce((acc, s) => acc + (s.valueCharged || 0), 0);
    const totalPaid = params.services.reduce((acc, s) => acc + (s.valuePaid || 0), 0);
    const totalDebits = params.services.reduce((acc, s) => acc + (s.valueDebit || 0), 0);

    const payload = {
      app: 'Empreiteiro Saminês',
      exportType: 'Backup Oficial de Clientes (Google Drive)',
      version: '2.0',
      timestamp: now.toISOString(),
      scheduledTime: params.isAutoScheduled ? '04:00' : undefined,
      clientEmail: params.clientEmail || 'Todos os Clientes',
      clientName: params.clientName || 'Geral',
      customNote: params.customNote || 'Backup diário agendado para proteção e redundância de dados',
      stats: {
        totalServices: params.services.length,
        totalStores: params.stores.length,
        totalObras: (params.obras || []).length,
        totalVisitas: (params.visitas || []).length,
        totalCharged,
        totalPaid,
        totalPending: Math.max(0, (totalCharged + totalDebits) - totalPaid),
      },
      stores: params.stores,
      services: params.services,
      obras: params.obras || [],
      visitas: params.visitas || [],
    };

    const fileContent = JSON.stringify(payload, null, 2);

    // 5. Monta requisição multipart/related
    const boundary = '-------samines_drive_backup_boundary_' + Date.now();
    const metadata: Record<string, any> = {
      name: fileName,
      mimeType: 'application/json',
      description: `Backup de clientes Empreiteiro Saminês executado em ${now.toLocaleString('pt-BR')}.`,
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const multipartRequestBody =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      JSON.stringify(metadata) + `\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      fileContent + `\r\n` +
      `--${boundary}--`;

    const uploadRes = await fetch(DRIVE_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!uploadRes.ok) {
      const errJson = await uploadRes.json().catch(() => ({}));
      throw new Error(errJson?.error?.message || `Erro HTTP ${uploadRes.status} no upload para o Google Drive`);
    }

    const uploadedFile = await uploadRes.json();

    // 6. Atualiza o agendador local com o registro do Drive
    const currentConfig = loadScheduledBackupConfig();
    saveScheduledBackupConfig({
      ...currentConfig,
      lastGoogleDriveBackupAt: now.toISOString(),
      lastGoogleDriveFileName: fileName,
      lastGoogleDriveFileLink: uploadedFile.webViewLink || null,
      googleDriveEnabled: true,
      googleDriveScheduledTime: '04:00',
    });

    // 7. Registra no log de sincronização
    addSyncLog({
      timestamp: now.toISOString(),
      action: params.isAutoScheduled ? 'Backup Google Drive (04:00 AM)' : 'Backup Manual Google Drive',
      itemCount: params.services.length + params.stores.length,
      status: 'success',
      details: `Arquivo "${fileName}" enviado com sucesso ao Google Drive na pasta "${DRIVE_FOLDER_NAME}".`,
    });

    return {
      success: true,
      fileId: uploadedFile.id,
      fileName,
      webViewLink: uploadedFile.webViewLink,
      size: uploadedFile.size,
    };
  } catch (err: any) {
    console.error('[Google Drive] Erro no upload do backup:', err);
    return {
      success: false,
      error: err?.message || 'Falha ao enviar backup para o Google Drive',
    };
  }
}

/**
 * Lista os backups disponíveis no Google Drive
 */
export async function listGoogleDriveBackups(): Promise<GoogleDriveBackupFile[]> {
  const token = getCachedAccessToken();
  if (!token) {
    return [];
  }

  try {
    const query = encodeURIComponent(`name contains 'Backup_Clientes_Samines' and trashed = false`);
    const fields = encodeURIComponent('files(id,name,mimeType,createdTime,size,webViewLink,webContentLink)');
    const res = await fetch(`${DRIVE_FILES_ENDPOINT}?q=${query}&fields=${fields}&orderBy=createdTime desc&pageSize=20`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    return (data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      createdTime: f.createdTime,
      size: f.size ? `${(Number(f.size) / 1024).toFixed(1)} KB` : undefined,
      webViewLink: f.webViewLink,
      webContentLink: f.webContentLink,
    }));
  } catch (err) {
    console.warn('[Google Drive] Falha ao listar backups:', err);
    return [];
  }
}

/**
 * Exclui um backup do Google Drive (Operação com confirmação obrigatória)
 */
export async function deleteGoogleDriveBackup(fileId: string, fileName?: string): Promise<boolean> {
  const token = getCachedAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`${DRIVE_FILES_ENDPOINT}/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok || res.status === 204) {
      addSyncLog({
        timestamp: new Date().toISOString(),
        action: 'Backup Google Drive Excluído',
        itemCount: 1,
        status: 'warning',
        details: `Arquivo de backup "${fileName || fileId}" foi excluído do Google Drive.`,
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[Google Drive] Falha ao excluir backup:', err);
    return false;
  }
}
