import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';

import { getBimestrePorData, formatarDataParaISO } from '../utils/dateUtils';
import { getTid } from '../utils/turmaUtils';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import { useToast } from '../components/common/Toast';
import { useAuth } from './AuthContext';

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
  escola_id?: string; // FIX #3: necessário para validação IDOR sem sessionStorage
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
  cpf?: string;
  freq: string;
  part: string;
  notas?: Record<string, string>; // ID da avaliação -> valor da nota
}

export interface ObjetoAvaliacao {
  objeto: string;
  unidade: string;
}

export interface Avaliacao {
  id: string;
  turmaId: string | number;
  tipo: string;
  data: string;
  instrumento: string;
  objetos: ObjetoAvaliacao[];
  bimestre?: string;
  valorMaximo?: number;
  parent_id?: string | number;
}

export interface Conteudo {
  id?: string;
  turmaId: string | number;
  data: string;
  tempo: string;
  objetos: string[];
  habilidades: string[];
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
  salvarAvaliacao: (av: Avaliacao) => Promise<string>;
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
  fechamentos: Record<string, boolean>;
  salvarFechamento: (bimestre: string, status: 'ABERTO' | 'FECHADO') => Promise<void>;
  verificarPeriodoFechado: (dateOrBimestreId: string) => boolean;
}

const TurmaContext = createContext<TurmaContextType | undefined>(undefined);

export function TurmaProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [turmaAtiva, setTurmaAtiva] = useState<Turma | null>(null);
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [conteudos, setConteudos] = useState<Conteudo[]>([]);
  const [horarioTurma, setHorarioTurma] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(false);
  const [faltasPorData, setFaltasPorData] = useState<Record<string, Set<string>>>({});
  const [fechamentos, setFechamentos] = useState<Record<string, boolean>>({});
  
  const { showError, showSuccess } = useToast();

  // FIX: Usar refs para as funções de toast para evitar re-renders no useEffect
  const showErrorRef = useRef(showError);
  const showSuccessRef = useRef(showSuccess);
  useEffect(() => { showErrorRef.current = showError; }, [showError]);
  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const verificarPeriodoFechado = useCallback((dateOrBimestreId: string): boolean => {
    if (!dateOrBimestreId) return false;
    let bimestreId = dateOrBimestreId;
    if (dateOrBimestreId.includes('-') || dateOrBimestreId.includes('/')) {
      bimestreId = getBimestrePorData(dateOrBimestreId);
    }
    return !!fechamentos[bimestreId];
  }, [fechamentos]);

  const fetchAvaliacoesInterno = useCallback(async (turmaId: string | number, disciplina: string, contextAlunos: Aluno[], signal?: AbortSignal) => {
    try {
      const { avaliacoes: avsFormatadas, notasData } = await OfflineTurmaService.fetchAvaliacoes(turmaId, disciplina);
      
      if (signal?.aborted) return;

      setAvaliacoes(avsFormatadas);
      
      if (notasData.length > 0) {
        setAlunos(prevAlunos => {
          const baseAlunos = prevAlunos.length > 0 ? prevAlunos : contextAlunos;
          return baseAlunos.map(aluno => {
            const notasAluno: Record<string, string> = {};
            notasData.filter(n => String(n.aluno_id) === String(aluno.id)).forEach(n => {
              const valNum = typeof n.valor === 'number' ? n.valor : parseFloat(String(n.valor));
              notasAluno[String(n.avaliacao_id)] = !isNaN(valNum) ? valNum.toFixed(2).replace('.', ',') : String(n.valor);
            });
            return { ...aluno, notas: { ...(aluno.notas || {}), ...notasAluno } };
          });
        });
      }
    } catch (err) {
      console.error('Erro ao carregar avaliações:', err);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    const carregarDados = async () => {
      if (turmaAtiva && !signal.aborted) {
        setLoading(true);
        // Limpeza antecipada
        setAlunos([]);
        setAvaliacoes([]);
        setLancamentos([]);
        setHorarioTurma([]);
        setConteudos([]);
        setFechamentos({});

        try {
          const rawId = getTid(turmaAtiva.id);
          const [ls, hs, alumnosData, conts, freqs, fechamentosData] = await Promise.all([
            OfflineTurmaService.fetchLancamentos(rawId, turmaAtiva.componente),
            OfflineTurmaService.fetchHorario(rawId, turmaAtiva.componente),
            OfflineTurmaService.fetchAlunos(rawId),
            OfflineTurmaService.fetchAllConteudos(rawId, turmaAtiva.componente),
            OfflineTurmaService.fetchAllFrequencias(rawId, turmaAtiva.componente),
            OfflineTurmaService.fetchFechamentos(rawId, turmaAtiva.componente)
          ]);
          
          if (signal.aborted) return;

          setLancamentos(ls);
          setHorarioTurma(hs);
          setAlunos(alumnosData);
          setConteudos(conts);
          setFechamentos(fechamentosData);

          const faltasMap: Record<string, Set<string>> = {};
          freqs.forEach((f) => {
            if (f.status === 'F') {
              const normalizedDate = formatarDataParaISO(f.data || '');
              if (!faltasMap[normalizedDate]) faltasMap[normalizedDate] = new Set();
              faltasMap[normalizedDate].add(f.aluno_id.toString());
            }
          });
          setFaltasPorData(faltasMap);
          
          await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alumnosData, signal);
        } catch (err) {
          console.error('Erro ao carregar dados da turma:', err);
          showErrorRef.current('Não foi possível carregar todos os dados desta turma. Verifique sua conexão.');
        } finally {
          if (!signal.aborted) setLoading(false);
        }
      }
    };
    carregarDados();
    return () => { abortController.abort(); };
  }, [turmaAtiva, fetchAvaliacoesInterno]);

  // FIX #3: Validar IDOR usando turma.escola_id diretamente em vez de sessionStorage
  // sessionStorage é mutável via DevTools — não é fonte confiável para autorização.
  const selecionarTurma = useCallback((turma: Turma) => {
    if (user && user.role !== 'ADMIN') {
      // Para não-ADMIN, verificar se a turma pertence à escola do usuário
      // usando o campo da turma diretamente (fonte confiável: dado do servidor)
      if (user.escola_id && turma.escola_id && user.escola_id !== turma.escola_id) {
        showErrorRef.current('Acesso negado: Você não tem permissão para acessar turmas de outra escola.');
        console.error(`[TurmaContext] IDOR bloqueado: user.escola_id=${user.escola_id}, turma.escola_id=${turma.escola_id}`);
        return;
      }
    }
    setTurmaAtiva(turma);
  }, [user]);

  const registrarLancamento = useCallback((novo: Lancamento) => {
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
  }, []);

  const removerLancamento = useCallback((filtro: Lancamento) => {
    setLancamentos(prev => prev.filter(l => 
      !(String(l.turmaId) === String(filtro.turmaId) && 
        l.data === filtro.data && 
        l.tipo === filtro.tipo && 
        l.tempo === filtro.tempo)
    ));
  }, []);

  const salvarFechamento = useCallback(async (bimestre: string, status: 'ABERTO' | 'FECHADO') => {
    if (!turmaAtiva || !user) return;
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.salvarFechamento(rawId, turmaAtiva.componente, bimestre, status, user.id);
      setFechamentos(prev => ({ ...prev, [bimestre]: status === 'FECHADO' }));
      showSuccessRef.current(`Aparata ${status === 'FECHADO' ? 'fechada' : 'reaberta'} com sucesso!`);
    } catch (err) {
      console.error('Erro ao salvar fechamento:', err);
      showErrorRef.current(`Não foi possível ${status === 'FECHADO' ? 'fechar' : 'reabrir'} a aparata.`);
    }
  }, [turmaAtiva, user]);

  const salvarAvaliacao = useCallback(async (av: Avaliacao): Promise<string> => {
    if (!turmaAtiva) return '';
    if (verificarPeriodoFechado(av.bimestre || av.data)) {
      showErrorRef.current('Operação bloqueada: O período selecionado está fechado.');
      return '';
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      const createdId = await OfflineTurmaService.salvarAvaliacao(av, rawId, turmaAtiva.componente);
      const avaliacaoSalva: Avaliacao = {
        ...av,
        id: createdId || av.id,
        bimestre: av.bimestre || getBimestrePorData(av.data)
      };

      setAvaliacoes(prev => {
        const index = prev.findIndex(a => a.id === av.id || a.id === createdId);
        if (index >= 0) {
          const updated = [...prev];
          updated[index] = avaliacaoSalva;
          return updated;
        }
        return [...prev, avaliacaoSalva];
      });

      await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alunos);
      showSuccessRef.current('Avaliação salva com sucesso!');
      return createdId;
    } catch (err) {
      console.error('Erro ao salvar avaliação:', err);
      showErrorRef.current('Não foi possível salvar a avaliação. Verifique sua conexão.');
      return '';
    }
  }, [turmaAtiva, alunos, verificarPeriodoFechado, fetchAvaliacoesInterno]);

  const removerAvaliacao = useCallback(async (id: string) => {
    const av = avaliacoes.find(a => a.id === id);
    if (av && verificarPeriodoFechado(av.bimestre || av.data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta avaliação está fechado.');
      return;
    }
    try {
      await OfflineTurmaService.removerAvaliacao(id);
      setAvaliacoes(prev => prev.filter(a => a.id !== id));
      showSuccessRef.current('Avaliação removida.');
    } catch (err) {
      console.error('Erro ao remover avaliação:', err);
      showErrorRef.current('Não foi possível remover a avaliação.');
    }
  }, [avaliacoes, verificarPeriodoFechado]);

  const salvarNotas = useCallback(async (avaliacaoId: string, notas: { alunoId: string, valor: string }[]) => {
    if (!turmaAtiva) return;
    const av = avaliacoes.find(a => String(a.id) === String(avaliacaoId));
    if (av && verificarPeriodoFechado(av.bimestre || av.data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta avaliação está fechado.');
      return;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.salvarNotas(avaliacaoId, notas);

      // Atualiza o estado local dos alunos imediatamente com as novas notas
      setAlunos(prevAlunos => {
        const notasMap = new Map<string, string>();
        notas.forEach(n => notasMap.set(String(n.alunoId), n.valor));

        return prevAlunos.map(aluno => {
          const novaNota = notasMap.get(String(aluno.id));
          if (novaNota !== undefined) {
            return {
              ...aluno,
              notas: {
                ...(aluno.notas || {}),
                [String(avaliacaoId)]: novaNota
              }
            };
          }
          return aluno;
        });
      });

      await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alunos);
      showSuccessRef.current('Notas salvas com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar notas:', err);
      showErrorRef.current('Ocorreu um erro ao salvar as notas.');
    }
  }, [turmaAtiva, avaliacoes, alunos, verificarPeriodoFechado, fetchAvaliacoesInterno]);

  const carregarFaltasDaData = useCallback(async (data: string) => {
    if (!turmaAtiva) return;
    try {
      const rawId = getTid(turmaAtiva.id);
      const resp = await OfflineTurmaService.buscarFrequenciaPorDia(rawId, turmaAtiva.componente, data);
      const idsFaltosos = new Set(resp.filter(f => f.status === 'F').map(f => f.aluno_id.toString()));
      const normalizedDate = formatarDataParaISO(data);
      setFaltasPorData(prev => ({ ...prev, [normalizedDate]: idsFaltosos }));
    } catch (err) {
      console.error('Erro ao carregar faltas:', err);
    }
  }, [turmaAtiva]);

  const salvarFrequencia = useCallback(async (data: string, tempo: string, alunosFreq: Aluno[]) => {
    if (!turmaAtiva) return;
    if (verificarPeriodoFechado(data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta data está fechado.');
      return;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.salvarFrequencia(rawId, turmaAtiva.componente, data, tempo, alunosFreq);
      
      registrarLancamento({
        turmaId: turmaAtiva.id,
        data,
        tipo: 'frequencia',
        tempo
      });

      await carregarFaltasDaData(data);
      showSuccessRef.current('Frequência salva!');
    } catch (err) {
      console.error('Erro ao salvar frequência:', err);
      showErrorRef.current('Erro ao salvar a frequência.');
    }
  }, [turmaAtiva, verificarPeriodoFechado, registrarLancamento, carregarFaltasDaData]);

  const salvarConteudo = useCallback(async (cont: Conteudo) => {
    if (!turmaAtiva) return;
    if (verificarPeriodoFechado(cont.data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta data está fechado.');
      return;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.salvarConteudo(rawId, turmaAtiva.componente, cont);
      registrarLancamento({ turmaId: rawId, data: cont.data, tipo: 'conteudo', tempo: cont.tempo });
      const conts = await OfflineTurmaService.fetchAllConteudos(rawId, turmaAtiva.componente);
      setConteudos(conts);
      showSuccessRef.current('Conteúdo salvo!');
    } catch (err) {
      console.error('Erro ao salvar conteúdo:', err);
      showErrorRef.current('Erro ao salvar o conteúdo ministrado.');
    }
  }, [turmaAtiva, verificarPeriodoFechado, registrarLancamento]);

  const buscarFrequencia = useCallback(async (data: string, tempo: string) => {
    if (!turmaAtiva) return;
    const rawId = getTid(turmaAtiva.id);
    const freqData = await OfflineTurmaService.buscarFrequencia(rawId, turmaAtiva.componente, data, tempo);

    if (freqData.length > 0) {
      setAlunos(prev => prev.map(aluno => {
        const f = freqData.find(fd => String(fd.aluno_id) === String(aluno.id));
        if (f) return { ...aluno, freq: f.status, part: f.participacao || 'Presencial' };
        return aluno;
      }));
      registrarLancamento({ turmaId: rawId, data, tipo: 'frequencia', tempo });
    } else {
      setAlunos(prev => prev.map(aluno => ({ ...aluno, freq: 'P', part: 'Presencial' })));
    }
  }, [turmaAtiva, registrarLancamento]);

  const buscarConteudo = useCallback(async (data: string, tempo: string): Promise<Conteudo | null> => {
    if (!turmaAtiva) return null;
    const rawId = getTid(turmaAtiva.id);
    const contData = await OfflineTurmaService.buscarConteudo(rawId, turmaAtiva.componente, data, tempo);
    if (contData) {
      registrarLancamento({ turmaId: rawId, data: contData.data, tipo: 'conteudo', tempo: contData.tempo });
    }
    return contData;
  }, [turmaAtiva, registrarLancamento]);

  const removerFrequencia = useCallback(async (data: string, tempo: string) => {
    if (!turmaAtiva) return;
    if (verificarPeriodoFechado(data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta data está fechado.');
      return;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.removerFrequencia(rawId, turmaAtiva.componente, data, tempo);
      removerLancamento({ turmaId: rawId, data, tipo: 'frequencia', tempo });
      setAlunos(prev => prev.map(a => ({ ...a, freq: '', part: 'Presencial' })));
      await carregarFaltasDaData(data);
      showSuccessRef.current('Lançamento de frequência removido.');
    } catch {
      showErrorRef.current('Não foi possível remover a frequência.');
    }
  }, [turmaAtiva, verificarPeriodoFechado, removerLancamento, carregarFaltasDaData]);

  const removerConteudo = useCallback(async (data: string, tempo: string) => {
    if (!turmaAtiva) return;
    if (verificarPeriodoFechado(data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta data está fechado.');
      return;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.removerConteudo(rawId, turmaAtiva.componente, data, tempo);
      removerLancamento({ turmaId: rawId, data, tipo: 'conteudo', tempo });
      const conts = await OfflineTurmaService.fetchAllConteudos(rawId, turmaAtiva.componente);
      setConteudos(conts);
      showSuccessRef.current('Conteúdo removido.');
    } catch {
      showErrorRef.current('Não foi possível remover o conteúdo.');
    }
  }, [turmaAtiva, verificarPeriodoFechado, removerLancamento]);

  // FIX M1: Memorizar o value do Provider para evitar re-renders desnecessários
  // em todos os consumidores quando nenhum dado mudou de fato.
  const contextValue = useMemo(() => ({
    turmaAtiva, selecionarTurma, 
    lancamentos, registrarLancamento, removerLancamento,
    alunos, avaliacoes, conteudos, horarioTurma, loading, 
    salvarAvaliacao, removerAvaliacao, salvarNotas,
    salvarFrequencia, salvarConteudo, buscarFrequencia, buscarConteudo,
    removerFrequencia, removerConteudo, carregarFaltasDaData, faltasPorData,
    fechamentos, salvarFechamento, verificarPeriodoFechado
  }), [
    turmaAtiva, selecionarTurma,
    lancamentos, registrarLancamento, removerLancamento,
    alunos, avaliacoes, conteudos, horarioTurma, loading,
    salvarAvaliacao, removerAvaliacao, salvarNotas,
    salvarFrequencia, salvarConteudo, buscarFrequencia, buscarConteudo,
    removerFrequencia, removerConteudo, carregarFaltasDaData, faltasPorData,
    fechamentos, salvarFechamento, verificarPeriodoFechado
  ]);

  return (
    <TurmaContext.Provider value={contextValue}>
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
