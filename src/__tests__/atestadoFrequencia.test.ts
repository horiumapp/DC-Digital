import { describe, expect, it } from 'vitest';
import { aplicarAtestadoNaChamada, dataCobertaPeloAtestado } from '../utils/atestadoFrequencia';

describe('atestado na chamada', () => {
  it('trava o aluno em falta justificada e não deixa o professor remover', () => {
    const resultado = aplicarAtestadoNaChamada(
      { id: 'ana', freq: 'P' },
      new Set(['ana'])
    );
    expect(resultado).toEqual({ id: 'ana', freq: 'FJ', atestado: true });
  });

  it('preserva a presença de quem não tem atestado', () => {
    const resultado = aplicarAtestadoNaChamada(
      { id: 'bruno', freq: 'P' },
      new Set(['ana'])
    );
    expect(resultado.freq).toBe('P');
    expect(resultado.atestado).toBe(false);
  });

  it('não mantém falta justificada lançada só pelo professor', () => {
    const resultado = aplicarAtestadoNaChamada(
      { id: 'clara', freq: 'FJ' },
      new Set()
    );
    expect(resultado.freq).toBe('F');
    expect(resultado.atestado).toBe(false);
  });

  it('cobre o dia inteiro do período do atestado, inclusive o primeiro e o último', () => {
    expect(dataCobertaPeloAtestado('2026-04-06', '2026-04-06', '2026-04-08')).toBe(true);
    expect(dataCobertaPeloAtestado('2026-04-08', '2026-04-06', '2026-04-08')).toBe(true);
    expect(dataCobertaPeloAtestado('2026-04-09', '2026-04-06', '2026-04-08')).toBe(false);
  });
});
