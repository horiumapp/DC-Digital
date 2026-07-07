/**
 * network.ts — Utilitários de verificação de conectividade
 *
 * Centraliza a lógica de ping para detecção confiável de internet.
 * Usado por: useOnlineStatus, AuthContext, syncEngine.
 */

const PING_TIMEOUT = 5_000; // 5s timeout

/**
 * Verifica se há conectividade real com a internet fazendo um HEAD request
 * para /ping.txt (arquivo estático em public/).
 *
 * `navigator.onLine` sozinho NÃO é confiável — pode retornar true
 * em Wi-Fi sem rota, portais captive, etc.
 */
export async function pingInternet(timeoutMs: number = PING_TIMEOUT): Promise<boolean> {
  // Curto-circuito: se o browser já sabe que está offline, não precisa pingar
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('/ping.txt', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok; // Apenas 200-299 (rejeita 403 de portal captive, etc.)
  } catch {
    return false;
  }
}
