import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, GraduationCap, Building2, Clock, Calendar, AlertCircle, Pencil } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { APP_CONFIG } from '../config/appConfig';
import { useTurma, Turma } from '../contexts/TurmaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/common/Toast';
import { getCachedUser, cacheUser, cacheTurmas, getCachedTurmas } from '../services/offlineStorage';
import SelecionarLotacaoModal from '../components/SelecionarLotacaoModal';

interface EscolaAlocacao {
  id: string;
  escola_id: string;
  turno: string;
  escolas?: {
    nome: string;
  };
}

interface TurmaBD {
  id: string | number;
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
    } catch (err: any) {
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
            setAlocacaoAtiva(cached.alocacoes[0]);
          }
          return;
        }
      }

      // 1. Encontrar o(s) registro(s) do professor vinculado ao usuário logado
      // Usamos eq com correspondência exata para evitar falsos positivos
      const { data: professorDataResult, error: profError } = await supabase
        .from('professores')
        .select('id, disciplinas')
        .eq('email', emailLimpo);

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
          
          const mappedAlocs: EscolaAlocacao[] = uniqueAlocs.map((item: any) => {
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
          setAlocacaoAtiva(mappedAlocs[0]); // Seleciona a primeira por padrão

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
    } catch (err: any) {
      if (isMounted.current) {
        console.error('Erro ao carregar lotações:', err);
        // Tenta recuperar do cache local do usuário em caso de erro/falha de rede
        try {
          const cached = await getCachedUser();
          if (cached && cached.id === user.id && cached.alocacoes && cached.alocacoes.length > 0) {
            setProfessorDisciplinas(cached.professorDisciplinas || 'POLIVALENTE');
            setAlocacoes(cached.alocacoes);
            setAlocacaoAtiva(cached.alocacoes[0]);
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

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    fetchAlocacoes();
  }, [user?.id, fetchAlocacoes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    if (alocacaoAtiva) {
      fetchTurmasBD();
    }
  }, [alocacaoAtiva, fetchTurmasBD]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative">
      <div className="relative z-10">
        <div className="px-6 py-4 flex items-center justify-between border-b border-blue-50/50 bg-white/50">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-[#0f2851]">Turmas e Componentes</h1>
            <span className="bg-emerald-100 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200">Ano: {APP_CONFIG.YEAR}</span>
          </div>
          {alocacoes.length > 1 && (
            <button
              onClick={() => setIsLotacaoModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/10 active:scale-95 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Alterar lotação</span>
            </button>
          )}
        </div>

        <main className="px-6 pb-12">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden max-w-[1500px] mx-auto">
            {/* Info Strip */}
            <div className="p-6 bg-blue-50/30 dark:bg-slate-800/50 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#eef2ff] dark:bg-slate-700 rounded-full flex items-center justify-center text-[#0f2851] dark:text-blue-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight tracking-wider">Professor</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name?.toUpperCase() || 'NÃO IDENTIFICADO'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#eef2ff] dark:bg-slate-700 rounded-full flex items-center justify-center text-[#0f2851] dark:text-blue-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight tracking-wider">Escola</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {alocacaoAtiva?.escolas?.nome || 'SELECIONE UMA ESCOLA'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#eef2ff] dark:bg-slate-700 rounded-full flex items-center justify-center text-[#0f2851] dark:text-blue-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight tracking-wider">Turno</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {alocacaoAtiva?.turno?.toUpperCase() || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="relative max-w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Pesquisar" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl text-base placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2851] focus:border-[#0f2851] bg-slate-50/50 font-bold text-[#0f2851]" 
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-[#f8f9fa] border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-[13px] font-bold text-[#0f2851] uppercase tracking-wider cursor-pointer hover:text-slate-900">
                      <div className="flex items-center gap-1">
                        Ensino / Projeto
                        <ChevronDown className="w-4 h-4 text-slate-300" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-[13px] font-bold text-[#0f2851] uppercase tracking-wider cursor-pointer hover:text-slate-900">
                      <div className="flex items-center gap-1">
                        Fase / Turma
                        <ChevronDown className="w-4 h-4 text-slate-300" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-[13px] font-bold text-[#0f2851] uppercase tracking-wider cursor-pointer hover:text-slate-900">
                      <div className="flex items-center gap-1">
                        Componente
                        <ChevronDown className="w-4 h-4 text-slate-300" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-[13px] font-bold text-[#0f2851] uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTurmas.length > 0 ? (
                    filteredTurmas.map((turma) => (
                      <tr key={turma.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-200">{turma.ensino}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{turma.fase}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{turma.componente}</td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <button
                            onClick={() => handleSelectTurma(turma)}
                            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#eef2ff] text-[#0f2851] border border-blue-100 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition-all uppercase"
                          >
                            <Calendar className="w-4 h-4" />
                            <span>Diário</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400 italic">
                        Nenhum registro encontrado para "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Rodapé com contagem */}
            <div className="px-6 py-4 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
              <p className="text-sm text-slate-500">
                {filteredTurmas.length === 0
                  ? 'Nenhum registro encontrado'
                  : `Exibindo ${filteredTurmas.length} registro${filteredTurmas.length !== 1 ? 's' : ''}`
                }
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
