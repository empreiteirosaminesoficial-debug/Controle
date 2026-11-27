/**
 * Utilitários de Cálculo de Lembrete Automático para Serviços Pendentes
 * Empreiteiro Saminês
 */
import { ServiceRecord } from '../types';

/**
 * Calcula a quantidade de dias que um serviço está pendente com base na data de realização ou criação
 */
export function calculateDaysPending(service: ServiceRecord, referenceDate: Date = new Date()): number {
  const dateStr = service.date || service.createdAt;
  if (!dateStr) return 0;

  let serviceDate: Date;
  if (dateStr.includes('-') && dateStr.length === 10) {
    const [year, month, day] = dateStr.split('-').map(Number);
    serviceDate = new Date(year, month - 1, day);
  } else {
    serviceDate = new Date(dateStr);
  }

  if (isNaN(serviceDate.getTime())) return 0;

  const diffTime = referenceDate.getTime() - serviceDate.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

/**
 * Verifica se o serviço está com status 'pendente' há mais de X dias (padrão: 30 dias)
 */
export function isServiceOverduePending(
  service: ServiceRecord, 
  daysThreshold = 30, 
  referenceDate: Date = new Date()
): boolean {
  if (service.paymentStatus !== 'pendente') return false;
  const days = calculateDaysPending(service, referenceDate);
  return days > daysThreshold;
}

export interface OverduePendingItem extends ServiceRecord {
  daysPending: number;
  balancePending: number;
}

export interface OverduePendingSummary {
  count: number;
  totalBalance: number;
  services: OverduePendingItem[];
}

/**
 * Agrupa todos os serviços com status 'pendente' há mais de 30 dias
 */
export function getOverduePendingSummary(
  services: ServiceRecord[], 
  daysThreshold = 30, 
  referenceDate: Date = new Date()
): OverduePendingSummary {
  const overdueItems: OverduePendingItem[] = [];
  let totalBalance = 0;

  for (const s of services) {
    if (s.paymentStatus === 'pendente') {
      const days = calculateDaysPending(s, referenceDate);
      if (days > daysThreshold) {
        const balance = (s.valueCharged + (s.valueDebit || 0)) - (s.valuePaid || 0);
        totalBalance += balance;
        overdueItems.push({
          ...s,
          daysPending: days,
          balancePending: balance,
        });
      }
    }
  }

  // Ordena pelos que estão pendentes há mais tempo
  overdueItems.sort((a, b) => b.daysPending - a.daysPending);

  return {
    count: overdueItems.length,
    totalBalance,
    services: overdueItems,
  };
}
