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
  conteudos: Conteudo[];
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
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [horarioTurma, setHorarioTurma] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const carregarDados = async () => {
      if (turmaAtiva) {
        setLoading(true);
        // Limpeza antecipada
        setAlunos([]);
        setAvaliacoes([]);
        setLancamentos([]);
        setHorarioTurma([]);
        setConteudos([]);

        try {
          const rawId = turmaAtiva.id.toString().split('_')[0];
          const [ls, hs, alumnosData, conts] = await Promise.all([
            TurmaService.fetchLancamentos(rawId, turmaAtiva.componente),
            TurmaService.fetchHorario(rawId, turmaAtiva.componente),
            TurmaService.fetchAlunos(rawId),
            TurmaService.fetchAllConteudos(rawId, turmaAtiva.componente)
          ]);
          
          setLancamentos(ls);
          setHorarioTurma(hs);
          setAlunos(alumnosData);
          setConteudos(conts);
          
          // Busca avaliações (depende de alunos para notas)
          await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alumnosData);
        } catch (err) {
          console.error('Erro ao carregar dados da turma:', err);
        } finally {
          setLoading(false);
        }
      }
    };
    carregarDados();
  }, [turmaAtiva]);

  const fetchAvaliacoesInterno = async (turmaId: string | number, disciplina: string, contextAlunos: Aluno[]) => {
    try {
      const { avaliacoes: avsFormatadas, notasData } = await TurmaService.fetchAvaliacoes(turmaId, disciplina);
      setAvaliacoes(avsFormatadas);
      
      if (notasData.length > 0) {
        setAlunos(prevAlunos => {
          const baseAlunos = contextAlunos.length > 0 ? contextAlunos : prevAlunos;
          return baseAlunos.map(aluno => {
            const notasAluno: Record<string, string> = {};
            notasData.filter((n: any) => n.aluno_id.toString() === aluno.id).forEach((n: any) => {
              notasAluno[n.avaliacao_id.toString()] = n.valor.toString().replace('.', ',');
            });
            return { ...aluno, notas: notasAluno };
          });
        });
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
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    await TurmaService.salvarAvaliacao(av, rawId, turmaAtiva.componente);
    await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alunos);
  };

  const removerAvaliacao = async (id: string) => {
    await TurmaService.removerAvaliacao(id);
    setAvaliacoes(prev => prev.filter(a => a.id !== id));
  };

  const salvarNotas = async (avaliacaoId: string, notas: { alunoId: string, valor: string }[]) => {
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    await TurmaService.salvarNotas(avaliacaoId, notas);
    await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alunos);
  };

  const salvarFrequencia = async (data: string, tempo: string, alunosFreq: Aluno[]) => {
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    await TurmaService.salvarFrequencia(rawId, turmaAtiva.componente, data, tempo, alunosFreq);
    registrarLancamento({ turmaId: rawId, data, tipo: 'frequencia', tempo });
  };

  const salvarConteudo = async (cont: Conteudo) => {
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    await TurmaService.salvarConteudo(rawId, turmaAtiva.componente, cont);
    registrarLancamento({ turmaId: rawId, data: cont.data, tipo: 'conteudo', tempo: cont.tempo });
    // Recarregar conteúdos favoritos para outras abas
    const conts = await TurmaService.fetchAllConteudos(rawId, turmaAtiva.componente);
    setConteudos(conts);
  };

  const buscarFrequencia = async (data: string, tempo: string) => {
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    const freqData = await TurmaService.buscarFrequencia(rawId, turmaAtiva.componente, data, tempo);

    if (freqData.length > 0) {
      setAlunos(prev => prev.map(aluno => {
        const f = freqData.find(fd => fd.aluno_id === aluno.id);
        if (f) return { ...aluno, freq: f.status, part: f.participacao };
        return aluno;
      }));
      registrarLancamento({ turmaId: rawId, data, tipo: 'frequencia', tempo });
    } else {
      setAlunos(prev => prev.map(aluno => ({ ...aluno, freq: 'P', part: 'Presencial' })));
    }
  };

  const buscarConteudo = async (data: string, tempo: string): Promise<Conteudo | null> => {
    if (!turmaAtiva) return null;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    const contData = await TurmaService.buscarConteudo(rawId, turmaAtiva.componente, data, tempo);
    if (contData) {
      registrarLancamento({ turmaId: rawId, data: contData.data, tipo: 'conteudo', tempo: contData.tempo });
    }
    return contData;
  };

  const removerFrequencia = async (data: string, tempo: string) => {
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    await TurmaService.removerFrequencia(rawId, turmaAtiva.componente, data, tempo);
    removerLancamento({ turmaId: rawId, data, tipo: 'frequencia', tempo });
    setAlunos(prev => prev.map(a => ({ ...a, freq: '', part: 'Presencial' })));
  };

  const removerConteudo = async (data: string, tempo: string) => {
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    await TurmaService.removerConteudo(rawId, turmaAtiva.componente, data, tempo);
    removerLancamento({ turmaId: rawId, data, tipo: 'conteudo', tempo });
    // Recarregar conteúdos
    const conts = await TurmaService.fetchAllConteudos(rawId, turmaAtiva.componente);
    setConteudos(conts);
  };

  return (
    <TurmaContext.Provider value={{ 
      turmaAtiva, selecionarTurma, 
      lancamentos, registrarLancamento, removerLancamento,
      alunos, avaliacoes, conteudos, horarioTurma, loading, 
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
