/**
 * FIX #14: Tipo centralizado para IDs de turma.
 * 
 * O Supabase usa UUIDs (strings) como primary key.
 * Este tipo garante que todo o sistema use string de forma consistente,
 * evitando bugs de comparação entre string e number.
 */
export type TurmaId = string;

/**
 * Converte qualquer valor de turmaId para o tipo canônico string.
 * Substitui o getTid() em turmaUtils.ts como ponto único de conversão.
 */
export function toTurmaId(id: string | number): TurmaId {
  return String(id);
}
