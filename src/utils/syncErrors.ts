/** Erro de sync por revisão alterada em outro dispositivo (não reenviável). */
export function isConflictError(lastError?: string | null): boolean {
  return !!lastError?.includes('CONFLICT');
}
