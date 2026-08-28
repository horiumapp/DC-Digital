import { describe, it, expect } from 'vitest';

/**
 * Testes para as regras de isolamento e exclusão/desvinculação de professores (SEC-02 / Issue 2).
 */

interface ProfessorAllocation {
  id: string;
  professor_id: string;
  escola_id: string;
  turno: string;
}

interface ProfessorSchedule {
  id: string;
  professor_id: string;
  escola_id: string;
  turma_id: string;
}

interface Professor {
  id: string;
  nome: string;
  email?: string;
}

interface UserContext {
  role: 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR' | 'ALUNO';
  escola_id?: string;
}

// Simula a política RLS no banco: DELETE em public.professores é restrito a ADMIN
function canDeleteProfessorMasterRecord(user: UserContext): boolean {
  return user.role === 'ADMIN';
}

// Simula a operação de desvinculação por escola (para não-admins)
function desallocateProfessorFromSchool(
  user: UserContext,
  targetProfessorId: string,
  selectedEscolaId: string,
  state: {
    professores: Professor[];
    alocacoes: ProfessorAllocation[];
    horarios: ProfessorSchedule[];
  }
): { success: boolean; error?: string; removedAllocationsCount: number } {
  if (user.role === 'ADMIN') {
    // ADMIN pode apagar globalmente
    state.professores = state.professores.filter(p => p.id !== targetProfessorId);
    state.alocacoes = state.alocacoes.filter(a => a.professor_id !== targetProfessorId);
    state.horarios = state.horarios.filter(h => h.professor_id !== targetProfessorId);
    return { success: true, removedAllocationsCount: state.alocacoes.length };
  }

  // Não-admin só pode desvincular da sua própria escola
  if (!user.escola_id || user.escola_id !== selectedEscolaId) {
    return { success: false, error: 'Usuário sem permissão para esta escola', removedAllocationsCount: 0 };
  }

  const initialAlocCount = state.alocacoes.length;
  state.alocacoes = state.alocacoes.filter(
    a => !(a.professor_id === targetProfessorId && a.escola_id === selectedEscolaId)
  );
  state.horarios = state.horarios.filter(
    h => !(h.professor_id === targetProfessorId && h.escola_id === selectedEscolaId)
  );

  const removed = initialAlocCount - state.alocacoes.length;
  return { success: true, removedAllocationsCount: removed };
}

describe('Regras de Isolamento de Professores Multi-Escola (SEC-02)', () => {
  const escolaA = 'escola-1111';
  const escolaB = 'escola-2222';

  const professorMultiEscola: Professor = {
    id: 'prof-multi-1',
    nome: 'Carlos Drummond',
    email: 'carlos@educacao.gov.br',
  };

  it('deve negar exclusão direta em public.professores para SECRETARIO e GESTOR (RLS Check)', () => {
    const secretario: UserContext = { role: 'SECRETARIO', escola_id: escolaA };
    const gestor: UserContext = { role: 'GESTOR', escola_id: escolaA };

    expect(canDeleteProfessorMasterRecord(secretario)).toBe(false);
    expect(canDeleteProfessorMasterRecord(gestor)).toBe(false);
  });

  it('deve permitir exclusão direta em public.professores para ADMIN (RLS Check)', () => {
    const admin: UserContext = { role: 'ADMIN' };
    expect(canDeleteProfessorMasterRecord(admin)).toBe(true);
  });

  it('deve desvincular professor apenas da Escola A quando Secretário da Escola A solicita remoção', () => {
    const state = {
      professores: [{ ...professorMultiEscola }],
      alocacoes: [
        { id: 'aloc-1', professor_id: professorMultiEscola.id, escola_id: escolaA, turno: 'Manhã' },
        { id: 'aloc-2', professor_id: professorMultiEscola.id, escola_id: escolaB, turno: 'Tarde' },
      ],
      horarios: [
        { id: 'h-1', professor_id: professorMultiEscola.id, escola_id: escolaA, turma_id: 'turma-a1' },
        { id: 'h-2', professor_id: professorMultiEscola.id, escola_id: escolaB, turma_id: 'turma-b1' },
      ],
    };

    const secretarioEscolaA: UserContext = { role: 'SECRETARIO', escola_id: escolaA };

    const result = desallocateProfessorFromSchool(
      secretarioEscolaA,
      professorMultiEscola.id,
      escolaA,
      state
    );

    expect(result.success).toBe(true);
    expect(result.removedAllocationsCount).toBe(1);

    // O professor AINDA existe no cadastro global
    expect(state.professores.some(p => p.id === professorMultiEscola.id)).toBe(true);

    // O vínculo com a Escola B continua INTACTO
    expect(state.alocacoes.some(a => a.escola_id === escolaB)).toBe(true);
    expect(state.horarios.some(h => h.escola_id === escolaB)).toBe(true);

    // O vínculo com a Escola A foi devidamente removido
    expect(state.alocacoes.some(a => a.escola_id === escolaA)).toBe(false);
    expect(state.horarios.some(h => h.escola_id === escolaA)).toBe(false);
  });

  it('deve bloquear tentativa de Secretário da Escola A de desvincular professor da Escola B', () => {
    const state = {
      professores: [{ ...professorMultiEscola }],
      alocacoes: [
        { id: 'aloc-2', professor_id: professorMultiEscola.id, escola_id: escolaB, turno: 'Tarde' },
      ],
      horarios: [
        { id: 'h-2', professor_id: professorMultiEscola.id, escola_id: escolaB, turma_id: 'turma-b1' },
      ],
    };

    const secretarioEscolaA: UserContext = { role: 'SECRETARIO', escola_id: escolaA };

    const result = desallocateProfessorFromSchool(
      secretarioEscolaA,
      professorMultiEscola.id,
      escolaB,
      state
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Usuário sem permissão para esta escola');
    expect(state.alocacoes.length).toBe(1);
  });

  it('deve permitir que ADMIN exclua o professor e todos os seus vínculos de todas as escolas', () => {
    const state = {
      professores: [{ ...professorMultiEscola }],
      alocacoes: [
        { id: 'aloc-1', professor_id: professorMultiEscola.id, escola_id: escolaA, turno: 'Manhã' },
        { id: 'aloc-2', professor_id: professorMultiEscola.id, escola_id: escolaB, turno: 'Tarde' },
      ],
      horarios: [
        { id: 'h-1', professor_id: professorMultiEscola.id, escola_id: escolaA, turma_id: 'turma-a1' },
        { id: 'h-2', professor_id: professorMultiEscola.id, escola_id: escolaB, turma_id: 'turma-b1' },
      ],
    };

    const admin: UserContext = { role: 'ADMIN' };

    const result = desallocateProfessorFromSchool(
      admin,
      professorMultiEscola.id,
      escolaA,
      state
    );

    expect(result.success).toBe(true);
    expect(state.professores.length).toBe(0);
    expect(state.alocacoes.length).toBe(0);
    expect(state.horarios.length).toBe(0);
  });
});
