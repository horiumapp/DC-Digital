/**
 * Implementação TypeScript de referência das regras LDB.
 * Mantida como fallback e fonte de verdade para dual-run com WASM.
 */

export type EtapaFrequencia = 'fundamental_medio' | 'pre_escola' | 'creche' | 'indefinida';
export type MomentoFrequencia = 'acompanhamento' | 'fechamento';

export interface RegistroCargaHoraria {
  /** Mesma unidade em todos os registros: hora, minuto ou tempo de aula. */
  cargaHoraria: number;
  status: string;
  /** Só verdadeiro quando a escola registrou e validou a situação especial. */
  abonadaPelaEscola?: boolean;
}

export interface AvaliacaoFrequencia {
  calculada: boolean;
  etapa: EtapaFrequencia;
  momento: MomentoFrequencia;
  cargaLetivaTotal: number;
  cargaFrequentada: number;
  cargaFaltas: number;
  cargaJustificadaNaoAbonada: number;
  cargaAbonadaPelaEscola: number;
  frequenciaPercentual: number | null;
  ausenciaPercentual: number | null;
  frequenciaExibicao: string;
  ausenciaExibicao: string;
  atendeRequisitoFrequencia: boolean | null;
  alerta: string | null;
  resultado: string;
  rotulo: string;
  observacao: string;
}

export interface AlteracaoFrequencia {
  em: string;
  statusAnterior: string | null;
  statusNovo: string | null;
  participacaoAnterior: string | null;
  participacaoNova: string | null;
}

const TEXTO_NAO_CALCULADA = 'Frequência não calculada';

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ºª°]/g, '')
    .toLowerCase();
}

export function classificarEtapaFrequencia(...partes: Array<string | null | undefined>): EtapaFrequencia {
  const texto = normalizar(partes.filter(Boolean).join(' '));
  if (!texto.trim()) return 'indefinida';

  if (/\b(creche|bercario|maternal)\b/.test(texto)) return 'creche';
  if (/\bpre[\s-]?escola\b/.test(texto) || /\bpre[\s-]?i{1,3}\b/.test(texto) || /\bjardim\b/.test(texto)) {
    return 'pre_escola';
  }
  if (/\binfantil\b/.test(texto)) return 'indefinida';
  if (/\b(fundamental|medio|eja|serie)\b/.test(texto) || /\d\s*o?\s*ano\b/.test(texto)) {
    return 'fundamental_medio';
  }
  return 'indefinida';
}

export function hojeLocalIso(data = new Date()): string {
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${data.getFullYear()}-${mes}-${dia}`;
}

export function momentoDoAnoLetivo(hojeIso: string, dataFimIso: string): MomentoFrequencia {
  return hojeIso >= dataFimIso ? 'fechamento' : 'acompanhamento';
}

export function arredondarPercentualParaExibicao(valor: number): string {
  const arredondado = Math.round((valor + Number.EPSILON) * 100) / 100;
  return `${arredondado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function razaoMaiorQue(numerador: number, denominador: number, percentual: number): boolean {
  return numerador * 100 > denominador * percentual;
}

function razaoMaiorOuIgual(numerador: number, denominador: number, percentual: number): boolean {
  return numerador * 100 >= denominador * percentual;
}

function statusNormalizado(status: string): string {
  return status.trim().toUpperCase();
}

export function calcularFrequenciaLdb(entrada: {
  etapa: EtapaFrequencia;
  momento: MomentoFrequencia;
  registros: RegistroCargaHoraria[];
}): AvaliacaoFrequencia {
  let cargaFrequentada = 0;
  let cargaFaltas = 0;
  let cargaJustificadaNaoAbonada = 0;
  let cargaAbonadaPelaEscola = 0;

  for (const registro of entrada.registros) {
    if (!Number.isFinite(registro.cargaHoraria) || registro.cargaHoraria <= 0) continue;
    const status = statusNormalizado(registro.status);
    const presenca = status === 'P' || status === 'PRESENTE';
    const falta = status === 'F' || status === 'AUSENTE';
    const justificada = status === 'FJ' || status === 'JUSTIFICADA';
    if (!presenca && !falta && !justificada) continue;

    if ((justificada || falta) && registro.abonadaPelaEscola) {
      cargaAbonadaPelaEscola += registro.cargaHoraria;
      cargaFrequentada += registro.cargaHoraria;
      continue;
    }
    if (presenca) {
      cargaFrequentada += registro.cargaHoraria;
      continue;
    }
    cargaFaltas += registro.cargaHoraria;
    if (justificada) cargaJustificadaNaoAbonada += registro.cargaHoraria;
  }

  const cargaLetivaTotal = cargaFrequentada + cargaFaltas;
  const base = {
    etapa: entrada.etapa,
    momento: entrada.momento,
    cargaLetivaTotal,
    cargaFrequentada,
    cargaFaltas,
    cargaJustificadaNaoAbonada,
    cargaAbonadaPelaEscola,
  };

  if (cargaLetivaTotal <= 0) {
    return {
      ...base,
      calculada: false,
      frequenciaPercentual: null,
      ausenciaPercentual: null,
      frequenciaExibicao: TEXTO_NAO_CALCULADA,
      ausenciaExibicao: TEXTO_NAO_CALCULADA,
      atendeRequisitoFrequencia: null,
      alerta: null,
      resultado: TEXTO_NAO_CALCULADA,
      rotulo: TEXTO_NAO_CALCULADA,
      observacao: 'Não há carga horária registrada para calcular a frequência.',
    };
  }

  const frequenciaPercentual = (cargaFrequentada / cargaLetivaTotal) * 100;
  const ausenciaPercentual = (cargaFaltas / cargaLetivaTotal) * 100;
  const frequenciaExibicao = arredondarPercentualParaExibicao(frequenciaPercentual);
  const ausenciaExibicao = arredondarPercentualParaExibicao(ausenciaPercentual);

  if (entrada.etapa === 'creche') {
    return {
      ...base,
      calculada: true,
      frequenciaPercentual,
      ausenciaPercentual,
      frequenciaExibicao,
      ausenciaExibicao,
      atendeRequisitoFrequencia: null,
      alerta: null,
      resultado: 'Acompanhamento da creche',
      rotulo: 'Acompanhamento',
      observacao: 'O percentual de 60% da pré-escola não se aplica automaticamente à creche. Não há retenção automática.',
    };
  }

  if (entrada.etapa === 'pre_escola') {
    const atende = razaoMaiorOuIgual(cargaFrequentada, cargaLetivaTotal, 60);
    return {
      ...base,
      calculada: true,
      frequenciaPercentual,
      ausenciaPercentual,
      frequenciaExibicao,
      ausenciaExibicao,
      atendeRequisitoFrequencia: atende,
      alerta: atende
        ? null
        : 'Alerta: frequência abaixo de 60% das horas da pré-escola. Não gera reprovação ou retenção automática.',
      resultado: 'Acompanhamento do desenvolvimento',
      rotulo: atende ? 'Acompanhamento' : 'Alerta de frequência',
      observacao: 'A pré-escola é avaliada por acompanhamento e registro do desenvolvimento, sem objetivo de promoção.',
    };
  }

  if (entrada.etapa !== 'fundamental_medio') {
    return {
      ...base,
      calculada: true,
      frequenciaPercentual,
      ausenciaPercentual,
      frequenciaExibicao,
      ausenciaExibicao,
      atendeRequisitoFrequencia: null,
      alerta: null,
      resultado: 'Frequência em acompanhamento',
      rotulo: 'Acompanhamento',
      observacao: 'A etapa não identifica ensino fundamental, médio ou pré-escola. Nenhuma reprovação automática foi aplicada.',
    };
  }

  const atende = razaoMaiorOuIgual(cargaFrequentada, cargaLetivaTotal, 75)
    && !razaoMaiorQue(cargaFaltas, cargaLetivaTotal, 25);
  const baseNumerica = {
    ...base,
    calculada: true,
    frequenciaPercentual,
    ausenciaPercentual,
    frequenciaExibicao,
    ausenciaExibicao,
    atendeRequisitoFrequencia: atende,
  };

  if (entrada.momento === 'acompanhamento') {
    return {
      ...baseNumerica,
      alerta: atende
        ? null
        : 'Alerta de frequência: ausência acima de 25% da carga horária já realizada. Este acompanhamento não declara reprovação.',
      resultado: atende
        ? 'Em acompanhamento'
        : 'Em acompanhamento — ausência acima de 25% da carga horária já realizada',
      rotulo: atende ? 'Em acompanhamento' : 'Alerta de frequência',
      observacao: 'No acompanhamento, a carga horária é a já realizada. A reprovação por frequência só pode ser declarada no fechamento do período letivo, depois da validação da escola.',
    };
  }

  if (!atende) {
    return {
      ...baseNumerica,
      alerta: 'Ausência superior a 25% da carga horária letiva. Não atende ao requisito de frequência, mesmo com notas suficientes.',
      resultado: 'Reprovado por frequência',
      rotulo: 'Reprovado por frequência',
      observacao: 'Resultado após a validação do fechamento pela escola e de eventuais situações especiais legalmente aplicáveis. Justificativa ou atestado, sozinhos, não abonam a falta.',
    };
  }

  return {
    ...baseNumerica,
    alerta: null,
    resultado: 'Atende ao requisito de frequência',
    rotulo: 'Atende à frequência',
    observacao: 'A aprovação também depende dos demais critérios aplicáveis.',
  };
}

export function definirSituacaoPeriodo(entrada: {
  etapa: EtapaFrequencia;
  avaliacao: AvaliacaoFrequencia;
  notasSuficientes: boolean | null;
}): string {
  if (entrada.notasSuficientes === null) return '';

  if (entrada.etapa === 'creche' || entrada.etapa === 'pre_escola') {
    if (entrada.etapa === 'pre_escola' && entrada.avaliacao.atendeRequisitoFrequencia === false) {
      return 'Alerta de frequência';
    }
    return 'Acompanhamento';
  }

  if (entrada.etapa !== 'fundamental_medio') return '';

  if (!entrada.avaliacao.calculada) {
    return entrada.notasSuficientes ? TEXTO_NAO_CALCULADA : 'EXAME';
  }

  if (entrada.avaliacao.atendeRequisitoFrequencia === false) {
    return entrada.avaliacao.momento === 'fechamento'
      ? 'Reprovado por frequência'
      : 'Alerta de frequência';
  }

  return entrada.notasSuficientes ? 'APROVADO' : 'EXAME';
}

export function historicoAposAlteracao(
  anterior: { status?: string; participacao?: string; historico?: AlteracaoFrequencia[] } | undefined,
  novo: { status: string; participacao?: string },
  em: string
): AlteracaoFrequencia[] {
  const historico = anterior?.historico ? [...anterior.historico] : [];
  const statusNovo = novo.status;
  const participacaoNova = novo.participacao ?? null;
  if (!anterior) {
    historico.push({
      em,
      statusAnterior: null,
      statusNovo,
      participacaoAnterior: null,
      participacaoNova,
    });
    return historico;
  }
  const statusMudou = (anterior.status ?? null) !== statusNovo;
  const participacaoMudou = (anterior.participacao ?? null) !== participacaoNova;
  if (statusMudou || participacaoMudou) {
    historico.push({
      em,
      statusAnterior: anterior.status ?? null,
      statusNovo,
      participacaoAnterior: anterior.participacao ?? null,
      participacaoNova,
    });
  }
  return historico;
}
