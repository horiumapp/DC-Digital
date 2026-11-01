/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';

/**
 * Garante que o atalho "Ir para o Login" chama clearAllLocalData —
 * limpar só localStorage apagava dc_last_user_id sem purge do IndexedDB.
 */
describe('LoadingFallback purge order', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    window.confirm = vi.fn(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('chama clearAllLocalData(true, false) ao ir para o login', async () => {
    const clearAllLocalData = vi.fn(async () => undefined);
    vi.doMock('../services/offlineStorage', () => ({ clearAllLocalData }));

    const { default: LoadingFallback } = await import('../components/common/LoadingFallback');
    render(React.createElement(LoadingFallback));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    const btn = screen.getByRole('button', { name: /Ir para o Login/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(window.confirm).toHaveBeenCalled();
    expect(clearAllLocalData).toHaveBeenCalledWith(true, false);
  });
});
