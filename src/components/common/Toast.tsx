import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

// ============================================================
// Tipos
// ============================================================
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

// ============================================================
// Contexto
// ============================================================
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ============================================================
// Ícones por tipo
// ============================================================
const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 flex-shrink-0" />,
  error: <XCircle className="w-5 h-5 flex-shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 flex-shrink-0" />,
  info: <Info className="w-5 h-5 flex-shrink-0" />,
};

// ============================================================
// Estilos por tipo
// ============================================================
const STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-600 text-white border-emerald-700',
  error: 'bg-red-600 text-white border-red-700',
  warning: 'bg-amber-500 text-white border-amber-600',
  info: 'bg-blue-600 text-white border-blue-700',
};

// ============================================================
// Componente individual de Toast
// ============================================================
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg
        text-sm font-medium max-w-sm w-full pointer-events-auto
        animate-[slideIn_0.3s_ease-out]
        ${STYLES[toast.type]}
      `}
      role="alert"
    >
      <span className="mt-0.5">{ICONS[toast.type]}</span>
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-1 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================
// Provider
// ============================================================
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: Toast = { id, type, message, duration };

    setToasts(prev => [...prev.slice(-4), newToast]); // máximo de 5 toasts simultâneos

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const showError   = useCallback((message: string) => showToast(message, 'error', 6000), [showToast]);
  const showWarning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const showInfo    = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
      {children}

      {/* Container de Toasts */}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notificações do sistema"
      >
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================
export function useToast(): ToastContextType {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
}
