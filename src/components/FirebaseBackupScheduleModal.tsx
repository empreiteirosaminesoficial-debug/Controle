import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  Cloud,
  Database,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Download,
  RefreshCw,
  Plus,
  X,
  Save,
  Check,
  HardDrive,
  Layers,
  Building2,
  Sparkles,
  Lock,
  ArrowRight,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { CloudBackupItem, ScheduledBackupConfig, ScheduledBackupFrequency, UserProfile, GoogleDriveBackupFile } from '../types';
import { 
  loadScheduledBackupConfig, 
  saveScheduledBackupConfig, 
  syncScheduleConfigToFirestore, 
  calculateNextScheduledRun,
  executeScheduledFirebaseBackup 
} from '../utils/backupScheduler';
import { listCloudBackups, deleteCloudBackup, restoreCloudBackup } from '../utils/cloudDatabase';
import { 
  uploadClientBackupToDrive, 
  listGoogleDriveBackups, 
  deleteGoogleDriveBackup 
} from '../utils/googleDriveBackup';
import { loadServices, loadStores, loadObras, loadVisitas } from '../utils/storage';
import { formatDateTime, formatRelativeTime } from '../utils/formatters';

interface FirebaseBackupScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onReloadData: () => void;
  initialTab?: 'schedule' | 'drive' | 'history';
}

const PRESET_SCHEDULES = [
  {
    name: 'Comercial (3x ao dia)',
    description: 'Manhã, almoço e encerramento',
    times: ['08:00', '13:00', '18:00'],
  },
  {
    name: 'A cada 4 Horas (6x ao dia)',
    description: 'Proteção intensiva durante o dia',
    times: ['04:00', '08:00', '12:00', '16:00', '20:00', '00:00'],
  },
  {
    name: 'A cada 6 Horas (4x ao dia)',
    description: 'Recomendado para equilíbrio de redundância',
    times: ['06:00', '12:00', '18:00', '00:00'],
  },
  {
    name: 'Encerramento Noturno',
    description: 'No final do expediente e na madrugada',
    times: ['21:00', '23:30'],
  },
];

const DAYS_OF_WEEK = [
  { id: 0, label: 'Dom', full: 'Domingo' },
  { id: 1, label: 'Seg', full: 'Segunda-feira' },
  { id: 2, label: 'Ter', full: 'Terça-feira' },
  { id: 3, label: 'Qua', full: 'Quarta-feira' },
  { id: 4, label: 'Qui', full: 'Quinta-feira' },
  { id: 5, label: 'Sex', full: 'Sexta-feira' },
  { id: 6, label: 'Sáb', full: 'Sábado' },
];

export const FirebaseBackupScheduleModal: React.FC<FirebaseBackupScheduleModalProps> = ({
  isOpen,
  onClose,
  user,
  onReloadData,
  initialTab = 'schedule',
}) => {
  const isAdmin = user?.role === 'admin' || (user?.email ? user.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com' : false);

  const [config, setConfig] = useState<ScheduledBackupConfig>(loadScheduledBackupConfig());
  const [newTimeInput, setNewTimeInput] = useState('18:00');
  const [backupsList, setBackupsList] = useState<CloudBackupItem[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isExecutingNow, setIsExecutingNow] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'drive' | 'history'>(initialTab);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);

  // Google Drive Integration States
  const [driveBackups, setDriveBackups] = useState<GoogleDriveBackupFile[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [showDriveConfirm, setShowDriveConfirm] = useState(false);

  const fetchBackups = useCallback(async () => {
    setIsLoadingBackups(true);
    try {
      const items = await listCloudBackups(30);
      setBackupsList(items);
    } catch (err: any) {
      console.warn('Falha ao carregar lista de backups do Firebase:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  }, []);

  const fetchDriveBackups = useCallback(async () => {
    setIsLoadingDrive(true);
    try {
      const items = await listGoogleDriveBackups();
      setDriveBackups(items);
    } catch (err: any) {
      console.warn('Falha ao carregar lista de backups do Google Drive:', err);
    } finally {
      setIsLoadingDrive(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      const loaded = loadScheduledBackupConfig();
      setConfig(loaded);
      fetchBackups();
      fetchDriveBackups();
    }
  }, [isOpen, initialTab, fetchBackups, fetchDriveBackups]);

  if (!isOpen) return null;

  // Próximo agendamento calculado dinamicamente
  const nextRun = calculateNextScheduledRun(config);

  const handleSaveSettings = async () => {
    saveScheduledBackupConfig(config);
    setSaveSuccess(true);
    await syncScheduleConfigToFirestore(config);
    setFeedback({
      type: 'success',
      message: 'Rotina de horários e políticas de redundância salvas no Firebase!',
    });
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3500);
  };

  const handleAddTime = () => {
    if (!newTimeInput || !newTimeInput.includes(':')) return;
    const [h, m] = newTimeInput.split(':').map(Number);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return;

    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (!config.times.includes(formatted)) {
      const updatedTimes = [...config.times, formatted].sort();
      setConfig((prev) => ({ ...prev, times: updatedTimes }));
    }
  };

  const handleRemoveTime = (timeToRemove: string) => {
    if (config.times.length <= 1) {
      setFeedback({
        type: 'error',
        message: 'Mantenha pelo menos um horário configurado para os backups agendados.',
      });
      return;
    }
    setConfig((prev) => ({
      ...prev,
      times: prev.times.filter((t) => t !== timeToRemove),
    }));
  };

  const handleApplyPreset = (presetTimes: string[]) => {
    setConfig((prev) => ({
      ...prev,
      times: [...presetTimes].sort(),
    }));
    setFeedback({
      type: 'success',
      message: `Preset aplicado! Não se esqueça de salvar as alterações.`,
    });
  };

  const handleToggleDay = (dayId: number) => {
    const current = config.customDays || [];
    let updated: number[];
    if (current.includes(dayId)) {
      if (current.length <= 1) {
        setFeedback({
          type: 'error',
          message: 'Selecione pelo menos um dia da semana para o agendamento.',
        });
        return;
      }
      updated = current.filter((d) => d !== dayId);
    } else {
      updated = [...current, dayId].sort();
    }
    setConfig((prev) => ({ ...prev, customDays: updated }));
  };

  const handleManualBackupNow = async () => {
    setIsExecutingNow(true);
    setFeedback(null);
    try {
      const res = await executeScheduledFirebaseBackup('manual', undefined, user.email);
      if (res.success && res.backup) {
        setFeedback({
          type: 'success',
          message: `Backup realizado com sucesso no Firebase! ${res.backup.servicesCount} serviços e ${res.backup.storesCount} lojas armazenados com segurança.`,
        });
        await fetchBackups();
        setConfig(loadScheduledBackupConfig());
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Falha ao salvar backup no Firebase.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado na gravação em nuvem.',
      });
    } finally {
      setIsExecutingNow(false);
    }
  };

  const handleDownloadBackupJSON = (backup: CloudBackupItem) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `samines-firebase-backup-${backup.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleRestoreBackup = async (backup: CloudBackupItem) => {
    try {
      const res = await restoreCloudBackup(backup);
      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Backup restaurado com sucesso! ${res.servicesCount} serviços e ${res.storesCount} lojas recarregados.`,
        });
        setConfirmRestoreId(null);
        onReloadData();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Falha ao restaurar dados do backup.',
      });
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir permanentemente esta cópia de backup do Firebase?')) {
      return;
    }
    try {
      const ok = await deleteCloudBackup(backupId);
      if (ok) {
        setFeedback({
          type: 'success',
          message: 'Cópia de backup excluída do Firebase.',
        });
        await fetchBackups();
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro ao excluir backup.',
      });
    }
  };

  const handleExecuteDriveBackupNow = async () => {
    setShowDriveConfirm(false);
    setIsUploadingToDrive(true);
    setFeedback(null);
    try {
      const res = await uploadClientBackupToDrive({
        services: loadServices(),
        stores: loadStores(),
        obras: loadObras(),
        visitas: loadVisitas(),
        clientEmail: user.email,
        clientName: user.name,
        isAutoScheduled: false,
        customNote: `Backup de clientes para Google Drive executado por ${user.name}`,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: `Backup dos clientes salvo com sucesso no Google Drive: ${res.fileName}`,
        });
        await fetchDriveBackups();
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Falha ao salvar backup no Google Drive.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado na sincronização com o Google Drive.',
      });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const handleDeleteDriveFile = async (file: GoogleDriveBackupFile) => {
    if (!window.confirm(`Tem certeza de que deseja excluir permanentemente o arquivo "${file.name}" do Google Drive? Esta ação é irreversível.`)) {
      return;
    }
    const ok = await deleteGoogleDriveBackup(file.id, file.name);
    if (ok) {
      setFeedback({
        type: 'success',
        message: `Arquivo "${file.name}" excluído do Google Drive com sucesso.`,
      });
      fetchDriveBackups();
    } else {
      setFeedback({
        type: 'error',
        message: 'Falha ao excluir arquivo do Google Drive.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Agendador de Backups no Firebase
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  Redundância em Nuvem
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Horários automáticos de salvamento no Firestore e políticas de retenção seguras
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                title="Salvar alterações de agendamento"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveSuccess ? 'Salvo no Firebase!' : 'Salvar Alterações'}</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-slate-50/40">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'schedule'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Horários Agendados & Políticas</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('drive');
                fetchDriveBackups();
              }}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'drive'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Google Drive (04:00 AM)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'history'
                  ? 'border-sky-600 text-sky-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Backups Armazenados no Firebase ({backupsList.length})</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Firestore Seguro: <strong>/backups</strong></span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Admin restriction banner if client user */}
          {!isAdmin && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2.5 text-xs text-amber-800">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Modo Somente Leitura:</strong> Apenas o administrador geral (gestor) pode definir ou alterar os horários de backup no Firebase.
              </span>
            </div>
          )}

          {/* Feedback message banner */}
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
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
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Live Status Card */}
          <div className="p-4 rounded-xl border border-sky-150 bg-linear-to-r from-sky-50/80 via-indigo-50/30 to-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${
                    !config.enabled
                      ? 'bg-slate-200 text-slate-600'
                      : isExecutingNow
                      ? 'bg-sky-100 text-sky-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {isExecutingNow ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-sky-600" />
                  ) : (
                    <Clock className="w-6 h-6" />
                  )}
                </div>
                {config.enabled && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {config.enabled ? 'Agendamento Automático Ativo' : 'Agendamento em Nuvem Pausado'}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      config.enabled
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {config.enabled ? `${config.times.length} horários/dia` : 'Desativado'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Próximo backup: <strong>{nextRun ? `${nextRun.timeStr} (${formatDateTime(nextRun.nextDate.toISOString())})` : 'Nenhum agendado'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Último: <strong>{config.lastExecutedAt ? formatRelativeTime(config.lastExecutedAt) : 'Nenhum recente'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Retenção: <strong>{config.maxRetentionCount > 0 ? `Até ${config.maxRetentionCount} snapshots` : 'Ilimitada'}</strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleManualBackupNow}
              disabled={isExecutingNow}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isExecutingNow ? 'animate-spin' : ''}`} />
              <span>{isExecutingNow ? 'Gravando no Firebase...' : 'Fazer Backup Agora'}</span>
            </button>
          </div>

          {/* TAB 1: SCHEDULE CONFIGURATION */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* Enable / Disable Switch */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    Ativar Rotina Automática de Backups no Firebase
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Executa snapshots automáticos nos horários programados para redundância total e prevenção de perda de dados.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setConfig((prev) => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                    config.enabled ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Times Management */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-sky-600" />
                      <span>Horários Diários Programados</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      O sistema grava automaticamente um snapshot completo do Firestore nos horários abaixo
                    </p>
                  </div>
                  <span className="text-xs text-sky-700 font-bold bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
                    {config.times.length} {config.times.length === 1 ? 'Horário' : 'Horários'}
                  </span>
                </div>

                {/* Chips of scheduled times */}
                <div className="flex flex-wrap items-center gap-2">
                  {config.times.map((timeStr) => (
                    <span
                      key={timeStr}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 font-bold text-xs shadow-2xs"
                    >
                      <Clock className="w-3.5 h-3.5 text-sky-600" />
                      <span>{timeStr}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(timeStr)}
                          className="ml-1 text-sky-400 hover:text-rose-600 hover:bg-sky-100 p-0.5 rounded transition"
                          title={`Remover horário ${timeStr}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {/* Add new time input */}
                {isAdmin && (
                  <div className="pt-2 border-t border-slate-150 flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-slate-700">Adicionar novo horário:</span>
                    <input
                      type="time"
                      value={newTimeInput}
                      onChange={(e) => setNewTimeInput(e.target.value)}
                      className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-bold focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddTime}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-sky-600" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                )}

                {/* Quick Presets */}
                {isAdmin && (
                  <div className="pt-2 border-t border-slate-150">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Modelos Rápidos Pré-configurados:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {PRESET_SCHEDULES.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => handleApplyPreset(preset.times)}
                          className="p-2.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/40 text-left transition flex items-center justify-between gap-2 cursor-pointer group"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-sky-700">
                              {preset.name}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              {preset.description} ({preset.times.join(', ')})
                            </p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Frequency & Days */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-600" />
                    <span>Frequência e Dias de Execução</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Defina em quais dias da semana o agendamento de backups deve ser executado
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setConfig((prev) => ({ ...prev, frequency: 'daily' }))}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      config.frequency === 'daily'
                        ? 'border-sky-500 bg-sky-50/70 text-sky-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">Todos os Dias</p>
                    <p className="text-[10px] text-slate-500 font-normal">7 dias por semana (Seg a Dom)</p>
                  </button>

                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setConfig((prev) => ({ ...prev, frequency: 'weekdays' }))}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      config.frequency === 'weekdays'
                        ? 'border-sky-500 bg-sky-50/70 text-sky-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">Dias Úteis</p>
                    <p className="text-[10px] text-slate-500 font-normal">Segunda a Sexta-feira</p>
                  </button>

                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() => setConfig((prev) => ({ ...prev, frequency: 'custom_days' }))}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                      config.frequency === 'custom_days'
                        ? 'border-sky-500 bg-sky-50/70 text-sky-900 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <p className="text-xs font-bold">Personalizado</p>
                    <p className="text-[10px] text-slate-500 font-normal">Escolher dias específicos</p>
                  </button>
                </div>

                {/* Custom days chips */}
                {config.frequency === 'custom_days' && (
                  <div className="pt-2 flex flex-wrap items-center gap-1.5">
                    {DAYS_OF_WEEK.map((d) => {
                      const isSelected = (config.customDays || []).includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => handleToggleDay(d.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white shadow-2xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Redundancy & Retention Policy */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>Política de Redundância e Retenção no Firebase</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Garante histórico temporal redundante de restauração enquanto recicla snapshots antigos automaticamente
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">
                      Limite Máximo de Snapshots Preservados:
                    </label>
                    <select
                      disabled={!isAdmin}
                      value={config.maxRetentionCount}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          maxRetentionCount: Number(e.target.value),
                        }))
                      }
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-sky-500"
                    >
                      <option value={7}>Últimos 7 Backups (Semanal)</option>
                      <option value={15}>Últimos 15 Backups (Recomendado)</option>
                      <option value={30}>Últimos 30 Backups (Mensal Completo)</option>
                      <option value={60}>Últimos 60 Backups (Bimestral)</option>
                      <option value={0}>Ilimitado (Nunca excluir automaticamente)</option>
                    </select>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-200 text-[11px] text-emerald-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Como funciona a redundância:</strong> O Firebase armazena múltiplas cópias em pontos temporais diferentes. Se ocorrer uma exclusão acidental ou falha de conexão, você pode reverter para qualquer horário anterior.
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-150 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      Notificar na Central de Notificações
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Gera um alerta de sucesso na Central a cada conclusão do backup agendado
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!isAdmin}
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        notifyOnSuccess: !prev.notifyOnSuccess,
                      }))
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50 ${
                      config.notifyOnSuccess ? 'bg-sky-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        config.notifyOnSuccess ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: GOOGLE DRIVE (04:00 AM CLIENT BACKUPS) */}
          {activeTab === 'drive' && (
            <div className="space-y-6">
              {/* Drive Header / Banner */}
              <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-2xl p-5 text-white shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 text-emerald-300 flex items-center justify-center shrink-0">
                      <HardDrive className="w-6 h-6 text-emerald-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-white tracking-tight">
                          Google Drive • Backup Diário às 04:00 AM
                        </h3>
                        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                          {config.googleDriveEnabled !== false ? 'Agendamento Ativo' : 'Pausado'}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-200/90 mt-1 max-w-xl leading-relaxed">
                        Cópia de segurança dedicada para os clientes contendo todos os serviços, lojas, obras e relatórios técnicos.
                        Armazenada na pasta <strong>"Backups Empreiteiro Saminês - Clientes"</strong> na sua conta do Google Drive.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDriveConfirm(true)}
                      disabled={isUploadingToDrive}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {isUploadingToDrive ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Enviando ao Drive...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-4 h-4" />
                          <span>Fazer Backup Agora</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={fetchDriveBackups}
                      disabled={isLoadingDrive}
                      className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition border border-white/20 cursor-pointer"
                      title="Recarregar arquivos do Google Drive"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-white/10 text-xs">
                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-amber-300 shrink-0" />
                    <div>
                      <span className="text-[10px] text-emerald-200 block">Horário Automático</span>
                      <strong className="text-white font-bold">{config.googleDriveScheduledTime || '04:00'} (Madrugada)</strong>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
                    <div>
                      <span className="text-[10px] text-emerald-200 block">Pasta no Google Drive</span>
                      <strong className="text-white font-bold truncate block">Backups Empreiteiro Saminês - Clientes</strong>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 flex items-center gap-2.5">
                    <Database className="w-4 h-4 text-sky-300 shrink-0" />
                    <div>
                      <span className="text-[10px] text-emerald-200 block">Último Arquivo no Drive</span>
                      <strong className="text-white font-bold truncate block">
                        {config.lastGoogleDriveBackupAt ? formatDateTime(config.lastGoogleDriveBackupAt) : 'Pendente / 04:00 AM'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirmation Dialog for Immediate Drive Backup */}
              {showDriveConfirm && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 space-y-3 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 text-amber-800 rounded-xl shrink-0 mt-0.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-amber-950 text-sm">
                        Confirmar Envio Imediato para o Google Drive?
                      </h4>
                      <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                        Será gerado um arquivo compactado JSON com os dados completos de clientes, serviços, estabelecimentos, obras e vistorias.
                        O arquivo será enviado diretamente para a pasta oficial <strong>"Backups Empreiteiro Saminês - Clientes"</strong> na nuvem do Google Drive.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-amber-200">
                    <button
                      type="button"
                      onClick={() => setShowDriveConfirm(false)}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleExecuteDriveBackupNow}
                      disabled={isUploadingToDrive}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <HardDrive className="w-3.5 h-3.5" />
                      <span>Sim, Enviar Agora para o Drive</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Admin Configuration Settings for Drive */}
              {isAdmin && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>Configurações do Backup Automático das 04:00 AM</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-semibold">Exclusivo Gestão</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 block">
                        Horário do Backup Noturno no Drive
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={config.googleDriveScheduledTime || '04:00'}
                          onChange={(e) => {
                            setConfig((prev) => ({
                              ...prev,
                              googleDriveScheduledTime: e.target.value,
                            }));
                          }}
                          className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                        />
                        <span className="text-xs text-slate-500">
                          (Padrão: 04:00 AM todas as madrugadas)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">Ativar Rotina no Drive</span>
                        <span className="text-[11px] text-slate-500">Executar diariamente no horário definido</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            googleDriveEnabled: prev.googleDriveEnabled === false ? true : false,
                          }));
                        }}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                          config.googleDriveEnabled !== false ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            config.googleDriveEnabled !== false ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* List of Files currently stored in Google Drive */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-emerald-600" />
                      <span>Arquivos Salvos no Google Drive ({driveBackups.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Snapshots de redundância armazenados com segurança na nuvem do Google Drive
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={fetchDriveBackups}
                    disabled={isLoadingDrive}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDrive ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                  </button>
                </div>

                {isLoadingDrive ? (
                  <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                    <span>Buscando arquivos na pasta do Google Drive...</span>
                  </div>
                ) : driveBackups.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                    <HardDrive className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Nenhum arquivo de backup encontrado ainda no Google Drive.
                    </p>
                    <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                      O sistema executará automaticamente o backup às 04:00 AM, ou você pode gerar um agora mesmo clicando no botão abaixo.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowDriveConfirm(true)}
                      disabled={isUploadingToDrive}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                    >
                      Criar Primeiro Backup no Google Drive
                    </button>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-150">
                    {driveBackups.map((file) => (
                      <div
                        key={file.id}
                        className="p-3.5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 truncate">
                              {file.name}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Google Drive
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <span>Criado em: <strong>{formatDateTime(file.createdTime)}</strong></span>
                            {file.size && (
                              <>
                                <span>•</span>
                                <span>Tamanho: <strong>{(Number(file.size) / 1024).toFixed(1)} KB</strong></span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                              title="Abrir diretamente no Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Abrir no Drive</span>
                            </a>
                          )}

                          {file.webContentLink && (
                            <a
                              href={file.webContentLink}
                              download
                              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                              title="Baixar arquivo JSON do Google Drive"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDriveFile(file)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Excluir este arquivo do Google Drive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STORED BACKUPS IN FIREBASE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-sky-600" />
                    <span>Backups Disponíveis no Firestore ({backupsList.length})</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Snapshots com serviços, lojas, comprovantes e usuários salvos com segurança
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchBackups}
                  disabled={isLoadingBackups}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                  <span>Atualizar</span>
                </button>
              </div>

              {isLoadingBackups ? (
                <div className="p-8 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 text-sky-600 animate-spin" />
                  <span>Carregando backups do banco de dados Firebase...</span>
                </div>
              ) : backupsList.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
                  <Cloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">
                    Nenhum backup encontrado na coleção /backups do Firebase.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Clique no botão abaixo para gravar o primeiro snapshot imediatamente ou aguarde o próximo horário programado.
                  </p>
                  <button
                    onClick={handleManualBackupNow}
                    disabled={isExecutingNow}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow-xs transition"
                  >
                    Criar Primeiro Backup Agora
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-150">
                  {backupsList.map((item) => {
                    const isConfirming = confirmRestoreId === item.id;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 hover:bg-slate-50/60 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">
                              {formatDateTime(item.timestamp)}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              #{item.id}
                            </span>
                            {item.notes && item.notes.includes('Agendado') ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                                Automático
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                Manual
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1">
                              <Layers className="w-3.5 h-3.5 text-slate-400" />
                              <strong>{item.servicesCount}</strong> serviços
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-slate-400" />
                              <strong>{item.storesCount}</strong> lojas
                            </span>
                            <span>•</span>
                            <span>{item.createdBy}</span>
                          </div>

                          {item.notes && (
                            <p className="text-[11px] text-slate-600 italic">
                              "{item.notes}"
                            </p>
                          )}
                        </div>

                        {/* Actions for this backup */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
                          {isConfirming ? (
                            <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 p-1.5 rounded-lg animate-in fade-in">
                              <span className="text-[11px] font-bold text-amber-800 px-1">
                                Confirmar Restauração?
                              </span>
                              <button
                                onClick={() => handleRestoreBackup(item)}
                                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-md shadow-2xs cursor-pointer"
                              >
                                Sim, Restaurar
                              </button>
                              <button
                                onClick={() => setConfirmRestoreId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold rounded-md cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleDownloadBackupJSON(item)}
                                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                                title="Baixar arquivo JSON deste backup"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {isAdmin && (
                                <button
                                  onClick={() => setConfirmRestoreId(item.id)}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg transition flex items-center gap-1 cursor-pointer"
                                  title="Restaurar dados para este ponto no tempo"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Restaurar</span>
                                </button>
                              )}

                              {isAdmin && (
                                <button
                                  onClick={() => handleDeleteBackup(item.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                  title="Excluir este backup do Firebase"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Redundância Firebase Firestore: <strong>empreiteirosaminesgestao (banco padrão)</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-lg shadow-sm shadow-sky-600/20 flex items-center gap-1.5 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{saveSuccess ? 'Configurações Salvas!' : 'Salvar no Firebase'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
