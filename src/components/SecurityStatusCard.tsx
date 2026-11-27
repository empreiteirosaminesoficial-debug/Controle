import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CloudUpload, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  Clock, 
  Calendar,
  Lock,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Shield,
  Edit2,
  Trash2,
  Plus,
  X,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile } from '../types';
import { 
  DailyBackupReminderData, 
  getSecurityStatusInfo, 
  loadDailyBackupReminder, 
  recordBackupConfirmedToday,
  clearDailyBackupConfirmation
} from '../utils/dailyBackupReminder';
import { createCloudBackup, deleteCloudBackup } from '../utils/cloudDatabase';
import { loadScheduledBackupConfig } from '../utils/backupScheduler';

interface SecurityStatusCardProps {
  user: UserProfile;
  servicesCount: number;
  storesCount: number;
  onOpenFirebaseBackupSchedule?: () => void;
  onOpenAutoSync?: () => void;
  onBackupConfirmed?: () => void;
}

export const SecurityStatusCard: React.FC<SecurityStatusCardProps> = ({
  user,
  servicesCount,
  storesCount,
  onOpenFirebaseBackupSchedule,
  onOpenAutoSync,
  onBackupConfirmed,
}) => {
  const isAdmin = user?.role === 'admin' || (user?.email ? user.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com' : false);

  const [reminderData, setReminderData] = useState<DailyBackupReminderData>(() => loadDailyBackupReminder());
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Carrega status da rotina agendada
  const scheduledConfig = loadScheduledBackupConfig();
  const info = getSecurityStatusInfo(reminderData);

  useEffect(() => {
    // Sincroniza se houve execução recente
    const current = loadDailyBackupReminder();
    setReminderData(current);
  }, []);

  // --- Ação: Adicionar Backup Manual ---
  const handleConfirmManualBackup = async () => {
    if (isBackingUp) return;
    setIsBackingUp(true);
    setFeedback(null);

    try {
      // Cria o backup completo e comprimido no Firestore
      const backupResult = await createCloudBackup(
        'Confirmação diária de backup manual solicitada pelo administrador',
        user.email
      );

      if (backupResult) {
        // Registra confirmação diária de backup
        const updatedReminder = recordBackupConfirmedToday({
          userEmail: user.email,
          servicesCount,
          storesCount,
          backupId: backupResult.id,
        });

        setReminderData(updatedReminder);

        // Confetes de celebração por garantir a segurança
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });

        setFeedback({
          message: `Backup manual gravado no Cloud Firestore com sucesso! Cópia #${backupResult.id} confirmada.`,
          type: 'success',
        });

        if (onBackupConfirmed) {
          onBackupConfirmed();
        }
      } else {
        throw new Error('Não foi possível gravar o backup no Cloud Firestore.');
      }
    } catch (err: any) {
      console.error('Falha ao confirmar backup manual no Firestore:', err);
      setFeedback({
        message: err?.message || 'Falha ao conectar com o Cloud Firestore. Verifique sua conexão e tente novamente.',
        type: 'error',
      });
    } finally {
      setIsBackingUp(false);
    }
  };

  // --- Ação: Excluir Backup ---
  const handleConfirmDeleteBackup = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setFeedback(null);

    try {
      // Se houver ID de backup associado, tenta remover o documento remoto do Firestore
      if (reminderData.lastBackupId) {
        await deleteCloudBackup(reminderData.lastBackupId).catch((err) => {
          console.warn('Aviso ao remover documento de backup do Firestore:', err);
        });
      }

      // Limpa a confirmação local de hoje
      const cleared = clearDailyBackupConfirmation();
      setReminderData(cleared);
      setIsDeleteModalOpen(false);

      setFeedback({
        message: 'A cópia de confirmação de backup foi excluída com sucesso. O sistema voltou ao estado de confirmação pendente.',
        type: 'success',
      });
    } catch (err: any) {
      console.error('Falha ao excluir backup:', err);
      setFeedback({
        message: err?.message || 'Falha ao excluir o backup no Firestore.',
        type: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isSecure = info.level === 'secure';
  const isWarning = info.level === 'warning';
  const isCritical = info.level === 'critical';

  return (
    <>
      <div
        id="security-status-card"
        className={`rounded-2xl border transition-all duration-300 shadow-xs overflow-hidden ${
          isSecure
            ? 'bg-linear-to-br from-emerald-50/60 via-white to-slate-50 border-emerald-300'
            : isWarning
            ? 'bg-linear-to-br from-amber-50/80 via-white to-orange-50/30 border-amber-300 ring-2 ring-amber-400/20'
            : 'bg-linear-to-br from-rose-50/80 via-white to-red-50/30 border-rose-300 ring-2 ring-rose-400/20'
        }`}
      >
        {/* Top Banner Alert se o backup estiver pendente */}
        {!isSecure && (
          <div className={`px-4 py-2 text-xs font-bold flex items-center justify-between gap-2 ${
            isCritical 
              ? 'bg-rose-600 text-white animate-pulse' 
              : 'bg-amber-500 text-white'
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
              <span>
                {isCritical 
                  ? 'Atenção Crítica: Mais de 48h sem confirmação de backup no Firestore!'
                  : 'Lembrete Diário: Confirmação de backup pendente para a data de hoje.'}
              </span>
            </div>
            <span className="text-[11px] font-semibold opacity-90 hidden sm:inline">
              Proteção Diária Obrigatória
            </span>
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-4">
          {/* Header: Title, Shield Icon & Status Badge */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                isSecure 
                  ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-400/40' 
                  : isWarning
                  ? 'bg-amber-500/15 text-amber-700 border border-amber-400/40'
                  : 'bg-rose-500/15 text-rose-700 border border-rose-400/40'
              }`}>
                {isSecure ? (
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                ) : isWarning ? (
                  <ShieldAlert className="w-6 h-6 text-amber-600 animate-bounce" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-600 animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs uppercase font-extrabold tracking-wider text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Status de Segurança & Redundância
                  </span>
                  
                  {/* Badge de Status */}
                  {isSecure ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Protegido Hoje (100% Seguro)
                    </span>
                  ) : (
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 border ${
                      isCritical
                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Confirmação Pendente Hoje
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {info.title}
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                  {info.subtitle}
                </p>
              </div>
            </div>

            {/* Firestore Database Target Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-700 shrink-0 self-start sm:self-center">
              <Database className="w-4 h-4 text-sky-600" />
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block leading-none">Banco na Nuvem</span>
                <span className="font-mono text-[11px] font-semibold text-slate-800">Firestore Ativo</span>
              </div>
            </div>
          </div>

          {/* Informative Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {/* Card 1: Última Confirmação (Selector 1 target) */}
            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between gap-2.5 shadow-2xs group relative">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${
                  isSecure ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block truncate">
                    Última Confirmação
                  </span>
                  <span className="text-xs font-extrabold text-slate-800 block truncate">
                    {info.lastConfirmedFormatted}
                  </span>
                </div>
              </div>

              {/* Botões Inline para o Administrador em Card 1 */}
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenFirebaseBackupSchedule}
                    className="p-1 text-slate-400 hover:text-sky-700 hover:bg-sky-50 rounded-md transition cursor-pointer"
                    title="Editar horários de backup"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition cursor-pointer"
                    title="Excluir confirmação de backup"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Card 2: Dados Prontos para Backup */}
            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 flex items-center gap-2.5 shadow-2xs">
              <div className="p-2 rounded-lg bg-sky-100 text-sky-700 shrink-0">
                <Database className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block truncate">
                  Volume Protegido
                </span>
                <span className="text-xs font-extrabold text-slate-800 block truncate">
                  {servicesCount} serviços • {storesCount} lojas
                </span>
              </div>
            </div>

            {/* Card 3: Rotina Automática */}
            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 flex items-center gap-2.5 shadow-2xs">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-700 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block truncate">
                  Rotina Automática
                </span>
                <span className="text-xs font-extrabold text-slate-800 block truncate">
                  {scheduledConfig.enabled 
                    ? `${scheduledConfig.times.length} horários/dia` 
                    : 'Rotina Desativada'}
                </span>
              </div>
            </div>

            {/* Card 4: Nível de Integridade */}
            <div className="bg-white/80 border border-slate-200/80 rounded-xl p-3 flex items-center gap-2.5 shadow-2xs">
              <div className={`p-2 rounded-lg shrink-0 ${
                isSecure ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
              }`}>
                <Shield className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-wide text-slate-400 font-bold block truncate">
                  Integridade do Banco
                </span>
                <span className="text-xs font-extrabold text-emerald-700 block truncate">
                  {isSecure ? '100% Sincronizado' : 'Requer Confirmação'}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
              feedback.type === 'success' 
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                : 'bg-rose-100 text-rose-900 border border-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-slate-500 hover:text-slate-800 font-bold text-sm px-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Action Buttons Strip (Selector 2 target) - Com botões Editar, Excluir e Adicionar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Snapshot seguro com criptografia e redundância no Cloud Firestore.</span>
            </div>

            {/* BOTÕES DO ADMINISTRADOR: EDITAR, EXCLUIR, ADICIONAR */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* 1. BOTÃO EDITAR */}
              {isAdmin && onOpenFirebaseBackupSchedule && (
                <button
                  type="button"
                  id="btn-admin-edit-backup"
                  onClick={onOpenFirebaseBackupSchedule}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:border-sky-300"
                  title="Editar horários e configurações de backup no Firestore"
                >
                  <Edit2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>Editar</span>
                </button>
              )}

              {/* 2. BOTÃO EXCLUIR */}
              {isAdmin && (
                <button
                  type="button"
                  id="btn-admin-delete-backup"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs hover:border-rose-300"
                  title="Excluir ou limpar cópia de backup do Firestore"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Excluir</span>
                </button>
              )}

              {/* 3. BOTÃO ADICIONAR */}
              {isAdmin && (
                <button
                  type="button"
                  id="btn-admin-add-backup"
                  onClick={handleConfirmManualBackup}
                  disabled={isBackingUp}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-sm ${
                    isBackingUp
                      ? 'bg-slate-400 text-white cursor-not-allowed'
                      : isSecure
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/20'
                      : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-amber-600/30 scale-[1.02] ring-2 ring-amber-400/40'
                  }`}
                  title="Adicionar e confirmar novo backup manual no Firestore agora"
                >
                  {isBackingUp ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Gravando no Firestore...</span>
                    </>
                  ) : isSecure ? (
                    <>
                      <Plus className="w-4 h-4 text-white" />
                      <span>Adicionar Novo Backup</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-white" />
                      <span>Adicionar / Confirmar Backup</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Excluir Backup (Apenas para o Administrador) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Excluir / Limpar Backup</h3>
                  <p className="text-[11px] text-slate-500">Ação de gerenciamento exclusivo do Administrador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Confirmação de Exclusão</span>
                </div>
                <p className="leading-relaxed">
                  Deseja excluir a confirmação do backup atual? Ao confirmar:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] opacity-90 pl-1">
                  <li>O status de segurança do dia voltará para <strong>Pendente</strong>.</li>
                  <li>O snapshot remoto correspondente no Firestore será revogado/removido.</li>
                  <li>Um novo backup manual precisará ser confirmado pelo administrador.</li>
                </ul>
              </div>

              {reminderData.lastConfirmedTimestamp && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Detalhes do Registro:</span>
                  <div className="flex justify-between">
                    <span className="font-medium">Data/Hora:</span>
                    <span className="font-bold">{info.lastConfirmedFormatted}</span>
                  </div>
                  {reminderData.lastBackupId && (
                    <div className="flex justify-between">
                      <span className="font-medium">Identificador:</span>
                      <span className="font-mono text-[11px]">{reminderData.lastBackupId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteBackup}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
