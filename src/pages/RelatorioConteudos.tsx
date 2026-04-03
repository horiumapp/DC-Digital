import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';

interface TurmaRelatorio {
  id: string;
  nome: string;
  turno: string;
  componente: string;
  ensino: string;
  fase: string;
  numero: string;
}

export default function RelatorioConteudos() {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<TurmaRelatorio[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [buscaTurma, setBuscaTurma] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [opcaoFiltro, setOpcaoFiltro] = useState('Período');
  const [periodoSelecionado, setPeriodoSelecionado] = useState('1. BIMESTRE');

  useEffect(() => {
    if (opcaoFiltro === 'Período') {
      setPeriodoSelecionado('1. BIMESTRE');
    } else {
      setPeriodoSelecionado('JANEIRO');
    }
  }, [opcaoFiltro]);

  useEffect(() => {
    if (user?.email) {
      fetchTurmasProfessor();
    }
  }, [user]);

  const fetchTurmasProfessor = async () => {
    setLoading(true);
    try {
      if (!user) return;

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
            const finalTurmas: TurmaRelatorio[] = [];
            turmasAlocadas.forEach(t => {
              componentes.forEach(comp => {
                // Tenta extrair o número da turma (ex: "01", "02") do final do nome
                const matchNum = t.nome.match(/(\d+)$/);
                const numero = matchNum ? matchNum[1] : '01';
                
                finalTurmas.push({ 
                  id: `${t.id}|${comp}`, 
                  nome: t.nome, 
                  turno: t.turno, 
                  componente: comp,
                  ensino: 'Ensino Fundamental', // Padrão
                  fase: t.nome, // Fase é o nome amigável
                  numero: numero
                });
              });
            });
            
            setTurmas(finalTurmas);
            if (finalTurmas.length > 0) {
              setSelectedTurmaId(finalTurmas[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar turmas para o relatório:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTurmas = turmas.filter(t => 
    t.nome.toLowerCase().includes(buscaTurma.toLowerCase()) ||
    t.componente.toLowerCase().includes(buscaTurma.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10">
        {/* SubHeader */}
        <div className="bg-white/80 backdrop-blur-md px-8 py-3 flex items-center justify-between border-b border-blue-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link to="/diario" className="bg-[#eef2ff] text-[#0f2851] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-blue-100 hover:bg-[#e0e7ff] transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <h1 className="text-xl font-semibold text-[#0f2851]">Relatório de Objeto de Conhecimento Ministrado</h1>
          </div>
          <span className="bg-emerald-100 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200">Ano: {APP_CONFIG.YEAR}</span>
        </div>
      </div>

      <main className="p-8 flex justify-center">
        <div className="w-full max-w-[1400px] space-y-8">
          
          {/* Main Card: Turmas */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-white">
              <h2 className="text-lg font-bold text-[#0f2851]">Turmas</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Pesquisa */}
              <div className="relative max-w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Pesquisar" 
                  value={buscaTurma}
                  onChange={(e) => setBuscaTurma(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2851] focus:border-[#0f2851] bg-[#f8f9fa]" 
                />
              </div>

              {/* Tabela de Turmas */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#f0f4f8] text-[#0f2851] font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 border-r border-slate-200">Ensino</th>
                      <th className="px-4 py-3 border-r border-slate-200">Projeto</th>
                      <th className="px-4 py-3 border-r border-slate-200">Fase</th>
                      <th className="px-4 py-3 border-r border-slate-200">Turma</th>
                      <th className="px-4 py-3 border-r border-slate-200">Componente</th>
                      <th className="px-4 py-3 text-center">Selecione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400 animate-pulse font-medium">Carregando turmas...</td>
                      </tr>
                    ) : filteredTurmas.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-400">Nenhuma turma encontrada.</td>
                      </tr>
                    ) : (
                      filteredTurmas.map((t) => (
                        <tr 
                          key={t.id} 
                          className={`hover:bg-[#f8faff] transition-colors cursor-pointer ${selectedTurmaId === t.id ? 'bg-[#eef2ff]' : ''}`}
                          onClick={() => setSelectedTurmaId(t.id)}
                        >
                          <td className="px-4 py-4 border-r border-slate-100 text-slate-600">{t.ensino}</td>
                          <td className="px-4 py-4 border-r border-slate-100 text-slate-600">-</td>
                          <td className="px-4 py-4 border-r border-slate-100 text-slate-600">{t.fase}</td>
                          <td className="px-4 py-4 border-r border-slate-100 text-slate-600">{t.numero}</td>
                          <td className="px-4 py-4 border-r border-slate-100 text-slate-600 uppercase font-black text-[12px]">{t.componente}</td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex justify-center">
                              <input 
                                type="radio" 
                                name="turma-select" 
                                checked={selectedTurmaId === t.id}
                                onChange={() => setSelectedTurmaId(t.id)}
                                className="w-4 h-4 text-[#0f2851] border-slate-300 focus:ring-[#0f2851]"
                              />
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Informação de Registros */}
              {!loading && filteredTurmas.length > 0 && (
                <p className="text-sm text-slate-500 font-medium">
                  Mostrando de 1 até {filteredTurmas.length} de {filteredTurmas.length} registros
                </p>
              )}

              {/* Seleção de Opções e Período */}
              <div className="flex flex-wrap items-end gap-6 pt-4">
                <div className="space-y-1.5 w-64">
                  <label className="text-sm font-bold text-slate-600">Selecione opção</label>
                  <div className="relative">
                    <select 
                      value={opcaoFiltro}
                      onChange={(e) => setOpcaoFiltro(e.target.value)}
                      className="w-full py-3 px-4 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] outline-none font-medium"
                    >
                      <option value="Período">Período</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5 w-72">
                  <label className="text-sm font-bold text-slate-600">Selecione o Período</label>
                  <div className="relative">
                    <select 
                      value={periodoSelecionado}
                      onChange={(e) => setPeriodoSelecionado(e.target.value)}
                      className="w-full py-3 px-4 bg-white border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] outline-none font-medium"
                    >
                      {opcaoFiltro === 'Período' ? (
                        <>
                          <option value="1. BIMESTRE">1. BIMESTRE</option>
                          <option value="2. BIMESTRE">2. BIMESTRE</option>
                          <option value="3. BIMESTRE">3. BIMESTRE</option>
                          <option value="4. BIMESTRE">4. BIMESTRE</option>
                          <option value="RECUPERAÇÃO">RECUPERAÇÃO</option>
                        </>
                      ) : (
                        <>
                          <option value="JANEIRO">JANEIRO</option>
                          <option value="FEVEREIRO">FEVEREIRO</option>
                          <option value="MARÇO">MARÇO</option>
                          <option value="ABRIL">ABRIL</option>
                          <option value="MAIO">MAIO</option>
                          <option value="JUNHO">JUNHO</option>
                          <option value="JULHO">JULHO</option>
                          <option value="AGOSTO">AGOSTO</option>
                          <option value="SETEMBRO">SETEMBRO</option>
                          <option value="OUTUBRO">OUTUBRO</option>
                          <option value="NOVEMBRO">NOVEMBRO</option>
                          <option value="DEZEMBRO">DEZEMBRO</option>
                        </>
                      )}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <button 
                  className="px-8 py-3 bg-[#0f2851] text-white rounded-xl text-sm font-bold hover:bg-[#0a1b38] transition-all shadow-lg shadow-[#0f2851]/20 active:scale-95 mb-[2px]"
                >
                  Exibir Relatório
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
