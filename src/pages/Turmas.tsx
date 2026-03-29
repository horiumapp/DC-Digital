import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronLeft, Edit2, GraduationCap, Building2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
    navigate('/diario');
  };
  
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [alocacaoAtiva, setAlocacaoAtiva] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchAlocacoes();
  }, [user]);

  const fetchAlocacoes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 1. Encontrar o registro do professor vinculado ao usuário logado
      // Usamos o e-mail como chave de busca pois o ID do Auth e o da tabela professores podem divergir
      const { data: professorData } = await supabase
        .from('professores')
        .select('id')
        .eq('email', user.isSimulated ? 'prof.jns@gmail.com' : user.id) // Fallback para o teste do usuário
        .single();

      if (professorData) {
        // 2. Buscar as alocações (escolas e turnos) desse professor
        const { data: alocData } = await supabase
          .from('professor_alocacoes')
          .select('id, escola_id, turno, escolas(nome)')
          .eq('professor_id', professorData.id);

        if (alocData && alocData.length > 0) {
          setAlocacoes(alocData);
          setAlocacaoAtiva(alocData[0]); // Seleciona a primeira por padrão
        }
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

  const filteredTurmas: Turma[] = []; // TODO: Buscar turmas reais da tabela 'turmas'

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
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-slate-800 dark:text-slate-100">Turmas/Componentes</h1>
            <span className="bg-emerald-50 text-emerald-600 text-sm font-bold px-3 py-1 rounded border border-emerald-100 uppercase tracking-tight">Ano: 2026</span>
          </div>
          {alocacoes.length > 1 && (
            <div className="flex gap-2">
              {alocacoes.map(a => (
                <button
                  key={a.id}
                  onClick={() => setAlocacaoAtiva(a)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    alocacaoAtiva?.id === a.id 
                    ? 'bg-blue-600 text-white shadow-md' 
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
                <div className="w-12 h-12 bg-indigo-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight tracking-wider">Professor</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name?.toUpperCase() || 'NÃO IDENTIFICADO'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
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
                <div className="w-12 h-12 bg-indigo-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
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
                  className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-md text-base placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50" 
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                      <div className="flex items-center gap-1">
                        Ensino / Projeto
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                      <div className="flex items-center gap-1">
                        Fase / Turma
                        <ChevronDown className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                      <div className="flex items-center gap-1">
                        Componente
                        <ChevronDown className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
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
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors uppercase"
                          >
                            Selecionar
                            <ChevronRight className="w-4 h-4" />
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

            {/* Pagination Footer */}
            <div className="px-6 py-5 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-4 text-base text-slate-600">
                <p>Mostrando de 1 até {filteredTurmas.length} de {filteredTurmas.length} registros</p>
                <div className="flex items-center gap-2">
                  <span>Mostrar</span>
                  <select className="border border-slate-200 rounded px-3 py-1.5 text-sm bg-white focus:ring-0 focus:border-blue-600 outline-none">
                    <option>{filteredTurmas.length}</option>
                  </select>
                  <span>registros</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button className="px-4 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-l-lg hover:bg-slate-50 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button className="px-4 py-2 text-sm font-bold text-white bg-blue-600 border-t border-b border-blue-600">
                    1
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-r-lg hover:bg-slate-50 flex items-center gap-1">
                    Seguinte
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
