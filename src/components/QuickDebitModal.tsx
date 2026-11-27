import React, { useState } from 'react';
import { X, Receipt, AlertCircle, DollarSign, Plus } from 'lucide-react';
import { ServiceRecord } from '../types';
import { formatCurrency } from '../utils/formatters';

interface QuickDebitModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: ServiceRecord | null;
  onConfirm: (service: ServiceRecord, additionalDebit: number, reason: string) => void;
}

export const QuickDebitModal: React.FC<QuickDebitModalProps> = ({
  isOpen,
  onClose,
  service,
  onConfirm,
}) => {
  const [debitAmount, setDebitAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !service) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(debitAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Informe um valor de débito válido maior que zero.');
      return;
    }

    onConfirm(service, amount, reason.trim());
    setDebitAmount('');
    setReason('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-rose-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Adicionar Valor de Débito</h3>
              <p className="text-[11px] text-slate-500">Custos adicionais ou materiais extras para a loja</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Service Context Summary */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 text-xs">
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Serviço Selecionado</p>
          <p className="font-bold text-slate-800 text-xs mt-0.5">{service.description}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200 text-slate-600">
            <span>Loja: <strong>{service.storeName}</strong></span>
            <span>Débito Atual: <strong className="text-rose-600">{formatCurrency(service.valueDebit || 0)}</strong></span>
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
              <label className="font-bold text-slate-700 block text-xs">
                Valor do Débito / Nota Fiscal (R$) *
              </label>
              <button
                type="button"
                onClick={() => {
                  const currentVal = parseFloat(debitAmount);
                  if (!isNaN(currentVal) && currentVal > 0) {
                    const withNf = (currentVal * 1.38).toFixed(2);
                    setDebitAmount(withNf);
                    if (!reason.includes('NF +38%')) {
                      setReason(prev => prev ? `${prev} [NF +38%]` : 'Emissão de Nota Fiscal (+38%)');
                    }
                  }
                }}
                className="text-[10px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full transition cursor-pointer flex items-center gap-1"
                title="Aplica 38% sobre o valor digitado"
              >
                <span>+38% Nota Fiscal</span>
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-bold">R$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={debitAmount}
                onChange={(e) => setDebitAmount(e.target.value)}
                placeholder="0,00"
                autoFocus
                required
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-base text-rose-600 focus:bg-white focus:ring-2 focus:ring-rose-500 transition"
              />
            </div>
            {parseFloat(debitAmount) > 0 && (
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                <span>Com NF (+38%): <strong className="text-purple-700 font-bold">{formatCurrency(parseFloat(debitAmount) * 1.38)}</strong></span>
                <span>Imposto NF: <strong>{formatCurrency(parseFloat(debitAmount) * 0.38)}</strong></span>
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">
              Motivo / Descrição do Débito
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Aquisição de cabo 10mm antichama extra..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-lg text-[11px] text-rose-800">
            🔔 Uma notificação será enviada para o navegador e celular avisando o acréscimo deste débito.
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm shadow-rose-600/20 flex items-center gap-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Acrescentar Débito</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
