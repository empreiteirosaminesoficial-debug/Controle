/**
 * Gerador de Comprovantes Oficiais de Pagamento
 * Registra o valor recebido, calcula novo saldo, anexa comprovante ao serviço
 * e gera notificação automática para o cliente cadastrado.
 */

import { GeneratedReceipt, ServiceRecord, StoreProfile, AppNotification, PaymentMethod } from '../types';
import { formatCurrency } from './formatters';

const RECEIPTS_KEY = 'gestao_comprovantes_gerados_v1';

export function loadGeneratedReceipts(): GeneratedReceipt[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECEIPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveGeneratedReceipts(receipts: GeneratedReceipt[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  } catch (err) {
    console.error('Falha ao salvar comprovantes gerados:', err);
  }
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `REC-${dateStr}-${rand}`;
}

export function saveNewGeneratedReceipt(receipt: GeneratedReceipt): void {
  const current = loadGeneratedReceipts();
  const updated = [receipt, ...current];
  saveGeneratedReceipts(updated);
}

/**
 * Monta o texto pronto para compartilhamento via WhatsApp
 */
export function buildWhatsAppReceiptMessage(receipt: GeneratedReceipt): string {
  const statusStr = receipt.newRemainingBalance <= 0.01 
    ? '✅ 100% QUITADO' 
    : `⚠️ Saldo restante: ${formatCurrency(receipt.newRemainingBalance)}`;

  const lines = [
    `🧾 *COMPROVANTE OFICIAL DE PAGAMENTO*`,
    `*Empreiteiro Saminês - Construção Civil & Reformas*`,
    `----------------------------------------`,
    `📄 *Recibo:* #${receipt.receiptNumber}`,
    `📅 *Data do Recebimento:* ${receipt.paymentDate}`,
    `👤 *Cliente:* ${receipt.storeName}`,
    `🏢 *CNPJ/CPF:* ${receipt.storeCnpj || 'Não informado'}`,
    `🛠️ *Serviço:* ${receipt.serviceDescription}`,
    `----------------------------------------`,
    `💵 *VALOR RECEBIDO:* ${formatCurrency(receipt.amountReceived)}`,
    `💳 *Forma de Pagamento:* ${receipt.paymentMethod}`,
    `📊 *Status da Conta:* ${statusStr}`,
    receipt.notes ? `📝 *Observações:* ${receipt.notes}` : null,
    `----------------------------------------`,
    `✨ *Empreiteiro Saminês Oficial*`,
    `CNPJ: 50.814.717/0001-95 | Tel: (11) 98836-8488`,
    `Agradecemos a confiança e preferência!`
  ].filter(Boolean);

  return encodeURIComponent(lines.join('\n'));
}

/**
 * Cria a notificação para o cliente cadastrado
 */
export function createClientReceiptNotification(params: {
  receipt: GeneratedReceipt;
  store?: StoreProfile;
}): AppNotification {
  const { receipt, store } = params;
  const isPaidOff = receipt.newRemainingBalance <= 0.01;

  const targetEmail = store?.ownerEmail || store?.email || (store?.authorizedEmails && store.authorizedEmails[0]) || '';

  return {
    id: `notif_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: `Comprovante de Pagamento Emitido: ${formatCurrency(receipt.amountReceived)} 🧾`,
    body: `Recebimento confirmado para o serviço "${receipt.serviceDescription}" da loja ${receipt.storeName}. Forma: ${receipt.paymentMethod}. ${isPaidOff ? 'Serviço 100% quitado!' : `Saldo restante: ${formatCurrency(receipt.newRemainingBalance)}.`}`,
    type: 'comprovante',
    timestamp: new Date().toISOString(),
    read: false,
    serviceId: receipt.serviceId,
    clientEmail: targetEmail,
    amount: receipt.amountReceived,
    receiptNumber: receipt.receiptNumber,
  };
}
