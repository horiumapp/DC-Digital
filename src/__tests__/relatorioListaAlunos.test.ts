import { describe, it, expect } from 'vitest';
import { ADMIN_ROLES, STAFF_ROLES } from '../constants/authConstants';
import {
  deduplicarTurmasRelatorio,
  filtrarTurmasPorTurno,
  turmaPermitida,
} from '../utils/relatorioListaAlunos';

describe('Relatório Lista de alunos — filtros e acesso', () => {
  const turmasBase = [
    {
      id: 'turma-1',
      nome: '1º ANO A',
      turno: 'MANHÃ',
      ensino: 'Fundamental Anos Iniciais',
      fase: '1º ANO',
      escolaId: 'escola-a',
      escolaNome: 'Escola Municipal Francisca Mendes',
      componente: 'Matemática',
    },
    {
      id: 'turma-1',
      nome: '1º ANO A',
      turno: 'MANHÃ',
      ensino: 'Fundamental Anos Iniciais',
      fase: '1º ANO',
      escolaId: 'escola-a',
      escolaNome: 'Escola Municipal Francisca Mendes',
      componente: 'Língua Portuguesa',
    },
    {
      id: 'turma-2',
      nome: '2º ANO B',
      turno: 'TARDE',
      ensino: 'Fundamental Anos Iniciais',
      fase: '2º ANO',
      escolaId: 'escola-a',
      escolaNome: 'Escola Municipal Francisca Mendes',
      componente: 'POLIVALENTE',
    },
  ];

  it('SECRETARIO, GESTOR e ADMIN devem estar em ADMIN_ROLES (rota da lista)', () => {
    expect(ADMIN_ROLES).toContain('SECRETARIO');
    expect(ADMIN_ROLES).toContain('GESTOR');
    expect(ADMIN_ROLES).toContain('ADMIN');
    expect(ADMIN_ROLES).not.toContain('PROFESSOR');
    expect(STAFF_ROLES).toContain('SECRETARIO');
  });

  it('deduplica turmas geradas por múltiplos componentes', () => {
    const unicas = deduplicarTurmasRelatorio(turmasBase);
    expect(unicas).toHaveLength(2);
    expect(unicas.map((t) => t.id).sort()).toEqual(['turma-1', 'turma-2']);
  });

  it('filtra turmas pelo turno selecionado', () => {
    const unicas = deduplicarTurmasRelatorio(turmasBase);
    const manha = filtrarTurmasPorTurno(unicas, 'MANHÃ');
    const tarde = filtrarTurmasPorTurno(unicas, 'TARDE');
    const todas = filtrarTurmasPorTurno(unicas, '');

    expect(manha).toHaveLength(1);
    expect(manha[0].id).toBe('turma-1');
    expect(tarde).toHaveLength(1);
    expect(tarde[0].id).toBe('turma-2');
    expect(todas).toHaveLength(2);
  });

  it('só permite consultar turmas presentes na lista autorizada', () => {
    const unicas = deduplicarTurmasRelatorio(turmasBase);
    expect(turmaPermitida(unicas, 'turma-1')?.escolaId).toBe('escola-a');
    expect(turmaPermitida(unicas, 'turma-outra-escola')).toBeUndefined();
    expect(turmaPermitida(unicas, '')).toBeUndefined();
  });
});
