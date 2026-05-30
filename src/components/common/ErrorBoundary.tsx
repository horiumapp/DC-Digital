import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Erro capturado:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 text-center max-w-md w-full">
            <div className="text-6xl font-black text-rose-500 mb-4">Oops!</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Algo deu errado</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Ocorreu um erro inesperado no aplicativo. Tente recarregar a página ou voltar para o início.
            </p>
            {this.state.error && (
              <pre className="mb-6 p-4 bg-slate-50 rounded-xl text-left text-xs font-mono text-slate-600 overflow-auto max-h-40 border border-slate-100">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 w-full px-6 py-3.5 bg-[#0f2851] text-white font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 active:scale-95"
            >
              Recarregar e Ir para o Início
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
