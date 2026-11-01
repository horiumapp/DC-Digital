import { describe, it, expect } from 'vitest';

/**
 * Testes para as regras de autorização de escrita do GESTOR/SECRETARIO e reabertura de bimestres (SEC-03 e SEC-04 / Issue 3).
 * Reflete com precisão o comportamento das funções SQL p_escola_permitida e p_acesso_por_turma implementadas no PostgreSQL.
 */

interface UserContext {
  role: 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR' | 'ALUNO';
  escola_id?: string;
}

interface Turma {
  id: string;
  escola_id: string;
  nome: string;
}

// Simula p_escola_permitida após 20261009000000 (GESTOR escolar; rede = ADMIN/GESTOR_SEMEC).
function p_escola_permitida(user: UserContext, targetEscolaId: string): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'GESTOR' || user.role === 'SECRETARIO') {
    return !!user.escola_id && user.escola_id === targetEscolaId;
  }
  return false;
}

function _p_acesso_por_turma(user: UserContext, targetTurma: Turma): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'GESTOR' || user.role === 'SECRETARIO') {
    return !!user.escola_id && user.escola_id === targetTurma.escola_id;
  }
  return false;
}

// Simula a política RLS staff_delete_fechamentos em fechamentos_bimestres (Migration 20260909000022)
function canReopenBimestre(user: UserContext, turma: Turma): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'GESTOR' || user.role === 'SECRETARIO') {
    return !!user.escola_id && user.escola_id === turma.escola_id;
  }
  return false;
}

describe('Regras de Escrita Sistêmica do GESTOR (SEC-03)', () => {
  const escola1 = 'escola-norte-1';
  const escola2 = 'escola-sul-2';

  const gestorEscola1: UserContext = {
    role: 'GESTOR',
    escola_id: escola1,
  };

  const secretarioEscola1: UserContext = {
    role: 'SECRETARIO',
    escola_id: escola1,
  };

  const professor: UserContext = {
    role: 'PROFESSOR',
    escola_id: escola1,
  };

  const aluno: UserContext = {
    role: 'ALUNO',
    escola_id: escola1,
  };

  it('GESTOR deve ter permissão apenas na escola vinculada (não é escopo de rede)', () => {
    expect(p_escola_permitida(gestorEscola1, escola1)).toBe(true);
    expect(p_escola_permitida(gestorEscola1, escola2)).toBe(false);
  });

  it('SECRETARIO deve ter permissão de escrita apenas na sua respectiva escola', () => {
    expect(p_escola_permitida(secretarioEscola1, escola1)).toBe(true);
    expect(p_escola_permitida(secretarioEscola1, escola2)).toBe(false);
  });

  it('PROFESSOR e ALUNO não devem ter permissão de escrita administrativa em escolas', () => {
    expect(p_escola_permitida(professor, escola1)).toBe(false);
    expect(p_escola_permitida(aluno, escola1)).toBe(false);
  });
});

describe('Regras de Reabertura de Bimestres (SEC-04)', () => {
  const escolaA = 'escola-centro-a';
  const escolaB = 'escola-bairro-b';

  const turmaEscolaA: Turma = { id: 'turma-5a', escola_id: escolaA, nome: '5º Ano A' };
  const turmaEscolaB: Turma = { id: 'turma-8b', escola_id: escolaB, nome: '8º Ano B' };

  const admin: UserContext = { role: 'ADMIN' };
  const gestorEscolaA: UserContext = { role: 'GESTOR', escola_id: escolaA };
  const secretarioEscolaA: UserContext = { role: 'SECRETARIO', escola_id: escolaA };
  const professorEscolaA: UserContext = { role: 'PROFESSOR', escola_id: escolaA };
  const alunoEscolaA: UserContext = { role: 'ALUNO', escola_id: escolaA };

  it('ADMIN deve conseguir reabrir qualquer bimestre de qualquer escola', () => {
    expect(canReopenBimestre(admin, turmaEscolaA)).toBe(true);
    expect(canReopenBimestre(admin, turmaEscolaB)).toBe(true);
  });

  it('GESTOR deve conseguir reabrir bimestres apenas da sua respectiva escola', () => {
    expect(canReopenBimestre(gestorEscolaA, turmaEscolaA)).toBe(true);
    expect(canReopenBimestre(gestorEscolaA, turmaEscolaB)).toBe(false);
  });

  it('SECRETARIO da Escola A deve conseguir reabrir bimestre da sua escola', () => {
    expect(canReopenBimestre(secretarioEscolaA, turmaEscolaA)).toBe(true);
  });

  it('SECRETARIO da Escola A NÃO deve conseguir reabrir bimestre da Escola B', () => {
    expect(canReopenBimestre(secretarioEscolaA, turmaEscolaB)).toBe(false);
  });

  it('PROFESSOR NÃO deve conseguir reabrir bimestre diretamente via DELETE (deve solicitar à secretaria)', () => {
    expect(canReopenBimestre(professorEscolaA, turmaEscolaA)).toBe(false);
  });

  it('ALUNO NÃO deve conseguir reabrir bimestre', () => {
    expect(canReopenBimestre(alunoEscolaA, turmaEscolaA)).toBe(false);
  });
});
