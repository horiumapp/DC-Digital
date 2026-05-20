/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatarDataParaISO, getBimestrePorData, getDayOfWeek } from '../utils/dateUtils';
import { APP_CONFIG } from '../config/appConfig';

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

interface ConteudoLinha {
  data: string;
  tempo: string;
  descricao: string;
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

export default function RelatorioConteudos() {
  const { user } = useAuth();
  const { showError, showWarning } = useToast();
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
              setSelectedTurmaId(finalTurmas[0].id);
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar turmas para o relatório:', err);
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



      // Busca Primária por UUID (Sem filtro agressivo de data no SQL para evitar problemas de formato string)
      const { data: rawContents, error } = await supabase
        .from('conteudos')
        .select('*')
        .eq('turma_id', turmaId);

      if (error) throw error;



      // Filtragem Inteligente em Memória (JS) usando normalização de datas
      const filtered = (rawContents || []).filter(c => {
        const cDateISO = formatarDataParaISO(c.data);
        if (!cDateISO || cDateISO === 'Invalid Date') return false;

        const matchDate = cDateISO >= dateStart && cDateISO <= dateEnd;
        const matchComp = String(c.disciplina || '').trim().toUpperCase() === componente.trim().toUpperCase();
        return matchDate && matchComp;
      });



      let contentsRes = filtered;

      // Fallback: Se não achou nada pelo ID, tentamos buscar pelo NOME da disciplina em todo o período
      if (contentsRes.length === 0) {
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
        }
      }

      if (contentsRes.length === 0) {
        showWarning('Nenhum conteúdo encontrado para os critérios selecionados no diário.');
        setDataLoading(false);
        return;
      }

      // Ordenar por data cronológica antes de formatar para exibição
      const sorted = [...contentsRes].sort((a, b) => {
        const dateA = formatarDataParaISO(a.data);
        const dateB = formatarDataParaISO(b.data);
        return dateA.localeCompare(dateB);
      });

      const formatted = sorted.map(c => {
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
      // eslint-disable-next-line react-hooks/immutability
      document.title = `CM_${periodoLimpo}_${turmaNome}_${disciplinaNome}`;

      // Pequeno timeout para garantir que o componente de impressão renderizou
      setTimeout(() => {
        window.print();
        document.title = oldTitle; // Restaurar título original
        setDataLoading(false);
      }, 500);

    } catch (err) {
      console.error(err);
      showError('Erro ao gerar relatório.');
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
                          <td className="px-6 py-4 border-r border-slate-100 text-slate-600 font-bold">{t.fase} {t.numero}</td>
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
                        APP_CONFIG.PERIODOS.filter(p => !p.id.includes('SEMESTRE') && p.id !== 'ÚNICO').map(p => (
                          <option key={p.id} value={p.label}>{p.label}</option>
                        ))
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
            .no-print { display: none !important; }
          }
          #printable-relatorio table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          #printable-relatorio th, #printable-relatorio td { border: 1px solid black; padding: 4px; text-align: left; font-size: 8px; font-family: Arial, sans-serif; }
          #printable-relatorio .header-grid { width: 100%; border: 1px solid black; border-collapse: collapse; }
          #printable-relatorio .header-grid td { border: 1px solid black; padding: 2px 6px; }
          #printable-relatorio .label { font-size: 6px; text-transform: uppercase; font-weight: normal; margin-bottom: 1px; color: #333; }
          #printable-relatorio .value { font-size: 9px; font-weight: bold; text-transform: uppercase; }
          #printable-relatorio .title-bar { border: 1px solid black; border-top: none; padding: 6px; text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; }
          #printable-relatorio .content-table { margin-top: 15px; border: 1px solid black; width: 100%; border-collapse: collapse; }
          #printable-relatorio .content-table th { background: #eee; text-align: center; font-weight: bold; padding: 6px; border: 1px solid black; font-size: 8px; }
          #printable-relatorio .content-table td { border: 1px solid black; padding: 4px; font-size: 8px; }
          #printable-relatorio .signatures { margin-top: 40px; display: flex; justify-content: space-around; page-break-inside: avoid; padding-bottom: 20px; }
          #printable-relatorio .sig-line { border-top: 1px solid black; width: 250px; text-align: center; padding-top: 4px; font-size: 8px; font-weight: bold; margin-top: 25px; }
        `}</style>

        <div className="p-4 bg-white text-black h-auto">
          {/* Header Area Oficial */}
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

          {/* Title Bar */}
          <div className="title-bar">
            RELATÓRIO DE CONTEÚDO MINISTRADO
          </div>

          {/* Table Area */}
          <table className="content-table">
            <thead>
              <tr>
                <th width="10%">DATA</th>
                <th width="12%">TEMPO DE AULA</th>
                <th width="48%">CONTEÚDO</th>
                <th width="15%">OBSERVAÇÃO</th>
                <th width="15%">CONTEÚDO MÍNIMO</th>
              </tr>
            </thead>
            <tbody>
              {conteudosRelatorio.map((c, i) => (
                <tr key={i}>
                  <td className="text-center font-bold px-2 py-3">{c.data}</td>
                  <td className="text-center uppercase">{c.tempo}</td>
                  <td className="p-2 uppercase leading-tight">{c.descricao}</td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
              {[...Array(Math.max(0, 10 - conteudosRelatorio.length))].map((_, i) => (
                <tr key={`empty-${i}`} className="h-10">
                  <td></td><td></td><td></td><td></td><td></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures */}
          <div className="signatures">
            <div>
              <div className="sig-line">ASSINATURA DO PROFESSOR(A)</div>
              <div className="text-[7px] text-center mt-0.5">{user?.name?.toUpperCase()}</div>
            </div>
            <div>
              <div className="sig-line">ASSINATURA DA COORDENAÇÃO PEDAGÓGICA</div>
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-auto pt-6 flex justify-between text-[7px] italic text-slate-400">
            <div>Sistema DDigital - Gerado em {new Date().toLocaleString('pt-BR')}</div>
            <div>Registro Individual de Conteúdo - SEMED - Lábrea/AM</div>
          </div>
        </div>
      </div>
    </div>
  );
}
