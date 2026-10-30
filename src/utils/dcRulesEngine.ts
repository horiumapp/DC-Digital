/**
 * Motor de regras LDB com dual-run TS ↔ WASM (Fase 1).
 *
 * - `ts` (padrão): só TypeScript — funciona sem Rust instalado.
 * - `wasm`: só WASM (fallback automático para TS se o módulo não carregar).
 * - `dual`: executa os dois e exige paridade (usado nos testes).
 *
 * Controle: `VITE_DC_RULES_ENGINE=ts|wasm|dual` ou `setDcRulesEngine(...)`.
 */

import * as tsImpl from './regraFrequenciaLdb.tsImpl';
import type {
  AlteracaoFrequencia,
  AvaliacaoFrequencia,
  EtapaFrequencia,
  MomentoFrequencia,
  RegistroCargaHoraria,
} from './regraFrequenciaLdb.tsImpl';

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
