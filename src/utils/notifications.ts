import { AppNotification } from '../types';

// Audio chime synthesizers for crisp, non-intrusive sound alerts
function playAudioChime(type: 'success' | 'alert' | 'info' | 'debit') {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'success') {
      // Pleasant upward chord (C5 -> E5 -> G5)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.setValueAtTime(659.25, now + 0.08);
      osc.frequency.setValueAtTime(783.99, now + 0.16);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'debit') {
      // Subtle lower tone
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(329.63, now);
      osc.frequency.setValueAtTime(293.66, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.31);
    } else if (type === 'alert') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554.37, now + 0.09);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.29);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.21);
    }
  } catch {
    // AudioContext autoplay restrictions or inactive tab
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'default';
}

export function playAppNotificationSound(kind: 'service' | 'debit' | 'payment' | 'alert' = 'service') {
  if (kind === 'payment') playAudioChime('success');
  else if (kind === 'debit') playAudioChime('debit');
  else if (kind === 'service') playAudioChime('info');
  else playAudioChime('alert');
}

export async function triggerMobileAndBrowserNotification({
  title,
  body,
  type = 'novo_servico',
}: {
  title: string;
  body: string;
  type?: AppNotification['type'];
}) {
  sendAppNotification({ title, body, type });
}

/**
 * Checks and requests browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Este navegador não suporta notificações de desktop.');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'default';
    }
  }

  return Notification.permission;
}

/**
 * Triggers a browser / mobile notification, device vibration, and audio sound
 */
export function sendAppNotification({
  title,
  body,
  type = 'novo_servico',
  serviceId,
  onNewNotification,
}: {
  title: string;
  body: string;
  type?: AppNotification['type'];
  serviceId?: string;
  onNewNotification?: (notif: AppNotification) => void;
}): AppNotification {
  const newNotif: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    body,
    type,
    timestamp: new Date().toISOString(),
    read: false,
    serviceId,
  };

  // 1. Play sound
  if (type === 'pagamento' || type === 'comprovante') {
    playAudioChime('success');
  } else if (type === 'debito') {
    playAudioChime('debit');
  } else if (type === 'novo_servico') {
    playAudioChime('info');
  } else {
    playAudioChime('alert');
  }

  // 2. Mobile vibration (works on mobile browsers and Android PWA)
  if ('vibrate' in navigator) {
    try {
      if (type === 'debito') {
        navigator.vibrate([150, 100, 150]);
      } else if (type === 'pagamento') {
        navigator.vibrate([100, 50, 200]);
      } else {
        navigator.vibrate(120);
      }
    } catch {
      // Vibrate not allowed by user interaction policy
    }
  }

  // 3. Browser native notification (desktop & mobile)
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/logo.png',
        badge: '/logo.png',
        tag: newNotif.id,
      });
    } catch {
      // In mobile Chrome or PWA, ServiceWorkerRegistration.showNotification might be needed if standard fails
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: '/logo.png',
            tag: newNotif.id,
          });
        }).catch(() => {});
      }
    }
  }

  // 4. In-App callback & localStorage persistence
  if (onNewNotification) {
    onNewNotification(newNotif);
  }

  return newNotif;
}
