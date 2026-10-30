import { useCallback, useRef, useState } from 'react';

/**
 * Impede cliques/submits duplicados enquanto uma operação async está em curso.
 */
export function useAsyncLock() {
  const lockedRef = useRef(false);
  const [locked, setLocked] = useState(false);

  const runLocked = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | undefined> => {
    if (lockedRef.current) return undefined;
    lockedRef.current = true;
    setLocked(true);
    try {
      return await fn();
    } finally {
      lockedRef.current = false;
      setLocked(false);
    }
  }, []);

  return { locked, runLocked };
}
