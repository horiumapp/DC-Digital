declare const init: (module_or_path?: unknown) => Promise<unknown>;
export default init;
export function classificarEtapaFrequencia(partesJson: string): string;
export function momentoDoAnoLetivo(hojeIso: string, dataFimIso: string): string;
export function arredondarPercentualParaExibicao(valor: number): string;
export function calcularFrequenciaLdb(entradaJson: string): string;
export function definirSituacaoPeriodo(entradaJson: string): string;
export function historicoAposAlteracao(anteriorJson: string, novoJson: string, em: string): string;
