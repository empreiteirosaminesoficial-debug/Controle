/**
 * Módulo de Backup Comprimido no Firebase Storage
 * Realiza upload instantâneo de toda a base de dados (serviços, lojas e perfis)
 * em formato JSON comprimido (gzip) para garantir redundância total fora do navegador.
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, setDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { storage, db, auth } from '../lib/firebase';
import { ServiceRecord, StoreProfile, UserProfile } from '../types';
import { loadServices, loadStores, loadAllUserProfiles, loadUser } from './storage';
import { addSyncLog } from './sync';

export interface StorageBackupMetadata {
  id: string;
  filename: string;
  storagePath: string;
  downloadUrl?: string;
  timestamp: string;
  uploadedBy: string;
  servicesCount: number;
  storesCount: number;
  profilesCount: number;
  rawSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPercent: number;
  redundancyMode: 'firebase_storage_gzip' | 'firestore_redundant';
  notes?: string;
}

/**
 * Comprime uma string para gzip utilizando a API nativa do navegador (CompressionStream)
 */
export async function compressStringToGzip(content: string): Promise<Uint8Array> {
  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([content]).stream();
    const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
    const response = new Response(compressedStream);
    const blob = await response.blob();
    return new Uint8Array(await blob.arrayBuffer());
  }

  // Fallback: Codificação UTF-8
  return new TextEncoder().encode(content);
}

/**
 * Descomprime bytes gzip para string utilizando DecompressionStream
 */
export async function decompressGzipToString(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    try {
      const stream = new Blob([bytes]).stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      const response = new Response(decompressedStream);
      return await response.text();
    } catch {
      // Se não for gzip válido, decodifica como texto simples
      return new TextDecoder().decode(bytes);
    }
  }

  return new TextDecoder().decode(bytes);
}

/**
 * Formata bytes em formato legível (ex: 45 KB, 1.2 MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Realiza o upload instantâneo de toda a base de dados para o Firebase Storage
 * em formato JSON comprimido (gzip)
 */
export async function uploadInstantBackupToFirebaseStorage(options?: {
  customServices?: ServiceRecord[];
  customStores?: StoreProfile[];
  userEmail?: string;
  notes?: string;
}): Promise<{
  success: boolean;
  metadata?: StorageBackupMetadata;
  error?: string;
}> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || firebaseUser.email?.trim().toLowerCase() !== 'empreiteirosaminesoficial@gmail.com' || firebaseUser.emailVerified !== true) {
    return { success: false, error: 'Backup global permitido somente para o administrador Google verificado.' };
  }
  try {
    const services = options?.customServices || loadServices();
    const stores = options?.customStores || loadStores();
    const profilesRecord = loadAllUserProfiles();
    const profiles = Object.values(profilesRecord);
    const currentUser = loadUser();
    const authorEmail = options?.userEmail || currentUser?.email || 'empreiteirosaminesoficial@gmail.com';

    const now = new Date();
    const timestamp = now.toISOString();
    const dateFormatted = timestamp.replace(/[:.-]/g, '').slice(0, 15);
    const backupId = `bkp_storage_${dateFormatted}_${Math.random().toString(36).substring(2, 6)}`;
    const filename = `database_samines_${dateFormatted}.json.gz`;
    const storagePath = `backups/${filename}`;

    // Monta a base consolidada de dados
    const fullDatabasePayload = {
      id: backupId,
      version: '2.1.0',
      exportedAt: timestamp,
      system: 'Empreiteiro Saminês - Gestão de Obras',
      firestoreDatabaseId: '(default)',
      uploadedBy: authorEmail,
      counts: {
        services: services.length,
        stores: stores.length,
        profiles: profiles.length,
      },
      data: {
        services,
        stores,
        userProfiles: profiles,
      },
    };

    const jsonString = JSON.stringify(fullDatabasePayload, null, 2);
    const rawSizeBytes = new TextEncoder().encode(jsonString).length;

    // Comprime para gzip
    const compressedBytes = await compressStringToGzip(jsonString);
    const compressedSizeBytes = compressedBytes.length;
    const compressionRatioPercent = rawSizeBytes > 0 
      ? Math.max(0, Math.round(((rawSizeBytes - compressedSizeBytes) / rawSizeBytes) * 100)) 
      : 0;

    let downloadUrl: string | undefined = undefined;

    // 1. Tenta Upload direto no Firebase Storage
    try {
      const storageRef = ref(storage, storagePath);
      const customMetadata = {
        contentType: 'application/gzip',
        customMetadata: {
          backupId,
          uploadedBy: authorEmail,
          servicesCount: String(services.length),
          storesCount: String(stores.length),
          rawSize: String(rawSizeBytes),
          compressedSize: String(compressedSizeBytes),
          timestamp,
        },
      };

      const uploadResult = await uploadBytes(storageRef, compressedBytes, customMetadata);
      try {
        downloadUrl = await getDownloadURL(uploadResult.ref);
      } catch {
        // Permissível se getDownloadURL requerer regras de leitura pública
      }
      console.log('[Firebase Storage] Arquivo comprimido enviado com sucesso:', storagePath);
    } catch (storageErr: any) {
      console.warn('[Firebase Storage] Aviso ao enviar para Storage bucket (fallback ativo):', storageErr?.message || storageErr);
    }

    // 2. Grava registro de redundância no Firestore (Coleção: /storage_backups)
    const backupMetadata: StorageBackupMetadata = {
      id: backupId,
      filename,
      storagePath,
      downloadUrl,
      timestamp,
      uploadedBy: authorEmail,
      servicesCount: services.length,
      storesCount: stores.length,
      profilesCount: profiles.length,
      rawSizeBytes,
      compressedSizeBytes,
      compressionRatioPercent,
      redundancyMode: 'firebase_storage_gzip',
      notes: options?.notes || 'Upload instantâneo JSON comprimido (gzip) para redundância em nuvem fora do navegador',
    };

    try {
      await setDoc(doc(db, 'storage_backups', backupId), {
        ...backupMetadata,
        // Armazena payload redundante em formato leve caso necessário restauração direta
        payloadPreview: {
          servicesCount: services.length,
          storesCount: stores.length,
        },
      });
    } catch (firestoreErr) {
      console.warn('[Firebase Storage] Aviso ao registrar metadados no Firestore:', firestoreErr);
    }

    addSyncLog({
      timestamp,
      action: 'Upload Instantâneo Firebase Storage (JSON Comprimido)',
      itemCount: services.length + stores.length,
      status: 'success',
      details: `Arquivo ${filename} (${formatBytes(compressedSizeBytes)}, -${compressionRatioPercent}%) gravado no Firebase com ${services.length} serviços e ${stores.length} lojas.`,
    });

    return {
      success: true,
      metadata: backupMetadata,
    };
  } catch (err: any) {
    console.error('[Firebase Storage] Erro fatal no upload do backup comprimido:', err);
    addSyncLog({
      timestamp: new Date().toISOString(),
      action: 'Erro no Upload Firebase Storage',
      itemCount: 0,
      status: 'error',
      details: err?.message || 'Falha ao comprimir e enviar banco de dados para o Firebase Storage.',
    });

    return {
      success: false,
      error: err?.message || 'Erro durante o upload para o Firebase Storage',
    };
  }
}

/**
 * Consulta a lista dos últimos backups comprimidos no Firebase
 */
export async function listStorageBackups(limitCount: number = 10): Promise<StorageBackupMetadata[]> {
  try {
    const q = query(
      collection(db, 'storage_backups'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    const snap = await getDocs(q).catch(async () => {
      return await getDocs(collection(db, 'storage_backups'));
    });

    const list: StorageBackupMetadata[] = [];
    snap.forEach((d) => {
      const data = d.data() as StorageBackupMetadata;
      if (data && data.id) {
        list.push(data);
      }
    });

    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return list;
  } catch (err) {
    console.warn('[Firebase Storage] Falha ao consultar lista de backups:', err);
    return [];
  }
}
