import { supabase } from '../lib/supabase';
import { getBimestrePorData } from '../utils/dateUtils';
import { Aluno, Avaliacao, Conteudo, Horario, Lancamento } from '../contexts/TurmaContext';

/** Registro de frequência retornado pelo banco */
export interface FrequenciaRecord {
  aluno_id: string;
  status: string;
  participacao?: string;
  data?: string;
  disciplina?: string;
}

/** Registro de nota retornado pelo banco */
export interface NotaRecord {
  avaliacao_id: string;
  aluno_id: string;
  valor: number;
}

const getTid = (turmaId: string | number): string => turmaId.toString().split('||')[0];

/**
 * Normaliza data para o formato ISO YYYY-MM-DD.
 * Aceita DD/MM/YYYY ou YYYY-MM-DD como entrada.
 * Garante consistência dos dados gravados no banco.
 */
const normalizarDataISO = (data: string): string => {
  if (!data) return data;
  // Já está em ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
  // Converte DD/MM/YYYY -> YYYY-MM-DD
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
    const [d, m, y] = data.split('/');
    return `${y}-${m}-${d}`;
  }
  return data;
};

export const TurmaService = {
  fetchHorario: async (turmaId: string | number, disciplina: string): Promise<Horario[]> => {
    const tid = getTid(turmaId);
    // Buscar todos os horários desta turma
    const { data, error } = await supabase
      .from('professor_horarios')
      .select('dia_semana, tempo_ordem, componente')
      .eq('turma_id', tid);
    if (error) throw error;
    // Filtrar no cliente: incluir quando componente bate com a disciplina OU está vazio/null
    const filtered = (data || []).filter(d => {
      const comp = (d.componente || '').trim();
      return comp === '' || comp.toLowerCase() === disciplina.toLowerCase();
    });
    return filtered.map(d => ({ dia_semana: d.dia_semana, tempo_ordem: d.tempo_ordem }));
  },

  fetchLancamentos: async (turmaId: string | number, disciplina: string): Promise<Lancamento[]> => {
    const tid = getTid(turmaId);

    // Construir queries com filtro server-side de disciplina
    let freqQuery = supabase.from('frequencias')
      .select('data, tempo, disciplina')
      .eq('turma_id', tid);
    if (disciplina) freqQuery = freqQuery.ilike('disciplina', disciplina);

    let contQuery = supabase.from('conteudos')
      .select('data, tempo, disciplina')
      .eq('turma_id', tid);
    if (disciplina) contQuery = contQuery.ilike('disciplina', disciplina);

    const [freqRes, contRes] = await Promise.all([freqQuery, contQuery]);

    const novosLancamentos: Lancamento[] = [];

    if (freqRes.data) {
      const uniqueFreqs = new Set(freqRes.data.map(f => `${f.data}|${f.tempo}`));
      uniqueFreqs.forEach(val => {
        const [data, tempo] = val.split('|');
        novosLancamentos.push({ turmaId: tid, data, tempo, tipo: 'frequencia' });
      });
    }

    if (contRes.data) {
      contRes.data.forEach(c => {
        novosLancamentos.push({ turmaId: tid, data: c.data, tempo: c.tempo, tipo: 'conteudo' });
      });
    }

    return novosLancamentos;
  },

  fetchAlunos: async (turmaId: string | number): Promise<Aluno[]> => {
    const { data, error } = await supabase
      .from('alunos')
      .select('id, nome, cpf, status')
      .eq('turma_id', turmaId.toString())
      .order('nome');
      
    if (error) throw error;
    
    // Filtra no cliente para considerar status nulo ou variações de "Ativo"
    const alunosAtivos = (data || []).filter(a => !a.status || a.status.toLowerCase() === 'ativo');
    
    return alunosAtivos.map(a => {
      const cpfClean = a.cpf ? a.cpf.replace(/\D/g, '') : '';
      const matriculaDisplay = cpfClean.length === 11
        ? `${cpfClean.substring(0, 3)}.${cpfClean.substring(3, 6)}.${cpfClean.substring(6, 9)}-${cpfClean.substring(9, 11)}`
        : 'CPF Pendente';
      return {
        id: a.id.toString(),
        nome: a.nome,
        cpf: a.cpf || undefined,
        matricula: matriculaDisplay,
        freq: 'P',
        part: 'Presencial',
        notas: {}
      };
    });
  },

  fetchAvaliacoes: async (turmaId: string | number, disciplina: string): Promise<{ avaliacoes: Avaliacao[], notasData: NotaRecord[] }> => {
    const tid = getTid(turmaId);

    let avQuery = supabase
      .from('avaliacoes')
      .select('*')
      .eq('turma_id', tid)
      .order('data', { ascending: true });
    if (disciplina) avQuery = avQuery.ilike('disciplina', disciplina);

    const { data: avData, error: avError } = await avQuery;
    
    if (avError) throw avError;

    if (!avData || avData.length === 0) return { avaliacoes: [], notasData: [] };

    const avaliacoesFormatadas: Avaliacao[] = avData.map(av => ({
      id: av.id.toString(),
      turmaId: av.turma_id,
      tipo: av.tipo,
      data: av.data,
      instrumento: av.instrumento,
      objetos: av.objetos || [],
      bimestre: av.bimestre || getBimestrePorData(av.data),
      valorMaximo: av.valor_maximo,
      parent_id: av.parent_id
    }));

    const avaliacaoIds = avaliacoesFormatadas.map(av => av.id);
    const { data: notasData, error: notasError } = await supabase
      .from('notas')
      .select('*')
      .in('avaliacao_id', avaliacaoIds);

    if (notasError) throw notasError;

    return { avaliacoes: avaliacoesFormatadas, notasData: (notasData || []) as NotaRecord[] };
  },

  salvarAvaliacao: async (av: Avaliacao, turmaId: string | number, disciplina: string): Promise<string> => {
    const tid = getTid(turmaId);
    const payload = {
      turma_id: tid,
      tipo: av.tipo,
      data: av.data,
      instrumento: av.instrumento,
      objetos: av.objetos,
      bimestre: av.bimestre || getBimestrePorData(av.data),
      valor_maximo: av.valorMaximo || 10,
      disciplina: disciplina,
      parent_id: av.parent_id
    };

    let createdId = av.id;
    let error;
    if (!av.id || av.id.startsWith('temp_')) {
      const { data, error: insError } = await supabase.from('avaliacoes').insert([payload]).select().single();
      error = insError;
      if (data) createdId = data.id.toString();
    } else {
      const { error: updError } = await supabase.from('avaliacoes').update(payload).eq('id', av.id).select().single();
      error = updError;
    }

    if (error) throw error;
    return createdId;
  },

  removerAvaliacao: async (id: string): Promise<void> => {
    const { error } = await supabase.from('avaliacoes').delete().eq('id', id);
    if (error) throw error;
  },

  salvarNotas: async (avaliacaoId: string, notas: { alunoId: string, valor: string }[]): Promise<void> => {
    const upserts = notas.map(n => ({
      avaliacao_id: avaliacaoId,
      aluno_id: n.alunoId,
      valor: parseFloat(n.valor.replace(',', '.'))
    }));
    const { error } = await supabase.from('notas').upsert(upserts, { onConflict: 'avaliacao_id,aluno_id' });
    if (error) throw error;
  },

  salvarFrequencia: async (turmaId: string | number, disciplina: string, data: string, tempo: string, alunosFreq: Aluno[]): Promise<void> => {
    const tid = getTid(turmaId);
    // Normalizar data para ISO (YYYY-MM-DD) antes de gravar
    const dataISO = normalizarDataISO(data);
    const upserts = alunosFreq.map(aluno => ({
      turma_id: tid,
      aluno_id: aluno.id,
      data: dataISO,
      tempo,
      status: aluno.freq || 'P',
      participacao: aluno.part || 'Presencial',
      disciplina: disciplina
    }));
    const { error } = await supabase.from('frequencias').upsert(upserts, { onConflict: 'turma_id,aluno_id,data,tempo,disciplina' });
    if (error) throw error;
  },

  salvarConteudo: async (turmaId: string | number, disciplina: string, cont: Conteudo): Promise<void> => {
    const tid = getTid(turmaId);
    // Normalizar data para ISO (YYYY-MM-DD) antes de gravar
    const dataISO = normalizarDataISO(cont.data);
    const payload = {
      turma_id: tid,
      data: dataISO,
      tempo: cont.tempo,
      objetos: cont.objetos,
      habilidades: cont.habilidades,
      descricao: cont.descricao,
      disciplina: disciplina
    };
    const { error } = await supabase.from('conteudos').upsert(payload, { onConflict: 'turma_id,data,tempo,disciplina' });
    if (error) throw error;
  },

  buscarFrequencia: async (turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<FrequenciaRecord[]> => {
    const tid = getTid(turmaId);
    const dataISO = normalizarDataISO(data);
    const { data: freqData, error } = await supabase
      .from('frequencias')
      .select('aluno_id, status, participacao')
      .eq('turma_id', tid)
      .eq('data', dataISO)
      .eq('tempo', tempo)
      .eq('disciplina', disciplina);
    if (error) throw error;
    return (freqData || []) as FrequenciaRecord[];
  },

  fetchAllFrequencias: async (turmaId: string | number, disciplina: string): Promise<FrequenciaRecord[]> => {
    const tid = getTid(turmaId);

    let query = supabase
      .from('frequencias')
      .select('data, tempo, aluno_id, status, participacao, disciplina')
      .eq('turma_id', tid);
    if (disciplina) query = query.ilike('disciplina', disciplina);

    const { data: freqData, error } = await query;
    if (error) throw error;
    return (freqData || []) as FrequenciaRecord[];
  },

  buscarFrequenciaPorDia: async (turmaId: string | number, disciplina: string, data: string): Promise<FrequenciaRecord[]> => {
    const tid = getTid(turmaId);
    const dataISO = normalizarDataISO(data);

    let query = supabase
      .from('frequencias')
      .select('aluno_id, status, disciplina')
      .eq('turma_id', tid)
      .eq('data', dataISO);
    if (disciplina) query = query.ilike('disciplina', disciplina);

    const { data: freqData, error } = await query;
    if (error) throw error;
    return (freqData || []) as FrequenciaRecord[];
  },

  buscarConteudo: async (turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<Conteudo | null> => {
    const tid = getTid(turmaId);
    const dataISO = normalizarDataISO(data);

    let query = supabase
      .from('conteudos')
      .select('*')
      .eq('turma_id', tid)
      .eq('data', dataISO)
      .eq('tempo', tempo);
    if (disciplina) query = query.ilike('disciplina', disciplina);

    const { data: contData, error } = await query;

    if (error) throw error;
    
    const matchedCont = contData && contData.length > 0 ? contData[0] : null;

    if (matchedCont) {
      return {
        id: matchedCont.id.toString(),
        turmaId: matchedCont.turma_id,
        data: matchedCont.data,
        tempo: matchedCont.tempo,
        objetos: matchedCont.objetos || [],
        habilidades: matchedCont.habilidades || [],
        descricao: matchedCont.descricao || ''
      };
    }
    return null;
  },

  removerFrequencia: async (turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<void> => {
    const tid = getTid(turmaId);
    // FIX: normalizar data para ISO antes de deletar (consistente com salvarFrequencia)
    const dataISO = normalizarDataISO(data);
    const { error } = await supabase
      .from('frequencias')
      .delete()
      .eq('turma_id', tid)
      .eq('data', dataISO)
      .eq('tempo', tempo)
      .eq('disciplina', disciplina);
    if (error) throw error;
  },

  removerConteudo: async (turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<void> => {
    const tid = getTid(turmaId);
    // FIX: normalizar data para ISO antes de deletar (consistente com salvarConteudo)
    const dataISO = normalizarDataISO(data);
    const { error } = await supabase
    .from('conteudos')
    .delete()
    .eq('turma_id', tid)
    .eq('data', dataISO)
    .eq('tempo', tempo)
    .eq('disciplina', disciplina);
    if (error) throw error;
  },

  fetchAllConteudos: async (turmaId: string | number, disciplina: string): Promise<Conteudo[]> => {
    const tid = getTid(turmaId);

    let query = supabase
      .from('conteudos')
      .select('*')
      .eq('turma_id', tid)
      .order('data', { ascending: false });
    if (disciplina) query = query.ilike('disciplina', disciplina);

    const { data, error } = await query;
      
    if (error) throw error;

    return (data || []).map(c => ({
      id: c.id.toString(),
      turmaId: c.turma_id,
      data: c.data,
      tempo: c.tempo,
      objetos: c.objetos || [],
      habilidades: c.habilidades || [],
      descricao: c.descricao || ''
    }));
  },

  fetchFechamentos: async (turmaId: string | number, disciplina: string): Promise<Record<string, boolean>> => {
    const tid = getTid(turmaId);
    const { data, error } = await supabase
      .from('fechamentos_bimestres')
      .select('bimestre, status')
      .eq('turma_id', tid)
      .eq('disciplina', disciplina);

    if (error) throw error;

    const map: Record<string, boolean> = {};
    data?.forEach(f => {
      map[f.bimestre] = f.status === 'FECHADO';
    });
    return map;
  },

  salvarFechamento: async (
    turmaId: string | number,
    disciplina: string,
    bimestre: string,
    status: 'ABERTO' | 'FECHADO',
    userId: string
  ): Promise<void> => {
    const tid = getTid(turmaId);
    if (status === 'ABERTO') {
      const { error } = await supabase
        .from('fechamentos_bimestres')
        .delete()
        .eq('turma_id', tid)
        .eq('disciplina', disciplina)
        .eq('bimestre', bimestre);
      if (error) throw error;
    } else {
      const payload = {
        turma_id: tid,
        disciplina,
        bimestre,
        status,
        usuario_fechamento_id: userId
      };
      const { error } = await supabase
        .from('fechamentos_bimestres')
        .upsert(payload, { onConflict: 'turma_id,disciplina,bimestre' });
      if (error) throw error;
    }
  }
};
