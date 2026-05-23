/**
 * ConnectionStatus.tsx — Indicador visual de status de conexão
 * 
 * Barra fixa que mostra o estado atual: ONLINE, OFFLINE, SYNCING, ERROR.
 * Integra com o OfflineContext para dados em tempo real.
 */
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertCircle, CloudOff, Check } from 'lucide-react';
import { useOffline } from '../../contexts/OfflineContext';

export default function ConnectionStatus() {
  const { connectionState, pendingCount, lastError, syncNow, retryErrors } = useOffline();
  const [visible, setVisible] = useState(false);
  const [showOnlineBrief, setShowOnlineBrief] = useState(false);

  useEffect(() => {
    if (connectionState === 'OFFLINE' || connectionState === 'SYNCING' || connectionState === 'ERROR') {
      setVisible(true);
      setShowOnlineBrief(false);
    } else if (connectionState === 'ONLINE') {
      // Mostrar brevemente "Conectado" e depois esconder
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
  }, [connectionState]);

  if (!visible) return null;

  const configs = {
    ONLINE: {
      bg: 'bg-emerald-500/90',
      icon: <Check className="w-4 h-4" />,
      text: pendingCount > 0 ? `Conectado • ${pendingCount} pendente(s)` : 'Conectado',
      action: pendingCount > 0 ? (
        <button
          onClick={syncNow}
          className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-xs font-semibold hover:bg-white/30 transition-colors"
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
        <button
          onClick={retryErrors}
          className="ml-2 px-2 py-0.5 bg-white/20 rounded-md text-xs font-semibold hover:bg-white/30 transition-colors"
        >
          Tentar novamente
        </button>
      ),
    },
  };

  const config = configs[connectionState] || configs.OFFLINE;

  return (
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
          className="ml-2 opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Fechar"
        >
          ✕
        </button>
      )}
    </div>
  );
}
