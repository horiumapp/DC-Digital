import { supabase } from '../lib/supabase';
import { dataCobertaPeloAtestado } from '../utils/atestadoFrequencia';

export interface AtestadoMedico {
  id: string;
  aluno_id: string;
  escola_id: string;
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
  criado_em: string;
}

const cachePorTurma = new Map<string, AtestadoMedico[]>();

export async function listarAtestadosDoAluno(alunoId: string): Promise<AtestadoMedico[]> {
  const { data, error } = await supabase.rpc('listar_atestados_do_aluno', { p_aluno_id: alunoId });
  const funcaoAusente = error?.code === 'PGRST202'
    || /could not find the function/i.test(error?.message || '');
  if (!error) return (data || []) as AtestadoMedico[];
  if (!funcaoAusente) throw error;

  const legado = await supabase
    .from('atestados_medicos')
    .select('id, aluno_id, escola_id, data_inicio, data_fim, observacao, criado_em')
    .eq('aluno_id', alunoId)
    .order('data_inicio', { ascending: false });
  if (legado.error) throw legado.error;
  return (legado.data || []) as AtestadoMedico[];
}

export async function lancarAtestadoMedico(entrada: {
  alunoId: string;
  escolaId: string;
  dataInicio: string;
  dataFim: string;
  observacao?: string;
}): Promise<void> {
  const { error } = await supabase.from('atestados_medicos').insert({
    aluno_id: entrada.alunoId,
    escola_id: entrada.escolaId,
    data_inicio: entrada.dataInicio,
    data_fim: entrada.dataFim,
    observacao: entrada.observacao?.trim() || null,
  });
  if (error) throw error;
  cachePorTurma.clear();
}

export async function removerAtestadoMedico(id: string): Promise<void> {
  const { error } = await supabase.from('atestados_medicos').delete().eq('id', id);
  if (error) throw error;
  cachePorTurma.clear();
}

function idsCobertos(registros: AtestadoMedico[], dataIso: string): Set<string> {
  return new Set(
    registros
      .filter(item => dataCobertaPeloAtestado(dataIso, item.data_inicio, item.data_fim))
      .map(item => item.aluno_id)
  );
}

export async function alunosComAtestadoNaData(turmaId: string, dataIso: string): Promise<Set<string>> {
  try {
    if (typeof navigator === 'undefined' || navigator.onLine) {
      const { data, error } = await supabase
        .from('atestados_medicos')
        .select('id, aluno_id, escola_id, data_inicio, data_fim, criado_em, alunos!inner(turma_id)')
        .eq('alunos.turma_id', turmaId);
      if (error) throw error;
      const registros = (data || []) as AtestadoMedico[];
      cachePorTurma.set(turmaId, registros);
      return idsCobertos(registros, dataIso);
    }
  } catch (err) {
    console.warn('[atestado] Usando atestados já consultados nesta sessão.', err);
  }
  return idsCobertos(cachePorTurma.get(turmaId) || [], dataIso);
}
