//! Parse/export delimitado puro (CSV/TSV) — Fase 2.
//! Download no browser permanece no TypeScript.

use serde::{Deserialize, Serialize};

/// Protege contra CSV/Formula Injection (DDE): prefixa `'` se começar com = + - @ \\t \\r.
pub fn sanitize_formula_value(value: &str) -> String {
    let trimmed = value.trim();
    let dangerous = trimmed
        .chars()
        .next()
        .map(|c| matches!(c, '=' | '+' | '-' | '@' | '\t' | '\r'))
        .unwrap_or(false);
    if dangerous {
        format!("'{value}")
    } else {
        value.to_string()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DelimitedParseResult {
    pub headers: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

/// Analisador robusto de texto delimitado (CSV / TSV).
/// Espelha `parseDelimitedText` do TypeScript.
pub fn parse_delimited_text(text: &str) -> DelimitedParseResult {
    let clean = text.trim_start_matches('\u{FEFF}').trim();
    if clean.is_empty() {
        return DelimitedParseResult {
            headers: Vec::new(),
            rows: Vec::new(),
        };
    }

    let lines: Vec<&str> = clean
        .lines()
        .filter(|l| !l.trim().is_empty())
        .collect();
    if lines.is_empty() {
        return DelimitedParseResult {
            headers: Vec::new(),
            rows: Vec::new(),
        };
    }

    let first_line = lines[0];
    let count_semi = first_line.chars().filter(|c| *c == ';').count();
    let count_comma = first_line.chars().filter(|c| *c == ',').count();
    let count_tab = first_line.chars().filter(|c| *c == '\t').count();

    let delimiter = if count_tab > count_semi && count_tab > count_comma {
        '\t'
    } else if count_comma > count_semi {
        ','
    } else {
        ';'
    };

    let split_line = |line: &str| -> Vec<String> {
        let mut entries = Vec::new();
        let mut cur = String::new();
        let chars: Vec<char> = line.chars().collect();
        let mut in_quotes = false;
        let mut i = 0;
        while i < chars.len() {
            let ch = chars[i];
            if ch == '"' {
                if in_quotes && i + 1 < chars.len() && chars[i + 1] == '"' {
                    cur.push('"');
                    i += 1;
                } else {
                    in_quotes = !in_quotes;
                }
            } else if ch == delimiter && !in_quotes {
                entries.push(cur.trim().to_string());
                cur.clear();
            } else {
                cur.push(ch);
            }
            i += 1;
        }
        entries.push(cur.trim().to_string());
        entries
    };

    let parsed: Vec<Vec<String>> = lines.iter().map(|l| split_line(l)).collect();
    let headers = parsed[0]
        .iter()
        .map(|h| {
            h.trim_matches(|c| c == '"' || c == '\'')
                .trim()
                .to_string()
        })
        .collect();
    let rows = parsed
        .into_iter()
        .skip(1)
        .filter(|r| r.iter().any(|c| !c.is_empty()))
        .collect();

    DelimitedParseResult { headers, rows }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detecta_ponto_e_virgula_e_aspas() {
        let text = "Nome;Valor\n\"A;B\";1\n";
        let parsed = parse_delimited_text(text);
        assert_eq!(parsed.headers, vec!["Nome", "Valor"]);
        assert_eq!(parsed.rows[0], vec!["A;B", "1"]);
    }

    #[test]
    fn sanitiza_formula() {
        assert_eq!(sanitize_formula_value("=cmd"), "'=cmd");
        assert_eq!(sanitize_formula_value("ok"), "ok");
    }
}
