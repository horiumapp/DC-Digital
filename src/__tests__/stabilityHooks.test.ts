/** @vitest-environment happy-dom */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncLock } from '../hooks/useAsyncLock';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';

describe('useAsyncLock', () => {
  it('impede execução concorrente enquanto a primeira não termina', async () => {
    const { result } = renderHook(() => useAsyncLock());
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });

    let firstStarted = false;
    let secondRan = false;

    const first = result.current.runLocked(async () => {
      firstStarted = true;
      await gate;
      return 'ok';
    });

    await act(async () => {
      await Promise.resolve();
    });
    expect(firstStarted).toBe(true);
    expect(result.current.locked).toBe(true);

    const second = await result.current.runLocked(async () => {
      secondRan = true;
      return 'skip';
    });
    expect(second).toBeUndefined();
    expect(secondRan).toBe(false);

    await act(async () => {
      release();
      await first;
    });
    expect(result.current.locked).toBe(false);
  });
});

describe('useUnsavedChangesWarning', () => {
  beforeEach(() => {
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registra beforeunload apenas quando dirty', () => {
    const { rerender, unmount } = renderHook(
      ({ dirty }) => useUnsavedChangesWarning(dirty),
      { initialProps: { dirty: false } }
    );
    expect(window.addEventListener).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));

    rerender({ dirty: true });
    expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));

    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
