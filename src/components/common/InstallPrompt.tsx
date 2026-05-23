/**
 * InstallPrompt.tsx — Banner de instalação customizado do PWA
 * 
 * Captura o evento beforeinstallprompt para exibir um banner personalizado.
 * No iOS (que não suporta o evento), mostra instruções manuais.
 * Respeita a decisão do usuário por 30 dias.
 */
import { useState, useEffect, useCallback } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISS_KEY = 'dc-digital-install-dismissed';
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);
}

function wasDismissedRecently(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const dismissedAt = parseInt(dismissed, 10);
  return Date.now() - dismissedAt < DISMISS_DURATION_MS;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Não mostrar se já está instalado ou foi dispensado recentemente
    if (isStandalone() || wasDismissedRecently()) return;

    // Android/Chrome — capturar evento nativo
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS — mostrar instruções manuais após 10s
    if (isIOS()) {
      const timer = setTimeout(() => {
        setShowIOSPrompt(true);
        setVisible(true);
      }, 10_000);
      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        clearTimeout(timer);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setVisible(false);
    setDeferredPrompt(null);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-4 right-4 sm:left-6 sm:right-6 z-[9997]
        bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700
        p-5 animate-[slideIn_0.3s_ease-out] max-w-md mx-auto"
      role="alert"
      id="install-prompt"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#eef2ff] dark:bg-blue-900/30 flex items-center justify-center">
          <img src="/icons/icon-96x96.png" alt="DC Digital" className="w-8 h-8 rounded-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
            Instale o Diário Digital
          </h3>
          {showIOSPrompt ? (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              <p className="flex items-center gap-1 mb-1">
                Toque em <Share className="w-3.5 h-3.5 inline text-blue-500" /> e depois em
              </p>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                "Adicionar à Tela Inicial"
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Use como aplicativo no seu celular. Funciona offline!
            </p>
          )}
          
          {!showIOSPrompt && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0f2851] text-white text-xs font-bold rounded-lg
                  hover:bg-[#1a3a6d] transition-colors shadow-sm active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg
                  hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              >
                Agora não
              </button>
            </div>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Tipo global para beforeinstallprompt
// ============================================================
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}
