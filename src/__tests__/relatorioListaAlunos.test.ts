import { describe, it, expect } from 'vitest';
import { ADMIN_ROLES, STAFF_ROLES } from '../constants/authConstants';
import {
  deduplicarTurmasRelatorio,
  filtrarTurmasPorTurno,
  formatarCodigoAluno,
  formatarDataNascimentoLista,
  formatarNumeroLista,
  linhasEmBrancoLista,
  mapearSituacaoAluno,
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
      numero: '01',
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
      numero: '01',
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
      numero: '02',
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

  it('deduplica turmas geradas por múltiplos componentes e preserva número', () => {
    const unicas = deduplicarTurmasRelatorio(turmasBase);
    expect(unicas).toHaveLength(2);
    expect(unicas.map((t) => t.id).sort()).toEqual(['turma-1', 'turma-2']);
    expect(unicas.find((t) => t.id === 'turma-1')?.numero).toBe('01');
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

  it('mapeia situação para rótulos do documento oficial', () => {
    expect(mapearSituacaoAluno('Ativo')).toBe('CURSANDO');
    expect(mapearSituacaoAluno(null)).toBe('CURSANDO');
    expect(mapearSituacaoAluno('Aguardando transferência')).toBe('TRANS');
    expect(mapearSituacaoAluno('Remanejado')).toBe('REMAN');
    expect(mapearSituacaoAluno('Inativo')).toBe('INATIVO');
  });

  it('formata código, data, número e linhas em branco do PDF', () => {
    expect(formatarCodigoAluno('2676986-7')).toBe('2676986-7');
    expect(formatarCodigoAluno('')).toBe('—');
    expect(formatarDataNascimentoLista('2011-03-15')).toBe('15/03/2011');
    expect(formatarDataNascimentoLista(null)).toBe('—');
    expect(formatarNumeroLista(1)).toBe('001');
    expect(formatarNumeroLista(12)).toBe('012');
    expect(linhasEmBrancoLista(5, 12)).toBe(7);
    expect(linhasEmBrancoLista(25, 12)).toBe(0);
  });
});
