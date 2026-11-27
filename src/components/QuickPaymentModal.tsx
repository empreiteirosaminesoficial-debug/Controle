import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, DollarSign, Calendar, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentMethod, ServiceRecord } from '../types';
import { formatCurrency } from '../utils/formatters';

interface QuickPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceRecord | null;
  onConfirm: (
    service: ServiceRecord,
    paymentAmount: number,
    method: PaymentMethod,
    paymentDate: string
  ) => void;
}

export const QuickPaymentModal: React.FC<QuickPaymentModalProps> = ({
  isOpen,
  onClose,
  service,
  onConfirm,
}) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      const remaining = (service.valueCharged + service.valueDebit) - service.valuePaid;
      setAmount(remaining > 0 ? String(remaining) : String(service.valueCharged));
      setMethod(service.paymentMethod || 'PIX');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setError('');
    }
  }, [service, isOpen]);

  if (!isOpen || !service) return null;

  const totalCost = service.valueCharged + (service.valueDebit || 0);
  const remainingDue = Math.max(0, totalCost - service.valuePaid);

  const handlePayFullRemaining = () => {
    setAmount(String(remainingDue));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paidValue = parseFloat(amount);
    if (isNaN(paidValue) || paidValue <= 0) {
      setError('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    // Trigger celebration confetti if paying off the full amount
    if (paidValue >= remainingDue) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#0ea5e9', '#6366f1', '#f59e0b'],
        });
      } catch {
        // Confetti fallback
      }
    }

    onConfirm(service, paidValue, method, paymentDate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-emerald-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Registrar Pagamento</h3>
              <p className="text-[11px] text-slate-500">Liquidação de cobrança para a loja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Service Context */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs space-y-1.5">
          <p className="font-bold text-slate-800">{service.description}</p>
          <p className="text-slate-500">Loja: <strong className="text-slate-700">{service.storeName}</strong></p>
          
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-center">
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Total</span>
              <span className="font-bold text-slate-800">{formatCurrency(totalCost)}</span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Já Quitado</span>
              <span className="font-bold text-emerald-600">{formatCurrency(service.valuePaid)}</span>
            </div>
            <div className="bg-white p-1.5 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block font-medium">Em Aberto</span>
              <span className="font-bold text-amber-600">{formatCurrency(remainingDue)}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">
                Valor do Pagamento Recebido (R$) *
              </label>
              {remainingDue > 0 && (
                <button
                  type="button"
                  onClick={handlePayFullRemaining}
                  className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] underline"
                >
                  Quitar Total ({formatCurrency(remainingDue)})
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-base text-emerald-600 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Forma de Pagamento
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Cartão">Cartão</option>
                <option value="Transferência">Transferência</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Data do Recebimento
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
          </div>

          <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-lg text-[11px] text-emerald-800">
            🔔 Uma notificação e som de confirmação serão disparados no navegador e no celular.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 font-medium rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm shadow-emerald-600/20 flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmar Pagamento</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
