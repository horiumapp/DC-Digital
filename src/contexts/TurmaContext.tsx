import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getBimestrePorData, formatarDataParaISO } from '../utils/dateUtils';
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
  parent_id?: string | number;
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
  carregarFaltasDaData: (data: string) => Promise<void>;
  faltasPorData: Record<string, Set<string>>;
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
  const [faltasPorData, setFaltasPorData] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    let isCancelled = false;
    const carregarDados = async () => {
      if (turmaAtiva && !isCancelled) {
        setLoading(true);
        // Limpeza antecipada
        setAlunos([]);
        setAvaliacoes([]);
        setLancamentos([]);
        setHorarioTurma([]);
        setConteudos([]);

        try {
          const rawId = turmaAtiva.id.toString().split('_')[0];
          const [ls, hs, alumnosData, conts, freqs] = await Promise.all([
            TurmaService.fetchLancamentos(rawId, turmaAtiva.componente),
            TurmaService.fetchHorario(rawId, turmaAtiva.componente),
            TurmaService.fetchAlunos(rawId),
            TurmaService.fetchAllConteudos(rawId, turmaAtiva.componente),
            TurmaService.fetchAllFrequencias(rawId, turmaAtiva.componente)
          ]);
          
          if (isCancelled) return;

          setLancamentos(ls);
          setHorarioTurma(hs);
          setAlunos(alumnosData);
          setConteudos(conts);

          const faltasMap: Record<string, Set<string>> = {};
          freqs.forEach((f: any) => {
            if (f.status === 'F') {
              const normalizedDate = formatarDataParaISO(f.data);
              if (!faltasMap[normalizedDate]) faltasMap[normalizedDate] = new Set();
              faltasMap[normalizedDate].add(f.aluno_id.toString());
            }
          });
          setFaltasPorData(faltasMap);
          
          await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alumnosData);
        } catch (err) {
          console.error('Erro ao carregar dados da turma:', err);
          alert('Não foi possível carregar todos os dados desta turma. Verifique sua conexão.');
        } finally {
          if (!isCancelled) setLoading(false);
        }
      }
    };
    carregarDados();
    return () => { isCancelled = true; };
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
              notasAluno[n.avaliacao_id.toString()] = parseFloat(n.valor).toFixed(2).replace('.', ',');
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

  const salvarAvaliacao = async (av: Avaliacao): Promise<string> => {
    if (!turmaAtiva) return '';
    const rawId = turmaAtiva.id.toString().split('_')[0];
    try {
      const createdId = await TurmaService.salvarAvaliacao(av, rawId, turmaAtiva.componente);
      await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alunos);
      return createdId;
    } catch (err) {
      console.error('Erro ao salvar avaliação:', err);
      alert('Não foi possível salvar a avaliação. Verifique sua conexão.');
      return '';
    }
  };

  const removerAvaliacao = async (id: string) => {
    try {
      await TurmaService.removerAvaliacao(id);
      setAvaliacoes(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Erro ao remover avaliação:', err);
      alert('Não foi possível remover a avaliação.');
    }
  };

  const salvarNotas = async (avaliacaoId: string, notas: { alunoId: string, valor: string }[]) => {
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    try {
      await TurmaService.salvarNotas(avaliacaoId, notas);
      await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alunos);
    } catch (err) {
      console.error('Erro ao salvar notas:', err);
      alert('Ocorreu um erro ao salvar as notas.');
    }
  };

  const salvarFrequencia = async (data: string, tempo: string, alunosFreq: Aluno[]) => {
    if (!turmaAtiva) return;
    try {
      await TurmaService.salvarFrequencia(turmaAtiva.id, turmaAtiva.componente, data, tempo, alunosFreq);
      
      // Atualizar lançamentos (UI)
      registrarLancamento({
        turmaId: turmaAtiva.id,
        data,
        tipo: 'frequencia',
        tempo
      });

      // Atualizar faltasPorData em tempo real
      setFaltasPorData(prev => {
        const newMap = { ...prev };
        const normalizedDate = formatarDataParaISO(data);
        const currentAlunosFaltosos = new Set(newMap[normalizedDate] || []);
        alunosFreq.forEach(a => {
          if (a.freq === 'F') {
            currentAlunosFaltosos.add(a.id);
          }
        });
        newMap[normalizedDate] = currentAlunosFaltosos;
        return newMap;
      });

      await carregarFaltasDaData(data);
    } catch (err) {
      console.error('Erro ao salvar frequência:', err);
      alert('Erro ao salvar a frequência.');
    }
  };

  const salvarConteudo = async (cont: Conteudo) => {
    if (!turmaAtiva) return;
    const rawId = turmaAtiva.id.toString().split('_')[0];
    try {
      await TurmaService.salvarConteudo(rawId, turmaAtiva.componente, cont);
      registrarLancamento({ turmaId: rawId, data: cont.data, tipo: 'conteudo', tempo: cont.tempo });
      const conts = await TurmaService.fetchAllConteudos(rawId, turmaAtiva.componente);
      setConteudos(conts);
    } catch (err) {
      console.error('Erro ao salvar conteúdo:', err);
      alert('Erro ao salvar o conteúdo ministrado.');
    }
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

  const carregarFaltasDaData = async (data: string) => {
    if (!turmaAtiva) return;
    try {
      const rawId = turmaAtiva.id.toString().split('_')[0];
      const resp = await TurmaService.buscarFrequenciaPorDia(rawId, turmaAtiva.componente, data);
      const idsFaltosos = new Set(resp.filter((f: any) => f.status === 'F').map((f: any) => f.aluno_id.toString()));
      const normalizedDate = formatarDataParaISO(data);
      setFaltasPorData(prev => ({ ...prev, [normalizedDate]: idsFaltosos }));
    } catch (err) {
      console.error('Erro ao carregar faltas:', err);
    }
  };

  return (
    <TurmaContext.Provider value={{ 
      turmaAtiva, selecionarTurma, 
      lancamentos, registrarLancamento, removerLancamento,
      alunos, avaliacoes, conteudos, horarioTurma, loading, 
      salvarAvaliacao, removerAvaliacao, salvarNotas,
      salvarFrequencia, salvarConteudo, buscarFrequencia, buscarConteudo,
      removerFrequencia, removerConteudo, carregarFaltasDaData, faltasPorData
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
