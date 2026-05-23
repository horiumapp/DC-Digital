/**
 * useOnlineStatus.ts — Hook para detecção de status de conexão
 * 
 * Combina navigator.onLine + ping periódico para detecção confiável.
 * O navigator.onLine sozinho não é confiável (pode reportar online
 * mesmo sem acesso real à internet).
 */
import { useState, useEffect, useCallback, useRef } from 'react';

interface OnlineStatusResult {
  /** Se o dispositivo tem conexão real com a internet */
  isOnline: boolean;
  /** Timestamp do último check bem-sucedido */
  lastCheckedAt: Date | null;
  /** Forçar re-check agora */
  checkNow: () => Promise<boolean>;
}

// Intervalo de ping (ms)
const PING_INTERVAL_ONLINE = 30_000;   // 30s quando online
const PING_INTERVAL_OFFLINE = 10_000;  // 10s quando offline (tenta reconectar mais rápido)
const PING_TIMEOUT = 5_000;            // 5s timeout

/**
 * Faz um ping leve para verificar se realmente tem internet.
 * Usa HEAD request ao Supabase para não consumir dados.
 */
async function pingInternet(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT);
    
    // Ping ao próprio domínio (ou favicon) — funciona mesmo com CORS
    const response = await fetch('/logo.png', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

export function useOnlineStatus(): OnlineStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const checkNow = useCallback(async (): Promise<boolean> => {
    const result = await pingInternet();
    setIsOnline(result);
    setLastCheckedAt(new Date());
    return result;
  }, []);

  useEffect(() => {
    // Listeners do browser
    const handleOnline = () => {
      setIsOnline(true);
      setLastCheckedAt(new Date());
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLastCheckedAt(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check inicial
    checkNow();

    // Ping periódico para validação real
    const startPing = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const interval = isOnline ? PING_INTERVAL_ONLINE : PING_INTERVAL_OFFLINE;
      intervalRef.current = setInterval(checkNow, interval);
    };
    startPing();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline, checkNow]);

  return { isOnline, lastCheckedAt, checkNow };
}
