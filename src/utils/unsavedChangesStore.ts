/**
 * Registry leve de formulários com alterações não salvas.
 * Permite ao UnsavedNavigationGuard bloquear navegação SPA
 * sem acoplar useBlocker a cada aba do diário.
 */

const dirtyKeys = new Set<string>();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function setUnsavedDirty(key: string, dirty: boolean): void {
  const before = dirtyKeys.size;
  if (dirty) dirtyKeys.add(key);
  else dirtyKeys.delete(key);
  if (dirtyKeys.size !== before) notify();
}

export function hasUnsavedChanges(): boolean {
  return dirtyKeys.size > 0;
}

export function subscribeUnsavedChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Apenas para testes */
export function resetUnsavedChangesStore(): void {
  dirtyKeys.clear();
  notify();
}
