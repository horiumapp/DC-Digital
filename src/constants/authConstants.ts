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
