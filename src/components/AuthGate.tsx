import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  LogIn, 
  UserCheck, 
  Store, 
  ArrowRight, 
  Lock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Briefcase,
  UserPlus,
  RefreshCw,
  Phone,
  Sparkles
} from 'lucide-react';
import { StoreProfile, UserProfile } from '../types';
import { useAppLogo } from '../utils/logoManager';
import { 
  forceFullAppSessionReset,
} from '../utils/storage';
import { executeGoogleLogin, checkInitialGoogleRedirect } from '../utils/googleAuthService';
import { auth } from '../lib/firebase';

interface AuthGateProps {
  onLogin: (user: UserProfile) => void;
  stores?: StoreProfile[];
}

export const AuthGate: React.FC<AuthGateProps> = ({ onLogin }) => {
  const [activeTab, setActiveTab] = useState<'client' | 'admin'>('client');

  // Google Login state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Login form state
  const [loginError, setLoginError] = useState('');

  // Register form state

  // Admin form state

  // Reset feedback
  const [resetMessage, setResetMessage] = useState('');
  const { logoUrl } = useAppLogo();

  // Acesso à Área do Gestor (Admin) sempre visível e acessível para o administrador oficial
  const handleClientTabClick = () => {
    setActiveTab('client');
    setLoginError('');
  };

  // Verifica retorno de login com Google via redirect em navegadores móveis/PWA
  useEffect(() => {
    let isMounted = true;
    checkInitialGoogleRedirect()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success && res.profile) {
          const currentFirebaseUser = auth.currentUser;
          if (!currentFirebaseUser || currentFirebaseUser.uid !== res.profile.id || currentFirebaseUser.email?.toLowerCase() !== res.profile.email.toLowerCase()) {
            setLoginError('A identidade Google mudou durante a validação. Entre novamente.');
            return;
          }
          if (res.profile.status === 'pending') {
            setLoginError('Conta Google identificada. O acesso aos dados aguarda aprovação do administrador.');
          } else if (res.profile.role === 'admin' && res.profile.status === 'active') {
            onLogin(res.profile);
          } else if (res.profile.role === 'client' && res.profile.status === 'active' && (res.profile.authorizedStoreIds || []).length > 0) {
            onLogin(res.profile);
          } else if (res.profile.status === 'blocked') {
            setLoginError('Solicitação rejeitada ou acesso suspenso. Entre em contato com o administrador.');
          } else {
            setLoginError('Esta conta ainda não possui um estabelecimento aprovado.');
          }
        }
      })
      .catch((err) => {
        console.warn('[AuthGate] Erro ao checar redirecionamento do Google:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [onLogin]);

  // Handler para Login Oficial com a Conta do Google
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setLoginError('');
    try {
      const res = await executeGoogleLogin();
      if (res.success && res.profile) {
        const currentFirebaseUser = auth.currentUser;
        if (!currentFirebaseUser || currentFirebaseUser.uid !== res.profile.id || currentFirebaseUser.email?.toLowerCase() !== res.profile.email.toLowerCase()) {
          setLoginError('A identidade Google mudou durante a validação. Entre novamente.');
          return;
        }
        if (res.profile.status === 'pending') {
          setLoginError('Conta Google identificada. O acesso aos dados aguarda aprovação do administrador.');
        } else if (res.profile.role === 'admin' && res.profile.status === 'active') {
          onLogin(res.profile);
        } else if (res.profile.role === 'client' && res.profile.status === 'active' && (res.profile.authorizedStoreIds || []).length > 0) {
          onLogin(res.profile);
        } else if (res.profile.status === 'blocked') {
          setLoginError('Solicitação rejeitada ou acesso suspenso. Entre em contato com o administrador.');
        } else {
          setLoginError('Acesso ainda pendente de aprovação do administrador.');
        }
      } else if (res.error) {
        setLoginError(res.error);
      }
    } catch (err: any) {
      const msg = err?.message || 'Falha ao autenticar com o perfil do Google.';
      setLoginError(msg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFullReset = () => {
    if (window.confirm('Deseja limpar todos os dados de sessão e cache deste dispositivo? Você retornará ao início limpo.')) {
      forceFullAppSessionReset();
      setResetMessage('Cache e sessões limpas com sucesso! Recarregando...');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-100 via-slate-50 to-slate-200 flex flex-col justify-center items-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden flex flex-col animate-in fade-in duration-300">
        
        {/* Brand Banner com as cores oficiais do Logo (Verde Floresta & Dourado Âmbar) */}
        <div className="bg-linear-to-b from-[#134027] via-[#184d30] to-[#0f2c1b] text-white p-6 sm:p-7 text-center relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

          {/* Logo Oficial com FUNDO TRANSPARENTE e desenho original sem distorções */}
          <div className="inline-flex items-center justify-center mb-3">
            <img
              src={logoUrl || '/logo-transparent.png'}
              alt="Logo Empreiteiro Saminês"
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = '/logo-transparent.png';
              }}
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Empreiteiro Saminês
          </h1>
          <div className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold text-[11px] uppercase tracking-widest shadow-2xs">
            Gestão
          </div>
        </div>

        {/* Tab Selection: Client Portal vs Admin Access */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex rounded-none gap-2">
          <button
            type="button"
            onClick={handleClientTabClick}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer select-none ${
              activeTab === 'client'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Portal do Cliente</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('admin');
              setLoginError('');
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Área do Gestor (Admin)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-7">
          
          {/* TAB 1: CLIENT PORTAL (LOGIN & REGISTRO) */}
          {activeTab === 'client' && (
            <div className="space-y-4">

              {/* Botão Oficial de Login com Perfil do Google */}
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={isGoogleLoading}
                  onClick={handleGoogleLogin}
                  className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl border border-slate-300 shadow-xs hover:shadow-sm transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  {isGoogleLoading ? (
                    <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.24 5.42l4.04-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                  )}
                  <span>
                    {isGoogleLoading ? 'Conectando à sua Conta Google...' : 'Entrar com perfil do Google'}
                  </span>
                </button>

              </div>
              
              {loginError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}
              <p className="text-xs text-slate-600 leading-relaxed">
                O acesso é solicitado exclusivamente com uma conta Google. CPF/CNPJ serve para identificar o estabelecimento e nunca substitui a autenticação nem libera acesso automaticamente.
              </p>
            </div>
          )}

          {/* TAB 2: ADMIN ACCESS */}
          {activeTab === 'admin' && (
            <div className="space-y-4">
              <div className="bg-slate-900 text-white rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Acesso Restrito ao Empreiteiro Gestor</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Conta Oficial: <strong className="text-white font-mono">empreiteirosaminesoficial@gmail.com</strong>.
                  Entre exclusivamente com sua conta Google oficial, com e-mail verificado.
                </p>
              </div>

              {/* Botão de Login com Google do Administrador */}
              <button
                type="button"
                disabled={isGoogleLoading}
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl border border-slate-300 shadow-xs hover:shadow-sm transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
              >
                {isGoogleLoading ? (
                  <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.24 5.42l4.04-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                )}
                <span>
                  {isGoogleLoading ? 'Autenticando Administrador...' : 'Entrar com Google (empreiteirosaminesoficial)'}
                </span>
              </button>

              {loginError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}
              <p className="text-xs text-slate-500">Acesso administrativo somente pela conta Google oficial com e-mail verificado. PIN e acesso por perfil local foram desativados.</p>
            </div>
          )}

        </div>

        {/* Reset Feedback if clicked */}
        {resetMessage && (
          <div className="px-6 py-2 bg-emerald-50 text-emerald-800 text-[11px] font-bold text-center border-t border-emerald-200">
            {resetMessage}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50/80 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <button
            type="button"
            onClick={handleFullReset}
            className="hover:text-rose-600 transition flex items-center gap-1 cursor-pointer"
            title="Limpa cache e dados de sessão local deste navegador"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Resetar Sessão</span>
          </button>
          <span className="font-semibold text-slate-400">
            PWA Google Oficial • v3.8
          </span>
        </div>

      </div>
    </div>
  );
};
