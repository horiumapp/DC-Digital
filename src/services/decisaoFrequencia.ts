import { supabase } from '../lib/supabase';
import type { AvaliacaoFrequencia } from '../utils/regraFrequenciaLdb';

export interface DecisaoFrequenciaRegistro {
  turmaId: string;
  alunoId: string;
  disciplina: string;
  periodo: string;
  avaliacao: AvaliacaoFrequencia;
}

export async function registrarDecisoesFechamento(registros: DecisaoFrequenciaRegistro[]): Promise<void> {
  if (registros.length === 0) return;
  const linhas = registros.map(registro => ({
    turma_id: registro.turmaId,
    aluno_id: registro.alunoId,
    disciplina: registro.disciplina,
    periodo: registro.periodo,
    etapa: registro.avaliacao.etapa,
    momento: registro.avaliacao.momento,
    carga_frequentada: registro.avaliacao.cargaFrequentada,
    carga_faltas: registro.avaliacao.cargaFaltas,
    carga_letiva_total: registro.avaliacao.cargaLetivaTotal,
    frequencia_percentual: registro.avaliacao.frequenciaPercentual,
    ausencia_percentual: registro.avaliacao.ausenciaPercentual,
    resultado: registro.avaliacao.resultado,
    observacao: registro.avaliacao.observacao,
  }));
  const { error } = await supabase.from('decisoes_fechamento_frequencia').insert(linhas);
  if (error) throw error;
}
