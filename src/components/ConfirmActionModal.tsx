import React from 'react';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  /** Ícone customizado (padrão: Trash2) */
  icon?: React.ReactNode;
  /** Texto do botão de confirmação (padrão: "Sim, excluir") */
  confirmLabel?: string;
  /** Variante de cor do botão (padrão: "danger") */
  variant?: 'danger' | 'warning';
  /** Mostra spinner no botão de confirmação */
  loading?: boolean;
}

export default function ConfirmActionModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  icon,
  confirmLabel = 'Sim, excluir',
  variant = 'danger',
  loading = false,
}: ConfirmActionModalProps) {
  if (!isOpen) return null;

  const colors = variant === 'danger'
    ? { bg: 'bg-red-100', text: 'text-red-600', btn: 'bg-red-600 hover:bg-red-700' }
    : { bg: 'bg-amber-100', text: 'text-amber-600', btn: 'bg-amber-600 hover:bg-amber-700' };

  const defaultIcon = variant === 'danger'
    ? <Trash2 className="w-6 h-6" />
    : <AlertTriangle className="w-6 h-6" />;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
        <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center mx-auto mb-4 ${colors.text}`}>
          {icon || defaultIcon}
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
        <p className="text-sm text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white ${colors.btn} rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
