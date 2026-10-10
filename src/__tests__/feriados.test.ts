// @vitest-environment happy-dom
import { describe, expect, it, beforeEach } from 'vitest';
import {
  definirFeriados,
  feriadosNacionaisDoAno,
  feriadosNoDiaDaSemana,
  limparFeriados,
  nomeFeriado,
} from '../services/feriados';

describe('feriados da rede', () => {
  beforeEach(() => limparFeriados());

  it('reconhece o dia marcado e ignora os outros', () => {
    definirFeriados([{ data: '2026-05-01', nome: 'Dia do Trabalho' }]);
    expect(nomeFeriado('2026-05-01')).toBe('Dia do Trabalho');
    expect(nomeFeriado('2026-05-04')).toBeNull();
  });

  it('tira da conta só o feriado que cai no dia de aula do intervalo', () => {
    definirFeriados([
      { data: '2026-05-01', nome: 'Dia do Trabalho' },
      { data: '2026-09-07', nome: 'Independência' },
    ]);
    const inicio = new Date(2026, 4, 1);
    const fim = new Date(2026, 4, 31);
    expect(feriadosNoDiaDaSemana(inicio, fim, 5)).toBe(1);
    expect(feriadosNoDiaDaSemana(inicio, fim, 1)).toBe(0);
  });

  it('monta os feriados nacionais fixos no ano pedido', () => {
    const datas = feriadosNacionaisDoAno(2026).map(item => item.data);
    expect(datas).toContain('2026-05-01');
    expect(datas).toContain('2026-11-20');
    expect(datas.some(data => data.startsWith('2025-'))).toBe(false);
  });
});
