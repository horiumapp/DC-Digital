/**
 * SWUpdatePrompt.tsx — Prompt de atualização do Service Worker
 * 
 * Exibe um banner quando uma nova versão do app é detectada,
 * permitindo ao usuário recarregar para a versão mais recente.
 */
import { X, RefreshCw } from 'lucide-react';

interface SWUpdatePromptProps {
  onUpdate: () => void;
  onDismiss: () => void;
}

export default function SWUpdatePrompt({ onUpdate, onDismiss }: SWUpdatePromptProps) {
  return (
    <div
      className="fixed bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-[9998]
        bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700
        p-5 animate-[slideIn_0.3s_ease-out]"
      role="alert"
      id="sw-update-prompt"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
            Nova versão disponível!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Uma atualização do Diário Digital está pronta. Atualize para a versão mais recente.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onUpdate}
              className="px-4 py-2 bg-[#0f2851] text-white text-xs font-bold rounded-lg
                hover:bg-[#1a3a6d] transition-colors shadow-sm active:scale-95"
            >
              Atualizar agora
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg
                hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
              Depois
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
