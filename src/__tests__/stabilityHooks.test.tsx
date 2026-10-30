/** @vitest-environment happy-dom */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act, screen, fireEvent, cleanup } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Link } from 'react-router-dom';
import { useAsyncLock } from '../hooks/useAsyncLock';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import UnsavedNavigationGuard from '../components/UnsavedNavigationGuard';
import {
  hasUnsavedChanges,
  resetUnsavedChangesStore,
  setUnsavedDirty,
} from '../utils/unsavedChangesStore';

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
    resetUnsavedChangesStore();
    vi.spyOn(window, 'addEventListener');
    vi.spyOn(window, 'removeEventListener');
  });
  afterEach(() => {
    vi.restoreAllMocks();
    resetUnsavedChangesStore();
  });

  it('registra beforeunload e marca o store apenas quando dirty', () => {
    const { rerender, unmount } = renderHook(
      ({ dirty }) => useUnsavedChangesWarning(dirty),
      { initialProps: { dirty: false } }
    );
    expect(window.addEventListener).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(hasUnsavedChanges()).toBe(false);

    rerender({ dirty: true });
    expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(hasUnsavedChanges()).toBe(true);

    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    expect(hasUnsavedChanges()).toBe(false);
  });
});

describe('UnsavedNavigationGuard', () => {
  afterEach(() => {
    cleanup();
    resetUnsavedChangesStore();
  });

  it('bloqueia navegação SPA e permite confirmar saída', async () => {
    setUnsavedDirty('test-form', true);

    const router = createMemoryRouter(
      [
        {
          element: <UnsavedNavigationGuard />,
          children: [
            {
              path: '/frequencia',
              element: (
                <div>
                  <span>Frequência</span>
                  <Link to="/turmas">Trocar turma</Link>
                </div>
              ),
            },
            { path: '/turmas', element: <div>Lista de turmas</div> },
          ],
        },
      ],
      { initialEntries: ['/frequencia'] },
    );

    render(<RouterProvider router={router} />);
    expect(screen.getByText('Frequência')).toBeTruthy();

    fireEvent.click(screen.getByText('Trocar turma'));
    expect(await screen.findByText('Alterações não salvas')).toBeTruthy();
    expect(screen.queryByText('Lista de turmas')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Alterações não salvas')).toBeNull();
    expect(screen.getByText('Frequência')).toBeTruthy();

    fireEvent.click(screen.getByText('Trocar turma'));
    fireEvent.click(await screen.findByRole('button', { name: 'Sair sem gravar' }));
    expect(await screen.findByText('Lista de turmas')).toBeTruthy();
  });
});

describe('isConflictError', () => {
  it('distingue conflito de erro permanente', async () => {
    const { isConflictError } = await import('../utils/syncErrors');
    expect(isConflictError('CONFLICT: 1 registro(s) alterados em outro dispositivo')).toBe(true);
    expect(isConflictError('[DEAD_LETTER] permissão negada')).toBe(false);
    expect(isConflictError(null)).toBe(false);
  });
});
