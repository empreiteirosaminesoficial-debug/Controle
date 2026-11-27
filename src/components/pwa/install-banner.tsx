import React, { useState } from 'react';
import { WifiOff, RefreshCw, Sparkles } from 'lucide-react';
import { usePWA } from '../../hooks/use-pwa';
import { PwaIconUpdateModal } from './PwaIconUpdateModal';

export const InstallBanner: React.FC = () => {
  const { isOnline, hasUpdate, isCheckingUpdate, checkForUpdates, updateApp } = usePWA();
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  return (
    <>
      {/* 1. Alerta de Modo Offline */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex flex-wrap items-center justify-between gap-2 shadow-xs relative z-40 border-b border-amber-700/50">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-200 shrink-0 animate-pulse" />
            <span>
              <strong>Modo Offline Ativo:</strong> Você pode visualizar, criar e editar tudo normalmente. Suas alterações ficam salvas no dispositivo e sincronizarão com a nuvem assim que a internet voltar.
            </span>
          </div>
          <button
            type="button"
            onClick={() => checkForUpdates()}
            disabled={isCheckingUpdate}
            className="px-2.5 py-1 bg-amber-700/60 hover:bg-amber-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 ml-auto sm:ml-0"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>Testar Conexão</span>
          </button>
        </div>
      )}

      {/* 2. Banner de Atualização Disponível com Novos Ícones */}
      {isOnline && hasUpdate && (
        <div className="bg-linear-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white px-4 py-2 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 shadow-md relative z-40 border-b border-emerald-900 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>Nova Atualização do PWA Pronta:</strong> Novos ícones oficiais e melhorias já estão disponíveis para o seu dispositivo.
            </span>
          </div>
          <div className="flex items-center gap-2 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setIsUpdateModalOpen(true)}
              className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-[11px] font-bold text-white transition cursor-pointer"
            >
              Ver Instruções
            </button>
            <button
              type="button"
              onClick={() => updateApp()}
              className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-900 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Atualizar Agora</span>
            </button>
          </div>
        </div>
      )}



      {/* Modal Interativo com Guia de Atualização de Ícones */}
      <PwaIconUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
      />
    </>
  );
};
