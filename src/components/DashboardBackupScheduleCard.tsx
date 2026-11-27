import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Clock, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  Check, 
  Settings2,
  HardDrive
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, ScheduledBackupConfig } from '../types';
import { 
  loadScheduledBackupConfig, 
  calculateNextScheduledRun,
  executeScheduledFirebaseBackup
} from '../utils/backupScheduler';
import { formatRelativeTime } from '../utils/formatters';

interface DashboardBackupScheduleCardProps {
  user: UserProfile;
  servicesCount: number;
  storesCount: number;
  onOpenFirebaseBackupSchedule: () => void;
  onBackupSuccess?: () => void;
}

export const DashboardBackupScheduleCard: React.FC<DashboardBackupScheduleCardProps> = ({
  user,
  servicesCount,
  storesCount,
  onOpenFirebaseBackupSchedule,
  onBackupSuccess,
}) => {
  const [config, setConfig] = useState<ScheduledBackupConfig>(loadScheduledBackupConfig());
  const [isExecutingNow, setIsExecutingNow] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Recarrega configuração e calcula próximo horário
  useEffect(() => {
    const handleStorageChange = () => {
      setConfig(loadScheduledBackupConfig());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const nextRun = calculateNextScheduledRun(config);

  const handleExecuteBackupNow = async () => {
    if (isExecutingNow) return;
    setIsExecutingNow(true);
    setFeedback(null);

    try {
      const res = await executeScheduledFirebaseBackup('manual', undefined, user.email);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: 'Backup instantâneo salvo com sucesso no Firebase Firestore!',
        });
        setConfig(loadScheduledBackupConfig());
        if (onBackupSuccess) onBackupSuccess();

        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 },
          });
        } catch {
          // ignore
        }
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Falha ao processar backup no Firestore.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado ao conectar com o banco Firestore.',
      });
    } finally {
      setIsExecutingNow(false);
      setTimeout(() => setFeedback(null), 6000);
    }
  };

  const isConfigured = config.enabled && config.times && config.times.length > 0;

  return (
    <div className="bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-slate-700/80 relative overflow-hidden transition-all duration-300 group">
      {/* Luzes de fundo decorativas */}
      <div className="absolute -top-16 -right-16 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-sky-500/20 transition-all duration-500" />
      <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-500" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        
        {/* Esquerda: Informações e Status da Redundância */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="w-8 h-8 rounded-xl bg-white/10 text-sky-400 border border-white/10 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-sky-300" />
            </span>

            <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-300">
              Redundância & Proteção Contínua
            </span>

            {/* Status Badge */}
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Agendamento Ativo no Firestore
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Agendamento Pausado
              </span>
            )}
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>Backup Agendado no Firestore</span>
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Defina horários específicos do dia para criar cópias automáticas e redundantes de todos os serviços ({servicesCount}), lojas ({storesCount}), visitas e comprovantes diretamente no banco de dados na nuvem.
            </p>
          </div>

          {/* Horários Definidos & Próxima Execução */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-slate-400 text-[11px]">Horários definidos:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {config.times && config.times.length > 0 ? (
                  config.times.map((time) => (
                    <span 
                      key={time} 
                      className="bg-sky-500/20 border border-sky-400/30 text-sky-200 text-[11px] font-bold px-1.5 py-0.5 rounded-md"
                    >
                      {time}
                    </span>
                  ))
                ) : (
                  <span className="text-amber-300 text-[11px] italic">Nenhum horário definido</span>
                )}
              </div>
            </div>

            {nextRun && (
              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-400 text-[11px]">Próxima execução:</span>
                <strong className="text-emerald-300 text-[11px]">
                  {nextRun.nextDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })} às {nextRun.timeStr}
                </strong>
              </div>
            )}

            {config.lastExecutedAt && (
              <span className="text-[11px] text-slate-400">
                Último backup: {formatRelativeTime(config.lastExecutedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Direita: Botões de Ação no Dashboard */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 w-full sm:w-auto">
          {/* Botão Principal: Acessar configuração de horários */}
          <button
            type="button"
            id="btn-dashboard-backup-schedule"
            onClick={onOpenFirebaseBackupSchedule}
            className="w-full sm:w-auto px-5 py-3 bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:from-emerald-700 active:to-teal-800 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer transform hover:-translate-y-0.5"
            title="Acessar configuração de Backup Agendado no Firestore para definir horários específicos"
          >
            <Clock className="w-4 h-4 text-white" />
            <span>Configurar Horários de Backup</span>
            <ArrowRight className="w-4 h-4 text-emerald-200" />
          </button>

          {/* Botão Secundário: Backup Manual Imediato */}
          <button
            type="button"
            id="btn-dashboard-backup-now"
            onClick={handleExecuteBackupNow}
            disabled={isExecutingNow}
            className={`w-full sm:w-auto px-4 py-2.5 bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/15 text-white font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer ${
              isExecutingNow ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            title="Criar um snapshot instantâneo de segurança no Firestore agora"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-300 ${isExecutingNow ? 'animate-spin' : ''}`} />
            <span>{isExecutingNow ? 'Salvando no Firestore...' : 'Fazer Backup Agora'}</span>
          </button>
        </div>

      </div>

      {/* Feedback Toast Inline */}
      {feedback && (
        <div className={`mt-3.5 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200' 
            : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};
