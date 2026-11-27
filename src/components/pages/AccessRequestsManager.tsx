import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, Link2, ShieldCheck, XCircle } from 'lucide-react';
import { collection, deleteDoc, doc, onSnapshot, runTransaction, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { StoreProfile } from '../../types';

type AccessRequest = {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  status?: 'pending' | 'approved' | 'rejected';
  storeIds?: string[];
  requestedAt?: any;
};

interface AccessRequestsManagerProps { stores: StoreProfile[]; }

export const AccessRequestsManager: React.FC<AccessRequestsManagerProps> = ({ stores }) => {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [selectedStoreByUid, setSelectedStoreByUid] = useState<Record<string, string[]>>({});
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'accessRequests'), (snapshot) => {
      const rows = snapshot.docs.map((item) => ({ ...item.data(), uid: item.id } as AccessRequest));
      rows.sort((a, b) => {
        const aTime = a.requestedAt?.toMillis?.() || 0;
        const bTime = b.requestedAt?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setRequests(rows);
    }, (err) => setError(err.message || 'Não foi possível carregar as solicitações.'));
    return unsubscribe;
  }, []);

  const storeNames = useMemo(() => new Map(stores.map((store) => [store.id, store.nomeFantasia || store.razaoSocial || store.cnpj])), [stores]);
  const pendingCount = requests.filter((item) => !item.status || item.status === 'pending').length;

  const assignStore = async (request: AccessRequest) => {
    const current = auth.currentUser;
    const selectedStoreIds = Array.from(new Set(selectedStoreByUid[request.uid] || []));

    if (!current || current.email?.toLowerCase() !== 'empreiteirosaminesoficial@gmail.com' || !current.emailVerified) {
      setError('Somente a conta administrativa Google verificada pode aprovar solicitações.');
      return;
    }
    if (request.uid === current.uid) {
      setError('A conta administrativa não pode ser aprovada como cliente.');
      return;
    }
    if (selectedStoreIds.length === 0) {
      setError('Marque pelo menos um estabelecimento para vincular.');
      return;
    }

    const linkedIds = request.storeIds || [];
    const newIds = selectedStoreIds.filter((id) => !linkedIds.includes(id));
    if (newIds.length === 0) {
      setError('Os estabelecimentos selecionados já estão vinculados a este perfil.');
      return;
    }

    const selectedStores = newIds.map((id) => stores.find((store) => store.id === id));
    if (selectedStores.some((store) => !store || store.status === 'blocked')) {
      setError('Um dos estabelecimentos selecionados não existe ou está bloqueado.');
      return;
    }

    const isCpfStore = (store: StoreProfile) =>
      store.documentType === 'CPF' ||
      (String(store.cleanCnpj || store.cnpj || '').replace(/\D/g, '').length === 11);

    const existingCpf = linkedIds.some((id) => {
      const store = stores.find((item) => item.id === id);
      return Boolean(store && isCpfStore(store));
    });
    const selectedCpfCount = selectedStores.filter((store) => store && isCpfStore(store)).length;

    if (selectedCpfCount > 1 || (existingCpf && selectedCpfCount > 0)) {
      setError('Um perfil pode ter somente um CPF vinculado e vários CNPJs.');
      return;
    }

    setBusyUid(request.uid);
    setError('');
    setMessage('');

    try {
      const requestRef = doc(db, 'accessRequests', request.uid);

      await runTransaction(db, async (transaction) => {
        const fresh = await transaction.get(requestRef);
        if (!fresh.exists()) throw new Error('Solicitação não encontrada. Atualize a lista.');

        const data = fresh.data();
        if (data.status === 'rejected') throw new Error('Esta solicitação foi rejeitada.');

        const currentIds = Array.isArray(data.storeIds)
          ? data.storeIds.filter((id: unknown): id is string => typeof id === 'string')
          : [];
        const candidateIds = Array.from(new Set([...currentIds, ...newIds]));

        // Todas as leituras são feitas antes das gravações da transação.
        const candidateSnapshots = await Promise.all(
          candidateIds.map((id) => transaction.get(doc(db, 'stores', id)))
        );

        const storeDataById = new Map(
          candidateSnapshots
            .filter((snapshot) => snapshot.exists())
            .map((snapshot) => [snapshot.id, snapshot.data()])
        );

        // Um mesmo documento não pode entrar duas vezes no mesmo perfil por IDs diferentes.
        // CPF continua único por perfil; CNPJs diferentes continuam permitidos.
        const documentOwnerByNumber = new Map<string, string>();
        for (const id of candidateIds) {
          const storeData = storeDataById.get(id);
          if (!storeData) continue;
          const normalizedDocument = String(storeData.cleanCnpj || storeData.cnpj || '').replace(/\D/g, '');
          if (normalizedDocument.length !== 11 && normalizedDocument.length !== 14) continue;
          const previousStoreId = documentOwnerByNumber.get(normalizedDocument);
          if (previousStoreId && previousStoreId !== id) {
            throw new Error(
              normalizedDocument.length === 14
                ? 'Este perfil já possui este CNPJ vinculado por outro cadastro. Remova o vínculo duplicado antes de aprovar.'
                : 'Este perfil já possui este CPF vinculado por outro cadastro. Um perfil pode ter somente um CPF.'
            );
          }
          documentOwnerByNumber.set(normalizedDocument, id);
        }

        for (const id of newIds) {
          const storeData = storeDataById.get(id);
          if (!storeData || storeData.status === 'blocked' ||
              (storeData.status !== undefined && storeData.status !== 'active')) {
            throw new Error('Um dos estabelecimentos selecionados não existe ou não está ativo. Atualize a lista.');
          }
        }

        const cpfCount = candidateIds.filter((id) => {
          const storeData = storeDataById.get(id);
          if (!storeData) return false;
          return storeData.documentType === 'CPF' ||
            String(storeData.cleanCnpj || storeData.cnpj || '').replace(/\D/g, '').length === 11;
        }).length;

        if (cpfCount > 1) {
          throw new Error('Este perfil já possui um CPF vinculado ou foram selecionados vários CPFs. Um perfil pode ter um único CPF e vários CNPJs.');
        }

        for (const storeId of newIds) {
          transaction.set(doc(db, 'stores', storeId, 'members', request.uid), {
            uid: request.uid,
            email: data.email,
            storeId,
            status: 'active',
            approvedBy: current.uid,
            approvedAt: serverTimestamp(),
          }, { merge: true });
        }

        transaction.update(requestRef, {
          status: 'approved',
          storeIds: candidateIds,
          reviewedBy: current.uid,
          reviewedAt: serverTimestamp(),
        });
      });

      setMessage(`${newIds.length} estabelecimento(s) vinculado(s) à conta ${request.email}.`);
      setSelectedStoreByUid((prev) => ({ ...prev, [request.uid]: [] }));
    } catch (err: any) {
      setError(err?.message || 'Não foi possível aprovar e vincular os estabelecimentos.');
    } finally {
      setBusyUid(null);
    }
  };
  const revokeStore = async (request: AccessRequest, storeId: string) => {
    const current = auth.currentUser;
    if (!current || current.email?.toLowerCase() !== 'empreiteirosaminesoficial@gmail.com' || !current.emailVerified) {
      setError('Somente a conta administrativa Google verificada pode remover vínculos.');
      return;
    }
    const storeName = storeNames.get(storeId) || storeId;
    if (!window.confirm(`Remover o acesso de ${request.email} ao estabelecimento ${storeName}?`)) return;
    setBusyUid(request.uid); setError(''); setMessage('');
    try {
      const requestRef = doc(db, 'accessRequests', request.uid);
      const memberRef = doc(db, 'stores', storeId, 'members', request.uid);
      await runTransaction(db, async (transaction) => {
        const fresh = await transaction.get(requestRef);
        if (!fresh.exists()) throw new Error('Solicitação não encontrada.');
        const data = fresh.data();
        const currentIds = Array.isArray(data.storeIds) ? data.storeIds.filter((id: unknown): id is string => typeof id === 'string') : [];
        const remainingIds = currentIds.filter((id) => id !== storeId);
        transaction.delete(memberRef);
        transaction.update(requestRef, {
          // Mantém o cadastro aprovado mesmo sem lojas: o cliente fica bloqueado
          // (tela "nenhum estabelecimento liberado"), mas não volta à fila de pendentes.
          status: 'approved',
          storeIds: remainingIds,
          reviewedBy: current.uid,
          reviewedAt: serverTimestamp(),
        });
      });
      setMessage(`Acesso de ${request.email} removido de ${storeName}.`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível remover o vínculo.');
    } finally { setBusyUid(null); }
  };

  const rejectRequest = async (request: AccessRequest) => {
    const current = auth.currentUser;
    if (!current || current.email?.toLowerCase() !== 'empreiteirosaminesoficial@gmail.com' || !current.emailVerified) {
      setError('Somente a conta administrativa Google verificada pode rejeitar solicitações.');
      return;
    }
    if (!window.confirm(`Rejeitar a solicitação de ${request.email}?`)) return;
    setBusyUid(request.uid); setError(''); setMessage('');
    try {
      await updateDoc(doc(db, 'accessRequests', request.uid), {
        status: 'rejected', reviewedBy: current.uid, reviewedAt: serverTimestamp(),
      });
      setMessage(`Solicitação de ${request.email} rejeitada.`);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível rejeitar a solicitação.');
    } finally { setBusyUid(null); }
  };

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700"><ShieldCheck className="w-5 h-5" /></div>
          <div><h3 className="font-extrabold text-sm text-slate-900">Solicitações de acesso</h3><p className="text-xs text-slate-500">Aprovação por conta Google e vínculo individual de estabelecimento</p></div>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">{pendingCount} pendente(s)</span>
      </div>
      {error && <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex gap-2"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
      {message && <div className="mx-4 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" />{message}</div>}
      <div className="divide-y divide-slate-100">
        {requests.length === 0 ? <div className="p-8 text-center text-xs text-slate-500">Nenhuma solicitação registrada.</div> : requests.map((request) => {
          const linked = (request.storeIds || []).filter((id) => storeNames.has(id));
          const pending = !request.status || request.status === 'pending';
          return <article key={request.uid} className="p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="text-sm font-bold text-slate-900 break-all">{request.displayName || request.email}</p><p className="text-xs text-slate-500 break-all">{request.email}</p><p className="text-[11px] text-slate-400 mt-1">UID: {request.uid}</p></div>
              <span className={`shrink-0 text-[10px] font-extrabold uppercase rounded-full px-2 py-1 ${pending ? 'bg-amber-50 text-amber-800' : request.status === 'approved' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{pending ? 'Pendente' : request.status === 'approved' ? 'Aprovada' : 'Rejeitada'}</span>
            </div>
            {linked.length > 0 && <div className="flex flex-wrap gap-1.5">{linked.map((id) => <span key={id} className="text-[10px] px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 inline-flex items-center gap-1.5">{storeNames.get(id)}<button type="button" disabled={busyUid === request.uid} onClick={() => revokeStore(request, id)} className="font-black text-rose-700 hover:text-rose-900 disabled:opacity-40" title="Remover acesso deste estabelecimento" aria-label={`Remover vínculo ${storeNames.get(id)}`}>×</button></span>)}</div>}
            {request.status !== 'rejected' && <div className="flex flex-col sm:flex-row gap-2">
              <div className="min-w-0 flex-1 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-700">Selecione um ou mais estabelecimentos:</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {stores.filter((store) => store.status === undefined || store.status === 'active').map((store) => {
                    const alreadyLinked = linked.includes(store.id);
                    const selected = (selectedStoreByUid[request.uid] || []).includes(store.id);
                    return <label key={store.id} className={`flex items-start gap-2 text-xs ${alreadyLinked ? 'text-emerald-700' : 'text-slate-700'}`}>
                      <input
                        type="checkbox"
                        checked={alreadyLinked || selected}
                        disabled={alreadyLinked || busyUid === request.uid}
                        onChange={(e) => setSelectedStoreByUid((prev) => {
                          const currentIds = prev[request.uid] || [];
                          const nextIds = e.target.checked
                            ? [...currentIds, store.id]
                            : currentIds.filter((id) => id !== store.id);
                          return { ...prev, [request.uid]: nextIds };
                        })}
                        className="mt-0.5"
                      />
                      <span>{store.nomeFantasia || store.razaoSocial} — {store.cnpj}{alreadyLinked ? ' (já vinculado)' : ''}</span>
                    </label>;
                  })}
                </div>
              </div>
              <button type="button" disabled={busyUid === request.uid || !(selectedStoreByUid[request.uid] || []).some((id) => !linked.includes(id))} onClick={() => assignStore(request)} className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"><Link2 className="w-3.5 h-3.5" />{busyUid === request.uid ? 'Processando...' : linked.length ? 'Adicionar vínculo' : 'Aprovar e vincular'}</button>
              {pending && <button type="button" disabled={busyUid === request.uid} onClick={() => rejectRequest(request)} className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5"><XCircle className="w-3.5 h-3.5" />Rejeitar</button>}
            </div>}
            {request.status === 'approved' && linked.length === 0 && <p className="text-xs text-amber-700">Solicitação aprovada sem vínculo reconhecido. Revise o cadastro do estabelecimento.</p>}
          </article>;
        })}
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-start gap-2"><Clock3 className="w-3.5 h-3.5 mt-0.5 shrink-0" />CPF/CNPJ não comprova autorização. Antes de vincular, confirme a relação do solicitante com o estabelecimento. Um mesmo usuário pode receber vários vínculos, cada um aprovado separadamente.</div>
    </section>
  );
};
