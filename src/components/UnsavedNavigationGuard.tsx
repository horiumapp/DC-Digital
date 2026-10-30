import { useCallback, useSyncExternalStore } from 'react';
import { Outlet, useBlocker } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import ConfirmActionModal from './ConfirmActionModal';
import {
  hasUnsavedChanges,
  subscribeUnsavedChanges,
} from '../utils/unsavedChangesStore';

/**
 * Bloqueia navegação SPA enquanto houver lançamentos não salvos.
 * Requer data router (createBrowserRouter / createMemoryRouter).
 */
export default function UnsavedNavigationGuard() {
  const isDirty = useSyncExternalStore(
    subscribeUnsavedChanges,
    hasUnsavedChanges,
    () => false,
  );

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search),
  );

  const handleStay = useCallback(() => {
    if (blocker.state === 'blocked') blocker.reset();
  }, [blocker]);

  const handleLeave = useCallback(() => {
    if (blocker.state === 'blocked') blocker.proceed();
  }, [blocker]);

  return (
    <>
      <Outlet />
      <ConfirmActionModal
        isOpen={blocker.state === 'blocked'}
        onClose={handleStay}
        onConfirm={handleLeave}
        title="Alterações não salvas"
        message="Há lançamentos em andamento que ainda não foram gravados. Se sair agora, essas alterações serão perdidas."
        icon={<AlertTriangle className="w-6 h-6" />}
        confirmLabel="Sair sem gravar"
        variant="warning"
      />
    </>
  );
}
