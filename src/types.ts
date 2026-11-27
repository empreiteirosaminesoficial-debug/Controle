export type PaymentStatus = 'pago' | 'pendente' | 'parcial' | 'atrasado' | 'cancelado';

export type PaymentMethod = 'PIX' | 'Boleto' | 'Cartão' | 'Transferência' | 'Dinheiro' | 'Outro';

export interface ServicePhoto {
  id: string;
  dataUrl: string; // base64 or blob URL
  name: string;
  uploadedAt: string;
  caption?: string;
  sizeBytes?: number;
}

export interface ServiceRecord {
  id: string;
  storeId: string;
  storeName: string;
  storeCnpj: string;
  date: string; // YYYY-MM-DD
  serviceTitle?: string; // Título do serviço
  sinapiCode?: string; // Código oficial no SINAPI (ex: 88316)
  sinapiUnit?: string; // Unidade de medida (m², m, un, pt, m³)
  sinapiUnitPrice?: number; // Valor unitário de referência SINAPI (R$)
  sinapiQuantity?: number; // Quantidade calculada
  description: string;
  category: string;
  valueCharged: number; // Valor cobrado (R$)
  valuePaid: number;    // Valor pago (R$)
  valueDebit: number;   // Débitos adicionais associados (R$)
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  dueDate?: string;     // Data de vencimento
  paidDate?: string;    // Data de quitação
  notes?: string;
  photos: ServicePhoto[];
  createdAt: string;
  updatedAt: string;
  /** Histórico de parcelas/pagamentos recebidos (sincronizado com o cliente). */
  paymentHistory?: PaymentInstallment[];
  /** Comprovante consolidado gerado automaticamente na quitação. */
  consolidatedReceipt?: ConsolidatedReceipt;
}

export interface PaymentInstallment {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  method: PaymentMethod;
  receiptNumber?: string;
  note?: string;
  recordedAt: string;
}

export interface ConsolidatedReceipt {
  receiptNumber: string;
  generatedAt: string;
  paidDate: string;
  totalCharged: number;
  totalDebit: number;
  totalPaid: number;
  installments: PaymentInstallment[];
}

export type DocumentType = 'CNPJ' | 'CPF';

export interface StoreProfile {
  id: string;
  documentType?: DocumentType; // 'CNPJ' | 'CPF'
  cnpj: string; // formatted 00.000.000/0000-00 or 000.000.000-00
  cleanCnpj: string; // 14 or 11 digits
  ownerEmail?: string; // Google email of the client who owns this store
  authorizedEmails?: string[]; // List of Google emails with authorized access
  razaoSocial: string;
  nomeFantasia: string;
  dataNascimento?: string; // Data de Nascimento (CPF) ou Data de Fundação/Início de Atividade (CNPJ)
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  telefone?: string;
  email?: string;
  atividadePrincipal?: string;
  situacaoCadastral?: string;
  status?: 'active' | 'blocked';
  blockedReason?: string;
  blockedAt?: string;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export type UserRole = 'admin' | 'client';
export type ProfileStatus = 'active' | 'pending' | 'blocked';

export interface AuthSettings {
  requireAdminApproval: boolean;
  allowClientGoogleLogin: boolean;
  notifyOnNewRegistration: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  roleLabel?: string;
  clientDocument?: string; // Primary bound CNPJ or CPF if client
  clientDocuments?: string[]; // All bound CNPJs or CPFs for this client
  authorizedStoreIds?: string[]; // Store IDs explicitly approved by the administrator
  phone?: string; // Contact phone
  isGoogleAuthenticated: boolean;
  lastLoginAt?: string;
  status?: ProfileStatus; // 'active' | 'pending' | 'blocked'
  statusReason?: string;
  statusUpdatedAt?: string;
  createdAt?: string;
  blockedAt?: string;
  activatedAt?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  type: 'novo_servico' | 'debito' | 'pagamento' | 'status' | 'aviso' | 'comprovante';
  timestamp: string;
  read: boolean;
  serviceId?: string;
  clientEmail?: string;
  amount?: number;
  receiptNumber?: string;
  /** Identifica o estabelecimento destinatário; usado somente em notificações direcionadas ao cliente. */
  storeId?: string;
  /** Notificações administrativas ficam separadas das notificações destinadas ao cliente. */
  audience?: 'admin' | 'client';
  /** Área do app relacionada (usada para os contadores/badges dos botões). */
  category?: 'servico' | 'visita' | 'orcamento' | 'obra' | 'pagamento' | 'comprovante' | 'empresa';
  /** Visita relacionada, quando houver. */
  visitaId?: string;
}

export interface GeneratedReceipt {
  id: string;
  receiptNumber: string;
  serviceId: string;
  serviceDescription: string;
  storeId: string;
  storeName: string;
  storeCnpj: string;
  clientOwnerEmail?: string;
  amountReceived: number;
  totalServiceCharged: number;
  totalServicePaidBefore: number;
  newRemainingBalance: number;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  notes?: string;
  photoUrl?: string;
  generatedAt: string;
  generatedBy: string;
}

export interface PixPaymentConfig {
  pixKey: string;
  beneficiaryName?: string;
  bankName?: string;
}

export interface EmpresaSpecialty {
  id: string;
  title: string;
  description: string;
  category: string; // 'Construção' | 'Elétrica' | 'Pintura' | 'Hidráulica' | 'Impermeabilização' | 'Drywall' | 'Outro'
}

export interface EmpresaGuarantee {
  id: string;
  title: string;
  description: string;
  badgeType: 'guarantee' | 'clock' | 'award';
}

export interface EmpresaProfile {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  responsavelTecnico: string;
  regiaoAtendimento: string;
  emissaoNotaFiscal: string;
  emailCorporativo: string;
  telefoneContato: string;
  anosExperiencia: string;
  descricaoInstitucional: string;
  specialties: EmpresaSpecialty[];
  guarantees: EmpresaGuarantee[];
}

export interface FinancialSummary {
  totalCharged: number;
  totalPaid: number;
  totalPending: number;
  totalDebits: number;
  netBalance: number;
  totalServicesCount: number;
  paidPercentage: number;
  totalNotaFiscal: number; // Valor de Débito Extra/Custo com acréscimo de +38% da Nota Fiscal (não soma no valor cobrado)
  totalImpostoNF: number;   // Parcela de 38% correspondente aos impostos de NF exclusivamente sobre débitos extras/custos
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

export interface SyncLogEntry {
  id: string;
  timestamp: string;
  action: string;
  itemCount: number;
  status: 'success' | 'warning' | 'error';
  details: string;
}

export interface SyncSettings {
  autoSyncEnabled: boolean;
  syncIntervalSeconds: number;
  crossTabSyncEnabled: boolean;
  notifyOnSync: boolean;
  lastSyncedAt: string | null;
}

export interface FullBackupData {
  version: string;
  exportedAt: string;
  userEmail?: string;
  services: ServiceRecord[];
  stores: StoreProfile[];
  notifications: AppNotification[];
  user: UserProfile;
}

export interface CloudBackupItem {
  id: string;
  timestamp: string;
  version: string;
  createdBy: string;
  servicesCount: number;
  storesCount: number;
  profilesCount: number;
  services: ServiceRecord[];
  stores: StoreProfile[];
  userProfiles?: UserProfile[];
  notes?: string;
}

export interface CloudDatabaseStatus {
  connected: boolean;
  lastChecked: string;
  error?: string;
  databaseId?: string;
  totalCloudBackups?: number;
  lastBackupAt?: string;
}

export type ScheduledBackupFrequency = 'daily' | 'weekdays' | 'custom_days' | 'interval_hours';

export interface ScheduledBackupConfig {
  enabled: boolean;
  times: string[]; // List of HH:mm format times, e.g. ["04:00", "08:00", "12:00", "18:00", "22:00"]
  frequency: ScheduledBackupFrequency;
  customDays: number[]; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  intervalHours?: number; // E.g., every 4 or 6 hours if interval_hours frequency is chosen
  maxRetentionCount: number; // Max backups stored in Firebase before oldest is recycled (e.g. 7, 15, 30; 0 = unlimited)
  notifyOnSuccess: boolean;
  lastExecutedAt?: string | null;
  lastExecutedSlot?: string | null; // Identifier for the slot executed, e.g. "2026-10-02_18:00"
  nextScheduledAt?: string | null;
  lastStatus?: 'idle' | 'running' | 'success' | 'error';
  lastError?: string;
  // Google Drive integration for automatic 4:00 AM backups
  googleDriveEnabled?: boolean;
  googleDriveScheduledTime?: string; // Default: '04:00'
  lastGoogleDriveBackupAt?: string | null;
  lastGoogleDriveFileLink?: string | null;
  lastGoogleDriveFileName?: string | null;
}

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  itemCount?: number;
}

export type AppPage = 
  | 'dashboard'
  | 'obras'
  | 'servicos'
  | 'visitas'
  | 'clientes'
  | 'comprovantes'
  | 'empresa';

export type ObraStatus = 'planejamento' | 'em_andamento' | 'pausada' | 'concluida';

export interface ObraRecord {
  id: string;
  title: string;
  storeId: string;
  storeName: string;
  storeCnpj: string;
  description: string;
  location: string;
  startDate: string;
  targetEndDate: string;
  completionDate?: string;
  status: ObraStatus;
  progressPercent: number; // 0 to 100
  estimatedBudget: number;
  actualCost: number;
  leadEngineer?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type VisitaStatus = 'solicitada' | 'agendada' | 'realizada' | 'cancelada';
export type VisitaPurpose = 'orcamento' | 'vistoria_previa' | 'acompanhamento' | 'entrega_tecnica' | 'emergencial';

export interface VisitaRecord {
  id: string;
  storeId?: string;
  clientName: string;
  clientDocument?: string;
  clientPhone?: string;
  address?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  purpose?: VisitaPurpose;
  technician?: string;
  status: VisitaStatus;
  notificationTitle?: string;
  notes?: string;
  createdByUid?: string;
  photos?: string[];
  estimatedBudgetProposal?: number;
  createdAt: string;
  updatedAt: string;
}



// --- WhatsApp: somente links diretos, sem integração por API ---
export interface WhatsAppTemplates {
  paymentReminder: string;
  obraUpdate: string;
  receiptConfirmation: string;
  visitaScheduled: string;
}

export interface WhatsAppConfig {
  templates: WhatsAppTemplates;
}


