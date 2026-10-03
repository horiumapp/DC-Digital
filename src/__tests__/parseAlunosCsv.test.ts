import { describe, it, expect } from 'vitest';
import { parseAlunosCsv } from '../utils/csvImportExport';

describe('parseAlunosCsv', () => {
  const turmasMock = [
    { id: 'turma-1', nome: '1º Ano A', escola_id: 'escola-1', turno: 'Matutino' },
    { id: 'turma-2', nome: '2º Ano B', escola_id: 'escola-1', turno: 'Vespertino' },
  ];

  it('deve associar turma mesmo com sufixo de turno entre parênteses "(Manhã)"', () => {
    const csvContent = [
      'Aluno;CPF;Nascimento;Sexo;Responsável;Telefone;Endereço;Turma;Status',
      'Antony Gabriel Nascimento Nery;84063948228;2011-03-28;M;Jackson Silva;97999990000;Rua Principal;1º Ano A (Manhã);Ativo',
      'Ana Beatriz Teste Almeida;91000000192;2019-01-02;F;Adriana Responsável;97988881111;Av Central;1º Ano A (Manhã);Ativo',
    ].join('\r\n');

    const result = parseAlunosCsv(csvContent, turmasMock, 'escola-1');

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(2);
    expect(result.valid[0].turma_id).toBe('turma-1');
    expect(result.valid[1].turma_id).toBe('turma-1');
    expect(result.valid[0].nome).toBe('Antony Gabriel Nascimento Nery');
  });

  it('deve associar turma com variações de símbolo ordinal (1º vs 1°)', () => {
    const csvContent = [
      'Aluno;CPF;Nascimento;Turma',
      'Clara Vitória;91000000354;2019-03-08;1° Ano A',
    ].join('\n');

    const result = parseAlunosCsv(csvContent, turmasMock, 'escola-1');

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(1);
    expect(result.valid[0].turma_id).toBe('turma-1');
  });

  it('deve alertar sobre CPFs duplicados no próprio arquivo CSV', () => {
    const csvContent = [
      'Aluno;CPF;Nascimento;Turma',
      'Aluno Um;12345678901;2015-01-01;1º Ano A',
      'Aluno Dois Clone;12345678901;2015-02-02;1º Ano A',
    ].join('\n');

    const result = parseAlunosCsv(csvContent, turmasMock, 'escola-1');

    expect(result.errors.some(e => e.includes('duplicado no arquivo'))).toBe(true);
  });
});
