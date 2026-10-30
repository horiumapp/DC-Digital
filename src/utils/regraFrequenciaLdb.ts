/**
 * Frequência e aprovação conforme a LDB (Lei nº 9.394/1996).
 *
 * Art. 24, VI — ensino fundamental e médio: mínimo de 75% das horas letivas.
 * Art. 31, I e IV — pré-escola: mínimo de 60% das horas, com avaliação por
 * acompanhamento, sem promoção. Esse percentual não se estende à creche.
 *
 * A comparação usa a razão exata. O arredondamento vale só para o texto exibido.
 * Cada registro é um tempo de aula (carga horária), nunca um dia inteiro.
 * Falta justificada continua na ausência até a escola validar situação especial.
 *
 * Fase 1 (híbrido): a API pública permanece estável; a execução pode ir via
 * TypeScript, WASM (`dc_rules`) ou dual-run — ver `dcRulesEngine.ts`.
 */

export type {
  AlteracaoFrequencia,
  AvaliacaoFrequencia,
  EtapaFrequencia,
  MomentoFrequencia,
  RegistroCargaHoraria,
} from './dcRulesEngine';

export {
  arredondarPercentualParaExibicao,
  calcularFrequenciaLdb,
  classificarEtapaFrequencia,
  definirSituacaoPeriodo,
  ensureDcRulesWasm,
  getDcRulesEngine,
  getDcRulesWasmStatus,
  historicoAposAlteracao,
  hojeLocalIso,
  momentoDoAnoLetivo,
  setDcRulesEngine,
} from './dcRulesEngine';
