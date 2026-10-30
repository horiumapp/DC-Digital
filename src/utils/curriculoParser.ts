/**
 * Parser/export de currículo (BNCC).
 * Fase 2: funções puras passam pelo motor TS↔WASM (`dcRulesEngine`).
 * Download no browser permanece em TypeScript.
 */

export type {
  CurriculoExportSource,
  CurriculoParseResult,
  ParsedCurriculoItem,
} from './curriculoParser.tsImpl';

export {
  BIMESTRES_PADRAO,
  DISCIPLINAS_PADRAO,
  downloadCsvFile,
} from './curriculoParser.tsImpl';

export {
  cleanContentText,
  exportCurriculoToCsv,
  getModalidadeForAno,
  normalizeAno,
  normalizeBimestre,
  normalizeDisciplina,
  parseCurriculoText,
} from './dcRulesEngine';
