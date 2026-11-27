import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { forceFullAppSessionReset } from '../utils/storage';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    forceFullAppSessionReset();
    window.location.reload();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Empreiteiro Saminês</h2>
              <p className="text-xs text-slate-500 mt-1">
                Uma atualização recente do aplicativo foi detectada.
              </p>
              {this.state.error?.message && (
                <p className="text-[10px] text-slate-400 font-mono mt-2 bg-slate-50 p-2 rounded-lg truncate">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recarregar Aplicativo</span>
              </button>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-slate-500" />
                <span>Limpar Cache e Abrir</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
