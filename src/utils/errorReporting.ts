/**
 * errorReporting.ts — Módulo de telemetria de erros em produção
 *
 * FIX A4: Sentry ativado com guard na variável VITE_SENTRY_DSN.
 * Se a variável não estiver definida, o módulo funciona em modo silencioso
 * (apenas console.error em dev, sem envio para servidor externo).
 *
 * Para habilitar o Sentry:
 * - Adicionar VITE_SENTRY_DSN=https://... ao seu .env (já configurado ✅)
 * - O pacote @sentry/react já está instalado ✅
 */

import * as Sentry from '@sentry/react';

// ============================================================
// Inicialização do Sentry (ativado apenas em produção com DSN definido)
// ============================================================
let sentryInitialized = false;

if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN as string,
    environment: 'production',
    // LGPD: Remover dados pessoais do usuário antes de enviar
    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }
      return event;
    },
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    // 10% das transações para monitoramento de performance (baixo custo de quota)
    tracesSampleRate: 0.1,
  });
  sentryInitialized = true;
  console.info('[ErrorReporting] Sentry inicializado em modo produção.');
}

export interface ErrorReport {
  error: Error;
  errorInfo?: { componentStack?: string | null };
  context?: Record<string, unknown>;
}

/**
 * Reporta um erro crítico capturado (ex: ErrorBoundary).
 * Em produção com Sentry configurado, envia para o dashboard.
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

  // FIX A4: Enviar para Sentry se inicializado
  if (sentryInitialized) {
    Sentry.captureException(error, {
      extra: { ...errorInfo, ...context },
    });
  }
}

/**
 * Registra um evento de diagnóstico não-crítico.
 */
export function reportWarning(message: string, context?: Record<string, unknown>): void {
  if (import.meta.env.DEV) {
    console.warn('[ErrorReporting]', message, context);
    return;
  }
  // FIX A4: Enviar warning para Sentry se inicializado
  if (sentryInitialized) {
    Sentry.captureMessage(message, { level: 'warning', extra: context });
  }
}
