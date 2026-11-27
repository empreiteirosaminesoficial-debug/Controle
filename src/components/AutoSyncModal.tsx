import React, { useState, useRef } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Building2, 
  Clock, 
  X, 
  Settings2, 
  ShieldCheck, 
  FileJson,
  Trash2,
  HardDrive,
  Save,
  Check,
  CloudUpload,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ServiceRecord, StoreProfile, SyncLogEntry, SyncSettings, SyncStatus, UserProfile } from '../types';
import { downloadBackupFile, restoreBackupFile, getAutoBackupSnapshot } from '../utils/sync';
import { formatRelativeTime } from '../utils/formatters';
import { 
  uploadInstantBackupToFirebaseStorage, 
  StorageBackupMetadata, 
  formatBytes 
} from '../utils/firebaseStorageBackup';

interface AutoSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  syncSettings: SyncSettings;
  onUpdateSettings: (newSettings: SyncSettings) => void;
  syncLogs: SyncLogEntry[];
  onClearLogs: () => void;
  onTriggerSync: () => Promise<void>;
  services: ServiceRecord[];
  stores: StoreProfile[];
  user: UserProfile;
  onReloadData: () => void;
  onOpenFirebaseBackupSchedule?: () => void;
}

export const AutoSyncModal: React.FC<AutoSyncModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  syncSettings,
  onUpdateSettings,
  syncLogs,
  onClearLogs,
  onTriggerSync,
  services,
  stores,
  user,
  onReloadData,
  onOpenFirebaseBackupSchedule,
}) => {
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [isUploadingToStorage, setIsUploadingToStorage] = useState(false);
  const [storageUploadSuccess, setStorageUploadSuccess] = useState<StorageBackupMetadata | null>(null);
  const [storageUploadError, setStorageUploadError] = useState<string | null>(null);
  const [restoreFeedback, setRestoreFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [saveConfigSuccess, setSaveConfigSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const autoSnapshot = getAutoBackupSnapshot();

  const handleUploadInstantStorageBackup = async () => {
    setIsUploadingToStorage(true);
    setStorageUploadError(null);
    try {
      const res = await uploadInstantBackupToFirebaseStorage({
        customServices: services,
        customStores: stores,
        userEmail: user.email,
        notes: 'Backup instantâneo manual via AutoSyncModal em formato JSON comprimido (gzip)',
      });

      if (res.success && res.metadata) {
        setStorageUploadSuccess(res.metadata);
      } else {
        setStorageUploadError(res.error || 'Falha ao concluir upload para o Firebase Storage.');
      }
    } catch (err: any) {
      setStorageUploadError(err?.message || 'Erro inesperado durante o upload para o Firebase Storage.');
    } finally {
      setIsUploadingToStorage(false);
    }
  };

  const handleSaveSettings = () => {
    onUpdateSettings(syncSettings);
    setSaveConfigSuccess(true);
    setTimeout(() => {
      setSaveConfigSuccess(false);
    }, 3000);
  };

  const handleManualSyncClick = async () => {
    setIsSyncingNow(true);
    try {
      await onTriggerSync();
    } finally {
      setTimeout(() => {
        setIsSyncingNow(false);
      }, 600);
    }
  };

  const handleToggleAutoSync = () => {
    onUpdateSettings({
      ...syncSettings,
      autoSyncEnabled: !syncSettings.autoSyncEnabled,
    });
  };

  const handleIntervalChange = (val: number) => {
    onUpdateSettings({
      ...syncSettings,
      syncIntervalSeconds: val,
    });
  };

  const handleToggleCrossTab = () => {
    onUpdateSettings({
      ...syncSettings,
      crossTabSyncEnabled: !syncSettings.crossTabSyncEnabled,
    });
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      if (!content) {
        setRestoreFeedback({
          type: 'error',
          message: 'O arquivo selecionado está vazio.',
        });
        return;
      }

      const res = restoreBackupFile(content);
      if (res.success) {
        setRestoreFeedback({
          type: 'success',
          message: `Backup restaurado com sucesso! ${res.servicesCount} serviços e ${res.storesCount} lojas recarregados.`,
        });
        onReloadData();
      } else {
        setRestoreFeedback({
          type: 'error',
          message: res.error || 'Erro ao importar arquivo de backup.',
        });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Sincronização Automática de Dados
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Tempo Real
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Sincronia instantânea entre abas, dispositivos, backup em segundo plano e proteção
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-sync-header-save-alteracoes"
              onClick={handleSaveSettings}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              title="Salvar todas as alterações"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saveConfigSuccess ? 'Salvo!' : 'Salvar Alterações'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status Banner Card */}
          <div className="p-4 rounded-xl border border-sky-150 bg-linear-to-r from-sky-50/80 via-indigo-50/40 to-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-xs ${
                  syncStatus === 'offline' 
                    ? 'bg-amber-100 text-amber-700' 
                    : syncStatus === 'syncing' || isSyncingNow
                    ? 'bg-sky-100 text-sky-700' 
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {syncStatus === 'offline' ? (
                    <WifiOff className="w-6 h-6" />
                  ) : syncStatus === 'syncing' || isSyncingNow ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-6 h-6" />
                  )}
                </div>
                {syncStatus !== 'offline' && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {syncStatus === 'offline' 
                      ? 'Modo Offline - Dados Salvos Localmente' 
                      : syncStatus === 'syncing' || isSyncingNow
                      ? 'Sincronizando Dados em Segundo Plano...'
                      : 'Todos os Dados Sincronizados e Protegidos'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Última sincronização:{' '}
                    <strong>
                      {syncSettings.lastSyncedAt ? formatRelativeTime(syncSettings.lastSyncedAt) : 'Agora mesmo'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{services.length}</strong> serviços
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <strong>{stores.length}</strong> lojas
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleManualSyncClick}
              disabled={isSyncingNow}
              className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
              <span>{isSyncingNow ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>

          {/* Feedback message if any */}
          {restoreFeedback && (
            <div className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 border ${
              restoreFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                {restoreFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{restoreFeedback.message}</span>
              </div>
              <button 
                onClick={() => setRestoreFeedback(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Settings Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <span>Preferências de Sincronização Automática</span>
              </h3>
              <button
                type="button"
                onClick={handleSaveSettings}
                className="px-3 py-1 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saveConfigSuccess ? 'Salvo!' : 'Salvar'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Toggle Auto Sync */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Sincronização Contínua</p>
                  <p className="text-[11px] text-slate-500">Salva e sincroniza automaticamente a cada alteração</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoSync}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    syncSettings.autoSyncEnabled ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      syncSettings.autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Cross-tab sync */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Sincronia Entre Abas e Telas</p>
                  <p className="text-[11px] text-slate-500">Atualiza instantaneamente outras abas abertas sem recarregar</p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleCrossTab}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    syncSettings.crossTabSyncEnabled ? 'bg-sky-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      syncSettings.crossTabSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Heartbeat Interval */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 md:col-span-2">
                <div>
                  <p className="text-xs font-semibold text-slate-800">Ciclo de Verificação Periódica em Segundo Plano</p>
                  <p className="text-[11px] text-slate-500">Garante integridade e snapshot automático mesmo com a aba inativa</p>
                </div>
                <select
                  value={syncSettings.syncIntervalSeconds}
                  onChange={(e) => handleIntervalChange(Number(e.target.value))}
                  className="bg-white border border-slate-300 text-slate-800 text-xs rounded-lg px-3 py-1.5 font-medium focus:ring-2 focus:ring-sky-500 transition"
                >
                  <option value={15}>A cada 15 segundos</option>
                  <option value={30}>A cada 30 segundos (Recomendado)</option>
                  <option value={60}>A cada 1 minuto</option>
                  <option value={120}>A cada 2 minutos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Firebase Scheduled Backup Feature Card */}
          <div className="p-4 rounded-xl border border-sky-200 bg-linear-to-r from-sky-50/90 via-indigo-50/50 to-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-sky-600 text-white rounded-xl shadow-xs mt-0.5">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">
                    Agendamento de Backups no Firebase
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Redundância Ativa
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Defina horários programados para salvar cópias completas no Google Firestore e configurar retenção segura.
                </p>
              </div>
            </div>
            {onOpenFirebaseBackupSchedule && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFirebaseBackupSchedule();
                }}
                className="w-full sm:w-auto px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Configurar Horários</span>
                <Clock className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instant Database Upload to Firebase Storage (.json.gz) */}
          <div className="p-4 rounded-xl border-2 border-emerald-300 bg-linear-to-br from-emerald-50/90 via-teal-50/40 to-slate-50 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                  <CloudUpload className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-slate-900">
                      Upload Instantâneo para o Firebase Storage
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      JSON Comprimido (.json.gz)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                      Redundância Fora do Navegador
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Comprime toda a base de dados (<strong>{services.length} serviços</strong> e <strong>{stores.length} lojas</strong>) em formato gzip e realiza o upload imediato para o bucket seguro no Google Firebase Storage.
                  </p>
                </div>
              </div>

              <button
                type="button"
                id="btn-upload-storage-instant"
                onClick={handleUploadInstantStorageBackup}
                disabled={isUploadingToStorage}
                className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs shadow-emerald-600/20 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {isUploadingToStorage ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Comprimindo e Enviando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Upload Instantâneo</span>
                  </>
                )}
              </button>
            </div>

            {/* Storage Upload Success Feedback */}
            {storageUploadSuccess && (
              <div className="p-3 bg-white border border-emerald-200 rounded-lg text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-emerald-800 font-bold">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Upload no Firebase Storage Realizado com Sucesso!</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-700">
                    {formatRelativeTime(storageUploadSuccess.timestamp)}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-md">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Arquivo:</span>
                    <strong className="font-mono text-slate-800 truncate block">{storageUploadSuccess.filename}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tamanho Bruto / Comprimido:</span>
                    <span className="text-slate-700">
                      {formatBytes(storageUploadSuccess.rawSizeBytes)} ➔ <strong className="text-emerald-700">{formatBytes(storageUploadSuccess.compressedSizeBytes)}</strong> (-{storageUploadSuccess.compressionRatioPercent}%)
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Conteúdo Protegido:</span>
                    <span className="text-slate-700">
                      <strong>{storageUploadSuccess.servicesCount}</strong> serviços • <strong>{storageUploadSuccess.storesCount}</strong> lojas
                    </span>
                  </div>
                </div>
                {storageUploadSuccess.downloadUrl && (
                  <div className="pt-1 flex items-center justify-end">
                    <a
                      href={storageUploadSuccess.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline flex items-center gap-1"
                    >
                      <span>Acessar arquivo no Storage</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Storage Upload Error Feedback */}
            {storageUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{storageUploadError}</span>
                </div>
                <button
                  onClick={() => setStorageUploadError(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Backup & Restore Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-slate-500" />
              Backup Manual e Restauração de Arquivos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Download Backup */}
              <div className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <span>Baixar Cópia de Segurança (.JSON)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Gera um arquivo completo com todos os serviços, lojas, débitos, pagamentos e fotos anexadas.
                  </p>
                </div>
                <button
                  onClick={() => downloadBackupFile(services, stores, user)}
                  className="w-full mt-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Backup JSON</span>
                </button>
              </div>

              {/* Restore Backup */}
              <div className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                    <Upload className="w-4 h-4 text-sky-600" />
                    <span>Restaurar de Arquivo (.JSON)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Importe um arquivo de backup salvo anteriormente para restaurar seu histórico integralmente.
                  </p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileRestore}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full mt-2 py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-medium rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-sky-600" />
                  <span>Selecionar Arquivo Backup</span>
                </button>
              </div>
            </div>

            {/* Auto snapshot info */}
            {autoSnapshot && (
              <div className="p-2.5 rounded-lg bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>
                    Snapshot automático ativo: <strong>{autoSnapshot.services.length} serviços</strong> e{' '}
                    <strong>{autoSnapshot.stores.length} lojas</strong> salvos localmente.
                  </span>
                </div>
                <span className="text-[10px] text-emerald-700 font-mono">
                  {formatRelativeTime(autoSnapshot.exportedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Sync History Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-slate-500" />
                Histórico Recente de Sincronizações
              </h3>
              {syncLogs.length > 0 && (
                <button
                  onClick={onClearLogs}
                  className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-150 max-h-48 overflow-y-auto bg-slate-50/40">
              {syncLogs.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  Nenhum registro de sincronização ainda.
                </div>
              ) : (
                syncLogs.map((log) => (
                  <div key={log.id} className="p-2.5 flex items-start justify-between gap-3 text-xs hover:bg-white transition">
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />
                        <span className="font-semibold text-slate-800 truncate">{log.action}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate pl-4">{log.details}</p>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap shrink-0">
                      {formatRelativeTime(log.timestamp)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Conectado à Conta Google: <strong>{user.email}</strong></span>
            {saveConfigSuccess && (
              <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-md flex items-center gap-1 animate-in fade-in">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Configurações salvas!
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              type="button"
              id="btn-save-sync-settings"
              onClick={handleSaveSettings}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-lg shadow-sm shadow-sky-600/20 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saveConfigSuccess ? 'Alterações Salvas!' : 'Salvar Alterações'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
