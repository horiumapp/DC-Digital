/**
 * OfflineContext.tsx — Provider global para funcionalidade offline-first
 * 
 * Inicializa o sistema de sincronização, monitora conexão,
 * e dispara sync automático quando a internet volta.
 */
import React, { createContext, useContext, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSyncStatus, type ConnectionState } from '../hooks/useSyncStatus';
import * as SyncEngine from '../services/syncEngine';
import { clearAllLocalData, clearOldSyncedData, getStorageEstimate } from '../services/offlineStorage';

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
  /** Último sync bem-sucedido */
  lastSyncAt: Date | null;
  /** Último erro de sync */
  lastError: string | null;
  /** Forçar sincronização agora */
  syncNow: () => Promise<void>;
  /** Tentar novamente itens com erro */
  retryErrors: () => Promise<void>;
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
    lastSyncAt,
    lastError,
    syncNow,
    retryErrors,
  } = useSyncStatus(isOnline);

  const wasOffline = useRef(false);

  // Auto-sync quando volta a ficar online
  useEffect(() => {
    if (isOnline && wasOffline.current) {
      console.log('[OfflineProvider] Internet restaurada — iniciando sincronização...');
      SyncEngine.scheduleSync();
    }
    wasOffline.current = !isOnline;
  }, [isOnline]);

  // Limpeza periódica de dados antigos (a cada 24h)
  useEffect(() => {
    const cleanup = async () => {
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
      } catch (err) {
        console.error('[OfflineProvider] Erro na limpeza:', err);
      }
    };

    cleanup(); // Rodar na inicialização
    const interval = setInterval(cleanup, 24 * 60 * 60 * 1000); // 24h
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
        lastSyncAt,
        lastError,
        syncNow,
        retryErrors,
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
