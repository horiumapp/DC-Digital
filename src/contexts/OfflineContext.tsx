/**
 * OfflineContext.tsx — Provider global para funcionalidade offline-first
 * 
 * Inicializa o sistema de sincronização, monitora conexão,
 * e dispara sync automático quando a internet volta.
 */
import React, { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import type { SyncQueueItem } from '../lib/db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSyncStatus, type ConnectionState } from '../hooks/useSyncStatus';
import * as SyncEngine from '../services/syncEngine';
import { clearAllLocalData, clearOldSyncedData, getStorageEstimate } from '../services/offlineStorage';
import { setOnlineStatus } from '../services/turmaServiceOffline';

// ============================================================
// Tipos
// ============================================================

interface OfflineContextType {
  /** Se o dispositivo está online */
  isOnline: boolean;
  /** Estado consolidado: ONLINE | OFFLINE | SYNCING | ERROR */
  connectionState: ConnectionState;
  /** Número de itens pendentes de sincronização */
  pendingCount: number;
  /** Número de itens na Dead Letter Queue */
  deadLetterCount: number;
  /** Lista de itens na Dead Letter Queue */
  deadLetterItems: SyncQueueItem[];
  /** Último sync bem-sucedido */
  lastSyncAt: Date | null;
  /** Último erro de sync */
  lastError: string | null;
  /** Forçar sincronização agora */
  syncNow: () => Promise<void>;
  /** Tentar novamente itens com erro */
  retryErrors: () => Promise<void>;
  /** Descartar itens mortos da fila */
  discardDeadLetters: () => Promise<void>;
  /** Limpar todos os dados locais (usado no logout) */
  clearLocalData: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

// ============================================================
// Provider
// ============================================================

export function OfflineProvider({ children }: { children: ReactNode }) {
  const { isOnline } = useOnlineStatus();
  const {
    connectionState,
    pendingCount,
    deadLetterCount,
    deadLetterItems,
    lastSyncAt,
    lastError,
    syncNow,
    retryErrors,
    discardDeadLetters,
  } = useSyncStatus(isOnline);

  const wasOffline = useRef(false);

  // Propaga status online para turmaServiceOffline
  useEffect(() => {
    setOnlineStatus(isOnline);
  }, [isOnline]);

  // Auto-sync quando volta a ficar online
  useEffect(() => {
    if (isOnline && wasOffline.current) {
      console.log('[OfflineProvider] Internet restaurada — iniciando sincronização...');
      SyncEngine.scheduleSync();
    }
    wasOffline.current = !isOnline;
  }, [isOnline]);

  // FIX #7: Limpeza periódica com localStorage para rastrear último cleanup.
  useEffect(() => {
    const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h
    const RECHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // Re-check a cada 4h
    const STORAGE_KEY = 'dc_digital_last_cleanup';

    const cleanup = async () => {
      const lastCleanup = localStorage.getItem(STORAGE_KEY);
      const lastCleanupTime = lastCleanup ? parseInt(lastCleanup, 10) : 0;
      const elapsed = Date.now() - lastCleanupTime;

      if (elapsed < CLEANUP_INTERVAL_MS) {
        return; // Ainda não passou tempo suficiente
      }

      try {
        const deleted = await clearOldSyncedData(60);
        if (deleted > 0) {
          console.log(`[OfflineProvider] Limpeza: ${deleted} registros antigos removidos`);
        }

        // Verificar uso de armazenamento
        const estimate = await getStorageEstimate();
        if (estimate.percentUsed > 80) {
          console.warn(`[OfflineProvider] Armazenamento em ${estimate.percentUsed.toFixed(1)}% — considere limpar dados`);
        }

        localStorage.setItem(STORAGE_KEY, Date.now().toString());
      } catch (err) {
        console.error('[OfflineProvider] Erro na limpeza:', err);
      }
    };

    cleanup(); // Rodar na inicialização
    const interval = setInterval(cleanup, RECHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const clearLocalData = useCallback(async () => {
    try {
      await clearAllLocalData();
      console.log('[OfflineProvider] Dados locais limpos');
    } catch (err) {
      console.error('[OfflineProvider] Erro ao limpar dados locais:', err);
    }
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        connectionState,
        pendingCount,
        deadLetterCount,
        deadLetterItems,
        lastSyncAt,
        lastError,
        syncNow,
        retryErrors,
        discardDeadLetters,
        clearLocalData,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useOffline(): OfflineContextType {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline deve ser usado dentro de um OfflineProvider');
  }
  return context;
}
