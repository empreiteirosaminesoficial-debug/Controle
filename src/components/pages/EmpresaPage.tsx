import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Smartphone,
  ShieldCheck, 
  Award, 
  Clock, 
  Phone, 
  Mail, 
  MapPin, 
  CheckCircle2, 
  Copy, 
  Check, 
  Wrench, 
  Zap, 
  Paintbrush, 
  Droplet, 
  Hammer, 
  HardHat,
  FileText,
  BadgeCheck,
  Edit2,
  Trash2,
  Plus,
  PlusCircle,
  X,
  Save,
  Upload,
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { EmpresaGuarantee, EmpresaProfile, EmpresaSpecialty, PixPaymentConfig, UserProfile } from '../../types';
import { loadEmpresaProfile, saveEmpresaProfile } from '../../utils/empresaStorage';
import { useAppLogo } from '../../utils/logoManager';
import { listenApkRelease, downloadPublishedApk, type ApkReleaseInfo } from '../../utils/apkRelease';

interface EmpresaPageProps {
  pixConfig: PixPaymentConfig;
  onUpdatePixConfig?: (config: PixPaymentConfig) => void;
  onOpenStoreModal?: () => void;
  onOpenPlayStoreModal?: () => void;
  user?: UserProfile | null;
}

export const EmpresaPage: React.FC<EmpresaPageProps> = ({
  pixConfig,
  onUpdatePixConfig,
  onOpenStoreModal,
  onOpenPlayStoreModal,
  user,
}) => {
  const [profile, setProfile] = useState<EmpresaProfile>(() => loadEmpresaProfile());
  const [copiedPix, setCopiedPix] = useState(false);
  const [apkRelease, setApkRelease] = useState<ApkReleaseInfo | null>(null);
  const [isApkDownloading, setIsApkDownloading] = useState(false);
  const [apkDownloadError, setApkDownloadError] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin' || (user?.email ? user.email.toLowerCase() === 'empreiteirosaminesoficial@gmail.com' : false);

  // --- Official App Logo Manager ---
  const { 
    logoUrl, 
    updateLogo, 
    resetLogo, 
    isUploading: isLogoUploading, 
    uploadError: logoUploadError, 
    uploadSuccess: logoUploadSuccess, 
    isCustomLogo 
  } = useAppLogo();
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = listenApkRelease(setApkRelease);
    return () => unsubscribe();
  }, []);

  const handleDownloadApk = async () => {
    if (!apkRelease) return;
    setIsApkDownloading(true);
    setApkDownloadError(null);
    try {
      await downloadPublishedApk(apkRelease);
    } catch (error: any) {
      setApkDownloadError(error?.message || 'Não foi possível baixar o aplicativo.');
    } finally {
      setIsApkDownloading(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await updateLogo(file);
      e.target.value = '';
    }
  };

  // --- Modals State ---
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isEditPixModalOpen, setIsEditPixModalOpen] = useState(false);
  const [isSpecialtyModalOpen, setIsSpecialtyModalOpen] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<EmpresaSpecialty | null>(null);
  const [isGuaranteeModalOpen, setIsGuaranteeModalOpen] = useState(false);
  const [editingGuarantee, setEditingGuarantee] = useState<EmpresaGuarantee | null>(null);

  // --- Helper: Parse Cities List ---
  const parseCities = (str: string): string[] => {
    if (!str) return [];
    return str
      .split(/[,;\n•|]+/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
  };

  // --- Form States: Company Profile ---
  const [formNomeFantasia, setFormNomeFantasia] = useState(profile.nomeFantasia);
  const [formRazaoSocial, setFormRazaoSocial] = useState(profile.razaoSocial);
  const [formCnpj, setFormCnpj] = useState(profile.cnpj);
  const [formResponsavelTecnico, setFormResponsavelTecnico] = useState(profile.responsavelTecnico);
  const [formRegiaoAtendimento, setFormRegiaoAtendimento] = useState(profile.regiaoAtendimento);
  const [formCidades, setFormCidades] = useState<string[]>(() => parseCities(profile.regiaoAtendimento));
  const [cidadeInput, setCidadeInput] = useState('');
  const [formEmissaoNotaFiscal, setFormEmissaoNotaFiscal] = useState(profile.emissaoNotaFiscal);
  const [formEmailCorporativo, setFormEmailCorporativo] = useState(profile.emailCorporativo);
  const [formTelefoneContato, setFormTelefoneContato] = useState(profile.telefoneContato);
  const [formAnosExperiencia, setFormAnosExperiencia] = useState(profile.anosExperiencia);
  const [formDescricaoInstitucional, setFormDescricaoInstitucional] = useState(profile.descricaoInstitucional);

  // --- Form States: PIX ---
  const [formPixKey, setFormPixKey] = useState(pixConfig.pixKey);
  const [formBeneficiary, setFormBeneficiary] = useState(pixConfig.beneficiaryName || 'Saminês Mestre de Obras');
  const [formBank, setFormBank] = useState(pixConfig.bankName || 'Banco Inter / Nu Pagamentos');

  // --- Form States: Specialty ---
  const [specialtyTitle, setSpecialtyTitle] = useState('');
  const [specialtyDescription, setSpecialtyDescription] = useState('');
  const [specialtyCategory, setSpecialtyCategory] = useState('Construção');

  // --- Form States: Guarantee ---
  const [guaranteeTitle, setGuaranteeTitle] = useState('');
  const [guaranteeDescription, setGuaranteeDescription] = useState('');
  const [guaranteeBadgeType, setGuaranteeBadgeType] = useState<'guarantee' | 'clock' | 'award'>('guarantee');

  const handleCopyPix = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pixConfig.pixKey);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'elétrica':
        return Zap;
      case 'pintura':
        return Paintbrush;
      case 'hidráulica':
        return Droplet;
      case 'impermeabilização':
        return ShieldCheck;
      case 'drywall':
        return Wrench;
      case 'construção':
      default:
        return Hammer;
    }
  };

  const getGuaranteeIcon = (type: string) => {
    switch (type) {
      case 'clock':
        return Clock;
      case 'award':
        return Award;
      case 'guarantee':
      default:
        return ShieldCheck;
    }
  };

  // --- Company Edit Handlers ---
  const openEditCompanyModal = () => {
    setFormNomeFantasia(profile.nomeFantasia);
    setFormRazaoSocial(profile.razaoSocial);
    setFormCnpj(profile.cnpj);
    setFormResponsavelTecnico(profile.responsavelTecnico);
    setFormRegiaoAtendimento(profile.regiaoAtendimento);
    setFormCidades(parseCities(profile.regiaoAtendimento));
    setCidadeInput('');
    setFormEmissaoNotaFiscal(profile.emissaoNotaFiscal);
    setFormEmailCorporativo(profile.emailCorporativo);
    setFormTelefoneContato(profile.telefoneContato);
    setFormAnosExperiencia(profile.anosExperiencia);
    setFormDescricaoInstitucional(profile.descricaoInstitucional);
    setIsEditCompanyModalOpen(true);
  };

  const handleAddCidade = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && 'key' in e && e.key !== 'Enter') return;
    if (e) e.preventDefault();
    const cleanCity = cidadeInput.trim();
    if (!cleanCity) return;
    if (!formCidades.some((c) => c.toLowerCase() === cleanCity.toLowerCase())) {
      setFormCidades((prev) => [...prev, cleanCity]);
    }
    setCidadeInput('');
  };

  const handleRemoveCidade = (indexToRemove: number) => {
    setFormCidades((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRegiao = formCidades.length > 0 
      ? formCidades.join(', ') 
      : formRegiaoAtendimento.trim() || profile.regiaoAtendimento;

    const updated: EmpresaProfile = {
      ...profile,
      nomeFantasia: formNomeFantasia.trim() || profile.nomeFantasia,
      razaoSocial: formRazaoSocial.trim() || profile.razaoSocial,
      cnpj: formCnpj.trim() || profile.cnpj,
      responsavelTecnico: formResponsavelTecnico.trim() || profile.responsavelTecnico,
      regiaoAtendimento: finalRegiao,
      emissaoNotaFiscal: formEmissaoNotaFiscal.trim() || profile.emissaoNotaFiscal,
      emailCorporativo: formEmailCorporativo.trim() || profile.emailCorporativo,
      telefoneContato: formTelefoneContato.trim() || profile.telefoneContato,
      anosExperiencia: formAnosExperiencia.trim() || profile.anosExperiencia,
      descricaoInstitucional: formDescricaoInstitucional.trim() || profile.descricaoInstitucional,
    };
    setProfile(updated);
    saveEmpresaProfile(updated);
    setIsEditCompanyModalOpen(false);
  };

  // --- PIX Edit Handlers ---
  const openEditPixModal = () => {
    setFormPixKey(pixConfig.pixKey);
    setFormBeneficiary(pixConfig.beneficiaryName || 'Saminês Mestre de Obras');
    setFormBank(pixConfig.bankName || 'Banco Inter / Nu Pagamentos');
    setIsEditPixModalOpen(true);
  };

  const handleSavePix = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdatePixConfig) {
      onUpdatePixConfig({
        ...pixConfig,
        pixKey: formPixKey.trim(),
        beneficiaryName: formBeneficiary.trim(),
        bankName: formBank.trim(),
      });
    }
    setIsEditPixModalOpen(false);
  };

  // --- Specialty Handlers ---
  const openNewSpecialtyModal = () => {
    setEditingSpecialty(null);
    setSpecialtyTitle('');
    setSpecialtyDescription('');
    setSpecialtyCategory('Construção');
    setIsSpecialtyModalOpen(true);
  };

  const openEditSpecialtyModal = (item: EmpresaSpecialty) => {
    setEditingSpecialty(item);
    setSpecialtyTitle(item.title);
    setSpecialtyDescription(item.description);
    setSpecialtyCategory(item.category || 'Construção');
    setIsSpecialtyModalOpen(true);
  };

  const handleDeleteSpecialty = (id: string) => {
    const updated = {
      ...profile,
      specialties: profile.specialties.filter((s) => s.id !== id),
    };
    setProfile(updated);
    saveEmpresaProfile(updated);
  };

  const handleSaveSpecialty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!specialtyTitle.trim()) return;

    let updatedSpecialties: EmpresaSpecialty[];
    if (editingSpecialty) {
      updatedSpecialties = profile.specialties.map((s) =>
        s.id === editingSpecialty.id
          ? {
              ...s,
              title: specialtyTitle.trim(),
              description: specialtyDescription.trim(),
              category: specialtyCategory,
            }
          : s
      );
    } else {
      const newSpec: EmpresaSpecialty = {
        id: `spec_${Date.now()}`,
        title: specialtyTitle.trim(),
        description: specialtyDescription.trim(),
        category: specialtyCategory,
      };
      updatedSpecialties = [...profile.specialties, newSpec];
    }

    const updated = { ...profile, specialties: updatedSpecialties };
    setProfile(updated);
    saveEmpresaProfile(updated);
    setIsSpecialtyModalOpen(false);
  };

  // --- Guarantee Handlers ---
  const openNewGuaranteeModal = () => {
    setEditingGuarantee(null);
    setGuaranteeTitle('');
    setGuaranteeDescription('');
    setGuaranteeBadgeType('guarantee');
    setIsGuaranteeModalOpen(true);
  };

  const openEditGuaranteeModal = (item: EmpresaGuarantee) => {
    setEditingGuarantee(item);
    setGuaranteeTitle(item.title);
    setGuaranteeDescription(item.description);
    setGuaranteeBadgeType(item.badgeType || 'guarantee');
    setIsGuaranteeModalOpen(true);
  };

  const handleDeleteGuarantee = (id: string) => {
    const updated = {
      ...profile,
      guarantees: profile.guarantees.filter((g) => g.id !== id),
    };
    setProfile(updated);
    saveEmpresaProfile(updated);
  };

  const handleSaveGuarantee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guaranteeTitle.trim()) return;

    let updatedGuarantees: EmpresaGuarantee[];
    if (editingGuarantee) {
      updatedGuarantees = profile.guarantees.map((g) =>
        g.id === editingGuarantee.id
          ? {
              ...g,
              title: guaranteeTitle.trim(),
              description: guaranteeDescription.trim(),
              badgeType: guaranteeBadgeType,
            }
          : g
      );
    } else {
      const newGuar: EmpresaGuarantee = {
        id: `guar_${Date.now()}`,
        title: guaranteeTitle.trim(),
        description: guaranteeDescription.trim(),
        badgeType: guaranteeBadgeType,
      };
      updatedGuarantees = [...profile.guarantees, newGuar];
    }

    const updated = { ...profile, guarantees: updatedGuarantees };
    setProfile(updated);
    saveEmpresaProfile(updated);
    setIsGuaranteeModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Hidden file input for logo upload */}
      <input
        ref={logoFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/jpg"
        onChange={handleLogoFileChange}
        className="hidden"
      />

      {/* Hero Corporate Banner */}
      <div className="relative overflow-hidden bg-linear-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-sky-800/30">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Logo Oficial Empreiteiro Saminês */}
              <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md border border-white/25 pl-1.5 pr-3 py-1 rounded-full shadow-inner">
                <img
                  src={logoUrl || '/logo-transparent.png'}
                  alt="Logo Empreiteiro Saminês"
                  className="w-6 h-6 object-contain rounded-md shadow-xs"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
                <span className="text-xs font-extrabold text-white tracking-wide uppercase">
                  Empreiteiro Saminês
                </span>
              </div>
            </div>

            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => logoFileInputRef.current?.click()}
                  disabled={isLogoUploading}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  title="Carregar imagem para trocar o logotipo em todo o PWA"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isLogoUploading ? 'Sincronizando Nuvem...' : 'Carregar Logo'}</span>
                </button>

                {onOpenPlayStoreModal && (
                  <button
                    type="button"
                    onClick={onOpenPlayStoreModal}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Abrir ferramenta de geração do aplicativo Android"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Gerar APK</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={openEditCompanyModal}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Editar texto de apresentação e dados da empresa"
                >
                  <Edit2 className="w-3.5 h-3.5 text-sky-300" />
                  <span>Editar Apresentação</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5 pt-1">
            <div 
              onClick={() => isAdmin && logoFileInputRef.current?.click()}
              className={`relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-2xl bg-white/10 p-2 border border-white/20 shadow-xl flex items-center justify-center backdrop-blur-sm group ${isAdmin ? 'cursor-pointer hover:border-emerald-400/80 transition-colors' : ''}`}
              title={isAdmin ? "Clique para carregar nova imagem do logotipo e sincronizar na nuvem" : "Logotipo Oficial Sincronizado"}
            >
              <img
                src={logoUrl || '/logo-transparent.png'}
                alt="Logo Oficial Empreiteiro Saminês"
                className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform duration-200"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
              {isCustomLogo && (
                <div 
                  className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-1 shadow-md border-2 border-slate-900" 
                  title="Logotipo oficial sincronizado em tempo real na nuvem Firestore"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
              {isAdmin && (
                <div className="absolute inset-0 bg-slate-900/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-bold transition-opacity duration-200">
                  <Upload className="w-4 h-4 mb-0.5 text-emerald-300" />
                  <span>{isLogoUploading ? 'Sincronizando...' : 'Carregar Logo'}</span>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
                {profile.nomeFantasia}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
                {profile.anosExperiencia}
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            {profile.descricaoInstitucional}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleCopyPix}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              {copiedPix ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
              <span>{copiedPix ? 'Chave PIX Copiada!' : `Copiar Chave PIX: ${pixConfig.pixKey}`}</span>
            </button>

            <a
              href={`mailto:${profile.emailCorporativo}`}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Mail className="w-4 h-4 text-sky-400" />
              <span>Contatar via E-mail</span>
            </a>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Official Registration & Banking Details */}
      {!isAdmin && apkRelease && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-emerald-950">Aplicativo Empreiteiro Saminês</h2>
              <p className="text-xs text-emerald-800">Versão {apkRelease.version} · Atualizado em {new Date(apkRelease.updatedAt).toLocaleDateString('pt-BR')}</p>
              <p className="text-[10px] text-emerald-800 mt-0.5">Arquivo oficial disponibilizado pela administração.</p>
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-1">
            <button
              type="button"
              onClick={() => void handleDownloadApk()}
              disabled={isApkDownloading}
              className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-extrabold flex items-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              {isApkDownloading ? 'Preparando download...' : 'Baixar aplicativo (APK)'}
            </button>
            {apkDownloadError && <p role="alert" className="text-[10px] text-rose-700">{apkDownloadError}</p>}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Dados Cadastrais e Fiscais */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-100 text-slate-800 rounded-xl">
                <Building2 className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Identificação e Registro Oficial</h3>
                <p className="text-xs text-slate-500">Dados corporativos para faturamento e contratos</p>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={openEditCompanyModal}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Editar</span>
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-start justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Nome Fantasia:</span>
              <strong className="text-slate-900 font-bold text-right">{profile.nomeFantasia}</strong>
            </div>

            <div className="flex items-start justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Razão Social:</span>
              <span className="text-slate-800 font-medium text-right">{profile.razaoSocial}</span>
            </div>

            <div className="flex items-start justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">CNPJ / Registro:</span>
              <strong className="font-mono text-slate-900 font-extrabold text-right">{profile.cnpj}</strong>
            </div>

            <div className="flex items-start justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Responsável Técnico:</span>
              <strong className="text-slate-900 font-bold text-right">{profile.responsavelTecnico}</strong>
            </div>

            <div className="py-2 border-b border-slate-50 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-semibold">Cidades de Atendimento:</span>
                <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-full">
                  {parseCities(profile.regiaoAtendimento).length} cidades atendidas
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {parseCities(profile.regiaoAtendimento).map((cidade, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-950 border border-sky-200 text-[11px] font-bold rounded-lg"
                  >
                    <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                    <span>{cidade}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-start justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Emissão de Nota Fiscal:</span>
              <span className="text-emerald-700 font-bold text-right">{profile.emissaoNotaFiscal}</span>
            </div>

            <div className="flex items-start justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500 font-semibold">Telefone de Contato:</span>
              <span className="text-slate-800 font-medium text-right">{profile.telefoneContato}</span>
            </div>

            <div className="flex items-start justify-between py-1.5">
              <span className="text-slate-500 font-semibold">E-mail Corporativo:</span>
              <strong className="text-sky-700 font-mono text-right truncate">{profile.emailCorporativo}</strong>
            </div>
          </div>
        </div>

        {/* 2. Dados Financeiros e Pagamentos PIX */}
        <div className="bg-white rounded-2xl p-6 border border-emerald-200 shadow-xs space-y-4 bg-linear-to-br from-white via-emerald-50/20 to-white">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                <BadgeCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Contas e Chave PIX Oficial</h3>
                <p className="text-xs text-slate-500">Dados bancários para quitações e fechamentos semanais</p>
              </div>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={openEditPixModal}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Editar PIX</span>
              </button>
            )}
          </div>

          <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-emerald-800 tracking-wider">Chave PIX Oficial</span>
              <button
                type="button"
                onClick={handleCopyPix}
                className="text-xs text-emerald-800 hover:text-emerald-950 font-bold underline flex items-center gap-1 cursor-pointer"
              >
                {copiedPix ? 'Copiado!' : 'Copiar'}
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <div className="font-mono text-base font-extrabold text-slate-900 tracking-wide select-all">
              {pixConfig.pixKey}
            </div>
            <div className="text-[11px] text-emerald-800">
              Favorecido: <strong>{pixConfig.beneficiaryName || 'Saminês Mestre de Obras'}</strong> • Banco: <strong>{pixConfig.bankName || 'Banco Inter / Nu Pagamentos'}</strong>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Comprovantes Integrados:</strong> Após transferência ou PIX, o comprovante pode ser emitido 
                diretamente pelo botão verde <strong>+ Gera Comprovante</strong> com notificação ao cliente.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Nossas Especialidades Técnicas */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <HardHat className="w-5 h-5 text-sky-600" />
              <span>Nossas Especialidades Técnicas na Construção Civil</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Soluções completas com equipe própria especializada, ferramentas profissionais e conformidade técnica
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openNewSpecialtyModal}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Especialidade</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.specialties.map((item) => {
            const Icon = getCategoryIcon(item.category);
            return (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-sky-300 transition-all shadow-2xs flex flex-col justify-between gap-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {item.category || 'Geral'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs leading-snug">{item.title}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openEditSpecialtyModal(item)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Editar Especialidade"
                    >
                      <Edit2 className="w-3 h-3 text-slate-600" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Deseja excluir a especialidade "${item.title}"?`)) {
                          handleDeleteSpecialty(item.id);
                        }
                      }}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      title="Excluir Especialidade"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Excluir</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Compromissos e Garantias */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span>Compromissos, Normas & Garantias</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Políticas de conformidade técnica, prazos e responsabilidade civil em cada etapa
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openNewGuaranteeModal}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adicionar Compromisso</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {profile.guarantees.map((item) => {
            const Icon = getGuaranteeIcon(item.badgeType);
            const badgeBg = item.badgeType === 'clock' 
              ? 'bg-sky-100 text-sky-800' 
              : item.badgeType === 'award' 
              ? 'bg-amber-100 text-amber-800' 
              : 'bg-emerald-100 text-emerald-800';

            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between gap-3 hover:border-amber-300 transition-all"
              >
                <div className="space-y-2">
                  <div className={`p-2 w-fit rounded-xl ${badgeBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{item.description}</p>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => openEditGuaranteeModal(item)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-slate-600" />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Deseja excluir o compromisso "${item.title}"?`)) {
                          handleDeleteGuarantee(item.id);
                        }
                      }}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-rose-600" />
                      <span>Excluir</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= MODAL: EDITAR DADOS DA EMPRESA ================= */}
      {isEditCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-sky-600 text-white rounded-xl">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Editar Dados da Empresa</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditCompanyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCompany} className="space-y-3.5 text-xs">
              {/* Logotipo da Empresa & PWA */}
              <div className="p-4 bg-linear-to-r from-slate-50 via-sky-50/40 to-slate-50 border border-sky-100 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    Logotipo Oficial da Empresa & PWA
                  </span>
                  {isCustomLogo ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200">
                      Personalizado
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                      Padrão Oficial
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Carregue a imagem do logotipo da sua empresa para atualizar automaticamente em todas as telas (Navbar, login, apresentação da empresa e ícone do PWA).
                </p>

                <div className="flex items-center gap-3.5 pt-1">
                  {/* Prévia do Logo */}
                  <div className="relative w-14 h-14 shrink-0 bg-white rounded-xl border border-slate-200 p-1 shadow-2xs flex items-center justify-center">
                    <img
                      src={logoUrl || '/logo-transparent.png'}
                      alt="Prévia do Logotipo"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.src = '/logo.png';
                      }}
                    />
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      disabled={isLogoUploading}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-50"
                      title="Clique para selecionar arquivo de imagem e carregar o logotipo"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isLogoUploading ? 'Carregando Imagem...' : 'Carregar Logotipo'}</span>
                    </button>

                    {isCustomLogo && (
                      <button
                        type="button"
                        onClick={resetLogo}
                        className="px-2.5 py-2 border border-slate-300 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl font-semibold text-xs flex items-center gap-1 cursor-pointer transition"
                        title="Restaurar o logotipo padrão original"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>Restaurar Padrão</span>
                      </button>
                    )}
                  </div>
                </div>

                {logoUploadSuccess && (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-semibold animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Logotipo carregado e atualizado com sucesso em todo o aplicativo PWA!</span>
                  </div>
                )}

                {logoUploadError && (
                  <div className="flex items-center gap-2 p-2 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl text-[11px] font-semibold animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span>{logoUploadError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Fantasia *</label>
                  <input
                    type="text"
                    required
                    value={formNomeFantasia}
                    onChange={(e) => setFormNomeFantasia(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Razão Social</label>
                  <input
                    type="text"
                    value={formRazaoSocial}
                    onChange={(e) => setFormRazaoSocial(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ / Inscrição</label>
                  <input
                    type="text"
                    value={formCnpj}
                    onChange={(e) => setFormCnpj(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Responsável Técnico</label>
                  <input
                    type="text"
                    value={formResponsavelTecnico}
                    onChange={(e) => setFormResponsavelTecnico(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={formEmailCorporativo}
                    onChange={(e) => setFormEmailCorporativo(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={formTelefoneContato}
                    onChange={(e) => setFormTelefoneContato(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Cidades e Região de Atendimento com Enter para cadastrar e X para apagar */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700 text-xs">
                  Cidades de Atendimento (Digite a cidade e pressione Enter para cadastrar)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cidadeInput}
                    onChange={(e) => setCidadeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCidade(e);
                      }
                    }}
                    placeholder="Ex: São Paulo, Campinas, Santos... pressione Enter"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCidade()}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Lista de cidades cadastradas com botão X para remover */}
                {formCidades.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                    {formCidades.map((cidade, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-sky-300 text-sky-950 font-bold text-[11px] rounded-lg shadow-2xs group"
                      >
                        <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                        <span>{cidade}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCidade(idx)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition cursor-pointer"
                          title={`Remover ${cidade}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Nenhuma cidade adicionada ainda. Digite o nome da cidade acima e tecle Enter.
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Condição de Emissão de Nota Fiscal</label>
                <input
                  type="text"
                  value={formEmissaoNotaFiscal}
                  onChange={(e) => setFormEmissaoNotaFiscal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Texto de Destaque / Tempo de Atuação</label>
                <textarea
                  rows={2}
                  value={formAnosExperiencia}
                  onChange={(e) => setFormAnosExperiencia(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição Institucional</label>
                <textarea
                  rows={2}
                  value={formDescricaoInstitucional}
                  onChange={(e) => setFormDescricaoInstitucional(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditCompanyModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Dados da Empresa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR DADOS PIX ================= */}
      {isEditPixModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <BadgeCheck className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">Editar Chave PIX & Banco</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditPixModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePix} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chave PIX Oficial *</label>
                <input
                  type="text"
                  required
                  value={formPixKey}
                  onChange={(e) => setFormPixKey(e.target.value)}
                  placeholder="Ex: 51.849.204/0001-88 ou email@exemplo.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Favorecido *</label>
                <input
                  type="text"
                  required
                  value={formBeneficiary}
                  onChange={(e) => setFormBeneficiary(e.target.value)}
                  placeholder="Ex: Empreiteiro Saminês"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instituição Bancária *</label>
                <input
                  type="text"
                  required
                  value={formBank}
                  onChange={(e) => setFormBank(e.target.value)}
                  placeholder="Ex: Banco Inter / Nu Pagamentos / Itaú"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditPixModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Dados PIX</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: ESPECIALIDADE (ADICIONAR / EDITAR) ================= */}
      {isSpecialtyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl text-white ${editingSpecialty ? 'bg-amber-600' : 'bg-sky-600'}`}>
                  <Hammer className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingSpecialty ? 'Editar Especialidade Técnica' : 'Adicionar Nova Especialidade'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSpecialtyModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSpecialty} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título da Especialidade *</label>
                <input
                  type="text"
                  required
                  value={specialtyTitle}
                  onChange={(e) => setSpecialtyTitle(e.target.value)}
                  placeholder="Ex: Instalação de Drywall e Isolamento Acústico"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoria / Ícone</label>
                <select
                  value={specialtyCategory}
                  onChange={(e) => setSpecialtyCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="Construção">Construção Civil & Alvenaria (Martelo)</option>
                  <option value="Elétrica">Elétrica & Infraestrutura (Raio)</option>
                  <option value="Pintura">Pintura & Acabamentos (Pincel)</option>
                  <option value="Hidráulica">Hidráulica & Esgoto (Gota)</option>
                  <option value="Impermeabilização">Impermeabilização (Escudo)</option>
                  <option value="Drywall">Drywall & Forros (Chave)</option>
                  <option value="Geral">Outra Especialidade Geral</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição dos Serviços e Escopo *</label>
                <textarea
                  rows={3}
                  required
                  value={specialtyDescription}
                  onChange={(e) => setSpecialtyDescription(e.target.value)}
                  placeholder="Descreva as atividades executadas, materiais utilizados e detalhes técnicos..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingSpecialty ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja excluir a especialidade "${editingSpecialty.title}"?`)) {
                        handleDeleteSpecialty(editingSpecialty.id);
                        setIsSpecialtyModalOpen(false);
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Excluir</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSpecialtyModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 text-xs ${
                      editingSpecialty
                        ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                        : 'bg-sky-600 hover:bg-sky-700 active:bg-sky-800'
                    }`}
                  >
                    {editingSpecialty ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingSpecialty ? 'Salvar Alterações' : 'Adicionar Especialidade'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: GARANTIA (ADICIONAR / EDITAR) ================= */}
      {isGuaranteeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl text-white ${editingGuarantee ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingGuarantee ? 'Editar Compromisso ou Garantia' : 'Adicionar Novo Compromisso'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGuaranteeModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuarantee} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Título do Compromisso *</label>
                <input
                  type="text"
                  required
                  value={guaranteeTitle}
                  onChange={(e) => setGuaranteeTitle(e.target.value)}
                  placeholder="Ex: Garantia Técnica de 90 Dias ou Pontualidade"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipo de Selo / Ícone</label>
                <select
                  value={guaranteeBadgeType}
                  onChange={(e) => setGuaranteeBadgeType(e.target.value as 'guarantee' | 'clock' | 'award')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  <option value="guarantee">Garantia Técnica & Qualidade (Escudo Verde)</option>
                  <option value="clock">Pontualidade & Cronograma (Relógio Azul)</option>
                  <option value="award">Normas Regulamentadoras & Certificados (Medalha Âmbar)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição do Compromisso *</label>
                <textarea
                  rows={3}
                  required
                  value={guaranteeDescription}
                  onChange={(e) => setGuaranteeDescription(e.target.value)}
                  placeholder="Detalhes dos termos de garantia, suporte pós-entrega ou conformidade com normas..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingGuarantee ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Deseja excluir o compromisso "${editingGuarantee.title}"?`)) {
                        handleDeleteGuarantee(editingGuarantee.id);
                        setIsGuaranteeModalOpen(false);
                      }
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                  >
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Excluir</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsGuaranteeModalOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl font-bold cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={`px-5 py-2 text-white rounded-xl font-bold shadow-xs cursor-pointer flex items-center gap-1.5 text-xs ${
                      editingGuarantee
                        ? 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                        : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800'
                    }`}
                  >
                    {editingGuarantee ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingGuarantee ? 'Salvar Alterações' : 'Adicionar Compromisso'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
