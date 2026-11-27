import { 
  AppNotification, 
  AuthSettings, 
  ObraRecord, 
  ProfileStatus, 
  ServiceRecord, 
  StoreProfile, 
  UserProfile, 
  UserRole, 
  VisitaRecord 
} from '../types';

const STORAGE_KEYS = {
  SERVICES: 'gestao_servicos_records_v1',
  STORES: 'gestao_servicos_stores_v1',
  USER: 'gestao_servicos_user_v4',
  USER_PROFILES: 'gestao_servicos_user_profiles_v2',
  ACTIVE_EMAIL: 'gestao_servicos_active_email_v4',
  NOTIFICATIONS: 'gestao_servicos_notifs_v1',
  NOTIFICATION_PERMISSION_ASKED: 'gestao_servicos_notif_asked_v1',
  AUTH_SETTINGS: 'gestao_servicos_auth_settings_v1',
  DELETED_EMAILS: 'gestao_servicos_deleted_emails_v1',
  OBRAS: 'gestao_servicos_obras_v1',
  VISITAS: 'gestao_servicos_visitas_v1',
};

// Preserva dados e sessão de login do usuário no PWA e navegador
export function forceFullAppSessionReset(): void {
  // Chamado apenas explicitamente quando solicitado pelo usuário
}

export const INITIAL_AUTH_SETTINGS: AuthSettings = {
  requireAdminApproval: false,
  allowClientGoogleLogin: true,
  notifyOnNewRegistration: true,
};

// Auto-purge any demo/mock items stored in prior sessions
const PURGE_MOCKS_VERSION_KEY = 'samines_cleaned_mock_demo_data_v2';
if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem(PURGE_MOCKS_VERSION_KEY) !== 'true') {
      const DEMO_STORE_IDS = ['store_1', 'store_2', 'store_3', 'store_4'];
      const DEMO_DOCS = ['12345678000195', '98765432000110', '38192045812', '45892120000134'];
      const DEMO_SERVICE_IDS = ['serv_101', 'serv_102', 'serv_103', 'serv_104', 'serv_105', 'serv_106'];
      const DEMO_OBRA_IDS = ['obra_1', 'obra_2', 'obra_3'];
      const DEMO_VISITA_IDS = ['vis_1', 'vis_2', 'vis_3'];
      const DEMO_NOTIF_IDS = ['notif_1', 'notif_2'];

      const curServices = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVICES) || '[]');
      const cleanedServices = curServices.filter((s: any) => 
        !DEMO_SERVICE_IDS.includes(s.id) && !DEMO_STORE_IDS.includes(s.storeId)
      );
      localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(cleanedServices));

      const curStores = JSON.parse(localStorage.getItem(STORAGE_KEYS.STORES) || '[]');
      const cleanedStores = curStores.filter((st: any) => 
        !DEMO_STORE_IDS.includes(st.id) &&
        !DEMO_DOCS.includes((st.cleanCnpj || st.cnpj || '').replace(/\D/g, ''))
      );
      localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(cleanedStores));

      const curObras = JSON.parse(localStorage.getItem(STORAGE_KEYS.OBRAS) || '[]');
      const cleanedObras = curObras.filter((o: any) => !DEMO_OBRA_IDS.includes(o.id));
      localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(cleanedObras));

      const curVisitas = JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITAS) || '[]');
      const cleanedVisitas = curVisitas.filter((v: any) => !DEMO_VISITA_IDS.includes(v.id));
      localStorage.setItem(STORAGE_KEYS.VISITAS, JSON.stringify(cleanedVisitas));

      const curNotifs = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
      const cleanedNotifs = curNotifs.filter((n: any) => !DEMO_NOTIF_IDS.includes(n.id));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(cleanedNotifs));

      localStorage.setItem(PURGE_MOCKS_VERSION_KEY, 'true');
    }
  } catch (e) {
    console.error('Falha ao limpar dados de teste:', e);
  }
}

export const INITIAL_STORES: StoreProfile[] = [];

export const INITIAL_SERVICES: ServiceRecord[] = [];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export function loadServices(): ServiceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SERVICES);
    if (!raw) {
      saveServices(INITIAL_SERVICES);
      return INITIAL_SERVICES;
    }
    const parsed: ServiceRecord[] = JSON.parse(raw);
    const cleaned = parsed
      .filter(s => 
        !['store_1', 'store_2', 'store_3', 'store_4'].includes(s.storeId) &&
        s.storeCnpj !== '45.892.120/0001-34' &&
        !['serv_101', 'serv_102', 'serv_103', 'serv_104', 'serv_105', 'serv_106'].includes(s.id)
      );
    if (cleaned.length !== parsed.length) {
      saveServices(cleaned);
    }
    return cleaned;
  } catch {
    return INITIAL_SERVICES;
  }
}

export function saveServices(services: ServiceRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
  } catch (err) {
    console.error('Falha ao salvar serviços no localStorage:', err);
  }
}

export function loadAuthSettings(): AuthSettings {
  if (typeof window === 'undefined') return INITIAL_AUTH_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SETTINGS);
    if (!raw) return INITIAL_AUTH_SETTINGS;
    return { ...INITIAL_AUTH_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return INITIAL_AUTH_SETTINGS;
  }
}

export function saveAuthSettings(settings: AuthSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_SETTINGS, JSON.stringify(settings));
  } catch {}
}

export function loadDeletedUserEmails(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_EMAILS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveDeletedUserEmails(emails: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.DELETED_EMAILS, JSON.stringify(emails));
  } catch {}
}

export function loadAllUserProfiles(): Record<string, UserProfile> {
  // Perfis locais são apenas dados de conveniência; nunca semeiam nem promovem administradores.
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILES);
    const parsed: Record<string, UserProfile> = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function syncStoresWithUserProfiles(storesList?: StoreProfile[]): Record<string, UserProfile> {
  const currentStores = storesList || loadStores();
  const allProfiles = loadAllUserProfiles();

  for (const st of currentStores) {
    const cleanDoc = (st.cleanCnpj || st.cnpj || '').replace(/\D/g, '');
    if (!cleanDoc) continue;

    const primaryEmail = (st.ownerEmail || st.email || '').trim().toLowerCase();
    if (!primaryEmail || primaryEmail === 'empreiteirosaminesoficial@gmail.com') continue;

    // SOMENTE associa documentos se o perfil já foi explicitamente criado pelo usuário.
    // NUNCA cria perfis de clientes automaticamente do zero.
    if (allProfiles[primaryEmail]) {
      const docSet = new Set<string>(allProfiles[primaryEmail].clientDocuments || []);
      docSet.add(st.cnpj);
      if (allProfiles[primaryEmail].clientDocument) docSet.add(allProfiles[primaryEmail].clientDocument!);
      allProfiles[primaryEmail].clientDocuments = Array.from(docSet);
    }
  }

  saveAllUserProfiles(allProfiles);
  return allProfiles;
}

export function saveAllUserProfiles(profiles: Record<string, UserProfile>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
  } catch (err) {
    console.warn('Erro ao salvar perfis de usuários:', err);
  }
}

/**
 * Administrative action: Blocks a Google user profile
 */
export function blockUserProfile(email: string, reason?: string): UserProfile | null {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail || normEmail === 'empreiteirosaminesoficial@gmail.com') {
    return null; // Master admin cannot be blocked
  }

  const allProfiles = loadAllUserProfiles();
  const profile = allProfiles[normEmail];
  if (!profile) return null;

  const updated: UserProfile = {
    ...profile,
    status: 'blocked',
    statusReason: reason?.trim() || 'Acesso suspenso pelo administrador',
    blockedAt: new Date().toISOString(),
    statusUpdatedAt: new Date().toISOString(),
  };

  allProfiles[normEmail] = updated;
  saveAllUserProfiles(allProfiles);

  if (getActiveEmail() === normEmail) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

/**
 * Administrative action: Activates/unblocks a Google user profile
 */
export function activateUserProfile(email: string): UserProfile | null {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail) return null;

  const allProfiles = loadAllUserProfiles();
  const profile = allProfiles[normEmail];
  if (!profile) return null;

  const updated: UserProfile = {
    ...profile,
    status: 'active',
    statusReason: undefined,
    blockedAt: undefined,
    activatedAt: new Date().toISOString(),
    statusUpdatedAt: new Date().toISOString(),
  };

  allProfiles[normEmail] = updated;
  saveAllUserProfiles(allProfiles);

  if (getActiveEmail() === normEmail) {
    try {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updated));
    } catch {}
  }

  return updated;
}

/**
 * Administrative action: Deletes a connected Google user profile
 */
export function deleteUserProfile(email: string): boolean {
  const normEmail = (email || '').trim().toLowerCase();
  if (!normEmail || normEmail === 'empreiteirosaminesoficial@gmail.com') {
    return false; // Master admin cannot be deleted
  }

  const allProfiles = loadAllUserProfiles();
  if (!allProfiles[normEmail]) return false;

  delete allProfiles[normEmail];
  saveAllUserProfiles(allProfiles);

  // Registra permanentemente na lista de e-mails deletados para impedir ressurgimento
  const deleted = loadDeletedUserEmails();
  if (!deleted.includes(normEmail)) {
    deleted.push(normEmail);
    saveDeletedUserEmails(deleted);
  }

  // If deleted profile was currently active, logout to show login screen
  if (getActiveEmail() === normEmail) {
    logoutUser();
  }

  return true;
}

export function saveActiveEmail(email: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_EMAIL, email.trim().toLowerCase());
  } catch {}
}

export function getActiveEmail(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_EMAIL) || null;
  } catch {
    return null;
  }
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_EMAIL);
    localStorage.removeItem(STORAGE_KEYS.USER);
  } catch {}
}

export function loadUser(): UserProfile | null {
  // A sessão precisa ser reconstruída a partir do Firebase Auth, nunca do localStorage.
  // Retorna null para forçar o fluxo de autenticação quando o observador Firebase não confirmou identidade.
  return null;
}

export function saveUser(user: UserProfile | null | undefined) {
  try {
    if (!user) return;
    const normEmail = (user.email || '').trim().toLowerCase();
    if (!normEmail) return;

    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    saveActiveEmail(normEmail);

    const profiles = loadAllUserProfiles();
    profiles[normEmail] = {
      ...profiles[normEmail],
      ...user,
      email: normEmail,
      lastLoginAt: new Date().toISOString(),
    };
    saveAllUserProfiles(profiles);
  } catch (err) {
    console.error('Falha ao salvar usuário no localStorage:', err);
  }
}

/**
 * Unifies stores ONLY if their clean numeric CNPJ (14 digits) or CPF (11 digits) are strictly identical.
 * If CNPJ/CPF is different, stores remain completely separate!
 */
export function unifyStoresByExactDocument(storesList: StoreProfile[]): {
  unifiedStores: StoreProfile[];
  idRedirectMap: Map<string, string>;
} {
  const docMap = new Map<string, StoreProfile>();
  const idRedirectMap = new Map<string, string>();
  const unifiedList: StoreProfile[] = [];

  for (const st of storesList) {
    const clean = (st.cleanCnpj || st.cnpj || '').replace(/\D/g, '');
    const isValidDoc = clean.length === 11 || clean.length === 14;

    // Only unify when there is a valid 11 or 14 digits document. Different documents are NEVER unified!
    if (!isValidDoc) {
      unifiedList.push(st);
      continue;
    }

    if (!docMap.has(clean)) {
      docMap.set(clean, st);
      unifiedList.push(st);
    } else {
      // Exact identical CNPJ or CPF found! Unify into the canonical store
      const canonical = docMap.get(clean)!;
      idRedirectMap.set(st.id, canonical.id);

      // Merge authorized emails
      const emailSet = new Set<string>();
      if (canonical.ownerEmail) emailSet.add(canonical.ownerEmail.toLowerCase());
      if (canonical.authorizedEmails) canonical.authorizedEmails.forEach(e => emailSet.add(e.toLowerCase()));
      if (st.ownerEmail) emailSet.add(st.ownerEmail.toLowerCase());
      if (st.authorizedEmails) st.authorizedEmails.forEach(e => emailSet.add(e.toLowerCase()));

      canonical.authorizedEmails = Array.from(emailSet);
      if (!canonical.ownerEmail && st.ownerEmail) {
        canonical.ownerEmail = st.ownerEmail;
      }
      canonical.nomeFantasia = canonical.nomeFantasia || st.nomeFantasia;
      canonical.razaoSocial = canonical.razaoSocial || st.razaoSocial;
      canonical.logradouro = canonical.logradouro || st.logradouro;
      canonical.numero = canonical.numero || st.numero;
      canonical.bairro = canonical.bairro || st.bairro;
      canonical.municipio = canonical.municipio || st.municipio;
      canonical.uf = canonical.uf || st.uf;
      canonical.telefone = canonical.telefone || st.telefone;
      canonical.email = canonical.email || st.email;
      canonical.updatedAt = new Date().toISOString();
    }
  }

  return { unifiedStores: unifiedList, idRedirectMap };
}

export function loadStores(): StoreProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STORES);
    if (!raw) {
      saveStores(INITIAL_STORES);
      return INITIAL_STORES;
    }
    const parsed: StoreProfile[] = JSON.parse(raw);
    
    // Normalize cleanCnpj and documentType, excluding demo stores
    const normalized: StoreProfile[] = parsed
      .filter(st => 
        !['store_1', 'store_2', 'store_3', 'store_4'].includes(st.id) &&
        st.cnpj !== '45.892.120/0001-34' &&
        !['12345678000195', '98765432000110', '38192045812', '45892120000134'].includes((st.cleanCnpj || st.cnpj || '').replace(/\D/g, ''))
      )
      .map((st) => {
        const clean = (st.cleanCnpj || st.cnpj || '').replace(/\D/g, '');
        return {
          ...st,
          cleanCnpj: clean,
          documentType: st.documentType || (clean.length === 11 ? 'CPF' : 'CNPJ'),
        };
      });

    // Unify ONLY records that have the exact same CNPJ (14 digits) or CPF (11 digits)
    const { unifiedStores, idRedirectMap } = unifyStoresByExactDocument(normalized);

    // If duplicate stores or demo stores were removed, save cleaned list
    if (idRedirectMap.size > 0 || normalized.length !== parsed.length) {
      saveStores(unifiedStores);
      try {
        const currentServices = loadServices();
        let modified = false;
        const remappedServices = currentServices.map((s) => {
          if (idRedirectMap.has(s.storeId)) {
            modified = true;
            const newStoreId = idRedirectMap.get(s.storeId)!;
            const targetStore = unifiedStores.find(u => u.id === newStoreId);
            return {
              ...s,
              storeId: newStoreId,
              storeName: targetStore ? targetStore.nomeFantasia : s.storeName,
              storeCnpj: targetStore ? targetStore.cnpj : s.storeCnpj,
            };
          }
          return s;
        });
        if (modified) {
          saveServices(remappedServices);
        }
      } catch (e) {
        console.warn('Erro ao atualizar serviços após unificação de lojas:', e);
      }
    }

    return unifiedStores;
  } catch {
    return INITIAL_STORES;
  }
}

export function saveStores(stores: StoreProfile[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
  } catch (err) {
    console.error('Falha ao salvar lojas no localStorage:', err);
  }
}

export function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (!raw) {
      saveNotifications(INITIAL_NOTIFICATIONS);
      return INITIAL_NOTIFICATIONS;
    }
    const parsed: AppNotification[] = JSON.parse(raw);
    const seen = new Set<string>();
    const cleaned: AppNotification[] = [];
    for (const n of parsed) {
      if (n && n.id && !['notif_1', 'notif_2'].includes(n.id) && !seen.has(n.id)) {
        seen.add(n.id);
        cleaned.push(n);
      }
    }
    if (cleaned.length !== parsed.length) {
      saveNotifications(cleaned);
    }
    return cleaned;
  } catch {
    return INITIAL_NOTIFICATIONS;
  }
}

export function saveNotifications(notifs: AppNotification[]) {
  try {
    const seen = new Set<string>();
    const uniqueNotifs = (notifs || []).filter((n) => {
      if (!n || !n.id || seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(uniqueNotifs));
  } catch (err) {
    console.error('Falha ao salvar notificações no localStorage:', err);
  }
}

export const INITIAL_OBRAS: ObraRecord[] = [];

export function loadObras(): ObraRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OBRAS);
    if (!raw) {
      saveObras(INITIAL_OBRAS);
      return INITIAL_OBRAS;
    }
    const parsed: ObraRecord[] = JSON.parse(raw);
    const cleaned = parsed.filter(o => !['obra_1', 'obra_2', 'obra_3'].includes(o.id));
    if (cleaned.length !== parsed.length) {
      saveObras(cleaned);
    }
    return cleaned;
  } catch {
    return INITIAL_OBRAS;
  }
}

export function saveObras(obras: ObraRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.OBRAS, JSON.stringify(obras));
  } catch (err) {
    console.error('Falha ao salvar obras no localStorage:', err);
  }
}

export const INITIAL_VISITAS: VisitaRecord[] = [];

export function loadVisitas(): VisitaRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VISITAS);
    if (!raw) {
      saveVisitas(INITIAL_VISITAS);
      return INITIAL_VISITAS;
    }
    const parsed: VisitaRecord[] = JSON.parse(raw);
    const cleaned = parsed.filter(v => !['vis_1', 'vis_2', 'vis_3'].includes(v.id));
    if (cleaned.length !== parsed.length) {
      saveVisitas(cleaned);
    }
    return cleaned;
  } catch {
    return INITIAL_VISITAS;
  }
}

export function saveVisitas(visitas: VisitaRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.VISITAS, JSON.stringify(visitas));
  } catch (err) {
    console.error('Falha ao salvar visitas no localStorage:', err);
  }
}
