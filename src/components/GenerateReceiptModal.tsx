import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Receipt, 
  CheckCircle2, 
  DollarSign, 
  Calendar, 
  AlertCircle, 
  Building2, 
  Bell, 
  Printer, 
  Share2, 
  Search, 
  Upload, 
  Sparkles,
  FileCheck,
  CreditCard,
  Send,
  UserCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaymentMethod, ServiceRecord, StoreProfile, UserProfile, GeneratedReceipt } from '../types';
import { formatCurrency } from '../utils/formatters';
import { formatDocument } from '../utils/cnpj';
import { 
  generateReceiptNumber, 
  saveNewGeneratedReceipt, 
  createClientReceiptNotification,
  buildWhatsAppReceiptMessage 
} from '../utils/receiptGenerator';
import { useAppLogo } from '../utils/logoManager';

interface GenerateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: ServiceRecord[];
  stores: StoreProfile[];
  currentUser: UserProfile;
  preSelectedServiceId?: string;
  onReceiptGenerated: (params: {
    receipt: GeneratedReceipt;
    updatedService: ServiceRecord;
    notificationMessage: string;
  }) => void;
}

export const GenerateReceiptModal: React.FC<GenerateReceiptModalProps> = ({
  isOpen,
  onClose,
  services,
  stores,
  currentUser,
  preSelectedServiceId,
  onReceiptGenerated,
}) => {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(preSelectedServiceId || '');
  const { logoUrl } = useAppLogo();
  const [storeFilterId, setStoreFilterId] = useState<string>('todas');
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [amountReceivedInput, setAmountReceivedInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [paymentDate, setPaymentDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState<string>('');
  const [voucherPhoto, setVoucherPhoto] = useState<string | null>(null);
  const [voucherFileName, setVoucherFileName] = useState<string>('');
  const [notifyClient, setNotifyClient] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Modo de exibição após emissão bem-sucedida
  const [generatedReceipt, setGeneratedReceipt] = useState<GeneratedReceipt | null>(null);

  // Inicializa quando abre o modal
  useEffect(() => {
    if (isOpen) {
      if (preSelectedServiceId) {
        setSelectedServiceId(preSelectedServiceId);
      } else if (!selectedServiceId && services.length > 0) {
        // Encontra o primeiro serviço com saldo pendente
        const firstPending = services.find(s => ((s.valueCharged + (s.valueDebit || 0)) - s.valuePaid) > 0.01);
        setSelectedServiceId(firstPending ? firstPending.id : services[0].id);
      }
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('PIX');
      setNotes('');
      setVoucherPhoto(null);
      setVoucherFileName('');
      setError('');
      setGeneratedReceipt(null);
    }
  }, [isOpen, preSelectedServiceId, services]);

  // Serviço atualmente selecionado
  const activeService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId) || null;
  }, [services, selectedServiceId]);

  // Loja correspondente ao serviço selecionado
  const activeStore = useMemo(() => {
    if (!activeService) return null;
    return stores.find(st => st.id === activeService.storeId) || null;
  }, [stores, activeService]);

  // Cálculos financeiros do serviço selecionado
  const totalCost = activeService ? (activeService.valueCharged + (activeService.valueDebit || 0)) : 0;
  const remainingDue = activeService ? Math.max(0, totalCost - activeService.valuePaid) : 0;

  // Atualiza o valor sugerido ao trocar o serviço selecionado
  useEffect(() => {
    if (activeService) {
      const remaining = Math.max(0, (activeService.valueCharged + (activeService.valueDebit || 0)) - activeService.valuePaid);
      setAmountReceivedInput(remaining > 0 ? remaining.toFixed(2) : activeService.valueCharged.toFixed(2));
    }
  }, [activeService]);

  // Lista de serviços filtrados para a seleção
  const filteredServicesList = useMemo(() => {
    return services.filter(s => {
      if (storeFilterId !== 'todas' && s.storeId !== storeFilterId) return false;
      if (!serviceSearch.trim()) return true;
      const q = serviceSearch.toLowerCase();
      return (
        s.description.toLowerCase().includes(q) ||
        s.storeName.toLowerCase().includes(q) ||
        s.storeCnpj.includes(q)
      );
    });
  }, [services, storeFilterId, serviceSearch]);

  if (!isOpen) return null;

  // Tratamento de upload de comprovante (imagem)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem (JPG, PNG).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem do comprovante não pode exceder 5MB.');
      return;
    }

    setVoucherFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setVoucherPhoto(event.target?.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  // Submissão do comprovante
  const handleEmitReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeService) {
      setError('Por favor, selecione um serviço para emitir o comprovante.');
      return;
    }

    const val = parseFloat(amountReceivedInput.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setError('Informe um valor recebido válido e maior que zero.');
      return;
    }

    // Calcula novos valores do serviço
    const newPaidTotal = activeService.valuePaid + val;
    const newRemaining = Math.max(0, totalCost - newPaidTotal);
    const isFullyPaid = newRemaining <= 0.01;

    const receiptNumber = generateReceiptNumber();
    const nowIso = new Date().toISOString();

    // Cria o objeto do comprovante emitido
    const receiptData: GeneratedReceipt = {
      id: `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      receiptNumber,
      serviceId: activeService.id,
      serviceDescription: activeService.description,
      storeId: activeService.storeId,
      storeName: activeService.storeName,
      storeCnpj: activeService.storeCnpj,
      clientOwnerEmail: activeStore?.ownerEmail || activeStore?.email || '',
      amountReceived: val,
      totalServiceCharged: totalCost,
      totalServicePaidBefore: activeService.valuePaid,
      newRemainingBalance: newRemaining,
      paymentMethod,
      paymentDate,
      notes: notes.trim(),
      photoUrl: voucherPhoto || undefined,
      generatedAt: nowIso,
      generatedBy: currentUser.email || 'empreiteirosaminesoficial@gmail.com',
    };

    // Atualiza o serviço no sistema
    const updatedPhotos = [...(activeService.photos || [])];
    if (voucherPhoto) {
      updatedPhotos.push({
        id: `photo_${Date.now()}`,
        dataUrl: voucherPhoto,
        name: voucherFileName || `Comprovante #${receiptNumber}.jpg`,
        uploadedAt: nowIso,
        caption: `Comprovante de Pagamento #${receiptNumber} - ${formatCurrency(val)}`,
      });
    }

    const updatedService: ServiceRecord = {
      ...activeService,
      valuePaid: newPaidTotal,
      paymentStatus: isFullyPaid ? 'pago' : 'parcial',
      paidDate: paymentDate,
      paymentMethod,
      photos: updatedPhotos,
      updatedAt: nowIso,
    };

    // Salva o comprovante no armazenamento local
    saveNewGeneratedReceipt(receiptData);

    // Celebração com confetes
    try {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignora erro de confetti
    }

    // Salva e notifica
    onReceiptGenerated({
      receipt: receiptData,
      updatedService,
      notificationMessage: `Comprovante #${receiptNumber} gerado e notificação enviada com sucesso para ${activeService.storeName}!`,
    });

    // Exibe a tela de recibo gerado
    setGeneratedReceipt(receiptData);
  };

  // Impressão do recibo
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* ================= VIEW 1: FORMULÁRIO DE GERAÇÃO ================= */}
        {!generatedReceipt ? (
          <form onSubmit={handleEmitReceipt} className="flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-emerald-500/10 via-sky-500/5 to-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    Gerar Comprovante de Pagamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Selecione o serviço, registre o valor recebido e notifique o cliente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body (Scrollable) */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
              
              {/* Mensagem de Erro */}
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </div>
              )}

              {/* SEÇÃO 1: SELEÇÃO DO SERVIÇO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    1. Selecione o Serviço / Orçamento:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {filteredServicesList.length} serviço(s) listado(s)
                  </span>
                </div>

                {/* Filtro por Loja e Busca rápida */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={storeFilterId}
                    onChange={(e) => setStoreFilterId(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                  >
                    <option value="todas">Todos os Clientes / Lojas</option>
                    {stores.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.nomeFantasia} ({formatDocument(st.cnpj)})
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por descrição ou loja..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                </div>

                {/* Dropdown / Seletor Principal de Serviço */}
                <select
                  id="select-service-receipt"
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none shadow-xs"
                >
                  <option value="" disabled>Selecione o serviço...</option>
                  {filteredServicesList.map((svc) => {
                    const saldo = Math.max(0, (svc.valueCharged + (svc.valueDebit || 0)) - svc.valuePaid);
                    return (
                      <option key={svc.id} value={svc.id}>
                        [{svc.storeName}] {svc.description} — Total: {formatCurrency(svc.valueCharged)} | Saldo a Receber: {formatCurrency(saldo)}
                      </option>
                    );
                  })}
                </select>

                {/* Card de Resumo do Serviço Ativo */}
                {activeService && (
                  <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-emerald-950 text-sm truncate">
                        {activeService.description}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                        remainingDue <= 0.01 
                          ? 'bg-emerald-200 text-emerald-900' 
                          : 'bg-amber-200 text-amber-900'
                      }`}>
                        {remainingDue <= 0.01 ? 'Totalmente Pago' : `Pendente: ${formatCurrency(remainingDue)}`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-200/60 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Cliente:</span>
                        <strong className="text-slate-800 truncate block">{activeService.storeName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Valor Cobrado:</span>
                        <strong className="text-slate-800">{formatCurrency(totalCost)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Já Recebido:</span>
                        <strong className="text-emerald-700">{formatCurrency(activeService.valuePaid)}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Saldo em Aberto:</span>
                        <strong className="text-amber-700 font-extrabold">{formatCurrency(remainingDue)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 2: VALOR RECEBIDO & FORMA DE PAGAMENTO */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  2. Valor Recebido e Detalhes da Quitação:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Campo de Valor Recebido */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Valor Recebido neste Comprovante (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-extrabold text-emerald-600 text-sm">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0,00"
                        value={amountReceivedInput}
                        onChange={(e) => setAmountReceivedInput(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-white border-2 border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-base font-extrabold text-slate-900 outline-none"
                        required
                      />
                    </div>

                    {/* Botão de Atalho para Quitar Saldo Total */}
                    {remainingDue > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmountReceivedInput(remainingDue.toFixed(2))}
                        className="mt-1.5 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        Quitar saldo restante total ({formatCurrency(remainingDue)})
                      </button>
                    )}
                  </div>

                  {/* Forma de Pagamento */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Forma de Pagamento *
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full p-2.5 bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value="PIX">PIX (Instantâneo)</option>
                      <option value="Transferência">Transferência Bancária (TED/DOC)</option>
                      <option value="Boleto">Boleto Bancário</option>
                      <option value="Cartão">Cartão de Crédito / Débito</option>
                      <option value="Dinheiro">Dinheiro em Espécie</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Data do Pagamento */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Data do Pagamento *
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>

                  {/* Anexo de Foto do Comprovante Bancário */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Foto/Arquivo do Comprovante (Opcional)
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 border border-dashed border-slate-300 rounded-xl text-xs font-bold text-slate-600 cursor-pointer transition">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate">{voucherFileName || 'Anexar imagem (JPG/PNG)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                      {voucherPhoto && (
                        <button
                          type="button"
                          onClick={() => { setVoucherPhoto(null); setVoucherFileName(''); }}
                          className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl text-xs font-bold cursor-pointer"
                          title="Remover anexo"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Observações no Comprovante (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pagamento referente à primeira parcela da reforma..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* SEÇÃO 3: NOTIFICAÇÃO AO CLIENTE CADASTRADO */}
              <div className="p-4 bg-linear-to-r from-sky-50 to-indigo-50/50 border border-sky-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-sky-600 text-white rounded-xl shadow-xs">
                      <Bell className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-xs">
                        Notificação Automática ao Cliente Cadastrado
                      </h4>
                      <p className="text-[11px] text-slate-600">
                        O cliente receberá o comprovante diretamente no painel de notificações
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={notifyClient} 
                      onChange={(e) => setNotifyClient(e.target.checked)} 
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600" />
                  </label>
                </div>

                {activeStore && (
                  <div className="text-[11px] text-slate-700 bg-white/80 p-2.5 rounded-xl border border-sky-200/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>Destinatário: <strong>{activeStore.nomeFantasia}</strong></span>
                    </div>
                    <span className="text-slate-500 font-mono shrink-0">
                      {activeStore.ownerEmail || activeStore.email || 'Conta Vinculada'}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-generate-receipt"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-2 shadow-md shadow-emerald-600/30 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Emitir Comprovante & Notificar</span>
              </button>
            </div>
          </form>
        ) : (
          /* ================= VIEW 2: COMPROVANTE EMITIDO COM SUCESSO ================= */
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Header de Sucesso */}
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Comprovante Emitido com Sucesso!
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                O valor de {formatCurrency(generatedReceipt.amountReceived)} foi registrado e o comprovante #{generatedReceipt.receiptNumber} foi enviado para o cliente.
              </p>
            </div>

            {/* Folha do Recibo Oficial (Formatada para Impressão) */}
            <div 
              id="printable-receipt"
              className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-5 sm:p-6 text-xs text-slate-800 space-y-4 font-mono shadow-xs"
            >
              <div className="border-b border-slate-300 pb-3 flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 shrink-0 flex items-center justify-center">
                    <img 
                      src={logoUrl || "/logo-transparent.png"} 
                      alt="Logo Empreiteiro Saminês" 
                      className="w-full h-full object-contain"
                      onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                    />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 font-sans">EMPREITEIRO SAMINÊS</h4>
                    <p className="text-[11px] text-slate-500">Construção Civil & Reformas Corporativas</p>
                    <p className="text-[10px] text-slate-400">CNPJ: 50.814.717/0001-95 | (11) 98836-8488</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">RECIBO DE PAGAMENTO</span>
                  <strong className="text-xs text-emerald-700">#{generatedReceipt.receiptNumber}</strong>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Data de Emissão:</span>
                  <strong>{generatedReceipt.paymentDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente / Pagador:</span>
                  <strong>{generatedReceipt.storeName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">CNPJ/CPF:</span>
                  <span>{generatedReceipt.storeCnpj || 'Não informado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Serviço:</span>
                  <span className="font-bold text-right">{generatedReceipt.serviceDescription}</span>
                </div>
              </div>

              <div className="p-3 bg-emerald-100/70 border border-emerald-300 rounded-xl flex items-center justify-between text-emerald-950 font-sans">
                <div>
                  <span className="text-[10px] font-bold uppercase block text-emerald-800">Valor Recebido:</span>
                  <strong className="text-lg font-black text-emerald-900">
                    {formatCurrency(generatedReceipt.amountReceived)}
                  </strong>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold block text-emerald-800">Forma:</span>
                  <span className="text-xs font-extrabold bg-emerald-200 px-2 py-0.5 rounded-md">
                    {generatedReceipt.paymentMethod}
                  </span>
                </div>
              </div>

              <div className="text-[11px] space-y-1 pt-1 border-t border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Saldo Restante do Serviço:</span>
                  <strong className={generatedReceipt.newRemainingBalance <= 0.01 ? 'text-emerald-700' : 'text-amber-700'}>
                    {generatedReceipt.newRemainingBalance <= 0.01 ? 'TOTALMENTE QUITADO (R$ 0,00)' : formatCurrency(generatedReceipt.newRemainingBalance)}
                  </strong>
                </div>
                {generatedReceipt.notes && (
                  <div className="pt-1">
                    <span className="text-slate-500 block">Observações:</span>
                    <p className="italic text-slate-700">{generatedReceipt.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ações do Comprovante Gerado */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Imprimir / Salvar PDF</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Botão de Enviar via WhatsApp */}
                <a
                  href={`https://wa.me/?text=${buildWhatsAppReceiptMessage(generatedReceipt)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Share2 className="w-4 h-4 text-emerald-600" />
                  <span>Enviar WhatsApp</span>
                </a>

                {/* Concluir */}
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
