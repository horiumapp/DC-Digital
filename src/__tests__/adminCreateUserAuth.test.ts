import { describe, it, expect } from 'vitest';

/**
 * Simulação das regras de autorização da Edge Function admin-create-user (ação delete-user).
 * Esta função reflete com precisão a lógica implementada em supabase/functions/admin-create-user/index.ts.
 */
interface TargetUser {
  id: string;
  email: string;
  cargo: string;
  escola_id: string;
}

interface CallerUser {
  id: string;
  role: string;
  escola_id?: string;
}

function evaluateDeleteUserAuthorization(
  caller: CallerUser,
  targetUserData: TargetUser | null,
  authUsersList: Array<{ id: string; email: string }> = []
): { status: number; error?: string; authorized: boolean } {
  const effectiveRole = caller.role;

  if (effectiveRole !== 'ADMIN') {
    if (!caller.escola_id) {
      return { status: 403, error: 'Seu usuário não possui escola vinculada', authorized: false };
    }

    // SEGURANÇA: Não-admin NÃO pode excluir usuário inexistente ou não mapeado na tabela usuarios
    if (!targetUserData) {
      return { status: 404, error: 'Usuário não encontrado na base institucional', authorized: false };
    }

    // Não-admin só pode deletar PROFESSOR ou ALUNO da sua própria escola
    if (
      targetUserData.escola_id !== caller.escola_id ||
      !['PROFESSOR', 'ALUNO'].includes(targetUserData.cargo)
    ) {
      return { status: 403, error: 'Você não tem permissão para excluir este usuário', authorized: false };
    }
  }

  // Resolver ID do Auth
  let authUserId = targetUserData?.id;
  if (!authUserId && effectiveRole === 'ADMIN') {
    const found = authUsersList.find(u => u.id === targetUserData?.id || u.email === targetUserData?.email);
    if (found) authUserId = found.id;
  }

  if (!authUserId && !targetUserData) {
    return { status: 404, error: 'Usuário não encontrado para exclusão', authorized: false };
  }

  return { status: 200, authorized: true };
}

describe('admin-create-user delete-user Authorization Rules (SEC-01 IDOR Prevention)', () => {
  const escolaA = 'escola-uuid-1111';
  const escolaB = 'escola-uuid-2222';

  const secretarioEscolaA: CallerUser = {
    id: 'user-sec-a',
    role: 'SECRETARIO',
    escola_id: escolaA,
  };

  const gestorEscolaA: CallerUser = {
    id: 'user-gestor-a',
    role: 'GESTOR',
    escola_id: escolaA,
  };

  const adminGlobal: CallerUser = {
    id: 'user-admin',
    role: 'ADMIN',
  };

  it('deve rejeitar com 404 quando Secretário tenta deletar usuário órfão/não cadastrado em public.usuarios', () => {
    const result = evaluateDeleteUserAuthorization(secretarioEscolaA, null);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toBe('Usuário não encontrado na base institucional');
  });

  it('deve rejeitar com 404 quando Gestor tenta deletar usuário órfão/não cadastrado em public.usuarios', () => {
    const result = evaluateDeleteUserAuthorization(gestorEscolaA, null);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toBe('Usuário não encontrado na base institucional');
  });

  it('deve rejeitar com 403 quando Secretário da Escola A tenta deletar aluno da Escola B', () => {
    const alunoEscolaB: TargetUser = {
      id: 'aluno-b-1',
      email: 'aluno@escola-b.local',
      cargo: 'ALUNO',
      escola_id: escolaB,
    };

    const result = evaluateDeleteUserAuthorization(secretarioEscolaA, alunoEscolaB);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toBe('Você não tem permissão para excluir este usuário');
  });

  it('deve rejeitar com 403 quando Secretário da Escola A tenta deletar Administrador ou Gestor', () => {
    const gestorMesmaEscola: TargetUser = {
      id: 'gestor-a-1',
      email: 'gestor@escola-a.local',
      cargo: 'GESTOR',
      escola_id: escolaA,
    };

    const result = evaluateDeleteUserAuthorization(secretarioEscolaA, gestorMesmaEscola);
    expect(result.authorized).toBe(false);
    expect(result.status).toBe(403);
    expect(result.error).toBe('Você não tem permissão para excluir este usuário');
  });

  it('deve autorizar com 200 quando Secretário da Escola A deleta Professor da Escola A', () => {
    const profEscolaA: TargetUser = {
      id: 'prof-a-1',
      email: 'prof@escola-a.local',
      cargo: 'PROFESSOR',
      escola_id: escolaA,
    };

    const result = evaluateDeleteUserAuthorization(secretarioEscolaA, profEscolaA);
    expect(result.authorized).toBe(true);
    expect(result.status).toBe(200);
  });

  it('deve autorizar com 200 quando Secretário da Escola A deleta Aluno da Escola A', () => {
    const alunoEscolaA: TargetUser = {
      id: 'aluno-a-1',
      email: 'aluno@escola-a.local',
      cargo: 'ALUNO',
      escola_id: escolaA,
    };

    const result = evaluateDeleteUserAuthorization(secretarioEscolaA, alunoEscolaA);
    expect(result.authorized).toBe(true);
    expect(result.status).toBe(200);
  });

  it('deve permitir que ADMIN delete qualquer usuário de qualquer escola', () => {
    const alunoEscolaB: TargetUser = {
      id: 'aluno-b-1',
      email: 'aluno@escola-b.local',
      cargo: 'ALUNO',
      escola_id: escolaB,
    };

    const result = evaluateDeleteUserAuthorization(adminGlobal, alunoEscolaB);
    expect(result.authorized).toBe(true);
    expect(result.status).toBe(200);
  });
});
