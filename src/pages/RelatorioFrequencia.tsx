 
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, ChevronDown, Search, Check, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatarDataParaISO, getBimestrePorData, formatarDiaMes } from '../utils/dateUtils';
import { APP_CONFIG } from '../config/appConfig';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import * as OfflineStorage from '../services/offlineStorage';

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

const obterLogoEscola = (nomeEscola: string) => {
  if (!nomeEscola) return '/logo.png';
  const nomeUpper = nomeEscola.toUpperCase();
  if (nomeUpper.includes('FRANCISCA')) return '/Francisca Mendes.png';
  if (nomeUpper.includes('MAIA') || nomeUpper.includes('JOSE MAIA') || nomeUpper.includes('JOSÉ MAIA')) return '/José Maia.png';
  if (nomeUpper.includes('PASTOR') || nomeUpper.includes('REIS')) return '/Pastor José Reis.png';
  if (nomeUpper.includes('VARGAS') || nomeUpper.includes('PRESIDENTE')) return '/Presidente Vargas.png';
  if (nomeUpper.includes('SOCORRO') || nomeUpper.includes('BRITO')) return '/Socorro Brito.png';
  if (nomeUpper.includes('FILADÉLFIA') || nomeUpper.includes('FILADELFIA')) return '/Filadelfia.png';
  if (nomeUpper.includes('MÔNICA') || nomeUpper.includes('MONICA')) return '/Turma da Monica.png';
  if (nomeUpper.includes('SÃO FRANCISCO') || nomeUpper.includes('SAO FRANCISCO')) return '/São Francisco.png';
  return '/logo.png';
};

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
  const [buscaAluno, setBuscaAluno] = useState('');

  const alunosFiltrados = useMemo(() => {
    if (!buscaAluno.trim()) return alunosRelatorio;
    const term = buscaAluno.toLowerCase();
    return alunosRelatorio.filter(a => a.nome.toLowerCase().includes(term));
  }, [alunosRelatorio, buscaAluno]);

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
      const finalTurmas = await OfflineTurmaService.fetchTurmasRelatorio(user);
      setTurmas(finalTurmas);
      if (finalTurmas.length > 0) {
        setSelectedTurmaId(`${finalTurmas[0].id}|${finalTurmas[0].componente}`);
      } else {
        setSelectedTurmaId('');
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
      const [turmaId, rawComp] = selectedTurmaId.split('|');
      const turmaObj = turmas.find(t => `${t.id}|${t.componente}` === selectedTurmaId) || turmas.find(t => t.id === turmaId);
      const componente = (rawComp || turmaObj?.componente || '').trim();
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



      // 1. Buscar Alunos (suporte online/offline)
      const tid = turmaId.split('||')[0];
      const alunosList = await OfflineTurmaService.fetchAlunos(tid);

      // 2. Buscar Frequências (com fallback para cache local offline)
      let rawFreqs: Array<{ turma_id: string; aluno_id: string; data: string; tempo: string; status: string; participacao?: string; disciplina: string }> = [];

      if (navigator.onLine) {
        try {
          const { data, error: freqError } = await supabase
            .from('frequencias')
            .select('turma_id, aluno_id, data, tempo, status, participacao, disciplina')
            .eq('turma_id', tid);

          if (freqError) throw freqError;
          rawFreqs = (data || []) as typeof rawFreqs;
        } catch (netErr) {
          console.warn('[RelatorioFrequencia] Falha ao consultar Supabase, usando dados locais:', netErr);
          const localFreqs = await OfflineStorage.getAllFrequenciasLocal(tid, componente);
          rawFreqs = localFreqs;
        }
      } else {
        const localFreqs = await OfflineStorage.getAllFrequenciasLocal(tid, componente);
        rawFreqs = localFreqs;
      }

      // Filtragem em Memória (JS)
      const finalFreqs = (rawFreqs || []).filter(f => {
        const fDateISO = formatarDataParaISO(f.data);
        if (!fDateISO || fDateISO === 'Invalid Date') return false;

        // Comparação robusta de disciplina e período
        const matchProp = !componente || String(f.disciplina || '').trim().toUpperCase() === componente.toUpperCase();
        const matchDate = fDateISO >= dateStart && fDateISO <= dateEnd;
        return matchProp && matchDate;
      });

      if (finalFreqs.length === 0) {
        showWarning('Nenhuma frequência encontrada para os critérios selecionados.');
        setDataLoading(false);
        return;
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
      const disciplinaNome = (componente || 'Disciplina').replace(/\s+/g, '_');
       
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

  const selectedTurmaObj = turmas.find(t => `${t.id}|${t.componente}` === selectedTurmaId) || turmas.find(t => t.id === selectedTurmaId);
  const filteredTurmas = turmas.filter(t =>
    t.nome.toLowerCase().includes(buscaTurma.toLowerCase()) ||
    t.componente.toLowerCase().includes(buscaTurma.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 relative pb-10">
      <div className="relative z-10 no-print">
        {/* SubHeader */}
        <div className="bg-white/80 backdrop-blur-md px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-blue-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <Link to="/diario" className="bg-[#eef2ff] text-[#0f2851] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-bold border border-blue-100 hover:bg-[#e0e7ff] transition-all shadow-sm shrink-0">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <h1 className="text-base sm:text-xl font-bold text-[#0f2851] truncate">Relatório de Frequências da Turma</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="bg-emerald-100 text-emerald-700 text-[11px] sm:text-[12px] font-bold px-2.5 sm:px-3 py-1 rounded-full border border-emerald-200 uppercase">Ano: {APP_CONFIG.YEAR}</span>
            <button onClick={handleExibir} className="bg-[#0f2851] text-white px-4 sm:px-6 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-[#0f2851]/20 hover:bg-[#1a3a6d] transition">Imprimir</button>
          </div>
        </div>

        <main className="px-3 py-4 sm:px-8 sm:py-8 flex flex-col items-center gap-4 sm:gap-8">
          <div className="w-full max-w-[1400px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <h2 className="text-base sm:text-lg font-bold text-[#0f2851]">Pesquisa</h2>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6">
                <div className="space-y-1.5 md:col-span-6 lg:col-span-6">
                  <label className="text-xs sm:text-sm font-bold text-slate-600">Turma</label>
                  <div className="relative">
                    <select
                      value={selectedTurmaId}
                      onChange={(e) => setSelectedTurmaId(e.target.value)}
                      className="w-full py-2.5 pl-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-[#0f2851]"
                    >
                      {turmas.map(t => (
                        <option key={`${t.id}-${t.componente}`} value={`${t.id}|${t.componente}`}>
                          {t.ensino} - {t.fase} {t.numero} - {t.componente}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2 lg:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-600">Opção</label>
                  <div className="relative">
                    <select
                      value={opcaoFiltro}
                      onChange={(e) => setOpcaoFiltro(e.target.value)}
                      className="w-full py-2.5 pl-3.5 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-[#0f2851]"
                    >
                      <option value="Período">Período</option>
                      <option value="Mensal">Mensal</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-4 lg:col-span-4">
                  <label className="text-xs sm:text-sm font-bold text-slate-600">Período</label>
                  <div className="relative flex flex-col sm:flex-row gap-2">
                    <select
                      value={periodoSelecionado}
                      onChange={(e) => setPeriodoSelecionado(e.target.value)}
                      className="w-full sm:flex-1 min-w-0 py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500/10 outline-none font-bold text-[#0f2851]"
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
                      className="w-full sm:w-auto justify-center bg-[#0f2851] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-[#1a3a6d] transition shadow-md shadow-blue-900/20 shrink-0"
                    >
                      <Search className="w-4 h-4" /> Exibir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[1400px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-100 bg-[#f8fafc] overflow-x-auto scrollbar-none">
              {['Alunos', 'Com faltas importadas', 'Saíram da Turma', 'Com Faltas Justificadas'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`whitespace-nowrap px-4 sm:px-6 py-3 sm:py-4 text-xs font-bold transition-all relative uppercase tracking-wider shrink-0 ${activeTab === tab ? 'text-[#0f2851]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                  {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0f2851]" />}
                </button>
              ))}
            </div>

            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-700">Alunos</h3>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    {alunosFiltrados.length}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 bg-slate-50 px-3 sm:px-4 py-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-black text-slate-400">Legenda</span>
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-slate-300 shrink-0"></span> Sem freq.</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 shrink-0"></span> Falta</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500"><span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shrink-0"></span> Presença</span>
                  </div>
                </div>
              </div>

              <div className="relative mb-4 sm:mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  placeholder="Pesquisar aluno por nome..."
                  className="w-full pl-12 pr-4 py-2.5 sm:py-3 bg-[#f8f9fa] border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 outline-none"
                />
              </div>

              {/* Dica de rolagem horizontal em telas pequenas */}
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2 md:hidden">
                <span className="flex items-center gap-1.5 font-medium text-[11px]">
                  <span className="inline-block animate-pulse">👉</span> Deslize para o lado para ver todas as datas
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-inner bg-white">
                <table className="w-full text-left border-collapse min-w-[700px] sm:min-w-[1000px]">
                  <thead>
                    <tr className="bg-[#f0f4f8] text-[#0f2851] border-b border-slate-200">
                      <th className="sticky left-0 z-20 bg-[#f0f4f8] px-3 sm:px-4 py-3 font-bold text-[11px] w-12 border-r border-slate-200 text-center">Nº</th>
                      <th className="sticky left-12 z-20 bg-[#f0f4f8] px-3 sm:px-6 py-3 font-bold text-[11px] min-w-[140px] sm:w-80 border-r border-slate-200 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]">Nome</th>
                      {colunasDatas.map(col => {
                        const [data] = col.split('|');
                        return (
                          <th key={col} className="px-2 py-3 font-black text-[9px] text-center border-r border-slate-200 min-w-[45px] leading-tight">
                            {formatarDiaMes(data)}
                          </th>
                        );
                      })}
                      <th className="px-3 sm:px-4 py-3 font-bold text-[11px] text-center w-20 sm:w-24 border-r border-slate-200 bg-blue-50">FALTAS</th>
                      <th className="px-3 sm:px-4 py-3 font-bold text-[11px] text-center w-20 sm:w-24 bg-blue-50">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {alunosFiltrados.map((aluno, idx) => (
                      <tr key={aluno.id} className="group hover:bg-[#f8faff] transition-colors">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-[#f8faff] px-3 sm:px-4 py-3 text-slate-500 font-bold border-r border-slate-100 text-center">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="sticky left-12 z-10 bg-white group-hover:bg-[#f8faff] px-3 sm:px-6 py-3 font-medium text-slate-700 border-r border-slate-100 truncate max-w-[150px] sm:max-w-none shadow-[3px_0_6px_-2px_rgba(0,0,0,0.12)]" title={aluno.nome}>{aluno.nome}</td>
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
                        <td className="px-3 sm:px-4 py-3 text-center border-r border-slate-100 font-black text-[#0f2851] bg-[#eef2ff]/30">
                          <span className="bg-[#eef2ff] px-2 py-0.5 rounded-full border border-blue-100 text-xs">{aluno.totalFaltas}</span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-center font-black text-white bg-[#eef2ff]/30">
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
            html, body { height: auto !important; overflow: visible !important; background: white !important; }
            body * { visibility: hidden; }
            #printable-relatorio, #printable-relatorio * { visibility: visible; }
            #printable-relatorio { 
              visibility: visible;
              position: absolute; 
              left: 0; 
              top: 0; 
              width: 100%; 
              display: block !important;
              overflow: visible !important;
            }
          }
          #printable-relatorio .doc-container { padding: 10px; font-family: Arial, sans-serif; color: black; }
          #printable-relatorio table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          #printable-relatorio th, #printable-relatorio td { border: 1px solid black; padding: 4px; text-align: left; font-size: 8px; font-family: Arial, sans-serif; }
          #printable-relatorio .header-grid { width: 100%; border: 1px solid black; border-collapse: collapse; }
          #printable-relatorio .header-grid td { border: 1px solid black; padding: 2px 6px; }
          #printable-relatorio .label { font-size: 6px; text-transform: uppercase; font-weight: normal; margin-bottom: 1px; color: #333; }
          #printable-relatorio .value { font-size: 9px; font-weight: bold; text-transform: uppercase; }
          #printable-relatorio .title-bar { border: 1px solid black; border-top: none; padding: 6px; text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; }
          #printable-relatorio .data-table { width: 100%; border-collapse: collapse; margin-top: 15px; border: 1px solid black; }
          #printable-relatorio .data-table th, #printable-relatorio .data-table td { border: 1px solid black; font-size: 7px; text-align: center; padding: 2px; }
          #printable-relatorio .data-table th { background: #eee; font-weight: bold; }
          #printable-relatorio .data-table .name-col { text-align: left; padding-left: 5px; font-size: 8px; font-weight: bold; }
          #printable-relatorio .status-circle { width: 12px; height: 12px; border: 1px solid #777; border-radius: 50%; margin: 0 auto; line-height: 11px; font-size: 7px; font-weight: bold; }
          #printable-relatorio .status-P { background: #e6fffa; color: #234e52; border-color: #38b2ac; }
          #printable-relatorio .status-F { background: #fff5f5; color: #742a2a; border-color: #e53e3e; }
          #printable-relatorio .signatures { margin-top: 40px; display: flex; justify-content: space-around; page-break-inside: avoid; padding-bottom: 20px; }
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
          <div className="flex border border-black overflow-hidden">
            {/* Logo Box */}
            <div className="w-[20%] border-r border-black p-4 flex flex-col items-center justify-center text-center">
              <img src="/semed.png" alt="Logo SEMED" className="w-16 h-16 mb-1 object-contain" />
              <div className="font-bold text-[8px] leading-tight uppercase">
                Secretaria Municipal de Educação<br />
                Lábrea - AM
              </div>
            </div>

            {/* Metadata Grid */}
            <table className="flex-1 header-grid border-none">
              <tbody>
                <tr className="h-8">
                  <td colSpan={3} className="border-t-0 border-r-0">
                    <div className="label">Escola:</div>
                    <div className="value shadow-none">{selectedTurmaObj?.escolaNome}</div>
                  </td>
                </tr>
                <tr className="h-8">
                  <td width="55%" className="border-r border-black">
                    <div className="label">Ensino:</div>
                    <div className="value">{selectedTurmaObj?.ensino}</div>
                  </td>
                  <td width="25%" className="border-r border-black">
                    <div className="label">Turno:</div>
                    <div className="value">{selectedTurmaObj?.turno}</div>
                  </td>
                  <td width="20%" className="border-r-0">
                    <div className="label">Turma:</div>
                    <div className="value">{selectedTurmaObj?.numero}</div>
                  </td>
                </tr>
                <tr className="h-8">
                  <td className="border-r border-black">
                    <div className="label">Fase:</div>
                    <div className="value">{selectedTurmaObj?.fase}</div>
                  </td>
                  <td className="border-r border-black">
                    <div className="label">Componente:</div>
                    <div className="value">{selectedTurmaObj?.componente?.toUpperCase()}</div>
                  </td>
                  <td className="border-r-0">
                    <div className="label">Período Letivo:</div>
                    <div className="value">{periodoSelecionado}</div>
                  </td>
                </tr>
                <tr className="h-8">
                  <td colSpan={3} className="border-b-0 border-r-0">
                    <div className="label">Professor:</div>
                    <div className="value">{user?.name?.toUpperCase() || 'NÃO IDENTIFICADO'}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* School Logo Box */}
            <div className="w-[20%] border-l border-black p-4 flex flex-col items-center justify-center text-center">
              <img src={obterLogoEscola(selectedTurmaObj?.escolaNome || '')} alt="Logo Escola" className="w-16 h-16 mb-1 object-contain" />
              <div className="font-bold text-[8px] leading-tight uppercase">
                {selectedTurmaObj?.escolaNome}
              </div>
            </div>
          </div>
          <div className="title-bar">
            RELATÓRIO DE FREQUÊNCIA
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '3%' }}>Nº</th>
                <th style={{ width: '20%' }}>ALUNO</th>
                {colunasDatas.map(col => {
                  const [data] = col.split('|');
                  return (
                    <th key={col} className="text-[6px]" style={{ width: '2%' }}>
                      {formatarDiaMes(data)}
                    </th>
                  );
                })}
                <th style={{ width: '6%' }}>FALTAS</th>
                <th style={{ width: '6%' }}>FREQ. %</th>
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
            <div>Gerado pelo Sistema DDigital em {new Date().toLocaleString('pt-BR')}</div>
            <div>Folha de Registro Individual de Frequência - SEMED - Lábrea/AM</div>
          </div>
        </div>
      </div>
    </div>
  );
}
