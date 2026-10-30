//! Frequência e aprovação conforme a LDB (Lei nº 9.394/1996).
//!
//! Art. 24, VI — ensino fundamental e médio: mínimo de 75% das horas letivas.
//! Art. 31, I e IV — pré-escola: mínimo de 60% das horas, com avaliação por
//! acompanhamento, sem promoção. Esse percentual não se estende à creche.
//!
//! A comparação usa a razão exata. O arredondamento vale só para o texto exibido.
//! Cada registro é um tempo de aula (carga horária), nunca um dia inteiro.
//! Falta justificada continua na ausência até a escola validar situação especial.

use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;
use unicode_normalization::UnicodeNormalization;

const TEXTO_NAO_CALCULADA: &str = "Frequência não calculada";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum EtapaFrequencia {
    FundamentalMedio,
    PreEscola,
    Creche,
    Indefinida,
}

impl EtapaFrequencia {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::FundamentalMedio => "fundamental_medio",
            Self::PreEscola => "pre_escola",
            Self::Creche => "creche",
            Self::Indefinida => "indefinida",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MomentoFrequencia {
    Acompanhamento,
    Fechamento,
}

impl MomentoFrequencia {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Acompanhamento => "acompanhamento",
            Self::Fechamento => "fechamento",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistroCargaHoraria {
    pub carga_horaria: f64,
    pub status: String,
    #[serde(default)]
    pub abonada_pela_escola: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AvaliacaoFrequencia {
    pub calculada: bool,
    pub etapa: EtapaFrequencia,
    pub momento: MomentoFrequencia,
    pub carga_letiva_total: f64,
    pub carga_frequentada: f64,
    pub carga_faltas: f64,
    pub carga_justificada_nao_abonada: f64,
    pub carga_abonada_pela_escola: f64,
    pub frequencia_percentual: Option<f64>,
    pub ausencia_percentual: Option<f64>,
    pub frequencia_exibicao: String,
    pub ausencia_exibicao: String,
    pub atende_requisito_frequencia: Option<bool>,
    pub alerta: Option<String>,
    pub resultado: String,
    pub rotulo: String,
    pub observacao: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AlteracaoFrequencia {
    pub em: String,
    pub status_anterior: Option<String>,
    pub status_novo: Option<String>,
    pub participacao_anterior: Option<String>,
    pub participacao_nova: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalcularFrequenciaEntrada {
    pub etapa: EtapaFrequencia,
    pub momento: MomentoFrequencia,
    pub registros: Vec<RegistroCargaHoraria>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DefinirSituacaoEntrada {
    pub etapa: EtapaFrequencia,
    pub avaliacao: AvaliacaoFrequencia,
    pub notas_suficientes: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrequenciaAnterior {
    pub status: Option<String>,
    pub participacao: Option<String>,
    pub historico: Option<Vec<AlteracaoFrequencia>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrequenciaNova {
    pub status: String,
    pub participacao: Option<String>,
}

fn normalizar(valor: &str) -> String {
    valor
        .nfd()
        .filter(|c| !unicode_normalization::char::is_combining_mark(*c))
        .collect::<String>()
        .replace(['º', 'ª', '°'], "")
        .to_lowercase()
}

fn re_creche() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\b(creche|bercario|maternal)\b").unwrap())
}

fn re_pre_escola() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\bpre[\s-]?escola\b").unwrap())
}

fn re_pre_romano() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\bpre[\s-]?i{1,3}\b").unwrap())
}

fn re_jardim() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\bjardim\b").unwrap())
}

fn re_infantil() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\binfantil\b").unwrap())
}

fn re_fundamental() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\b(fundamental|medio|eja|serie)\b").unwrap())
}

fn re_ano() -> &'static Regex {
    static RE: OnceLock<Regex> = OnceLock::new();
    RE.get_or_init(|| Regex::new(r"(?i)\d\s*o?\s*ano\b").unwrap())
}

pub fn classificar_etapa_frequencia<'a, I>(partes: I) -> EtapaFrequencia
where
    I: IntoIterator<Item = Option<&'a str>>,
{
    let texto = normalizar(
        &partes
            .into_iter()
            .flatten()
            .filter(|p| !p.is_empty())
            .collect::<Vec<_>>()
            .join(" "),
    );
    if texto.trim().is_empty() {
        return EtapaFrequencia::Indefinida;
    }
    if re_creche().is_match(&texto) {
        return EtapaFrequencia::Creche;
    }
    if re_pre_escola().is_match(&texto)
        || re_pre_romano().is_match(&texto)
        || re_jardim().is_match(&texto)
    {
        return EtapaFrequencia::PreEscola;
    }
    if re_infantil().is_match(&texto) {
        return EtapaFrequencia::Indefinida;
    }
    if re_fundamental().is_match(&texto) || re_ano().is_match(&texto) {
        return EtapaFrequencia::FundamentalMedio;
    }
    EtapaFrequencia::Indefinida
}

pub fn momento_do_ano_letivo(hoje_iso: &str, data_fim_iso: &str) -> MomentoFrequencia {
    if hoje_iso >= data_fim_iso {
        MomentoFrequencia::Fechamento
    } else {
        MomentoFrequencia::Acompanhamento
    }
}

/// Espelha `Math.round((valor + Number.EPSILON) * 100) / 100` + `toLocaleString('pt-BR')`.
pub fn arredondar_percentual_para_exibicao(valor: f64) -> String {
    let arredondado = ((valor + f64::EPSILON) * 100.0).round() / 100.0;
    let sinal = if arredondado.is_sign_negative() && arredondado != 0.0 {
        "-"
    } else {
        ""
    };
    let abs = arredondado.abs();
    let inteiro = abs.trunc() as i64;
    let fracao = ((abs.fract() * 100.0).round() as i64).rem_euclid(100);
    format!("{sinal}{inteiro},{fracao:02}%")
}

fn razao_maior_que(numerador: f64, denominador: f64, percentual: f64) -> bool {
    numerador * 100.0 > denominador * percentual
}

fn razao_maior_ou_igual(numerador: f64, denominador: f64, percentual: f64) -> bool {
    numerador * 100.0 >= denominador * percentual
}

fn status_normalizado(status: &str) -> String {
    status.trim().to_uppercase()
}

pub fn calcular_frequencia_ldb(entrada: CalcularFrequenciaEntrada) -> AvaliacaoFrequencia {
    let mut carga_frequentada = 0.0;
    let mut carga_faltas = 0.0;
    let mut carga_justificada_nao_abonada = 0.0;
    let mut carga_abonada_pela_escola = 0.0;

    for registro in &entrada.registros {
        if !registro.carga_horaria.is_finite() || registro.carga_horaria <= 0.0 {
            continue;
        }
        let status = status_normalizado(&registro.status);
        let presenca = status == "P" || status == "PRESENTE";
        let falta = status == "F" || status == "AUSENTE";
        let justificada = status == "FJ" || status == "JUSTIFICADA";
        if !presenca && !falta && !justificada {
            continue;
        }

        let abonada = registro.abonada_pela_escola.unwrap_or(false);
        if (justificada || falta) && abonada {
            carga_abonada_pela_escola += registro.carga_horaria;
            carga_frequentada += registro.carga_horaria;
            continue;
        }
        if presenca {
            carga_frequentada += registro.carga_horaria;
            continue;
        }
        carga_faltas += registro.carga_horaria;
        if justificada {
            carga_justificada_nao_abonada += registro.carga_horaria;
        }
    }

    let carga_letiva_total = carga_frequentada + carga_faltas;

    if carga_letiva_total <= 0.0 {
        return AvaliacaoFrequencia {
            calculada: false,
            etapa: entrada.etapa,
            momento: entrada.momento,
            carga_letiva_total,
            carga_frequentada,
            carga_faltas,
            carga_justificada_nao_abonada,
            carga_abonada_pela_escola,
            frequencia_percentual: None,
            ausencia_percentual: None,
            frequencia_exibicao: TEXTO_NAO_CALCULADA.to_string(),
            ausencia_exibicao: TEXTO_NAO_CALCULADA.to_string(),
            atende_requisito_frequencia: None,
            alerta: None,
            resultado: TEXTO_NAO_CALCULADA.to_string(),
            rotulo: TEXTO_NAO_CALCULADA.to_string(),
            observacao: "Não há carga horária registrada para calcular a frequência.".to_string(),
        };
    }

    let frequencia_percentual = (carga_frequentada / carga_letiva_total) * 100.0;
    let ausencia_percentual = (carga_faltas / carga_letiva_total) * 100.0;
    let frequencia_exibicao = arredondar_percentual_para_exibicao(frequencia_percentual);
    let ausencia_exibicao = arredondar_percentual_para_exibicao(ausencia_percentual);

    if entrada.etapa == EtapaFrequencia::Creche {
        return AvaliacaoFrequencia {
            calculada: true,
            etapa: entrada.etapa,
            momento: entrada.momento,
            carga_letiva_total,
            carga_frequentada,
            carga_faltas,
            carga_justificada_nao_abonada,
            carga_abonada_pela_escola,
            frequencia_percentual: Some(frequencia_percentual),
            ausencia_percentual: Some(ausencia_percentual),
            frequencia_exibicao,
            ausencia_exibicao,
            atende_requisito_frequencia: None,
            alerta: None,
            resultado: "Acompanhamento da creche".to_string(),
            rotulo: "Acompanhamento".to_string(),
            observacao: "O percentual de 60% da pré-escola não se aplica automaticamente à creche. Não há retenção automática.".to_string(),
        };
    }

    if entrada.etapa == EtapaFrequencia::PreEscola {
        let atende = razao_maior_ou_igual(carga_frequentada, carga_letiva_total, 60.0);
        return AvaliacaoFrequencia {
            calculada: true,
            etapa: entrada.etapa,
            momento: entrada.momento,
            carga_letiva_total,
            carga_frequentada,
            carga_faltas,
            carga_justificada_nao_abonada,
            carga_abonada_pela_escola,
            frequencia_percentual: Some(frequencia_percentual),
            ausencia_percentual: Some(ausencia_percentual),
            frequencia_exibicao,
            ausencia_exibicao,
            atende_requisito_frequencia: Some(atende),
            alerta: if atende {
                None
            } else {
                Some(
                    "Alerta: frequência abaixo de 60% das horas da pré-escola. Não gera reprovação ou retenção automática."
                        .to_string(),
                )
            },
            resultado: "Acompanhamento do desenvolvimento".to_string(),
            rotulo: if atende {
                "Acompanhamento".to_string()
            } else {
                "Alerta de frequência".to_string()
            },
            observacao: "A pré-escola é avaliada por acompanhamento e registro do desenvolvimento, sem objetivo de promoção.".to_string(),
        };
    }

    if entrada.etapa != EtapaFrequencia::FundamentalMedio {
        return AvaliacaoFrequencia {
            calculada: true,
            etapa: entrada.etapa,
            momento: entrada.momento,
            carga_letiva_total,
            carga_frequentada,
            carga_faltas,
            carga_justificada_nao_abonada,
            carga_abonada_pela_escola,
            frequencia_percentual: Some(frequencia_percentual),
            ausencia_percentual: Some(ausencia_percentual),
            frequencia_exibicao,
            ausencia_exibicao,
            atende_requisito_frequencia: None,
            alerta: None,
            resultado: "Frequência em acompanhamento".to_string(),
            rotulo: "Acompanhamento".to_string(),
            observacao: "A etapa não identifica ensino fundamental, médio ou pré-escola. Nenhuma reprovação automática foi aplicada.".to_string(),
        };
    }

    let atende = razao_maior_ou_igual(carga_frequentada, carga_letiva_total, 75.0)
        && !razao_maior_que(carga_faltas, carga_letiva_total, 25.0);

    let base = AvaliacaoFrequencia {
        calculada: true,
        etapa: entrada.etapa,
        momento: entrada.momento,
        carga_letiva_total,
        carga_frequentada,
        carga_faltas,
        carga_justificada_nao_abonada,
        carga_abonada_pela_escola,
        frequencia_percentual: Some(frequencia_percentual),
        ausencia_percentual: Some(ausencia_percentual),
        frequencia_exibicao,
        ausencia_exibicao,
        atende_requisito_frequencia: Some(atende),
        alerta: None,
        resultado: String::new(),
        rotulo: String::new(),
        observacao: String::new(),
    };

    if entrada.momento == MomentoFrequencia::Acompanhamento {
        return AvaliacaoFrequencia {
            alerta: if atende {
                None
            } else {
                Some(
                    "Alerta de frequência: ausência acima de 25% da carga horária já realizada. Este acompanhamento não declara reprovação."
                        .to_string(),
                )
            },
            resultado: if atende {
                "Em acompanhamento".to_string()
            } else {
                "Em acompanhamento — ausência acima de 25% da carga horária já realizada"
                    .to_string()
            },
            rotulo: if atende {
                "Em acompanhamento".to_string()
            } else {
                "Alerta de frequência".to_string()
            },
            observacao: "No acompanhamento, a carga horária é a já realizada. A reprovação por frequência só pode ser declarada no fechamento do período letivo, depois da validação da escola.".to_string(),
            ..base
        };
    }

    if !atende {
        return AvaliacaoFrequencia {
            alerta: Some(
                "Ausência superior a 25% da carga horária letiva. Não atende ao requisito de frequência, mesmo com notas suficientes."
                    .to_string(),
            ),
            resultado: "Reprovado por frequência".to_string(),
            rotulo: "Reprovado por frequência".to_string(),
            observacao: "Resultado após a validação do fechamento pela escola e de eventuais situações especiais legalmente aplicáveis. Justificativa ou atestado, sozinhos, não abonam a falta.".to_string(),
            ..base
        };
    }

    AvaliacaoFrequencia {
        alerta: None,
        resultado: "Atende ao requisito de frequência".to_string(),
        rotulo: "Atende à frequência".to_string(),
        observacao: "A aprovação também depende dos demais critérios aplicáveis.".to_string(),
        ..base
    }
}

pub fn definir_situacao_periodo(entrada: DefinirSituacaoEntrada) -> String {
    let Some(notas_suficientes) = entrada.notas_suficientes else {
        return String::new();
    };

    if entrada.etapa == EtapaFrequencia::Creche || entrada.etapa == EtapaFrequencia::PreEscola {
        if entrada.etapa == EtapaFrequencia::PreEscola
            && entrada.avaliacao.atende_requisito_frequencia == Some(false)
        {
            return "Alerta de frequência".to_string();
        }
        return "Acompanhamento".to_string();
    }

    if entrada.etapa != EtapaFrequencia::FundamentalMedio {
        return String::new();
    }

    if !entrada.avaliacao.calculada {
        return if notas_suficientes {
            TEXTO_NAO_CALCULADA.to_string()
        } else {
            "EXAME".to_string()
        };
    }

    if entrada.avaliacao.atende_requisito_frequencia == Some(false) {
        return if entrada.avaliacao.momento == MomentoFrequencia::Fechamento {
            "Reprovado por frequência".to_string()
        } else {
            "Alerta de frequência".to_string()
        };
    }

    if notas_suficientes {
        "APROVADO".to_string()
    } else {
        "EXAME".to_string()
    }
}

pub fn historico_apos_alteracao(
    anterior: Option<&FrequenciaAnterior>,
    novo: &FrequenciaNova,
    em: &str,
) -> Vec<AlteracaoFrequencia> {
    let mut historico = anterior
        .and_then(|a| a.historico.clone())
        .unwrap_or_default();
    let status_novo = novo.status.clone();
    let participacao_nova = novo.participacao.clone();

    let Some(anterior) = anterior else {
        historico.push(AlteracaoFrequencia {
            em: em.to_string(),
            status_anterior: None,
            status_novo: Some(status_novo),
            participacao_anterior: None,
            participacao_nova,
        });
        return historico;
    };

    let status_mudou = anterior.status.as_deref() != Some(status_novo.as_str());
    let participacao_mudou = anterior.participacao.as_deref() != participacao_nova.as_deref();
    if status_mudou || participacao_mudou {
        historico.push(AlteracaoFrequencia {
            em: em.to_string(),
            status_anterior: anterior.status.clone(),
            status_novo: Some(status_novo),
            participacao_anterior: anterior.participacao.clone(),
            participacao_nova,
        });
    }
    historico
}

#[cfg(test)]
mod tests {
    use super::*;

    fn tempos(presentes: usize, faltas: usize, justificadas: usize, abonadas: usize) -> Vec<RegistroCargaHoraria> {
        let mut out = Vec::new();
        out.extend((0..presentes).map(|_| RegistroCargaHoraria {
            carga_horaria: 1.0,
            status: "P".into(),
            abonada_pela_escola: None,
        }));
        out.extend((0..faltas).map(|_| RegistroCargaHoraria {
            carga_horaria: 1.0,
            status: "F".into(),
            abonada_pela_escola: None,
        }));
        out.extend((0..justificadas).map(|_| RegistroCargaHoraria {
            carga_horaria: 1.0,
            status: "FJ".into(),
            abonada_pela_escola: None,
        }));
        out.extend((0..abonadas).map(|_| RegistroCargaHoraria {
            carga_horaria: 1.0,
            status: "FJ".into(),
            abonada_pela_escola: Some(true),
        }));
        out
    }

    #[test]
    fn classifica_etapas() {
        assert_eq!(
            classificar_etapa_frequencia([Some("Fundamental Anos Iniciais (1° ao 5° ANO)")]),
            EtapaFrequencia::FundamentalMedio
        );
        assert_eq!(
            classificar_etapa_frequencia([Some("Educação Infantil"), Some("Pré-escola II")]),
            EtapaFrequencia::PreEscola
        );
        assert_eq!(
            classificar_etapa_frequencia([Some("Educação Infantil"), Some("Maternal II")]),
            EtapaFrequencia::Creche
        );
        assert_eq!(
            classificar_etapa_frequencia([Some("Educação Infantil")]),
            EtapaFrequencia::Indefinida
        );
    }

    #[test]
    fn ausencia_25_atende_e_26_reprova() {
        let ok = calcular_frequencia_ldb(CalcularFrequenciaEntrada {
            etapa: EtapaFrequencia::FundamentalMedio,
            momento: MomentoFrequencia::Fechamento,
            registros: tempos(75, 25, 0, 0),
        });
        assert_eq!(ok.atende_requisito_frequencia, Some(true));
        assert_eq!(ok.resultado, "Atende ao requisito de frequência");

        let fail = calcular_frequencia_ldb(CalcularFrequenciaEntrada {
            etapa: EtapaFrequencia::FundamentalMedio,
            momento: MomentoFrequencia::Fechamento,
            registros: tempos(74, 26, 0, 0),
        });
        assert_eq!(fail.atende_requisito_frequencia, Some(false));
        assert_eq!(fail.resultado, "Reprovado por frequência");
    }

    #[test]
    fn exibicao_pt_br() {
        assert_eq!(arredondar_percentual_para_exibicao(74.96), "74,96%");
        assert_eq!(arredondar_percentual_para_exibicao(74.996), "75,00%");
    }
}
