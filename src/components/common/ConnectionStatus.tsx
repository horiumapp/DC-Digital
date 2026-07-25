import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertCircle, Check, Trash2, X, AlertTriangle } from 'lucide-react';
import { useOffline } from '../../contexts/OfflineContext';

export default function ConnectionStatus() {
  const {
    connectionState,
    pendingCount,
    deadLetterCount,
    deadLetterItems,
    lastError,
    syncNow,
    retryErrors,
    discardDeadLetters,
  } = useOffline();

  const [visible, setVisible] = useState(false);
  const [showOnlineBrief, setShowOnlineBrief] = useState(false);
  const [showDeadLetterModal, setShowDeadLetterModal] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  useEffect(() => {
    if (connectionState === 'OFFLINE' || connectionState === 'SYNCING' || connectionState === 'ERROR' || deadLetterCount > 0) {
      setVisible(true);
      setShowOnlineBrief(false);
    } else if (connectionState === 'ONLINE') {
      if (visible || showOnlineBrief) {
        setShowOnlineBrief(true);
        setVisible(true);
        const timer = setTimeout(() => {
          setVisible(false);
          setShowOnlineBrief(false);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [connectionState, deadLetterCount]);

  const handleDiscard = async () => {
    setIsDiscarding(true);
    try {
      await discardDeadLetters();
      setShowDeadLetterModal(false);
    } finally {
      setIsDiscarding(false);
    }
  };

  if (!visible && deadLetterCount === 0) return null;

  const configs = {
    ONLINE: {
      bg: deadLetterCount > 0 ? 'bg-amber-600/95' : 'bg-emerald-500/90',
      icon: deadLetterCount > 0 ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />,
      text: deadLetterCount > 0
        ? `Atenção: ${deadLetterCount} item(ns) com erro permanente de sync`
        : pendingCount > 0 ? `Conectado • ${pendingCount} pendente(s)` : 'Conectado',
      action: deadLetterCount > 0 ? (
        <button
          onClick={() => setShowDeadLetterModal(true)}
          className="ml-2 px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-bold transition-colors cursor-pointer"
        >
          Ver erros
        </button>
      ) : pendingCount > 0 ? (
        <button
          onClick={syncNow}
          className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-xs font-semibold hover:bg-white/30 transition-colors cursor-pointer"
        >
          Sincronizar
        </button>
      ) : null,
    },
    OFFLINE: {
      bg: 'bg-amber-500/95',
      icon: <WifiOff className="w-4 h-4" />,
      text: pendingCount > 0
        ? `Sem conexão • ${pendingCount} alteração(ões) salva(s) localmente`
        : 'Sem conexão — trabalhando offline',
      action: null,
    },
    SYNCING: {
      bg: 'bg-blue-500/95',
      icon: <RefreshCw className="w-4 h-4 animate-spin" />,
      text: `Sincronizando ${pendingCount} item(ns)...`,
      action: null,
    },
    ERROR: {
      bg: 'bg-red-500/95',
      icon: <AlertCircle className="w-4 h-4" />,
      text: lastError || 'Erro na sincronização',
      action: (
        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={retryErrors}
            className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-semibold hover:bg-white/30 transition-colors cursor-pointer"
          >
            Tentar novamente
          </button>
          {deadLetterCount > 0 && (
            <button
              onClick={() => setShowDeadLetterModal(true)}
              className="px-2 py-0.5 bg-white/30 hover:bg-white/40 rounded text-xs font-bold transition-colors cursor-pointer"
            >
              Ver {deadLetterCount} erro(s)
            </button>
          )}
        </div>
      ),
    },
  };

  const config = configs[connectionState] || configs.OFFLINE;

  return (
    <>
      <div
        className={`
          ${config.bg} text-white text-xs font-medium
          flex items-center justify-center gap-2 px-4 py-2
          transition-all duration-300 ease-out
          shadow-sm backdrop-blur-sm
          z-40
        `}
        role="status"
        aria-live="polite"
        id="connection-status-bar"
      >
        {config.icon}
        <span>{config.text}</span>
        {config.action}

        {/* Botão fechar para OFFLINE */}
        {connectionState === 'OFFLINE' && (
          <button
            onClick={() => setVisible(false)}
            className="ml-2 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Fechar"
          >
            ✕
          </button>
        )}
      </div>

      {/* Modal de Detalhes da Dead Letter Queue */}
      {showDeadLetterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-amber-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="text-sm font-bold">Erros Permanentes de Sincronização</h3>
              </div>
              <button
                onClick={() => setShowDeadLetterModal(false)}
                className="text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-slate-600 leading-relaxed">
                Os itens abaixo encontraram impedimentos que impedem a gravação automática no servidor (ex: violação de permissão, regra de negócio ou duplicidade).
              </p>

              <div className="space-y-2">
                {deadLetterItems.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex justify-between font-bold text-slate-800">
                      <span>{item.table.toUpperCase()} • {item.operation}</span>
                      <span className="text-slate-400 font-mono text-[10px]">ID local: #{item.id}</span>
                    </div>
                    <p className="text-red-600 font-mono text-[11px] break-all">
                      {item.lastError}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeadLetterModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs hover:bg-white transition-all cursor-pointer"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isDiscarding}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white font-bold rounded-lg text-xs transition-all shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDiscarding ? 'Descartando...' : 'Descartar Pendências'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
