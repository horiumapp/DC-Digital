import { useEffect } from 'react';

/**
 * Avisa antes de fechar/recarregar a aba quando há alterações não salvas.
 * Não cobre navegação SPA (React Router) — apenas beforeunload.
 */
export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);
}
