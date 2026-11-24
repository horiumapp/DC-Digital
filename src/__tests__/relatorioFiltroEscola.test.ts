import { describe, expect, it } from 'vitest';
import {
  escolherTurmaRelatorio,
  escolaTrabalhoRelatorio,
  filtrarTurmasRelatorioEscolaAtiva,
} from '../utils/relatorioFiltro';

const francisca = { id: 't-f', componente: 'Matemática', escolaId: 'esc-francisca', turno: 'Tarde', nome: '1º Ano A' };
const esperanca = { id: 't-e', componente: 'Matemática', escolaId: 'esc-esperanca', turno: 'Manhã', nome: '1º Ano A' };

describe('Filtro de escola nos relatórios do professor', () => {
  it('prioriza escolaAtivaId do professor (como o cabeçalho)', () => {
    expect(
      escolaTrabalhoRelatorio(
        { role: 'PROFESSOR', escolaAtivaId: 'esc-francisca', escola_id: 'esc-outra' },
        { escola_id: 'esc-esperanca' },
      ),
    ).toBe('esc-francisca');
  });

  it('não lista turmas de outra escola quando há lotação ativa', () => {
    const filtradas = filtrarTurmasRelatorioEscolaAtiva(
      [esperanca, francisca],
      'esc-francisca',
      'Tarde',
    );
    expect(filtradas).toEqual([francisca]);
  });

  it('pré-seleciona turma da escola ativa, não a primeira da lista global', () => {
    // Lista ordenada com Centro Esperança primeiro (como no bug)
    const chave = escolherTurmaRelatorio(
      [esperanca, francisca],
      null,
      'esc-francisca',
    );
    expect(chave).toBe('t-f|Matemática');
  });

  it('respeita turmaAtiva quando ela pertence à escola ativa', () => {
    const chave = escolherTurmaRelatorio(
      [esperanca, francisca],
      { id: 't-f', componente: 'Matemática', escola_id: 'esc-francisca' },
      'esc-francisca',
    );
    expect(chave).toBe('t-f|Matemática');
  });
});
