import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary por rota — isola crashes de páginas individuais
 * sem derrubar toda a aplicação. O usuário pode voltar ao início
 * sem precisar recarregar a aba.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[RouteErrorBoundary] Erro capturado na rota:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center p-6 min-h-[60vh]">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 text-center max-w-md w-full">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Erro nesta página
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              Ocorreu um erro ao carregar esta página. As demais funcionalidades do sistema continuam disponíveis.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl text-left text-xs font-mono text-slate-600 dark:text-slate-400 overflow-auto max-h-40 border border-slate-100 dark:border-slate-700">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition active:scale-95"
              >
                Tentar novamente
              </button>
              <Link
                to="/turmas"
                onClick={this.handleReset}
                className="flex-1 px-4 py-3 bg-[#0f2851] text-white font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 active:scale-95 flex items-center justify-center"
              >
                Ir ao Início
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
