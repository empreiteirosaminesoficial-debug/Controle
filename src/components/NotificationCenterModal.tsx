import React from 'react';
import {
  X,
  Bell,
  Check,
  Trash2,
  CheckCircle,
  Receipt,
  Layers,
  Info
} from 'lucide-react';
import { AppNotification } from '../types';
import { formatRelativeTime } from '../utils/formatters';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (notification: AppNotification) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick,
}) => {
  if (!isOpen) return null;

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'novo_servico':
        return <Layers className="w-4 h-4 text-sky-600" />;
      case 'debito':
        return <Receipt className="w-4 h-4 text-rose-600" />;
      case 'pagamento':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'comprovante':
        return <Receipt className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-amber-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Central de Notificações
              </h3>
              <p className="text-xs text-slate-500">
                Alertas e atualizações em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                {notifications.filter(n => !n.read).length} não lidas
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              aria-label="Fechar notificações"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">

          {/* Controls */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-slate-800 text-xs">
              Histórico de Notificações ({notifications.length})
            </span>

            <div className="flex items-center gap-2">
              {notifications.some(n => !n.read) && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Marcar lidas</span>
                </button>
              )}

              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="text-slate-400 hover:text-rose-600 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>
          </div>

          {/* List of Notifications */}
          {notifications.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
              <Bell className="w-8 h-8 mx-auto text-slate-300 stroke-1 mb-1" />
              <p className="font-medium text-slate-600">
                Nenhuma notificação registrada ainda.
              </p>
              <p className="text-slate-400 text-[11px] mt-0.5">
                Os alertas aparecerão aqui automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n, idx) => (
                <div
                  key={`${n.id}_${idx}`}
                  onClick={() => onNotificationClick(n)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-start gap-3 ${
                    n.read
                      ? 'bg-white border-slate-200 hover:bg-slate-50 opacity-80'
                      : 'bg-sky-50/40 border-sky-200 hover:bg-sky-50/80'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-2xs bg-white border border-slate-200">
                    {getIconForType(n.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-slate-900 text-xs truncate">
                        {n.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(n.timestamp)}
                      </span>
                    </div>

                    <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed whitespace-pre-line">
                      {n.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Notificações push integradas com áudio nativo</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};