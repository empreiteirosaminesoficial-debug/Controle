import { useState, useEffect, useCallback } from 'react';
import { 
  BeforeInstallPromptEvent, 
  isRunningStandalone, 
  isIOSDevice, 
  promptInstall, 
  setInstallPrompt, 
  getInstallPrompt, 
  registerPWA, 
  applyPWAUpdate,
  playPWAEffect,
  checkForPWAUpdates
} from '../lib/pwa';

export function usePWA() {
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isRunningStandalone());
  const [isInstallable, setIsInstallable] = useState<boolean>(() => !!getInstallPrompt());
  const [isIOS, setIsIOS] = useState<boolean>(() => isIOSDevice());
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [hasUpdate, setHasUpdate] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkForUpdates = useCallback(async () => {
    setIsCheckingUpdate(true);
    try {
      const found = await checkForPWAUpdates();
      if (found) {
        setHasUpdate(true);
      }
      setLastChecked(new Date());
    } finally {
      setTimeout(() => {
        setIsCheckingUpdate(false);
      }, 1000);
    }
  }, []);

  useEffect(() => {
    // Atualiza estado de instalação
    setIsInstalled(isRunningStandalone());
    setIsIOS(isIOSDevice());

    // Registra PWA com callback de nova versão encontrada
    registerPWA(() => {
      setHasUpdate(true);
    });

    // Sempre que o aplicativo abre, procura nova atualização automaticamente
    checkForUpdates();

    // Escuta evento beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setInstallPrompt(promptEvent);
      setIsInstallable(true);
      console.log('[Google PWA Hook] Prompt de instalação interceptado e pronto.');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
      console.log('[Google PWA Hook] App instalado com sucesso no dispositivo!');
    };

    const handleOnline = () => {
      setIsOnline(true);
      // Ao reconectar à internet, também busca por novas atualizações
      checkForUpdates();
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Também verifica quando a janela volta a ficar visível/focada
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkForUpdates]);

  const install = useCallback(async () => {
    const success = await promptInstall();
    if (success) {
      setIsInstallable(false);
      setIsInstalled(true);
    }
    return success;
  }, []);

  const updateApp = useCallback(() => {
    applyPWAUpdate();
  }, []);

  const playSound = useCallback((type: 'cash' | 'knock' | 'ping' = 'cash') => {
    playPWAEffect(type);
  }, []);

  return {
    isInstalled,
    isInstallable,
    isIOS,
    isOnline,
    hasUpdate,
    isCheckingUpdate,
    lastChecked,
    checkForUpdates,
    install,
    updateApp,
    playSound
  };
}
