import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';

export default function RelatorioNotas() {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      fetchTurmasProfessor();
    }
  }, [user]);

  const fetchTurmasProfessor = async () => {
    setLoading(true);
    try {
      if (!user) return;

      if (user.role === 'ADMIN' || user.role === 'GESTOR' || user.role === 'SECRETARIO') {
        const { data: todasTurmas } = await supabase
          .from('turmas')
          .select('id, nome, turno')
          .order('nome');
        
        if (todasTurmas) {
          const finalTurmas = todasTurmas.map(t => ({ ...t, componente: 'GERAL' }));
          setTurmas(finalTurmas);
          if (finalTurmas.length > 0) {
            setSelectedTurma(`${finalTurmas[0].id}|GERAL`);
          }
        }
      } else {
        const emailLimpo = user.email.trim();
        const { data: profs } = await supabase
          .from('professores')
          .select('id, disciplinas')
          .ilike('email', `%${emailLimpo}%`);

        if (profs && profs.length > 0) {
          let allDisciplinas: string[] = [];
          profs.forEach(p => {
            if (p.disciplinas && Array.isArray(p.disciplinas)) {
              allDisciplinas = [...allDisciplinas, ...p.disciplinas];
            }
          });
          const componente = allDisciplinas.length > 0 ? allDisciplinas.join(', ') : 'POLIVALENTE';
          const profIds = profs.map(p => p.id);

          const { data: alocs } = await supabase
            .from('professor_alocacoes')
            .select('escola_id, turno')
            .in('professor_id', profIds);

          if (alocs && alocs.length > 0) {
            const orConditions = alocs.map(a => `and(escola_id.eq.${a.escola_id},turno.eq.${a.turno})`).join(',');
            const { data: turmasAlocadas } = await supabase
              .from('turmas')
              .select('id, nome, turno')
              .or(orConditions)
              .order('nome');

            if (turmasAlocadas) {
              const uniqueMap = new Map();
              turmasAlocadas.forEach(t => {
                const key = `${t.id}-${componente}`;
                if (!uniqueMap.has(key)) {
                  uniqueMap.set(key, { ...t, componente });
                }
              });
              
              const finalTurmas = Array.from(uniqueMap.values());
              setTurmas(finalTurmas);
              if (finalTurmas.length > 0) {
                setSelectedTurma(`${finalTurmas[0].id}|${componente}`);
              }
            }
          } else {
            setTurmas([]);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar turmas para o relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10">
        {/* SubHeader */}
        <div className="bg-indigo-50/50 px-8 py-3 flex items-center gap-4 border-b border-indigo-100">
        <Link to="/turmas" className="bg-blue-100 text-blue-700 px-4 py-2 rounded flex items-center gap-2 text-base font-semibold border border-blue-200 hover:bg-blue-200 transition">
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </Link>
        <div className="flex items-center gap-3">
          <h2 className="text-slate-800 text-xl font-medium">Relatório de Notas das Avaliações</h2>
          <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full border border-green-200">Ano: {APP_CONFIG.YEAR}</span>
        </div>
      </div>

      {/* MainContent */}
      <main className="p-8 flex justify-center">
        <div className="w-full max-w-7xl bg-white rounded-xl shadow-lg border border-slate-200 min-h-[600px] overflow-hidden">
          {/* Card Header Area */}
          <div className="p-6 pb-0 flex justify-between items-start">
            <h3 className="text-xl font-semibold text-slate-700">Pesquisa</h3>
            <button className="bg-blue-600 text-white px-6 py-2.5 rounded text-base font-medium hover:bg-blue-700 transition shadow-sm">
              Imprimir
            </button>
          </div>

          <div className="p-6 pt-4 border-b border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              {/* Turma Dropdown */}
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-slate-500 mb-1">Turma</label>
                <div className="relative">
                  <select 
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    disabled={loading}
                    className="w-full border border-slate-300 rounded-md py-3 pl-3 pr-10 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 bg-white"
                  >
                    {loading ? (
                      <option>Carregando turmas...</option>
                    ) : turmas.length > 0 ? (
                      turmas.map((t) => (
                        <option key={`${t.id}-${t.componente}`} value={`${t.id}|${t.componente}`}>
                          {t.nome} - {t.turno} - {t.componente}
                        </option>
                      ))
                    ) : (
                      <option>Nenhuma turma encontrada</option>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </div>
              </div>


              {/* Período Dropdown */}
              <div className="md:col-span-4 relative">
                <label className="block text-sm font-semibold text-slate-500 mb-1">Período</label>
                <div className="relative">
                  <select className="w-full border border-slate-300 rounded-md py-3 pl-3 pr-10 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 bg-white">
                    <option>1. BIMESTRE</option>
                    <option>2. BIMESTRE</option>
                    <option>3. BIMESTRE</option>
                    <option>4. BIMESTRE</option>
                    <option>RECUPERAÇÃO</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Exibir Button */}
              <div className="md:col-span-2">
                <button className="bg-blue-600 text-white px-6 py-3 rounded-md flex items-center gap-2 text-base font-medium hover:bg-blue-700 transition shadow-sm">
                  <SearchIcon className="h-5 w-5" />
                  Exibir
                </button>
              </div>
            </div>
          </div>

          {/* Empty state / Placeholder area inside the card */}
          <div className="flex-grow bg-white h-96"></div>
        </div>
      </main>
      </div>
    </div>
  );
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
