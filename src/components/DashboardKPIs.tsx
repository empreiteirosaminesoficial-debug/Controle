import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Receipt, 
  CheckCircle,
  Percent,
  Layers,
  FileText,
} from 'lucide-react';
import { FinancialSummary } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DashboardKPIsProps {
  summary: FinancialSummary;
  isClient?: boolean;
  selectedStoreName?: string;
  selectedMonthName?: string;
  overduePendingCount?: number;
  onFilterOverduePending?: () => void;
  onOpenFirebaseBackupSchedule?: () => void;
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = ({
  summary,
  isClient = false,
  selectedStoreName,
  selectedMonthName,
  overduePendingCount = 0,
  onFilterOverduePending,
  onOpenFirebaseBackupSchedule,
}) => {
  return (
    <div className="space-y-3">
      {/* Subtitle / Filter Active & Quick Actions Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {(selectedStoreName || selectedMonthName) ? (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
            <span className="font-semibold text-slate-700">Filtro ativo no Dashboard:</span>
            {selectedStoreName && (
              <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded-md font-medium">
                Loja: {selectedStoreName}
              </span>
            )}
            {selectedMonthName && (
              <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-medium">
                Mês: {selectedMonthName}
              </span>
            )}
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">

          {onOpenFirebaseBackupSchedule && (
            <button
              type="button"
              id="btn-kpi-backup-schedule"
              onClick={onOpenFirebaseBackupSchedule}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 transition cursor-pointer shadow-2xs"
              title="Acessar configuração de Backup Agendado no Firestore"
            >
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              <span>Backup Agendado</span>
            </button>
          )}
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Total Cobrado */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs hover:border-sky-300 transition relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Cobrado</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {formatCurrency(summary.totalCharged)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>{summary.totalServicesCount} serviço(s) cadastrado(s)</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-sky-500 opacity-80" />
        </div>

        {/* Card 2: Total Recebido */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs hover:border-emerald-300 transition relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Recebido</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-emerald-600 tracking-tight">
              {formatCurrency(summary.totalPaid)}
            </h3>
            <p className="text-[11px] text-emerald-700/80 mt-0.5 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>{summary.paidPercentage.toFixed(1)}% liquidado</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 opacity-80" />
        </div>

        {/* Card 3: Saldo a Receber */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs hover:border-amber-300 transition relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">A Receber</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-amber-600 tracking-tight">
              {formatCurrency(summary.totalPending)}
            </h3>
            <div className="flex items-center justify-between mt-1 flex-wrap gap-1">
              <span className="text-[11px] text-amber-700/80">
                Pendente & Em Aberto
              </span>
              {overduePendingCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFilterOverduePending?.();
                  }}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200 transition cursor-pointer"
                  title="Filtrar serviços pendentes há mais de 30 dias"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>{overduePendingCount} &gt; 30d</span>
                </button>
              )}
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 opacity-80" />
        </div>

        {/* Card 4: NOTA FISCAL (+38%) */}
        <div 
          id="card-nota-fiscal"
          className="bg-white rounded-xl border border-purple-200/90 p-3.5 sm:p-4 shadow-xs hover:border-purple-400 transition relative overflow-hidden group bg-linear-to-b from-white to-purple-50/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">NOTA FISCAL</span>
              {!isClient && (
                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-purple-200">
                  +38%
                </span>
              )}
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-purple-700 tracking-tight">
              {formatCurrency(
                isClient
                  ? (summary.totalNotaFiscal ?? (summary.totalDebits * 1.38)) + (summary.totalImpostoNF ?? (summary.totalDebits * 0.38))
                  : (summary.totalNotaFiscal ?? (summary.totalDebits * 1.38))
              )}
            </h3>
            {!isClient && (
              <p className="text-[11px] text-purple-700/90 mt-0.5 flex items-center justify-between">
                <span>Débito Extra c/ NF (+38%)</span>
                <span className="font-semibold text-[10px] bg-purple-50 px-1 py-0.2 rounded">
                  +{formatCurrency(summary.totalImpostoNF ?? (summary.totalDebits * 0.38))}
                </span>
              </p>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 opacity-90" />
        </div>

        {/* Card 5: Taxa de Liquidação & Saldo Geral — somente ADM */}
        {!isClient && (
        <div className="col-span-2 md:col-span-1 bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 shadow-xs hover:border-indigo-300 transition relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Taxa Liquidação</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-indigo-900 tracking-tight">
              {summary.paidPercentage.toFixed(0)}%
            </h3>
            {/* Mini Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.paidPercentage)}%` }}
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 opacity-80" />
        </div>
        )}

      </div>
    </div>
  );
};
