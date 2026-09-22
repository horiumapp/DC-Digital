import React, { useState, useMemo } from 'react';
import { Search, Building2, Clock, Calendar, AlertCircle, Pencil, BookOpen } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_CONFIG } from '../config/appConfig';
import { useTurma, Turma } from '../contexts/TurmaContext';
import { useAuth, type Alocacao } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/common/Toast';
import { getCachedUser, cacheUser, cacheTurmas, getCachedTurmas } from '../services/offlineStorage';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import type { TurmaRelatorioInfo } from '../services/turmaService';
import SelecionarLotacaoModal from '../components/SelecionarLotacaoModal';

// FIX #10: Reutilizar Alocacao do AuthContext em vez de definição local duplicada
type EscolaAlocacao = Alocacao;

interface TurmaBD {
  id: string;
  nome: string;
  turno: string;
  ensino: string;
  escola_id: string;
  escolas?: {
    nome: string;
  };
}

export default function Turmas() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { selecionarTurma } = useTurma();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSelectTurma = (turma: Turma) => {
    selecionarTurma(turma);
    sessionStorage.setItem('turmaAtivaId', turma.id.toString());
    navigate('/diario');
  };
  
  const [alocacoes, setAlocacoes] = useState<EscolaAlocacao[]>([]);
  const [alocacaoAtiva, setAlocacaoAtiva] = useState<EscolaAlocacao | null>(null);
  const [isLotacaoModalOpen, setIsLotacaoModalOpen] = useState(false);
  const [turmasBD, setTurmasBD] = useState<TurmaBD[]>([]);
  const [loading, setLoading] = useState(true);
  const [professorDisciplinas, setProfessorDisciplinas] = useState<string>('');
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { showSuccess: _showSuccess, showError } = useToast();

  const fetchTurmasBD = React.useCallback(async () => {
    if (!alocacaoAtiva) return;
    try {
      // Se offline, busca do cache local
      if (!navigator.onLine) {
        const cachedT = await getCachedTurmas(alocacaoAtiva.escola_id);
        const filteredT = cachedT.filter(t => t.turno === alocacaoAtiva.turno);
        if (isMounted.current) {
          setTurmasBD(filteredT.map(t => ({
            id: t.id,
            nome: t.nome,
            turno: t.turno,
            ensino: t.ensino || '',
            escola_id: t.escola_id || '',
            escolas: { nome: alocacaoAtiva?.escolas?.nome || '' }
          })));
        }
        return;
      }

      // Se online, faz fetch no Supabase
      const { data, error } = await supabase
        .from('turmas')
        .select('*, escolas(nome)')
        .eq('escola_id', alocacaoAtiva.escola_id)
        .eq('turno', alocacaoAtiva.turno)
        .order('nome');

      if (error) throw error;
      if (data && isMounted.current) {
        setTurmasBD(data);
        
        // Cachear as turmas localmente
        await cacheTurmas(data.map(t => ({
          id: t.id.toString(),
          nome: t.nome,
          turno: t.turno,
          ensino: t.ensino || '',
          escola_id: t.escola_id
        })));
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        console.error('Erro ao carregar turmas:', err);
        // Tenta recuperar do cache local em caso de erro
        try {
          const cachedT = await getCachedTurmas(alocacaoAtiva.escola_id);
          const filteredT = cachedT.filter(t => t.turno === alocacaoAtiva.turno);
          if (filteredT.length > 0) {
            setTurmasBD(filteredT.map(t => ({
              id: t.id,
              nome: t.nome,
              turno: t.turno,
              ensino: t.ensino || '',
              escola_id: t.escola_id || '',
              escolas: { nome: alocacaoAtiva?.escolas?.nome || '' }
            })));
            return;
          }
        } catch (cacheErr) {
          console.error('Erro ao buscar turmas no cache:', cacheErr);
        }
        showError('Não foi possível carregar as turmas.');
      }
    }
  }, [alocacaoAtiva, showError]);

  const fetchAlocacoes = React.useCallback(async () => {
    if (!user || !user.email) return;
    
    // Usuários administrativos não precisam buscar lotações de professor
    if (['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user.role)) {
      if (isMounted.current) setLoading(false);
      return;
    }

    try {
      const emailLimpo = user.email.trim();
      
      // Se offline, tenta recuperar do cache local do usuário
      if (!navigator.onLine) {
        const cached = await getCachedUser();
        if (cached && cached.id === user.id && cached.alocacoes && cached.alocacoes.length > 0) {
          if (isMounted.current) {
            setProfessorDisciplinas(cached.professorDisciplinas || 'POLIVALENTE');
            setAlocacoes(cached.alocacoes);
            const savedEscolaId = sessionStorage.getItem('activeEscolaId');
            const savedTurno = sessionStorage.getItem('activeTurno');
            const restoredAloc = cached.alocacoes.find(a => a.escola_id === savedEscolaId && a.turno === savedTurno);
            const initialAloc = restoredAloc || cached.alocacoes[0];
            setAlocacaoAtiva(initialAloc);
            sessionStorage.setItem('activeEscolaId', initialAloc.escola_id);
            sessionStorage.setItem('activeTurno', initialAloc.turno);
          }
          return;
        }
      }

      // 1. Encontrar o(s) registro(s) do professor vinculado ao usuário logado
      // FIX REG-01: Usar usuario_id (UUID do Auth) com fallback para email
      let queryProf = supabase
        .from('professores')
        .select('id, disciplinas');

      if (user.id) {
        queryProf = queryProf.or(`usuario_id.eq.${user.id},email.eq.${emailLimpo}`);
      } else {
        queryProf = queryProf.eq('email', emailLimpo);
      }

      const { data: professorDataResult, error: profError } = await queryProf;

      if (profError) throw profError;

      if (professorDataResult && professorDataResult.length > 0 && isMounted.current) {
        // Pegar todas as disciplinas de todos os perfis encontrados e unificar (caso um tenha e outro não)
        let allDisciplinas: string[] = [];
        professorDataResult.forEach(p => {
          if (p.disciplinas && Array.isArray(p.disciplinas)) {
            allDisciplinas = [...allDisciplinas, ...p.disciplinas];
          }
        });
        // Remover duplicatas
        allDisciplinas = [...new Set(allDisciplinas)];
        const disciplinasStr = allDisciplinas.length > 0 ? allDisciplinas.join(', ') : 'POLIVALENTE';
        setProfessorDisciplinas(disciplinasStr);

        // Pegar array com os IDs de todos os cadastros possíveis desse professor
        const profIds = professorDataResult.map(p => p.id);
        
        // 2. Buscar as alocações (escolas e turnos) vinculadas a QUALQUER UM desses IDs
        const { data: alocData, error: alocError } = await supabase
          .from('professor_alocacoes')
          .select('id, escola_id, turno, escolas(nome)')
          .in('professor_id', profIds);

        if (alocError) throw alocError;

        if (alocData && alocData.length > 0 && isMounted.current) {
          // Remove duplicadas reais (mesma escola & mesmo turno) se houver
          const uniqueAlocs = alocData.filter((v, i, a) => 
            a.findIndex(t => (t.escola_id === v.escola_id && t.turno === v.turno)) === i
          );
          
          const mappedAlocs: EscolaAlocacao[] = uniqueAlocs.map((item: { id: string; escola_id: string; turno: string; escolas?: { nome: string } | { nome: string }[] }) => {
            const escolaObj = Array.isArray(item.escolas)
              ? item.escolas[0]
              : item.escolas;
            return {
              id: item.id,
              escola_id: item.escola_id,
              turno: item.turno,
              escolas: escolaObj ? { nome: escolaObj.nome } : undefined
            };
          });

          setAlocacoes(mappedAlocs);
          const savedEscolaId = sessionStorage.getItem('activeEscolaId');
          const savedTurno = sessionStorage.getItem('activeTurno');
          const restoredAloc = mappedAlocs.find(a => a.escola_id === savedEscolaId && a.turno === savedTurno);
          const initialAloc = restoredAloc || mappedAlocs[0];
          setAlocacaoAtiva(initialAloc);
          sessionStorage.setItem('activeEscolaId', initialAloc.escola_id);
          sessionStorage.setItem('activeTurno', initialAloc.turno);

          // Atualizar o cache local do usuário com as alocações e disciplinas obtidas
          const cached = await getCachedUser();
          if (cached && cached.id === user.id) {
            await cacheUser({
              ...cached,
              alocacoes: mappedAlocs,
              professorDisciplinas: disciplinasStr,
            });
          }
        } else if (isMounted.current) {
          console.warn("Nenhuma alocacão encontrada para os professores encontrados.");
          showError("Nenhuma alocação (escola/turno) encontrada para seu usuário.");
        }
      } else if (isMounted.current) {
        console.warn("Nenhum professor encontrado com o e-mail:", emailLimpo);
        showError("Cadastro de professor não encontrado para este e-mail.");
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        console.error('Erro ao carregar lotações:', err);
        // Tenta recuperar do cache local do usuário em caso de erro/falha de rede
        try {
          const cached = await getCachedUser();
          if (cached && cached.id === user.id && cached.alocacoes && cached.alocacoes.length > 0) {
            setProfessorDisciplinas(cached.professorDisciplinas || 'POLIVALENTE');
            setAlocacoes(cached.alocacoes);
            const savedEscolaId = sessionStorage.getItem('activeEscolaId');
            const savedTurno = sessionStorage.getItem('activeTurno');
            const restoredAloc = cached.alocacoes.find(a => a.escola_id === savedEscolaId && a.turno === savedTurno);
            const initialAloc = restoredAloc || cached.alocacoes[0];
            setAlocacaoAtiva(initialAloc);
            sessionStorage.setItem('activeEscolaId', initialAloc.escola_id);
            sessionStorage.setItem('activeTurno', initialAloc.turno);
            return;
          }
        } catch (cacheErr) {
          console.error('Erro ao buscar alocações no cache:', cacheErr);
        }
        showError('Ocorreu um erro ao carregar suas lotações.');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [user, showError]);

   
  React.useEffect(() => {
    fetchAlocacoes();
  }, [user?.id, fetchAlocacoes]);
   

   
  React.useEffect(() => {
    if (alocacaoAtiva) {
      fetchTurmasBD();
    }
  }, [alocacaoAtiva, fetchTurmasBD]);
   

  const filteredTurmas: Turma[] = useMemo(() => {
    const rawFiltered = turmasBD.filter(t => t.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    const exploded: Turma[] = [];

    // Pegamos a lista de disciplinas (já unificada no fetchAlocacoes)
    const disciplinasList = professorDisciplinas ? professorDisciplinas.split(', ') : ['POLIVALENTE'];

    rawFiltered.forEach(t => {
      disciplinasList.forEach(disc => {
        // Lógica para identificar Modalidade e Ano para o Currículo
        const nomeUpper = t.nome.toUpperCase();
        let ensinoCalculado = "Fundamental Anos Iniciais (1° ao 5° ANO)";
        let faseCalculada = t.nome;

        // Extrair o Ano (ex: "1º Ano" de "1º Ano A")
        const matchAno = t.nome.match(/\dº Ano/i);
        if (matchAno) {
          faseCalculada = matchAno[0];
          const numeroAno = parseInt(matchAno[0]);
          if (numeroAno >= 6) {
            ensinoCalculado = "Fundamental Anos Finais (6° ao 9° ANO)";
          }
        } else if (nomeUpper.includes("EJA")) {
          ensinoCalculado = "EJA (Educação de Jovens e Adultos)";
          faseCalculada = t.nome;
        } else if (nomeUpper.includes("MÉDIO") || nomeUpper.includes("SÉRIE")) {
          ensinoCalculado = "Médio";
          faseCalculada = t.nome;
        } else if (nomeUpper.includes("INFANTIL") || nomeUpper.includes("PRÉ") || nomeUpper.includes("MATERNAL")) {
          ensinoCalculado = "Educação Infantil";
          faseCalculada = t.nome;
        }

        exploded.push({
          id: `${t.id}||${disc}`,
          ensino: ensinoCalculado, 
          fase: faseCalculada,
          componente: disc,
          professor: user?.name || '',
          escola: t.escolas?.nome || alocacaoAtiva?.escolas?.nome || 'Escola',
          escola_id: t.escola_id, // FIX #3: necessário para validação IDOR sem sessionStorage
          turno: t.turno,
          metricas: {
            frequencia: 0,
            objetosMinistrados: 0,
            objetosPlanejados: 0,
            avaliacoesCadastradas: 0,
            avaliacoesPrevistas: 0,
            notasLancadas: 0,
            notasPrevistas: 0
          },
          diasDeAula: [1, 2, 3, 4, 5],
          tempos: ['1º TEMPO', '2º TEMPO']
        });
      });
    });

    return exploded;
  }, [turmasBD, searchTerm, professorDisciplinas, user?.name, alocacaoAtiva]);

  // Usuários administrativos (ADMIN, GESTOR, SECRETARIO) não têm alocação de professor.
  // Redirecioná-los para a área de administração é a UX correta.
  const isAdminUser = user?.role && ['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user.role);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse font-medium">Carregando sua lotação...</div>
      </div>
    );
  }

  // Tela especial para administradores sem lotação de professor
  if (isAdminUser && alocacoes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-[#0f2851]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Administrativo</h2>
          <p className="text-slate-500 text-sm mb-6">
            Sua conta possui perfil <strong>{user?.role}</strong>. A visualização de turmas é reservada
            para professores com lotação ativa. Acesse o painel administrativo para gerenciar o sistema.
          </p>
          <Link
            to="/administracao"
            className="inline-flex items-center justify-center gap-2 w-full bg-[#0f2851] hover:bg-[#1a3a6d] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#0f2851]/20"
          >
            Ir para Administração
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090e17] relative">
      <div className="relative z-10">
        {/* Workspace Hub Bar */}
        <div className="px-4 py-5 sm:px-8 border-b border-slate-200/80 bg-white dark:bg-slate-900/90 dark:border-slate-800">
          <div className="max-w-[1500px] mx-auto flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black text-[#0b1f3f] dark:text-sky-300 tracking-tight">
                  Minhas Turmas & Componentes
                </h1>
                <span className="bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {APP_CONFIG.YEAR}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Selecione uma turma para abrir o diário de classe, consultar o calendário ou registrar frequência.
              </p>
            </div>

            {/* Context & Allocation Pill */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-sky-400 shrink-0" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {alocacaoAtiva?.escolas?.nome || 'Escola não selecionada'}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">•</span>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold uppercase text-[11px]">
                    Turno {alocacaoAtiva?.turno || 'N/A'}
                  </span>
                </div>
              </div>

              {alocacoes.length > 1 && (
                <button
                  onClick={() => setIsLotacaoModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-[#0b1f3f] dark:text-sky-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Trocar escola ou turno de trabalho"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Trocar lotação</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <main className="px-4 py-6 sm:px-8 max-w-[1500px] mx-auto space-y-6">
          {/* Controls Bar: Search & View Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por turma, fase ou componente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b1f3f]/15 focus:border-[#0b1f3f] transition-all" 
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {filteredTurmas.length} {filteredTurmas.length === 1 ? 'turma encontrada' : 'turmas encontradas'}
              </span>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'cards'
                      ? 'bg-white dark:bg-slate-700 text-[#0b1f3f] dark:text-sky-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                  aria-label="Visualizar em cartões"
                >
                  Cartões
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white dark:bg-slate-700 text-[#0b1f3f] dark:text-sky-300 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                  }`}
                  aria-label="Visualizar em tabela"
                >
                  Tabela
                </button>
              </div>
            </div>
          </div>

          {/* Cards View (Default) */}
          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredTurmas.length > 0 ? (
                filteredTurmas.map((turma) => (
                  <div 
                    key={turma.id}
                    className="group bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-blue-400 dark:hover:border-sky-500 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-sky-300 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-900 truncate max-w-[170px]" title={turma.componente}>
                          {turma.componente}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {turma.turno}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#0b1f3f] dark:group-hover:text-sky-300 transition-colors">
                        {turma.fase}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1" title={turma.ensino}>
                        {turma.ensino}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          2 tempos/dia
                        </span>
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {turma.escola}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleSelectTurma(turma)}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0b1f3f] hover:bg-[#16325c] dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold rounded-xl text-xs transition-all shadow-xs active:scale-95 cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Abrir Diário</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-base font-bold text-slate-700 dark:text-slate-300">Nenhuma turma encontrada</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Verifique o termo pesquisado ou selecione outra lotação.</p>
                </div>
              )}
            </div>
          )}

          {/* Dense Table View */}
          {viewMode === 'table' && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 overflow-hidden">
              <table className="dd-mobile-table min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Fase / Turma
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Componente
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Ensino / Modalidade
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Turno
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filteredTurmas.length > 0 ? (
                    filteredTurmas.map((turma) => (
                      <tr key={turma.id} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors">
                        <td data-label="Fase / Turma" className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-slate-100">
                          {turma.fase}
                        </td>
                        <td data-label="Componente" className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-700 dark:text-sky-400">
                          {turma.componente}
                        </td>
                        <td data-label="Ensino / Modalidade" className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                          {turma.ensino}
                        </td>
                        <td data-label="Turno" className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 uppercase font-medium">
                          {turma.turno}
                        </td>
                        <td data-label="Ação" className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleSelectTurma(turma)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b1f3f] hover:bg-[#16325c] dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Diário</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 italic text-sm">
                        Nenhuma turma encontrada para "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      <SelecionarLotacaoModal
        isOpen={isLotacaoModalOpen}
        onClose={() => setIsLotacaoModalOpen(false)}
        alocacoes={alocacoes}
        alocacaoAtiva={alocacaoAtiva}
        onSelect={(aloc) => {
          setAlocacaoAtiva(aloc);
          sessionStorage.setItem('activeEscolaId', aloc.escola_id);
          sessionStorage.setItem('activeTurno', aloc.turno);
        }}
      />
    </div>
  );
}
