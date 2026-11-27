import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  ShieldCheck, 
  FileText, 
  AlertCircle,
  Download
} from 'lucide-react';
import { ObraRecord, ServiceRecord, StoreProfile, UserProfile, GoogleDriveBackupFile, VisitaRecord } from '../types';
import { 
  uploadClientBackupToDrive, 
  listGoogleDriveBackups,
  DriveUploadResult,
  DRIVE_FOLDER_NAME 
} from '../utils/googleDriveBackup';
import { loadScheduledBackupConfig } from '../utils/backupScheduler';
import { formatDateTime } from '../utils/formatters';

interface ClientGoogleDriveBackupCardProps {
  user: UserProfile;
  services: ServiceRecord[];
  stores: StoreProfile[];
  obras?: ObraRecord[];
  visitas?: VisitaRecord[];
}

export const ClientGoogleDriveBackupCard: React.FC<ClientGoogleDriveBackupCardProps> = ({
  user,
  services,
  stores,
  obras = [],
  visitas = [],
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; link?: string } | null>(null);
  const [recentBackups, setRecentBackups] = useState<GoogleDriveBackupFile[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const schedConfig = loadScheduledBackupConfig();
  const scheduledTime = schedConfig.googleDriveScheduledTime || '04:00';

  const loadBackups = async () => {
    setIsLoadingBackups(true);
    try {
      const list = await listGoogleDriveBackups();
      setRecentBackups(list);
    } catch {
      // Ignora falhas se não autenticado ainda
    } finally {
      setIsLoadingBackups(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleExecuteDriveBackup = async () => {
    setShowConfirmModal(false);
    setIsUploading(true);
    setFeedback(null);

    try {
      const result: DriveUploadResult = await uploadClientBackupToDrive({
        services,
        stores,
        obras,
        visitas,
        clientEmail: user.email,
        clientName: user.name,
        isAutoScheduled: false,
        customNote: `Backup manual solicitado pelo cliente (${user.email})`,
      });

      if (result.success) {
        setFeedback({
          type: 'success',
          message: `Backup gerado com sucesso! Arquivo "${result.fileName}" salvo no seu Google Drive.`,
          link: result.webViewLink,
        });
        loadBackups();
      } else {
        setFeedback({
          type: 'error',
          message: result.error || 'Falha ao salvar backup no Google Drive.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado na sincronização com o Google Drive.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
            <HardDrive className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                Cópia de Segurança no Google Drive
              </h3>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-emerald-300">
                Diário às {scheduledTime} AM
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Seus relatórios, serviços, obras e vistorias são salvos e organizados automaticamente no seu Google Drive todas as madrugadas às {scheduledTime}.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmModal(true)}
          disabled={isUploading}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shrink-0 shadow-xs shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Enviando ao Drive...</span>
            </>
          ) : (
            <>
              <HardDrive className="w-4 h-4" />
              <span>Fazer Backup Agora</span>
            </>
          )}
        </button>
      </div>

      {/* Info Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Horário Programado</span>
            <strong className="text-slate-800">Todo dia às {scheduledTime} AM</strong>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Pasta no Drive</span>
            <strong className="text-slate-800 truncate block max-w-[170px]" title="Backups Empreiteiro Saminês - Clientes">
              Backups Saminês
            </strong>
          </div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <div>
            <span className="text-[10px] text-slate-400 block font-medium">Itens Vinculados</span>
            <strong className="text-slate-800">{services.length} serviços • {obras.length} obras</strong>
          </div>
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 animate-in fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          {feedback.link && (
            <a
              href={feedback.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-emerald-900 underline hover:text-emerald-950 shrink-0"
            >
              <span>Abrir no Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      )}

      {/* Recent Drive Backups List */}
      {recentBackups.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold text-slate-700">Cópias Salvas no seu Google Drive ({recentBackups.length})</span>
            <button
              type="button"
              onClick={loadBackups}
              className="text-[11px] text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
              <span>Atualizar lista</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {recentBackups.slice(0, 5).map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 truncate text-[11px]">{file.name}</p>
                    <p className="text-[10px] text-slate-400">{formatDateTime(file.createdTime)} {file.size ? `• ${file.size}` : ''}</p>
                  </div>
                </div>

                {file.webViewLink && (
                  <a
                    href={file.webViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition shrink-0"
                    title="Abrir arquivo no Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Confirmation Modal (MANDATORY per Workspace Skill) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                <HardDrive className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-base">
                  Salvar cópia no Google Drive?
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  O sistema gerará um arquivo de backup com <strong>{services.length} serviços</strong>, <strong>{stores.length} lojas</strong> e <strong>{obras.length} obras</strong>, salvando-o na pasta <strong>"{DRIVE_FOLDER_NAME}"</strong> do seu Google Drive.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <p>• <strong>Conta Google:</strong> {user.email}</p>
              <p>• <strong>Agendamento:</strong> Diariamente às {scheduledTime} AM</p>
              <p>• <strong>Permissão:</strong> Acesso seguro com autorização do usuário</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDriveBackup}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Sim, Salvar no Drive</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
