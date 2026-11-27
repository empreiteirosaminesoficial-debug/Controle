import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { getBytes, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';

export interface ApkReleaseInfo {
  fileName: string;
  version: string;
  updatedAt: string;
  sizeBytes: number;
  storagePath: string;
  contentType: string;
}

const RELEASE_DOC = doc(db, 'publicAssets', 'apkRelease');
const MAX_APK_SIZE = 200 * 1024 * 1024;

function isVerifiedAdmin(): boolean {
  const current = auth.currentUser;
  return Boolean(
    current?.emailVerified &&
    current.email?.trim().toLowerCase() === 'empreiteirosaminesoficial@gmail.com'
  );
}

export async function publishApkRelease(file: File, version: string): Promise<ApkReleaseInfo> {
  if (!isVerifiedAdmin()) throw new Error('Somente o administrador verificado pode publicar APK.');
  if (!file || (!file.name.toLowerCase().endsWith('.apk') && file.type !== 'application/vnd.android.package-archive')) {
    throw new Error('Selecione um arquivo APK válido.');
  }
  if (file.size <= 0 || file.size > MAX_APK_SIZE) {
    throw new Error('O APK deve ter tamanho maior que zero e menor que 200 MB.');
  }

  const cleanVersion = version.trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z._-]{0,31}$/.test(cleanVersion)) {
    throw new Error('Informe uma versão válida (ex.: 1.0.1).');
  }

  const storagePath = `app-releases/${cleanVersion}/empreiteiro-samines.apk`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, {
    contentType: 'application/vnd.android.package-archive',
    customMetadata: { version: cleanVersion, originalFileName: file.name },
  });

  const release: ApkReleaseInfo = {
    fileName: 'Empreiteiro-Samines-' + cleanVersion + '.apk',
    version: cleanVersion,
    updatedAt: new Date().toISOString(),
    sizeBytes: file.size,
    storagePath,
    contentType: 'application/vnd.android.package-archive',
  };

  await setDoc(RELEASE_DOC, release);
  return release;
}

export async function fetchApkRelease(): Promise<ApkReleaseInfo | null> {
  const snapshot = await getDoc(RELEASE_DOC);
  return snapshot.exists() ? snapshot.data() as ApkReleaseInfo : null;
}

export function listenApkRelease(callback: (release: ApkReleaseInfo | null) => void): Unsubscribe {
  return onSnapshot(RELEASE_DOC, (snapshot) => {
    callback(snapshot.exists() ? snapshot.data() as ApkReleaseInfo : null);
  }, (error) => {
    console.warn('[APK] Não foi possível acompanhar a versão publicada:', error);
    callback(null);
  });
}

export async function downloadPublishedApk(release: ApkReleaseInfo): Promise<void> {
  if (!auth.currentUser) throw new Error('Entre na sua conta para baixar o aplicativo.');
  if (!release?.storagePath || !release.fileName) throw new Error('Não há APK publicado para baixar.');

  const fileRef = ref(storage, release.storagePath);
  // Preferência: link direto do Firebase Storage. Uma navegação comum não depende
  // de CORS no bucket (getBytes depende, e falhava em navegadores sem essa configuração).
  try {
    const url = await getDownloadURL(fileRef);
    const link = document.createElement('a');
    link.href = url;
    link.download = release.fileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  } catch (error) {
    console.warn('[APK] Link direto indisponível; tentando download pelo SDK:', error);
  }

  const bytes = await getBytes(fileRef, MAX_APK_SIZE);
  const blob = new Blob([bytes], { type: 'application/vnd.android.package-archive' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = release.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
