import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';
import { TurmaService } from '../services/turmaService';
import { Aluno, Avaliacao } from '../contexts/TurmaContext';

import { useToast } from '../components/common/Toast';

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

const obterLogoEscola = (nomeEscola: string) => {
  if (!nomeEscola) return '/logo.png';
  const nomeUpper = nomeEscola.toUpperCase();
  if (nomeUpper.includes('FRANCISCA MENDES')) return '/Francisca Mendes.png';
  if (nomeUpper.includes('JOSÉ MAIA') || nomeUpper.includes('JOSE MAIA')) return '/Jose Maia.png';
  if (nomeUpper.includes('SOCORRO BRITO')) return '/Socorro Brito.png';
  if (nomeUpper.includes('MARTA SOUZA') || nomeUpper.includes('MARTA SOUSA')) return '/Marta Souza.png';
  if (nomeUpper.includes('FILADÉLFIA') || nomeUpper.includes('FILADELFIA')) return '/Filadelfia.png';
  if (nomeUpper.includes('MÔNICA') || nomeUpper.includes('MONICA')) return '/Turma da Monica.png';
  return '/logo.png';
};

interface TurmaRelatorio {
  id: string;
  nome: string;
  turno: string;
  componente: string;
  ensino: string;
  fase: string;
  numero: string;
  escolaId: string;
  escolaNome: string;
}

export default function RelatorioNotas() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [turmas, setTurmas] = useState<TurmaRelatorio[]>([]);
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
        const { data: todasTurmas, error } = await supabase
          .from('turmas')
          .select('*, escolas(nome)')
          .order('nome');
        
        if (error) throw error;

        if (todasTurmas) {
          const finalTurmas: TurmaRelatorio[] = [];
          todasTurmas.forEach(t => {
            let fase = t.nome;
            let numero = '01';

            const match = t.nome.match(/(.+)\s+([A-Za-z0-9]+)$/);
            if (match) {
              fase = match[1].trim();
              numero = match[2].trim();
            } else {
              const matchNum = t.nome.match(/(\d+)$/);
              if (matchNum) numero = matchNum[1];
            }

            finalTurmas.push({
              id: `${t.id}|GERAL`,
              nome: t.nome,
              turno: t.turno,
              componente: 'GERAL',
              ensino: t.ensino || 'Fundamental Anos Iniciais (1° ao 5° ANO)',
              fase: fase,
              numero: t.turma_codigo || numero,
              escolaId: t.escola_id,
              escolaNome: t.escolas?.nome || 'ESCOLA NÃO IDENTIFICADA'
            });
          });

          setTurmas(finalTurmas);
          if (finalTurmas.length > 0) {
            setSelectedTurma(finalTurmas[0].id);
          }
        }
      } else {
        const emailLimpo = user.email.trim();
        const { data: profs, error: profError } = await supabase
          .from('professores')
          .select('id, disciplinas')
          .ilike('email', `%${emailLimpo}%`);

        if (profError) throw profError;

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

          const { data: alocs, error: alocError } = await supabase
            .from('professor_alocacoes')
            .select('escola_id, turno')
            .in('professor_id', profIds);

          if (alocError) throw alocError;

          if (alocs && alocs.length > 0) {
            const orConditions = alocs.map(a => `and(escola_id.eq.${a.escola_id},turno.eq.${a.turno})`).join(',');
            const { data: turmasAlocadas, error: turmasError } = await supabase
              .from('turmas')
              .select('*, escolas(nome)')
              .or(orConditions)
              .order('nome');

            if (turmasError) throw turmasError;

            if (turmasAlocadas) {
              const finalTurmas: TurmaRelatorio[] = [];
              turmasAlocadas.forEach(t => {
                // Criar uma entrada para cada disciplina alocada àquela turma
                componentes.forEach(comp => {
                  let fase = t.nome;
                  let numero = '01';

                  const match = t.nome.match(/(.+)\s+([A-Za-z0-9]+)$/);
                  if (match) {
                    fase = match[1].trim();
                    numero = match[2].trim();
                  } else {
                    const matchNum = t.nome.match(/(\d+)$/);
                    if (matchNum) numero = matchNum[1];
                  }

                  finalTurmas.push({
                    id: `${t.id}|${comp}`,
                    nome: t.nome,
                    turno: t.turno,
                    componente: comp,
                    ensino: t.ensino || 'Fundamental Anos Iniciais (1° ao 5° ANO)',
                    fase: fase,
                    numero: t.turma_codigo || numero,
                    escolaId: t.escola_id,
                    escolaNome: t.escolas?.nome || 'ESCOLA NÃO IDENTIFICADA'
                  });
                });
              });
              
              setTurmas(finalTurmas);
              if (finalTurmas.length > 0) {
                setSelectedTurma(finalTurmas[0].id);
              }
            }
          } else {
            setTurmas([]);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar turmas para o relatório:', err);
      showError('Não foi possível carregar as turmas para o relatório.');
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
      const tid = turmaId.split('||')[0];
      
      const alunosData = await TurmaService.fetchAlunos(tid);
      setAlunos(alunosData);

      const { avaliacoes: avsData, notasData } = await TurmaService.fetchAvaliacoes(tid, componente);
      const filteredAvs = avsData.filter(a => a.bimestre === periodo);
      setAvaliacoes(filteredAvs);
      setNotas(notasData);
    } catch (err) {
      console.error(err);
      showError('Erro ao buscar dados do relatório.');
    } finally {
      setDataLoading(false);
    }
  };

  const principalAvs = avaliacoes.filter(a => a.tipo.startsWith('AV') && !a.tipo.startsWith('RP')).sort((a,b) => a.tipo.localeCompare(b.tipo));

  const getNota = (alunoId: string, avaliacaoId: string) => {
    const notaRow = notas.find(n => n.aluno_id?.toString() === alunoId?.toString() && n.avaliacao_id?.toString() === avaliacaoId?.toString());
    return notaRow ? notaRow.valor : null;
  };

  const calcularSomaBimestre = (alunoId: string) => {
    if (principalAvs.length === 0) return null;
    let soma = 0;
    principalAvs.forEach(av => {
      const rp = avaliacoes.find(a => a.parent_id?.toString() === av.id?.toString());
      const valAv = getNota(alunoId, av.id) ?? 0;
      const valRp = rp ? (getNota(alunoId, rp.id) ?? 0) : 0;
      soma += Math.max(valAv, valRp);
    });
    
    const bimNumber = parseInt(periodo[0]);
    const maxLimit = (bimNumber === 1 || bimNumber === 2) ? 20 : 30;
    
    return Math.min(soma, maxLimit);
  };

  const selectedTurmaObj = turmas.find(t => t.id === selectedTurma);

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10">
        {/* SubHeader */}
        <div className="bg-white/80 backdrop-blur-md px-8 py-3 flex items-center justify-between border-b border-blue-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link to="/diario" className="bg-[#eef2ff] text-[#0f2851] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-blue-100 hover:bg-[#e0e7ff] transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <h1 className="text-xl font-semibold text-[#0f2851]">Relatório de Notas</h1>
          </div>
          <span className="bg-emerald-100 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200">Ano: {APP_CONFIG.YEAR}</span>
        </div>
      </div>

      {/* MainContent */}
      <main className="p-8 flex justify-center">
        <div className="w-full max-w-7xl bg-white rounded-xl shadow-lg border border-slate-200 min-h-[600px] overflow-hidden">
          {/* Card Header Area */}
          <div className="p-6 pb-0 flex justify-between items-start">
            <h3 className="text-xl font-semibold text-[#0f2851]">Pesquisa</h3>
            <button 
              onClick={() => window.print()}
              className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-base font-semibold hover:bg-[#e0e7ff] transition shadow-sm cursor-pointer"
            >
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
                          {t.ensino} - {t.fase} {t.numero} - {t.componente}
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
                    {APP_CONFIG.PERIODOS.filter(p => !p.id.includes('SEMESTRE') && p.id !== 'ÚNICO').map(p => (
                      <option key={p.id} value={p.nome}>{p.label}</option>
                    ))}
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
                  className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-3 rounded-md flex items-center gap-2 text-base font-semibold hover:bg-[#e0e7ff] transition shadow-sm disabled:opacity-70"
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
                  <div className="px-4 py-3 border-b-2 border-[#0f2851] text-sm font-semibold text-[#0f2851]">Alunos</div>
                  <div className="px-4 py-3 text-sm font-medium text-slate-500 hover:text-[#0f2851] cursor-pointer">Com notas importadas</div>
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
                            <span className="text-[13px] text-[#0f2851] font-bold">SOMA PARCIAL</span>
                            <div className="absolute right-1 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                              <span>▲</span><span>▼</span>
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-4 border-b border-slate-200 border-l border-slate-100 text-center min-w-[140px]">
                          <div className="flex flex-col items-center justify-center relative">
                            <span className="text-[13px] text-[#0f2851] font-bold">SOMA PROCESSADA</span>
                            <div className="absolute right-1 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                              <span>▲</span><span>▼</span>
                            </div>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alunos.map((aluno, index) => {
                        const somaVal = calcularSomaBimestre(aluno.id);
                        const numStr = (index + 1).toString().padStart(2, '0');
                        
                        const bimNumber = parseInt(periodo[0]);
                        const minPass = (bimNumber === 1 || bimNumber === 2) ? 10 : 15;
                        
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
                                      <span className="inline-flex min-w-[50px] justify-center bg-[#0f2851] text-white px-3 py-1 rounded-full text-[13px] font-bold shadow-sm shadow-blue-200/50 tracking-wide">
                                        {Number(vAv).toFixed(2).replace('.', ',')}
                                      </span>
                                    ) : (
                                      <span className="inline-flex min-w-[50px] justify-center bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[13px] font-bold">S/N</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-4 text-center border-l border-transparent">
                                    {rp && vRp !== null ? (
                                      <span className="inline-flex min-w-[50px] justify-center bg-[#0f2851] text-white px-3 py-1 rounded-full text-[13px] font-bold shadow-sm shadow-blue-200/50 tracking-wide">
                                        {Number(vRp).toFixed(2).replace('.', ',')}
                                      </span>
                                    ) : (
                                      <span className="inline-flex min-w-[50px] justify-center bg-slate-100 text-slate-400 px-3 py-1 rounded-full text-[13px] font-bold">S/N</span>
                                    )}
                                  </td>
                                </React.Fragment>
                              )
                            })}
                            
                            <td className="px-4 py-4 border-l border-slate-100 text-center">
                              {somaVal !== null ? (
                                <span className={`inline-flex min-w-[50px] justify-center px-3 py-1 rounded-full text-[13px] font-bold shadow-sm text-white transition-colors duration-200 ${
                                  somaVal >= minPass 
                                    ? 'bg-[#0f2851] shadow-blue-200/50' 
                                    : 'bg-[#c2463e] shadow-red-200/50'
                                }`}>
                                  {Number(somaVal).toFixed(2).replace('.', ',')}
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

      {/* Área de Impressão (invisível na tela, visível apenas na impressão) */}
      {selectedTurmaObj && (
        <div id="printable-relatorio" className="hidden print:block">
          <div className="doc-container">
            {/* Cabeçalho Oficial */}
            <div className="official-header">
              {/* Lado Esquerdo: SEMED */}
              <div className="logo-box">
                <img src="/semed.png" alt="SEMED Logo" />
                <p>SEMED</p>
                <p style={{ fontSize: '5px', color: '#555' }}>Secretaria de Educação</p>
              </div>

              <div className="header-divider"></div>

              {/* Centro: Tabela de Metadados */}
              <table className="meta-table">
                <tbody>
                  <tr>
                    <td colSpan={3} style={{ textTransform: 'uppercase' }}>
                      ESCOLA: {selectedTurmaObj.escolaNome}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ width: '50%', textTransform: 'uppercase' }}>
                      ENSINO: {selectedTurmaObj.ensino}
                    </td>
                    <td style={{ width: '25%', textTransform: 'uppercase' }}>
                      TURNO: {selectedTurmaObj.turno}
                    </td>
                    <td style={{ width: '25%', textTransform: 'uppercase' }}>
                      TURMA: {selectedTurmaObj.numero}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ textTransform: 'uppercase' }}>
                      FASE: {selectedTurmaObj.fase}
                    </td>
                    <td style={{ textTransform: 'uppercase' }}>
                      COMPONENTE: {selectedTurmaObj.componente?.toUpperCase()}
                    </td>
                    <td style={{ textTransform: 'uppercase' }}>
                      PERÍODO LETIVO: {periodo?.toUpperCase()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={3} style={{ textTransform: 'uppercase' }}>
                      PROFESSOR: {user?.name?.toUpperCase() || 'NÃO IDENTIFICADO'}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="header-divider"></div>

              {/* Lado Direito: Escola */}
              <div className="logo-box">
                <img 
                  src={obterLogoEscola(selectedTurmaObj.escolaNome)} 
                  alt="School Logo"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
                <p style={{ fontSize: '6px', whiteSpace: 'normal', marginTop: '2px' }}>
                  {selectedTurmaObj.escolaNome}
                </p>
              </div>
            </div>

            {/* Title Bar */}
            <div className="title-bar">
              RELATÓRIO DE NOTAS DA TURMA
            </div>

            {/* Tabela de Dados */}
            <table className="content-table">
              <thead>
                <tr>
                  <th style={{ width: '4%' }}>Nº</th>
                  <th style={{ width: '12%' }}>FASE</th>
                  <th style={{ width: '6%' }}>TURMA</th>
                  <th style={{ width: '38%' }}>NOME DO ALUNO</th>
                  {principalAvs.map((av) => (
                    <React.Fragment key={av.id}>
                      <th style={{ textAlign: 'center' }}>{av.nome?.toUpperCase()}</th>
                      <th style={{ textAlign: 'center' }}>REC. {av.nome?.toUpperCase()}</th>
                    </React.Fragment>
                  ))}
                  <th style={{ width: '10%', textAlign: 'center' }}>NOTA {periodo[0]}º B</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, index) => {
                  const somaVal = calcularSomaBimestre(aluno.id);
                  return (
                    <tr key={aluno.id}>
                      <td style={{ textAlign: 'center' }}>{(index + 1).toString().padStart(2, '0')}</td>
                      <td style={{ textAlign: 'center' }}>{selectedTurmaObj.fase}</td>
                      <td style={{ textAlign: 'center' }}>{selectedTurmaObj.numero}</td>
                      <td style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{aluno.nome}</td>
                      {principalAvs.map(av => {
                        const rp = avaliacoes.find(a => a.parent_id?.toString() === av.id?.toString());
                        const vAv = getNota(aluno.id, av.id);
                        const vRp = rp ? getNota(aluno.id, rp.id) : null;
                        return (
                          <React.Fragment key={av.id}>
                            <td style={{ textAlign: 'center' }}>
                              {vAv !== null ? Number(vAv).toFixed(1).replace('.', ',') : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {rp && vRp !== null ? Number(vRp).toFixed(1).replace('.', ',') : '-'}
                            </td>
                          </React.Fragment>
                        );
                      })}
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {somaVal !== null ? Number(somaVal).toFixed(1).replace('.', ',') : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>ATIVA</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Signatures Area */}
            <div className="signatures-container">
              <div className="signature-box">
                <div className="signature-line"></div>
                <p className="signature-title">{user?.name?.toUpperCase() || 'PROFESSOR(A)'}</p>
                <p className="signature-subtitle">Professor(a)</p>
              </div>
              <div className="signature-box">
                <div className="signature-line"></div>
                <p className="signature-title">COORDENAÇÃO PEDAGÓGICA</p>
                <p className="signature-subtitle">Coordenação Pedagógica</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        #printable-relatorio .doc-container { padding: 10px; font-family: Arial, sans-serif; color: black; }
        #printable-relatorio table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        #printable-relatorio th, #printable-relatorio td { border: 1px solid black; padding: 4px; font-size: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        #printable-relatorio th { font-weight: bold; background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #printable-relatorio .official-header { display: flex; border: 1px solid black; }
        #printable-relatorio .logo-box { width: 20%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 5px; text-align: center; }
        #printable-relatorio .logo-box img { max-height: 45px; object-fit: contain; }
        #printable-relatorio .logo-box p { font-size: 7px; font-weight: bold; margin-top: 3px; line-height: 1; }
        #printable-relatorio .header-divider { width: 1px; background-color: black; }
        #printable-relatorio .meta-table { flex: 1; border-collapse: collapse; margin: -1px; }
        #printable-relatorio .meta-table td { border: 1px solid black; padding: 4px 6px; font-size: 8px; font-weight: bold; height: 20px; box-sizing: border-box; }
        #printable-relatorio .title-bar { background-color: black !important; color: white !important; text-align: center; font-weight: bold; font-size: 10px; padding: 4px 0; border: 1px solid black; border-top: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        #printable-relatorio .content-table { margin-top: 10px; border: 1px solid black; }
        #printable-relatorio .content-table th { border: 1px solid black; }
        #printable-relatorio .content-table td { border: 1px solid black; height: 22px; }
        #printable-relatorio .signatures-container { margin-top: 30px; display: flex; justify-content: space-around; width: 100%; page-break-inside: avoid; }
        #printable-relatorio .signature-box { width: 40%; text-align: center; display: flex; flex-direction: column; align-items: center; }
        #printable-relatorio .signature-line { width: 100%; border-top: 1px solid black; margin-bottom: 4px; }
        #printable-relatorio .signature-title { font-size: 8px; font-weight: bold; margin: 0; }
        #printable-relatorio .signature-subtitle { font-size: 7px; color: #555; margin: 0; text-transform: uppercase; }
        @media print {
          body > *:not(#printable-relatorio) { display: none !important; }
          #printable-relatorio { display: block !important; width: 100%; }
          html, body { height: auto !important; overflow: visible !important; }
        }
      `}} />
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
