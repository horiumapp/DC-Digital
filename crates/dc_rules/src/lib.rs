//! Regras pedagógicas e parsers puros do DC Digital.
//!
//! Fase 1: frequência LDB · Fase 2: currículo + CSV delimitado.
//! Exposto via WASM para dual-run com a implementação TypeScript.

mod csv;
mod curriculo;
mod ldb;
mod pendencias;

pub use csv::*;
pub use curriculo::*;
pub use ldb::*;
pub use pendencias::*;

use serde::de::DeserializeOwned;
use serde::Serialize;
use wasm_bindgen::prelude::*;

fn parse_json<T: DeserializeOwned>(value: &str) -> Result<T, JsValue> {
    serde_json::from_str(value).map_err(|err| JsValue::from_str(&err.to_string()))
}

fn to_json<T: Serialize>(value: &T) -> Result<String, JsValue> {
    serde_json::to_string(value).map_err(|err| JsValue::from_str(&err.to_string()))
}

/// Classifica a etapa a partir de partes de texto (ensino, fase, nome…).
#[wasm_bindgen(js_name = classificarEtapaFrequencia)]
pub fn wasm_classificar_etapa_frequencia(partes_json: &str) -> Result<String, JsValue> {
    let partes: Vec<Option<String>> = parse_json(partes_json)?;
    let refs: Vec<Option<&str>> = partes.iter().map(|p| p.as_deref()).collect();
    Ok(classificar_etapa_frequencia(refs).as_str().to_string())
}

#[wasm_bindgen(js_name = momentoDoAnoLetivo)]
pub fn wasm_momento_do_ano_letivo(hoje_iso: &str, data_fim_iso: &str) -> String {
    momento_do_ano_letivo(hoje_iso, data_fim_iso)
        .as_str()
        .to_string()
}

#[wasm_bindgen(js_name = arredondarPercentualParaExibicao)]
pub fn wasm_arredondar_percentual_para_exibicao(valor: f64) -> String {
    arredondar_percentual_para_exibicao(valor)
}

#[wasm_bindgen(js_name = calcularFrequenciaLdb)]
pub fn wasm_calcular_frequencia_ldb(entrada_json: &str) -> Result<String, JsValue> {
    let entrada: CalcularFrequenciaEntrada = parse_json(entrada_json)?;
    to_json(&calcular_frequencia_ldb(entrada))
}

#[wasm_bindgen(js_name = definirSituacaoPeriodo)]
pub fn wasm_definir_situacao_periodo(entrada_json: &str) -> Result<String, JsValue> {
    let entrada: DefinirSituacaoEntrada = parse_json(entrada_json)?;
    Ok(definir_situacao_periodo(entrada))
}

#[wasm_bindgen(js_name = historicoAposAlteracao)]
pub fn wasm_historico_apos_alteracao(
    anterior_json: &str,
    novo_json: &str,
    em: &str,
) -> Result<String, JsValue> {
    let anterior: Option<FrequenciaAnterior> = if anterior_json.trim().is_empty()
        || anterior_json.trim() == "null"
    {
        None
    } else {
        Some(parse_json(anterior_json)?)
    };
    let novo: FrequenciaNova = parse_json(novo_json)?;
    to_json(&historico_apos_alteracao(anterior.as_ref(), &novo, em))
}

// --- Fase 2: currículo + CSV ---

#[wasm_bindgen(js_name = normalizeDisciplina)]
pub fn wasm_normalize_disciplina(raw: &str) -> String {
    normalize_disciplina(raw)
}

#[wasm_bindgen(js_name = normalizeAno)]
pub fn wasm_normalize_ano(raw: &str) -> String {
    normalize_ano(raw)
}

#[wasm_bindgen(js_name = normalizeBimestre)]
pub fn wasm_normalize_bimestre(raw: &str) -> String {
    normalize_bimestre(raw)
}

#[wasm_bindgen(js_name = getModalidadeForAno)]
pub fn wasm_get_modalidade_for_ano(ano: &str) -> String {
    get_modalidade_for_ano(ano)
}

#[wasm_bindgen(js_name = cleanContentText)]
pub fn wasm_clean_content_text(value: &str) -> String {
    clean_content_text(value)
}

#[wasm_bindgen(js_name = parseCurriculoText)]
pub fn wasm_parse_curriculo_text(raw_text: &str) -> Result<String, JsValue> {
    to_json(&parse_curriculo_text(raw_text))
}

#[wasm_bindgen(js_name = exportCurriculoToCsv)]
pub fn wasm_export_curriculo_to_csv(unidades_json: &str) -> Result<String, JsValue> {
    let unidades: Vec<CurriculoExportSource> = parse_json(unidades_json)?;
    Ok(export_curriculo_to_csv(&unidades))
}

#[wasm_bindgen(js_name = parseDelimitedText)]
pub fn wasm_parse_delimited_text(text: &str) -> Result<String, JsValue> {
    to_json(&parse_delimited_text(text))
}

#[wasm_bindgen(js_name = sanitizeFormulaValue)]
pub fn wasm_sanitize_formula_value(value: &str) -> String {
    sanitize_formula_value(value)
}

// --- Fase 3: consolidação de pendências ---

#[wasm_bindgen(js_name = countWeekDaysInRange)]
pub fn wasm_count_week_days_in_range(start_iso: &str, end_iso: &str, day_of_week: u32) -> u32 {
    count_week_days_in_range(start_iso, end_iso, day_of_week)
}

#[wasm_bindgen(js_name = consolidarPendencias)]
pub fn wasm_consolidar_pendencias(entrada_json: &str) -> Result<String, JsValue> {
    let entrada: ConsolidarPendenciasInput = parse_json(entrada_json)?;
    to_json(&consolidar_pendencias(entrada))
}
