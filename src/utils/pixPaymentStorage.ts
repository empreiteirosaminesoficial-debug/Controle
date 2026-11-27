import type { PixPaymentConfig } from '../types';

const STORAGE_KEY = 'samines_pix_payment_config';
const LEGACY_STORAGE_KEY = 'samines_monday_pix_config';

export const DEFAULT_PIX_PAYMENT_CONFIG: PixPaymentConfig = {
  pixKey: 'empreiteirosaminesoficial@gmail.com',
  beneficiaryName: 'Saminês Mestre de Obras',
  bankName: 'Banco Inter / Nu Pagamentos',
};

export function loadPixPaymentConfig(): PixPaymentConfig {
  if (typeof window === 'undefined') return DEFAULT_PIX_PAYMENT_CONFIG;

  try {
    const currentRaw = localStorage.getItem(STORAGE_KEY);

    if (currentRaw) {
      const current = JSON.parse(currentRaw);
      return {
        ...DEFAULT_PIX_PAYMENT_CONFIG,
        ...(current && typeof current === 'object' ? current : {}),
      };
    }

    // Migra os dados PIX do armazenamento antigo antes da remoção do lembrete.
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);

    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      const migrated: PixPaymentConfig = {
        pixKey: typeof legacy.pixKey === 'string'
          ? legacy.pixKey
          : DEFAULT_PIX_PAYMENT_CONFIG.pixKey,
        beneficiaryName: typeof legacy.beneficiaryName === 'string'
          ? legacy.beneficiaryName
          : DEFAULT_PIX_PAYMENT_CONFIG.beneficiaryName,
        bankName: typeof legacy.bankName === 'string'
          ? legacy.bankName
          : DEFAULT_PIX_PAYMENT_CONFIG.bankName,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (error) {
    console.warn('[PIX] Não foi possível carregar a configuração:', error);
  }

  return DEFAULT_PIX_PAYMENT_CONFIG;
}

export function savePixPaymentConfig(config: PixPaymentConfig): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('[PIX] Não foi possível salvar a configuração:', error);
  }
}