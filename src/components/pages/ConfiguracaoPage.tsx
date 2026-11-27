import React, { useState } from 'react';
import { 
  Wrench, 
  Database, 
  Clock, 
  ShieldCheck, 
  Cloud, 
  Smartphone, 
  Image as ImageIcon, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  ExternalLink,
  HardDrive,
  Archive,
  Download
} from 'lucide-react';
import { UserProfile } from '../../types';
import { DashboardBackupScheduleCard } from '../DashboardBackupScheduleCard';
import { SecurityStatusCard } from '../SecurityStatusCard';
import { PwaIconUpdateModal } from '../pwa/PwaIconUpdateModal';
import { useAppLogo } from '../../utils/logoManager';

interface ConfiguracaoPageProps {
  user: UserProfile;
  servicesCount: number;
  storesCount: number;
  onOpenFirebaseBackupSchedule: (tab?: 'schedule' | 'drive' | 'history') => void;
  onOpenAutoSync: () => void;
  onOpenPlayStoreModal: () => void;
  onOpenGoogleAuth?: () => void;
  onBackupConfirmed?: () => void;
}

export const ConfiguracaoPage: React.FC<ConfiguracaoPageProps> = ({
  user,
  servicesCount,
  storesCount,
  onOpenFirebaseBackupSchedule,
  onOpenAutoSync,
  onOpenPlayStoreModal,
  onOpenGoogleAuth,
  onBackupConfirmed,
}) => {
  const [isPwaUpdateModalOpen, setIsPwaUpdateModalOpen] = useState(false);
  const { logoUrl } = useAppLogo();
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 0. SEÇÃO PRINCIPAL: DADOS DO MEU PERFIL OFICIAL */}
      <div className="bg-white border-2 border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 bg-emerald-600 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-1 rounded-bl-2xl">
          Perfil Conectado
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                src={user.avatar && !user.avatar.includes('unsplash') && !user.avatar.includes('logo-transparent') ? user.avatar : (logoUrl || '/logo-transparent.png')}
                alt={user.name}
                className="w-16 h-16 rounded-2xl border-2 border-emerald-500 object-contain bg-white shadow-xs p-1"
                onError={(e) => { e.currentTarget.src = '/logo-transparent.png'; }}
              />
              <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1 shadow-xs">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {user.name}
                </h3>
                <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{user.role === 'admin' ? 'Administrador Oficial' : 'Cliente Autenticado'}</span>
                </span>
              </div>
              <p className="text-xs font-mono font-medium text-slate-600 mt-0.5">
                {user.email}
              </p>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <strong>Permissões:</strong> Acesso Total do Gestor
                </span>
                <span>•</span>
                <span>
                  <strong>Chave PIX:</strong> {user.email}
                </span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">
                  Status: Ativo e Sincronizado
                </span>
              </div>
            </div>
          </div>

          {onOpenGoogleAuth && (
            <button
              type="button"
              onClick={onOpenGoogleAuth}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer shrink-0 self-stretch sm:self-center justify-center"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Gerenciar Perfil e Contas</span>
            </button>
          )}
        </div>
      </div>

      {/* Header da Página de Configuração */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/30">
            <Wrench className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Painel de Configuração
              </h2>
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Sistema & Nuvem
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Gerencie backups agendados no Firestore, redundância de dados, integrações de pagamento e WhatsApp.
            </p>
          </div>
        </div>

        {/* Botão de Atalho Rápido para Agendamento */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenFirebaseBackupSchedule('schedule')}
            className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Definir Horários de Backup</span>
          </button>
        </div>
      </div>

      {/* 1. SEÇÃO PRINCIPAL: REDUNDÂNCIA & BACKUP AGENDADO NO FIRESTORE (ELEMENTO SOLICITADO) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>Redundância & Backup Automático</span>
          </h3>
          <span className="text-[11px] text-slate-400">Google Firestore Cloud</span>
        </div>

        <DashboardBackupScheduleCard
          user={user}
          servicesCount={servicesCount}
          storesCount={storesCount}
          onOpenFirebaseBackupSchedule={onOpenFirebaseBackupSchedule}
          onBackupSuccess={onBackupConfirmed}
        />
      </div>

      {/* 2. STATUS DE SEGURANÇA E CONFIRMAÇÕES DIÁRIAS */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Auditoria & Confirmação de Redundância</span>
          </h3>
          <span className="text-[11px] text-slate-400">Proteção Ativa</span>
        </div>

        <SecurityStatusCard
          user={user}
          servicesCount={servicesCount}
          storesCount={storesCount}
          onOpenFirebaseBackupSchedule={onOpenFirebaseBackupSchedule}
          onOpenAutoSync={onOpenAutoSync}
          onBackupConfirmed={onBackupConfirmed}
        />
      </div>

      {/* 3. INTEGRAÇÕES: GOOGLE DRIVE, WHATSAPP E APLICATIVO ANDROID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Card Google Drive (04:00 AM) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Diário 04:00 AM
              </span>
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Google Drive • Clientes</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Backup automático das lojas, relatórios e serviços às 04:00 AM diretamente na pasta oficial "Backups Empreiteiro Saminês - Clientes".
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenFirebaseBackupSchedule('drive')}
            className="mt-4 w-full py-2.5 px-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
            <span>Gerenciar Google Drive</span>
          </button>
        </div>

        {/* Card de contato direto pelo WhatsApp */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <span className="text-xl" aria-hidden="true">☏</span>
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800">
                Contato direto
              </span>
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">WhatsApp • Atendimento</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Converse diretamente com a equipe pelo WhatsApp, sem API ou envio automático.
            </p>
            <p className="text-xs font-bold text-slate-700 mt-2">(61) 3142-1406</p>
          </div>
          <a href="https://wa.me/556131421406" target="_blank" rel="noopener noreferrer" className="mt-4 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-emerald-700">
            Abrir conversa no WhatsApp
          </a>
        </div>

        {/* Card Google Play / PWA Android */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-purple-300 transition group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-purple-100 text-purple-800">
                PWA Android
              </span>
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Google Play & APK</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Instalação como aplicativo oficial Android no celular e publicação na Google Play Store.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenPlayStoreModal}
            className="mt-4 w-full py-2.5 px-3 bg-slate-50 hover:bg-purple-50 text-slate-800 hover:text-purple-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-purple-600" />
            <span>Acessar Gerador de APK</span>
          </button>
        </div>

        {/* Card Ícone & PWA Desktop / Mobile */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-300 transition group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 p-1 flex items-center justify-center border border-emerald-200">
                <img
                  src={logoUrl || "/logo-192.png"}
                  alt="Logo Saminês"
                  className="w-full h-full object-contain"
                  onError={(e) => { e.currentTarget.src = '/logo.png'; }}
                />
              </div>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase bg-emerald-100 text-emerald-800">
                Atalhos & Ícones
              </span>
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">Ícone do PWA & Atalhos</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Renovação do ícone na Barra de Tarefas, Área de Trabalho do Windows e tela inicial do celular.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsPwaUpdateModalOpen(true)}
            className="mt-4 w-full py-2.5 px-3 bg-slate-50 hover:bg-emerald-50 text-slate-800 hover:text-emerald-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
            <span>Atualizar Ícones e Atalhos</span>
          </button>
        </div>

        {/* Card Código-Fonte Completo ZIP */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm flex flex-col justify-between border border-slate-700 md:col-span-2 lg:col-span-3 hover:border-emerald-500/50 transition">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full">
                    ZIP Completo • PWA
                  </span>
                  <span className="text-xs text-slate-400">Todos os arquivos incluídos</span>
                </div>
                <h4 className="font-extrabold text-white text-base">Código-Fonte Completo do PWA</h4>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Baixe o arquivo compactado (.ZIP) com 100% dos arquivos do projeto: componentes React, TypeScript, Vite, Service Worker, regras de segurança Firestore, servidor Node.js Express, ícones e manual <code className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded">README.md</code> para rodar localmente com <code className="bg-slate-800 text-emerald-300 px-1.5 py-0.5 rounded">npm install && npm run dev</code>.
                </p>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <a
                href="/api/download-pwa-zip"
                download="empreiteiro-samines-pwa-codigo-completo.zip"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm rounded-xl transition shadow-lg shadow-emerald-950/40 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Baixar Código .ZIP</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Interativo de Instruções & Limpeza de Cache PWA */}
      <PwaIconUpdateModal
        isOpen={isPwaUpdateModalOpen}
        onClose={() => setIsPwaUpdateModalOpen(false)}
      />
    </div>
  );
};
