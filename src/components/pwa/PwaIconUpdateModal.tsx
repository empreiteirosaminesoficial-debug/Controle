import React, { useState } from 'react';
import { 
  X, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Download,
  Sparkles,
  Info
} from 'lucide-react';
import { usePWA } from '../../hooks/use-pwa';
import { forcePwaIconAndCacheRefresh } from '../../lib/pwa';
import { useAppLogo } from '../../utils/logoManager';

interface PwaIconUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaIconUpdateModal: React.FC<PwaIconUpdateModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstalled, isInstallable, install } = usePWA();
  const { logoUrl } = useAppLogo();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'windows' | 'mobile'>('windows');

  if (!isOpen) return null;

  const handleForceRefresh = async () => {
    setIsRefreshing(true);
    await forcePwaIconAndCacheRefresh();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header Oficial com o Novo Logotipo em Destaque */}
        <div className="bg-linear-to-r from-[#134027] via-[#184d30] to-[#0f2c1b] text-white p-5 sm:p-6 relative overflow-hidden shrink-0">
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 p-1 flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                <img
                  src={logoUrl || "/logo-transparent.png"}
                  alt="Logo Oficial Saminês"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Atualizar Ícone do PWA
                  </h2>
                  <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Novo Logo
                  </span>
                </div>
                <p className="text-xs text-emerald-100/90 mt-0.5">
                  Como renovar o ícone na Área de Trabalho, Barra de Tarefas e Celular
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Informação Técnica Amigável */}
        <div className="p-4 sm:p-5 bg-amber-50 border-b border-amber-200/80 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong>Por que o ícone na Barra de Tarefas / Desktop não muda sozinho?</strong>
            <p className="mt-1 text-amber-800">
              O Windows e o Google Chrome gravam os atalhos antigos (arquivos <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">.lnk</code> e <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px]">.ico</code>) no disco rígido do computador. Para que o Windows exiba o novo logotipo oficial, basta reinstalar o atalho seguindo os 2 passos abaixo:
            </p>
          </div>
        </div>

        {/* Seletor de Plataforma: Windows PC vs Celular */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('windows')}
            className={`py-2.5 px-4 rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'windows'
                ? 'bg-white border-emerald-600 text-emerald-800 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Monitor className="w-4 h-4 text-emerald-600" />
            <span>Computador (Windows / Mac)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mobile')}
            className={`py-2.5 px-4 rounded-t-xl transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'mobile'
                ? 'bg-white border-emerald-600 text-emerald-800 shadow-2xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>Celular (Android / iPhone)</span>
          </button>
        </div>

        {/* Conteúdo com Passo a Passo Visual */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          
          {activeTab === 'windows' ? (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <p className="font-extrabold text-slate-900 text-sm">
                      Passo 1: Limpar o cache do aplicativo
                    </p>
                    <p className="mt-1 text-slate-600">
                      Clique no botão verde abaixo para purgar arquivos antigos da memória e baixar o manifesto atualizado com os novos logotipos:
                    </p>
                    <div className="mt-2.5">
                      <button
                        type="button"
                        onClick={handleForceRefresh}
                        disabled={isRefreshing}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                        <span>{isRefreshing ? 'Atualizando Arquivos...' : 'Limpar Cache & Renovar Arquivos do PWA'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-xs text-slate-700 leading-relaxed">
                    <p className="font-extrabold text-slate-900 text-sm">
                      Passo 2: Desinstalar e Reinstalar o Atalho (Leva 10 segundos)
                    </p>
                    <ul className="mt-2 space-y-2 list-disc list-inside text-slate-600">
                      <li>
                        <strong>Se o app estiver aberto em janela própria:</strong> Clique nos <strong>3 pontinhos</strong> (⋮) no topo direito da janela e selecione <strong>"Desinstalar Empreiteiro Saminês..."</strong>.
                      </li>
                      <li>
                        <strong>Na Barra de Tarefas:</strong> Clique com o botão direito no ícone antigo fixado e escolha <strong>"Desafixar da barra de tarefas"</strong>.
                      </li>
                      <li>
                        <strong>Na Área de Trabalho:</strong> Se houver o ícone antigo, arraste-o para a Lixeira.
                      </li>
                      <li>
                        <strong>Reinstalar com o novo ícone:</strong> Abra esta página no Chrome ou Edge e clique em <strong>"Instalar Aplicativo"</strong> (no ícone de computador na barra de endereço ou no botão abaixo).
                      </li>
                    </ul>

                    {isInstallable && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => install()}
                          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Instalar Atalho no Computador Agora</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>No Celular Android</span>
                </h4>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Toque e segure o ícone antigo do <strong>Empreiteiro Saminês</strong> na tela inicial e arraste para <strong>"Desinstalar"</strong> ou <strong>"Remover"</strong>.</li>
                  <li>Abra o link do aplicativo no <strong>Google Chrome</strong>.</li>
                  <li>Toque nos <strong>3 pontinhos do Chrome</strong> no topo e selecione <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</li>
                  <li>O novo ícone adaptativo oficial (com bordas seguras) surgirá imediatamente na sua tela inicial!</li>
                </ol>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span>No iPhone / iPad (iOS Safari)</span>
                </h4>
                <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>Toque e segure o ícone antigo na tela de início e escolha <strong>"Apagar Marcador"</strong>.</li>
                  <li>Abra o aplicativo no navegador <strong>Safari</strong>.</li>
                  <li>Toque no botão de <strong>Compartilhar</strong> (quadrado com seta para cima) na barra inferior.</li>
                  <li>Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Comparativo de Qualidade */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                <img
                  src={logoUrl || "/logo-512.png"}
                  alt="Ícone 512x512"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-xs text-emerald-950">
                <strong className="block text-emerald-900 font-bold">Novo Arquivo do Logotipo Ativo:</strong>
                <span className="text-[11px] text-emerald-800">Versão 6.2.0 (Resoluções 16x16 até 1024x1024 + Maskable)</span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Pronto</span>
            </span>
          </div>

        </div>

        {/* Rodapé */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Entendi, vou atualizar
          </button>
        </div>

      </div>
    </div>
  );
};
