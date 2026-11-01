import { supabase } from '../lib/supabase';

export const SESSAO_ATIVA_STORAGE_KEY = 'dc_sessao_ativa_id';

export function getLocalSessaoAtivaId(): string | null {
  try {
    // localStorage: abas do mesmo navegador compartilham o carimbo (mesmo login).
    return localStorage.getItem(SESSAO_ATIVA_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setLocalSessaoAtivaId(id: string): void {
  try {
    localStorage.setItem(SESSAO_ATIVA_STORAGE_KEY, id);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearLocalSessaoAtivaId(): void {
  try {
    localStorage.removeItem(SESSAO_ATIVA_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Gera e persiste o carimbo de sessão no servidor + localStorage. */
export async function claimActiveSession(): Promise<string | null> {
  const { data, error } = await supabase.rpc('claim_user_session');
  if (error || typeof data !== 'string' || !data) {
    console.warn('[sessionGuard] claim_user_session falhou:', error?.message);
    return null;
  }
  setLocalSessaoAtivaId(data);
  return data;
}

/**
 * @returns true se a sessão local ainda é a ativa no servidor
 * @returns null se não foi possível verificar (offline / erro)
 */
export async function isLocalSessionStillActive(): Promise<boolean | null> {
  const localId = getLocalSessaoAtivaId();
  if (!localId) return null;

  const { data, error } = await supabase.rpc('get_my_sessao_ativa');
  if (error) {
    console.warn('[sessionGuard] get_my_sessao_ativa falhou:', error.message);
    return null;
  }
  // Sem carimbo no servidor ainda: tratar como ativo até o próximo claim.
  if (data == null) return true;
  return data === localId;
}

export function sessionsMatch(localId: string | null, serverId: string | null | undefined): boolean {
  if (!localId) return false;
  if (serverId == null) return true;
  return localId === serverId;
}
