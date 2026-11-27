import { PaymentStatus } from '../types';

export function formatCurrency(value: number): string {
  if (isNaN(value) || value === null || value === undefined) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export function formatRelativeTime(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

    if (diffSec < 60) return 'Agora mesmo';
    if (diffSec < 3600) return `Há ${Math.floor(diffSec / 60)} min`;
    if (diffSec < 86400) return `Há ${Math.floor(diffSec / 3600)} h`;
    return formatDate(isoString.slice(0, 10));
  } catch {
    return isoString;
  }
}

export function getStatusDetails(status: PaymentStatus): {
  label: string;
  badgeClass: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
} {
  switch (status) {
    case 'pago':
      return {
        label: 'Pago',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        borderClass: 'border-emerald-500',
        bgClass: 'bg-emerald-500',
        textClass: 'text-emerald-700',
      };
    case 'pendente':
      return {
        label: 'Pendente',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        borderClass: 'border-amber-500',
        bgClass: 'bg-amber-500',
        textClass: 'text-amber-700',
      };
    case 'parcial':
      return {
        label: 'Parcial',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
        borderClass: 'border-sky-500',
        bgClass: 'bg-sky-500',
        textClass: 'text-sky-700',
      };
    case 'atrasado':
      return {
        label: 'Em Atraso',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        borderClass: 'border-rose-500',
        bgClass: 'bg-rose-500',
        textClass: 'text-rose-700',
      };
    case 'cancelado':
      return {
        label: 'Cancelado',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
        borderClass: 'border-slate-400',
        bgClass: 'bg-slate-400',
        textClass: 'text-slate-600',
      };
    default:
      return {
        label: 'Pendente',
        badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
        borderClass: 'border-slate-500',
        bgClass: 'bg-slate-500',
        textClass: 'text-slate-700',
      };
  }
}
