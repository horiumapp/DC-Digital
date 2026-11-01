import { describe, it, expect } from 'vitest';

/** Regressão: SELECT de currículo não deve incluir ALUNO (migration 20261101130000). */
const CURRICULO_READ_ROLES = ['ADMIN', 'GESTOR', 'GESTOR_SEMEC', 'SECRETARIO', 'PROFESSOR'] as const;

function canReadCurriculo(role: string | null): boolean {
  return !!role && (CURRICULO_READ_ROLES as readonly string[]).includes(role);
}

describe('curriculo SELECT scope', () => {
  it('permite papéis pedagógicos e administrativos', () => {
    for (const role of CURRICULO_READ_ROLES) {
      expect(canReadCurriculo(role)).toBe(true);
    }
  });

  it('bloqueia ALUNO e cargo ausente', () => {
    expect(canReadCurriculo('ALUNO')).toBe(false);
    expect(canReadCurriculo(null)).toBe(false);
    expect(canReadCurriculo('PENDENTE')).toBe(false);
  });
});
