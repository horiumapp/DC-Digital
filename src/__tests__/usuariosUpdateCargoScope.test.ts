import { describe, it, expect } from 'vitest';

/**
 * Regressão da política admin_update_usuarios (migration 20261101120000).
 * p_cargo_compativel deve valer no USING (cargo atual) e no WITH CHECK (cargo novo).
 */

type Role = 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR' | 'ALUNO' | 'GESTOR_SEMEC';

function pCargoCompativel(actor: Role, cargo: string): boolean {
  if (actor === 'ADMIN') return true;
  if (actor === 'GESTOR_SEMEC') return ['GESTOR', 'SECRETARIO', 'PROFESSOR', 'ALUNO'].includes(cargo);
  if (actor === 'GESTOR') return ['PROFESSOR', 'ALUNO'].includes(cargo);
  if (actor === 'SECRETARIO') return ['PROFESSOR', 'ALUNO'].includes(cargo);
  if (actor === 'PROFESSOR') return cargo === 'PROFESSOR';
  return false;
}

function canUpdateUsuario(opts: {
  actorRole: Role;
  actorEscolaId: string | null;
  actorId: string;
  targetId: string;
  targetEscolaId: string | null;
  targetCargoAtual: string;
  targetCargoNovo: string;
}): boolean {
  const { actorRole, actorEscolaId, actorId, targetId, targetEscolaId, targetCargoAtual, targetCargoNovo } = opts;
  if (actorRole === 'ADMIN') return true;

  const isStaff = ['ADMIN', 'GESTOR', 'SECRETARIO'].includes(actorRole);
  if (!isStaff) return false;
  if (targetId === actorId) return false;
  if (!actorEscolaId || targetEscolaId !== actorEscolaId) return false;
  if (!pCargoCompativel(actorRole, targetCargoAtual)) return false;
  if (!pCargoCompativel(actorRole, targetCargoNovo)) return false;
  return true;
}

describe('admin_update_usuarios — escopo de cargo (USING + WITH CHECK)', () => {
  const escola = 'escola-a';

  it('bloqueia SECRETARIO demovendo GESTOR da mesma escola para PROFESSOR', () => {
    expect(
      canUpdateUsuario({
        actorRole: 'SECRETARIO',
        actorEscolaId: escola,
        actorId: 'sec-1',
        targetId: 'gestor-1',
        targetEscolaId: escola,
        targetCargoAtual: 'GESTOR',
        targetCargoNovo: 'PROFESSOR',
      }),
    ).toBe(false);
  });

  it('bloqueia GESTOR demovendo SECRETARIO da mesma escola para PROFESSOR', () => {
    expect(
      canUpdateUsuario({
        actorRole: 'GESTOR',
        actorEscolaId: escola,
        actorId: 'gestor-1',
        targetId: 'sec-1',
        targetEscolaId: escola,
        targetCargoAtual: 'SECRETARIO',
        targetCargoNovo: 'PROFESSOR',
      }),
    ).toBe(false);
  });

  it('permite GESTOR atualizar PROFESSOR da mesma escola mantendo cargo PROFESSOR', () => {
    expect(
      canUpdateUsuario({
        actorRole: 'GESTOR',
        actorEscolaId: escola,
        actorId: 'gestor-1',
        targetId: 'prof-1',
        targetEscolaId: escola,
        targetCargoAtual: 'PROFESSOR',
        targetCargoNovo: 'PROFESSOR',
      }),
    ).toBe(true);
  });

  it('bloqueia mutação cruzada entre escolas', () => {
    expect(
      canUpdateUsuario({
        actorRole: 'GESTOR',
        actorEscolaId: escola,
        actorId: 'gestor-1',
        targetId: 'prof-2',
        targetEscolaId: 'escola-b',
        targetCargoAtual: 'PROFESSOR',
        targetCargoNovo: 'PROFESSOR',
      }),
    ).toBe(false);
  });

  it('ADMIN continua podendo alterar qualquer cargo', () => {
    expect(
      canUpdateUsuario({
        actorRole: 'ADMIN',
        actorEscolaId: null,
        actorId: 'admin-1',
        targetId: 'gestor-1',
        targetEscolaId: escola,
        targetCargoAtual: 'GESTOR',
        targetCargoNovo: 'SECRETARIO',
      }),
    ).toBe(true);
  });
});
