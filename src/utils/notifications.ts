import { AppNotification } from '../types';

// --- Áudio das notificações -------------------------------------------------
// Navegadores (Chrome/Android/iOS) criam um AudioContext "suspenso" quando ele
// nasce fora de um toque/clique do usuário. Antes, cada aviso criava um contexto
// novo no momento em que chegava do Firestore — ou seja, sem gesto — e o som
// simplesmente não tocava. Agora há um único contexto, destravado no primeiro
// toque/clique/tecla da sessão e reaproveitado em todos os avisos seguintes.
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (sharedAudioCtx) return sharedAudioCtx;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    sharedAudioCtx = new AudioCtx();
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

if (typeof window !== 'undefined') {
  const unlockEvents = ['pointerdown', 'touchstart', 'keydown', 'click'];
  const handler = () => {
    unlockAudio();
    if (sharedAudioCtx?.state === 'running') {
      unlockEvents.forEach((evt) => window.removeEventListener(evt, handler, true));
    }
  };
  unlockEvents.forEach((evt) => window.addEventListener(evt, handler, true));
  // Ao voltar para a aba, tenta retomar o contexto (alguns navegadores o suspendem).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') unlockAudio();
  });
}

const CLIENT_SOUND_KEY = 'samines_notification_sound_enabled_v1';

/** Preferência de som do usuário (padrão: ligado). */
export function isNotificationSoundEnabled(): boolean {
  try {
    return localStorage.getItem(CLIENT_SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setNotificationSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(CLIENT_SOUND_KEY, enabled ? 'on' : 'off');
  } catch {
    // ignore
  }
  if (enabled) unlockAudio();
}

type ChimeType = 'success' | 'alert' | 'info' | 'debit' | 'visit';

function tone(ctx: AudioContext, start: number, freq: number, duration: number, volume: number, type: OscillatorType = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.01);
}

// Sintetizadores curtos (os arquivos .mp3 em /public são placeholders vazios).
function playAudioChime(type: ChimeType) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    const now = ctx.currentTime + 0.02;

    if (type === 'success') {
      tone(ctx, now, 523.25, 0.12, 0.18);
      tone(ctx, now + 0.1, 659.25, 0.12, 0.18);
      tone(ctx, now + 0.2, 783.99, 0.3, 0.18);
    } else if (type === 'debit') {
      tone(ctx, now, 329.63, 0.15, 0.2, 'triangle');
      tone(ctx, now + 0.13, 293.66, 0.25, 0.2, 'triangle');
    } else if (type === 'alert') {
      tone(ctx, now, 440, 0.12, 0.18);
      tone(ctx, now + 0.11, 554.37, 0.25, 0.18);
    } else if (type === 'visit') {
      // "Toc-toc": duas batidas graves e curtas, repetidas.
      [0, 0.16, 0.5, 0.66].forEach((offset) => tone(ctx, now + offset, 160, 0.09, 0.35, 'triangle'));
    } else {
      tone(ctx, now, 587.33, 0.12, 0.16);
      tone(ctx, now + 0.12, 880, 0.22, 0.16);
    }
  } catch {
    // Restrições de autoplay ou aba inativa
  }
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission;
  }
  return 'default';
}

export function playAppNotificationSound(kind: 'service' | 'debit' | 'payment' | 'alert' | 'visit' = 'service') {
  if (kind === 'visit') playAudioChime('visit');
  else if (kind === 'payment') playAudioChime('success');
  else if (kind === 'debit') playAudioChime('debit');
  else if (kind === 'service') playAudioChime('info');
  else playAudioChime('alert');
}

export async function triggerMobileAndBrowserNotification({
  title,
  body,
  type = 'novo_servico',
  silent = false,
  sound,
}: {
  title: string;
  body: string;
  type?: AppNotification['type'];
  silent?: boolean;
  sound?: 'visit';
}) {
  sendAppNotification({ title, body, type, silent, sound });
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
  silent = false,
  sound,
}: {
  title: string;
  body: string;
  type?: AppNotification['type'];
  serviceId?: string;
  onNewNotification?: (notif: AppNotification) => void;
  /** true = somente aviso visual (regra do ADM para solicitações de visita). */
  silent?: boolean;
  /** Força um som específico (ex.: 'visit'). */
  sound?: 'visit';
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

  // 1. Play sound (respeita a preferência do usuário e o modo silencioso)
  if (silent || !isNotificationSoundEnabled()) {
    // sem som
  } else if (sound === 'visit') {
    playAudioChime('visit');
  } else if (type === 'pagamento' || type === 'comprovante') {
    playAudioChime('success');
  } else if (type === 'debito') {
    playAudioChime('debit');
  } else if (type === 'novo_servico') {
    playAudioChime('info');
  } else {
    playAudioChime('alert');
  }

  // 2. Mobile vibration (works on mobile browsers and Android PWA)
  if (!silent && 'vibrate' in navigator) {
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
        silent,
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
