/**
 * useSyncStatus.ts — Hook para monitorar o status da sincronização
 * 
 * Expõe o estado do syncEngine para componentes React.
 */
import { useState, useEffect, useCallback } from 'react';
import * as SyncEngine from '../services/syncEngine';
import { getPendingCount } from '../services/offlineStorage';

export type ConnectionState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';

interface SyncStatusResult {
  /** Estado consolidado de conexão + sync */
  connectionState: ConnectionState;
  /** Número de itens pendentes de sincronização */
  pendingCount: number;
  /** Timestamp do último sync completo com sucesso */
  lastSyncAt: Date | null;
  /** Mensagem do último erro */
  lastError: string | null;
  /** Força sincronização agora */
  syncNow: () => Promise<void>;
  /** Tenta reprocessar itens com erro */
  retryErrors: () => Promise<void>;
}

export function useSyncStatus(isOnline: boolean): SyncStatusResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    isOnline ? 'ONLINE' : 'OFFLINE'
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Atualizar contagem de pendentes periodicamente
  useEffect(() => {
    const updatePending = async () => {
      try {
        const count = await getPendingCount();
        setPendingCount(count);
      } catch {
        // IndexedDB pode não estar pronto
      }
    };

    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  // Escutar eventos do SyncEngine
  useEffect(() => {
    const unsubscribe = SyncEngine.subscribe((event, data) => {
      switch (event) {
        case 'stateChange': {
          const engineState = data as SyncEngine.SyncState;
          if (engineState === 'SYNCING') {
            setConnectionState('SYNCING');
          } else if (engineState === 'ERROR') {
            setConnectionState('ERROR');
          } else {
            setConnectionState(isOnline ? 'ONLINE' : 'OFFLINE');
          }
          break;
        }
        case 'complete': {
          const result = data as SyncEngine.SyncResult;
          setLastSyncAt(new Date());
          if (result.failed > 0) {
            setLastError(`${result.failed} item(ns) falharam`);
            setConnectionState('ERROR');
          } else {
            setLastError(null);
            setConnectionState(isOnline ? 'ONLINE' : 'OFFLINE');
          }
          // Atualizar contagem
          getPendingCount().then(setPendingCount).catch(() => {});
          break;
        }
        case 'error':
          setLastError(String(data));
          setConnectionState('ERROR');
          break;
        case 'itemSynced':
          getPendingCount().then(setPendingCount).catch(() => {});
          break;
      }
    });

    return unsubscribe;
  }, [isOnline]);

  // Atualizar estado quando mudar o isOnline
  useEffect(() => {
    if (SyncEngine.getState() === 'SYNCING') return; // Não interromper sync em andamento
    setConnectionState(isOnline ? 'ONLINE' : 'OFFLINE');
  }, [isOnline]);

  const syncNow = useCallback(async () => {
    if (!isOnline) return;
    await SyncEngine.syncAll();
  }, [isOnline]);

  const retryErrors = useCallback(async () => {
    await SyncEngine.retryErrors();
  }, []);

  return {
    connectionState,
    pendingCount,
    lastSyncAt,
    lastError,
    syncNow,
    retryErrors,
  };
}
