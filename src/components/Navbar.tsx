import React, { useState } from 'react';
import { 
  Bell, 
  Building2, 
  FileSpreadsheet, 
  CheckCircle2, 
  Smartphone,
  Search,
  LogOut,
  Sparkles,
  CloudCheck,
  RefreshCw,
  WifiOff,
  Users,
  Database,
  Archive
} from 'lucide-react';
import { AppNotification, AppPage, StoreProfile, SyncStatus, UserProfile } from '../types';
import { useAppLogo } from '../utils/logoManager';

interface NavbarProps {
  user?: UserProfile | null;
  stores: StoreProfile[];
  selectedStoreId: string;
  onSelectStore: (id: string) => void;
  notifications: AppNotification[];
  syncStatus: SyncStatus;
  currentPage?: AppPage;
  onPageChange?: (page: AppPage) => void;
  onOpenNewService?: () => void;
  onOpenStoresModal: () => void;
  onOpenGoogleAuth: () => void;
  onOpenNotifications: () => void;
  onRequestPermission: () => void;
  notificationPermission: NotificationPermission;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  stores,
  selectedStoreId,
  onSelectStore,
  notifications,
  syncStatus,
  currentPage = 'dashboard',
  onPageChange,
  onOpenNewService,
  onOpenStoresModal,
  onOpenGoogleAuth,
  onOpenNotifications,
  onRequestPermission,
  notificationPermission,
  searchQuery,
  onSearchChange,
  onLogout,
}) => {
  const { logoUrl } = useAppLogo();
  const unreadCount = notifications.filter(n => !n.read).length;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Browser Notification Prompt Banner if not granted yet */}
      {user?.role === 'client' && user?.email?.toLowerCase() !== 'empreiteirosaminesoficial@gmail.com' && notificationPermission === 'default' && (
        <div className="bg-sky-50 border-b border-sky-200 px-4 py-2 flex flex-wrap items-center justify-between text-xs text-sky-800 gap-2">
          <div className="flex items-center gap-2 font-medium">
            <Smartphone className="w-4 h-4 text-sky-600 animate-pulse" />
            <span>Ative as notificações para receber alertas imediatos de novos serviços, débitos e pagamentos no navegador e no celular.</span>
          </div>
          <button
            onClick={onRequestPermission}
            className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded font-medium shadow-xs transition"
          >
            Ativar Notificações
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="relative w-12 h-12 shrink-0 flex items-center justify-center">
              <img
                src={logoUrl || "/logo-transparent.png"}
                alt="Empreiteiro Saminês Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = '/logo.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-base leading-tight tracking-tight">Empreiteiro Saminês</span>
                {user?.role === 'client' ? (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Portal do Cliente
                  </span>
                ) : (
                  <span className="bg-amber-100 text-amber-900 border border-amber-300/80 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider shadow-2xs">
                    Gestão Oficial
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden md:flex items-center flex-1 max-w-xs relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar serviço, loja ou descrição..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 focus:bg-white transition"
            />
          </div>

          {/* Store Switcher */}
          <div className="hidden lg:flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" />
            <select
              value={selectedStoreId}
              onChange={(e) => onSelectStore(e.target.value)}
              className="bg-slate-100 hover:bg-slate-200/70 border border-slate-300 text-slate-800 text-xs rounded-lg px-2.5 py-1.5 font-medium focus:ring-2 focus:ring-sky-500 transition cursor-pointer max-w-[210px] truncate"
            >
              <option value="todas">
                {user?.role === 'client' ? 'Minhas Lojas / Estabelecimentos' : 'Todas as Lojas / Clientes'}
              </option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nomeFantasia} ({s.cnpj.slice(0, 10)}...)
                </option>
              ))}
            </select>
            {user?.role === 'admin' && (
              <button
                onClick={onOpenStoresModal}
                title="Gerenciar clientes (editar, excluir e cadastrar novos)"
                aria-label="Gerenciar Clientes"
                className="p-2 text-slate-700 hover:text-sky-700 bg-slate-100 hover:bg-sky-50 rounded-lg border border-slate-300 hover:border-sky-300 transition cursor-pointer shadow-2xs"
              >
                <Users className="w-4 h-4 text-sky-600 shrink-0" />
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Notifications Bell - Exibido apenas para administradores/gestores, oculto para clientes */}
            {user?.role === 'admin' && (
              <button
                type="button"
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-600 hover:text-sky-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title="Central de Notificações"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* Google Profile Badge & Login Access */}
            <button 
              type="button"
              id="btn-nav-meu-perfil"
              onClick={onOpenGoogleAuth}
              className={`flex items-center gap-2 pl-2 pr-2.5 py-1 transition cursor-pointer rounded-xl active:scale-95 shadow-2xs hover:shadow-xs ${
                user?.role === 'client'
                  ? 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
              }`}
              title="Clique para ver os Dados do Meu Perfil Oficial e Empresas Cadastradas"
              aria-label="Dados do Meu Perfil e Empresas Cadastradas"
            >
              <div className="relative shrink-0 pointer-events-none">
                <img
                  src={logoUrl || (user?.avatar && !user.avatar.includes('unsplash') ? user.avatar : '/logo-transparent.png')}
                  alt={user?.name || 'Usuário'}
                  className="w-8 h-8 rounded-full border-2 border-emerald-500 object-contain bg-white shadow-2xs p-0.5"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = '/logo-transparent.png';
                  }}
                />
                <div className="absolute -bottom-0.5 -right-0.5 bg-white rounded-full p-0.5 shadow-xs">
                  <svg className="w-3 h-3" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                </div>
              </div>
              <div className="flex flex-col text-left pointer-events-none">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded-xs leading-none">
                    Meu Perfil
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800 leading-tight group-hover:text-emerald-700 transition truncate max-w-[100px] sm:max-w-[130px] md:max-w-[160px] lg:max-w-[200px]">
                  {user?.name || 'Empreiteiro Samines'}
                </p>
                <p className="text-[10px] text-slate-500 font-mono truncate hidden sm:block max-w-[120px] md:max-w-[160px] lg:max-w-[200px]">
                  {user?.email || 'empreiteirosaminesoficial@gmail.com'}
                </p>
              </div>
            </button>

            {/* Logout button */}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                title="Sair / Desconectar deste dispositivo"
                aria-label="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

          </div>
        </div>

        {/* Mobile secondary bar for store filter & search */}
        <div className="py-2 border-t border-slate-100 flex lg:hidden items-center justify-between gap-2">
          <select
            value={selectedStoreId}
            onChange={(e) => onSelectStore(e.target.value)}
            className="w-full bg-slate-100 border border-slate-300 text-slate-800 text-xs rounded-lg px-2 py-1.5 font-medium truncate"
          >
            <option value="todas">
              {user?.role === 'client' ? 'Minhas Lojas / Estabelecimentos' : 'Todas as Lojas / Clientes'}
            </option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nomeFantasia}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
