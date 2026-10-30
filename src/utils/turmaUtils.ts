/**
 * turmaUtils.ts — Funções utilitárias comuns para gerenciamento de turmas
 */

export const getTid = (turmaId: string | number): string => 
  turmaId.toString().split('||')[0];

/**
 * Normaliza data para o formato ISO YYYY-MM-DD.
 * Aceita DD/MM/YYYY ou YYYY-MM-DD como entrada.
 * Garante consistência dos dados gravados no banco.
 */
export const normalizarDataISO = (data: string): string => {
  if (!data) return data;
  // Já está em ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  // Converte DD/MM/YYYY -> YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [d, m, y] = data.split('/');
    return `${y}-${m}-${d}`;
  }
  return data;
};
