import { beforeAll, describe, expect, it } from 'vitest';
import {
  consolidarPendencias,
  countWeekDaysInRangeIso,
  ensureDcRulesWasm,
  getDcRulesEngine,
  getDcRulesWasmStatus,
  setDcRulesEngine,
} from '../utils/dcRulesEngine';

beforeAll(async () => {
  const loaded = await ensureDcRulesWasm();
  setDcRulesEngine(loaded ? 'dual' : 'ts');
  if (!loaded) {
    console.warn(`[dc_rules] WASM indisponível: ${getDcRulesWasmStatus().error}`);
  }
});

describe('pendencias consolidar (Fase 3)', () => {
  it('ativa dual-run quando WASM existe', () => {
    if (!getDcRulesWasmStatus().loaded) return;
    expect(getDcRulesEngine()).toBe('dual');
  });

  it('conta dias da semana em O(1)', () => {
    expect(countWeekDaysInRangeIso('2026-02-02', '2026-02-08', 1)).toBe(1);
    expect(countWeekDaysInRangeIso('2026-02-02', '2026-02-15', 1)).toBe(2);
  });

  it('consolida percentuais de frequência, objeto e notas', () => {
    const out = consolidarPendencias({
      groups: [
        {
          professor: 'Ana',
          turmaId: 't1',
          turma: 'A',
          componente: 'Matemática',
          periodo: '1. BIMESTRE',
          turno: 'Matutino',
          ensino: 'Fundamental',
          fase: '6º Ano',
          tempos: ['1º TEMPO'],
          totalAulasEsperadas: 10,
          dateStart: '2026-02-05',
          dateEnd: '2026-02-28',
          periodoVariants: ['1. BIMESTRE', '1º Bimestre'],
          dataLotacao: '05/02/2026',
        },
      ],
      frequencias: [10, 11, 12, 13].map(dia => ({
        turmaId: 't1',
        disciplina: 'Matemática',
        tempo: '1º TEMPO',
        data: `2026-02-${String(dia).padStart(2, '0')}`,
      })),
      conteudos: [],
      avaliacoes: [
        {
          id: 'av1',
          turmaId: 't1',
          disciplina: 'Matemática',
          bimestre: '1. BIMESTRE',
        },
      ],
      alunoCounts: [{ key: 't1', total: 2 }],
      notasCounts: [{ key: 'av1', total: 1 }],
    });

    expect(out).toHaveLength(1);
    expect(out[0].pendFreq).toBe(60);
    expect(out[0].pendObjeto).toBe(100);
    expect(out[0].pendNotas).toBe(50);
    expect(out[0].professor).toBe('Ana');
  });
});
