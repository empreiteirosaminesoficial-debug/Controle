/**
 * Comprovante consolidado: guarda cada parcela no próprio serviço (assim o
 * histórico sincroniza com o cliente) e, na quitação, anexa automaticamente
 * um comprovante único com todas as parcelas.
 */
import type { ConsolidatedReceipt, PaymentInstallment, PaymentMethod, ServiceRecord } from '../types';
import { loadEmpresaProfile } from './empresaStorage';

function totalDue(service: ServiceRecord): number {
  return (service.valueCharged || 0) + (service.valueDebit || 0);
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Parcelas registradas + uma linha para valores pagos antes do histórico existir. */
export function getInstallmentsWithLegacy(service: ServiceRecord): PaymentInstallment[] {
  const history = [...(service.paymentHistory || [])].sort((a, b) => a.date.localeCompare(b.date) || a.recordedAt.localeCompare(b.recordedAt));
  const recorded = history.reduce((sum, item) => sum + (item.amount || 0), 0);
  const legacy = round2((service.valuePaid || 0) - recorded);
  if (legacy > 0.009) {
    history.unshift({
      id: `legacy_${service.id}`,
      date: service.date,
      amount: legacy,
      method: service.paymentMethod,
      note: 'Pagamentos anteriores (registrados antes do histórico de parcelas)',
      recordedAt: service.createdAt,
    });
  }
  return history;
}

/**
 * Registra uma parcela no serviço já atualizado (valuePaid/status). Se o serviço
 * ficou quitado e ainda não tem comprovante consolidado, gera um.
 */
export function registerInstallment(
  service: ServiceRecord,
  installment: { amount: number; method: PaymentMethod; date: string; receiptNumber?: string; note?: string }
): { service: ServiceRecord; consolidatedCreated: boolean } {
  if (!(installment.amount > 0)) return { service, consolidatedCreated: false };
  const entry: PaymentInstallment = {
    id: `inst_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: installment.date || new Date().toISOString().split('T')[0],
    amount: round2(installment.amount),
    method: installment.method,
    receiptNumber: installment.receiptNumber,
    note: installment.note,
    recordedAt: new Date().toISOString(),
  };
  const withHistory: ServiceRecord = {
    ...service,
    paymentHistory: [...(service.paymentHistory || []), entry],
  };

  const paidInFull = (withHistory.valuePaid || 0) + 0.009 >= totalDue(withHistory) && totalDue(withHistory) > 0;
  if (!paidInFull || withHistory.consolidatedReceipt) {
    return { service: withHistory, consolidatedCreated: false };
  }

  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const consolidated: ConsolidatedReceipt = {
    receiptNumber: `QUIT-${stamp}-${withHistory.id.slice(-6).toUpperCase()}`,
    generatedAt: now.toISOString(),
    paidDate: withHistory.paidDate || entry.date,
    totalCharged: round2(withHistory.valueCharged || 0),
    totalDebit: round2(withHistory.valueDebit || 0),
    totalPaid: round2(withHistory.valuePaid || 0),
    installments: getInstallmentsWithLegacy(withHistory),
  };
  return { service: { ...withHistory, consolidatedReceipt: consolidated }, consolidatedCreated: true };
}

const brl = (value: number) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brDate = (iso: string) => {
  const [y, m, d] = (iso || '').split('T')[0].split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const esc = (text: string) => String(text ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Abre o comprovante consolidado numa janela pronta para imprimir/salvar em PDF. */
export function openConsolidatedReceipt(service: ServiceRecord): void {
  const receipt = service.consolidatedReceipt;
  if (!receipt) return;
  const empresa = loadEmpresaProfile();
  const rows = receipt.installments.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${esc(brDate(item.date))}</td>
        <td>${esc(String(item.method || '').toUpperCase())}</td>
        <td>${esc(item.receiptNumber || '—')}${item.note ? `<div class="note">${esc(item.note)}</div>` : ''}</td>
        <td class="num">${esc(brl(item.amount))}</td>
      </tr>`).join('');

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comprovante de quitação ${esc(receipt.receiptNumber)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:24px;font-size:13px}
  h1{font-size:18px;margin:0 0 4px} .muted{color:#475569}
  .box{border:1px solid #cbd5e1;border-radius:8px;padding:12px;margin:14px 0}
  table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border-bottom:1px solid #e2e8f0;padding:6px 4px;text-align:left;vertical-align:top}
  th{background:#f1f5f9;font-size:12px} .num{text-align:right;white-space:nowrap} .note{color:#64748b;font-size:11px}
  .tot td{font-weight:bold;border-top:2px solid #0f172a} .stamp{display:inline-block;border:2px solid #047857;color:#047857;font-weight:bold;padding:4px 10px;border-radius:6px;margin-top:6px}
  .actions{margin-top:18px} button{padding:8px 16px;font-weight:bold;border-radius:6px;border:0;background:#047857;color:#fff;cursor:pointer}
  @media print{.actions{display:none} body{margin:10mm}}
</style></head><body>
  <h1>${esc(empresa.nomeFantasia || 'Empreiteiro Saminês')}</h1>
  <div class="muted">${esc(empresa.razaoSocial || '')}${empresa.cnpj ? ` · CNPJ ${esc(empresa.cnpj)}` : ''}${empresa.telefoneContato ? ` · ${esc(empresa.telefoneContato)}` : ''}</div>
  <div class="box">
    <strong>COMPROVANTE CONSOLIDADO DE QUITAÇÃO</strong> — Nº ${esc(receipt.receiptNumber)}<br>
    <span class="muted">Gerado em ${esc(new Date(receipt.generatedAt).toLocaleString('pt-BR'))}</span><br>
    <span class="stamp">QUITADO EM ${esc(brDate(receipt.paidDate))}</span>
  </div>
  <div class="box">
    <strong>Cliente:</strong> ${esc(service.storeName)}${service.storeCnpj ? ` · ${esc(service.storeCnpj)}` : ''}<br>
    <strong>Serviço:</strong> ${esc(service.serviceTitle || service.description)}<br>
    ${service.serviceTitle ? `<span class="muted">${esc(service.description)}</span><br>` : ''}
    <strong>Data do serviço:</strong> ${esc(brDate(service.date))}
  </div>
  <strong>Histórico de parcelas</strong>
  <table>
    <thead><tr><th>#</th><th>Data</th><th>Forma</th><th>Recibo</th><th class="num">Valor</th></tr></thead>
    <tbody>${rows}
      <tr class="tot"><td colspan="4">Total pago</td><td class="num">${esc(brl(receipt.totalPaid))}</td></tr>
    </tbody>
  </table>
  <div class="box">
    Valor do serviço: <strong>${esc(brl(receipt.totalCharged))}</strong>
    ${receipt.totalDebit ? ` · Débitos adicionais: <strong>${esc(brl(receipt.totalDebit))}</strong>` : ''}
    · Total quitado: <strong>${esc(brl(receipt.totalPaid))}</strong>
  </div>
  <p class="muted">Declaramos, para os devidos fins, o recebimento integral dos valores acima referentes ao serviço descrito.</p>
  <div class="actions"><button onclick="window.print()">Imprimir / salvar em PDF</button></div>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    return;
  }
  // Pop-up bloqueado: baixa como arquivo HTML.
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `comprovante-quitacao-${receipt.receiptNumber}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
