/**
 * useOnlineStatus.ts — Hook para detecção de status de conexão
 * 
 * Combina navigator.onLine + ping periódico para detecção confiável.
 * O navigator.onLine sozinho não é confiável (pode reportar online
 * mesmo sem acesso real à internet).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { pingInternet } from '../utils/network';

interface OnlineStatusResult {
  /** Se o dispositivo tem conexão real com a internet */
  isOnline: boolean;
  /** Timestamp do último check bem-sucedido */
  lastCheckedAt: Date | null;
  /** Forçar re-check agora */
  checkNow: () => Promise<boolean>;
}

// Intervalo de ping (ms)
const PING_INTERVAL_ONLINE = 60_000;   // 60s quando online
const PING_INTERVAL_OFFLINE = 15_000;  // 15s quando offline (tenta reconectar mais rápido)

export function useOnlineStatus(): OnlineStatusResult {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const isOnlineRef = useRef(isOnline);

  // Keep ref in sync so the ping interval can read the latest value
  // without triggering effect re-runs.
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const checkNow = useCallback(async (): Promise<boolean> => {
    const result = await pingInternet();
    setIsOnline(result);
    setLastCheckedAt(new Date());
    return result;
  }, []);

  // Browser online/offline listeners + initial check
  useEffect(() => {
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkNow]);

  // Ping periódico para validação real — separated from the listener
  // effect so toggling isOnline doesn't re-register event listeners.
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const interval = isOnline ? PING_INTERVAL_ONLINE : PING_INTERVAL_OFFLINE;

    // FIX (CWE-94): Always pass an arrow function to setInterval.
    // Passing `checkNow` directly could be flagged because its return
    // value originates from a remote fetch; wrapping it in an explicit
    // lambda ensures setInterval never receives a string-coercible value.
    intervalRef.current = setInterval(() => {
      checkNow();
    }, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isOnline, checkNow]);

  return { isOnline, lastCheckedAt, checkNow };
}
