/**
 * Fila local de gravações pendentes no Firestore (outbox).
 *
 * Problema que resolve: antes, cada gravação era "dispare e esqueça"
 * (`saveCloudService(...).catch(() => {})`). Se a gravação falhasse (sem rede,
 * regra recusando, campo inválido) ou se a página fosse recarregada antes do
 * Firestore confirmar, a alteração ficava só na tela e era sobrescrita pelo
 * próximo snapshot da nuvem — o serviço "sumia" ao atualizar a página.
 *
 * Agora toda gravação é registrada aqui ANTES de ser enviada e só sai da fila
 * quando o Firestore confirma. Listeners e a sincronização mesclam os itens
 * pendentes por cima dos dados da nuvem, e a fila é reenviada ao reconectar.
 */
import { auth } from '../lib/firebase';

export type OutboxCollection = 'services' | 'obras' | 'visitas';

interface OutboxState {
  /** Registro completo aguardando confirmação, indexado pelo id. */
  upserts: Record<string, any>;
  /** Ids aguardando exclusão confirmada. */
  deletes: string[];
}

const OUTBOX_PREFIX = 'samines_cloud_outbox_v1';

function outboxKey(collectionName: OutboxCollection): string {
  // A fila é separada por conta para que pendências do ADM nunca sejam
  // reenviadas (ou exibidas) numa sessão de cliente no mesmo navegador.
  const uid = auth.currentUser?.uid || 'anon';
  return `${OUTBOX_PREFIX}_${uid}_${collectionName}`;
}

function readState(collectionName: OutboxCollection): OutboxState {
  try {
    const raw = localStorage.getItem(outboxKey(collectionName));
    if (!raw) return { upserts: {}, deletes: [] };
    const parsed = JSON.parse(raw);
    return {
      upserts: parsed && typeof parsed.upserts === 'object' && parsed.upserts ? parsed.upserts : {},
      deletes: Array.isArray(parsed?.deletes) ? parsed.deletes.filter((id: unknown) => typeof id === 'string') : [],
    };
  } catch {
    return { upserts: {}, deletes: [] };
  }
}

function writeState(collectionName: OutboxCollection, state: OutboxState): void {
  try {
    if (Object.keys(state.upserts).length === 0 && state.deletes.length === 0) {
      localStorage.removeItem(outboxKey(collectionName));
    } else {
      localStorage.setItem(outboxKey(collectionName), JSON.stringify(state));
    }
  } catch (error) {
    console.warn('[CloudOutbox] Não foi possível gravar a fila local:', error);
  }
}

/** Remove `undefined` recursivamente (o Firestore rejeita esse valor). */
export function cleanForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined).map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const result: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (item !== undefined && typeof item !== 'function') result[key] = cleanForFirestore(item);
    });
    return result as T;
  }
  return value;
}

export function markPendingUpsert(collectionName: OutboxCollection, record: { id: string }): void {
  if (!record?.id) return;
  const state = readState(collectionName);
  state.upserts[record.id] = record;
  state.deletes = state.deletes.filter((id) => id !== record.id);
  writeState(collectionName, state);
}

export function markPendingDelete(collectionName: OutboxCollection, id: string): void {
  if (!id) return;
  const state = readState(collectionName);
  delete state.upserts[id];
  if (!state.deletes.includes(id)) state.deletes.push(id);
  writeState(collectionName, state);
}

/**
 * Confirma uma gravação. Só remove da fila se o registro pendente ainda for o
 * mesmo que foi enviado (evita apagar uma edição feita depois do envio).
 */
export function clearPendingUpsert(collectionName: OutboxCollection, record: { id: string; updatedAt?: string }): void {
  const state = readState(collectionName);
  const pending = state.upserts[record.id];
  if (!pending) return;
  if (pending.updatedAt && record.updatedAt && pending.updatedAt !== record.updatedAt) return;
  delete state.upserts[record.id];
  writeState(collectionName, state);
}

export function clearPendingDelete(collectionName: OutboxCollection, id: string): void {
  const state = readState(collectionName);
  if (!state.deletes.includes(id)) return;
  state.deletes = state.deletes.filter((item) => item !== id);
  writeState(collectionName, state);
}

export function getPendingWrites(collectionName: OutboxCollection): { upserts: any[]; deletes: string[] } {
  const state = readState(collectionName);
  return { upserts: Object.values(state.upserts), deletes: [...state.deletes] };
}

export function countPendingWrites(): number {
  return (['services', 'obras', 'visitas'] as OutboxCollection[]).reduce((total, name) => {
    const state = readState(name);
    return total + Object.keys(state.upserts).length + state.deletes.length;
  }, 0);
}

/**
 * Aplica a fila local por cima de uma lista vinda da nuvem: pendências de
 * gravação substituem/adicionam itens, pendências de exclusão os removem.
 */
export function mergeWithPendingWrites<T extends { id: string }>(
  collectionName: OutboxCollection,
  cloudItems: T[]
): T[] {
  const state = readState(collectionName);
  const deleted = new Set(state.deletes);
  const byId = new Map<string, T>();
  cloudItems.forEach((item) => {
    if (item?.id && !deleted.has(item.id)) byId.set(item.id, item);
  });
  Object.values(state.upserts).forEach((item: any) => {
    if (item?.id && !deleted.has(item.id)) byId.set(item.id, item as T);
  });
  const pendingIds = new Set(Object.keys(state.upserts));
  // Pendentes primeiro (mais recentes), depois a ordem original da nuvem.
  const pendingFirst = [...byId.values()].filter((item) => pendingIds.has(item.id));
  const rest = [...byId.values()].filter((item) => !pendingIds.has(item.id));
  return [...pendingFirst, ...rest];
}

/** Marca, uma única vez por coleção, que o envio inicial do cache local já ocorreu. */
const INITIAL_UPLOAD_PREFIX = 'samines_cloud_initial_upload_v2';

export function isInitialUploadDone(collectionName: OutboxCollection): boolean {
  try {
    return localStorage.getItem(`${INITIAL_UPLOAD_PREFIX}_${collectionName}`) === 'done';
  } catch {
    return true;
  }
}

export function setInitialUploadDone(collectionName: OutboxCollection): void {
  try {
    localStorage.setItem(`${INITIAL_UPLOAD_PREFIX}_${collectionName}`, 'done');
  } catch {
    // ignore
  }
}

/** Traduz erros do Firestore para uma mensagem útil ao usuário. */
export function describeFirestoreError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  if (code.includes('permission-denied')) {
    return 'O Firebase recusou a gravação (permissão negada). Verifique se o acesso ao estabelecimento foi aprovado e se as regras do Firestore estão publicadas.';
  }
  if (code.includes('unavailable') || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 'Sem conexão com o servidor. A alteração foi guardada e será enviada automaticamente quando a conexão voltar.';
  }
  if (code.includes('invalid-argument')) {
    return 'O registro tem um valor que o Firebase não aceita (possivelmente fotos grandes demais: o limite é 1 MB por registro).';
  }
  return (error as { message?: string })?.message || 'Erro desconhecido ao gravar no Firebase.';
}
