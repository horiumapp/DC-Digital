import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, Folder, ChevronDown, ChevronUp, GraduationCap, Building2, Clock as ClockIcon, ArrowRight, Check, AlertTriangle, Circle, Calendar, Info } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useTurma } from '../contexts/TurmaContext';
import { useOffline } from '../contexts/OfflineContext';
import { APP_CONFIG } from '../config/appConfig';
import CalendarWidget from '../components/common/CalendarWidget';
import type { DayDetails } from '../components/common/CalendarWidget';
import { useTurmaProgress } from '../hooks/useTurmaProgress';

export default function Diario() {
  const navigate = useNavigate();
  const { turmaAtiva, lancamentos, avaliacoes, alunos, horarioTurma, fechamentos, verificarPeriodoFechado } = useTurma();
  const { isOnline, connectionState, pendingCount } = useOffline();
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

      if (dataInicio > hoje) break;

      if (i > 0) {
        const bimestreAnterior = periodosLetivos[i - 1];
        const isAnteriorFechado = checarFechado(bimestreAnterior.id);
        if (!isAnteriorFechado) break;
      }

      resultado.push(p);
    }

    return resultado.length > 0 ? resultado : [periodosLetivos[0]];
  }, [periodosLetivos, checarFechado]);

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

  useEffect(() => {
    const currentTurmaId = turmaAtiva ? String(turmaAtiva.id) : null;
    if (currentTurmaId !== lastTurmaIdRef.current) {
      lastTurmaIdRef.current = currentTurmaId;
      setUsuarioAlterouManualmente(false);
    }
  }, [turmaAtiva]);

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

  const { pFreq, pObj, pAvaliacoes, pNotas, freqLancadas, conteudoLancados, totalEsperado, barColor } = useTurmaProgress(
    turmaAtiva, 
    periodoSelecionado, 
    lancamentos, 
    horarioTurma, 
    avaliacoes, 
    alunos
  );

  // Selected day state
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedDayDetails, setSelectedDayDetails] = useState<DayDetails | null>(null);
  const [showTurmaInfo, setShowTurmaInfo] = useState(false);

  const handleDaySelect = useCallback((day: number | null, details: DayDetails | null) => {
    setSelectedDay(day);
    setSelectedDayDetails(details);
  }, []);

  // Reset selection when period changes
  useEffect(() => {
    setSelectedDay(null);
    setSelectedDayDetails(null);
  }, [periodoSelecionadoId]);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const weekDaysFull = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  const formatPeriodDate = (d: string) => d.split('-').reverse().join('/');

  // Sync state label
  const syncLabel = useMemo(() => {
    if (!isOnline) return { text: 'Offline', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' };
    if (connectionState === 'SYNCING') return { text: 'Sincronizando...', color: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500 animate-pulse' };
    if (pendingCount > 0) return { text: `${pendingCount} pendente${pendingCount > 1 ? 's' : ''}`, color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' };
    return { text: 'Sincronizado', color: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' };
  }, [isOnline, connectionState, pendingCount]);

  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-[var(--dd-canvas)] flex items-center justify-center p-6">
        <div className="bg-[var(--dd-surface)] p-8 rounded-2xl shadow-lg border border-[var(--dd-border)] text-center max-w-md w-full">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[var(--dd-ink)] mb-2">Nenhuma turma selecionada</h2>
          <p className="text-[var(--dd-ink-muted)] mb-6">Por favor, volte à lista de turmas e selecione um diário para visualizar.</p>
          <Link to="/turmas" className="inline-flex flex-1 items-center justify-center gap-2 w-full px-6 py-3 bg-[var(--dd-primary)] text-white font-bold rounded-xl hover:opacity-90 transition shadow-lg">
            <ArrowLeft className="w-5 h-5" />
            Voltar para Turmas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dd-canvas)]">
      <div className="max-w-[1500px] mx-auto px-4 py-5 sm:px-6 lg:px-8 space-y-5">
        
        {/* ═══ CONTEXTUAL HEADER ═══ */}
        <div className="bg-[var(--dd-surface)] border border-[var(--dd-border)] rounded-2xl shadow-xs">
          {/* Main header row */}
          <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left: Back + Title + Context */}
            <div className="flex flex-wrap items-center gap-3">
              <Link 
                to="/turmas" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--dd-surface-subtle)] hover:bg-[var(--dd-border)] text-[var(--dd-ink-muted)] text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 
                <span>Turmas</span>
              </Link>

              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-[var(--dd-ink)] tracking-tight">
                  Diário de Classe
                </h1>
                <span className="text-base sm:text-lg font-bold text-[var(--dd-primary)]">
                  {turmaAtiva.fase} · {turmaAtiva.componente}
                </span>
              </div>
            </div>

            {/* Right: Period selector + Status */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
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
                  className="border border-[var(--dd-border)] rounded-xl text-sm font-bold bg-[var(--dd-surface)] text-[var(--dd-ink)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--dd-focus)]/30 cursor-pointer shadow-xs"
                  aria-label="Selecionar bimestre"
                >
                  {periodosVisiveis.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>

              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                isAparataFechada 
                  ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200 dark:border-red-900' 
                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
              }`}>
                {isAparataFechada ? 'Aparata Fechada' : 'Bimestre Aberto'}
              </span>
            </div>
          </div>

          {/* Period date range + Expandable turma info */}
          <div className="px-4 sm:px-5 pb-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--dd-border)] pt-3">
            <span className="text-xs text-[var(--dd-ink-muted)] font-medium">
              {formatPeriodDate(periodoSelecionado.dataInicio)} — {formatPeriodDate(periodoSelecionado.dataFim)}
              <span className="mx-2 text-[var(--dd-border-strong)]">•</span>
              {turmaAtiva.ensino}
            </span>
            
            <button
              type="button"
              onClick={() => setShowTurmaInfo(!showTurmaInfo)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--dd-ink-muted)] hover:text-[var(--dd-ink)] transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              Informações da turma
              {showTurmaInfo ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expandable turma details */}
          <AnimatePresence>
            {showTurmaInfo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 sm:px-5 pb-4 pt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[var(--dd-ink-muted)] border-t border-dashed border-[var(--dd-border)]">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />
                    <strong className="text-[var(--dd-ink)] font-semibold">{turmaAtiva.professor}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <strong className="text-[var(--dd-ink)] font-semibold">{turmaAtiva.escola}</strong>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <ClockIcon className="w-3.5 h-3.5" />
                    <strong className="text-[var(--dd-ink)] font-semibold uppercase">{turmaAtiva.turno}</strong>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══ WORKSPACE: CALENDAR + SIDE PANEL ═══ */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
          
          {/* Calendar Section */}
          <div className="space-y-4 min-w-0">
            {isAparataFechada ? (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-6 rounded-2xl text-red-900 dark:text-red-200 space-y-3">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
                  Lançamentos Bloqueados — Aparata Fechada
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  O período selecionado ({periodoSelecionado?.nome}) foi encerrado na escola. Para realizar ou alterar lançamentos neste bimestre, solicite a reabertura de aparata à coordenação ou gestão escolar.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link 
                    to="/aparata" 
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold transition-all shadow-xs"
                  >
                    <Folder className="w-4 h-4" />
                    <span>Consultar Aparatas</span>
                  </Link>
                  <Link 
                    to="/relatorio-notas" 
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-sm font-bold transition-all shadow-xs"
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
                selectedDay={selectedDay}
                onDaySelect={handleDaySelect}
              />
            )}
          </div>

          {/* ═══ SIDE PANEL ═══ */}
          <div className="space-y-4 lg:sticky lg:top-20">
            
            {/* Day Details Panel */}
            <div className="bg-[var(--dd-surface)] rounded-2xl border border-[var(--dd-border)] shadow-xs overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--dd-border)] bg-[var(--dd-surface-subtle)]">
                <h4 className="text-xs font-black text-[var(--dd-ink)] uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[var(--dd-primary)]" />
                  Aulas do Dia
                </h4>
              </div>

              <div className="p-4">
                <AnimatePresence mode="wait">
                  {selectedDay && selectedDayDetails ? (
                    <motion.div
                      key={`day-${selectedDay}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="space-y-4"
                      onDoubleClick={() => {
                        if (selectedDayDetails.isDiaDeAula && !isAparataFechada) {
                          navigate(`/frequencia?date=${selectedDayDetails.dayStr}&turmaId=${turmaAtiva.id}`);
                        }
                      }}
                      title={selectedDayDetails.isDiaDeAula && !isAparataFechada ? "Clique duas vezes para abrir Frequência e notas" : undefined}
                    >
                      {/* Date display */}
                      <div className="flex items-center gap-3">
                        <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          selectedDayDetails.isToday 
                            ? 'bg-[var(--dd-primary)] text-white' 
                            : 'bg-[var(--dd-surface-subtle)] border border-[var(--dd-border)] text-[var(--dd-ink)]'
                        }`}>
                          <span className="text-xl font-black leading-none">{selectedDay}</span>
                          <span className={`text-[10px] font-bold uppercase mt-0.5 ${selectedDayDetails.isToday ? 'text-white/70' : 'text-[var(--dd-ink-muted)]'}`}>
                            {monthNames[currentMonth].slice(0, 3)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--dd-ink)]">
                            {weekDaysFull[selectedDayDetails.dayOfWeek]}
                          </p>
                          <p className="text-xs text-[var(--dd-ink-muted)]">
                            {selectedDay} de {monthNames[currentMonth]} de {year}
                          </p>
                          {selectedDayDetails.isToday && (
                            <span className="text-[10px] font-bold text-[var(--dd-primary)] uppercase">Hoje</span>
                          )}
                        </div>
                      </div>

                      {selectedDayDetails.isDiaDeAula ? (
                        <>
                          {/* Times */}
                          {selectedDayDetails.temposValidos.length > 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-[var(--dd-ink-muted)]">
                              <ClockIcon className="w-3.5 h-3.5" />
                              <span className="font-semibold">{selectedDayDetails.temposValidos.join(', ')}</span>
                            </div>
                          )}

                          {/* Status details */}
                          <div className="space-y-2 py-2">
                            <StatusRow 
                              label="Frequência" 
                              done={selectedDayDetails.isFrequenciaFull} 
                              partial={selectedDayDetails.isFrequenciaPartial}
                            />
                            <StatusRow 
                              label="Conteúdo ministrado" 
                              done={selectedDayDetails.isConteudoFull} 
                              partial={selectedDayDetails.isConteudoPartial}
                            />
                            {selectedDayDetails.temAvaliacao && (
                              <StatusRow 
                                label={selectedDayDetails.avaliacoesDoDia.some(av => av.tipo?.startsWith('RP')) ? 'Recuperação Paralela' : 'Avaliação'} 
                                done={selectedDayDetails.avaliacoesLancadas} 
                                partial={false}
                              />
                            )}
                          </div>

                          {/* Primary action */}
                          {!isAparataFechada && (
                            <Link
                              to={`/frequencia?date=${selectedDayDetails.dayStr}&turmaId=${turmaAtiva.id}`}
                              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[var(--dd-primary)] text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-xs text-sm"
                            >
                              {selectedDayDetails.status === 'full' ? 'Revisar registro' : selectedDayDetails.status === 'pending' ? 'Continuar registro' : 'Abrir registro'}
                              <ArrowRight className="w-4 h-4" />
                            </Link>
                          )}
                        </>
                      ) : (
                        <div className="py-4 text-center">
                          <p className="text-sm text-[var(--dd-ink-muted)]">
                            {!selectedDayDetails.isWithinSelectedPeriod 
                              ? 'Esta data está fora do período selecionado.'
                              : 'Não há aula cadastrada para este dia.'
                            }
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-6 text-center"
                    >
                      <Calendar className="w-8 h-8 mx-auto text-[var(--dd-border-strong)] mb-2" />
                      <p className="text-sm text-[var(--dd-ink-muted)]">
                        Selecione um dia no calendário para ver os detalhes da aula.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* ═══ BIMESTRE SUMMARY ═══ */}
            <div className="bg-[var(--dd-surface)] rounded-2xl border border-[var(--dd-border)] shadow-xs p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-black text-[var(--dd-ink)] uppercase tracking-wider">
                  Resumo do Bimestre
                </h4>
                <span className="text-[11px] font-bold text-[var(--dd-ink-muted)]">
                  {periodoSelecionado?.nome}
                </span>
              </div>
              
              <div className="space-y-3">
                <SummaryIndicator 
                  label="Frequência das aulas" 
                  pct={pFreq} 
                  count={freqLancadas} 
                  total={totalEsperado} 
                  barColor={barColor(pFreq)} 
                />
                <SummaryIndicator 
                  label="Conteúdos ministrados" 
                  pct={pObj} 
                  count={conteudoLancados} 
                  total={totalEsperado} 
                  barColor={barColor(pObj)} 
                />
                <SummaryIndicator 
                  label="Avaliações planejadas" 
                  pct={pAvaliacoes} 
                  barColor={barColor(pAvaliacoes)} 
                />
                <SummaryIndicator 
                  label="Notas registradas" 
                  pct={pNotas} 
                  barColor={barColor(pNotas)} 
                />
              </div>
            </div>

            {/* ═══ APARATA & SYNC ═══ */}
            <div className="bg-[var(--dd-surface)] rounded-2xl border border-[var(--dd-border)] shadow-xs p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-[var(--dd-primary)]" />
                  <h4 className="text-xs font-black text-[var(--dd-ink)] uppercase tracking-wider">
                    Aparata
                  </h4>
                </div>
                <Link 
                  to="/aparata" 
                  className="text-xs font-bold text-[var(--dd-primary)] hover:underline"
                >
                  Abrir aparata →
                </Link>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-[var(--dd-ink-muted)]">
                  <span className="font-semibold">Situação do período:</span>
                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] text-white ${isAparataFechada ? 'bg-red-600' : 'bg-emerald-600'}`}>
                    {isAparataFechada ? 'FECHADO' : 'ABERTO'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[var(--dd-ink-muted)]">
                  <span className="font-semibold">Sincronização:</span>
                  <span className={`${syncLabel.color} font-bold text-[11px] flex items-center gap-1`}>
                    <span className={`w-2 h-2 rounded-full ${syncLabel.dot}`}></span>
                    {syncLabel.text}
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

// ── Helper Components ──

function StatusRow({ label, done, partial }: { label: string; done: boolean; partial: boolean }) {
  const icon = done 
    ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> 
    : partial 
    ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> 
    : <Circle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
  
  const statusText = done ? 'Concluído' : partial ? 'Parcial' : 'Pendente';
  const statusColor = done 
    ? 'text-emerald-700 dark:text-emerald-400' 
    : partial 
    ? 'text-amber-700 dark:text-amber-400' 
    : 'text-[var(--dd-ink-muted)]';

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-dashed border-[var(--dd-border)] last:border-0">
      <span className="text-sm font-medium text-[var(--dd-ink)]">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${statusColor}`}>
        {icon}
        {statusText}
      </span>
    </div>
  );
}

function SummaryIndicator({ label, pct, count, total, barColor }: { label: string; pct: number; count?: number; total?: number; barColor: string }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold text-[var(--dd-ink-muted)] mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-[var(--dd-ink)] font-black">
          {pct}%
          {count !== undefined && total !== undefined && (
            <span className="font-semibold text-[var(--dd-ink-muted)] ml-1">
              ({count}/{total})
            </span>
          )}
        </span>
      </div>
      <div className="w-full h-1.5 bg-[var(--dd-surface-subtle)] rounded-full overflow-hidden">
        <div className={`h-full ${barColor} transition-all duration-700 rounded-full`} style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}
