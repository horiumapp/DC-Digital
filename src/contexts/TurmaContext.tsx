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

interface TurmaContextType {
  turmaAtiva: Turma | null;
  selecionarTurma: (turma: Turma) => void;
  lancamentos: Lancamento[];
  registrarLancamento: (lancamento: Lancamento) => void;
  removerLancamento: (lancamento: Lancamento) => void;
  alunos: Aluno[];
  avaliacoes: Avaliacao[];
  loading: boolean;
  salvarAvaliacao: (av: Avaliacao) => Promise<void>;
  removerAvaliacao: (id: string) => Promise<void>;
  salvarNotas: (avaliacaoId: string, notas: { alunoId: string, valor: string }[]) => Promise<void>;
}

const TurmaContext = createContext<TurmaContextType | undefined>(undefined);

export function TurmaProvider({ children }: { children: ReactNode }) {
  const [turmaAtiva, setTurmaAtiva] = useState<Turma | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (turmaAtiva) {
      cargarDadosTurma(turmaAtiva.id);
    } else {
      setAlunos([]);
      setAvaliacoes([]);
    }
  }, [turmaAtiva]);

  const cargarDadosTurma = async (turmaId: string | number) => {
    setLoading(true);
    await Promise.all([
      fetchAlunos(turmaId),
      fetchAvaliacoes(turmaId)
    ]);
    setLoading(false);
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
    try {
      const { data, error } = await supabase
        .from('avaliacoes')
        .select('*')
        .eq('turma_id', turmaId.toString())
        .order('data', { ascending: false });

      if (data) {
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
        if (avaliacaoIds.length > 0) {
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
        l.turmaId === novo.turmaId && 
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
      !(l.turmaId === filtro.turmaId && 
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

  return (
    <TurmaContext.Provider value={{ 
      turmaAtiva, selecionarTurma, 
      lancamentos, registrarLancamento, removerLancamento,
      alunos, avaliacoes, loading, 
      salvarAvaliacao, removerAvaliacao, salvarNotas 
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
