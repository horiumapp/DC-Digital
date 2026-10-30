import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useRef, useMemo } from 'react';

import { getBimestrePorData, getPeriodoInfoPorData, getBimestreNumero, formatarDataParaISO } from '../utils/dateUtils';
import { getTid } from '../utils/turmaUtils';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import { OfflineNoCacheError } from '../services/turmaServiceOffline';
import { useToast } from '../components/common/Toast';
import { useAuth } from './AuthContext';
import { alunosComAtestadoNaData } from '../services/atestadoService';
import { aplicarAtestadoNaChamada, separarAusenciasDaProva, statusAusenteNaProva, statusCobertoPorAtestado } from '../utils/atestadoFrequencia';
import { professorPodeAbrirTurma } from '../utils/lotacaoProfessor';

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
  // Q1 FIX: `id` é sempre string (UUID) — o tipo `number` era legado de dados
  // não-normalizados. getTid() é mantido como guard de runtime para compatibilidade
  // com registros antigos eventualmente presentes no cache local.
  id: string;
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
  turmaId: string;
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
  /** Falta justificada travada pelo atestado da secretaria. O professor não remove. */
  atestado?: boolean;
}

export interface ObjetoAvaliacao {
  objeto: string;
  unidade: string;
}

export interface Avaliacao {
  disciplina?: string;
  serverRevision?: number;
  id: string;
  turmaId: string;
  tipo: string;
  data: string;
  instrumento: string;
  objetos: ObjetoAvaliacao[];
  bimestre?: string;
  valorMaximo?: number;
  parent_id?: string;
}

export interface Conteudo {
  disciplina?: string;
  serverRevision?: number;
  id?: string;
  turmaId: string;
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
  limparTurmaAtiva: () => void;
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
  /** Retorna `false` quando as notas não puderam ser gravadas. */
  salvarNotas: (avaliacaoId: string, notas: { alunoId: string, valor: string }[], alunoIdsRemovidos?: string[]) => Promise<boolean>;
  salvarFrequencia: (data: string, tempo: string, alunosFreq: Aluno[]) => Promise<boolean>;
  /** Retorna `false` quando o conteúdo não pôde ser gravado. */
  salvarConteudo: (cont: Conteudo) => Promise<boolean>;
  buscarFrequencia: (data: string, tempo: string) => Promise<void>;
  buscarConteudo: (data: string, tempo: string) => Promise<Conteudo | null>;
  removerFrequencia: (data: string, tempo: string) => Promise<boolean>;
  removerConteudo: (data: string, tempo: string) => Promise<void>;
  carregarFaltasDaData: (data: string) => Promise<void>;
  faltasPorData: Record<string, Set<string>>;
  atestadosPorData: Record<string, Set<string>>;
  fechamentos: Record<string, boolean>;
  /** Retorna `false` quando o fechamento/reabertura não pôde ser gravado. */
  salvarFechamento: (bimestre: string, status: 'ABERTO' | 'FECHADO', disciplinaOverride?: string) => Promise<boolean>;
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
  const [atestadosPorData, setAtestadosPorData] = useState<Record<string, Set<string>>>({});
  const [fechamentos, setFechamentos] = useState<Record<string, boolean>>({});

  // FIX Race Condition: Ref para alunos evita stale closure em callbacks assíncronos
  // (salvarNotas, salvarAvaliacao) que capturam snapshot antigo via closure.
  const alunosRef = useRef<Aluno[]>([]);
  useEffect(() => { alunosRef.current = alunos; }, [alunos]);
  
  const { showError, showSuccess } = useToast();

  // FIX: Usar refs para as funções de toast para evitar re-renders no useEffect
  const showErrorRef = useRef(showError);
  const showSuccessRef = useRef(showSuccess);
  useEffect(() => { showErrorRef.current = showError; }, [showError]);
  useEffect(() => { showSuccessRef.current = showSuccess; }, [showSuccess]);

  const verificarPeriodoFechado = useCallback((dateOrBimestreId: string): boolean => {
    if (!dateOrBimestreId) return false;
    
    // 1. Verificação direta na chave recebida
    if (fechamentos[dateOrBimestreId]) return true;

    // 2. Se for data, obter informações do período letivo
    if (dateOrBimestreId.includes('-') || dateOrBimestreId.includes('/')) {
      const periodo = getPeriodoInfoPorData(dateOrBimestreId);
      if (periodo) {
        if (fechamentos[periodo.id] || fechamentos[periodo.nome] || fechamentos[periodo.label]) {
          return true;
        }
      }
    }

    // 3. Normalização pelo número do bimestre (ex: '1. BIMESTRE', '1º Bimestre', 1)
    const num = getBimestreNumero(dateOrBimestreId);
    if (num !== null) {
      if (
        fechamentos[`${num}. BIMESTRE`] ||
        fechamentos[`${num}º Bimestre`] ||
        fechamentos[String(num)]
      ) {
        return true;
      }
    }

    return false;
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

        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        try {
          const rawId = getTid(turmaAtiva.id);
          const TURMA_LOAD_TIMEOUT_MS = 20_000;
          const loadPromise = Promise.all([
            OfflineTurmaService.fetchLancamentos(rawId, turmaAtiva.componente),
            OfflineTurmaService.fetchHorario(rawId, turmaAtiva.componente),
            OfflineTurmaService.fetchAlunos(rawId),
            OfflineTurmaService.fetchConteudosPeriodo(rawId, turmaAtiva.componente),
            OfflineTurmaService.fetchFaltasPeriodo(rawId, turmaAtiva.componente, undefined, undefined, ['F', 'FJ', 'Ausente']),
            OfflineTurmaService.fetchFechamentos(rawId, turmaAtiva.componente)
          ]);
          const [ls, hs, alumnosData, conts, freqs, fechamentosData] = await Promise.race([
            loadPromise.finally(() => {
              if (timeoutId !== undefined) clearTimeout(timeoutId);
            }),
            new Promise<never>((_, reject) => {
              timeoutId = setTimeout(() => reject(new Error('timeout')), TURMA_LOAD_TIMEOUT_MS);
              signal.addEventListener('abort', () => {
                if (timeoutId !== undefined) clearTimeout(timeoutId);
                reject(new DOMException('Aborted', 'AbortError'));
              }, { once: true });
            }),
          ]);

          if (signal.aborted) return;

          setLancamentos(ls);
          setHorarioTurma(hs);
          setAlunos(alumnosData);
          setConteudos(conts);
          setFechamentos(fechamentosData);

          const faltasMap: Record<string, Set<string>> = {};
          const atestadosMap: Record<string, Set<string>> = {};
          freqs.forEach((f) => {
            if (!statusAusenteNaProva(f.status)) return;
            const normalizedDate = formatarDataParaISO(f.data || '');
            if (!faltasMap[normalizedDate]) faltasMap[normalizedDate] = new Set();
            faltasMap[normalizedDate].add(f.aluno_id.toString());
            if (statusCobertoPorAtestado(f.status)) {
              if (!atestadosMap[normalizedDate]) atestadosMap[normalizedDate] = new Set();
              atestadosMap[normalizedDate].add(f.aluno_id.toString());
            }
          });
          setFaltasPorData(faltasMap);
          setAtestadosPorData(atestadosMap);

          await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alumnosData, signal);
        } catch (err) {
          if (signal.aborted || (err instanceof DOMException && err.name === 'AbortError')) {
            return;
          }
          // U1 FIX: Tratar OfflineNoCacheError com mensagem específica em vez de
          // mensagem genérica, pois o problema é cachê vazio (primeira visita offline),
          // não necessariamente um erro de conexão.
          if (err instanceof OfflineNoCacheError) {
            console.warn('[TurmaContext] Offline sem cache local:', err.message);
            showErrorRef.current(err.message);
          } else if (err instanceof Error && err.message === 'timeout') {
            console.warn('[TurmaContext] Timeout ao carregar turma');
            showErrorRef.current('A turma demorou demais para abrir. Verifique a conexão e tente novamente.');
          } else {
            console.error('Erro ao carregar dados da turma:', err);
            showErrorRef.current('Não foi possível carregar todos os dados desta turma. Verifique sua conexão.');
          }
        } finally {
          if (timeoutId !== undefined) clearTimeout(timeoutId);
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
    if (!professorPodeAbrirTurma(user, turma.escola_id)) {
      showErrorRef.current('Acesso negado: Você não tem permissão para acessar turmas de outra escola.');
      console.error(`[TurmaContext] IDOR bloqueado: user.escola_id=${user?.escola_id}, turma.escola_id=${turma.escola_id}`);
      return;
    }
    setTurmaAtiva(turma);
  }, [user]);

  const limparTurmaAtiva = useCallback(() => {
    setTurmaAtiva(null);
  }, []);

  const registrarLancamento = useCallback((novo: Lancamento) => {
    const tidNovo = getTid(novo.turmaId);
    setLancamentos(prev => {
      const existe = prev.some(l => 
        getTid(l.turmaId) === tidNovo && 
        l.data === novo.data && 
        l.tipo === novo.tipo && 
        l.tempo === novo.tempo
      );
      if (existe) return prev;
      return [...prev, { ...novo, turmaId: tidNovo }];
    });
  }, []);

  const removerLancamento = useCallback((filtro: Lancamento) => {
    const tidFiltro = getTid(filtro.turmaId);
    setLancamentos(prev => prev.filter(l => 
      !(getTid(l.turmaId) === tidFiltro && 
        l.data === filtro.data && 
        l.tipo === filtro.tipo && 
        l.tempo === filtro.tempo)
    ));
  }, []);

  const salvarFechamento = useCallback(async (bimestre: string, status: 'ABERTO' | 'FECHADO', disciplinaOverride?: string): Promise<boolean> => {
    if (!turmaAtiva || !user) return false;
    const rawId = getTid(turmaAtiva.id);
    const disc = disciplinaOverride || turmaAtiva.componente;
    try {
      await OfflineTurmaService.salvarFechamento(rawId, disc, bimestre, status, user.id);
      setFechamentos(prev => ({ ...prev, [bimestre]: status === 'FECHADO' }));
      showSuccessRef.current(`Aparata ${status === 'FECHADO' ? 'fechada' : 'reaberta'} com sucesso!`);
      return true;
    } catch (err) {
      console.error('Erro ao salvar fechamento:', err);
      showErrorRef.current(`Não foi possível ${status === 'FECHADO' ? 'fechar' : 'reabrir'} a aparata.`);
      return false;
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

      // FIX R3: Primeiro buscar dados consistentes do servidor/cache (inclui notas),
      // depois garantir que a avaliação recém-salva esteja no estado — evita o flash
      // causado pelo padrão anterior de update otimista + re-fetch que sobrescrevia.
      await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alunosRef.current);
      setAvaliacoes(prev => {
        const exists = prev.some(a => 
          a.id === avaliacaoSalva.id || 
          a.id === createdId || 
          a.id === av.id ||
          (a.tipo === avaliacaoSalva.tipo && a.data === avaliacaoSalva.data && String(a.parent_id || '') === String(avaliacaoSalva.parent_id || ''))
        );
        if (exists) return prev;
        return [...prev, avaliacaoSalva];
      });
      showSuccessRef.current('Avaliação salva com sucesso!');
      return createdId;
    } catch (err) {
      console.error('Erro ao salvar avaliação:', err);
      showErrorRef.current('Não foi possível salvar a avaliação. Verifique sua conexão.');
      return '';
    }
  }, [turmaAtiva, verificarPeriodoFechado, fetchAvaliacoesInterno]);

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

  const salvarNotas = useCallback(async (avaliacaoId: string, notas: { alunoId: string, valor: string }[], alunoIdsRemovidos?: string[]): Promise<boolean> => {
    if (!turmaAtiva) return false;
    const av = avaliacoes.find(a => String(a.id) === String(avaliacaoId));
    if (av && verificarPeriodoFechado(av.bimestre || av.data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta avaliação está fechado.');
      return false;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.salvarNotas(avaliacaoId, notas, alunoIdsRemovidos);

      // Atualiza o estado local dos alunos imediatamente com as novas notas
      setAlunos(prevAlunos => {
        const notasMap = new Map<string, string>();
        notas.forEach(n => notasMap.set(String(n.alunoId), n.valor));
        const removidosSet = new Set(alunoIdsRemovidos || []);

        return prevAlunos.map(aluno => {
          const alunoIdStr = String(aluno.id);
          if (removidosSet.has(alunoIdStr)) {
            const novasNotas = { ...(aluno.notas || {}) };
            delete novasNotas[String(avaliacaoId)];
            return {
              ...aluno,
              notas: novasNotas
            };
          }
          const novaNota = notasMap.get(alunoIdStr);
          if (novaNota !== undefined && novaNota !== '') {
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

      await fetchAvaliacoesInterno(rawId, turmaAtiva.componente, alunosRef.current);
      showSuccessRef.current('Notas salvas com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro ao salvar notas:', err);
      showErrorRef.current('Ocorreu um erro ao salvar as notas.');
      return false;
    }
  }, [turmaAtiva, avaliacoes, verificarPeriodoFechado, fetchAvaliacoesInterno]);

  const carregarFaltasDaData = useCallback(async (data: string) => {
    if (!turmaAtiva) return;
    try {
      const rawId = getTid(turmaAtiva.id);
      const resp = await OfflineTurmaService.buscarFrequenciaPorDia(rawId, turmaAtiva.componente, data);
      const normalizedDate = formatarDataParaISO(data);
      const cobertos = await alunosComAtestadoNaData(rawId, normalizedDate);
      const { ausentes, atestados } = separarAusenciasDaProva(resp, cobertos);
      setFaltasPorData(prev => ({ ...prev, [normalizedDate]: ausentes }));
      setAtestadosPorData(prev => ({ ...prev, [normalizedDate]: atestados }));
    } catch (err) {
      console.error('Erro ao carregar faltas:', err);
    }
  }, [turmaAtiva]);

  const salvarFrequencia = useCallback(async (data: string, tempo: string, alunosFreq: Aluno[]): Promise<boolean> => {
    if (!turmaAtiva) return false;
    if (verificarPeriodoFechado(data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta data está fechado.');
      return false;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      const chamada = alunosFreq.map(aluno => (
        aluno.atestado ? { ...aluno, freq: 'FJ' } : aluno
      ));
      await OfflineTurmaService.salvarFrequencia(rawId, turmaAtiva.componente, data, tempo, chamada);
      
      registrarLancamento({
        turmaId: rawId,
        data,
        tipo: 'frequencia',
        tempo
      });

      await carregarFaltasDaData(data);
      showSuccessRef.current('Frequência salva com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro ao salvar frequência:', err);
      showErrorRef.current('Erro ao salvar a frequência.');
      return false;
    }
  }, [turmaAtiva, verificarPeriodoFechado, registrarLancamento, carregarFaltasDaData]);

  const salvarConteudo = useCallback(async (cont: Conteudo): Promise<boolean> => {
    if (!turmaAtiva) return false;
    if (verificarPeriodoFechado(cont.data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta data está fechado.');
      return false;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.salvarConteudo(rawId, turmaAtiva.componente, cont);
      registrarLancamento({ turmaId: rawId, data: cont.data, tipo: 'conteudo', tempo: cont.tempo });
      const conts = await OfflineTurmaService.fetchConteudosPeriodo(rawId, turmaAtiva.componente);
      setConteudos(conts);
      showSuccessRef.current('Conteúdo ministrado gravado com sucesso!');
      return true;
    } catch (err) {
      console.error('Erro ao salvar conteúdo:', err);
      showErrorRef.current('Erro ao salvar o conteúdo ministrado.');
      return false;
    }
  }, [turmaAtiva, verificarPeriodoFechado, registrarLancamento]);

  const buscarFrequencia = useCallback(async (data: string, tempo: string) => {
    if (!turmaAtiva) return;
    const rawId = getTid(turmaAtiva.id);
    const freqData = await OfflineTurmaService.buscarFrequencia(rawId, turmaAtiva.componente, data, tempo);
    const dataIso = formatarDataParaISO(data);
    const comAtestado = await alunosComAtestadoNaData(rawId, dataIso);

    if (freqData.length > 0) {
      setAlunos(prev => prev.map(aluno => {
        const f = freqData.find(fd => String(fd.aluno_id) === String(aluno.id));
        const base = f
          ? { ...aluno, freq: f.status, part: f.participacao || 'Presencial' }
          : aluno;
        return aplicarAtestadoNaChamada(base, comAtestado);
      }));
      registrarLancamento({ turmaId: rawId, data, tipo: 'frequencia', tempo });
    } else {
      setAlunos(prev => prev.map(aluno => aplicarAtestadoNaChamada(
        { ...aluno, freq: 'P', part: 'Presencial' },
        comAtestado
      )));
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

  const removerFrequencia = useCallback(async (data: string, tempo: string): Promise<boolean> => {
    if (!turmaAtiva) return false;
    if (verificarPeriodoFechado(data)) {
      showErrorRef.current('Operação bloqueada: O período correspondente a esta data está fechado.');
      return false;
    }
    const rawId = getTid(turmaAtiva.id);
    try {
      await OfflineTurmaService.removerFrequencia(rawId, turmaAtiva.componente, data, tempo);
      removerLancamento({ turmaId: rawId, data, tipo: 'frequencia', tempo });
      setAlunos(prev => prev.map(a => ({ ...a, freq: '', part: 'Presencial' })));
      await carregarFaltasDaData(data);
      showSuccessRef.current('Frequência excluída com sucesso.');
      return true;
    } catch {
      showErrorRef.current('Não foi possível remover a frequência.');
      return false;
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
      const conts = await OfflineTurmaService.fetchConteudosPeriodo(rawId, turmaAtiva.componente);
      setConteudos(conts);
      showSuccessRef.current('Conteúdo ministrado excluído com sucesso.');
    } catch {
      showErrorRef.current('Não foi possível remover o conteúdo.');
    }
  }, [turmaAtiva, verificarPeriodoFechado, removerLancamento]);

  // FIX M1: Memorizar o value do Provider para evitar re-renders desnecessários
  // em todos os consumidores quando nenhum dado mudou de fato.
  const contextValue = useMemo(() => ({
    turmaAtiva, selecionarTurma, limparTurmaAtiva,
    lancamentos, registrarLancamento, removerLancamento,
    alunos, avaliacoes, conteudos, horarioTurma, loading, 
    salvarAvaliacao, removerAvaliacao, salvarNotas,
    salvarFrequencia, salvarConteudo, buscarFrequencia, buscarConteudo,
    removerFrequencia, removerConteudo, carregarFaltasDaData, faltasPorData, atestadosPorData,
    fechamentos, salvarFechamento, verificarPeriodoFechado
  }), [
    turmaAtiva, selecionarTurma, limparTurmaAtiva,
    lancamentos, registrarLancamento, removerLancamento,
    alunos, avaliacoes, conteudos, horarioTurma, loading,
    salvarAvaliacao, removerAvaliacao, salvarNotas,
    salvarFrequencia, salvarConteudo, buscarFrequencia, buscarConteudo,
    removerFrequencia, removerConteudo, carregarFaltasDaData, faltasPorData, atestadosPorData,
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
