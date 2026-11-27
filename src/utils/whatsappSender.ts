
export interface SendWhatsAppMessageOptions {
  phone?: string;
  message: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  mode: 'direct_link';
  message: string;
}

/**
 * Normaliza número de telefone para formato internacional com DDI (ex: 5511999999999)
 */
export function normalizeWhatsAppNumber(rawPhone?: string, defaultCountryCode = '55'): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return '';

  // Se já tiver DDI brasileiro (ex: 5511999999999)
  if (digits.length === 12 || digits.length === 13) {
    return digits;
  }

  // Se for DDD + Número (ex: 11999999999)
  if (digits.length === 10 || digits.length === 11) {
    return `${defaultCountryCode}${digits}`;
  }

  return digits;
}

/**
 * Substitui tags em textos de templates
 */
export function formatTemplateMessage(template: string, variables: Record<string, string | number | undefined>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const valStr = value !== undefined && value !== null ? String(value) : '';
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), valStr);
  }
  return result;
}

/**
 * Envia ou abre a mensagem de WhatsApp
 */
export async function sendWhatsAppMessage(options: SendWhatsAppMessageOptions): Promise<SendWhatsAppResult> {
  const { phone, message } = options;
  const cleanPhone = normalizeWhatsAppNumber(phone, '55');

  // Sempre abre uma conversa no WhatsApp; nenhuma API é chamada pelo aplicativo.
  const encoded = encodeURIComponent(message.trim());
  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  return {
    success: true,
    mode: 'direct_link',
    message: 'Conversa aberta no WhatsApp para envio manual.',
  };
}
