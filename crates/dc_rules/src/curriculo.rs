//! Parser/export de currículo (BNCC) — Fase 2.
//! Download no browser permanece no TypeScript.

use crate::csv::sanitize_formula_value;
use serde::{Deserialize, Serialize};
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ParsedCurriculoItem {
    pub modalidade: String,
    pub ano: String,
    pub disciplina: String,
    pub bimestre: String,
    pub nome: String,
    pub objetos: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct CurriculoParseResult {
    pub records: Vec<ParsedCurriculoItem>,
    pub total_objetos: usize,
    pub anos_encontrados: Vec<String>,
    pub disciplinas_encontradas: Vec<String>,
    pub bimestres_encontrados: Vec<String>,
    pub avisos: Vec<String>,
}

pub const BIMESTRES_PADRAO: [&str; 4] = [
    "1º Bimestre",
    "2º Bimestre",
    "3º Bimestre",
    "4º Bimestre",
];

fn clean_header_string(c: &str) -> String {
    c.trim()
        .to_uppercase()
        .nfd()
        .filter(|ch| !unicode_normalization::char::is_combining_mark(*ch))
        .collect::<String>()
        .replace(['\u{FFFD}', '\u{00A0}'], " ")
        .trim()
        .to_string()
}

pub fn normalize_disciplina(raw: &str) -> String {
    let s = clean_header_string(raw);
    if s.contains("PORTUG") {
        return "Português".into();
    }
    if s.contains("MATEM") {
        return "Matemática".into();
    }
    if s.contains("HIST") {
        return "História".into();
    }
    if s.contains("GEOG") {
        return "Geografia".into();
    }
    if s.contains("ARTE") {
        return "Artes".into();
    }
    if s.contains("CIENC") || s.contains("CINC") {
        return "Ciências".into();
    }
    if s.contains("FISIC") {
        return "Educação Física".into();
    }
    if s.contains("RELIG") {
        return "Ensino Religioso".into();
    }
    if s.contains("ESPANH") {
        return "Espanhol".into();
    }
    if s.contains("INGL") {
        return "Inglês".into();
    }
    raw.trim().to_string()
}

fn first_digits(raw: &str) -> Option<String> {
    let mut out = String::new();
    for c in raw.chars() {
        if c.is_ascii_digit() {
            out.push(c);
        } else if !out.is_empty() {
            break;
        }
    }
    if out.is_empty() {
        None
    } else {
        Some(out)
    }
}

pub fn normalize_ano(raw: &str) -> String {
    if let Some(n) = first_digits(raw) {
        return format!("{n}º Ano");
    }
    raw.trim().to_string()
}

pub fn normalize_bimestre(raw: &str) -> String {
    for c in raw.chars() {
        if matches!(c, '1' | '2' | '3' | '4') {
            return format!("{c}º Bimestre");
        }
    }
    raw.trim().to_string()
}

pub fn get_modalidade_for_ano(ano: &str) -> String {
    if let Some(n) = first_digits(ano) {
        if let Ok(num) = n.parse::<i32>() {
            if (1..=5).contains(&num) {
                return "Fundamental Anos Iniciais (1° ao 5° ANO)".into();
            }
            if (6..=9).contains(&num) {
                return "Fundamental Anos Finais (6° ao 9° ANO)".into();
            }
        }
    }
    "Fundamental Anos Iniciais (1° ao 5° ANO)".into()
}

fn is_leading_content_junk(c: char) -> bool {
    c.is_whitespace()
        || matches!(
            c,
            '-' | '–' | '—' | '•' | '*' | '.' | ')' | '\u{FFFD}'
        )
        || c.is_ascii_digit()
}

pub fn clean_content_text(str_in: &str) -> String {
    let trimmed_start: String = str_in
        .chars()
        .skip_while(|c| is_leading_content_junk(*c))
        .collect();
    let mut out = String::new();
    let mut prev_space = false;
    for c in trimmed_start.chars() {
        if c.is_whitespace() {
            if !prev_space && !out.is_empty() {
                out.push(' ');
                prev_space = true;
            }
        } else {
            out.push(c);
            prev_space = false;
        }
    }
    out.trim().to_string()
}

fn is_subject_header_cell(c: &str) -> bool {
    if c.is_empty() || c.chars().count() > 40 {
        return false;
    }
    let s = clean_header_string(c);
    const PREFIXES: &[&str] = &[
        "GEOGRAFIA",
        "HIST",
        "MATEM",
        "PORTUG",
        "ARTES",
        "CIENC",
        "CINC",
        "ESPANHOL",
        "INGL",
    ];
    if PREFIXES.iter().any(|p| s.starts_with(p)) {
        return true;
    }
    if s.starts_with("ENSINO") && s.contains("RELIGIOSO") {
        return true;
    }
    // EDUCA.*FISIC
    if let Some(pos) = s.find("EDUCA") {
        if s[pos..].contains("FISIC") {
            return true;
        }
    }
    false
}

fn split_cells_tab_semi(line: &str) -> Vec<String> {
    line.split(['\t', ';'])
        .map(|c| c.trim().to_string())
        .collect()
}

fn is_bimestre_header_row(line: &str) -> bool {
    let cells: Vec<String> = split_cells_tab_semi(line)
        .into_iter()
        .filter(|c| !c.is_empty())
        .collect();
    if cells.is_empty() {
        return false;
    }
    let bim_cells = cells
        .iter()
        .filter(|c| c.to_uppercase().contains("BIMESTRE"))
        .count();
    bim_cells >= 2 || cells[0].to_uppercase().contains("BIMESTRE")
}

fn unique_preserve(items: impl IntoIterator<Item = String>) -> Vec<String> {
    let mut out = Vec::new();
    for item in items {
        if !out.contains(&item) {
            out.push(item);
        }
    }
    out
}

fn empty_result(avisos: Vec<String>) -> CurriculoParseResult {
    CurriculoParseResult {
        records: Vec::new(),
        total_objetos: 0,
        anos_encontrados: Vec::new(),
        disciplinas_encontradas: Vec::new(),
        bimestres_encontrados: Vec::new(),
        avisos,
    }
}

fn finish_records(records: Vec<ParsedCurriculoItem>, avisos: Vec<String>) -> CurriculoParseResult {
    let total_objetos = records.iter().map(|r| r.objetos.len()).sum();
    CurriculoParseResult {
        anos_encontrados: unique_preserve(records.iter().map(|r| r.ano.clone())),
        disciplinas_encontradas: unique_preserve(records.iter().map(|r| r.disciplina.clone())),
        bimestres_encontrados: unique_preserve(records.iter().map(|r| r.bimestre.clone())),
        total_objetos,
        records,
        avisos,
    }
}

fn split_line_by_line_cells(line: &str) -> Vec<String> {
    line.split(['\t', ';', ','])
        .map(|c| c.trim().to_string())
        .collect()
}

fn parse_line_by_line_format(lines: &[&str], header_cells: &[String]) -> CurriculoParseResult {
    let avisos = Vec::new();
    let mut records: Vec<ParsedCurriculoItem> = Vec::new();
    let mut index_by_key: std::collections::HashMap<String, usize> =
        std::collections::HashMap::new();

    let disc_col = header_cells
        .iter()
        .position(|c| c.contains("disciplina"))
        .map(|i| i as isize)
        .unwrap_or(-1);
    let ano_col = header_cells
        .iter()
        .position(|c| c.contains("ano") || c.contains("serie") || c.contains("série"))
        .map(|i| i as isize)
        .unwrap_or(-1);
    let bim_col = header_cells
        .iter()
        .position(|c| c.contains("bimestre"))
        .map(|i| i as isize)
        .unwrap_or(-1);
    let cont_col = header_cells
        .iter()
        .position(|c| c.contains("conteudo") || c.contains("conteúdo") || c.contains("objeto"))
        .map(|i| i as isize)
        .unwrap_or(-1);
    let mod_col = header_cells
        .iter()
        .position(|c| c.contains("modalidade"))
        .map(|i| i as isize)
        .unwrap_or(-1);

    let cell_at = |cells: &[String], idx: isize| -> String {
        if idx < 0 {
            return String::new();
        }
        cells.get(idx as usize).cloned().unwrap_or_default()
    };

    for line in lines.iter().skip(1) {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let cells = split_line_by_line_cells(line);
        if cells.len() < 3 {
            continue;
        }

        let raw_disc = cell_at(&cells, disc_col);
        let raw_ano = cell_at(&cells, ano_col);
        let raw_bim = if bim_col >= 0 {
            cell_at(&cells, bim_col)
        } else {
            "1º Bimestre".into()
        };
        let raw_cont = cell_at(&cells, cont_col);
        let raw_mod = if mod_col >= 0 {
            cell_at(&cells, mod_col)
        } else {
            String::new()
        };

        if raw_disc.is_empty() || raw_cont.is_empty() {
            continue;
        }

        let disciplina = normalize_disciplina(&raw_disc);
        let ano = normalize_ano(&raw_ano);
        let bimestre = normalize_bimestre(&raw_bim);
        let modalidade = if raw_mod.is_empty() {
            get_modalidade_for_ano(&ano)
        } else {
            raw_mod
        };
        let conteudo = clean_content_text(&raw_cont);
        if conteudo.is_empty() {
            continue;
        }

        let key = format!("{modalidade}|{ano}|{disciplina}|{bimestre}");
        if let Some(&idx) = index_by_key.get(&key) {
            if !records[idx].objetos.contains(&conteudo) {
                records[idx].objetos.push(conteudo);
            }
        } else {
            index_by_key.insert(key, records.len());
            records.push(ParsedCurriculoItem {
                modalidade,
                ano,
                disciplina,
                bimestre,
                nome: conteudo.clone(),
                objetos: vec![conteudo],
            });
        }
    }

    finish_records(records, avisos)
}

fn extract_ano_from_header(h_cell: &str, col_idx: usize, block_idx: usize) -> String {
    let upper = h_cell.to_uppercase();
    // /(\d+)\s*º?\s*ANO/i
    let chars: Vec<char> = upper.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        if chars[i].is_ascii_digit() {
            let mut digits = String::new();
            while i < chars.len() && chars[i].is_ascii_digit() {
                digits.push(chars[i]);
                i += 1;
            }
            while i < chars.len() && chars[i].is_whitespace() {
                i += 1;
            }
            if i < chars.len() && (chars[i] == 'º' || chars[i] == '°') {
                i += 1;
                while i < chars.len() && chars[i].is_whitespace() {
                    i += 1;
                }
            }
            if i + 2 < chars.len()
                && chars[i] == 'A'
                && chars[i + 1] == 'N'
                && chars[i + 2] == 'O'
            {
                return format!("{digits}º Ano");
            }
            continue;
        }
        i += 1;
    }

    if col_idx < 4 {
        format!("{}º Ano", block_idx + 1)
    } else if block_idx == 0 {
        "6º Ano".into()
    } else {
        "7º Ano".into()
    }
}

fn parse_matrix_format(lines: &[&str], mut avisos: Vec<String>) -> CurriculoParseResult {
    let mut header_indices = Vec::new();
    for (idx, l) in lines.iter().enumerate() {
        let cells: Vec<String> = split_cells_tab_semi(l)
            .into_iter()
            .filter(|c| !c.is_empty())
            .collect();
        let subject_headers = cells
            .iter()
            .filter(|c| is_subject_header_cell(c))
            .count();
        if subject_headers >= 4 {
            header_indices.push(idx);
        }
    }

    if header_indices.is_empty() {
        avisos.push("Nenhum cabeçalho de disciplinas reconhecido no arquivo.".into());
        return empty_result(avisos);
    }

    let mut records = Vec::new();

    for (block_idx, &h_idx) in header_indices.iter().enumerate() {
        let header_cells = split_cells_tab_semi(lines[h_idx]);
        let next_h_idx = header_indices
            .get(block_idx + 1)
            .copied()
            .unwrap_or(lines.len());
        let block_lines = &lines[h_idx + 1..next_h_idx];

        let mut b_markers = Vec::new();
        for (offset, bl) in block_lines.iter().enumerate() {
            if is_bimestre_header_row(bl) {
                b_markers.push(offset);
            }
        }

        for (col_idx, h_cell) in header_cells.iter().enumerate() {
            if !is_subject_header_cell(h_cell) {
                continue;
            }
            let disciplina = normalize_disciplina(h_cell);
            let ano = extract_ano_from_header(h_cell, col_idx, block_idx);
            let modalidade = get_modalidade_for_ano(&ano);

            for (b_idx, &b_offset) in b_markers.iter().enumerate() {
                let bim_name = BIMESTRES_PADRAO
                    .get(b_idx)
                    .map(|s| (*s).to_string())
                    .unwrap_or_else(|| format!("{}º Bimestre", b_idx + 1));
                let start_line = b_offset + 1;
                let end_line = b_markers
                    .get(b_idx + 1)
                    .copied()
                    .unwrap_or(block_lines.len());

                let mut objetos = Vec::new();
                for r in start_line..end_line {
                    let row_cells = split_cells_tab_semi(block_lines[r]);
                    let cell = row_cells.get(col_idx).map(|s| s.as_str()).unwrap_or("");
                    let cleaned = clean_content_text(cell.trim());
                    if !cleaned.is_empty()
                        && !cleaned.to_uppercase().contains("BIMESTRE")
                        && cleaned.chars().count() > 1
                        && !objetos.contains(&cleaned)
                    {
                        objetos.push(cleaned);
                    }
                }

                if !objetos.is_empty() {
                    records.push(ParsedCurriculoItem {
                        modalidade: modalidade.clone(),
                        ano: ano.clone(),
                        disciplina: disciplina.clone(),
                        bimestre: bim_name,
                        nome: objetos[0].clone(),
                        objetos,
                    });
                }
            }
        }
    }

    finish_records(records, avisos)
}

pub fn parse_curriculo_text(raw_text: &str) -> CurriculoParseResult {
    if raw_text.trim().is_empty() {
        return empty_result(vec!["Texto vazio ou não fornecido.".into()]);
    }

    let lines: Vec<&str> = raw_text.lines().collect();
    let first_non_empty = lines
        .iter()
        .find(|l| !l.trim().is_empty())
        .copied()
        .unwrap_or("");
    let first_cells: Vec<String> = split_line_by_line_cells(first_non_empty)
        .into_iter()
        .map(|c| c.to_lowercase())
        .collect();

    // Espelha Array.includes (célula inteira), não substring.
    let has_line_by_line = first_cells.iter().any(|c| c.as_str() == "disciplina")
        && first_cells
            .iter()
            .any(|c| matches!(c.as_str(), "ano" | "serie" | "série"))
        && first_cells.iter().any(|c| {
            matches!(c.as_str(), "conteudo" | "conteúdo" | "objeto")
        });

    if has_line_by_line {
        return parse_line_by_line_format(&lines, &first_cells);
    }

    parse_matrix_format(&lines, Vec::new())
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurriculoExportSource {
    pub modalidade: String,
    pub ano: String,
    pub disciplina: String,
    pub bimestre: String,
    #[serde(default)]
    pub nome: Option<String>,
    #[serde(default)]
    pub objetos: Vec<CurriculoObjetoExport>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(untagged)]
pub enum CurriculoObjetoExport {
    Texto(String),
    Obj {
        #[serde(default)]
        id: Option<String>,
        #[serde(default)]
        descricao: Option<String>,
    },
}

impl CurriculoObjetoExport {
    fn descricao(&self) -> String {
        match self {
            Self::Texto(s) => s.clone(),
            Self::Obj { descricao, .. } => descricao.clone().unwrap_or_default(),
        }
    }
}

fn escape_csv_cell(val: &str) -> String {
    let sanitized = sanitize_formula_value(val);
    if sanitized.contains(';')
        || sanitized.contains('"')
        || sanitized.contains('\n')
        || sanitized.contains('\r')
    {
        format!("\"{}\"", sanitized.replace('"', "\"\""))
    } else {
        sanitized
    }
}

pub fn export_curriculo_to_csv(unidades: &[CurriculoExportSource]) -> String {
    let mut rows = vec!["Modalidade;Ano;Disciplina;Bimestre;Conteúdo".to_string()];
    for u in unidades {
        for o in &u.objetos {
            let desc = o.descricao();
            if desc.trim().is_empty() {
                continue;
            }
            rows.push(
                [
                    escape_csv_cell(&u.modalidade),
                    escape_csv_cell(&u.ano),
                    escape_csv_cell(&u.disciplina),
                    escape_csv_cell(&u.bimestre),
                    escape_csv_cell(desc.trim()),
                ]
                .join(";"),
            );
        }
    }
    format!("\u{FEFF}{}", rows.join("\r\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normaliza_disciplina_e_ano() {
        assert_eq!(normalize_disciplina("PORTUGUÊS 6º ANO"), "Português");
        assert_eq!(normalize_ano("1º ANO"), "1º Ano");
        assert_eq!(
            get_modalidade_for_ano("6º Ano"),
            "Fundamental Anos Finais (6° ao 9° ANO)"
        );
    }

    #[test]
    fn parse_csv_linha_a_linha() {
        let csv = "Ano;Disciplina;Bimestre;Conteúdo\n6º Ano;Matemática;1º Bimestre;Sistema de numeração decimal\n";
        let result = parse_curriculo_text(csv);
        assert_eq!(result.records.len(), 1);
        assert_eq!(result.total_objetos, 1);
    }
}
