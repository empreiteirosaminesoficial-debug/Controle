import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Trash2, 
  Building2, 
  Plus, 
  DollarSign, 
  Calendar, 
  FileText, 
  Sparkles,
  AlertCircle,
  Search,
  BookOpen,
  Layers,
  Calculator,
  Hash,
  Check,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { PaymentMethod, PaymentStatus, ServicePhoto, ServiceRecord, StoreProfile } from '../types';
import { compressImageFile } from '../utils/imageCompressor';
import { formatCurrency } from '../utils/formatters';
import { SINAPI_DATABASE, searchSinapi, SinapiItem } from '../data/sinapiDatabase';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: Partial<ServiceRecord>) => void;
  onDelete?: (serviceId: string) => void;
  serviceToEdit?: ServiceRecord | null;
  stores: StoreProfile[];
  onOpenStoreModal: () => void;
  initialStoreId?: string;
}

const CATEGORIES = [
  'Construção & Reforma',
  'Elétrica & Infraestrutura',
  'Hidráulica & Saneamento',
  'Pintura & Acabamento',
  'Climatização & Ar-Condicionado',
  'Serralheria & Estruturas',
  'Limpeza Pós-Obra',
  'Marcenaria & Móveis',
  'Manutenção Preventiva',
  'Outro',
];

export const ServiceModal: React.FC<ServiceModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  serviceToEdit,
  stores,
  onOpenStoreModal,
  initialStoreId,
}) => {
  const [storeId, setStoreId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [serviceTitle, setServiceTitle] = useState('');
  const [sinapiCode, setSinapiCode] = useState('');
  const [sinapiUnit, setSinapiUnit] = useState('m²');
  const [sinapiUnitPrice, setSinapiUnitPrice] = useState<number | undefined>(undefined);
  const [sinapiQuantity, setSinapiQuantity] = useState<string>('1');
  const [showSinapiCatalog, setShowSinapiCatalog] = useState(false);
  const [sinapiSearch, setSinapiSearch] = useState('');
  const [sinapiCategoryFilter, setSinapiCategoryFilter] = useState('Todas');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [valueCharged, setValueCharged] = useState<string>('');
  const [valuePaid, setValuePaid] = useState<string>('0');
  const [valueDebit, setValueDebit] = useState<string>('0');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pendente');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<ServicePhoto[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Filtered SINAPI items
  const sinapiResults = useMemo(() => {
    return searchSinapi(sinapiSearch, sinapiCategoryFilter);
  }, [sinapiSearch, sinapiCategoryFilter]);

  // Suggested total from quantity and SINAPI unit price
  const calculatedSinapiTotal = useMemo(() => {
    if (!sinapiUnitPrice) return null;
    const qty = parseFloat(sinapiQuantity) || 0;
    return qty > 0 ? qty * sinapiUnitPrice : sinapiUnitPrice;
  }, [sinapiUnitPrice, sinapiQuantity]);

  useEffect(() => {
    if (serviceToEdit) {
      setStoreId(serviceToEdit.storeId);
      setDate(serviceToEdit.date);
      setServiceTitle(serviceToEdit.serviceTitle || '');
      setSinapiCode(serviceToEdit.sinapiCode || '');
      setSinapiUnit(serviceToEdit.sinapiUnit || 'm²');
      setSinapiUnitPrice(serviceToEdit.sinapiUnitPrice);
      setSinapiQuantity(serviceToEdit.sinapiQuantity ? String(serviceToEdit.sinapiQuantity) : '1');
      setDescription(serviceToEdit.description);
      setCategory(serviceToEdit.category);
      setValueCharged(String(serviceToEdit.valueCharged));
      setValuePaid(String(serviceToEdit.valuePaid));
      setValueDebit(String(serviceToEdit.valueDebit || 0));
      setPaymentStatus(serviceToEdit.paymentStatus);
      setPaymentMethod(serviceToEdit.paymentMethod);
      setDueDate(serviceToEdit.dueDate || '');
      setNotes(serviceToEdit.notes || '');
      setPhotos(serviceToEdit.photos || []);
    } else {
      // Default to initialStoreId or first store if available
      setStoreId(initialStoreId || (stores.length > 0 ? stores[0].id : ''));
      setDate(new Date().toISOString().slice(0, 10));
      setServiceTitle('');
      setSinapiCode('');
      setSinapiUnit('m²');
      setSinapiUnitPrice(undefined);
      setSinapiQuantity('1');
      setShowSinapiCatalog(false);
      setSinapiSearch('');
      setSinapiCategoryFilter('Todas');
      setDescription('');
      setCategory(CATEGORIES[0]);
      setValueCharged('');
      setValuePaid('0');
      setValueDebit('0');
      setPaymentStatus('pendente');
      setPaymentMethod('PIX');
      setDueDate('');
      setNotes('');
      setPhotos([]);
    }
    setErrorMessage('');
  }, [serviceToEdit, isOpen, stores, initialStoreId]);

  if (!isOpen) return null;

  const handleSelectSinapi = (item: SinapiItem) => {
    setSinapiCode(item.code);
    setServiceTitle(item.title);
    setCategory(item.category);
    setSinapiUnit(item.unit);
    setSinapiUnitPrice(item.suggestedPrice);
    
    // Auto calculate suggested total
    const qty = parseFloat(sinapiQuantity) || 1;
    const total = (qty * item.suggestedPrice).toFixed(2);

    // Auto set description with full technical composition
    if (!description.trim() || description.startsWith('[SINAPI')) {
      setDescription(`[SINAPI ${item.code}] ${item.title}${item.details ? ' — ' + item.details : ''}`);
    }

    // Auto apply suggested value if valueCharged is empty or 0
    if (!valueCharged || parseFloat(valueCharged) <= 0) {
      setValueCharged(total);
    }

    setShowSinapiCatalog(false);
  };

  const handleApplySinapiPrice = () => {
    if (calculatedSinapiTotal) {
      setValueCharged(calculatedSinapiTotal.toFixed(2));
    }
  };

  const handleClearSinapi = () => {
    setSinapiCode('');
    setSinapiUnitPrice(undefined);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    const newPhotos: ServicePhoto[] = [...photos];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedDataUrl = await compressImageFile(file, 1200, 0.8);
        newPhotos.push({
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          dataUrl: compressedDataUrl,
          name: file.name,
          uploadedAt: new Date().toISOString(),
          sizeBytes: file.size,
        });
      }
      setPhotos(newPhotos);
    } catch (err) {
      console.error(err);
      setErrorMessage('Falha ao processar imagens.');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeId) {
      setErrorMessage('Selecione uma loja ou adicione uma digitando o CNPJ.');
      return;
    }
    if (!description.trim() && !serviceTitle.trim()) {
      setErrorMessage('Informe o título ou a descrição do serviço.');
      return;
    }
    const numCharged = parseFloat(valueCharged);
    if (isNaN(numCharged) || numCharged <= 0) {
      setErrorMessage('Informe um valor cobrado válido maior que zero.');
      return;
    }

    const numPaid = parseFloat(valuePaid) || 0;
    const numDebit = parseFloat(valueDebit) || 0;

    const selectedStore = stores.find(s => s.id === storeId);
    const finalDescription = description.trim() || serviceTitle.trim();

    onSave({
      storeId,
      storeName: selectedStore?.nomeFantasia || 'Loja',
      storeCnpj: selectedStore?.cnpj || '',
      date,
      serviceTitle: serviceTitle.trim() || undefined,
      sinapiCode: sinapiCode.trim() || undefined,
      sinapiUnit: sinapiUnit || undefined,
      sinapiUnitPrice: sinapiUnitPrice,
      sinapiQuantity: parseFloat(sinapiQuantity) || undefined,
      description: finalDescription,
      category,
      valueCharged: numCharged,
      valuePaid: numPaid,
      valueDebit: numDebit,
      paymentStatus,
      paymentMethod,
      dueDate: dueDate || undefined,
      notes: notes.trim() || undefined,
      photos,
      updatedAt: new Date().toISOString(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-6 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {serviceToEdit ? 'Editar Serviço' : 'Novo Registro de Serviço'}
            </h3>
            <p className="text-xs text-slate-500">
              Preencha os dados do serviço, valores financeiros e anexe fotos.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Store / CNPJ Selector */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-600" />
                <span>Loja / Perfil CNPJ *</span>
              </label>
              <button
                type="button"
                onClick={onOpenStoreModal}
                className="text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 text-[11px]"
              >
                <Plus className="w-3 h-3" />
                <span>Digitar Novo CNPJ</span>
              </button>
            </div>
            {stores.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                Nenhum perfil de loja cadastrado ainda.{' '}
                <button
                  type="button"
                  onClick={onOpenStoreModal}
                  className="font-bold underline text-amber-900"
                >
                  Clique aqui para cadastrar pelo CNPJ
                </button>
              </div>
            ) : (
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
              >
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nomeFantasia} — CNPJ: {s.cnpj} ({s.municipio}/{s.uf})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Row 1: Date & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Data de Execução *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Categoria do Serviço
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* SINAPI Catalog Integration & Service Title */}
          <div className="p-3.5 bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-emerald-50/80 border border-emerald-300/80 rounded-2xl space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/70 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-emerald-950 text-xs">
                      Títulos & Códigos SINAPI (CAIXA / IBGE)
                    </span>
                    <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full">
                      Tabela Oficial
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-800 block">
                    Selecione composições padronizadas com sugestão de valores médios unitários
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSinapiCatalog(!showSinapiCatalog)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{showSinapiCatalog ? 'Fechar Catálogo' : 'Buscar no Catálogo SINAPI'}</span>
                {showSinapiCatalog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Interactive Search Catalog Panel */}
            {showSinapiCatalog && (
              <div className="bg-white rounded-xl border border-emerald-300 p-3 space-y-2.5 shadow-xs animate-in fade-in">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={sinapiSearch}
                    onChange={(e) => setSinapiSearch(e.target.value)}
                    placeholder="Pesquisar por código (ex: 88316, 91926) ou serviço (ex: pintura, porcelanato, gesso, tomada)..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 transition"
                    autoFocus
                  />
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
                  {['Todas', 'Pintura & Acabamento', 'Construção & Reforma', 'Elétrica & Infraestrutura', 'Hidráulica & Saneamento', 'Climatização & Ar-Condicionado', 'Serralheria & Estruturas', 'Limpeza Pós-Obra'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSinapiCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                        sinapiCategoryFilter === cat
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Results list */}
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                  {sinapiResults.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Nenhum item SINAPI encontrado com os termos pesquisados.
                    </div>
                  ) : (
                    sinapiResults.map((item) => (
                      <div
                        key={item.code}
                        onClick={() => handleSelectSinapi(item)}
                        className="pt-2 pb-2 px-2 rounded-lg hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono font-bold text-[10px] rounded">
                              SINAPI {item.code}
                            </span>
                            <span className="font-bold text-slate-800 text-xs group-hover:text-emerald-900 transition">
                              {item.title}
                            </span>
                          </div>
                          {item.details && (
                            <p className="text-[10px] text-slate-500 line-clamp-1">{item.details}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block">Sugestão SINAPI</span>
                            <span className="font-extrabold text-emerald-800 text-xs">
                              {formatCurrency(item.suggestedPrice)} / {item.unit}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="px-2.5 py-1 bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg transition"
                          >
                            Usar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Selected SINAPI Info & Quantity Calculation Card */}
            {sinapiCode && sinapiUnitPrice && (
              <div className="p-3 bg-white/90 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-600 text-white font-mono font-extrabold text-[11px] rounded-md shadow-2xs">
                      CÓDIGO SINAPI {sinapiCode}
                    </span>
                    <span className="text-xs font-bold text-emerald-950">
                      Preço Unitário Referencial: <strong>{formatCurrency(sinapiUnitPrice)}</strong> / {sinapiUnit}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSinapi}
                    className="text-[10px] text-slate-400 hover:text-rose-600 transition underline cursor-pointer"
                  >
                    Remover Vínculo SINAPI
                  </button>
                </div>

                {/* Quantity and Total Calculator */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                      Metragem / Quantidade ({sinapiUnit}):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={sinapiQuantity}
                      onChange={(e) => setSinapiQuantity(e.target.value)}
                      className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] text-slate-500 font-medium">{sinapiUnit}</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Sugestão de Valor Total:</span>
                      <span className="font-extrabold text-sm text-emerald-800">
                        {formatCurrency(calculatedSinapiTotal || 0)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplySinapiPrice}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs cursor-pointer"
                      title="Copiar o valor calculado pelo SINAPI diretamente para o Valor Cobrado"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Aplicar no Valor Cobrado</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Input: Título do Serviço */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-800 block text-xs">
                  Título do Serviço *
                </label>
                {sinapiCode && (
                  <span className="text-[10px] font-mono text-emerald-800 font-semibold">
                    Padronizado pelo código SINAPI {sinapiCode}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={serviceTitle}
                onChange={(e) => setServiceTitle(e.target.value)}
                placeholder="Ex: Pintura de Parede com Tinta Látex Acrílica (2 demãos)"
                required
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-semibold focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Descrição Detalhada do Serviço *
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Reforma da área de atendimento, troca de piso e iluminação LED..."
              required
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          {/* Financial Values Row: Charged, Debit, Paid */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Valores Financeiros & Cobrança</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-600 block">
                    Valor Cobrado (R$) *
                  </label>
                  {calculatedSinapiTotal !== null && (
                    <button
                      type="button"
                      onClick={handleApplySinapiPrice}
                      className="text-[10px] text-emerald-700 hover:text-emerald-900 font-bold bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                      title="Usar o valor calculado de referência pelo SINAPI"
                    >
                      Usar SINAPI: {formatCurrency(calculatedSinapiTotal)}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valueCharged}
                  onChange={(e) => setValueCharged(e.target.value)}
                  placeholder="0,00"
                  required
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-600 block">
                    Débito Extra / Custo (R$)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const currentDebit = parseFloat(valueDebit) || 0;
                      if (currentDebit > 0) {
                        const withNf = (currentDebit * 1.38).toFixed(2);
                        setValueDebit(withNf);
                      }
                    }}
                    className="text-[9px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded transition cursor-pointer"
                    title="Aplica +38% de Nota Fiscal exclusivamente sobre este débito extra/custo (não soma com valor cobrado)"
                  >
                    +38% no Débito
                  </button>
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valueDebit}
                  onChange={(e) => setValueDebit(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-rose-600 focus:ring-2 focus:ring-sky-500 transition"
                />
                {parseFloat(valueDebit) > 0 && (
                  <p className="text-[10px] text-purple-700 mt-1 font-medium flex items-center justify-between">
                    <span>+38% NF no Débito:</span>
                    <strong>+{formatCurrency((parseFloat(valueDebit) || 0) * 0.38)}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="font-medium text-slate-600 block mb-1">
                  Valor Já Quitado (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valuePaid}
                  onChange={(e) => setValuePaid(e.target.value)}
                  placeholder="0,00"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-emerald-600 focus:ring-2 focus:ring-sky-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Status, Payment Method & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Status de Pagamento
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-bold focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="parcial">Parcial</option>
                <option value="atrasado">Em Atraso</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
              >
                <option value="PIX">PIX</option>
                <option value="Boleto">Boleto Bancário</option>
                <option value="Cartão">Cartão de Crédito/Débito</option>
                <option value="Transferência">Transferência / TED</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
              />
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-600" />
                <span>Fotos do Serviço (Antes / Depois / Comprovantes)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {photos.length} foto(s) anexada(s)
              </span>
            </div>

            {/* Hidden file & camera inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Upload Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCompressing}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg font-medium text-slate-700 flex items-center justify-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                <span>Selecionar da Galeria</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={isCompressing}
                className="flex-1 py-2 px-3 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg font-medium text-sky-700 flex items-center justify-center gap-1.5 transition"
              >
                <Camera className="w-3.5 h-3.5 text-sky-600" />
                <span>Tirar Foto (Câmera)</span>
              </button>
            </div>

            {isCompressing && (
              <p className="text-sky-600 text-[11px] font-medium animate-pulse">
                Otimizando e comprimindo fotos para salvar...
              </p>
            )}

            {/* Photos Preview Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(photo.id)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md opacity-90 hover:opacity-100 transition shadow-xs"
                      title="Remover foto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">
              Observações Adicionais
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Garantia de 12 meses, peças substituídas..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:ring-2 focus:ring-sky-500 transition"
            />
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
            {serviceToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Deseja realmente excluir o serviço "${serviceToEdit.description}"?`)) {
                    onDelete(serviceToEdit.id);
                    onClose();
                  }
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer text-xs"
                title="Excluir este serviço permanentemente"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Excluir Serviço</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white font-bold rounded-lg shadow-sm shadow-sky-600/20 transition flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {serviceToEdit ? <Sparkles className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>{serviceToEdit ? 'Salvar Alterações' : 'Cadastrar Serviço'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
