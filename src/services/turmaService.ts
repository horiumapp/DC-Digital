import { supabase } from '../lib/supabase';
import { getBimestrePorData } from '../utils/dateUtils';
import { Aluno, Avaliacao, Conteudo, Horario, Lancamento } from '../contexts/TurmaContext';

export const TurmaService = {
  fetchHorario: async (turmaId: string | number, disciplina: string): Promise<Horario[]> => {
    const tid = turmaId.toString().split('_')[0];
    const { data, error } = await supabase
      .from('professor_horarios')
      .select('dia_semana, tempo_ordem')
      .eq('turma_id', tid)
      .eq('componente', disciplina);
    if (error) throw error;
    return data || [];
  },

  fetchLancamentos: async (turmaId: string | number, disciplina: string): Promise<Lancamento[]> => {
    const tid = turmaId.toString().split('_')[0]; // Pega o ID real do banco
    const [freqRes, contRes] = await Promise.all([
      supabase.from('frequencias')
        .select('data, tempo')
        .eq('turma_id', tid)
        .eq('disciplina', disciplina),
      supabase.from('conteudos')
        .select('data, tempo')
        .eq('turma_id', tid)
        .eq('disciplina', disciplina)
    ]);

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
      .select('*')
      .eq('turma_id', turmaId.toString())
      .order('nome');
    if (error) throw error;
    
    return (data || []).map(a => ({
      id: a.id.toString(),
      nome: a.nome,
      matricula: a.matricula || `2026/${a.id.toString().slice(-7)}`,
      freq: 'P',
      part: 'Presencial',
      notas: {}
    }));
  },

  fetchAvaliacoes: async (turmaId: string | number, disciplina: string): Promise<{ avaliacoes: Avaliacao[], notasData: any[] }> => {
    const tid = turmaId.toString().split('_')[0];
    const { data: avData, error: avError } = await supabase
      .from('avaliacoes')
      .select('*')
      .eq('turma_id', tid)
      .eq('disciplina', disciplina)
      .order('data', { ascending: true });
    
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

    return { avaliacoes: avaliacoesFormatadas, notasData: notasData || [] };
  },

  salvarAvaliacao: async (av: Avaliacao, turmaId: string | number, disciplina: string): Promise<string> => {
    const tid = turmaId.toString().split('_')[0];
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
    const tid = turmaId.toString().split('_')[0];
    const upserts = alunosFreq.map(aluno => ({
      turma_id: tid,
      aluno_id: aluno.id,
      data,
      tempo,
      status: aluno.freq || 'P',
      participacao: aluno.part || 'Presencial',
      disciplina: disciplina
    }));
    const { error } = await supabase.from('frequencias').upsert(upserts, { onConflict: 'turma_id,aluno_id,data,tempo,disciplina' });
    if (error) throw error;
  },

  salvarConteudo: async (turmaId: string | number, disciplina: string, cont: Conteudo): Promise<void> => {
    const tid = turmaId.toString().split('_')[0];
    const payload = {
      turma_id: tid,
      data: cont.data,
      tempo: cont.tempo,
      objetos: cont.objetos,
      habilidades: cont.habilidades,
      descricao: cont.descricao,
      disciplina: disciplina
    };
    const { error } = await supabase.from('conteudos').upsert(payload, { onConflict: 'turma_id,data,tempo,disciplina' });
    if (error) throw error;
  },

  buscarFrequencia: async (turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<any[]> => {
    const tid = turmaId.toString().split('_')[0];
    const { data: freqData, error } = await supabase
      .from('frequencias')
      .select('*')
      .eq('turma_id', tid)
      .eq('data', data)
      .eq('tempo', tempo)
      .eq('disciplina', disciplina);
    if (error) throw error;
    return freqData || [];
  },

  fetchAllFrequencias: async (turmaId: string | number, disciplina: string): Promise<any[]> => {
    const tid = turmaId.toString().split('_')[0];
    const { data: freqData, error } = await supabase
      .from('frequencias')
      .select('data, aluno_id, status')
      .eq('turma_id', tid)
      .eq('disciplina', disciplina);
    if (error) throw error;
    return freqData || [];
  },

  buscarFrequenciaPorDia: async (turmaId: string | number, disciplina: string, data: string): Promise<any[]> => {
    const tid = turmaId.toString().split('_')[0];
    const { data: freqData, error } = await supabase
      .from('frequencias')
      .select('aluno_id, status')
      .eq('turma_id', tid)
      .eq('data', data)
      .eq('disciplina', disciplina);
    if (error) throw error;
    return freqData || [];
  },

  buscarConteudo: async (turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<Conteudo | null> => {
    const tid = turmaId.toString().split('_')[0];
    const { data: contData, error } = await supabase
      .from('conteudos')
      .select('*')
      .eq('turma_id', tid)
      .eq('data', data)
      .eq('tempo', tempo)
      .eq('disciplina', disciplina)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    if (contData) {
      return {
        id: contData.id.toString(),
        turmaId: contData.turma_id,
        data: contData.data,
        tempo: contData.tempo,
        objetos: contData.objetos || [],
        habilidades: contData.habilidades || [],
        descricao: contData.descricao || ''
      };
    }
    return null;
  },

  removerFrequencia: async (turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<void> => {
    const tid = turmaId.toString().split('_')[0];
    const { error } = await supabase
      .from('frequencias')
      .delete()
      .eq('turma_id', tid)
      .eq('data', data)
      .eq('tempo', tempo)
      .eq('disciplina', disciplina);
    if (error) throw error;
  },

  removerConteudo: async (turmaId: string | number, disciplina: string, data: string, tempo: string): Promise<void> => {
    const tid = turmaId.toString().split('_')[0];
    const { error } = await supabase
    .from('conteudos')
    .delete()
    .eq('turma_id', tid)
    .eq('data', data)
    .eq('tempo', tempo)
    .eq('disciplina', disciplina);
    if (error) throw error;
  },

  fetchAllConteudos: async (turmaId: string | number, disciplina: string): Promise<Conteudo[]> => {
    const tid = turmaId.toString().split('_')[0];
    const { data, error } = await supabase
      .from('conteudos')
      .select('*')
      .eq('turma_id', tid)
      .eq('disciplina', disciplina)
      .order('data', { ascending: false });
    
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
  }
};
