import React, { useState, useEffect } from 'react';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';

export default function LoadingFallback() {
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTroubleshoot(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleClearAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // caso o acesso ao storage esteja restrito
    }
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-sm p-4">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
        Carregando...
      </p>

      {showTroubleshoot && (
        <div className="mt-6 max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-4 text-center dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex items-center justify-center gap-1.5 text-amber-700 dark:text-amber-400 text-sm font-semibold mb-2">
            <AlertCircle className="w-4 h-4" />
            <span>Está demorando mais do que o normal?</span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-300/80 mb-3">
            Pode haver oscilação na conexão com o servidor ou dados salvos expirados.
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-slate-700 border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Recarregar
            </button>
            <button
              onClick={handleClearAndReload}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition cursor-pointer"
            >
              Ir para o Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
