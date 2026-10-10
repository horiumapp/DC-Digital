/** Avaliação principal não tem vínculo. null do IndexedDB não pode virar o texto "null". */
export function parentIdVinculado(parentId: unknown): string | undefined {
  if (parentId === undefined || parentId === null) return undefined;
  const value = String(parentId).trim();
  if (!value || value === 'null' || value === 'undefined') return undefined;
  return value;
}
