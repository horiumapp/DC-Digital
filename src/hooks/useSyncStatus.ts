/**
 * useSyncStatus.ts — Hook para monitorar o status da sincronização
 * 
 * Expõe o estado do syncEngine para componentes React.
 */
import { useState, useEffect, useCallback } from 'react';
import * as SyncEngine from '../services/syncEngine';
import { getPendingCount } from '../services/offlineStorage';
import type { SyncQueueItem } from '../lib/db';

export type ConnectionState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'ERROR';

interface SyncStatusResult {
  /** Estado consolidado de conexão + sync */
  connectionState: ConnectionState;
  /** Número de itens pendentes de sincronização */
  pendingCount: number;
  /** Número de itens irrecuperáveis (dead letter) */
  deadLetterCount: number;
  /** Lista de itens irrecuperáveis */
  deadLetterItems: SyncQueueItem[];
  /** Timestamp do último sync completo com sucesso */
  lastSyncAt: Date | null;
  /** Mensagem do último erro */
  lastError: string | null;
  /** Indica se a fila pendente está próxima da capacidade máxima (>= 80% do limite de 5000) */
  isNearCapacity: boolean;
  /** Força sincronização agora */
  syncNow: () => Promise<void>;
  /** Tenta reprocessar itens com erro */
  retryErrors: () => Promise<number>;
  /** Descarta itens irrecuperáveis da dead letter queue */
  discardDeadLetters: () => Promise<void>;
}

import { getDeadLetterItems, discardDeadLetterItems } from '../services/offlineQueue';

export function useSyncStatus(isOnline: boolean): SyncStatusResult {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    isOnline ? 'ONLINE' : 'OFFLINE'
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [deadLetterItems, setDeadLetterItems] = useState<SyncQueueItem[]>([]);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const updateCounts = useCallback(async () => {
    try {
      const [count, deadLetters] = await Promise.all([
        getPendingCount(),
        getDeadLetterItems(),
      ]);
      setPendingCount(count);
      setDeadLetterItems(deadLetters);
    } catch {
      // IndexedDB pode não estar pronto
    }
  }, []);

  // Atualizar contagem no mount
  useEffect(() => {
    updateCounts();
  }, [updateCounts]);

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
          updateCounts();
          break;
        }
        case 'error':
          setLastError(String(data));
          setConnectionState('ERROR');
          break;
        case 'itemSynced':
        case 'itemFailed':
          updateCounts();
          break;
      }
    });

    return unsubscribe;
  }, [isOnline, updateCounts]);

  // Atualizar estado quando mudar o isOnline
  useEffect(() => {
    if (SyncEngine.getState() === 'SYNCING') return; // Não interromper sync em andamento
    setConnectionState(isOnline ? 'ONLINE' : 'OFFLINE');
  }, [isOnline]);

  const syncNow = useCallback(async () => {
    if (!isOnline) return;
    await SyncEngine.syncAll();
  }, [isOnline]);

  const retryErrors = useCallback(async (): Promise<number> => {
    const retriedCount = await SyncEngine.retryErrors();
    // Se itens foram recolocados na fila, limpar o erro enquanto o sync roda
    if (retriedCount > 0) {
      setLastError(null);
      setConnectionState(isOnline ? 'ONLINE' : 'OFFLINE');
    } else {
      // Nenhum item recuperável — verificar se ainda há erros
      await updateCounts();
    }
    return retriedCount;
  }, [isOnline, updateCounts]);

  const discardDeadLetters = useCallback(async () => {
    await discardDeadLetterItems();
    await updateCounts();
  }, [updateCounts]);

  return {
    connectionState,
    pendingCount,
    isNearCapacity: pendingCount >= 4000,
    deadLetterCount: deadLetterItems.length,
    deadLetterItems,
    lastSyncAt,
    lastError,
    syncNow,
    retryErrors,
    discardDeadLetters,
  };
}
