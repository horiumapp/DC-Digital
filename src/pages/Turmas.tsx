import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, Edit2, GraduationCap, Building2, Clock, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import NovaTurmaModal from '../components/NovaTurmaModal';
import { APP_CONFIG } from '../config/appConfig';
import { useTurma, Turma } from '../contexts/TurmaContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

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
  
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [alocacaoAtiva, setAlocacaoAtiva] = useState<any>(null);
  const [turmasBD, setTurmasBD] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [professorDisciplinas, setProfessorDisciplinas] = useState<string>('');

  React.useEffect(() => {
    fetchAlocacoes();
  }, [user?.id]);

  React.useEffect(() => {
    if (alocacaoAtiva) {
      fetchTurmasBD();
    }
  }, [alocacaoAtiva]);

  const fetchTurmasBD = async () => {
    if (!alocacaoAtiva) return;
    try {
      const { data, error } = await supabase
        .from('turmas')
        .select('*, escolas(nome)')
        .eq('escola_id', alocacaoAtiva.escola_id)
        .eq('turno', alocacaoAtiva.turno)
        .order('nome');

      if (data) {
        setTurmasBD(data);
      }
    } catch (err) {
      console.error('Erro ao carregar turmas:', err);
    }
  };

  const fetchAlocacoes = async () => {
    if (!user || !user.email) return;
    
    setLoading(true);
    try {
      const emailLimpo = user.email.trim();
      
      // 1. Encontrar o(s) registro(s) do professor vinculado ao usuário logado
      // Usamos eq com correspondência exata para evitar falsos positivos
      const { data: professorDataResult, error: profError } = await supabase
        .from('professores')
        .select('id, disciplinas')
        .eq('email', emailLimpo);

      if (profError) {
        console.error("Erro ao achar professor pelo email:", profError);
      }

      if (professorDataResult && professorDataResult.length > 0) {
        // Pegar todas as disciplinas de todos os perfis encontrados e unificar (caso um tenha e outro não)
        let allDisciplinas: string[] = [];
        professorDataResult.forEach(p => {
          if (p.disciplinas && Array.isArray(p.disciplinas)) {
            allDisciplinas = [...allDisciplinas, ...p.disciplinas];
          }
        });
        // Remover duplicatas
        allDisciplinas = [...new Set(allDisciplinas)];
        setProfessorDisciplinas(allDisciplinas.length > 0 ? allDisciplinas.join(', ') : 'POLIVALENTE');

        // Pegar array com os IDs de todos os cadastros possíveis desse professor
        const profIds = professorDataResult.map(p => p.id);
        
        // 2. Buscar as alocações (escolas e turnos) vinculadas a QUALQUER UM desses IDs
        const { data: alocData, error: alocError } = await supabase
          .from('professor_alocacoes')
          .select('id, escola_id, turno, escolas(nome)')
          .in('professor_id', profIds);

        if (alocError) {
          console.error("Erro na busca de alocacoes:", alocError);
        }

        if (alocData && alocData.length > 0) {
          // Remove duplicadas reais (mesma escola & mesmo turno) se houver
          const uniqueAlocs = alocData.filter((v, i, a) => 
            a.findIndex(t => (t.escola_id === v.escola_id && t.turno === v.turno)) === i
          );
          
          setAlocacoes(uniqueAlocs);
          setAlocacaoAtiva(uniqueAlocs[0]); // Seleciona a primeira por padrão
        } else {
          console.warn("Nenhuma alocacão encontrada para os professores encontrados.");
        }
      } else {
        console.warn("Nenhum professor encontrado com o e-mail:", emailLimpo);
      }
    } catch (err) {
      console.error('Erro ao carregar lotações:', err);
    } finally {
      setLoading(false);
    }
  };

  const shiftToActiveAlocacao = (aloc: any) => {
    setAlocacaoAtiva(aloc);
  };

  const filteredTurmas: Turma[] = useMemo(() => {
    const rawFiltered = turmasBD.filter(t => t.nome.toLowerCase().includes(searchTerm.toLowerCase()));
    const exploded: Turma[] = [];

    // Pegamos a lista de disciplinas (já unificada no fetchAlocacoes)
    const disciplinasList = professorDisciplinas ? professorDisciplinas.split(', ') : ['POLIVALENTE'];

    rawFiltered.forEach(t => {
      disciplinasList.forEach(disc => {
        exploded.push({
          id: `${t.id}||${disc}`, // Separador '||' evita colisão com disciplinas que contêm '_'
          ensino: 'Ensino Fundamental', 
          fase: t.nome,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse font-medium">Carregando sua lotação...</div>
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
            <div className="flex gap-2">
              {alocacoes.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAlocacaoAtiva(a)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    alocacaoAtiva?.id === a.id 
                    ? 'bg-[#0f2851] text-white shadow-lg shadow-[#0f2851]/20' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {a.turno}
                </button>
              ))}
            </div>
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
