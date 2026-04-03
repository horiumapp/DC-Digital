import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getBimestrePorData } from '../utils/dateUtils';
import { TurmaService } from '../services/turmaService';

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
  const fetchAlunos = async (turmaId: string | number) => {
    try {
      const alunosData = await TurmaService.fetchAlunos(turmaId);
      setAlunos(alunosData);
    } catch (err) {
      console.error('Erro ao carregar alunos:', err);
    }
  };

  const fetchAvaliacoes = async (turmaId: string | number, disciplina: string) => {
    setAvaliacoes([]);
    setAlunos(prev => prev.map(a => ({ ...a, notas: {} })));

    try {
      const { avaliacoes: avsFormatadas, notasData } = await TurmaService.fetchAvaliacoes(turmaId, disciplina);
      if (avsFormatadas.length > 0) {
        setAvaliacoes(avsFormatadas);
        // Aplica as notas nos alunos
        if (notasData.length > 0) {
          setAlunos(prevAlunos => prevAlunos.map(aluno => {
            const notasAluno: Record<string, string> = {};
            notasData.filter((n: any) => n.aluno_id.toString() === aluno.id).forEach((n: any) => {
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
      if (!turmaAtiva) return;
      await TurmaService.salvarAvaliacao(av, turmaAtiva.id, turmaAtiva.componente);
      await fetchAvaliacoes(turmaAtiva.id, turmaAtiva.componente);
    } catch (err) {
      console.error('Erro ao salvar avaliação:', err);
      alert('Erro ao salvar avaliação no banco de dados. Verifique sua conexão.');
    }
  };

  const removerAvaliacao = async (id: string) => {
    try {
      await TurmaService.removerAvaliacao(id);
      setAvaliacoes(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erro ao remover avaliação:', err);
    }
  };

  const salvarNotas = async (avaliacaoId: string, notas: { alunoId: string, valor: string }[]) => {
    try {
      await TurmaService.salvarNotas(avaliacaoId, notas);
      if (turmaAtiva) await fetchAvaliacoes(turmaAtiva.id, turmaAtiva.componente);
    } catch (err) {
      console.error('Erro ao salvar notas:', err);
      alert('Erro ao salvar notas no banco de dados.');
    }
  };

  const salvarFrequencia = async (data: string, tempo: string, alunosFreq: Aluno[]) => {
    try {
      if (!turmaAtiva) return;
      await TurmaService.salvarFrequencia(turmaAtiva.id, turmaAtiva.componente, data, tempo, alunosFreq);
      registrarLancamento({ turmaId: turmaAtiva.id, data, tipo: 'frequencia', tempo });
    } catch (err) {
      console.error('Erro ao salvar frequência:', err);
      alert('Erro ao salvar frequência no banco de dados.');
    }
  };

  const salvarConteudo = async (cont: Conteudo) => {
    try {
      if (!turmaAtiva) return;
      await TurmaService.salvarConteudo(turmaAtiva.id, turmaAtiva.componente, cont);
      registrarLancamento({ turmaId: turmaAtiva.id, data: cont.data, tipo: 'conteudo', tempo: cont.tempo });
    } catch (err) {
      console.error('Erro ao salvar conteúdo:', err);
      alert('Erro ao salvar conteúdo no banco de dados.');
    }
  };

  const buscarFrequencia = async (data: string, tempo: string) => {
    try {
      if (!turmaAtiva) return;
      
      const freqData = await TurmaService.buscarFrequencia(turmaAtiva.id, turmaAtiva.componente, data, tempo);

      if (freqData.length > 0) {
        setAlunos(prev => prev.map(aluno => {
          const f = freqData.find(fd => fd.aluno_id === aluno.id);
          if (f) return { ...aluno, freq: f.status, part: f.participacao };
          return aluno;
        }));
        registrarLancamento({ turmaId: turmaAtiva.id, data, tipo: 'frequencia', tempo });
      } else {
        setAlunos(prev => prev.map(aluno => ({ ...aluno, freq: 'P', part: 'Presencial' })));
      }
    } catch (err) {
      console.error('Erro ao buscar frequência:', err);
    }
  };

  const buscarConteudo = async (data: string, tempo: string): Promise<Conteudo | null> => {
    try {
      if (!turmaAtiva) return null;
      
      const contData = await TurmaService.buscarConteudo(turmaAtiva.id, turmaAtiva.componente, data, tempo);

      if (contData) {
        registrarLancamento({ turmaId: turmaAtiva.id, data, tipo: 'conteudo', tempo });
        return contData;
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
      await TurmaService.removerFrequencia(turmaAtiva.id, turmaAtiva.componente, data, tempo);
      
      removerLancamento({ turmaId: turmaAtiva.id, data, tempo, tipo: 'frequencia' });
      setAlunos(prev => prev.map(a => ({ ...a, freq: '', part: 'Presencial' })));
    } catch (err) {
      console.error('Erro ao remover frequência:', err);
      alert('Erro ao excluir frequência do banco de dados.');
    }
  };

  const removerConteudo = async (data: string, tempo: string) => {
    try {
      if (!turmaAtiva) return;
      await TurmaService.removerConteudo(turmaAtiva.id, turmaAtiva.componente, data, tempo);
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
