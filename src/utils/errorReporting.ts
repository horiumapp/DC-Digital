/**
 * errorReporting.ts — Módulo de telemetria de erros em produção
 *
 * FIX #20: Centralizar o reporte de erros para facilitar integração
 * futura com Sentry ou similar. Atualmente usa console.error como fallback.
 *
 * Para habilitar o Sentry:
 * 1. npm install @sentry/react
 * 2. Adicionar VITE_SENTRY_DSN ao .env.example e .env
 * 3. Descomentar o bloco de inicialização abaixo
 */

// ============================================================
// Inicialização do Sentry (descomentar quando a conta estiver configurada)
// ============================================================
//
// import * as Sentry from '@sentry/react';
//
// if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
//   Sentry.init({
//     dsn: import.meta.env.VITE_SENTRY_DSN,
//     environment: 'production',
//     // Não enviar dados pessoais automaticamente
//     beforeSend(event) {
//       // Remover dados de usuário sensíveis
//       if (event.user) {
//         delete event.user.email;
//         delete event.user.username;
//       }
//       return event;
//     },
//     integrations: [
//       Sentry.browserTracingIntegration(),
//     ],
//     tracesSampleRate: 0.1, // 10% das transações para performance
//   });
// }

export interface ErrorReport {
  error: Error;
  errorInfo?: { componentStack?: string | null };
  context?: Record<string, unknown>;
}

/**
 * Reporta um erro crítico capturado (ex: ErrorBoundary).
 * Em produção, envia para o serviço de monitoramento configurado.
 * Em desenvolvimento, apenas loga no console.
 */
export function reportError(report: ErrorReport): void {
  const { error, errorInfo, context } = report;

  // Em desenvolvimento: log detalhado
  if (import.meta.env.DEV) {
    console.group('[ErrorReporting] Erro capturado');
    console.error('Erro:', error);
    if (errorInfo?.componentStack) {
      console.error('Component Stack:', errorInfo.componentStack);
    }
    if (context) {
      console.error('Contexto:', context);
    }
    console.groupEnd();
    return;
  }

  // Em produção: log mínimo (não expor stack trace ao usuário)
  console.error('[ErrorReporting] Erro crítico:', error.message);

  // Placeholder para integração futura com Sentry:
  // Sentry.captureException(error, { extra: { ...errorInfo, ...context } });

  // Placeholder para integração futura com outras ferramentas (Datadog, New Relic, etc.)
}

/**
 * Registra um evento de diagnóstico não-crítico.
 */
export function reportWarning(message: string, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.warn('[ErrorReporting]', message, context);
  }
  // Sentry.captureMessage(message, { level: 'warning', extra: context });
}
