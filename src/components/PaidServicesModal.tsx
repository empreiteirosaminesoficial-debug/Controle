import React from 'react';
import { CheckCircle2, X, Receipt } from 'lucide-react';
import { ServiceRecord } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface PaidServicesModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceRecord[];
}

export const PaidServicesModal: React.FC<PaidServicesModalProps> = ({ isOpen, onClose, services }) => {
  if (!isOpen) return null;

  const totalPaid = services.reduce((sum, service) => sum + (service.valuePaid || 0), 0);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <section className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between gap-3 px-5 py-4 bg-emerald-50 border-b border-emerald-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Serviços Pagos</h2>
              <p className="text-xs text-slate-600">{services.length} serviço(s) totalmente quitado(s)</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Fechar serviços pagos">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-4 sm:p-5 overflow-auto space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-800">Total recebido nos serviços quitados</p>
            <p className="text-2xl font-black text-emerald-900 mt-1">{formatCurrency(totalPaid)}</p>
          </div>

          {services.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold">Nenhum serviço totalmente pago encontrado.</p>
              <p className="text-xs mt-1">Serviços pendentes ou parcialmente pagos não aparecem nesta lista.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="p-3">Quitação</th>
                    <th className="p-3">Cliente / Estabelecimento</th>
                    <th className="p-3">Serviço</th>
                    <th className="p-3 text-right">Total do serviço</th>
                    <th className="p-3 text-right">Total recebido</th>
                    <th className="p-3">Forma de pagamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.slice().sort((a, b) => (b.paidDate || b.updatedAt || '').localeCompare(a.paidDate || a.updatedAt || '')).map((service) => (
                    <tr key={service.id} className="hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap">{service.paidDate ? formatDate(service.paidDate) : 'Data não informada'}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{service.storeName}</div>
                        <div className="text-[10px] text-slate-500">{service.storeCnpj}</div>
                      </td>
                      <td className="p-3 min-w-[180px]">
                        <div className="font-semibold text-slate-800">{service.serviceTitle || service.description}</div>
                        {service.serviceTitle && <div className="text-[10px] text-slate-500">{service.description}</div>}
                      </td>
                      <td className="p-3 text-right font-semibold whitespace-nowrap">{formatCurrency((service.valueCharged || 0) + (service.valueDebit || 0))}</td>
                      <td className="p-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">{formatCurrency(service.valuePaid || 0)}</td>
                      <td className="p-3 whitespace-nowrap">{service.paymentMethod || 'Não informado'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-200 p-4 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700">Fechar</button>
        </footer>
      </section>
    </div>
  );
};
