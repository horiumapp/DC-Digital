import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const rpc = vi.hoisted(() => vi.fn());
const from = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase', () => ({
  supabase: { rpc, from },
}));

import { alunosComAtestadoNaData, listarAtestadosDoAluno } from '../services/atestadoService';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20261017000000_defensive_review_fixes.sql'),
  'utf8',
);
const createUser = readFileSync(
  resolve(process.cwd(), 'supabase/functions/admin-create-user/index.ts'),
  'utf8',
);

describe('Revisão defensiva — cargo e atestado', () => {
  it('gestor da escola só grava cargo de professor ou aluno', () => {
    expect(migration).toMatch(
      /\(SELECT public\.get_user_role\(\)\) = 'GESTOR'\s+AND p_cargo IN \('PROFESSOR', 'ALUNO'\)/,
    );
    expect(migration).not.toMatch(
      /\(SELECT public\.get_user_role\(\)\) = 'GESTOR'\s+AND p_cargo IN \('SECRETARIO'/,
    );
    expect(migration).not.toContain('escola_id IS NULL');
  });

  it('a observação do atestado não entra no SELECT amplo da tabela', () => {
    expect(migration).toContain('REVOKE SELECT ON public.atestados_medicos FROM authenticated');
    expect(migration).not.toMatch(/GRANT SELECT \(\s*[^)]*observacao/);
    expect(migration).toContain('ELSE NULL');
  });

  it('conta já existente sem perfil só é retomada por admin ou gestor SEMEC', () => {
    expect(createUser).toContain('if (isOrphanOrPending && hasNetworkScope(effectiveRole))');
    expect(createUser).toContain('status: 503');
    expect(createUser).not.toContain('.upsert(');
    expect(createUser).toContain('Seu perfil institucional não foi encontrado');
    expect(createUser).not.toContain('role ausente no JWT');
    expect(createUser).not.toContain('origin || "*"');
    const autor = readFileSync(
      resolve(process.cwd(), 'supabase/migrations/20261017000001_autor_fechamento.sql'),
      'utf8',
    );
    expect(autor).toContain('NEW.usuario_fechamento_id := auth.uid()');
  });
});

describe('Revisão defensiva — leitura de atestado', () => {
  beforeEach(() => {
    rpc.mockReset();
    from.mockReset();
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: true }, configurable: true });
  });

  it('a listagem da secretaria usa a função que decide a observação', async () => {
    rpc.mockResolvedValue({ data: [{ id: '1', observacao: 'gripe' }], error: null });
    const lista = await listarAtestadosDoAluno('aluno-1');
    expect(rpc).toHaveBeenCalledWith('listar_atestados_do_aluno', { p_aluno_id: 'aluno-1' });
    expect(lista[0].observacao).toBe('gripe');
  });

  it('a chamada da aula não pede a observação clínica', async () => {
    const eq = vi.fn(async () => ({
      data: [{ aluno_id: 'ana', data_inicio: '2026-10-01', data_fim: '2026-10-02' }],
      error: null,
    }));
    const select = vi.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    await alunosComAtestadoNaData('turma-1', '2026-10-01');

    expect(select).toHaveBeenCalledWith(expect.not.stringContaining('observacao'));
  });
});
