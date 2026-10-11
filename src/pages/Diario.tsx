import { PageHeading, Metric } from '../components/common/PortalUI';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, Folder, ChevronDown, ChevronUp, GraduationCap, Building2, Clock as ClockIcon, ArrowRight, Check, AlertTriangle, Circle, Calendar, Info } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { useOffline } from '../contexts/OfflineContext';
import { APP_CONFIG } from '../config/appConfig';
import CalendarWidget from '../components/common/CalendarWidget';
import type { DayDetails } from '../components/common/CalendarWidget';
import { useTurmaProgress } from '../hooks/useTurmaProgress';
import { carregarFeriados, mapaFeriados } from '../services/feriados';

export default function Diario() {
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date');

  const { turmaAtiva, lancamentos, avaliacoes, alunos, horarioTurma, fechamentos, verificarPeriodoFechado, loading } = useTurma();
  const { isOnline, connectionState, pendingCount } = useOffline();
  const year = APP_CONFIG.YEAR;
  const [feriados, setFeriados] = useState<Record<string, string>>(() => mapaFeriados());

  useEffect(() => {
    let ativo = true;
    carregarFeriados(year).then(() => {
      if (ativo) setFeriados(mapaFeriados());
    });
    return () => { ativo = false; };
  }, [year]);

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

  const obterPeriodoPorData = useCallback((dataStr: string, visiveis: typeof periodosLetivos) => {
    const [ano, mes, dia] = dataStr.split('-').map(Number);
    const data = new Date(ano, mes - 1, dia, 12, 0, 0);
    return visiveis.find(p => {
      const [sY, sM, sD] = p.dataInicio.split('-').map(Number);
      const [eY, eM, eD] = p.dataFim.split('-').map(Number);
      const start = new Date(sY, sM - 1, sD, 0, 0, 0);
      const end = new Date(eY, eM - 1, eD, 23, 59, 59);
      return data >= start && data <= end;
    }) || null;
  }, []);

  const obterMesValido = useCallback((p?: { dataInicio: string; dataFim: string } | null) => {
    if (!p) return new Date().getMonth();
    const minM = parseInt(p.dataInicio.split('-')[1], 10) - 1;
    const maxM = parseInt(p.dataFim.split('-')[1], 10) - 1;
    const actualMonth = new Date().getMonth();
    return (actualMonth >= minM && actualMonth <= maxM) ? actualMonth : minM;
  }, []);

  // Último preenchimento da turma ativa (frequência ou conteúdo)
  const activeTurmaId = turmaAtiva ? String(turmaAtiva.id).split('||')[0] : '';
  const lancamentosTurma = useMemo(() => {
    return lancamentos.filter(l => 
      String(l.turmaId).split('||')[0] === activeTurmaId && 
      (l.tipo === 'frequencia' || l.tipo === 'conteudo') &&
      /^\d{4}-\d{2}-\d{2}$/.test(l.data)
    );
  }, [lancamentos, activeTurmaId]);

  const ultimaDataLancada = useMemo(() => {
    if (lancamentosTurma.length === 0) return null;
    const datas = [...new Set(lancamentosTurma.map(l => l.data))].sort();
    return datas[datas.length - 1];
  }, [lancamentosTurma]);

  // Data alvo inicial (da URL se presente)
  const initialTargetDate = (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) ? dateParam : null;
  const initialPeriod = initialTargetDate 
    ? (obterPeriodoPorData(initialTargetDate, periodosVisiveis) || obterPeriodoAberto(periodosVisiveis))
    : obterPeriodoAberto(periodosVisiveis);

  const [periodoSelecionadoId, setPeriodoSelecionadoId] = useState<string>(() => {
    return initialPeriod?.id || '1. BIMESTRE';
  });

  const periodoSelecionado = useMemo(() => {
    return periodosVisiveis.find(p => p.id === periodoSelecionadoId) || periodosVisiveis[periodosVisiveis.length - 1];
  }, [periodosVisiveis, periodoSelecionadoId]);

  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    if (initialTargetDate) {
      const [, m] = initialTargetDate.split('-').map(Number);
      return m - 1;
    }
    return obterMesValido(periodoSelecionado);
  });

  // Selected day state
  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    if (initialTargetDate) {
      const [, , d] = initialTargetDate.split('-').map(Number);
      return d;
    }
    return null;
  });
  const [selectedDayDetails, setSelectedDayDetails] = useState<DayDetails | null>(null);
  const [showTurmaInfo, setShowTurmaInfo] = useState(false);

  const [usuarioAlterouManualmente, setUsuarioAlterouManualmente] = useState(false);
  const lastTurmaIdRef = useRef<string | null>(null);
  const autoPositionedDateRef = useRef<string | null>(initialTargetDate);

  useEffect(() => {
    const currentTurmaId = turmaAtiva ? String(turmaAtiva.id) : null;
    if (currentTurmaId !== lastTurmaIdRef.current) {
      lastTurmaIdRef.current = currentTurmaId;
      setUsuarioAlterouManualmente(false);
      autoPositionedDateRef.current = null;
    }
  }, [turmaAtiva]);

  // Posicionamento inteligente no mês e dia do preenchimento
  useEffect(() => {
    if (usuarioAlterouManualmente || !turmaAtiva) return;

    // 1. Data explícita na URL (dateParam)
    // 2. Última data com lançamento (frequência ou conteúdo) da turma
    const targetDate = (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam))
      ? dateParam
      : ultimaDataLancada;

    if (!targetDate) {
      const periodoAberto = obterPeriodoAberto(periodosVisiveis);
      if (periodoAberto && periodoAberto.id !== periodoSelecionadoId) {
        setPeriodoSelecionadoId(periodoAberto.id);
        setCurrentMonth(obterMesValido(periodoAberto));
      }
      return;
    }

    if (autoPositionedDateRef.current === targetDate) return;

    const [, m, d] = targetDate.split('-').map(Number);
    const targetMonth = m - 1;
    const targetDay = d;

    const periodoTarget = obterPeriodoPorData(targetDate, periodosVisiveis);
    if (periodoTarget && periodoTarget.id !== periodoSelecionadoId) {
      setPeriodoSelecionadoId(periodoTarget.id);
    }
    setCurrentMonth(targetMonth);
    setSelectedDay(targetDay);
    autoPositionedDateRef.current = targetDate;
  }, [
    dateParam,
    ultimaDataLancada,
    turmaAtiva,
    usuarioAlterouManualmente,
    periodosVisiveis,
    periodoSelecionadoId,
    obterPeriodoPorData,
    obterPeriodoAberto,
    obterMesValido
  ]);

  const isAparataFechada = checarFechado(periodoSelecionadoId);

  const { pFreq, pObj, pAvaliacoes, pNotas, freqLancadas, conteudoLancados, totalEsperado } = useTurmaProgress(
    turmaAtiva, 
    periodoSelecionado, 
    lancamentos, 
    horarioTurma, 
    avaliacoes, 
    alunos,
    feriados
  );

  const handleDaySelect = useCallback((day: number | null, details: DayDetails | null) => {
    setSelectedDay(day);
    setSelectedDayDetails(details);
  }, []);

  // Reset selection when period changes only if selected day is outside the new period
  useEffect(() => {
    if (selectedDay !== null && periodoSelecionado) {
      const [sY, sM, sD] = periodoSelecionado.dataInicio.split('-').map(Number);
      const [eY, eM, eD] = periodoSelecionado.dataFim.split('-').map(Number);
      const pStart = new Date(sY, sM - 1, sD, 0, 0, 0);
      const end = new Date(eY, eM - 1, eD, 23, 59, 59);
      const d = new Date(year, currentMonth, selectedDay, 12, 0, 0);
      if (d < pStart || d > end) {
        setSelectedDay(null);
        setSelectedDayDetails(null);
      }
    }
  }, [periodoSelecionadoId, periodoSelecionado, currentMonth, selectedDay, year]);

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
          <p className="text-[var(--dd-ink-muted)] mb-6">Escolha a turma e o componente na lista. Depois de escolher, você abre o diário direto.</p>
          <Link to="/turmas" className="inline-flex flex-1 items-center justify-center gap-2 w-full px-6 py-3 bg-[var(--dd-primary)] text-white font-bold rounded-xl hover:opacity-90 transition shadow-lg">
            <ArrowLeft className="w-5 h-5" />
            Escolher turma
          </Link>
        </div>
      </div>
    );
  }

  return <div className="portal-page portal-diary">
    <PageHeading eyebrow="ENSINAR · REGISTRAR · ACOMPANHAR" title="Diário de classe" description="Uma visão clara do seu planejamento e dos registros do bimestre." actions={<><Link to="/turmas" className="portal-button secondary"><ArrowLeft size={16}/>Turmas</Link><label className="portal-period-select"><span>PERÍODO LETIVO</span><select id="periodo-select" aria-label="Selecionar bimestre" value={periodoSelecionadoId} onChange={e=>{const id=e.target.value;setUsuarioAlterouManualmente(true);setPeriodoSelecionadoId(id);const p=periodosVisiveis.find(p=>p.id===id);if(p)setCurrentMonth(obterMesValido(p));}}>{periodosVisiveis.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select></label></>}/>
    <div className="portal-diary-context"><div><span className="portal-subject-mark"><BookOpen size={23}/></span><div><h2>{turmaAtiva.fase} <span>· {turmaAtiva.componente}</span></h2><p>{turmaAtiva.escola} · {turmaAtiva.turno}</p></div></div><button className="portal-text-button" onClick={()=>setShowTurmaInfo(!showTurmaInfo)} aria-expanded={showTurmaInfo}><Info size={16}/> Detalhes {showTurmaInfo?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button></div>
    {showTurmaInfo&&<div className="portal-context-details"><span><GraduationCap size={16}/>{turmaAtiva.professor}</span><span><Building2 size={16}/>{turmaAtiva.ensino}</span><span>{formatPeriodDate(periodoSelecionado.dataInicio)} — {formatPeriodDate(periodoSelecionado.dataFim)}</span></div>}
    <section className="portal-metrics" aria-label="Resumo do bimestre"><Metric label="Frequência registrada" value={loading?'…':totalEsperado?`${pFreq}%`:'—'} detail={`${freqLancadas} de ${totalEsperado} registros previstos`} tone="violet"/><Metric label="Conteúdos registrados" value={loading?'…':totalEsperado?`${pObj}%`:'—'} detail={`${conteudoLancados} de ${totalEsperado} registros previstos`} tone="mint"/><Metric label="Avaliações planejadas" value={loading?'…':`${pAvaliacoes}%`} detail="Planejamento do bimestre" tone="apricot"/><Metric label="Notas lançadas" value={loading?'…':`${pNotas}%`} detail="Acompanhamento das avaliações" tone="sky"/></section>
    <section className="portal-diary-priorities" aria-label="Acompanhamento dos registros"><div><span className="portal-priority-icon"><BookOpen size={22}/></span><div><strong>{isAparataFechada?'Período encerrado':loading?'Carregando registros…':totalEsperado===0?'Nenhum registro previsto':Math.max(0,totalEsperado-freqLancadas)+Math.max(0,totalEsperado-conteudoLancados)===0?'Frequência e conteúdo em dia':'Vamos completar os registros?'}</strong><p>{periodoSelecionado.nome} · {alunos.length} estudantes na turma</p></div></div><div className="portal-priority-counts"><span><b>{loading?'…':Math.max(0,totalEsperado-freqLancadas)}</b> frequências a registrar</span><span><b>{loading?'…':Math.max(0,totalEsperado-conteudoLancados)}</b> conteúdos a registrar</span></div><a href="#calendario-do-diario" className="portal-button secondary">Consultar aulas <ArrowRight size={16}/></a></section>
    <div className="portal-diary-grid"><div className="portal-diary-calendar" id="calendario-do-diario">
      {isAparataFechada?<div className="portal-locked"><Folder size={34}/><h2>Bimestre encerrado</h2><p>Os lançamentos de {periodoSelecionado.nome} estão bloqueados. Solicite a reabertura à gestão para editar.</p><Link className="portal-button" to="/aparata">Consultar aparatas <ArrowRight size={16}/></Link></div>:<CalendarWidget year={year} currentMonth={currentMonth} onMonthChange={m=>{setUsuarioAlterouManualmente(true);setCurrentMonth(m);}} turmaAtiva={turmaAtiva} lancamentos={lancamentos} avaliacoes={avaliacoes} alunos={alunos} horarioTurma={horarioTurma} minMonth={parseInt(periodoSelecionado.dataInicio.split('-')[1],10)-1} maxMonth={parseInt(periodoSelecionado.dataFim.split('-')[1],10)-1} periodoStart={periodoSelecionado.dataInicio} periodoEnd={periodoSelecionado.dataFim} feriados={feriados} selectedDay={selectedDay} onDaySelect={handleDaySelect}/>}
      {loading&&<p className="portal-loading" role="status">Atualizando as aulas do período…</p>}
    </div><aside className="portal-day-aside"><div className="portal-day-panel"><span className="portal-eyebrow">UM DIA DE CADA VEZ</span><h2>A aula em foco</h2>{selectedDay && selectedDayDetails?<><div className="portal-focus-date"><strong>{selectedDay}</strong><div><b>{weekDaysFull[selectedDayDetails.dayOfWeek]}</b><span>{monthNames[currentMonth]} de {year}</span></div></div>{selectedDayDetails.feriadoNome?<p className="portal-note">Feriado: {selectedDayDetails.feriadoNome}. Não há aula neste dia.</p>:selectedDayDetails.isDiaDeAula?<><p className="portal-day-times"><ClockIcon size={15}/>{selectedDayDetails.temposValidos.join(' · ')}</p><StatusRow label="Frequência" done={selectedDayDetails.isFrequenciaFull} partial={selectedDayDetails.isFrequenciaPartial}/><StatusRow label="Conteúdo" done={selectedDayDetails.isConteudoFull} partial={selectedDayDetails.isConteudoPartial}/>{selectedDayDetails.temAvaliacao&&<StatusRow label="Avaliação" done={selectedDayDetails.avaliacoesLancadas} partial={false}/ >}{selectedDayDetails.temRecuperacao&&<StatusRow label="Recuperação" done={selectedDayDetails.recuperacoesLancadas} partial={false}/ >}{!isAparataFechada&&<Link className="portal-button portal-full" to={`/frequencia?date=${selectedDayDetails.dayStr}&turmaId=${turmaAtiva.id}`}>{selectedDayDetails.status==='full'?'Revisar aula':'Registrar aula'}<ArrowRight size={17}/></Link>}</>:<p className="portal-note">Não há aula disponível para lançamento nesta data.</p>}</>:<div className="portal-focus-empty"><Calendar size={36}/><p>Seu próximo registro<br/>começa no calendário.</p><small>Selecione uma data para acompanhar ou registrar uma aula.</small></div>}</div>
      <div className="portal-period-card"><span className="portal-eyebrow">FECHAMENTO DO BIMESTRE</span><h3>{periodoSelecionado.nome}</h3><div><span className={'portal-status '+(isAparataFechada?'closed':'open')}>{isAparataFechada?'Aparata Fechada':'Aberto'}</span><span className={syncLabel.color}>{syncLabel.text}</span></div><Link to="/aparata">Acessar aparata <ArrowRight size={16}/></Link></div>
      <div className="portal-related-links"><span className="portal-eyebrow">OLHE MAIS DE PERTO</span><Link to="/relatorio-frequencia">Relatório de frequência <ArrowRight size={16}/></Link><Link to="/relatorio-notas">Notas da turma <ArrowRight size={16}/></Link></div>
    </aside></div>
  </div>;
}

function StatusRow({label,done,partial}:{label:string;done:boolean;partial:boolean}) { return <div className="portal-check-row"><span>{done?<Check size={17}/>:partial?<AlertTriangle size={17}/>:<Circle size={17}/>} {label}</span><small className={done?'is-complete':''}>{done?'Concluído':partial?'Parcial':'Pendente'}</small></div>; }
