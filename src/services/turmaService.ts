import { supabase } from '../lib/supabase';
import { getBimestrePorData } from '../utils/dateUtils';
import { Aluno, Avaliacao, Conteudo, Horario, Lancamento } from '../contexts/TurmaContext';
import { isAlunoAtivo } from '../constants/authConstants';

/** Registro de frequência retornado pelo banco */
export interface FrequenciaRecord {
  aluno_id: string;
  status: string;
  participacao?: string;
  data?: string;
  disciplina?: string;
  tempo?: string;
}

/** Registro de nota retornado pelo banco */
export interface NotaRecord {
  avaliacao_id: string;
  aluno_id: string;
  valor: number;
}

/** Estrutura de turma e componente para relatórios */
export interface TurmaRelatorioInfo {
  id: string;
  nome: string;
  turno: string;
  componente: string;
  ensino: string;
  fase: string;
  numero: string;
  escolaId: string;
  escolaNome: string;
}

import { getTid, normalizarDataISO } from '../utils/turmaUtils';

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
    
    // FIX #19: Usar constante centralizada para filtro de status
    const alunosAtivos = (data || []).filter(a => isAlunoAtivo(a.status));
    
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
      .select('id, turma_id, tipo, data, instrumento, objetos, bimestre, valor_maximo, parent_id, disciplina')
      .eq('turma_id', tid)
      .order('data', { ascending: true });
    if (disciplina && disciplina.trim() !== '' && disciplina.trim().toUpperCase() !== 'GERAL' && disciplina.trim().toUpperCase() !== 'TODAS') {
      avQuery = avQuery.ilike('disciplina', disciplina.trim());
    }

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
      .select('avaliacao_id, aluno_id, valor')
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
    if (disciplina && disciplina.toUpperCase() !== 'TODAS' && disciplina.toUpperCase() !== 'GERAL') {
      query = query.ilike('disciplina', disciplina);
    }

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
      .select('id, turma_id, data, tempo, objetos, habilidades, descricao, disciplina')
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
      .select('id, turma_id, data, tempo, objetos, habilidades, descricao, disciplina')
      .eq('turma_id', tid)
      .order('data', { ascending: false });
    if (disciplina && disciplina.toUpperCase() !== 'TODAS' && disciplina.toUpperCase() !== 'GERAL') {
      query = query.ilike('disciplina', disciplina);
    }

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

  fetchDisciplinasDaTurma: async (turmaId: string | number): Promise<string[]> => {
    const tid = getTid(turmaId);
    const [horariosRes, avsRes, fechamentosRes] = await Promise.all([
      supabase.from('professor_horarios').select('componente').eq('turma_id', tid),
      supabase.from('avaliacoes').select('disciplina').eq('turma_id', tid),
      supabase.from('fechamentos_bimestres').select('disciplina').eq('turma_id', tid)
    ]);

    const set = new Set<string>();
    (horariosRes.data || []).forEach(h => {
      const c = (h.componente || '').trim();
      if (c && c.toUpperCase() !== 'GERAL') set.add(c);
    });
    (avsRes.data || []).forEach(a => {
      const d = (a.disciplina || '').trim();
      if (d && d.toUpperCase() !== 'GERAL') set.add(d);
    });
    (fechamentosRes.data || []).forEach(f => {
      const d = (f.disciplina || '').trim();
      if (d && d.toUpperCase() !== 'GERAL' && d.toUpperCase() !== 'TODAS') set.add(d);
    });

    if (set.size === 0) return ['POLIVALENTE'];
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  },

  fetchFechamentosRaw: async (
    turmaId: string | number,
    disciplina?: string
  ): Promise<{ id?: string; bimestre: string; status: string; disciplina: string; data_fechamento?: string; created_at?: string; usuario_fechamento_id?: string }[]> => {
    const tid = getTid(turmaId);
    let query = supabase
      .from('fechamentos_bimestres')
      .select('id, bimestre, status, disciplina, data_fechamento, usuario_fechamento_id')
      .eq('turma_id', tid);

    if (disciplina && disciplina.toUpperCase() !== 'TODAS' && disciplina.toUpperCase() !== 'GERAL') {
      query = query.eq('disciplina', disciplina);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((f: any) => ({
      ...f,
      created_at: f.data_fechamento || f.created_at,
    }));
  },

  fetchFechamentos: async (turmaId: string | number, disciplina?: string): Promise<Record<string, boolean>> => {
    const raw = await TurmaService.fetchFechamentosRaw(turmaId, disciplina);
    const map: Record<string, boolean> = {};
    raw.forEach(f => {
      const isFechado = f.status === 'FECHADO';
      if (isFechado) {
        map[f.bimestre] = true;
        const match = f.bimestre.match(/^[1-4]/);
        if (match) {
          const n = match[0];
          map[`${n}. BIMESTRE`] = true;
          map[`${n}º Bimestre`] = true;
        }
      }
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
      let query = supabase
        .from('fechamentos_bimestres')
        .delete()
        .eq('turma_id', tid)
        .eq('bimestre', bimestre);

      if (disciplina && disciplina.toUpperCase() !== 'TODAS') {
        query = query.eq('disciplina', disciplina);
      }

      const { error } = await query;
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
  },

  fetchTurmasRelatorio: async (user: { id: string; role: string; email?: string; escola_id?: string }): Promise<TurmaRelatorioInfo[]> => {
    if (!user) return [];

    if (user.role === 'ADMIN' || user.role === 'GESTOR' || user.role === 'SECRETARIO') {
      let query = supabase
        .from('turmas')
        .select('*, escolas(nome)')
        .order('nome');

      if (user.role === 'SECRETARIO' || user.role === 'GESTOR') {
        if (!user.escola_id) return [];
        query = query.eq('escola_id', user.escola_id);
      }

      const { data: todasTurmas, error } = await query;
      if (error) throw error;
      if (!todasTurmas || todasTurmas.length === 0) return [];

      const turmaIds = todasTurmas.map(t => t.id);

      // Buscar componentes reais dos horários e disciplinas das avaliações cadastradas em paralelo
      const [horariosRes, avRowsRes] = await Promise.all([
        supabase
          .from('professor_horarios')
          .select('turma_id, componente')
          .in('turma_id', turmaIds),
        supabase
          .from('avaliacoes')
          .select('turma_id, disciplina')
          .in('turma_id', turmaIds),
      ]);

      const componentesPorTurma = new Map<string, Set<string>>();

      (horariosRes.data || []).forEach(h => {
        const comp = (h.componente || '').trim();
        if (comp) {
          if (!componentesPorTurma.has(h.turma_id)) {
            componentesPorTurma.set(h.turma_id, new Set());
          }
          componentesPorTurma.get(h.turma_id)!.add(comp);
        }
      });

      (avRowsRes.data || []).forEach(a => {
        const disc = (a.disciplina || '').trim();
        if (disc && disc.toUpperCase() !== 'GERAL') {
          if (!componentesPorTurma.has(a.turma_id)) {
            componentesPorTurma.set(a.turma_id, new Set());
          }
          componentesPorTurma.get(a.turma_id)!.add(disc);
        }
      });

      const finalTurmas: TurmaRelatorioInfo[] = [];

      todasTurmas.forEach(t => {
        let fase = t.nome;
        let numero = '01';

        const match = t.nome.match(/(.+)\s+([A-Za-z0-9]+)$/);
        if (match) {
          fase = match[1].trim();
          numero = match[2].trim();
        } else {
          const matchNum = t.nome.match(/(\d+)$/);
          if (matchNum) numero = matchNum[1];
        }

        let comps = Array.from(componentesPorTurma.get(t.id) || []);
        if (comps.length === 0) {
          comps = ['POLIVALENTE'];
        }
        comps.sort((a, b) => a.localeCompare(b, 'pt-BR'));

        comps.forEach(comp => {
          finalTurmas.push({
            id: t.id,
            nome: t.nome,
            turno: t.turno,
            componente: comp,
            ensino: t.ensino || 'Fundamental Anos Iniciais (1° ao 5° ANO)',
            fase: fase,
            numero: t.turma_codigo || numero,
            escolaId: t.escola_id,
            escolaNome: t.escolas?.nome || 'ESCOLA NÃO IDENTIFICADA'
          });
        });
      });

      return finalTurmas;
    } else {
      const emailLimpo = (user.email || '').trim();
      let profQuery = supabase
        .from('professores')
        .select('id, disciplinas');
      if (user.id) {
        profQuery = profQuery.or(`usuario_id.eq.${user.id},email.ilike.${emailLimpo}`);
      } else {
        profQuery = profQuery.ilike('email', emailLimpo);
      }

      const { data: profs, error: profError } = await profQuery;
      if (profError) throw profError;

      if (profs && profs.length > 0) {
        let allDisciplinas: string[] = [];
        profs.forEach(p => {
          if (p.disciplinas && Array.isArray(p.disciplinas)) {
            allDisciplinas = [...allDisciplinas, ...p.disciplinas];
          }
        });
        let componentes = [...new Set(allDisciplinas)];
        if (componentes.length === 0) componentes = ['POLIVALENTE'];

        const profIds = profs.map(p => p.id);

        const { data: alocs, error: alocError } = await supabase
          .from('professor_alocacoes')
          .select('escola_id, turno')
          .in('professor_id', profIds);

        if (alocError) throw alocError;

        if (alocs && alocs.length > 0) {
          const orConditions = alocs.map(a => `and(escola_id.eq.${a.escola_id},turno.eq.${a.turno})`).join(',');
          const { data: turmasAlocadas, error: turmasError } = await supabase
            .from('turmas')
            .select('*, escolas(nome)')
            .or(orConditions)
            .order('nome');

          if (turmasError) throw turmasError;

          if (turmasAlocadas) {
            const finalTurmas: TurmaRelatorioInfo[] = [];
            turmasAlocadas.forEach(t => {
              componentes.forEach(comp => {
                let fase = t.nome;
                let numero = '01';

                const match = t.nome.match(/(.+)\s+([A-Za-z0-9]+)$/);
                if (match) {
                  fase = match[1].trim();
                  numero = match[2].trim();
                } else {
                  const matchNum = t.nome.match(/(\d+)$/);
                  if (matchNum) numero = matchNum[1];
                }

                finalTurmas.push({
                  id: t.id,
                  nome: t.nome,
                  turno: t.turno,
                  componente: comp,
                  ensino: t.ensino || 'Fundamental Anos Iniciais (1° ao 5° ANO)',
                  fase: fase,
                  numero: t.turma_codigo || numero,
                  escolaId: t.escola_id,
                  escolaNome: t.escolas?.nome || 'ESCOLA NÃO IDENTIFICADA'
                });
              });
            });
            return finalTurmas;
          }
        }
      }
      return [];
    }
  }
};
