//! Consolidação pura de pendências docentes — Fase 3.
//!
//! A busca no banco (RLS / RPC) permanece no TypeScript/Supabase.
//! Este módulo só calcula percentuais a partir de dados já autorizados.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct PendenciaDocente {
    pub professor: String,
    pub data_lotacao: String,
    pub periodo: String,
    pub turno: String,
    pub ensino: String,
    pub fase: String,
    pub turma: String,
    pub componente: String,
    pub pend_notas: f64,
    pub pend_freq: f64,
    pub pend_objeto: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unidade: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PendenciaGrupoInput {
    pub professor: String,
    pub turma_id: String,
    pub turma: String,
    pub componente: String,
    pub periodo: String,
    pub turno: String,
    pub ensino: String,
    pub fase: String,
    pub tempos: Vec<String>,
    pub total_aulas_esperadas: f64,
    /// YYYY-MM-DD (data local do início do período efetivo)
    pub date_start: String,
    /// YYYY-MM-DD (data local do fim do período efetivo)
    pub date_end: String,
    pub periodo_variants: Vec<String>,
    pub data_lotacao: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LancamentoSlot {
    pub turma_id: String,
    pub disciplina: String,
    pub tempo: String,
    pub data: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AvaliacaoRef {
    pub id: String,
    pub turma_id: String,
    pub disciplina: String,
    pub bimestre: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContagemChave {
    pub key: String,
    pub total: f64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConsolidarPendenciasInput {
    pub groups: Vec<PendenciaGrupoInput>,
    pub frequencias: Vec<LancamentoSlot>,
    pub conteudos: Vec<LancamentoSlot>,
    pub avaliacoes: Vec<AvaliacaoRef>,
    /// key = turmaId
    pub aluno_counts: Vec<ContagemChave>,
    /// key = avaliacaoId
    pub notas_counts: Vec<ContagemChave>,
}

/// Conta ocorrências de um dia da semana (0=dom … 6=sáb) em [start, end] inclusivo.
/// Datas em YYYY-MM-DD. Algoritmo O(1) — espelha o TypeScript.
pub fn count_week_days_in_range(start_iso: &str, end_iso: &str, day_of_week: u32) -> u32 {
    let Some(start) = parse_iso_ymd(start_iso) else {
        return 0;
    };
    let Some(end) = parse_iso_ymd(end_iso) else {
        return 0;
    };
    if start > end {
        return 0;
    }
    let total_days = (end - start) + 1;
    let full_weeks = (total_days / 7) as u32;
    let remainder = (total_days % 7) as u32;
    let start_day = weekday_sunday0(start);
    let mut extra = 0u32;
    for i in 0..remainder {
        if (start_day + i) % 7 == day_of_week {
            extra = 1;
            break;
        }
    }
    full_weeks + extra
}

fn parse_iso_ymd(iso: &str) -> Option<i64> {
    let parts: Vec<&str> = iso.split('-').collect();
    if parts.len() != 3 {
        return None;
    }
    let y: i32 = parts[0].parse().ok()?;
    let m: u32 = parts[1].parse().ok()?;
    let d: u32 = parts[2].parse().ok()?;
    if m == 0 || m > 12 || d == 0 || d > 31 {
        return None;
    }
    Some(days_from_civil(y, m, d))
}

/// Howard Hinnant days_from_civil — dias desde epoch civil (1970-01-01 = 0 em proleptic).
fn days_from_civil(y: i32, m: u32, d: u32) -> i64 {
    let mut y = y;
    let m = m as i32;
    let d = d as i32;
    y -= if m <= 2 { 1 } else { 0 };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = (y - era * 400) as i64;
    let m_adj = if m > 2 { m - 3 } else { m + 9 };
    let doy = ((153 * m_adj + 2) / 5 + d - 1) as i64;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era as i64 * 146097 + doe - 719468
}

fn weekday_sunday0(days: i64) -> u32 {
    // 1970-01-01 was Thursday (4). Sunday=0 → (days + 4) % 7.
    (days + 4).rem_euclid(7) as u32
}

fn normalize_data_field(d: &str) -> Option<String> {
    if d.is_empty() {
        return None;
    }
    if d.contains('/') {
        let parts: Vec<&str> = d.split('/').collect();
        if parts.len() != 3 {
            return None;
        }
        let dia: u32 = parts[0].parse().ok()?;
        let mes: u32 = parts[1].parse().ok()?;
        let ano: i32 = parts[2].parse().ok()?;
        return Some(format!("{ano:04}-{mes:02}-{dia:02}"));
    }
    if d.len() >= 10 && d.as_bytes().get(4) == Some(&b'-') {
        return Some(d[..10].to_string());
    }
    None
}

fn round2(valor: f64) -> f64 {
    (valor * 100.0).round() / 100.0
}

fn pct_pendencia(esperadas: f64, feitas: f64) -> f64 {
    if esperadas <= 0.0 {
        return 0.0;
    }
    round2(((esperadas - feitas).max(0.0) / esperadas) * 100.0)
}

/// Consolida percentuais de pendência para os grupos informados.
pub fn consolidar_pendencias(input: ConsolidarPendenciasInput) -> Vec<PendenciaDocente> {
    use std::collections::{HashMap, HashSet};

    let mut freq_index: HashMap<String, Vec<(String, String)>> = HashMap::new();
    for f in &input.frequencias {
        let key = format!("{}|{}", f.turma_id, f.disciplina);
        freq_index
            .entry(key)
            .or_default()
            .push((f.data.clone(), f.tempo.clone()));
    }

    let mut cont_index: HashMap<String, Vec<(String, String)>> = HashMap::new();
    for c in &input.conteudos {
        let key = format!("{}|{}", c.turma_id, c.disciplina);
        cont_index
            .entry(key)
            .or_default()
            .push((c.data.clone(), c.tempo.clone()));
    }

    let mut av_index: HashMap<String, Vec<&AvaliacaoRef>> = HashMap::new();
    for av in &input.avaliacoes {
        let key = format!("{}|{}", av.turma_id, av.disciplina);
        av_index.entry(key).or_default().push(av);
    }

    let aluno_counts: HashMap<&str, f64> = input
        .aluno_counts
        .iter()
        .map(|c| (c.key.as_str(), c.total))
        .collect();
    let notas_counts: HashMap<&str, f64> = input
        .notas_counts
        .iter()
        .map(|c| (c.key.as_str(), c.total))
        .collect();

    let mut out = Vec::with_capacity(input.groups.len());

    for group in &input.groups {
        let tempos: HashSet<&str> = group.tempos.iter().map(|s| s.as_str()).collect();
        let group_key = format!("{}|{}", group.turma_id, group.componente);
        let variants: HashSet<String> = group
            .periodo_variants
            .iter()
            .map(|v| v.to_uppercase())
            .collect();

        let freq_count = {
            let mut seen = HashSet::new();
            for (data, tempo) in freq_index.get(&group_key).into_iter().flatten() {
                if !tempos.contains(tempo.as_str()) {
                    continue;
                }
                let Some(norm) = normalize_data_field(data) else {
                    continue;
                };
                if norm.as_str() < group.date_start.as_str() || norm.as_str() > group.date_end.as_str()
                {
                    continue;
                }
                seen.insert(format!("{data}|{tempo}"));
            }
            seen.len() as f64
        };

        let cont_count = {
            let mut seen = HashSet::new();
            for (data, tempo) in cont_index.get(&group_key).into_iter().flatten() {
                if !tempos.contains(tempo.as_str()) {
                    continue;
                }
                let Some(norm) = normalize_data_field(data) else {
                    continue;
                };
                if norm.as_str() < group.date_start.as_str() || norm.as_str() > group.date_end.as_str()
                {
                    continue;
                }
                seen.insert(format!("{data}|{tempo}"));
            }
            seen.len() as f64
        };

        let total_alunos = *aluno_counts.get(group.turma_id.as_str()).unwrap_or(&0.0);
        let mut p_notas = 0.0;
        let group_avs: Vec<&&AvaliacaoRef> = av_index
            .get(&group_key)
            .into_iter()
            .flatten()
            .filter(|av| variants.contains(&av.bimestre.to_uppercase()))
            .collect();

        if !group_avs.is_empty() && total_alunos > 0.0 {
            let mut notas_no_lote = 0.0;
            for av in &group_avs {
                notas_no_lote += *notas_counts.get(av.id.as_str()).unwrap_or(&0.0);
            }
            let total_esperadas = group_avs.len() as f64 * total_alunos;
            p_notas = round2(((total_esperadas - notas_no_lote).max(0.0) / total_esperadas) * 100.0);
        }

        out.push(PendenciaDocente {
            professor: group.professor.clone(),
            data_lotacao: group.data_lotacao.clone(),
            periodo: group.periodo.clone(),
            turno: group.turno.clone(),
            ensino: group.ensino.clone(),
            fase: group.fase.clone(),
            turma: group.turma.clone(),
            componente: group.componente.clone(),
            pend_freq: pct_pendencia(group.total_aulas_esperadas, freq_count),
            pend_objeto: pct_pendencia(group.total_aulas_esperadas, cont_count),
            pend_notas: p_notas,
            unidade: None,
        });
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn conta_dias_da_semana() {
        // 2026-02-02 (seg) .. 2026-02-08 (dom) → 1 segunda
        assert_eq!(count_week_days_in_range("2026-02-02", "2026-02-08", 1), 1);
        assert_eq!(count_week_days_in_range("2026-02-02", "2026-02-15", 1), 2);
    }

    #[test]
    fn consolida_freq_e_notas() {
        let input = ConsolidarPendenciasInput {
            groups: vec![PendenciaGrupoInput {
                professor: "Ana".into(),
                turma_id: "t1".into(),
                turma: "A".into(),
                componente: "Matemática".into(),
                periodo: "1. BIMESTRE".into(),
                turno: "Matutino".into(),
                ensino: "Fundamental".into(),
                fase: "6º Ano".into(),
                tempos: vec!["1º TEMPO".into()],
                total_aulas_esperadas: 10.0,
                date_start: "2026-02-05".into(),
                date_end: "2026-02-28".into(),
                periodo_variants: vec!["1. BIMESTRE".into(), "1º BIMESTRE".into()],
                data_lotacao: "05/02/2026".into(),
            }],
            frequencias: (10..=13)
                .map(|dia| LancamentoSlot {
                    turma_id: "t1".into(),
                    disciplina: "Matemática".into(),
                    tempo: "1º TEMPO".into(),
                    data: format!("2026-02-{dia:02}"),
                })
                .collect(),
            conteudos: vec![],
            avaliacoes: vec![AvaliacaoRef {
                id: "av1".into(),
                turma_id: "t1".into(),
                disciplina: "Matemática".into(),
                bimestre: "1. BIMESTRE".into(),
            }],
            aluno_counts: vec![ContagemChave {
                key: "t1".into(),
                total: 2.0,
            }],
            notas_counts: vec![ContagemChave {
                key: "av1".into(),
                total: 1.0,
            }],
        };

        let out = consolidar_pendencias(input);
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].pend_freq, 60.0); // 4/10 → 60% pendente
        assert_eq!(out[0].pend_objeto, 100.0);
        assert_eq!(out[0].pend_notas, 50.0); // 1 de 2 notas
    }
}
