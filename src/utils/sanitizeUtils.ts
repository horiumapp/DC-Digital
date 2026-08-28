/**
 * sanitizeUtils.ts — Utilitários de sanitização e segurança de dados
 * 
 * Protege contra CSV/Formula Injection (DDE) em exportações para Excel/Calc (SEC-05 / Issue 4).
 */

/**
 * Sanitiza recursivamente valores contra injeção de fórmulas de planilhas.
 * Se uma string iniciar com '=', '+', '-', '@', '\\t' ou '\\r', ela é prefixada com apóstrofo (').
 */
export function sanitizeFormulaValue<T>(value: T): T {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${value}` as unknown as T;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => sanitizeFormulaValue(item)) as unknown as T;
  }

  if (value !== null && typeof value === 'object') {
    const sanitizedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      sanitizedObj[k] = sanitizeFormulaValue(v);
    }
    return sanitizedObj as unknown as T;
  }

  return value;
}
