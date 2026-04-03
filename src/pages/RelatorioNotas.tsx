import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';
import { TurmaService } from '../services/turmaService';
import { Aluno, Avaliacao } from '../contexts/TurmaContext';

function formatDiaMes(dateStr: string) {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    return dateStr.split('-').slice(1).reverse().join('/');
  }
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
  }
  return dateStr;
}

export default function RelatorioNotas() {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('1º Bimestre');
  
  const [dataLoading, setDataLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [notas, setNotas] = useState<any[]>([]);

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
          // Garantir valores únicos de disciplinas ou POLIVALENTE
          let componentes = [...new Set(allDisciplinas)];
          if (componentes.length === 0) componentes = ['POLIVALENTE'];

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
              const finalTurmas: any[] = [];
              turmasAlocadas.forEach(t => {
                // Criar uma entrada para cada disciplina alocada àquela turma
                componentes.forEach(comp => {
                  finalTurmas.push({ ...t, componente: comp });
                });
              });
              
              setTurmas(finalTurmas);
              if (finalTurmas.length > 0) {
                setSelectedTurma(`${finalTurmas[0].id}|${finalTurmas[0].componente}`);
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

  const handleExibir = async () => {
    if (!selectedTurma) return;
    setDataLoading(true);
    setHasSearched(true);
    try {
      const [turmaId, componente] = selectedTurma.split('|');
      const tid = turmaId.split('_')[0];
      
      const alunosData = await TurmaService.fetchAlunos(tid);
      setAlunos(alunosData);

      const { avaliacoes: avsData, notasData } = await TurmaService.fetchAvaliacoes(tid, componente);
      const filteredAvs = avsData.filter(a => a.bimestre === periodo);
      setAvaliacoes(filteredAvs);
      setNotas(notasData);
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar dados do relatório.');
    } finally {
      setDataLoading(false);
    }
  };

  const principalAvs = avaliacoes.filter(a => a.tipo.startsWith('AV') && !a.tipo.startsWith('RP')).sort((a,b) => a.tipo.localeCompare(b.tipo));

  const getNota = (alunoId: string, avaliacaoId: string) => {
    const notaRow = notas.find(n => n.aluno_id?.toString() === alunoId?.toString() && n.avaliacao_id?.toString() === avaliacaoId?.toString());
    return notaRow ? notaRow.valor : null;
  };

  const calcularMedia = (alunoId: string) => {
    if (principalAvs.length === 0) return null;
    let soma = 0;
    let counted = 0;
    principalAvs.forEach(av => {
      const rp = avaliacoes.find(a => a.parent_id?.toString() === av.id?.toString());
      const valAv = getNota(alunoId, av.id) ?? 0;
      const valRp = rp ? (getNota(alunoId, rp.id) ?? 0) : 0;
      soma += Math.max(valAv, valRp);
      counted++;
    });
    return counted > 0 ? soma / counted : 0;
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
                  <select 
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value)}
                    className="w-full border border-slate-300 rounded-md py-3 pl-3 pr-10 text-base appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 bg-white"
                  >
                    {APP_CONFIG.BIMESTRES.map(b => (
                      <option key={b.id} value={b.nome}>{b.label}</option>
                    ))}
                    <option value="Recuperação">RECUPERAÇÃO</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <ChevronDown className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Exibir Button */}
              <div className="md:col-span-2">
                <button 
                  onClick={handleExibir}
                  disabled={dataLoading}
                  className="bg-blue-600 text-white px-6 py-3 rounded-md flex items-center gap-2 text-base font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-70"
                >
                  <Search className="h-5 w-5" />
                  {dataLoading ? 'Buscando...' : 'Exibir'}
                </button>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-grow bg-white relative">
            {dataLoading ? (
              <div className="h-96 flex items-center justify-center text-slate-500 font-medium">Carregando dados...</div>
            ) : !hasSearched ? (
              <div className="h-96 flex items-center justify-center text-slate-400 text-sm"></div>
            ) : alunos.length === 0 ? (
              <div className="h-96 flex items-center justify-center text-slate-500 font-medium">Nenhum aluno encontrado para esta turma.</div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Tabs */}
                <div className="flex border-b border-slate-200 px-6">
                  <div className="px-4 py-3 border-b-2 border-blue-600 text-sm font-semibold text-slate-800">Alunos</div>
                  <div className="px-4 py-3 text-sm font-medium text-blue-500 hover:text-blue-600 cursor-pointer">Com notas importadas</div>
                </div>

                <div className="p-6 pb-4">
                  <h4 className="text-lg font-bold text-slate-800 mb-4">Alunos</h4>
                  <div className="relative w-full max-w-full mb-2 border border-slate-300 rounded-md overflow-hidden bg-slate-50 flex items-center focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-shadow">
                    <div className="flex h-full items-center pl-4 pr-2 bg-slate-50 text-slate-400 border-r border-slate-200">
                      <Search className="w-5 h-5" />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Pesquisar" 
                      className="bg-transparent text-slate-900 text-sm w-full p-2.5 outline-none pl-3"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto px-6 pb-6">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-[#f8f9fa] border-t border-slate-200">
                      <tr>
                        <th className="px-4 py-4 border-b border-slate-200 w-16 text-center">
                          <div className="flex flex-col items-center justify-center relative">
                            <span className="text-[13px] text-[#0f2851] font-bold">Nº</span>
                            <div className="absolute right-1 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                              <span>▲</span><span>▼</span>
                            </div>
                          </div>
                        </th>
                        <th className="px-6 py-4 border-b border-slate-200 border-l border-slate-100 min-w-[250px] text-left">
                          <div className="flex items-center justify-between relative pr-4">
                            <span className="text-[13px] text-[#0f2851] font-bold">NOME DO ALUNO</span>
                            <div className="absolute right-0 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                              <span>▲</span><span>▼</span>
                            </div>
                          </div>
                        </th>
                        {principalAvs.map(av => {
                          const rp = avaliacoes.find(a => a.parent_id?.toString() === av.id?.toString());
                          const diaMesAv = formatDiaMes(av.data);
                          const diaMesRp = rp ? formatDiaMes(rp.data) : '';
                          return (
                            <React.Fragment key={av.id}>
                              <th className="px-2 py-4 border-b border-slate-200 border-l border-slate-100 text-center min-w-[80px] hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col items-center justify-center relative">
                                  {diaMesAv && <span className="text-[13px] text-[#0f2851] font-bold tracking-tight mb-1">{diaMesAv}</span>}
                                  <div className="w-[80%] h-[1px] bg-slate-200 mb-1"></div>
                                  <div className="flex items-center justify-center w-full relative">
                                    <span className="text-[13px] text-[#0f2851] font-bold">{av.tipo}</span>
                                    <div className="absolute right-0 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                                      <span>▲</span><span>▼</span>
                                    </div>
                                  </div>
                                </div>
                              </th>
                              <th className="px-2 py-4 border-b border-slate-200 text-center min-w-[80px] hover:bg-slate-50 transition-colors">
                                <div className="flex flex-col items-center justify-center relative">
                                  {rp ? (
                                    <>
                                      {diaMesRp ? <span className="text-[13px] text-[#0f2851] font-bold tracking-tight mb-1">{diaMesRp}</span> : <div className="h-[20px] mb-1"></div>}
                                      <div className="w-[80%] h-[1px] bg-slate-200 mb-1"></div>
                                      <div className="flex items-center justify-center w-full relative">
                                        <span className="text-[13px] text-[#0f2851] font-bold">{rp.tipo}</span>
                                        <div className="absolute right-0 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                                          <span>▲</span><span>▼</span>
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <span className="text-slate-300 font-black tracking-wide text-xs">-</span>
                                  )}
                                </div>
                              </th>
                            </React.Fragment>
                          );
                        })}
                        <th className="px-4 py-4 border-b border-slate-200 border-l border-slate-100 text-center min-w-[140px]">
                          <div className="flex flex-col items-center justify-center relative">
                            <span className="text-[13px] text-[#0f2851] font-bold">MÉDIA PARCIAL</span>
                            <div className="absolute right-1 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                              <span>▲</span><span>▼</span>
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-4 border-b border-slate-200 border-l border-slate-100 text-center min-w-[140px]">
                          <div className="flex flex-col items-center justify-center relative">
                            <span className="text-[13px] text-[#0f2851] font-bold">MÉDIA PROCESSADA</span>
                            <div className="absolute right-1 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                              <span>▲</span><span>▼</span>
                            </div>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alunos.map((aluno, index) => {
                        const mediaVal = calcularMedia(aluno.id);
                        const numStr = (index + 1).toString().padStart(2, '0');
                        
                        return (
                          <tr key={aluno.id} className="hover:bg-slate-50 transition even:bg-[#fafbff]">
                            <td className="px-4 py-4 text-slate-500 font-semibold">{numStr}</td>
                            <td className="px-6 py-4 text-slate-700 font-medium border-l border-slate-100">{aluno.nome}</td>
                            {principalAvs.map(av => {
                              const rp = avaliacoes.find(a => a.parent_id?.toString() === av.id?.toString());
                              const vAv = getNota(aluno.id, av.id);
                              const vRp = rp ? getNota(aluno.id, rp.id) : null;
                              
                              return (
                                <React.Fragment key={av.id}>
                                  <td className="px-2 py-4 border-l border-slate-100 text-center">
                                    {vAv !== null ? (
                                      <span className="inline-flex min-w-[50px] justify-center bg-[#4361ee] text-white px-3 py-1 rounded-full text-[13px] font-bold shadow-sm shadow-blue-200/50 tracking-wide">
                                        {Number(vAv).toFixed(2).replace('.', ',')}
                                      </span>
                                    ) : (
                                      <span className="inline-flex min-w-[50px] justify-center bg-[#f1f5f9] text-[#64748b] px-3 py-1 rounded-full text-[13px] font-bold leading-tight">S/N</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-4 text-center border-l border-transparent">
                                    {rp && vRp !== null ? (
                                      <span className="inline-flex min-w-[50px] justify-center bg-[#4361ee] text-white px-3 py-1 rounded-full text-[13px] font-bold shadow-sm shadow-blue-200/50 tracking-wide">
                                        {Number(vRp).toFixed(2).replace('.', ',')}
                                      </span>
                                    ) : (
                                      <span className="inline-flex min-w-[50px] justify-center bg-[#f1f5f9] text-[#64748b] px-3 py-1 rounded-full text-[13px] font-bold leading-tight">S/N</span>
                                    )}
                                  </td>
                                </React.Fragment>
                              )
                            })}
                            
                            <td className="px-4 py-4 border-l border-slate-100 text-center">
                              {mediaVal !== null ? (
                                <span className={`inline-flex min-w-[50px] justify-center px-3 py-1 rounded-full text-[13px] font-bold shadow-sm text-white transition-colors duration-200 ${
                                  mediaVal >= 6 
                                    ? 'bg-[#4361ee] shadow-blue-200/50' 
                                    : 'bg-[#c2463e] shadow-red-200/50'
                                }`}>
                                  {Number(mediaVal).toFixed(2).replace('.', ',')}
                                </span>
                              ) : (
                                <span className="text-slate-300 font-black tracking-wide text-xs">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 border-l border-slate-100 text-center">
                              {/* Empty processing media as in screenshot */}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {alunos.length > 0 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 text-sm text-slate-500">
                      <div>Mostrando de 1 até {alunos.length} de {alunos.length} registros</div>
                      <div className="flex items-center space-x-2">
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-l-md hover:bg-slate-50 transition text-slate-400 flex items-center gap-1 font-medium">
                          &larr; Anterior
                        </button>
                        <button className="px-4 py-2 bg-[#4361ee] text-white font-bold shadow-sm border border-[#4361ee]">1</button>
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-r-md hover:bg-slate-50 transition text-slate-600 flex items-center gap-1 font-medium">
                          Seguinte &rarr;
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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
