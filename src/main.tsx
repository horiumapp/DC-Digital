import {StrictMode, useState, useCallback, useEffect, useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {useRegisterSW} from 'virtual:pwa-register/react';
import App from './App.tsx';
import './index.css';
import SWUpdatePrompt from './components/common/SWUpdatePrompt';
import InstallPrompt from './components/common/InstallPrompt';

function Root() {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const swIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log('[SW] Registrado:', swUrl);
      // Verificar atualizações a cada 60 minutos
      if (registration) {
        // FIX: Limpar interval anterior antes de criar novo (evita acúmulo se chamado múltiplas vezes)
        if (swIntervalRef.current) clearInterval(swIntervalRef.current);
        swIntervalRef.current = setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('[SW] Erro no registro:', error);
    },
    onNeedRefresh() {
      console.log('[SW] Nova versão disponível');
      setShowUpdatePrompt(true);
    },
    onOfflineReady() {
      console.log('[SW] App pronto para uso offline');
    },
  });

  // Limpar interval do SW check ao desmontar
  useEffect(() => {
    return () => {
      if (swIntervalRef.current) {
        clearInterval(swIntervalRef.current);
      }
    };
  }, []);

  const handleUpdate = useCallback(() => {
    setShowUpdatePrompt(false);
    updateServiceWorker(true); // true = reload
  }, [updateServiceWorker]);

  const handleDismissUpdate = useCallback(() => {
    setShowUpdatePrompt(false);
  }, []);

  return (
    <StrictMode>
      <App />
      <InstallPrompt />
      {showUpdatePrompt && (
        <SWUpdatePrompt
          onUpdate={handleUpdate}
          onDismiss={handleDismissUpdate}
        />
      )}
    </StrictMode>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
