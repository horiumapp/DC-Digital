import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';
import { TurmaService } from '../services/turmaService';
import { Aluno, Avaliacao } from '../contexts/TurmaContext';

export default function RelatorioMedias() {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<any[]>([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [loading, setLoading] = useState(true);
  
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
                componentes.forEach(comp => {
                  finalTurmas.push({ ...t, componente: comp });
                });
              });
              setTurmas(finalTurmas);
              if (finalTurmas.length > 0) {
                setSelectedTurma(`${finalTurmas[0].id}|${finalTurmas[0].componente}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar turmas:', err);
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
      setAvaliacoes(avsData);
      setNotas(notasData);
    } catch (err) {
      console.error(err);
      alert('Erro ao buscar dados do relatório.');
    } finally {
      setDataLoading(false);
    }
  };

  const getNota = (alunoId: string, avaliacaoId: string) => {
    const notaRow = notas.find(n => n.aluno_id?.toString() === alunoId?.toString() && n.avaliacao_id?.toString() === avaliacaoId?.toString());
    return notaRow ? notaRow.valor : null;
  };

  const calcularMediaBimestre = (alunoId: string, bimestre: string) => {
    const avsBimestre = avaliacoes.filter(a => a.bimestre === bimestre);
    const principalAvs = avsBimestre.filter(a => a.tipo.startsWith('AV') && !a.tipo.startsWith('RP'));
    
    if (principalAvs.length === 0) return null;
    
    let soma = 0;
    principalAvs.forEach(av => {
      const rp = avsBimestre.find(a => a.parent_id?.toString() === av.id?.toString());
      const valAv = getNota(alunoId, av.id) ?? 0;
      const valRp = rp ? (getNota(alunoId, rp.id) ?? 0) : 0;
      soma += Math.max(valAv, valRp);
    });
    
    return soma / principalAvs.length;
  };

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10">
        {/* SubHeader */}
        <section className="bg-white/80 backdrop-blur-md px-8 py-3 flex items-center justify-between border-b border-blue-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link to="/turmas" className="bg-[#eef2ff] text-[#0f2851] px-4 py-1.5 rounded flex items-center gap-2 text-sm font-semibold border border-blue-100 hover:bg-[#e0e7ff] transition-all">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <h1 className="text-xl font-semibold text-[#0f2851]">Relatório das Médias do Componente</h1>
          </div>
          <span className="bg-emerald-100 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200">Ano: {APP_CONFIG.YEAR}</span>
        </section>

      {/* MainContent */}
      <main className="p-6 max-w-[1400px] mx-auto">
        {/* SearchCard */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0f2851]">Pesquisa</h2>
              <button className="px-6 py-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 rounded text-base font-semibold hover:bg-[#e0e7ff] transition shadow-sm">
                Imprimir
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-slate-500 mb-1">Turma</label>
                <div className="relative">
                  <select 
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-md focus:ring-[#0f2851] focus:border-[#0f2851] block w-full pl-12 p-3 outline-none"
                  >
                    {loading ? (
                      <option>Carregando turmas...</option>
                    ) : turmas.length > 0 ? (
                      turmas.map(t => (
                        <option key={`${t.id}|${t.componente}`} value={`${t.id}|${t.componente}`}>
                          {t.nome} - {t.turno} - {t.componente}
                        </option>
                      ))
                    ) : (
                      <option>Nenhuma turma encontrada</option>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </div>
              <div className="md:col-span-4">
                <button 
                  onClick={handleExibir}
                  disabled={dataLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-3.5 rounded-md text-base font-semibold hover:bg-[#e0e7ff] transition disabled:opacity-70"
                >
                  <Search className="w-5 h-5" />
                  <span>{dataLoading ? 'Buscando...' : 'Exibir'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* StudentsTableSection */}
        {hasSearched && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-12">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Alunos</h2>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Pesquisar" 
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-md focus:ring-[#0f2851] focus:border-[#0f2851] block w-full pl-12 p-3 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-base text-left border-collapse">
                <thead className="bg-[#f8f9fa] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-5 border-b border-slate-200 w-16 text-center">
                      <div className="flex flex-col items-center justify-center relative">
                        <span className="text-[13px] text-[#0f2851] font-bold">Nº</span>
                        <div className="absolute right-1 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                          <span>▲</span><span>▼</span>
                        </div>
                      </div>
                    </th>
                    <th className="px-6 py-5 border-b border-slate-200 border-l border-slate-100 min-w-[250px]">
                      <div className="flex items-center justify-between relative pr-4">
                        <span className="text-[13px] text-[#0f2851] font-bold uppercase">NOME DO ALUNO</span>
                        <div className="absolute right-0 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                          <span>▲</span><span>▼</span>
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-5 border-b border-slate-200 border-l border-slate-100 text-center">
                      <span className="text-[13px] text-[#0f2851] font-bold">MOTIVO SAÍDA</span>
                    </th>
                    <th className="px-4 py-5 border-b border-slate-200 border-l border-slate-100 text-center">
                      <span className="text-[13px] text-[#0f2851] font-bold">DATA SAÍDA</span>
                    </th>
                    {['1. BIM', '2. BIM', '3. BIM', '4. BIM', 'RECUP'].map(label => (
                      <th key={label} className="px-2 py-5 border-b border-slate-200 border-l border-slate-100 text-center min-w-[85px]">
                        <div className="flex flex-col items-center justify-center relative">
                          <span className="text-[13px] text-[#0f2851] font-bold">{label}</span>
                          <div className="absolute right-1 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                            <span>▲</span><span>▼</span>
                          </div>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-5 border-b border-slate-200 border-l border-slate-100 text-center min-w-[120px]">
                      <div className="flex flex-col items-center justify-center relative">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] text-[#0f2851] font-bold">MÉDIA FINAL</span>
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        </div>
                        <div className="absolute right-1 flex flex-col text-[10px] text-slate-300 opacity-60 font-black leading-[6px] gap-[1px]">
                          <span>▲</span><span>▼</span>
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {alunos.map((aluno, index) => {
                    const m1 = calcularMediaBimestre(aluno.id, '1º Bimestre');
                    const m2 = calcularMediaBimestre(aluno.id, '2º Bimestre');
                    const m3 = calcularMediaBimestre(aluno.id, '3º Bimestre');
                    const m4 = calcularMediaBimestre(aluno.id, '4º Bimestre');
                    
                    const validMedias = [m1, m2, m3, m4].filter(m => m !== null) as number[];
                    const mediaFinal = validMedias.length > 0 ? validMedias.reduce((a, b) => a + b, 0) / validMedias.length : null;

                    const renderMediaPill = (val: number | null) => {
                      if (val === null) return <span className="inline-flex min-w-[45px] justify-center bg-slate-100 text-slate-400 px-2 py-1 rounded-full text-[12px] font-bold">S/N</span>;
                      return (
                        <span className={`inline-flex min-w-[45px] justify-center px-2 py-1 rounded-full text-[12px] font-bold text-white shadow-sm shadow-blue-200/50 ${val >= 6 ? 'bg-[#0f2851]' : 'bg-[#c2463e]'}`}>
                          {val.toFixed(2).replace('.', ',')}
                        </span>
                      );
                    };

                    return (
                      <tr key={aluno.id} className="hover:bg-slate-50/50 transition border-b border-slate-50">
                        <td className="px-4 py-4 text-[#64748b] font-bold text-center text-sm">
                          {(index + 1).toString().padStart(2, '0')}
                        </td>
                        <td className="px-6 py-4 text-slate-700 font-bold uppercase border-l border-slate-50 text-[13px]">
                          {aluno.nome}
                        </td>
                        <td className="px-4 py-4 border-l border-slate-50 text-center"></td>
                        <td className="px-4 py-4 border-l border-slate-50 text-center"></td>
                        <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(m1)}</td>
                        <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(m2)}</td>
                        <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(m3)}</td>
                        <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(m4)}</td>
                        <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(null)}</td>
                        <td className="px-4 py-4 border-l border-slate-50 text-center">{renderMediaPill(mediaFinal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 pb-12 text-center text-slate-400 text-xs">
        © {APP_CONFIG.YEAR} Diário Digital - Sistema de Gestão Escolar
      </footer>

      </div>
    </div>
  );
}
