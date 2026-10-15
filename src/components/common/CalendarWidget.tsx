import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { APP_CONFIG } from '../../config/appConfig';
import { formatarDataParaISO } from '../../utils/dateUtils';

interface CalendarLancamento {
  data: string;
  turmaId: string | number;
  tipo: string;
  tempo: string;
}

interface CalendarAvaliacao {
  id: string | number;
  data: string;
  turmaId: string | number;
  tipo?: string;
}

interface CalendarAluno {
  notas?: Record<string | number, number | string | null>;
}

interface CalendarHorario {
  dia_semana: number | string;
  tempo_ordem: number | string;
  componente?: string;
}

export interface DayDetails {
  dayStr: string;
  dayOfWeek: number;
  isDiaDeAula: boolean;
  temposValidos: string[];
  status: 'none' | 'pending' | 'partial' | 'full';
  isFrequenciaFull: boolean;
  isFrequenciaPartial: boolean;
  isConteudoFull: boolean;
  isConteudoPartial: boolean;
  temAvaliacao: boolean;
  avaliacoesDoDia: CalendarAvaliacao[];
  avaliacoesLancadas: boolean;
  temRecuperacao: boolean;
  recuperacoesLancadas: boolean;
  isWithinSelectedPeriod: boolean;
  isPastOrToday: boolean;
  isToday: boolean;
  feriadoNome: string | null;
}

interface CalendarWidgetProps {
  year: number;
  currentMonth: number;
  onMonthChange: (month: number) => void;
  turmaAtiva: { id: string | number; nome?: string } | null;
  lancamentos: CalendarLancamento[];
  avaliacoes: CalendarAvaliacao[];
  alunos: CalendarAluno[];
  horarioTurma?: CalendarHorario[];
  minMonth?: number;
  maxMonth?: number;
  periodoStart?: string;
  periodoEnd?: string;
  selectedDay: number | null;
  onDaySelect: (day: number | null, details: DayDetails | null) => void;
  feriados?: Record<string, string>;
}

const STORAGE_KEY = 'dd-diario-view-mode';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
] as const;

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
const WEEK_DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'] as const;

const PERIODOS_LETIVOS = APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE')).map(p => {
  const [aiY, aiM, aiD] = p.dataInicio.split('-');
  const start = new Date(Number(aiY), Number(aiM) - 1, Number(aiD));
  const [afY, afM, afD] = p.dataFim.split('-');
  const end = new Date(Number(afY), Number(afM) - 1, Number(afD));
  return { start, end };
});

function isDateWithinSchoolYear(date: Date) {
  return PERIODOS_LETIVOS.some(p => date >= p.start && date <= p.end);
}

function getStoredViewMode(): 'grid' | 'agenda' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'grid' || stored === 'agenda') return stored;
  } catch { /* ignore */ }
  // Mobile default: agenda
  if (typeof window !== 'undefined' && window.innerWidth < 768) return 'agenda';
  return 'grid';
}

export default function CalendarWidget({ 
  year, 
  currentMonth,
  onMonthChange,
  turmaAtiva, 
  lancamentos,
  avaliacoes,
  alunos,
  horarioTurma,
  minMonth = 1,
  maxMonth = 11,
  periodoStart,
  periodoEnd,
  selectedDay,
  onDaySelect,
  feriados = {},
}: CalendarWidgetProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>(getStoredViewMode);
  const [filter, setFilter] = useState<'all'|'pending'|'full'|'evaluation'>('all');
  const lastEmittedRef = useRef<string | null>(null);

  const handleOpenFrequencia = useCallback((dayStr: string) => {
    const turmaParam = turmaAtiva?.id ? `&turmaId=${turmaAtiva.id}` : '';
    navigate(`/frequencia?date=${dayStr}${turmaParam}`);
  }, [navigate, turmaAtiva]);

  const handleDayClick = (e: React.MouseEvent, day: number, details: DayDetails) => {
    e.preventDefault();
    if (!details.isPastOrToday && !details.feriadoNome) return;
    onDaySelect(day, details);

    // Abre o diário diretamente no primeiro clique se for dia de aula
    if (details.isDiaDeAula) {
      handleOpenFrequencia(details.dayStr);
    }
  };

  const handleViewChange = (mode: 'grid' | 'agenda') => {
    setViewMode(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  };

  const handlePrevMonth = () => {
    if (currentMonth > minMonth) {
      onDaySelect(null, null);
      onMonthChange(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth < maxMonth) {
      onDaySelect(null, null);
      onMonthChange(currentMonth + 1);
    }
  };

  // "Hoje" button: go to today's month if within period
  const today = useMemo(() => new Date(), []);
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();
  const isTodayInPeriod = useMemo(() => {
    if (!periodoStart || !periodoEnd) return todayMonth >= minMonth && todayMonth <= maxMonth;
    const [sY, sM, sD] = periodoStart.split('-').map(Number);
    const [eY, eM, eD] = periodoEnd.split('-').map(Number);
    const pStart = new Date(sY, sM - 1, sD);
    const pEnd = new Date(eY, eM - 1, eD);
    return today >= pStart && today <= pEnd;
  }, [periodoStart, periodoEnd, today, todayMonth, minMonth, maxMonth]);

  const handleGoToday = () => {
    if (isTodayInPeriod && todayMonth >= minMonth && todayMonth <= maxMonth) {
      onMonthChange(todayMonth);
      // Auto-select today
      const details = getDayDetails(todayDay, todayMonth);
      onDaySelect(todayDay, details);
    }
  };

  const getDaysArray = () => {
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, currentMonth, 1).getDay();
    
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const calendarDays = getDaysArray();

  // Helper para verificar dia de aula
  const getDayDetails = useCallback((day: number, monthOverride?: number): DayDetails => {
    const month = monthOverride ?? currentMonth;
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    const isWithinSchoolYear = isDateWithinSchoolYear(currentDate);
    
    let isWithinSelectedPeriod = true;
    if (periodoStart && periodoEnd) {
      const [sY, sM, sD] = periodoStart.split('-').map(Number);
      const pStart = new Date(sY, sM - 1, sD);
      const [eY, eM, eD] = periodoEnd.split('-').map(Number);
      const pEnd = new Date(eY, eM - 1, eD);
      isWithinSelectedPeriod = currentDate >= pStart && currentDate <= pEnd;
    }

    const isPastOrToday = currentDate <= todayDate;
    const temAulaHoje = horarioTurma?.some(h => Number(h.dia_semana) === dayOfWeek);
    const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const feriadoNome = feriados[dayStr] || null;
    const isDiaDeAula = !!(temAulaHoje && isWithinSchoolYear && isPastOrToday && isWithinSelectedPeriod && !feriadoNome);
    const activeTurmaId = String(turmaAtiva?.id).split('||')[0];
    const lancamentosDoDia = lancamentos.filter(l => l.data === dayStr && String(l.turmaId).split('||')[0] === activeTurmaId);
    
    const temposValidos = horarioTurma?.filter(h => Number(h.dia_semana) === dayOfWeek).map(h => `${h.tempo_ordem}º TEMPO`) || [];
    const totalTempos = temposValidos.length;

    const avaliacoesDoDia = avaliacoes.filter(av => formatarDataParaISO(av.data) === dayStr && String(av.turmaId).split('||')[0] === activeTurmaId);
    const ehRecuperacao = (av: CalendarAvaliacao) => {
      const tipo = (av.tipo || '').toLowerCase();
      return tipo.startsWith('rp') || tipo.includes('recupera');
    };
    const avaliacoesPrincipais = avaliacoesDoDia.filter(av => !ehRecuperacao(av));
    const recuperacoes = avaliacoesDoDia.filter(ehRecuperacao);
    const temNotas = (av: CalendarAvaliacao) => alunos.some(a => a.notas && a.notas[av.id] != null && String(a.notas[av.id]).trim() !== '');
    const temAvaliacao = avaliacoesPrincipais.length > 0;
    const temRecuperacao = recuperacoes.length > 0;
    const avaliacoesLancadas = temAvaliacao && avaliacoesPrincipais.every(temNotas);
    const recuperacoesLancadas = temRecuperacao && recuperacoes.every(temNotas);

    const frequenciasLancadas = lancamentosDoDia.filter(l => l.tipo === 'frequencia' && temposValidos.includes(l.tempo));
    const conteudosLancados = lancamentosDoDia.filter(l => l.tipo === 'conteudo' && temposValidos.includes(l.tempo));
    
    const uniqueTemposFreq = new Set(frequenciasLancadas.map(l => l.tempo)).size;
    const uniqueTemposCont = new Set(conteudosLancados.map(l => l.tempo)).size;

    const isFrequenciaFull = totalTempos > 0 && uniqueTemposFreq === totalTempos;
    const isFrequenciaPartial = uniqueTemposFreq > 0 && uniqueTemposFreq < totalTempos;
    
    const isConteudoFull = totalTempos > 0 && uniqueTemposCont === totalTempos;
    const isConteudoPartial = uniqueTemposCont > 0 && uniqueTemposCont < totalTempos;

    let status: 'none' | 'pending' | 'partial' | 'full' = 'none';
    const hasAnyLancamento = uniqueTemposFreq > 0 || uniqueTemposCont > 0 || (temAvaliacao && avaliacoesLancadas) || (temRecuperacao && recuperacoesLancadas);
    const isAllDone = isFrequenciaFull && isConteudoFull && (!temAvaliacao || avaliacoesLancadas) && (!temRecuperacao || recuperacoesLancadas);

    if (isAllDone) {
      status = 'full';
    } else if (hasAnyLancamento) {
      status = 'partial';
    } else if (isDiaDeAula) {
      status = 'pending';
    }

    const isToday = currentDate.getTime() === todayDate.getTime();

    return {
      dayStr,
      dayOfWeek,
      isDiaDeAula,
      temposValidos,
      status,
      isFrequenciaFull,
      isFrequenciaPartial,
      isConteudoFull,
      isConteudoPartial,
      temAvaliacao,
      avaliacoesDoDia,
      avaliacoesLancadas,
      temRecuperacao,
      recuperacoesLancadas,
      isWithinSelectedPeriod,
      isPastOrToday,
      isToday,
      feriadoNome,
    };
  }, [year, currentMonth, periodoStart, periodoEnd, horarioTurma, turmaAtiva, lancamentos, avaliacoes, alunos, feriados]);

  const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();

  // Keyboard nav for grid and agenda
  const handleKeyDown = (e: React.KeyboardEvent, day: number, details: DayDetails) => {
    if (!details.isPastOrToday && !details.feriadoNome) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      onDaySelect(day, details);
      if (details.isDiaDeAula) {
        handleOpenFrequencia(details.dayStr);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      onDaySelect(day, details);
    }
  };

  // Sync selected day when month or lancamentos/details change
  useEffect(() => {
    if (selectedDay !== null) {
      const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
      if (selectedDay > daysInMonth) {
        lastEmittedRef.current = null;
        onDaySelect(null, null);
      } else {
        const details = getDayDetails(selectedDay, currentMonth);
        if (!details.isPastOrToday && !details.feriadoNome) {
          lastEmittedRef.current = null;
          onDaySelect(null, null);
          return;
        }
        const signature = `${year}-${currentMonth}-${selectedDay}-${details.status}-${details.isFrequenciaFull}-${details.isConteudoFull}-${details.avaliacoesLancadas}`;
        if (lastEmittedRef.current !== signature) {
          lastEmittedRef.current = signature;
          onDaySelect(selectedDay, details);
        }
      }
    } else {
      lastEmittedRef.current = null;
    }
  }, [selectedDay, currentMonth, year, getDayDetails, onDaySelect]);

  const statusLabel = (details: DayDetails) => details.status === 'full' ? 'Concluído' : details.status === 'partial' ? 'Em andamento' : details.isDiaDeAula ? 'A registrar' : 'Programado';
  const scheduledDays = Array.from({length:daysInMonth},(_,i)=>({day:i+1,...getDayDetails(i+1)})).filter(d=>d.isWithinSelectedPeriod && (d.feriadoNome || (d.isPastOrToday && d.temposValidos.length>0)));
  const matchesFilter = (d:DayDetails) => filter==='all' || (filter==='pending' && d.isDiaDeAula && d.status!=='full') || (filter==='full' && d.status==='full') || (filter==='evaluation' && (d.temAvaliacao || d.temRecuperacao));
  const monthPending=scheduledDays.filter(d=>d.isDiaDeAula&&d.status!=='full').length;
  const monthCompleted=scheduledDays.filter(d=>d.status==='full').length;
  const eventPills = (details:DayDetails) => <div className="portal-calendar-events">
    {details.feriadoNome ? <span className="event-holiday">{details.feriadoNome}</span> : <>
      <span className={'event-lesson status-'+details.status}><span className="event-dot"/>{details.temposValidos.length} {details.temposValidos.length===1?'aula':'aulas'}<small>{statusLabel(details)}</small></span>
      {details.isDiaDeAula && <span className="event-progress" aria-label={`Frequência: ${details.isFrequenciaFull?'Concluída':'Pendente'}. Conteúdo: ${details.isConteudoFull?'Concluído':'Pendente'}`}><i className={details.isFrequenciaFull?'done':''}/><i className={details.isConteudoFull?'done':''}/><small>Frequência · Conteúdo</small></span>}
      {details.temAvaliacao && <span className="event-evaluation" aria-label={`Avaliação: ${details.avaliacoesLancadas?'Notas lançadas':'Pendente de notas'}`}>Avaliação</span>}
      {details.temRecuperacao && <span className="event-recovery" aria-label={`Recuperação paralela: ${details.recuperacoesLancadas?'Notas lançadas':'Pendente de notas'}`}>Recuperação</span>}
    </>}
  </div>;
  return <section className="portal-calendar" aria-label="Calendário de aulas">
    <header className="portal-calendar-toolbar"><div className="portal-calendar-title"><span className="portal-eyebrow">SEU PLANEJAMENTO</span><h2>{MONTH_NAMES[currentMonth]} <span>{year}</span></h2></div><div className="portal-calendar-controls"><button className="portal-button secondary" onClick={handleGoToday} disabled={!isTodayInPeriod}>Hoje</button><div className="portal-month-arrows"><button aria-label="Mês anterior" onClick={handlePrevMonth} disabled={currentMonth<=minMonth}><ChevronLeft size={18}/></button><button aria-label="Próximo mês" onClick={handleNextMonth} disabled={currentMonth>=maxMonth}><ChevronRight size={18}/></button></div><div className="portal-segment"><button aria-pressed={viewMode==='grid'} onClick={()=>handleViewChange('grid')}><CalendarIcon size={16}/><span>Mês</span></button><button aria-pressed={viewMode==='agenda'} onClick={()=>handleViewChange('agenda')}><List size={16}/><span>Agenda</span></button></div></div></header>
    <div className="portal-calendar-summary" aria-label="Resumo do mês"><span><b>{scheduledDays.filter(d=>!d.feriadoNome).length}</b> dias com aula</span><span className="is-complete"><b>{monthCompleted}</b> concluídos</span><span><b>{monthPending}</b> a registrar</span></div>
    <div className="portal-calendar-filters" aria-label="Filtrar aulas">{([{id:'all',label:'Todas as aulas'},{id:'pending',label:'A registrar'},{id:'full',label:'Concluídas'},{id:'evaluation',label:'Avaliações'}] as const).map(item=><button key={item.id} aria-pressed={filter===item.id} onClick={()=>setFilter(item.id)}>{item.label}{item.id==='all'&&<span>{scheduledDays.filter(d=>!d.feriadoNome).length}</span>}</button>)}</div>
    {viewMode==='grid' ? <div className="portal-calendar-month"><div className="portal-weekdays">{WEEK_DAYS.map(d=><span key={d}>{d}</span>)}</div><div className="portal-calendar-grid">
      {calendarDays.map((day,index)=>{
        if(day===null) return <div className="portal-calendar-blank" key={'blank-'+index}/>;
        const details=getDayDetails(day);const hasEvent=details.isWithinSelectedPeriod && (!!details.feriadoNome || (details.isPastOrToday && details.temposValidos.length>0)); const visible=matchesFilter(details);
        const content=<><span className="portal-day-number">{day}{details.isToday&&<small>hoje</small>}</span>{hasEvent&&visible&&eventPills(details)}</>;
        const cls='portal-calendar-cell '+(details.isToday?'is-today ':'')+(selectedDay===day && (details.isPastOrToday || details.feriadoNome)?'is-selected ':'')+(!details.isPastOrToday && !details.feriadoNome?'is-future ':'')+(!details.isWithinSelectedPeriod?'is-outside ':'')+(!visible?'is-filtered':'');
        if(hasEvent) return <div key={day} role="button" tabIndex={0} className={cls} onClick={e=>handleDayClick(e,day,details)} onKeyDown={e=>handleKeyDown(e,day,details)} title={details.isDiaDeAula?'Clique para abrir Frequência e notas':details.feriadoNome||'Aula programada'} aria-label={details.feriadoNome?`${day} de ${MONTH_NAMES[currentMonth]}, feriado: ${details.feriadoNome}`:`${day} de ${MONTH_NAMES[currentMonth]}, ${WEEK_DAYS_FULL[details.dayOfWeek]}, ${statusLabel(details)}`}>{content}</div>;
        return <div key={day} className={cls+' is-rest'}>{content}</div>;
      })}
    </div></div> : <div className="portal-agenda">{scheduledDays.filter(matchesFilter).length ? scheduledDays.filter(matchesFilter).map(item=><div key={item.day} className={'portal-agenda-row status-'+item.status} role="button" tabIndex={0} onClick={e=>handleDayClick(e,item.day,item)} onKeyDown={e=>handleKeyDown(e,item.day,item)} aria-label={`${item.day} de ${MONTH_NAMES[currentMonth]}, ${WEEK_DAYS_FULL[item.dayOfWeek]}`}><div className="portal-agenda-date"><span>{WEEK_DAYS[item.dayOfWeek]}</span><strong>{item.day}</strong></div><div className="portal-agenda-line"><i/></div><div className="portal-agenda-content"><div><h3>{item.feriadoNome || 'Aulas da turma'}</h3><span>{item.feriadoNome?'Feriado':item.temposValidos.join(' · ')}</span></div>{eventPills(item)}</div><ArrowRight size={18}/></div>):<div className="portal-calendar-empty"><CalendarIcon size={30}/><h3>Nenhuma aula neste filtro</h3><p>Escolha outro filtro ou navegue entre os meses do bimestre.</p></div>}</div>}
    <footer className="portal-calendar-legend"><span><i className="legend-purple"/>A registrar</span><span><i className="legend-green"/>Concluído</span><span><i className="legend-amber"/>Em andamento</span><small>Selecione uma aula para abrir seu registro.</small></footer>
  </section>;
}
