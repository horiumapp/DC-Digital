import { APP_CONFIG } from '../config/appConfig';

export type ResolverUltimaAulaParams = {
  diasComAula: number[];
  verificarPeriodoFechado: (periodoId: string) => boolean;
  isFeriado?: (isoDate: string) => boolean;
  /** Data de referência (padrão: agora). */
  hoje?: Date;
};

export type ResolverUltimaAulaOk = {
  ok: true;
  data: string;
  periodoId: string;
  periodoNome: string;
};

export type ResolverUltimaAulaErro = {
  ok: false;
  motivo: 'sem-horario' | 'sem-bimestre-aberto' | 'sem-dia-aula';
  periodoNome?: string;
};

export type ResolverUltimaAulaResultado = ResolverUltimaAulaOk | ResolverUltimaAulaErro;

function toIsoLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Resolve a última aula letiva (até hoje) do bimestre ainda aberto.
 * Usado na entrada de Frequência e notas / chamada rápida.
 */
export function resolverUltimaAulaBimestreAberto(
  params: ResolverUltimaAulaParams
): ResolverUltimaAulaResultado {
  const { diasComAula, verificarPeriodoFechado, isFeriado } = params;
  if (!diasComAula.length) {
    return { ok: false, motivo: 'sem-horario' };
  }

  const hoje = new Date(params.hoje ?? new Date());
  hoje.setHours(23, 59, 59, 999);

  const bimestres = APP_CONFIG.PERIODOS.filter(periodo => periodo.id.includes('BIMESTRE'));
  const periodosDisponiveis: typeof bimestres = [];
  for (let indice = 0; indice < bimestres.length; indice += 1) {
    const periodo = bimestres[indice];
    const [ano, mes, dia] = periodo.dataInicio.split('-').map(Number);
    if (new Date(ano, mes - 1, dia) > hoje) break;
    if (indice > 0 && !verificarPeriodoFechado(bimestres[indice - 1].id)) break;
    periodosDisponiveis.push(periodo);
  }

  const periodoAberto = [...periodosDisponiveis]
    .reverse()
    .find(periodo => !verificarPeriodoFechado(periodo.id));

  if (!periodoAberto) {
    return { ok: false, motivo: 'sem-bimestre-aberto' };
  }

  const [anoInicio, mesInicio, diaInicio] = periodoAberto.dataInicio.split('-').map(Number);
  const [anoFim, mesFim, diaFim] = periodoAberto.dataFim.split('-').map(Number);
  const inicioPeriodo = new Date(anoInicio, mesInicio - 1, diaInicio);
  const fimPeriodo = new Date(anoFim, mesFim - 1, diaFim, 23, 59, 59, 999);
  const limiteBusca = hoje < fimPeriodo ? hoje : fimPeriodo;

  for (
    let candidata = new Date(limiteBusca);
    candidata >= inicioPeriodo;
    candidata.setDate(candidata.getDate() - 1)
  ) {
    const dataCandidata = toIsoLocal(candidata);
    if (diasComAula.includes(candidata.getDay()) && !isFeriado?.(dataCandidata)) {
      return {
        ok: true,
        data: dataCandidata,
        periodoId: periodoAberto.id,
        periodoNome: periodoAberto.nome,
      };
    }
  }

  return { ok: false, motivo: 'sem-dia-aula', periodoNome: periodoAberto.nome };
}

/** Monta a URL de Frequência apontando para a última aula do bimestre aberto. */
export function buildFrequenciaUltimaAulaUrl(
  turmaId: string,
  resultado: ResolverUltimaAulaOk
): string {
  const params = new URLSearchParams({
    date: resultado.data,
    turmaId: String(turmaId),
    origem: 'ultima-aula',
    periodo: resultado.periodoNome,
  });
  return `/frequencia?${params.toString()}`;
}
