import { ClassWorkspace } from '../components/common/PortalUI';
import React, { useState, useMemo } from 'react';
import { AlertCircle, Pencil } from 'lucide-react';
import { useNavigate, useSearchParams, Link, Navigate } from 'react-router-dom';
import { APP_CONFIG } from '../config/appConfig';
import { useTurma, Turma } from '../contexts/TurmaContext';
import { useAuth, type Alocacao } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/common/Toast';
import { getCachedUser, cacheUser, cacheTurmas, getCachedTurmas } from '../services/offlineStorage';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import type { TurmaRelatorioInfo } from '../services/turmaService';
import SelecionarLotacaoModal from '../components/SelecionarLotacaoModal';
import { ADMIN_ROLES } from '../constants/authConstants';
import { CHAVE_LOTACAO_CONFIRMADA, CHAVE_LOTACAO_QUANTIDADE, marcaLotacao, resolverLotacaoInicial } from '../utils/lotacaoProfessor';

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
  const { user, definirEscolaDeTrabalho } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { selecionarTurma, turmaAtiva, limparTurmaAtiva } = useTurma();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Destino lembrado quando o professor veio de uma tela que exigia turma ativa.
  const destinoPosSelecao = searchParams.get('destino') === 'frequencia' ? '/frequencia' : '/diario';

  const handleSelectTurma = (turma: Turma) => {
    selecionarTurma(turma);
    sessionStorage.setItem('turmaAtivaId', turma.id.toString());
    navigate(destinoPosSelecao);
  };
  
  const [alocacoes, setAlocacoes] = useState<EscolaAlocacao[]>([]);
  const [alocacaoAtiva, setAlocacaoAtiva] = useState<EscolaAlocacao | null>(null);
  const [isLotacaoModalOpen, setIsLotacaoModalOpen] = useState(false);
  const [lotacaoObrigatoria, setLotacaoObrigatoria] = useState(false);
  const [turmasBD, setTurmasBD] = useState<TurmaBD[]>([]);
  const [staffTurmas, setStaffTurmas] = useState<TurmaRelatorioInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [professorDisciplinas, setProfessorDisciplinas] = useState<string>('');
  const isMounted = React.useRef(true);
  const userRef = React.useRef(user);
  userRef.current = user;

  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { showSuccess: _showSuccess, showError } = useToast();

  const confirmarLotacao = React.useCallback((aloc: EscolaAlocacao, todas: EscolaAlocacao[]) => {
    if (turmaAtiva?.escola_id && turmaAtiva.escola_id !== aloc.escola_id) {
      limparTurmaAtiva();
    }
    setAlocacaoAtiva(aloc);
    sessionStorage.setItem('activeEscolaId', aloc.escola_id);
    sessionStorage.setItem('activeTurno', aloc.turno);
    sessionStorage.setItem(CHAVE_LOTACAO_CONFIRMADA, marcaLotacao(aloc.escola_id, aloc.turno));
    sessionStorage.setItem(CHAVE_LOTACAO_QUANTIDADE, String(todas.length));
    definirEscolaDeTrabalho(aloc, todas);
    setLotacaoObrigatoria(false);
    setIsLotacaoModalOpen(false);
  }, [definirEscolaDeTrabalho, limparTurmaAtiva, turmaAtiva?.escola_id]);

  const publicarLotacoes = React.useCallback((mappedAlocs: EscolaAlocacao[]) => {
    const escolha = resolverLotacaoInicial(
      mappedAlocs,
      sessionStorage.getItem(CHAVE_LOTACAO_CONFIRMADA),
      sessionStorage.getItem('activeEscolaId'),
      sessionStorage.getItem('activeTurno'),
      Number(sessionStorage.getItem(CHAVE_LOTACAO_QUANTIDADE)) || null,
    );
    setAlocacoes(mappedAlocs);
    if (escolha.ativa) {
      confirmarLotacao(escolha.ativa, mappedAlocs);
      return;
    }
    if (escolha.pedirEscolha) {
      setAlocacaoAtiva(null);
      setLotacaoObrigatoria(true);
      setIsLotacaoModalOpen(true);
    }
  }, [confirmarLotacao]);

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
    const user = userRef.current;
    if (!user || !user.email) return;
    
    // Usuários administrativos e secretaria: carregar as turmas da escola
    if (user?.role && ['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user.role)) {
      try {
        const turmasList = await OfflineTurmaService.fetchTurmasRelatorio(user);
        if (isMounted.current) {
          setStaffTurmas(turmasList);
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao carregar turmas administrativas:', err);
        if (isMounted.current) setLoading(false);
      }
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
            publicarLotacoes(cached.alocacoes);
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

          publicarLotacoes(mappedAlocs);

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
            publicarLotacoes(cached.alocacoes);
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
  }, [showError, publicarLotacoes]);

   
  React.useEffect(() => {
    fetchAlocacoes();
  }, [user?.id, fetchAlocacoes]);
   

   
  React.useEffect(() => {
    if (alocacaoAtiva) {
      fetchTurmasBD();
    }
  }, [alocacaoAtiva, fetchTurmasBD]);
   

  const isStaffRole = Boolean(user?.role && ['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user.role));

  const filteredTurmas: Turma[] = useMemo(() => {
    if (isStaffRole && staffTurmas.length > 0) {
      const term = searchTerm.toLowerCase();
      return staffTurmas
        .filter(t =>
          t.nome.toLowerCase().includes(term) ||
          t.componente.toLowerCase().includes(term) ||
          t.turno.toLowerCase().includes(term)
        )
        .map(t => ({
          id: `${t.id}||${t.componente}`,
          ensino: t.ensino,
          fase: t.fase,
          componente: t.componente,
          professor: user?.name || 'Secretaria',
          escola: t.escolaNome,
          escola_id: t.escolaId,
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
        }));
    }

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
  }, [turmasBD, searchTerm, professorDisciplinas, user?.name, alocacaoAtiva, isStaffRole, staffTurmas]);

  // Perfis administrativos (ADMIN, GESTOR, SECRETARIO) não têm rotina docente; seu destino padrão é Gestão Escolar
  if (user?.role && ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/administracao" replace />;
  }

  // Usuários administrativos sem turmas ou lotações
  const isAdminSemTurmas = isStaffRole && staffTurmas.length === 0 && alocacoes.length === 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse font-medium">Carregando turmas...</div>
      </div>
    );
  }

  // Tela especial para administradores sem lotação de professor
  if (isAdminSemTurmas) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-[#6354c7]" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Administrativo</h2>
          <p className="text-slate-500 text-sm mb-6">
            Sua conta possui perfil <strong>{user?.role}</strong>. Nenhuma turma foi encontrada para a escola vinculada.
            Acesse o painel administrativo para gerenciar o sistema.
          </p>
          <Link
            to="/administracao"
            className="inline-flex items-center justify-center gap-2 w-full bg-[#6354c7] hover:bg-[#5142ad] text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-[#6354c7]/20"
          >
            Ir para Administração
          </Link>
        </div>
      </div>
    );
  }

  return (<>
      <ClassWorkspace key={user?.id || 'default'} name={user?.name || 'professor'} year={APP_CONFIG.YEAR}
        school={alocacaoAtiva?.escolas?.nome || staffTurmas[0]?.escolaNome || 'Sua escola'}
        classes={filteredTurmas} activeClass={turmaAtiva} preferenceKey={user?.id || 'default'} search={searchTerm} onSearch={setSearchTerm} view={viewMode} onView={setViewMode} onOpen={handleSelectTurma}
        schoolAction={alocacoes.length > 1 ? <button className="portal-button secondary" onClick={()=>{ setLotacaoObrigatoria(false); setIsLotacaoModalOpen(true); }}><Pencil size={16}/> Trocar lotação</button> : undefined}/>
      <SelecionarLotacaoModal
        isOpen={isLotacaoModalOpen}
        obrigatoria={lotacaoObrigatoria}
        onClose={() => { if (!lotacaoObrigatoria) setIsLotacaoModalOpen(false); }}
        alocacoes={alocacoes}
        alocacaoAtiva={alocacaoAtiva}
        onSelect={(aloc) => confirmarLotacao(aloc, alocacoes)}
      />
    </>
  );
}
