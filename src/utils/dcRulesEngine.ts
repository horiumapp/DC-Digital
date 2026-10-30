/**
 * Motor de regras/parsers com dual-run TS ↔ WASM (Fases 1–2).
 *
 * - `ts` (padrão): só TypeScript — funciona sem Rust instalado.
 * - `wasm`: só WASM (fallback automático para TS se o módulo não carregar).
 * - `dual`: executa os dois e exige paridade (usado nos testes).
 *
 * Controle: `VITE_DC_RULES_ENGINE=ts|wasm|dual` ou `setDcRulesEngine(...)`.
 */

import * as tsImpl from './regraFrequenciaLdb.tsImpl';
import * as curriculoTs from './curriculoParser.tsImpl';
import * as csvTs from './csvDelimited.tsImpl';
import * as pendenciasTs from './pendenciasConsolidar.tsImpl';
import type {
  AlteracaoFrequencia,
  AvaliacaoFrequencia,
  EtapaFrequencia,
  MomentoFrequencia,
  RegistroCargaHoraria,
} from './regraFrequenciaLdb.tsImpl';
import type {
  CurriculoExportSource,
  CurriculoParseResult,
} from './curriculoParser.tsImpl';
import type {
  ConsolidarPendenciasInput,
  PendenciaDocenteConsolidada,
} from './pendenciasConsolidar.tsImpl';

export type {
  AlteracaoFrequencia,
  AvaliacaoFrequencia,
  EtapaFrequencia,
  MomentoFrequencia,
  RegistroCargaHoraria,
};

export type DcRulesEngineMode = 'ts' | 'wasm' | 'dual';

type WasmApi = {
  classificarEtapaFrequencia: (partesJson: string) => string;
  momentoDoAnoLetivo: (hojeIso: string, dataFimIso: string) => string;
  arredondarPercentualParaExibicao: (valor: number) => string;
  calcularFrequenciaLdb: (entradaJson: string) => string;
  definirSituacaoPeriodo: (entradaJson: string) => string;
  historicoAposAlteracao: (anteriorJson: string, novoJson: string, em: string) => string;
  normalizeDisciplina: (raw: string) => string;
  normalizeAno: (raw: string) => string;
  normalizeBimestre: (raw: string) => string;
  getModalidadeForAno: (ano: string) => string;
  cleanContentText: (value: string) => string;
  parseCurriculoText: (rawText: string) => string;
  exportCurriculoToCsv: (unidadesJson: string) => string;
  parseDelimitedText: (text: string) => string;
  sanitizeFormulaValue: (value: string) => string;
  countWeekDaysInRange: (startIso: string, endIso: string, dayOfWeek: number) => number;
  consolidarPendencias: (entradaJson: string) => string;
  default?: (moduleOrPath?: unknown) => Promise<unknown>;
  initSync?: (module: unknown) => unknown;
};

let mode: DcRulesEngineMode = normalizeMode(
  (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_DC_RULES_ENGINE)
  || (typeof process !== 'undefined' ? process.env?.VITE_DC_RULES_ENGINE : undefined)
  || 'ts'
);

let wasmApi: WasmApi | null = null;
let wasmLoadAttempted = false;
let wasmLoadError: string | null = null;

function normalizeMode(value: string | undefined): DcRulesEngineMode {
  if (value === 'wasm' || value === 'dual' || value === 'ts') return value;
  return 'ts';
}

export function setDcRulesEngine(next: DcRulesEngineMode): void {
  mode = next;
}

export function getDcRulesEngine(): DcRulesEngineMode {
  return mode;
}

export function getDcRulesWasmStatus(): {
  loaded: boolean;
  error: string | null;
  attempted: boolean;
} {
  return {
    loaded: wasmApi !== null,
    error: wasmLoadError,
    attempted: wasmLoadAttempted,
  };
}

function assertParity(label: string, fromTs: unknown, fromWasm: unknown): void {
  const left = JSON.stringify(fromTs);
  const right = JSON.stringify(fromWasm);
  if (left !== right) {
    throw new Error(
      `[dc_rules dual-run] divergência em ${label}\nTS:   ${left}\nWASM: ${right}`
    );
  }
}

async function loadWasm(): Promise<WasmApi | null> {
  if (wasmApi) return wasmApi;
  if (wasmLoadAttempted && wasmApi === null) return null;
  wasmLoadAttempted = true;
  try {
    const mod = (await import('../wasm/dc_rules/dc_rules.js')) as WasmApi;
    if (typeof mod.default === 'function') {
      await mod.default();
    }
    wasmApi = mod;
    wasmLoadError = null;
    return wasmApi;
  } catch (err) {
    wasmLoadError = err instanceof Error ? err.message : String(err);
    wasmApi = null;
    return null;
  }
}

/** Pré-carrega WASM (útil em testes dual-run). */
export async function ensureDcRulesWasm(): Promise<boolean> {
  const api = await loadWasm();
  return api !== null;
}

export function hojeLocalIso(data = new Date()): string {
  return tsImpl.hojeLocalIso(data);
}

export function classificarEtapaFrequencia(
  ...partes: Array<string | null | undefined>
): EtapaFrequencia {
  const fromTs = tsImpl.classificarEtapaFrequencia(...partes);
  if (mode === 'ts' || !wasmApi) return fromTs;

  const fromWasm = wasmApi.classificarEtapaFrequencia(JSON.stringify(partes)) as EtapaFrequencia;
  if (mode === 'dual') assertParity('classificarEtapaFrequencia', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function momentoDoAnoLetivo(hojeIso: string, dataFimIso: string): MomentoFrequencia {
  const fromTs = tsImpl.momentoDoAnoLetivo(hojeIso, dataFimIso);
  if (mode === 'ts' || !wasmApi) return fromTs;

  const fromWasm = wasmApi.momentoDoAnoLetivo(hojeIso, dataFimIso) as MomentoFrequencia;
  if (mode === 'dual') assertParity('momentoDoAnoLetivo', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function arredondarPercentualParaExibicao(valor: number): string {
  const fromTs = tsImpl.arredondarPercentualParaExibicao(valor);
  if (mode === 'ts' || !wasmApi) return fromTs;

  const fromWasm = wasmApi.arredondarPercentualParaExibicao(valor);
  if (mode === 'dual') assertParity('arredondarPercentualParaExibicao', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function calcularFrequenciaLdb(entrada: {
  etapa: EtapaFrequencia;
  momento: MomentoFrequencia;
  registros: RegistroCargaHoraria[];
}): AvaliacaoFrequencia {
  const fromTs = tsImpl.calcularFrequenciaLdb(entrada);
  if (mode === 'ts' || !wasmApi) return fromTs;

  const fromWasm = JSON.parse(wasmApi.calcularFrequenciaLdb(JSON.stringify(entrada))) as AvaliacaoFrequencia;
  if (mode === 'dual') assertParity('calcularFrequenciaLdb', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function definirSituacaoPeriodo(entrada: {
  etapa: EtapaFrequencia;
  avaliacao: AvaliacaoFrequencia;
  notasSuficientes: boolean | null;
}): string {
  const fromTs = tsImpl.definirSituacaoPeriodo(entrada);
  if (mode === 'ts' || !wasmApi) return fromTs;

  const fromWasm = wasmApi.definirSituacaoPeriodo(JSON.stringify(entrada));
  if (mode === 'dual') assertParity('definirSituacaoPeriodo', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function historicoAposAlteracao(
  anterior: { status?: string; participacao?: string; historico?: AlteracaoFrequencia[] } | undefined,
  novo: { status: string; participacao?: string },
  em: string
): AlteracaoFrequencia[] {
  const fromTs = tsImpl.historicoAposAlteracao(anterior, novo, em);
  if (mode === 'ts' || !wasmApi) return fromTs;

  const fromWasm = JSON.parse(
    wasmApi.historicoAposAlteracao(
      anterior === undefined ? 'null' : JSON.stringify(anterior),
      JSON.stringify(novo),
      em
    )
  ) as AlteracaoFrequencia[];
  if (mode === 'dual') assertParity('historicoAposAlteracao', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

// --- Fase 2: currículo + CSV delimitado ---

export function normalizeDisciplina(raw: string): string {
  const fromTs = curriculoTs.normalizeDisciplina(raw);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = wasmApi.normalizeDisciplina(raw);
  if (mode === 'dual') assertParity('normalizeDisciplina', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function normalizeAno(raw: string): string {
  const fromTs = curriculoTs.normalizeAno(raw);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = wasmApi.normalizeAno(raw);
  if (mode === 'dual') assertParity('normalizeAno', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function normalizeBimestre(raw: string): string {
  const fromTs = curriculoTs.normalizeBimestre(raw);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = wasmApi.normalizeBimestre(raw);
  if (mode === 'dual') assertParity('normalizeBimestre', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function getModalidadeForAno(ano: string): string {
  const fromTs = curriculoTs.getModalidadeForAno(ano);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = wasmApi.getModalidadeForAno(ano);
  if (mode === 'dual') assertParity('getModalidadeForAno', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function cleanContentText(str: string): string {
  const fromTs = curriculoTs.cleanContentText(str);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = wasmApi.cleanContentText(str);
  if (mode === 'dual') assertParity('cleanContentText', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function parseCurriculoText(rawText: string): CurriculoParseResult {
  const fromTs = curriculoTs.parseCurriculoText(rawText);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = JSON.parse(wasmApi.parseCurriculoText(rawText)) as CurriculoParseResult;
  if (mode === 'dual') assertParity('parseCurriculoText', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function exportCurriculoToCsv(unidades: CurriculoExportSource[]): string {
  const fromTs = curriculoTs.exportCurriculoToCsv(unidades);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = wasmApi.exportCurriculoToCsv(JSON.stringify(unidades));
  if (mode === 'dual') assertParity('exportCurriculoToCsv', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function parseDelimitedText(text: string): { headers: string[]; rows: string[][] } {
  const fromTs = csvTs.parseDelimitedText(text);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = JSON.parse(wasmApi.parseDelimitedText(text)) as {
    headers: string[];
    rows: string[][];
  };
  if (mode === 'dual') assertParity('parseDelimitedText', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function sanitizeFormulaValueString(value: string): string {
  const fromTs = csvTs.sanitizeFormulaValue(value);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = wasmApi.sanitizeFormulaValue(value);
  if (mode === 'dual') assertParity('sanitizeFormulaValue', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

// --- Fase 3: consolidação de pendências ---

export function countWeekDaysInRangeIso(
  startIso: string,
  endIso: string,
  dayOfWeek: number
): number {
  const fromTs = pendenciasTs.countWeekDaysInRangeIso(startIso, endIso, dayOfWeek);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = wasmApi.countWeekDaysInRange(startIso, endIso, dayOfWeek);
  if (mode === 'dual') assertParity('countWeekDaysInRange', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

export function consolidarPendencias(
  input: ConsolidarPendenciasInput
): PendenciaDocenteConsolidada[] {
  const fromTs = pendenciasTs.consolidarPendencias(input);
  if (mode === 'ts' || !wasmApi) return fromTs;
  const fromWasm = JSON.parse(
    wasmApi.consolidarPendencias(JSON.stringify(input))
  ) as PendenciaDocenteConsolidada[];
  if (mode === 'dual') assertParity('consolidarPendencias', fromTs, fromWasm);
  return mode === 'wasm' ? fromWasm : fromTs;
}

/**
 * Opcional: consolida via API Rust (`dc_rules_api`) em vez do motor local.
 * Requer `VITE_DC_RULES_API_URL`. A busca com RLS continua no cliente.
 */
export async function consolidarPendenciasViaApi(
  input: ConsolidarPendenciasInput,
  accessToken?: string | null
): Promise<PendenciaDocenteConsolidada[]> {
  const base = (typeof import.meta !== 'undefined'
    && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_DC_RULES_API_URL)
    || (typeof process !== 'undefined' ? process.env?.VITE_DC_RULES_API_URL : undefined);

  if (!base) {
    return consolidarPendencias(input);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${base.replace(/\/$/, '')}/v1/pendencias/consolidar`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    throw new Error(`dc_rules_api ${res.status}: ${await res.text()}`);
  }
  const body = (await res.json()) as { data: PendenciaDocenteConsolidada[] };
  return body.data;
}
