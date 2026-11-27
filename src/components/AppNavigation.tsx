import React from 'react';
import { 
  LayoutDashboard, 
  HardHat, 
  ClipboardList, 
  CalendarClock, 
  Users, 
  Receipt, 
  Building2
} from 'lucide-react';
import { AppPage } from '../types';

export interface AppNavigationCounts {
  services?: number;
  obras?: number;
  visitas?: number;
  stores?: number;
  comprovantes?: number;
}

interface AppNavigationProps {
  currentPage: AppPage;
  onPageChange: (page: AppPage) => void;
  counts?: AppNavigationCounts;
  /** Itens novos ainda não vistos por página (badge vermelho). Zera ao abrir a página. */
  newCounts?: Partial<Record<AppPage, number>>;
  isClient?: boolean;
}

export interface NavItemConfig {
  id: AppPage;
  label: string;
  icon: React.FC<{ className?: string }>;
  description: string;
  badge?: number;
}

export const NAV_ITEMS: NavItemConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Visão executiva com indicadores financeiros, faturamento e gráficos analíticos',
  },
  {
    id: 'obras',
    label: 'Obras',
    icon: HardHat,
    description: 'Gestão de canteiros, cronogramas, custos e progresso das obras em execução',
  },
  {
    id: 'servicos',
    label: 'Serviços',
    icon: ClipboardList,
    description: 'Lançamentos analíticos, pagamentos, débitos de materiais e controle diário',
  },
  {
    id: 'visitas',
    label: 'Visitas',
    icon: CalendarClock,
    description: 'Agendamento e controle de vistorias técnicas, orçamentos e medições',
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: Users,
    description: 'Cadastro detalhado de clientes, lojas e pessoas físicas (CNPJ e CPF)',
  },
  {
    id: 'comprovantes',
    label: 'Comprovantes',
    icon: Receipt,
    description: 'Central de comprovantes de pagamento e fotos de antes/durante/depois das obras',
  },
  {
    id: 'empresa',
    label: 'Conheça a Empresa',
    icon: Building2,
    description: 'Identidade institucional, dados cadastrais oficiais, garantias e canais de contato',
  },
];

export const AppNavigation: React.FC<AppNavigationProps> = ({
  currentPage,
  onPageChange,
  counts,
  newCounts,
  isClient = false,
}) => {
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // Admin-only pages are completely hidden from the client portal
    if (isClient && (item.id === 'clientes')) {
      return false;
    }
    return true;
  });

  return (
    <nav 
      aria-label="Navegação Principal do Sistema"
      className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs overflow-x-auto scrollbar-none touch-pan-x [overscroll-behavior-x:contain] w-full"
    >
      <div className="flex items-center gap-1.5 min-w-max">
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const displayLabel = isClient
            ? (item.id === 'obras' ? 'Minhas Obras' :
               item.id === 'servicos' ? 'Serviços Executados' :
               item.id === 'visitas' ? 'Visitas Feitas' :
               item.id === 'comprovantes' ? 'Meus Comprovantes' : item.label)
            : item.label;
          const badgeCount = 
            item.id === 'servicos' ? counts?.services :
            item.id === 'obras' ? counts?.obras :
            item.id === 'visitas' ? counts?.visitas :
            item.id === 'clientes' ? counts?.stores :
            item.id === 'comprovantes' ? counts?.comprovantes : undefined;

          const newCount = newCounts?.[item.id] ?? 0;
          const countToDisplay = (isClient && (item.id === 'visitas' || item.id === 'servicos')) ? (badgeCount ?? 0) : badgeCount;

          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              type="button"
              onClick={() => onPageChange(item.id)}
              className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer select-none ${
                isActive
                  ? 'bg-linear-to-r from-[#14532d] to-[#166534] text-white shadow-md shadow-emerald-900/25 scale-[1.02] ring-2 ring-emerald-600/40 border border-emerald-600/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/90 active:scale-95'
              }`}
              title={`${displayLabel} ${countToDisplay !== undefined ? `(${countToDisplay})` : ''}`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${isActive ? 'scale-110 text-amber-300' : 'text-slate-500'}`} />
              <span className="tracking-tight whitespace-nowrap">{displayLabel}</span>

              {typeof countToDisplay === 'number' && (countToDisplay > 0 || (isClient && (item.id === 'visitas' || item.id === 'servicos'))) && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full transition-colors ${
                    isActive
                      ? 'bg-amber-400 text-emerald-950 font-black shadow-2xs'
                      : 'bg-slate-200/80 text-slate-700 group-hover:bg-slate-300'
                  }`}
                >
                  {countToDisplay}
                </span>
              )}

              {newCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-black rounded-full bg-red-600 text-white shadow-md ring-2 ring-white animate-pulse"
                  aria-label={`${newCount} novidade(s)`}
                  title={`${newCount} novidade(s) não vista(s)`}
                >
                  {newCount > 99 ? '99+' : newCount}
                </span>
              )}

              {/* Micro highlight indicator for active item */}
              {isActive && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-amber-400 rounded-full shadow-xs animate-in fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
