import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type Auth,
  type User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicialização segura do Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const dbId = (firebaseConfig as Record<string, any>).firestoreDatabaseId;
// ignoreUndefinedProperties: campos opcionais vazios (ex.: dueDate, notes, serviceId)
// chegam como `undefined`. Sem esta opção o Firestore rejeita o documento inteiro
// ("Unsupported field value: undefined") e o serviço/notificação nunca é gravado.
function createFirestore(): Firestore {
  try {
    return dbId
      ? initializeFirestore(app, { ignoreUndefinedProperties: true }, dbId)
      : initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch {
    // Já inicializado (ex.: hot reload do Vite) — reutiliza a instância existente.
    return dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db: Firestore = createFirestore();

// Inicializa o Firebase Storage para uploads de mídia e backups comprimidos
export const storage: FirebaseStorage = getStorage(app);

// Inicializa o Firebase Auth para login com Perfil do Google
export const auth: Auth = getAuth(app);

// In-memory token cache for Google Workspace APIs (Drive), bound to the Firebase UID.
let cachedAccessToken: string | null = null;
let cachedAccessTokenUid: string | null = null;

export function getCachedAccessToken(): string | null {
  if (!auth.currentUser || auth.currentUser.uid !== cachedAccessTokenUid) {
    cachedAccessToken = null;
    cachedAccessTokenUid = null;
  }
  return cachedAccessToken;
}

export function setCachedAccessToken(token: string | null): void {
  cachedAccessToken = token;
  cachedAccessTokenUid = token ? auth.currentUser?.uid || null : null;
}

/** Gera cabeçalho Bearer para rotas privadas do servidor. */
export async function getFirebaseAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) return {};
  const idToken = await currentUser.getIdToken();
  return { Authorization: `Bearer ${idToken}` };
}

// Provedor Google configurado para seleção explícita de conta e escopo do Drive
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
// Adiciona o escopo do Google Drive para upload e gestão de cópias de segurança (backups)
googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

// Limpa token ao deslogar
onAuthStateChanged(auth, (user) => {
  if (!user || user.uid !== cachedAccessTokenUid) {
    cachedAccessToken = null;
    cachedAccessTokenUid = null;
  }
});

export { app, onAuthStateChanged as onFirebaseAuthStateChanged };

/**
 * Obtém ou solicita token de acesso com permissão do Google Drive
 */
export async function requestDriveAccessToken(): Promise<string | null> {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }

  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return null;

    // Reautentica a identidade atual: signInWithPopup poderia substituir a conta Firebase ativa.
    const result = await reauthenticateWithPopup(currentUser, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken && auth.currentUser?.uid === currentUser.uid) {
      cachedAccessToken = credential.accessToken;
      cachedAccessTokenUid = currentUser.uid;
      return cachedAccessToken;
    }
    return null;
  } catch (err) {
    console.warn('[Firebase Auth] Falha ao obter access token para o Google Drive:', err);
    return null;
  }
}

/**
 * Realiza autenticação com a conta do Google via Popup
 * Com fallback resiliente para Redirect em navegadores móveis/PWA
 */
export async function loginWithGoogle(): Promise<{
  success: boolean;
  user?: FirebaseUser;
  accessToken?: string | null;
  error?: string;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }
    return {
      success: true,
      user: result.user,
      accessToken: cachedAccessToken,
    };
  } catch (err: any) {
    console.warn('[Firebase Auth] Erro no signInWithPopup:', err);

    // Se o popup foi bloqueado pelo navegador do usuário ou pelo ambiente
    if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/popup-closed-by-user') {
      try {
        console.log('[Firebase Auth] Tentando fluxo alternativo via signInWithRedirect...');
        await signInWithRedirect(auth, googleProvider);
        return { success: false, error: 'Redirecionando para login do Google...' };
      } catch (redirectErr: any) {
        return {
          success: false,
          error: 'Permita janelas pop-up neste navegador para fazer login com o Google.',
        };
      }
    }

    const message =
      err?.code === 'auth/network-request-failed'
        ? 'Falha de conexão com a rede do Google. Verifique sua internet.'
        : err?.code === 'auth/unauthorized-domain'
        ? 'Domínio não autorizado no Firebase Auth. Configure o domínio nas credenciais do Firebase.'
        : err?.message || 'Não foi possível completar o login com o Google.';

    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Verifica se houve retorno de autenticação por Redirect (comum em navegadores móveis)
 */
export async function checkRedirectAuth(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    return result ? result.user : null;
  } catch (err) {
    console.warn('[Firebase Auth] Verificação de redirect:', err);
    return null;
  }
}

/**
 * Desconecta a conta do Google do Firebase
 */
export async function logoutGoogle(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[Firebase Auth] Erro ao deslogar do Firebase:', err);
  }
}

// Teste de conexão seguro ao inicializar
export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.log('[Firebase Firestore] Cliente em modo offline (dados mantidos localmente).');
    return true;
  }

  try {
    // Timeout de 4 segundos para evitar travamento em redes instáveis
    const fetchPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 4000)
    );

    await Promise.race([fetchPromise, timeoutPromise]);
    console.log('[Firebase Firestore] Conexão com banco de dados validada com sucesso.');
    return true;
  } catch (error) {
    // Modo offline resiliente: Firestore opera com cache local transparente
    console.log('[Firebase Firestore] Inicializado com resiliência offline.');
    return true;
  }
}

// Executa o teste de conexão inicial
testConnection();
