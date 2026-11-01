/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}));

describe('sessionGuard', () => {
  beforeEach(() => {
    vi.resetModules();
    rpcMock.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('claimActiveSession grava UUID no localStorage', async () => {
    const id = '11111111-1111-1111-1111-111111111111';
    rpcMock.mockResolvedValue({ data: id, error: null });
    const { claimActiveSession, getLocalSessaoAtivaId, SESSAO_ATIVA_STORAGE_KEY } = await import(
      '../services/sessionGuard'
    );

    const result = await claimActiveSession();
    expect(result).toBe(id);
    expect(getLocalSessaoAtivaId()).toBe(id);
    expect(localStorage.getItem(SESSAO_ATIVA_STORAGE_KEY)).toBe(id);
    expect(rpcMock).toHaveBeenCalledWith('claim_user_session');
  });

  it('claimActiveSession retorna null se a RPC falhar', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { claimActiveSession, getLocalSessaoAtivaId } = await import('../services/sessionGuard');
    expect(await claimActiveSession()).toBeNull();
    expect(getLocalSessaoAtivaId()).toBeNull();
  });

  it('isLocalSessionStillActive detecta carimbo diferente no servidor', async () => {
    localStorage.setItem('dc_sessao_ativa_id', 'local-id');
    rpcMock.mockResolvedValue({ data: 'outro-id', error: null });
    const { isLocalSessionStillActive } = await import('../services/sessionGuard');
    expect(await isLocalSessionStillActive()).toBe(false);
    expect(rpcMock).toHaveBeenCalledWith('get_my_sessao_ativa');
  });

  it('isLocalSessionStillActive aceita o mesmo carimbo', async () => {
    localStorage.setItem('dc_sessao_ativa_id', 'mesmo-id');
    rpcMock.mockResolvedValue({ data: 'mesmo-id', error: null });
    const { isLocalSessionStillActive } = await import('../services/sessionGuard');
    expect(await isLocalSessionStillActive()).toBe(true);
  });

  it('sessionsMatch trata servidor nulo como compatível até o claim', async () => {
    const { sessionsMatch } = await import('../services/sessionGuard');
    expect(sessionsMatch('abc', null)).toBe(true);
    expect(sessionsMatch('abc', 'abc')).toBe(true);
    expect(sessionsMatch('abc', 'xyz')).toBe(false);
    expect(sessionsMatch(null, 'abc')).toBe(false);
  });
});
