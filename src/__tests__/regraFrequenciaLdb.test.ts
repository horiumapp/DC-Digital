import { beforeAll, describe, expect, it } from 'vitest';
import {
  arredondarPercentualParaExibicao,
  calcularFrequenciaLdb,
  classificarEtapaFrequencia,
  definirSituacaoPeriodo,
  ensureDcRulesWasm,
  getDcRulesEngine,
  getDcRulesWasmStatus,
  historicoAposAlteracao,
  momentoDoAnoLetivo,
  setDcRulesEngine,
  type RegistroCargaHoraria,
} from '../utils/regraFrequenciaLdb';

let wasmDisponivel = false;

beforeAll(async () => {
  wasmDisponivel = await ensureDcRulesWasm();
  if (wasmDisponivel) {
    setDcRulesEngine('dual');
  } else {
    setDcRulesEngine('ts');
    console.warn(
      `[dc_rules] WASM indisponível (${getDcRulesWasmStatus().error ?? 'módulo ausente'}). ` +
        'Rode `npm run build:dc-rules` para dual-run TS↔Rust.'
    );
  }
});

describe('motor híbrido dc_rules', () => {
  it('carrega o WASM e ativa dual-run TS↔Rust quando o artefato existe', () => {
    if (!wasmDisponivel) {
      console.warn('Pulando asserção de WASM — artefato ausente.');
      return;
    }
    expect(getDcRulesWasmStatus().loaded).toBe(true);
    expect(getDcRulesEngine()).toBe('dual');
  });
});

function tempos(presentes: number, faltas: number, justificadas = 0, abonadas = 0): RegistroCargaHoraria[] {
  return [
    ...Array.from({ length: presentes }, () => ({ cargaHoraria: 1, status: 'P' })),
    ...Array.from({ length: faltas }, () => ({ cargaHoraria: 1, status: 'F' })),
    ...Array.from({ length: justificadas }, () => ({ cargaHoraria: 1, status: 'FJ' })),
    ...Array.from({ length: abonadas }, () => ({ cargaHoraria: 1, status: 'FJ', abonadaPelaEscola: true })),
  ];
}

describe('classificação da etapa', () => {
  it('reconhece fundamental, médio e EJA pela LDB', () => {
    expect(classificarEtapaFrequencia('Fundamental Anos Iniciais (1° ao 5° ANO)')).toBe('fundamental_medio');
    expect(classificarEtapaFrequencia('Médio', '2ª série')).toBe('fundamental_medio');
    expect(classificarEtapaFrequencia('EJA (Educação de Jovens e Adultos)')).toBe('fundamental_medio');
    expect(classificarEtapaFrequencia('', '1º Ano A')).toBe('fundamental_medio');
  });

  it('separa pré-escola e creche e não inventa etapa', () => {
    expect(classificarEtapaFrequencia('Educação Infantil', 'Pré-escola II')).toBe('pre_escola');
    expect(classificarEtapaFrequencia('Educação Infantil', 'Jardim I')).toBe('pre_escola');
    expect(classificarEtapaFrequencia('Educação Infantil', 'Maternal II')).toBe('creche');
    expect(classificarEtapaFrequencia('Educação Infantil', 'Berçário')).toBe('creche');
    expect(classificarEtapaFrequencia('Educação Infantil')).toBe('indefinida');
  });
});

describe('limites de 25% e 26% de ausência', () => {
  it('ausência de exatamente 25% atende ao requisito no fechamento', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: tempos(75, 25),
    });

    expect(avaliacao.ausenciaPercentual).toBe(25);
    expect(avaliacao.frequenciaPercentual).toBe(75);
    expect(avaliacao.atendeRequisitoFrequencia).toBe(true);
    expect(avaliacao.resultado).toBe('Atende ao requisito de frequência');
    expect(avaliacao.rotulo).not.toBe('Reprovado por frequência');
  });

  it('ausência de 26% corresponde a 74% de presença e reprova por frequência no fechamento', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: tempos(74, 26),
    });

    expect(avaliacao.ausenciaPercentual).toBe(26);
    expect(avaliacao.frequenciaPercentual).toBe(74);
    expect(avaliacao.atendeRequisitoFrequencia).toBe(false);
    expect(avaliacao.resultado).toBe('Reprovado por frequência');
  });

  it('não declara reprovação no acompanhamento, mesmo acima de 25% de ausência', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'acompanhamento',
      registros: tempos(74, 26),
    });

    expect(avaliacao.resultado).not.toBe('Reprovado por frequência');
    expect(avaliacao.rotulo).toBe('Alerta de frequência');
    expect(avaliacao.alerta).toMatch(/não declara reprovação/i);
  });

  it('decide pela razão exata quando a exibição arredondada parece 75%', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: tempos(7496, 2504),
    });

    expect(avaliacao.frequenciaPercentual).toBeCloseTo(74.96, 5);
    expect(arredondarPercentualParaExibicao(avaliacao.frequenciaPercentual!)).toBe('74,96%');
    expect(arredondarPercentualParaExibicao(74.996)).toBe('75,00%');
    expect(avaliacao.atendeRequisitoFrequencia).toBe(false);
    expect(avaliacao.resultado).toBe('Reprovado por frequência');
  });

  it('conta cada tempo de aula e não junta o dia inteiro', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: [
        { cargaHoraria: 1, status: 'P' },
        { cargaHoraria: 1, status: 'F' },
      ],
    });

    expect(avaliacao.cargaLetivaTotal).toBe(2);
    expect(avaliacao.ausenciaPercentual).toBe(50);
    expect(avaliacao.resultado).toBe('Reprovado por frequência');
  });

  it('usa a carga informada, com a mesma unidade em todos os tempos', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: [
        { cargaHoraria: 45, status: 'P' },
        { cargaHoraria: 45, status: 'P' },
        { cargaHoraria: 45, status: 'P' },
        { cargaHoraria: 45, status: 'F' },
      ],
    });

    expect(avaliacao.cargaLetivaTotal).toBe(180);
    expect(avaliacao.ausenciaPercentual).toBe(25);
    expect(avaliacao.atendeRequisitoFrequencia).toBe(true);
  });
});

describe('justificativa, vazio e educação infantil', () => {
  it('não abona falta justificada sem validação da escola', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: tempos(70, 0, 30),
    });

    expect(avaliacao.cargaFaltas).toBe(30);
    expect(avaliacao.cargaJustificadaNaoAbonada).toBe(30);
    expect(avaliacao.resultado).toBe('Reprovado por frequência');
  });

  it('considera abono somente quando a escola validou', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: tempos(70, 0, 0, 30),
    });

    expect(avaliacao.cargaAbonadaPelaEscola).toBe(30);
    expect(avaliacao.cargaFaltas).toBe(0);
    expect(avaliacao.atendeRequisitoFrequencia).toBe(true);
  });

  it('informa frequência não calculada sem carga horária', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: [],
    });

    expect(avaliacao.calculada).toBe(false);
    expect(avaliacao.frequenciaExibicao).toBe('Frequência não calculada');
    expect(avaliacao.resultado).toBe('Frequência não calculada');
  });

  it('alerta a pré-escola abaixo de 60% sem reprovar', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'pre_escola',
      momento: 'fechamento',
      registros: tempos(59, 41),
    });

    expect(avaliacao.atendeRequisitoFrequencia).toBe(false);
    expect(avaliacao.resultado).toBe('Acompanhamento do desenvolvimento');
    expect(avaliacao.resultado).not.toBe('Reprovado por frequência');
    expect(avaliacao.alerta).toMatch(/60%/);
  });

  it('não alerta a pré-escola com exatamente 60%', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'pre_escola',
      momento: 'acompanhamento',
      registros: tempos(60, 40),
    });

    expect(avaliacao.atendeRequisitoFrequencia).toBe(true);
    expect(avaliacao.alerta).toBeNull();
  });

  it('não estende o percentual da pré-escola à creche', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'creche',
      momento: 'fechamento',
      registros: tempos(10, 90),
    });

    expect(avaliacao.alerta).toBeNull();
    expect(avaliacao.atendeRequisitoFrequencia).toBeNull();
    expect(avaliacao.resultado).toBe('Acompanhamento da creche');
  });
});

describe('situação do período e histórico', () => {
  it('reprova por frequência no fechamento mesmo com notas suficientes', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: tempos(74, 26),
    });

    expect(definirSituacaoPeriodo({
      etapa: 'fundamental_medio',
      avaliacao,
      notasSuficientes: true,
    })).toBe('Reprovado por frequência');
  });

  it('mantém os demais critérios quando a frequência está regular', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'fundamental_medio',
      momento: 'fechamento',
      registros: tempos(75, 25),
    });

    expect(definirSituacaoPeriodo({
      etapa: 'fundamental_medio',
      avaliacao,
      notasSuficientes: true,
    })).toBe('APROVADO');
    expect(definirSituacaoPeriodo({
      etapa: 'fundamental_medio',
      avaliacao,
      notasSuficientes: false,
    })).toBe('EXAME');
  });

  it('não promove a educação infantil', () => {
    const avaliacao = calcularFrequenciaLdb({
      etapa: 'pre_escola',
      momento: 'fechamento',
      registros: tempos(90, 10),
    });

    expect(definirSituacaoPeriodo({
      etapa: 'pre_escola',
      avaliacao,
      notasSuficientes: true,
    })).toBe('Acompanhamento');
  });

  it('não declara resultado definitivo antes do fim do ano letivo', () => {
    expect(momentoDoAnoLetivo('2026-10-11', '2026-12-14')).toBe('acompanhamento');
    expect(momentoDoAnoLetivo('2026-12-14', '2026-12-14')).toBe('fechamento');
  });

  it('conserva o histórico quando a frequência muda e não quando permanece igual', () => {
    const inicial = historicoAposAlteracao(undefined, { status: 'P', participacao: 'Presencial' }, '2026-03-01T00:00:00.000Z');
    const alterado = historicoAposAlteracao(
      { status: 'P', participacao: 'Presencial', historico: inicial },
      { status: 'FJ', participacao: 'Presencial' },
      '2026-03-02T00:00:00.000Z'
    );
    const repetido = historicoAposAlteracao(
      { status: 'FJ', participacao: 'Presencial', historico: alterado },
      { status: 'FJ', participacao: 'Presencial' },
      '2026-03-03T00:00:00.000Z'
    );

    expect(alterado).toHaveLength(2);
    expect(alterado[1].statusAnterior).toBe('P');
    expect(alterado[1].statusNovo).toBe('FJ');
    expect(repetido).toHaveLength(2);
  });
});
