/**
 * Google PWA Architecture & Lifecycle Manager
 * Empreiteiro Saminês
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let updateCallback: (() => void) | null = null;
let registrationRef: ServiceWorkerRegistration | null = null;
let hasRegistered = false;
let lastCheckTime = 0;

/**
 * Registra o Service Worker e monitora ciclo de vida de atualizações
 */
export function registerPWA(onUpdateFound?: () => void): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  // Se o aplicativo estiver sendo executado dentro de um iframe (como no Preview do AI Studio),
  // não registra o Service Worker para evitar bloqueios de segurança do navegador.
  try {
    if (window.self !== window.top) {
      return;
    }
  } catch {
    return;
  }

  if (onUpdateFound) {
    updateCallback = onUpdateFound;
  }

  if (hasRegistered) {
    return;
  }
  hasRegistered = true;

  const checkForUpdates = () => {
    const now = Date.now();
    if (now - lastCheckTime < 3000) return;
    lastCheckTime = now;

    if (registrationRef) {
      registrationRef.update().catch((err) => {
        console.debug('[Google PWA] Verificação de atualização:', err);
      });
    } else {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          registrationRef = reg;
          reg.update().catch((err) => {
            console.debug('[Google PWA] Verificação de atualização:', err);
          });
        }
      });
    }
  };

  const initRegistration = () => {
    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        registrationRef = reg;
        console.log('[Google PWA] Service Worker registrado. Escopo:', reg.scope);

        if (reg.waiting) {
          if (updateCallback) updateCallback();
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[Google PWA] Nova versão instalada.');
              if (updateCallback) updateCallback();
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[Google PWA] Registro de Service Worker:', err);
      });
  };

  if (document.readyState === 'loading') {
    window.addEventListener('load', initRegistration, { once: true });
  } else {
    initRegistration();
  }

  // Notifica quando há versão alterada sem forçar reload cego
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SW_VERSION_CHANGED') {
      const newVersion = event.data.version;
      console.log(`[Google PWA] Versão ativa: ${newVersion}`);
      if (updateCallback) updateCallback();
    }
  });

  // Verificações em primeiro plano (quando o usuário abre ou volta para o app)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForUpdates();
    }
  });

  window.addEventListener('focus', checkForUpdates);
  window.addEventListener('pageshow', checkForUpdates);

  // Verificação periódica a cada 2 minutos
  setInterval(checkForUpdates, 120000);
}

/**
 * Força a checagem manual de atualizações do Service Worker
 */
export async function checkForPWAUpdates(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    const reg = registrationRef || await navigator.serviceWorker.getRegistration();
    if (reg) {
      registrationRef = reg;
      await reg.update();
      if (reg.waiting) {
        if (updateCallback) updateCallback();
        return true;
      }
    }
  } catch (err) {
    console.debug('[Google PWA] Erro ao buscar atualizações:', err);
  }
  return false;
}

/**
 * Salva o evento beforeinstallprompt para chamada posterior
 */
export function setInstallPrompt(event: BeforeInstallPromptEvent | null): void {
  deferredPrompt = event;
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

/**
 * Dispara a janela de instalação do PWA
 */
export async function promptInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    return false;
  }

  try {
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (err) {
    console.warn('[Google PWA] Erro ao disparar prompt de instalação:', err);
    return false;
  }
}

/**
 * Verifica se o aplicativo está rodando em modo standalone (PWA instalado)
 */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return isStandaloneMatch || isIOSStandalone;
}

/**
 * Detecta se o dispositivo é iOS (Safari / iPhone / iPad)
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

/**
 * Força a atualização do PWA ativando o novo worker
 */
export function applyPWAUpdate(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    window.location.reload();
    return;
  }

  navigator.serviceWorker.getRegistration().then((reg) => {
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setTimeout(() => {
      window.location.reload();
    }, 200);
  });
}

/**
 * Toca efeito sonoro com fallback sintetizado via Web Audio API
 */
export function playPWAEffect(type: 'cash' | 'knock' | 'ping' = 'cash'): void {
  try {
    const audioPath = type === 'cash' ? '/caixa-registradora.mp3' : '/door-knock.mp3';
    const audio = new Audio(audioPath);
    audio.volume = 0.6;
    audio.play().catch(() => {
      playSynthesizedAudio(type);
    });
  } catch {
    playSynthesizedAudio(type);
  }
}

function playSynthesizedAudio(type: 'cash' | 'knock' | 'ping') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'cash') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'knock') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Silent fail
  }
}

/**
 * Força a renovação completa de todos os caches e Service Workers do PWA
 * Remove dados antigos para forçar o download dos novos ícones e do novo manifesto
 */
export async function forcePwaIconAndCacheRefresh(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // 1. Limpa todos os caches da CacheStorage
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      console.log('[PWA] Todos os caches do Service Worker foram limpos.');
    }

    // 2. Notifica e atualiza todos os service workers registrados
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try {
            await reg.update();
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          } catch {}
        })
      );
    }
  } catch (err) {
    console.warn('[PWA] Falha ao forçar limpeza de cache:', err);
  }

  // 3. Força atualização imediata dos favicons e manifesto no DOM
  try {
    const freshVersion = Date.now().toString();
    const savedCustomLogo = localStorage.getItem('samines_custom_logo');
    const effectiveUrl = savedCustomLogo || `/logo-transparent.png?v=${freshVersion}`;
    const oldIcons = document.querySelectorAll(
      "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel='alternate icon']"
    );
    oldIcons.forEach((el) => el.remove());

    const sizes = ['16x16', '32x32', '48x48', '192x192', '512x512'];
    sizes.forEach((sz) => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.sizes = sz;
      link.href = effectiveUrl;
      document.head.appendChild(link);
    });

    const oldManifest = document.querySelector("link[rel='manifest']");
    if (oldManifest) oldManifest.remove();
    const newManifest = document.createElement('link');
    newManifest.rel = 'manifest';
    newManifest.href = `/manifest.json?v=${freshVersion}`;
    document.head.appendChild(newManifest);
  } catch {}

  // 4. Recarrega a página com parâmetro para contornar qualquer cache remanescente
  setTimeout(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('pwa_refresh', Date.now().toString());
    window.location.href = url.toString();
  }, 250);
}
