import React, { useEffect, useState } from 'react';
import { 
  Bell, 
  CheckCircle2, 
  DollarSign, 
  FileText, 
  AlertCircle, 
  X, 
  ArrowRight,
  Receipt,
  Smartphone
} from 'lucide-react';
import { AppNotification } from '../types';

interface InAppNotificationToastProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onActionClick?: (notification: AppNotification) => void;
  durationMs?: number;
}

export const InAppNotificationToast: React.FC<InAppNotificationToastProps> = ({
  notification,
  onDismiss,
  onActionClick,
  durationMs = 6500,
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!notification) return;

    setProgress(100);
    const startTime = Date.now();
    const interval = 50;

    const timer = setInterval(() => {
      if (isPaused) return;

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        onDismiss();
      }
    }, interval);

    return () => clearInterval(timer);
  }, [notification, durationMs, isPaused, onDismiss]);

  if (!notification) return null;

  // Icon and theme config based on notification type
  const getTypeConfig = () => {
    switch (notification.type) {
      case 'pagamento':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
          bgColor: 'bg-emerald-500',
          borderColor: 'border-emerald-300',
          badgeText: 'Pagamento Confirmado',
          badgeClass: 'bg-emerald-100 text-emerald-800',
          progressClass: 'bg-emerald-500',
        };
      case 'comprovante':
        return {
          icon: <Receipt className="w-5 h-5 text-sky-600" />,
          bgColor: 'bg-sky-500',
          borderColor: 'border-sky-300',
          badgeText: 'Comprovante Emitido',
          badgeClass: 'bg-sky-100 text-sky-800',
          progressClass: 'bg-sky-500',
        };
      case 'debito':
        return {
          icon: <DollarSign className="w-5 h-5 text-purple-600" />,
          bgColor: 'bg-purple-500',
          borderColor: 'border-purple-300',
          badgeText: 'Débito de Material / Custo',
          badgeClass: 'bg-purple-100 text-purple-800',
          progressClass: 'bg-purple-500',
        };
      case 'novo_servico':
      default:
        return {
          icon: <Bell className="w-5 h-5 text-sky-600" />,
          bgColor: 'bg-sky-500',
          borderColor: 'border-sky-300',
          badgeText: 'Novo Serviço',
          badgeClass: 'bg-sky-100 text-sky-800',
          progressClass: 'bg-sky-500',
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="fixed top-4 right-4 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-top-4 duration-300 transition-all hover:shadow-emerald-900/10"
    >
      {/* Progress Bar (countdown) */}
      <div className="w-full bg-slate-100 h-1">
        <div
          className={`h-full transition-all duration-75 ${config.progressClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="p-4 sm:p-4.5 flex items-start gap-3">
        {/* Type Icon Badge */}
        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
          {config.icon}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.badgeClass}`}>
              {config.badgeText}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Agora</span>
          </div>

          <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug line-clamp-1">
            {notification.title}
          </h5>

          <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
            {notification.body}
          </p>

          {/* Action Footer if serviceId or callback provided */}
          {onActionClick && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onActionClick(notification);
                  onDismiss();
                }}
                className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer transition"
              >
                <span>Visualizar</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer shrink-0 -mr-1 -mt-1"
          title="Fechar notificação"
          aria-label="Fechar notificação"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
