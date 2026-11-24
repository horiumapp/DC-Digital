import { describe, expect, it } from 'vitest';
import {
  buildFrequenciaUltimaAulaUrl,
  resolverUltimaAulaBimestreAberto,
} from '../utils/entradaFrequencia';

describe('resolverUltimaAulaBimestreAberto', () => {
  it('retorna sem-horario quando não há dias de aula', () => {
    const resultado = resolverUltimaAulaBimestreAberto({
      diasComAula: [],
      verificarPeriodoFechado: () => false,
      hoje: new Date(2026, 10, 24),
    });
    expect(resultado).toEqual({ ok: false, motivo: 'sem-horario' });
  });

  it('escolhe a última aula do bimestre aberto (não o 1º bimestre)', () => {
    // 24/11/2026 é terça — 4º bimestre. Seg/qua/sex com aula.
    const resultado = resolverUltimaAulaBimestreAberto({
      diasComAula: [1, 3, 5],
      verificarPeriodoFechado: id =>
        id === '1. BIMESTRE' || id === '2. BIMESTRE' || id === '3. BIMESTRE',
      hoje: new Date(2026, 10, 24),
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.periodoId).toBe('4. BIMESTRE');
    expect(resultado.periodoNome).toBe('4º Bimestre');
    // 24/11/2026 é terça (2) — não é dia de aula; volta para segunda 23/11
    expect(resultado.data).toBe('2026-11-23');
  });

  it('não avança para bimestre futuro se o anterior ainda está aberto', () => {
    const resultado = resolverUltimaAulaBimestreAberto({
      diasComAula: [1, 2, 3, 4, 5],
      verificarPeriodoFechado: () => false,
      hoje: new Date(2026, 10, 24),
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    // Sem fechamentos, só o 1º bimestre entra na lista disponível
    expect(resultado.periodoId).toBe('1. BIMESTRE');
    expect(resultado.data).toBe('2026-04-23');
  });

  it('retorna sem-bimestre-aberto quando todos estão fechados', () => {
    const resultado = resolverUltimaAulaBimestreAberto({
      diasComAula: [1, 3, 5],
      verificarPeriodoFechado: () => true,
      hoje: new Date(2026, 10, 24),
    });
    expect(resultado).toEqual({ ok: false, motivo: 'sem-bimestre-aberto' });
  });

  it('ignora feriados ao escolher o dia', () => {
    const resultado = resolverUltimaAulaBimestreAberto({
      diasComAula: [1], // só segunda
      verificarPeriodoFechado: id => id !== '4. BIMESTRE',
      isFeriado: data => data === '2026-11-23',
      hoje: new Date(2026, 10, 24),
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.data).toBe('2026-11-16');
  });
});

describe('buildFrequenciaUltimaAulaUrl', () => {
  it('monta a query com origem ultima-aula', () => {
    const url = buildFrequenciaUltimaAulaUrl('turma-1', {
      ok: true,
      data: '2026-11-23',
      periodoId: '4. BIMESTRE',
      periodoNome: '4º Bimestre',
    });
    expect(url).toContain('date=2026-11-23');
    expect(url).toContain('turmaId=turma-1');
    expect(url).toContain('origem=ultima-aula');
    expect(decodeURIComponent(url.replace(/\+/g, ' '))).toContain('periodo=4º Bimestre');
  });
});
