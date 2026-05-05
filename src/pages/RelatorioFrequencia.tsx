import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Search, Check, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatarDataParaISO, getBimestrePorData } from '../utils/dateUtils';
import { APP_CONFIG } from '../config/appConfig';
import { TurmaService } from '../services/turmaService';

import { useToast } from '../components/common/Toast';

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

interface AlunoFrequencia {
  id: string;
  nome: string;
  matricula: string;
  frequencias: Record<string, string>; // "DD/MM-T" -> "P"|"F"|"FJ"
  totalFaltas: number;
  porcentagemFrequencia: number;
}

export default function RelatorioFrequencia() {
  const { user } = useAuth();
  const { showError, showWarning } = useToast();
  const [turmas, setTurmas] = useState<TurmaRelatorio[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [buscaTurma, setBuscaTurma] = useState('');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [alunosRelatorio, setAlunosRelatorio] = useState<AlunoFrequencia[]>([]);
  const [colunasDatas, setColunasDatas] = useState<string[]>([]);
  
  const [opcaoFiltro, setOpcaoFiltro] = useState('Período');
  const [periodoSelecionado, setPeriodoSelecionado] = useState('1. BIMESTRE');
  const [activeTab, setActiveTab] = useState('Alunos');

  useEffect(() => {
    if (opcaoFiltro === 'Período') {
      setPeriodoSelecionado('1. BIMESTRE');
    } else {
      setPeriodoSelecionado('JANEIRO');
    }
  }, [opcaoFiltro]);

  const fetchTurmasProfessor = async () => {
    setLoading(true);
    try {
      if (!user) return;
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
            if (finalTurmas.length > 0) setSelectedTurmaId(finalTurmas[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar turmas:', err);
      showError('Não foi possível carregar as turmas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      fetchTurmasProfessor();
    }
  }, [user]);


  const handleExibir = async () => {
    if (!selectedTurmaId) {
      showWarning('Por favor, selecione uma turma.');
      return;
    }

    setDataLoading(true);
    try {
      const [turmaId, componente] = selectedTurmaId.split('|');
      let dateStart = '';
      let dateEnd = '';
      const hojeISO = new Date().toISOString().split('T')[0];

      if (opcaoFiltro === 'Período') {
        const period = APP_CONFIG.PERIODOS.find(p => p.label === periodoSelecionado);
        if (period) {
          dateStart = period.dataInicio;
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
          dateEnd = `${APP_CONFIG.YEAR}-${mes.toString().padStart(2, '0')}-${lastDay}`;
          if (dateEnd > hojeISO) dateEnd = hojeISO;
        }
      }



      // 1. Buscar Alunos
      const alunosList = await TurmaService.fetchAlunos(turmaId);

      
      // 2. Buscar Frequências de forma ampla
      const { data: rawFreqs, error: freqError } = await supabase
        .from('frequencias')
        .select('*')
        .eq('turma_id', turmaId);

      if (freqError) throw freqError;


      // Filtragem em Memória (JS)
      const finalFreqs = (rawFreqs || []).filter(f => {
        const fDateISO = formatarDataParaISO(f.data);
        if (!fDateISO || fDateISO === 'Invalid Date') return false;
        
        // Comparação robusta de disciplina e período
        const matchProp = String(f.disciplina || '').trim().toUpperCase() === componente.trim().toUpperCase();
        const matchDate = fDateISO >= dateStart && fDateISO <= dateEnd;
        return matchProp && matchDate;
      });



      if (finalFreqs.length === 0) {
        // Fallback: Tenta buscar pelo NOME da disciplina caso o ID da turma esteja vinculado de forma diferente
        const { data: fallbackFreqs } = await supabase
          .from('frequencias')
          .select('*')
          .ilike('disciplina', componente);
        
        const filteredFallback = (fallbackFreqs || []).filter(f => {
           // Verifica se o aluno da frequência pertence à turma atual
           const alunoPertence = alunosList.some(a => a.id.toString() === f.aluno_id.toString());
           const fDateISO = formatarDataParaISO(f.data);
           return alunoPertence && fDateISO >= dateStart && fDateISO <= dateEnd;
        });

        if (filteredFallback.length > 0) {
           finalFreqs.push(...filteredFallback);
        } else {
           showWarning('Nenhuma frequência encontrada para os critérios selecionados.');
           setDataLoading(false);
           return;
        }
      }

      // 3. Processar Colunas (Datas/Tempos)
      const colunasUnicas = new Set<string>();
      finalFreqs.forEach(f => {
        // Garantir que temos data e tempo
        if (f.data && f.tempo) {
          colunasUnicas.add(`${f.data}|${f.tempo}`);
        }
      });

      const colunasSorted = [...colunasUnicas].sort((a, b) => {
        const dateA = formatarDataParaISO(a.split('|')[0]);
        const dateB = formatarDataParaISO(b.split('|')[0]);
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return a.split('|')[1].localeCompare(b.split('|')[1]);
      });

      setColunasDatas(colunasSorted);

      // 4. Mapear Alunos e Frequências
      const mappedAlunos: AlunoFrequencia[] = alunosList.map(a => {
        const freqsAlun: Record<string, string> = {};
        let faltas = 0;
        const totalTempos = colunasSorted.length;

        colunasSorted.forEach(colKey => {
          const [data, tempo] = colKey.split('|');
          const f = finalFreqs.find(fr => fr.aluno_id.toString() === a.id && fr.data === data && fr.tempo === tempo);
          if (f) {
            freqsAlun[colKey] = f.status;
            if (f.status === 'F') faltas++;
          } else {
            freqsAlun[colKey] = 'P'; // Default Presença se houver aula mas não houver registro específico (assumindo que o dia teve aula)
          }
        });

        return {
          id: a.id,
          nome: a.nome,
          matricula: a.matricula,
          frequencias: freqsAlun,
          totalFaltas: faltas,
          porcentagemFrequencia: totalTempos > 0 ? (faltas / totalTempos) * 100 : 0
        };
      });

      setAlunosRelatorio(mappedAlunos);
      
      const oldTitle = document.title;
      const turmaNome = selectedTurmaObj?.nome?.replace(/\s+/g, '_') || 'Turma';
      const disciplinaNome = componente?.replace(/\s+/g, '_') || 'Disciplina';
      // eslint-disable-next-line react-hooks/immutability
      document.title = `FREQ_${periodoSelecionado.replace(/\s+/g, '')}_${turmaNome}_${disciplinaNome}`;
      
      setTimeout(() => {
        window.print();
        document.title = oldTitle;
        setDataLoading(false);
      }, 500);

    } catch (err) {
      console.error(err);
      showError('Erro ao carregar dados.');
      setDataLoading(false);
    }
  };

  const selectedTurmaObj = turmas.find(t => t.id === selectedTurmaId);
  const filteredTurmas = turmas.filter(t => 
    t.nome.toLowerCase().includes(buscaTurma.toLowerCase()) ||
    t.componente.toLowerCase().includes(buscaTurma.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 relative pb-10">
      <div className="relative z-10 no-print">
        {/* SubHeader */}
        <div className="bg-white/80 backdrop-blur-md px-8 py-3 flex items-center justify-between border-b border-blue-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link to="/diario" className="bg-[#eef2ff] text-[#0f2851] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-blue-100 hover:bg-[#e0e7ff] transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <h1 className="text-xl font-semibold text-[#0f2851]">Relatório de Frequências da Turma</h1>
          </div>
          <div className="flex items-center gap-3">
             <span className="bg-emerald-100 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200 uppercase">Ano: {APP_CONFIG.YEAR}</span>
             <button onClick={handleExibir} className="bg-[#0f2851] text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-[#0f2851]/20 hover:bg-[#1a3a6d] transition">Imprimir</button>
          </div>
        </div>

        <main className="p-8 flex flex-col items-center gap-8">
          <div className="w-full max-w-[1400px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
               <h2 className="text-lg font-bold text-[#0f2851]">Pesquisa</h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">Turma</label>
                  <div className="relative">
                    <select 
                      value={selectedTurmaId}
                      onChange={(e) => setSelectedTurmaId(e.target.value)}
                      className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-[#0f2851]"
                    >
                      {turmas.map(t => (
                        <option key={t.id} value={t.id}>{t.ensino} - {t.fase} - {t.componente}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">Opção</label>
                  <div className="relative">
                    <select 
                      value={opcaoFiltro}
                      onChange={(e) => setOpcaoFiltro(e.target.value)}
                      className="w-full py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-[#0f2851]"
                    >
                      <option value="Período">Período</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-600">Período</label>
                  <div className="relative flex gap-2">
                    <select 
                      value={periodoSelecionado}
                      onChange={(e) => setPeriodoSelecionado(e.target.value)}
                      className="flex-1 py-2.5 px-4 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-[#0f2851]"
                    >
                      {opcaoFiltro === 'Período' ? (
                        APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE')).map(p => <option key={p.label} value={p.label}>{p.label}</option>)
                      ) : (
                        ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'].map(m => <option key={m} value={m}>{m}</option>)
                      )}
                    </select>
                    <button 
                      onClick={handleExibir}
                      disabled={dataLoading}
                      className="bg-[#0f2851] text-white px-6 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1a3a6d] transition shadow-md shadow-blue-900/20"
                    >
                      <Search className="w-4 h-4" /> Exibir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[1400px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
             <div className="flex border-b border-slate-100 bg-[#f8fafc]">
               {['Alunos', 'Com faltas importadas', 'Saíram da Turma', 'Com Faltas Justificadas'].map(tab => (
                 <button 
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-6 py-4 text-xs font-bold transition-all relative uppercase tracking-wider ${activeTab === tab ? 'text-[#0f2851]' : 'text-slate-400 hover:text-slate-600'}`}
                 >
                   {tab}
                   {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0f2851]" />}
                 </button>
               ))}
             </div>

             <div className="p-6">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-bold text-slate-700">Alunos</h3>
                 <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-black text-slate-400">Legenda</span>
                    <div className="flex items-center gap-3">
                       <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-3 rounded-full bg-slate-300"></span> Sem frequência</span>
                       <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-3 rounded-full bg-red-500"></span> Falta</span>
                       <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-3 h-3 rounded-full bg-green-500"></span> Presença</span>
                    </div>
                 </div>
               </div>

               <div className="relative mb-6">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input type="text" placeholder="Pesquisar aluno..." className="w-full pl-12 pr-4 py-3 bg-[#f8f9fa] border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none" />
               </div>

               <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-inner bg-white">
                 <table className="w-full text-left border-collapse min-w-[1000px]">
                   <thead>
                     <tr className="bg-[#f0f4f8] text-[#0f2851] border-b border-slate-200">
                       <th className="px-4 py-3 font-bold text-[11px] w-12 border-r border-slate-200">Nº</th>
                       <th className="px-6 py-3 font-bold text-[11px] w-80 border-r border-slate-200">Nome</th>
                       {colunasDatas.map(col => {
                         const [data, tempo] = col.split('|');
                         const dateObj = new Date(formatarDataParaISO(data));
                         return (
                           <th key={col} className="px-2 py-3 font-black text-[9px] text-center border-r border-slate-200 min-w-[45px] leading-tight">
                              {data.split('/')[0]}<br/>{['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][dateObj.getMonth()]}<br/>{tempo?.charAt(0)}T
                           </th>
                         );
                       })}
                       <th className="px-4 py-3 font-bold text-[11px] text-center w-24 border-r border-slate-200 bg-blue-50">FALTAS TOTAIS</th>
                       <th className="px-4 py-3 font-bold text-[11px] text-center w-24 bg-blue-50">FALTAS %</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {alunosRelatorio.map((aluno, idx) => (
                       <tr key={aluno.id} className="hover:bg-[#f8faff] transition-colors">
                         <td className="px-4 py-3 text-slate-500 font-bold border-r border-slate-100 text-center">{String(idx + 1).padStart(2, '0')}</td>
                         <td className="px-6 py-3 font-medium text-slate-700 border-r border-slate-100">{aluno.nome}</td>
                         {colunasDatas.map(col => {
                           const status = aluno.frequencias[col];
                           return (
                             <td key={col} className="px-1 py-3 text-center border-r border-slate-100">
                                <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center text-[9px] font-black
                                  ${status === 'P' ? 'bg-green-500 text-white' : 
                                    status === 'F' ? 'bg-red-500 text-white' : 
                                    'bg-slate-200 text-slate-400'}`}>
                                  {status || ''}
                                </div>
                             </td>
                           );
                         })}
                         <td className="px-4 py-3 text-center border-r border-slate-100 font-black text-[#0f2851] bg-[#eef2ff]/30">
                            <span className="bg-[#eef2ff] px-2 py-0.5 rounded-full border border-blue-100">{aluno.totalFaltas}</span>
                         </td>
                         <td className="px-4 py-3 text-center font-black text-white bg-[#eef2ff]/30">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${aluno.porcentagemFrequencia > 25 ? 'bg-red-500' : 'bg-blue-600'}`}>
                              {aluno.porcentagemFrequencia.toFixed(1).replace('.', ',')}%
                            </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        </main>
      </div>

      {/* ÁREA DE IMPRESSÃO OFICIAL */}
      <div id="printable-relatorio" className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-y-auto">
        <style>{`
          @media print {
            @page { margin: 1cm; size: A4 landscape; }
            html, body { height: 100%; overflow: hidden; background: white !important; }
            body * { visibility: hidden; }
            #printable-relatorio, #printable-relatorio * { visibility: visible; }
            #printable-relatorio { 
              visibility: visible;
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              display: block !important;
            }
          }
          #printable-relatorio .doc-container { padding: 10px; font-family: Arial, sans-serif; color: black; }
          #printable-relatorio .official-header { display: flex; border: 2px solid black; }
          #printable-relatorio .logo-box { width: 25%; border-right: 2px solid black; padding: 10px; text-align: center; }
          #printable-relatorio .meta-box { flex: 1; }
          #printable-relatorio .meta-table { width: 100%; border-collapse: collapse; }
          #printable-relatorio .meta-table td { border: 1px solid black; padding: 2px 6px; height: 16px; }
          #printable-relatorio .label { font-size: 6px; text-transform: uppercase; margin-bottom: 1px; color: #333; }
          #printable-relatorio .value { font-size: 8px; font-weight: bold; text-transform: uppercase; }
          #printable-relatorio .title-box { border: 2px solid black; border-top: none; padding: 6px; text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; }
          #printable-relatorio .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 2px solid black; }
          #printable-relatorio .data-table th, #printable-relatorio .data-table td { border: 1px solid black; font-size: 7px; text-align: center; padding: 2px; }
          #printable-relatorio .data-table th { background: #eee; font-weight: bold; }
          #printable-relatorio .data-table .name-col { text-align: left; padding-left: 5px; font-size: 8px; font-weight: bold; }
          #printable-relatorio .status-circle { width: 12px; height: 12px; border: 1px solid #777; border-radius: 50%; margin: 0 auto; line-height: 11px; font-size: 7px; font-weight: bold; }
          #printable-relatorio .status-P { background: #e6fffa; color: #234e52; border-color: #38b2ac; }
          #printable-relatorio .status-F { background: #fff5f5; color: #742a2a; border-color: #e53e3e; }
          #printable-relatorio .signatures { margin-top: 40px; display: flex; justify-content: space-around; }
          #printable-relatorio .sig-line { border-top: 1px solid black; width: 250px; text-align: center; padding-top: 4px; font-size: 8px; font-weight: bold; margin-top: 25px; }
          #printable-relatorio .print-footer { 
            position: fixed; 
            bottom: 0; 
            left: 0; 
            right: 0; 
            display: flex; 
            justify-content: space-between; 
            padding: 5px 10px;
            font-size: 7px;
            font-style: italic;
            border-top: 0.5px solid #eee;
            background: white;
          }
        `}</style>

        <div className="doc-container">
          <div className="official-header">
             <div className="logo-box">
                <img src="/semed.png" className="w-16 h-16 mx-auto mb-1" />
                <div className="font-bold text-[8px] leading-tight">SECRETARIA MUNICIPAL DE EDUCAÇÃO<br/>LÁBREA - AM</div>
             </div>
             <div className="meta-box">
                <table className="meta-table">
                  <tbody>
                    <tr><td colSpan={3}><div className="label">Escola:</div><div className="value">{selectedTurmaObj?.escolaNome}</div></td></tr>
                    <tr>
                      <td width="60%"><div className="label">Ensino:</div><div className="value">{selectedTurmaObj?.ensino}</div></td>
                      <td width="20%"><div className="label">Turno:</div><div className="value">{selectedTurmaObj?.turno}</div></td>
                      <td width="20%"><div className="label">Turma:</div><div className="value">{selectedTurmaObj?.numero}</div></td>
                    </tr>
                    <tr>
                      <td><div className="label">Professor:</div><div className="value">{user?.name || 'NÃO IDENTIFICADO'}</div></td>
                      <td><div className="label">Fase:</div><div className="value">{selectedTurmaObj?.fase}</div></td>
                      <td><div className="label">Componente:</div><div className="value">{selectedTurmaObj?.componente}</div></td>
                    </tr>
                  </tbody>
                </table>
             </div>
          </div>
          <div className="title-box">Relatório de Frequência da Turma - Período: {periodoSelecionado}</div>

          <table className="data-table">
            <thead>
              <tr>
                <th width="3%">Nº</th>
                <th width="20%">ALUNO</th>
                {colunasDatas.map(col => <th key={col} className="w-[2%] text-[6px]">{col.split('|')[0].substring(0, 5)}<br/>{col.split('|')[1].charAt(0)}T</th>)}
                <th width="6%">FALTAS</th>
                <th width="6%">FREQ. %</th>
              </tr>
            </thead>
            <tbody>
               {alunosRelatorio.map((aluno, i) => (
                 <tr key={aluno.id}>
                    <td>{String(i + 1).padStart(2, '0')}</td>
                    <td className="name-col">{aluno.nome.toUpperCase()}</td>
                    {colunasDatas.map(col => (
                      <td key={col}>
                        <div className={`status-circle status-${aluno.frequencias[col]}`}>
                          {aluno.frequencias[col] || ''}
                        </div>
                      </td>
                    ))}
                    <td className="font-bold">{aluno.totalFaltas}</td>
                    <td className="font-bold">{(100 - aluno.porcentagemFrequencia).toFixed(1)}%</td>
                 </tr>
               ))}
            </tbody>
          </table>

          <div className="signatures">
            <div><div className="sig-line">ASSINATURA DO PROFESSOR(A)</div></div>
            <div><div className="sig-line">ASSINATURA DA COORDENAÇÃO PEDAGÓGICA</div></div>
          </div>

          <div className="print-footer">
             <div>Gerado pelo Sistema DC Digital em {new Date().toLocaleString('pt-BR')}</div>
             <div>Folha de Registro Individual de Frequência - SEMED - Lábrea/AM</div>
          </div>
        </div>
      </div>
    </div>
  );
}
