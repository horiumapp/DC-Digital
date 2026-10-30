//! Regras pedagógicas puras do DC Digital.
//!
//! Fase 1: frequência conforme a LDB (Lei nº 9.394/1996).
//! Exposto via WASM para dual-run com a implementação TypeScript.

mod ldb;

pub use ldb::*;

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
    let refs: Vec<Option<&str>> = partes
        .iter()
        .map(|p| p.as_deref())
        .collect();
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
