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

function evaluateResetProfessorPasswordAuthorization(
  caller: CallerUser,
  targetUserData: TargetUser | null,
  senha: string
): { status: number; error?: string; authorized: boolean } {
  const effectiveRole = caller.role;
  if (!['ADMIN', 'GESTOR', 'SECRETARIO'].includes(effectiveRole)) {
    return { status: 403, error: 'Sem permissão para redefinir senhas.', authorized: false };
  }
  const hasLetter = /[a-zA-Z]/.test(senha);
  const hasDigit = /\d/.test(senha);
  if (senha.length < 8 || !hasLetter || !hasDigit) {
    return { status: 400, error: 'A senha deve ter no mínimo 8 caracteres, incluindo letras e números.', authorized: false };
  }
  if (!targetUserData || targetUserData.cargo !== 'PROFESSOR') {
    return { status: 404, error: 'Conta de professor não encontrada.', authorized: false };
  }
  if (effectiveRole !== 'ADMIN') {
    if (!caller.escola_id || caller.escola_id !== targetUserData.escola_id) {
      return { status: 403, error: 'Você só pode redefinir senhas de professores da própria escola.', authorized: false };
    }
  }
  return { status: 200, authorized: true };
}

describe('admin-create-user reset-professor-password Authorization Rules', () => {
  const escolaA = 'escola-uuid-1111';
  const escolaB = 'escola-uuid-2222';

  const gestorEscolaA: CallerUser = { id: 'gestor-a', role: 'GESTOR', escola_id: escolaA };
  const adminGlobal: CallerUser = { id: 'admin-global', role: 'ADMIN' };
  const profEscolaA: TargetUser = { id: 'prof-a', email: 'prof@escola-a.gov.br', cargo: 'PROFESSOR', escola_id: escolaA };
  const profEscolaB: TargetUser = { id: 'prof-b', email: 'prof@escola-b.gov.br', cargo: 'PROFESSOR', escola_id: escolaB };

  it('deve autorizar gestor da escola A a resetar senha do professor da escola A com senha válida', () => {
    const res = evaluateResetProfessorPasswordAuthorization(gestorEscolaA, profEscolaA, '@prof123');
    expect(res.authorized).toBe(true);
    expect(res.status).toBe(200);
  });

  it('deve rejeitar se a senha tiver menos de 8 caracteres ou não tiver números/letras', () => {
    const res = evaluateResetProfessorPasswordAuthorization(gestorEscolaA, profEscolaA, '123456');
    expect(res.authorized).toBe(false);
    expect(res.status).toBe(400);
  });

  it('deve rejeitar gestor da escola A tentando resetar senha de professor da escola B', () => {
    const res = evaluateResetProfessorPasswordAuthorization(gestorEscolaA, profEscolaB, '@prof123');
    expect(res.authorized).toBe(false);
    expect(res.status).toBe(403);
    expect(res.error).toBe('Você só pode redefinir senhas de professores da própria escola.');
  });

  it('deve permitir que ADMIN global resete senha de professor de qualquer escola', () => {
    const res = evaluateResetProfessorPasswordAuthorization(adminGlobal, profEscolaB, '@prof123');
    expect(res.authorized).toBe(true);
    expect(res.status).toBe(200);
  });
});

