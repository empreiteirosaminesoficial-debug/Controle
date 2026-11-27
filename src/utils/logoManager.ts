import { getFirebaseAuthHeaders } from '../lib/firebase';
import { useState, useEffect, useCallback } from 'react';
import { saveCloudAppLogo, listenCloudAppLogo, fetchCloudAppLogo, saveCloudUserProfile } from './cloudDatabase';
import { loadUser, saveUser } from './storage';

const STORAGE_KEY = 'samines_custom_logo';
const EVENT_NAME = 'samines_logo_changed';
export const DEFAULT_LOGO_URL = '/logo-transparent.png';

/**
 * Returns current logo URL - user uploaded custom logo if available, otherwise official default
 */
export function getAppLogoUrl(): string {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored.startsWith('data:image/') || stored.startsWith('/'))) {
        return stored;
      }
    } catch {}
  }
  return DEFAULT_LOGO_URL;
}

/**
 * Updates dynamic favicon links, manifest link and meta icon tags in document head
 * Removes old DOM nodes and appends fresh elements to force Chromium / Windows PWA title bar to repaint
 */
export function updateDocumentFavicons(iconUrl: string) {
  if (typeof document === 'undefined') return;
  try {
    const effectiveUrl = iconUrl || DEFAULT_LOGO_URL;

    // 1. Remove all old icon links from document.head to force browser cache invalidation
    const oldIcons = document.querySelectorAll(
      "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon'], link[rel='alternate icon']"
    );
    oldIcons.forEach((el) => el.remove());

    // 2. Re-create pristine link elements with direct data URL or versioned path
    const sizes = ['16x16', '32x32', '48x48', '192x192', '512x512'];
    sizes.forEach((sz) => {
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.sizes = sz;
      link.href = effectiveUrl;
      document.head.appendChild(link);
    });

    const shortcut = document.createElement('link');
    shortcut.rel = 'shortcut icon';
    shortcut.type = 'image/png';
    shortcut.href = effectiveUrl;
    document.head.appendChild(shortcut);

    const appleTouch = document.createElement('link');
    appleTouch.rel = 'apple-touch-icon';
    appleTouch.href = effectiveUrl;
    document.head.appendChild(appleTouch);

    // 3. Re-inject Web App Manifest link with version query to notify Chromium PWA App Identity Update
    const oldManifest = document.querySelector("link[rel='manifest']");
    if (oldManifest) {
      oldManifest.remove();
    }
    const newManifest = document.createElement('link');
    newManifest.rel = 'manifest';
    newManifest.href = `/manifest.json?v=${Date.now()}`;
    document.head.appendChild(newManifest);

    // 4. Update Meta tags
    const metaSelectors = [
      "meta[name='msapplication-TileImage']",
      "meta[property='og:image']",
      "meta[name='twitter:image']"
    ];
    metaSelectors.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        (el as HTMLMetaElement).content = effectiveUrl;
      });
    });
  } catch {
    // Ignore DOM errors
  }
}

/**
 * Redimensiona e otimiza a imagem em um canvas para max 512x512 pixels em formato PNG leve,
 * garantindo compatibilidade total com o limite de documentos do Firestore (<1MB) e localStorage
 */
export async function optimizeLogoImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const maxDim = 512;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Limpa com fundo transparente
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png', 0.92);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Falha ao renderizar imagem para otimização do logotipo.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsDataURL(file);
  });
}

/**
 * React hook to access and manage the app's official logo everywhere in PWA
 */
export function useAppLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(getAppLogoUrl);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 1. Sincronização inicial com cache local
    const current = getAppLogoUrl();
    setLogoUrl(current);
    updateDocumentFavicons(current);

    // 2. Busca o logotipo gravado na nuvem Firestore para garantir sincronia entre contas e dispositivos
    fetchCloudAppLogo().then((cloudLogo) => {
      if (cloudLogo && cloudLogo !== current) {
        try {
          localStorage.setItem(STORAGE_KEY, cloudLogo);
        } catch {}
        setLogoUrl(cloudLogo);
        updateDocumentFavicons(cloudLogo);
      }
    }).catch(() => {});

    // 3. Ouvinte em tempo real Firestore: alterações feitas em qualquer dispositivo sincronizam na hora
    const unsubscribeCloud = listenCloudAppLogo((cloudLogo) => {
      if (cloudLogo) {
        try {
          localStorage.setItem(STORAGE_KEY, cloudLogo);
        } catch {}
        setLogoUrl(cloudLogo);
        updateDocumentFavicons(cloudLogo);
      } else if (cloudLogo === '') {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        setLogoUrl(DEFAULT_LOGO_URL);
        updateDocumentFavicons(DEFAULT_LOGO_URL);
      }
    });

    const handleLogoChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const newUrl = customEvent.detail || getAppLogoUrl();
      setLogoUrl(newUrl);
      updateDocumentFavicons(newUrl);
    };

    window.addEventListener(EVENT_NAME, handleLogoChange);
    window.addEventListener('storage', handleLogoChange);

    return () => {
      unsubscribeCloud();
      window.removeEventListener(EVENT_NAME, handleLogoChange);
      window.removeEventListener('storage', handleLogoChange);
    };
  }, []);

  const updateLogo = useCallback(async (file: File): Promise<boolean> => {
    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('O arquivo selecionado deve ser uma imagem (PNG, JPG, WEBP, etc).');
      }

      // Otimiza e redimensiona a imagem para formato leve e nítido (max 512x512)
      const dataUrl = await optimizeLogoImage(file);

      // 1. Salva no localStorage local
      try {
        localStorage.setItem(STORAGE_KEY, dataUrl);
      } catch (err) {
        console.warn('Armazenamento local cheio, priorizando sincronização na nuvem.', err);
      }

      // 2. Notifica todo o ambiente de execução local imediatamente
      setLogoUrl(dataUrl);
      updateDocumentFavicons(dataUrl);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: dataUrl }));

      // 3. Sincroniza em tempo real com o documento público de identidade visual.
      const cloudSaved = await saveCloudAppLogo(dataUrl).catch((cloudErr) => {
        console.warn('[LogoManager] Erro ao sincronizar logotipo no Firestore:', cloudErr);
        return false;
      });

      // 4. Atualiza o perfil oficial do Administrador com o novo avatar
      try {
        const currentUser = loadUser();
        if (currentUser && (currentUser.role === 'admin' || currentUser.email?.toLowerCase() === 'empreiteirosaminesoficial@gmail.com')) {
          const updatedUser = { ...currentUser, avatar: dataUrl };
          saveUser(updatedUser);
          saveCloudUserProfile(updatedUser).catch(() => {});
        }
      } catch {}

      // 5. Salva nos arquivos do servidor para geração de ícones nativos PWA/Android
      try {
        await fetch('/api/upload-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await getFirebaseAuthHeaders()) },
          body: JSON.stringify({ imageBase64: dataUrl }),
        });
      } catch (serverErr) {
        console.warn('Aviso: não foi possível atualizar os ícones estáticos do servidor.', serverErr);
      }

      if (!cloudSaved) {
        throw new Error('O logo foi atualizado neste dispositivo, mas não foi sincronizado com os clientes. Publique as regras atualizadas do Firestore e tente novamente.');
      }

      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 3500);
      return true;
    } catch (err: any) {
      setUploadError(err?.message || 'Erro ao carregar imagem do logotipo.');
      return false;
    } finally {
      setIsUploading(false);
    }
  }, []);

  const resetLogo = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      await saveCloudAppLogo('').catch(() => {});
      const defaultUrl = `${DEFAULT_LOGO_URL}?t=${Date.now()}`;
      setLogoUrl(defaultUrl);
      updateDocumentFavicons(defaultUrl);
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: defaultUrl }));
    } catch {
      // Ignore errors
    }
  }, []);

  return {
    logoUrl,
    updateLogo,
    resetLogo,
    isUploading,
    uploadError,
    uploadSuccess,
    isCustomLogo: Boolean(typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)),
  };
}

