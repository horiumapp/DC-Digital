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

/**
 * FIX P1-#5: Verifica se o Supabase está acessível fazendo HEAD request ao endpoint REST.
 * pingInternet() verifica internet genérica (pode estar ok mesmo se Supabase estiver fora).
 * Use antes de iniciar ciclos de sync para evitar desperdício de retries.
 */
export async function pingSupabase(timeoutMs: number = PING_TIMEOUT): Promise<boolean> {
  if (!navigator.onLine) return false;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    if (!supabaseUrl) {
      console.warn('[network] VITE_SUPABASE_URL não configurada — pulando ping Supabase');
      return true; // Não bloquear sync se config estiver faltando
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Pingar a raiz do projeto Supabase com mode: 'no-cors'.
    // Respostas opacas (status 0) são esperadas — se o fetch completar
    // sem lançar exceção, o servidor está acessível.
    await fetch(supabaseUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return true; // Fetch completou sem erro = servidor acessível
  } catch {
    return false;
  }
}

