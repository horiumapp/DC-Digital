import { useCallback, useEffect, useId } from 'react';
import { setUnsavedDirty } from '../utils/unsavedChangesStore';

/**
 * Avisa antes de fechar/recarregar a aba e registra dirty no store
 * para o UnsavedNavigationGuard bloquear navegação SPA (React Router).
 *
 * Retorna `clearDirty` para limpar o store de forma síncrona antes de
 * um navigate intencional após gravar (setState sozinho não atualiza o
 * store a tempo do useBlocker).
 */
export function useUnsavedChangesWarning(isDirty: boolean): () => void {
  const autoKey = useId();

  useEffect(() => {
    setUnsavedDirty(autoKey, isDirty);
    return () => setUnsavedDirty(autoKey, false);
  }, [autoKey, isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  return useCallback(() => {
    setUnsavedDirty(autoKey, false);
  }, [autoKey]);
}
