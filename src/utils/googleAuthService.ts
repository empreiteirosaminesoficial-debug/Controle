import { loginWithGoogle, checkRedirectAuth, logoutGoogle, db } from '../lib/firebase';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';
import { 
  saveActiveEmail, 
  saveUser, 
} from './storage';

const ADMIN_EMAIL = 'empreiteirosaminesoficial@gmail.com';

export interface GoogleLoginResult {
  success: boolean;
  profile?: UserProfile;
  error?: string;
  isNewAccount?: boolean;
}

/**
 * Processa um usuário autenticado pelo Google e sincroniza o perfil no sistema
 */
export async function processGoogleAuthUser(googleUser: {
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  uid?: string;
  emailVerified?: boolean;
}): Promise<GoogleLoginResult> {
  const verifiedEmail = (googleUser.email || '').trim();
  const email = verifiedEmail.toLowerCase();
  if (!email) {
    return {
      success: false,
      error: 'Não foi possível obter o e-mail da sua conta Google.',
    };
  }

  const isAdmin = email === ADMIN_EMAIL;
  if (googleUser.emailVerified !== true) {
    return { success: false, error: 'A conta Google precisa ter o e-mail verificado para solicitar acesso.' };
  }

  if (!isAdmin) {
    // Registra uma solicitação mínima, imutável pelo próprio cliente. O documento é
    // endereçado pelo UID Firebase; CPF/CNPJ e perfis locais não concedem autorização.
    const uid = googleUser.uid;
    if (!uid) {
      return { success: false, error: 'Não foi possível identificar sua conta Google. Entre novamente.' };
    }
    const requestRef = doc(db, 'accessRequests', uid);
    try {
      await runTransaction(db, async (transaction) => {
        const existingRequest = await transaction.get(requestRef);
        if (!existingRequest.exists()) {
          transaction.set(requestRef, {
            uid,
            email: verifiedEmail,
            displayName: googleUser.displayName || '',
            photoURL: googleUser.photoURL || '',
            status: 'pending',
            requestedAt: serverTimestamp(),
          });
        }
      });
    } catch (error) {
      console.error('[Auth] Falha ao registrar solicitação de acesso:', error);
      return {
        success: false,
        error: 'Não foi possível registrar sua solicitação. Verifique a conexão e tente novamente.',
      };
    }
    const requestSnapshot = await getDoc(requestRef);
    if (!requestSnapshot.exists()) {
      return { success: false, error: 'A solicitação de acesso não foi localizada. Entre novamente.' };
    }
    const requestData = requestSnapshot.data();
    if (requestData.uid !== uid || String(requestData.email || '').toLowerCase() !== email) {
      return { success: false, error: 'A solicitação não corresponde à identidade Google autenticada.' };
    }
    const requestedStoreIds = Array.isArray(requestData.storeIds)
      ? Array.from(new Set(requestData.storeIds.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)))
      : [];
    // A lista no pedido não basta: cada vínculo precisa existir e estar ativo no subdocumento protegido.
    const membershipChecks = await Promise.all(requestedStoreIds.map(async (storeId) => {
      try {
        const [memberSnapshot, storeSnapshot] = await Promise.all([
          getDoc(doc(db, 'stores', storeId, 'members', uid)),
          getDoc(doc(db, 'stores', storeId)),
        ]);
        if (!memberSnapshot.exists() || !storeSnapshot.exists()) return null;
        const member = memberSnapshot.data();
        const store = storeSnapshot.data();
        const storeIsActive = store.status === undefined || store.status === 'active';
        return member.uid === uid && member.storeId === storeId && member.status === 'active' && storeIsActive
          ? storeId
          : null;
      } catch (error) {
        console.warn(`[Auth] Não foi possível validar o vínculo ${storeId}:`, error);
        return null;
      }
    }));
    const authorizedStoreIds = membershipChecks.filter((value): value is string => Boolean(value));
    const approved = requestData.status === 'approved' && authorizedStoreIds.length > 0;
    const rejected = requestData.status === 'rejected';
    return {
      success: true,
      isNewAccount: !requestData.status || requestData.status === 'pending',
      profile: {
        id: uid,
        name: googleUser.displayName || email.split('@')[0],
        email,
        avatar: googleUser.photoURL || '/logo-transparent.png',
        role: 'client',
        roleLabel: approved ? 'Cliente autorizado' : 'Solicitação de acesso',
        isGoogleAuthenticated: true,
        status: approved ? 'active' : rejected ? 'blocked' : 'pending',
        authorizedStoreIds: approved ? authorizedStoreIds : [],
        createdAt: new Date().toISOString(),
      },
    };
  }

  const adminProfile: UserProfile = {
    id: googleUser.uid || email,
    name: googleUser.displayName || 'Empreiteiro Saminês',
    email: ADMIN_EMAIL,
    avatar: googleUser.photoURL || '/logo-transparent.png',
    role: 'admin',
    roleLabel: 'Empreiteiro / Gestor',
    isGoogleAuthenticated: true,
    status: 'active',
    lastLoginAt: new Date().toISOString(),
  };

  saveUser(adminProfile);
  saveActiveEmail(adminProfile.email);
  return { success: true, profile: adminProfile, isNewAccount: false };
}

/**
 * Inicia o fluxo oficial de login do Google
 */
export async function executeGoogleLogin(): Promise<GoogleLoginResult> {
  const result = await loginWithGoogle();
  if (!result.success || !result.user) {
    return {
      success: false,
      error: result.error || 'Autenticação com o Google cancelada ou indisponível.',
    };
  }

  return processGoogleAuthUser({
    email: result.user.email,
    displayName: result.user.displayName,
    photoURL: result.user.photoURL,
    uid: result.user.uid,
    emailVerified: result.user.emailVerified,
  });
}

/**
 * Verifica se houve redirecionamento de autenticação concluído
 */
export async function checkInitialGoogleRedirect(): Promise<GoogleLoginResult | null> {
  const redirectedUser = await checkRedirectAuth();
  if (!redirectedUser || !redirectedUser.email) {
    return null;
  }

  return processGoogleAuthUser({
    email: redirectedUser.email,
    displayName: redirectedUser.displayName,
    photoURL: redirectedUser.photoURL,
    uid: redirectedUser.uid,
    emailVerified: redirectedUser.emailVerified,
  });
}

/**
 * Logout do Google
 */
export async function executeGoogleLogout(): Promise<void> {
  await logoutGoogle();
}
