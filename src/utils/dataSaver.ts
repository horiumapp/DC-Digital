/**
 * Economia de internet / conexão fraca.
 * Preferência do usuário + dicas do navegador (Save-Data, effectiveType).
 * Não armazena dados sensíveis — só um flag booleano em localStorage.
 */

export const DATA_SAVER_STORAGE_KEY = 'dc_economia_internet';
export const DATA_SAVER_EVENT = 'dc-data-saver-change';

export type ConnectionProfile = 'normal' | 'constrained';

type NetworkInformationLike = {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
  addEventListener?: (type: string, listener: () => void) => void;
  removeEventListener?: (type: string, listener: () => void) => void;
};

function getConnection(): NetworkInformationLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection
    ?? (navigator as Navigator & { mozConnection?: NetworkInformationLike }).mozConnection
    ?? (navigator as Navigator & { webkitConnection?: NetworkInformationLike }).webkitConnection;
}

/** Preferência explícita do usuário (padrão: false). */
export function isEconomyPreferenceEnabled(): boolean {
  try {
    return localStorage.getItem(DATA_SAVER_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setEconomyPreference(enabled: boolean): void {
  try {
    localStorage.setItem(DATA_SAVER_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    /* storage indisponível */
  }
  applyDataSaverDocumentClass();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DATA_SAVER_EVENT, { detail: { enabled } }));
  }
}

/** Conexão limitada detectada pelo browser (quando a API existir). */
export function getConnectionProfile(): ConnectionProfile {
  const conn = getConnection();
  if (!conn) return 'normal';
  if (conn.saveData) return 'constrained';
  const type = (conn.effectiveType || '').toLowerCase();
  if (type === 'slow-2g' || type === '2g') return 'constrained';
  if (type === '3g' && typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < 1) {
    return 'constrained';
  }
  return 'normal';
}

/** Economia efetiva: preferência do usuário OU rede constrangida. */
export function isEconomyModeActive(): boolean {
  return isEconomyPreferenceEnabled() || getConnectionProfile() === 'constrained';
}

/** Reduzir imagens/efeitos não essenciais. */
export function shouldReduceMedia(): boolean {
  return isEconomyModeActive();
}

export function getSyncBatchSize(): number {
  if (isEconomyPreferenceEnabled()) return 40;
  if (getConnectionProfile() === 'constrained') return 80;
  return 200;
}

export function getPingIntervals(): { onlineMs: number; offlineMs: number } {
  if (isEconomyModeActive()) {
    return { onlineMs: 120_000, offlineMs: 30_000 };
  }
  return { onlineMs: 60_000, offlineMs: 15_000 };
}

/** Classe CSS em <html> para reduzir animações e mídia decorativa. */
export function applyDataSaverDocumentClass(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dc-data-saver', shouldReduceMedia());
}

export function subscribeDataSaverChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === DATA_SAVER_STORAGE_KEY) listener();
  };
  const onCustom = () => listener();
  window.addEventListener('storage', onStorage);
  window.addEventListener(DATA_SAVER_EVENT, onCustom);
  const conn = getConnection();
  conn?.addEventListener?.('change', listener);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(DATA_SAVER_EVENT, onCustom);
    conn?.removeEventListener?.('change', listener);
  };
}
