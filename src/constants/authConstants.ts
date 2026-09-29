import type { UserRole } from '../contexts/AuthContext';

/**
 * Roles com acesso administrativo ao sistema.
 * Centralizado aqui para evitar strings mágicas espalhadas no código.
 */
export const ADMIN_ROLES: UserRole[] = ['ADMIN', 'GESTOR', 'SECRETARIO'];

/**
 * Roles com acesso de leitura a relatórios administrativos.
 */
export const REPORT_ROLES: UserRole[] = ['ADMIN', 'GESTOR', 'SECRETARIO', 'PROFESSOR'];

/**
 * Roles com acesso ao painel de servidores (qualquer role exceto ALUNO).
 */
export const STAFF_ROLES: UserRole[] = ['ADMIN', 'GESTOR', 'SECRETARIO', 'PROFESSOR'];

/**
 * FIX #19: Status de aluno centralizado para evitar strings mágicas.
 * O filtro é case-insensitive para compatibilidade com variações do banco.
 */
export const ALUNO_STATUS_ATIVO = 'ativo';

/**
 * Verifica se o status de um aluno é considerado ativo.
 * Aceita null/undefined (padrão: ativo) e faz comparação case-insensitive.
 */
export function isAlunoAtivo(status: string | null | undefined): boolean {
  return !status || status.toLowerCase() === ALUNO_STATUS_ATIVO;
}
