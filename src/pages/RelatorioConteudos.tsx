import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatarDataParaISO, getBimestrePorData, getDayOfWeek } from '../utils/dateUtils';
import { APP_CONFIG } from '../config/appConfig';

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

interface ConteudoLinha {
  data: string;
  tempo: string;
  descricao: string;
}

export default function RelatorioConteudos() {
  const { user } = useAuth();
  const [turmas, setTurmas] = useState<TurmaRelatorio[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [buscaTurma, setBuscaTurma] = useState('');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [conteudosRelatorio, setConteudosRelatorio] = useState<ConteudoLinha[]>([]);
  
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
            .select('*, escolas(nome)')
            .or(orConditions)
            .order('nome');

          if (turmasAlocadas) {
            const finalTurmas: TurmaRelatorio[] = [];
            turmasAlocadas.forEach(t => {
              componentes.forEach(comp => {
                const matchNum = t.nome.match(/(\d+)$/);
                const numero = matchNum ? matchNum[1] : '01';
                
                finalTurmas.push({ 
                  id: `${t.id}|${comp}`, 
                  nome: t.nome, 
                  turno: t.turno, 
                  componente: comp,
                  ensino: t.ensino || 'Ensino Fundamental', 
                  fase: t.nome, 
                  numero: t.turma_codigo || numero,
                  escolaId: t.escola_id,
                  escolaNome: t.escolas?.nome || 'ESCOLA NÃO IDENTIFICADA'
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

  const handleExibir = async () => {
    if (!selectedTurmaId) {
      alert('Por favor, selecione uma turma.');
      return;
    }

    setDataLoading(true);
    try {
      const [turmaId, componente] = selectedTurmaId.split('|');
      let dateStart = '';
      let dateEnd = '';
      
      const hojeISO = new Date().toISOString().split('T')[0];
      
      if (opcaoFiltro === 'Período') {
        const period = APP_CONFIG.BIMESTRES.find(b => b.label === periodoSelecionado);
        if (period) {
          dateStart = period.dataInicio;
          // Se o fim do bimestre for depois de hoje, limitamos a hoje para o relatório ser atual
          dateEnd = period.dataFim > hojeISO ? hojeISO : period.dataFim;
        }
      } else {
        const mesesMap: Record<string, number> = {
          'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4, 'MAIO': 5, 'JUNHO': 6, 
          'JULHO': 7, 'AGOSTO': 8, 'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
        };
        const mes = mesesMap[periodoSelecionado];
        if (mes) {
          dateStart = `${APP_CONFIG.YEAR}-${mes.toString().padStart(2, '0')}-01`;
          const lastDay = new Date(APP_CONFIG.YEAR, mes, 0).getDate();
          const mesEndISO = `${APP_CONFIG.YEAR}-${mes.toString().padStart(2, '0')}-${lastDay}`;
          dateEnd = mesEndISO > hojeISO ? hojeISO : mesEndISO;
        }
      }

      console.log('--- INICIO BUSCA RELATORIO ---');
      console.log('Critérios:', { turmaId, componente, dateStart, dateEnd, hoje: hojeISO });

      // Busca Primária por UUID (Sem filtro agressivo de data no SQL para evitar problemas de formato string)
      const { data: rawContents, error } = await supabase
        .from('conteudos')
        .select('*')
        .eq('turma_id', turmaId);

      if (error) throw error;

      console.log(`Registros totais da turma no banco: ${rawContents?.length || 0}`);

      // Filtragem Inteligente em Memória (JS) usando normalização de datas
      const filtered = (rawContents || []).filter(c => {
        const cDateISO = formatarDataParaISO(c.data);
        if (!cDateISO || cDateISO === 'Invalid Date') return false;
        
        const matchDate = cDateISO >= dateStart && cDateISO <= dateEnd;
        const matchComp = String(c.disciplina || '').trim().toUpperCase() === componente.trim().toUpperCase();
        return matchDate && matchComp;
      });

      console.log(`Registros após filtragem de Data/Disciplina: ${filtered.length}`);

      let contentsRes = filtered;

      // Fallback: Se não achou nada pelo ID, tentamos buscar pelo NOME da disciplina em todo o período
      // Isso ajuda se o ID da turma foi corrompido ou trocado por outro formato
      if (contentsRes.length === 0) {
        console.log('Tentando Fallback Amplo por Disciplina/Escola...');
        const { data: fallbackData } = await supabase
          .from('conteudos')
          .select('*')
          .ilike('disciplina', componente)
          .gte('data', dateStart.split('-').reverse().join('/')) // Tenta formato BR caso o GTE funcione
          .lte('data', dateEnd.split('-').reverse().join('/'));

        const fallbackFiltered = (fallbackData || []).filter(c => {
           const cDateISO = formatarDataParaISO(c.data);
           return cDateISO >= dateStart && cDateISO <= dateEnd;
        });

        if (fallbackFiltered.length > 0) {
          contentsRes = fallbackFiltered;
          console.log(`Fallback encontrou ${contentsRes.length} registros.`);
        }
      }

      if (contentsRes.length === 0) {
        alert('Nenhum conteúdo encontrado para os critérios selecionados no diário.');
        setDataLoading(false);
        return;
      }

      const formatted = contentsRes.map(c => {
        let dataExibicao = '---';
        
        if (c.data && c.data !== 'Invalid Date') {
          // Detectar e converter ISO (YYYY-MM-DD) para BR (DD/MM/YYYY)
          if (/^\d{4}-\d{2}-\d{2}/.test(c.data)) {
            const parts = c.data.split('T')[0].split('-');
            dataExibicao = `${parts[2]}/${parts[1]}/${parts[0]}`;
          } else if (c.data.includes('/')) {
            // Se já tem barras, apenas limpa extras (Ex: 09/02/2026 00:00 -> 09/02/2026)
            dataExibicao = c.data.substring(0, 10);
          }
        }

        return {
          data: dataExibicao,
          tempo: c.tempo,
          descricao: c.descricao || (c.objetos ? c.objetos.join(', ') : '')
        };
      });

      setConteudosRelatorio(formatted);
      
      // Definir o nome do arquivo PDF (via título do documento)
      const oldTitle = document.title;
      const turmaNome = selectedTurmaObj?.nome?.replace(/\s+/g, '_') || 'Turma';
      const disciplinaNome = componente?.replace(/\s+/g, '_') || 'Disciplina';
      const periodoLimpo = periodoSelecionado.replace(/\s+/g, '');
      document.title = `CM_${periodoLimpo}_${turmaNome}_${disciplinaNome}`;

      // Pequeno timeout para garantir que o componente de impressão renderizou
      setTimeout(() => {
        window.print();
        document.title = oldTitle; // Restaurar título original
        setDataLoading(false);
      }, 500);

    } catch (err) {
      console.error(err);
      alert('Erro ao gerar relatório.');
      setDataLoading(false);
    }
  };

  const selectedTurmaObj = turmas.find(t => t.id === selectedTurmaId);

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
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Ensino / Projeto</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fase / Turma</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Componente</th>
                      <th className="px-4 py-3 text-center">Selecione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400 animate-pulse font-medium">Carregando turmas...</td>
                      </tr>
                    ) : filteredTurmas.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhuma turma encontrada.</td>
                      </tr>
                    ) : (
                      filteredTurmas.map((t) => (
                        <tr 
                          key={t.id} 
                          className={`hover:bg-[#f8faff] transition-colors cursor-pointer ${selectedTurmaId === t.id ? 'bg-[#eef2ff]' : ''}`}
                          onClick={() => setSelectedTurmaId(t.id)}
                        >
                          <td className="px-6 py-4 border-r border-slate-100 text-slate-600">{t.ensino}</td>
                          <td className="px-6 py-4 border-r border-slate-100 text-slate-600 font-bold">{t.fase}</td>
                          <td className="px-6 py-4 border-r border-slate-100 text-slate-600 uppercase font-black text-[12px]">{t.componente}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center">
                              <input 
                                type="radio" 
                                name="turma-select" 
                                checked={selectedTurmaId === t.id}
                                onChange={() => setSelectedTurmaId(t.id)}
                                className="w-5 h-5 text-[#0f2851] border-slate-300 focus:ring-[#0f2851]"
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
                  onClick={handleExibir}
                  disabled={dataLoading}
                  className="px-8 py-3 bg-[#0f2851] text-white rounded-xl text-sm font-bold hover:bg-[#0a1b38] transition-all shadow-lg shadow-[#0f2851]/20 active:scale-95 mb-[2px] disabled:opacity-50"
                >
                  {dataLoading ? 'Gerando...' : 'Exibir Relatório'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ÁREA DE IMPRESSÃO (Oculta na tela, visível no PDF) */}
      <div id="printable-relatorio" className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-y-auto">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { margin: 1cm; size: A4; }
            body * { visibility: hidden; }
            #printable-relatorio, #printable-relatorio * { visibility: visible; }
            #printable-relatorio { 
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              display: block !important;
            }
            .no-print { display: none !important; }
          }
          #printable-relatorio table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          #printable-relatorio th, #printable-relatorio td { border: 1px solid black; padding: 4px; text-align: left; font-size: 8px; font-family: Arial, sans-serif; }
          #printable-relatorio .header-table td { border: none !important; border-bottom: 1px solid black !important; padding: 2px !important; }
          #printable-relatorio .meta-grid td { border: 1px solid black !important; background: white !important; font-weight: bold; }
          #printable-relatorio .label { font-size: 7px; color: #555; text-transform: uppercase; font-weight: normal; margin-bottom: 1px; }
          #printable-relatorio .title-bar { background: white; text-align: center; font-size: 14px; font-weight: bold; border: 1px solid black; border-top: none; padding: 4px; }
        `}} />

        <div className="p-4 bg-white text-black min-h-screen">
          {/* Header Area */}
          <table className="header-table">
            <tbody>
              <tr>
                <td width="30%" className="text-center" style={{ borderBottom: 'none !important' }}>
                  <img src="/logo.png" alt="Logo" className="w-16 h-16 mx-auto mb-1" />
                  <div className="font-bold text-[10px]">ESTADO DO AMAZONAS</div>
                  <div className="text-[9px]">SECRETARIA DE ESTADO DE EDUCAÇÃO E DESPORTO</div>
                </td>
                <td width="70%" valign="top">
                  <table className="meta-grid" style={{ width: '100%', tableLayout: 'fixed' }}>
                    <tbody>
                      <tr>
                        <td colSpan={3} className="px-2 py-1">
                          <div className="label">ESCOLA:</div>
                          <div className="text-[10px] truncate uppercase">{selectedTurmaObj?.escolaNome}</div>
                        </td>
                      </tr>
                      <tr>
                        <td width="50%" className="px-2 py-1">
                          <div className="label">ENSINO:</div>
                          <div className="text-[9px] uppercase">{selectedTurmaObj?.ensino || 'Ensino Médio - NEM'}</div>
                        </td>
                        <td width="25%" className="px-2 py-1">
                          <div className="label">TURNO:</div>
                          <div className="text-[9px] uppercase">{selectedTurmaObj?.turno || 'INTEGRAL'}</div>
                        </td>
                        <td width="25%" className="px-2 py-1">
                          <div className="label">TURMA:</div>
                          <div className="text-[9px] uppercase">{selectedTurmaObj?.numero || '01'}</div>
                        </td>
                      </tr>
                      <tr>
                        <td className="px-2 py-1">
                          <div className="label">FASE:</div>
                          <div className="text-[9px] uppercase">{selectedTurmaObj?.fase || '3 SERIE'}</div>
                        </td>
                        <td className="px-2 py-1">
                          <div className="label">COMPONENTE:</div>
                          <div className="text-[9px] uppercase">{selectedTurmaObj?.componente || 'MATEMATICA'}</div>
                        </td>
                        <td className="px-2 py-1">
                          <div className="label">PERÍODO LETIVO:</div>
                          <div className="text-[9px] uppercase">{periodoSelecionado}</div>
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-2 py-1">
                          <div className="label">PROFESSOR:</div>
                          <div className="text-[10px] uppercase">{user?.name || 'JACKSON NASCIMENTO SILVA'}</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="title-bar uppercase">
            RELATÓRIO DE CONTEÚDO MINISTRADO
          </div>

          {/* Main Table */}
          <table className="mt-4">
            <thead className="bg-white">
              <tr>
                <th width="12%" className="text-center">DATA</th>
                <th width="15%" className="text-center">TEMPO DE AULA</th>
                <th width="43%">CONTEÚDO</th>
                <th width="15%">OBSERVAÇÃO</th>
                <th width="15%">CONTEÚDO MÍNIMO</th>
              </tr>
            </thead>
            <tbody>
              {conteudosRelatorio.map((c, i) => (
                <tr key={i}>
                  <td className="text-center">{c.data}</td>
                  <td className="text-center">{c.tempo}</td>
                  <td className="leading-tight text-[8px] py-2">{c.descricao}</td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
              {/* Preencher linhas vazias se for pouco conteúdo */}
              {[...Array(Math.max(0, 15 - conteudosRelatorio.length))].map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="h-6"></td><td></td><td></td><td></td><td></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer */}
          <div className="fixed bottom-4 left-4 right-4 flex justify-between text-[8px] font-medium text-slate-500 italic">
            <div>Impresso em {new Date().toLocaleString('pt-BR')}</div>
            <div className="page-counter">1/1</div>
          </div>
        </div>
      </div>
    </div>
  );
}
