import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, Folder } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { APP_CONFIG } from '../config/appConfig';
import CalendarWidget from '../components/common/CalendarWidget';
import { useTurmaProgress } from '../hooks/useTurmaProgress';
import TurmaHeaderInfo from '../components/common/TurmaHeaderInfo';

export default function Diario() {
  const { turmaAtiva, lancamentos, avaliacoes, alunos, horarioTurma, fechamentos, verificarPeriodoFechado } = useTurma();
  const year = APP_CONFIG.YEAR;

  const periodosLetivos = APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE'));

  const checarFechado = useCallback((periodoId: string) => {
    if (verificarPeriodoFechado) {
      return verificarPeriodoFechado(periodoId);
    }
    return !!fechamentos[periodoId];
  }, [verificarPeriodoFechado, fechamentos]);

  const periodosVisiveis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const resultado = [];
    for (let i = 0; i < periodosLetivos.length; i++) {
      const p = periodosLetivos[i];
      const [ano, mes, dia] = p.dataInicio.split('-').map(Number);
      const dataInicio = new Date(ano, mes - 1, dia);

      // Regra 1: O bimestre já começou no calendário anual?
      if (dataInicio > hoje) break;

      // Regra 2: Se não for o primeiro bimestre, o anterior precisa estar fechado na Aparata!
      if (i > 0) {
        const bimestreAnterior = periodosLetivos[i - 1];
        const isAnteriorFechado = checarFechado(bimestreAnterior.id);

        // Se o anterior não está fechado, impede a visualização deste e dos próximos
        if (!isAnteriorFechado) break;
      }

      resultado.push(p);
    }

    return resultado.length > 0 ? resultado : [periodosLetivos[0]];
  }, [periodosLetivos, checarFechado]);

  // Função para identificar o período letivo aberto prioritário:
  // 1. Período aberto que engloba o dia de hoje
  // 2. Período aberto mais recente entre os visíveis
  // 3. Último período visível como fallback
  const obterPeriodoAberto = useCallback((visiveis: typeof periodosLetivos) => {
    if (!visiveis || visiveis.length === 0) return periodosLetivos[0];
    const hoje = new Date();

    const abertoHoje = visiveis.find(p => {
      if (checarFechado(p.id)) return false;
      const [anoI, mesI, diaI] = p.dataInicio.split('-').map(Number);
      const [anoF, mesF, diaF] = p.dataFim.split('-').map(Number);
      const inicio = new Date(anoI, mesI - 1, diaI, 0, 0, 0);
      const fim = new Date(anoF, mesF - 1, diaF, 23, 59, 59, 999);
      return hoje >= inicio && hoje <= fim;
    });
    if (abertoHoje) return abertoHoje;

    const abertoMaisRecente = [...visiveis].reverse().find(p => !checarFechado(p.id));
    if (abertoMaisRecente) return abertoMaisRecente;

    return visiveis[visiveis.length - 1];
  }, [periodosLetivos, checarFechado]);

  // Garante que o calendário inicie em um mês válido para o período selecionado
  const obterMesValido = useCallback((p?: { dataInicio: string; dataFim: string } | null) => {
    if (!p) return new Date().getMonth();
    const minM = parseInt(p.dataInicio.split('-')[1], 10) - 1;
    const maxM = parseInt(p.dataFim.split('-')[1], 10) - 1;
    const actualMonth = new Date().getMonth();
    return (actualMonth >= minM && actualMonth <= maxM) ? actualMonth : minM;
  }, []);

  const [periodoSelecionadoId, setPeriodoSelecionadoId] = useState<string>(() => {
    const inicial = obterPeriodoAberto(periodosVisiveis);
    return inicial?.id || '1. BIMESTRE';
  });

  const periodoSelecionado = useMemo(() => {
    return periodosVisiveis.find(p => p.id === periodoSelecionadoId) || periodosVisiveis[periodosVisiveis.length - 1];
  }, [periodosVisiveis, periodoSelecionadoId]);

  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    return obterMesValido(periodoSelecionado);
  });

  const [usuarioAlterouManualmente, setUsuarioAlterouManualmente] = useState(false);
  const lastTurmaIdRef = useRef<string | null>(null);

  // Redefine a escolha manual se o usuário alternar para outra turma
  useEffect(() => {
    const currentTurmaId = turmaAtiva ? String(turmaAtiva.id) : null;
    if (currentTurmaId !== lastTurmaIdRef.current) {
      lastTurmaIdRef.current = currentTurmaId;
      setUsuarioAlterouManualmente(false);
    }
  }, [turmaAtiva]);

  // Ao entrar na turma e carregar os fechamentos, posiciona automaticamente no período aberto
  useEffect(() => {
    if (!usuarioAlterouManualmente && turmaAtiva) {
      const periodoAberto = obterPeriodoAberto(periodosVisiveis);
      if (periodoAberto && periodoAberto.id !== periodoSelecionadoId) {
        setPeriodoSelecionadoId(periodoAberto.id);
        setCurrentMonth(obterMesValido(periodoAberto));
      }
    }
  }, [periodosVisiveis, fechamentos, usuarioAlterouManualmente, turmaAtiva, obterPeriodoAberto, obterMesValido, periodoSelecionadoId]);

  const isAparataFechada = checarFechado(periodoSelecionadoId);

  const { pFreq, pObj, pAvaliacoes, pNotas, barColor } = useTurmaProgress(
    turmaAtiva, 
    periodoSelecionado, 
    lancamentos, 
    horarioTurma, 
    avaliacoes, 
    alunos
  );

  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 relative">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 text-center max-w-md relative z-10 w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Nenhuma turma selecionada</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Por favor, volte à lista de turmas e selecione um diário para visualizar.</p>
          <Link to="/turmas" className="inline-flex flex-1 items-center justify-center gap-2 w-full px-6 py-3 bg-[#0f2851] text-white font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20">
            <ArrowLeft className="w-5 h-5" />
            Voltar para Turmas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090e17] relative">
      <div className="relative z-10 max-w-[1500px] mx-auto px-4 py-5 sm:px-8 space-y-5">
        {/* Compact Workspace Breadcrumb & Period Selector */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Link 
              to="/turmas" 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> 
              <span>Turmas</span>
            </Link>

            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-[#0b1f3f] dark:text-sky-300 tracking-tight">
                {turmaAtiva.fase}
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-sky-300 font-bold text-xs rounded-lg border border-blue-100 dark:border-blue-900">
                {turmaAtiva.componente}
              </span>
              <span className="text-slate-400 dark:text-slate-600 text-xs hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                {turmaAtiva.ensino}
              </span>
            </div>
          </div>

          {/* Period Selector (Bimestre) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="periodo-select" className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                Bimestre:
              </label>
              <select 
                id="periodo-select"
                value={periodoSelecionadoId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setUsuarioAlterouManualmente(true);
                  setPeriodoSelecionadoId(newId);
                  const selectedPeriod = periodosVisiveis.find(p => p.id === newId);
                  if (selectedPeriod) {
                    setCurrentMonth(obterMesValido(selectedPeriod));
                  }
                }}
                className="border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold bg-slate-50 dark:bg-slate-800 text-[#0b1f3f] dark:text-sky-300 px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#0b1f3f]/15 cursor-pointer shadow-xs"
              >
                {periodosVisiveis.map(p => {
                  const format = (d: string) => d.split('-').reverse().join('/');
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({format(p.dataInicio)} - {format(p.dataFim)})
                    </option>
                  );
                })}
              </select>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              isAparataFechada 
                ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900' 
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
            }`}>
              {isAparataFechada ? 'Aparata Fechada' : 'Bimestre Aberto'}
            </span>
          </div>
        </div>

        {/* Compact Metadata Strip */}
        <TurmaHeaderInfo turmaAtiva={turmaAtiva} />

        {/* Workspace Columns: Hero Calendar & Continuity Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Calendar Section (Hero Workspace) */}
          <div className="lg:col-span-8 space-y-4">
            {isAparataFechada ? (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-6 rounded-2xl text-red-900 dark:text-red-200 space-y-3">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                  Lançamentos Bloqueados — Aparata Fechada
                </h3>
                <p className="text-xs text-red-700 dark:text-red-300">
                  O período selecionado ({periodoSelecionado?.nome}) foi encerrado na escola. Para realizar ou alterar lançamentos neste bimestre, solicite a reabertura de aparata à coordenação ou gestão escolar.
                </p>
                <div className="pt-2 flex gap-3">
                  <Link 
                    to="/aparata" 
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <Folder className="w-3.5 h-3.5" />
                    <span>Consultar Aparatas</span>
                  </Link>
                  <Link 
                    to="/relatorio-notas" 
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    <span>Ver Relatório de Notas</span>
                  </Link>
                </div>
              </div>
            ) : (
              <CalendarWidget
                year={year}
                currentMonth={currentMonth}
                onMonthChange={setCurrentMonth}
                turmaAtiva={turmaAtiva}
                lancamentos={lancamentos}
                avaliacoes={avaliacoes}
                alunos={alunos}
                horarioTurma={horarioTurma}
                minMonth={periodoSelecionado ? parseInt(periodoSelecionado.dataInicio.split('-')[1], 10) - 1 : 1}
                maxMonth={periodoSelecionado ? parseInt(periodoSelecionado.dataFim.split('-')[1], 10) - 1 : 11}
                periodoStart={periodoSelecionado?.dataInicio}
                periodoEnd={periodoSelecionado?.dataFim}
              />
            )}
          </div>

          {/* Continuity & Records Panel */}
          <div className="lg:col-span-4 space-y-4">
            {/* Academic Continuity Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Continuidade Pedagógica
                </h4>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">
                  {periodoSelecionado?.nome}
                </span>
              </div>
              
              <div className="space-y-3.5">
                {/* Frequência */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Frequência das aulas</span> 
                    <span className="tabular-nums font-black">{pFreq}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pFreq)} transition-all duration-700`} style={{ width: `${pFreq}%` }}></div>
                  </div>
                </div>

                {/* Conteúdos */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Conteúdos ministrados</span> 
                    <span className="tabular-nums font-black">{pObj}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pObj)} transition-all duration-700`} style={{ width: `${pObj}%` }}></div>
                  </div>
                </div>

                {/* Avaliações */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Avaliações planejadas</span> 
                    <span className="tabular-nums font-black">{pAvaliacoes}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pAvaliacoes)} transition-all duration-700`} style={{ width: `${pAvaliacoes}%` }}></div>
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
                    <span>Notas registradas</span> 
                    <span className="tabular-nums font-black">{pNotas}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pNotas)} transition-all duration-700`} style={{ width: `${pNotas}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Aparata Card */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-600 dark:text-sky-400" />
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    Aparata & Registros
                  </h4>
                </div>
                <Link 
                  to="/aparata" 
                  className="text-xs font-bold text-blue-700 hover:text-blue-900 dark:text-sky-400 hover:underline"
                >
                  Abrir aparata →
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Situação do período:</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] text-white ${isAparataFechada ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {isAparataFechada ? 'FECHADO' : 'ABERTO'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Sincronização em nuvem:</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Ativa
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
