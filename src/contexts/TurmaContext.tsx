import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getBimestrePorData } from '../utils/dateUtils';

export interface TurmaMetricas {
  frequencia: number;
  objetosMinistrados: number;
  objetosPlanejados: number;
  avaliacoesCadastradas: number;
  avaliacoesPrevistas: number;
  notasLancadas: number;
  notasPrevistas: number;
}

export interface Turma {
  id: string | number;
  ensino: string;
  fase: string;
  componente: string;
  professor: string;
  escola: string;
  turno: string;
  metricas: TurmaMetricas;
  diasDeAula: number[];
  tempos: string[];
}

export interface Lancamento {
  turmaId: string | number;
  data: string;
  tipo: 'frequencia' | 'conteudo';
  tempo: string;
}

export interface Aluno {
  id: string;
  nome: string;
  matricula: string;
  freq: string;
  part: string;
  notas?: Record<string, string>; // ID da avaliação -> valor da nota
}

export interface Avaliacao {
  id: string;
  turmaId: string | number;
  tipo: string;
  data: string;
  instrumento: string;
  objetos: any[];
  bimestre?: string;
  valorMaximo?: number;
}

export interface Conteudo {
  id?: string;
  turmaId: string | number;
  data: string;
  tempo: string;
  objetos: any[];
  habilidades: any[];
  descricao: string;
}

export interface Horario {
  dia_semana: number;
  tempo_ordem: number;
}

interface TurmaContextType {
  turmaAtiva: Turma | null;
  selecionarTurma: (turma: Turma) => void;
  lancamentos: Lancamento[];
  registrarLancamento: (lancamento: Lancamento) => void;
  removerLancamento: (lancamento: Lancamento) => void;
  alunos: Aluno[];
  avaliacoes: Avaliacao[];
  horarioTurma: Horario[];
  loading: boolean;
  salvarAvaliacao: (av: Avaliacao) => Promise<void>;
  removerAvaliacao: (id: string) => Promise<void>;
  salvarNotas: (avaliacaoId: string, notas: { alunoId: string, valor: string }[]) => Promise<void>;
  salvarFrequencia: (data: string, tempo: string, alunosFreq: Aluno[]) => Promise<void>;
  salvarConteudo: (cont: Conteudo) => Promise<void>;
  buscarFrequencia: (data: string, tempo: string) => Promise<void>;
  buscarConteudo: (data: string, tempo: string) => Promise<Conteudo | null>;
  removerFrequencia: (data: string, tempo: string) => Promise<void>;
  removerConteudo: (data: string, tempo: string) => Promise<void>;
}

const TurmaContext = createContext<TurmaContextType | undefined>(undefined);

export function TurmaProvider({ children }: { children: ReactNode }) {
  const [turmaAtiva, setTurmaAtiva] = useState<Turma | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [horarioTurma, setHorarioTurma] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (turmaAtiva) {
      // Limpeza imediata ao trocar de turma
      setAlunos([]);
      setAvaliacoes([]);
      setLancamentos([]);
      setHorarioTurma([]);
      cargarDadosTurma(turmaAtiva.id);
    } else {
      setAlunos([]);
      setAvaliacoes([]);
      setLancamentos([]);
      setHorarioTurma([]);
    }
  }, [turmaAtiva]);

  const cargarDadosTurma = async (turmaId: string | number) => {
    setLoading(true);
    await Promise.all([
      fetchAlunos(turmaId),
      fetchAvaliacoes(turmaId),
      fetchLancamentos(turmaId),
      fetchHorario(turmaId)
    ]);
    setLoading(false);
  };

  const fetchHorario = async (turmaId: string | number) => {
    try {
      const { data, error } = await supabase
        .from('professor_horarios')
        .select('dia_semana, tempo_ordem')
        .eq('turma_id', turmaId.toString());

      if (data) {
        setHorarioTurma(data);
      }
    } catch (err) {
      console.error('Erro ao carregar horário da turma:', err);
    }
  };

  const fetchLancamentos = async (turmaId: string | number) => {
    try {
      const [freqRes, contRes] = await Promise.all([
        supabase.from('frequencias').select('data, tempo').eq('turma_id', turmaId.toString()),
        supabase.from('conteudos').select('data, tempo').eq('turma_id', turmaId.toString())
      ]);

      const novosLancamentos: Lancamento[] = [];

      if (freqRes.data) {
        // Usamos um Set para evitar duplicatas de tempo/data
        const uniqueFreqs = new Set(freqRes.data.map(f => `${f.data}|${f.tempo}`));
        uniqueFreqs.forEach(val => {
          const [data, tempo] = val.split('|');
          novosLancamentos.push({ turmaId, data, tempo, tipo: 'frequencia' });
        });
      }

      if (contRes.data) {
        contRes.data.forEach(c => {
          novosLancamentos.push({ turmaId, data: c.data, tempo: c.tempo, tipo: 'conteudo' });
        });
      }

      setLancamentos(novosLancamentos);
    } catch (err) {
      console.error('Erro ao carregar lançamentos:', err);
    }
  };

  const fetchAlunos = async (turmaId: string | number) => {
    try {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId.toString()) // Garante que UUID string funcione
        .order('nome');

      if (data) {
        setAlunos(data.map(a => ({
          id: a.id.toString(),
          nome: a.nome,
          matricula: a.matricula || `2026/${a.id.toString().slice(-7)}`, 
          freq: 'P',
          part: 'Presencial',
          notas: {}
        })));
      }
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
    }
  };

  const fetchAvaliacoes = async (turmaId: string | number) => {
    // Limpar estado antes de buscar para evitar dados fantasma de outras turmas
    setAvaliacoes([]);
    setAlunos(prev => prev.map(a => ({ ...a, notas: {} })));

    try {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('turma_id', turmaId.toString())
        .order('data', { ascending: false });

      if (data && data.length > 0) {
        setAvaliacoes(data.map(av => ({
          id: av.id.toString(),
          turmaId: av.turma_id,
          tipo: av.tipo,
          data: av.data,
          instrumento: av.instrumento,
          objetos: av.objetos || [],
          bimestre: av.bimestre || getBimestrePorData(av.data),
          valorMaximo: av.valor_maximo
        })));

        // Carregar notas para estas avaliações
        const avaliacaoIds = data.map(av => av.id);
        const { data: notasData } = await supabase
          .from('notas')
          .select('*')
          .in('avaliacao_id', avaliacaoIds);

        if (notasData) {
          setAlunos(prevAlunos => prevAlunos.map(aluno => {
            const notasAluno: Record<string, string> = {};
            notasData.filter(n => n.aluno_id.toString() === aluno.id).forEach(n => {
              notasAluno[n.avaliacao_id.toString()] = n.valor.toString().replace('.', ',');
            });
            return { ...aluno, notas: notasAluno };
          }));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    }
  };

  const selecionarTurma = (turma: Turma) => {
    setTurmaAtiva(turma);
  };

  const registrarLancamento = (novo: Lancamento) => {
    setLancamentos(prev => {
      const existe = prev.some(l => 
        String(l.turmaId) === String(novo.turmaId) && 
        l.data === novo.data && 
        l.tipo === novo.tipo && 
        l.tempo === novo.tempo
      );
      if (existe) return prev;
      return [...prev, novo];
    });
  };

  const removerLancamento = (filtro: Lancamento) => {
    setLancamentos(prev => prev.filter(l => 
      !(String(l.turmaId) === String(filtro.turmaId) && 
        l.data === filtro.data && 
        l.tipo === filtro.tipo && 
        l.tempo === filtro.tempo)
    ));
  };

  const salvarAvaliacao = async (av: Avaliacao) => {
    try {
      const payload = {
        turma_id: turmaAtiva?.id.toString(),
        tipo: av.tipo,
        data: av.data,
        instrumento: av.instrumento,
        objetos: av.objetos,
        bimestre: av.bimestre || getBimestrePorData(av.data),
        valor_maximo: av.valorMaximo || 10
      };

      let error;
      // Se o ID começar com 'temp_' ou não existir, é um novo registro (INSERT)
      if (!av.id || av.id.startsWith('temp_')) {
        const { error: insError } = await supabase.from('avaliacoes').insert([payload]);
        error = insError;
      } else {
        // Já possui um ID numérico real do banco, então faz UPDATE
        const { error: updError } = await supabase.from('avaliacoes').update(payload).eq('id', av.id);
        error = updError;
      }

      if (error) throw error;
      if (turmaAtiva) await fetchAvaliacoes(turmaAtiva.id);
    } catch (err) {
      console.error('Erro ao salvar avaliação:', err);
      alert('Erro ao salvar avaliação no banco de dados. Verifique sua conexão.');
    }
  };

  const removerAvaliacao = async (id: string) => {
    try {
      const { error } = await supabase.from('avaliacoes').delete().eq('id', id);
      if (error) throw error;
      setAvaliacoes(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erro ao remover avaliação:', err);
    }
  };

  const salvarNotas = async (avaliacaoId: string, notas: { alunoId: string, valor: string }[]) => {
    try {
      const upserts = notas.map(n => ({
        avaliacao_id: avaliacaoId,
        aluno_id: n.alunoId,
        valor: parseFloat(n.valor.replace(',', '.'))
      }));

      const { error } = await supabase.from('notas').upsert(upserts, { onConflict: 'avaliacao_id,aluno_id' });
      if (error) throw error;
      
      if (turmaAtiva) await fetchAvaliacoes(turmaAtiva.id);
    } catch (err) {
      console.error('Erro ao salvar notas:', err);
      alert('Erro ao salvar notas no banco de dados.');
    }
  };

  const salvarFrequencia = async (data: string, tempo: string, alunosFreq: Aluno[]) => {
    try {
      if (!turmaAtiva) return;
      
      const upserts = alunosFreq.map(aluno => ({
        turma_id: turmaAtiva.id.toString(),
        aluno_id: aluno.id,
        data,
        tempo,
        status: aluno.freq || 'P',
        participacao: aluno.part || 'Presencial'
      }));

      const { error } = await supabase.from('frequencias').upsert(upserts, { 
        onConflict: 'turma_id,aluno_id,data,tempo' 
      });
      
      if (error) throw error;
      
      // Atualiza lista de lançamentos local para mostrar o check verde
      registrarLancamento({ turmaId: turmaAtiva.id, data, tipo: 'frequencia', tempo });
    } catch (err) {
      console.error('Erro ao salvar frequência:', err);
      alert('Erro ao salvar frequência no banco de dados.');
    }
  };

  const salvarConteudo = async (cont: Conteudo) => {
    try {
      if (!turmaAtiva) return;
      
      const payload = {
        turma_id: turmaAtiva.id.toString(),
        data: cont.data,
        tempo: cont.tempo,
        objetos: cont.objetos,
        habilidades: cont.habilidades,
        descricao: cont.descricao
      };

      const { error } = await supabase.from('conteudos').upsert(payload, { 
        onConflict: 'turma_id,data,tempo' 
      });
      
      if (error) throw error;
      
      registrarLancamento({ turmaId: turmaAtiva.id, data: cont.data, tipo: 'conteudo', tempo: cont.tempo });
    } catch (err) {
      console.error('Erro ao salvar conteúdo:', err);
      alert('Erro ao salvar conteúdo no banco de dados.');
    }
  };

  const buscarFrequencia = async (data: string, tempo: string) => {
    try {
      if (!turmaAtiva) return;
      
      const { data: freqData, error } = await supabase
        .from('frequencias')
        .select('*')
        .eq('turma_id', turmaAtiva.id.toString())
        .eq('data', data)
        .eq('tempo', tempo);

      if (error) throw error;

      if (freqData && freqData.length > 0) {
        setAlunos(prev => prev.map(aluno => {
          const f = freqData.find(fd => fd.aluno_id === aluno.id);
          if (f) {
            return { ...aluno, freq: f.status, part: f.participacao };
          }
          return aluno;
        }));
        // Marca como lançado
        registrarLancamento({ turmaId: turmaAtiva.id, data, tipo: 'frequencia', tempo });
      } else {
        // Reset para 'P' (Presença) por padrão se não houver dados salvos
        setAlunos(prev => prev.map(aluno => ({ ...aluno, freq: 'P', part: 'Presencial' })));
      }
    } catch (err) {
      console.error('Erro ao buscar frequência:', err);
    }
  };

  const buscarConteudo = async (data: string, tempo: string): Promise<Conteudo | null> => {
    try {
      if (!turmaAtiva) return null;
      
      const { data: contData, error } = await supabase
        .from('conteudos')
        .select('*')
        .eq('turma_id', turmaAtiva.id.toString())
        .eq('data', data)
        .eq('tempo', tempo)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (contData) {
        registrarLancamento({ turmaId: turmaAtiva.id, data, tipo: 'conteudo', tempo });
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
    } catch (err) {
      console.error('Erro ao buscar conteúdo:', err);
      return null;
    }
  };

  const removerFrequencia = async (data: string, tempo: string) => {
    try {
      if (!turmaAtiva) return;
      const { error } = await supabase
        .from('frequencias')
        .delete()
        .eq('turma_id', turmaAtiva.id.toString())
        .eq('data', data)
        .eq('tempo', tempo);

      if (error) throw error;
      
      removerLancamento({ turmaId: turmaAtiva.id, data, tempo, tipo: 'frequencia' });
      // Reset alunos local
      setAlunos(prev => prev.map(a => ({ ...a, freq: '', part: 'Presencial' })));
    } catch (err) {
      console.error('Erro ao remover frequência:', err);
      alert('Erro ao excluir frequência do banco de dados.');
    }
  };

  const removerConteudo = async (data: string, tempo: string) => {
    try {
      if (!turmaAtiva) return;
      const { error } = await supabase
        .from('conteudos')
        .delete()
        .eq('turma_id', turmaAtiva.id.toString())
        .eq('data', data)
        .eq('tempo', tempo);

      if (error) throw error;
      
      removerLancamento({ turmaId: turmaAtiva.id, data, tempo, tipo: 'conteudo' });
    } catch (err) {
      console.error('Erro ao remover conteúdo:', err);
      alert('Erro ao excluir conteúdo do banco de dados.');
    }
  };

  return (
    <TurmaContext.Provider value={{ 
      turmaAtiva, selecionarTurma, 
      lancamentos, registrarLancamento, removerLancamento,
      alunos, avaliacoes, horarioTurma, loading, 
      salvarAvaliacao, removerAvaliacao, salvarNotas,
      salvarFrequencia, salvarConteudo, buscarFrequencia, buscarConteudo,
      removerFrequencia, removerConteudo
    }}>
      {children}
    </TurmaContext.Provider>
  );
}

export function useTurma() {
  const context = useContext(TurmaContext);
  if (context === undefined) {
    throw new Error('useTurma deve ser usado dentro de um TurmaProvider');
  }
  return context;
}
