import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, ArrowRight, Check, AlertTriangle, Circle, CalendarSearch } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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
}

export interface DayDetails {
  dayStr: string;
  dayOfWeek: number;
  isDiaDeAula: boolean;
  temposValidos: string[];
  status: 'none' | 'pending' | 'full';
  isFrequenciaFull: boolean;
  isFrequenciaPartial: boolean;
  isConteudoFull: boolean;
  isConteudoPartial: boolean;
  temAvaliacao: boolean;
  avaliacoesDoDia: CalendarAvaliacao[];
  avaliacoesLancadas: boolean;
  isWithinSelectedPeriod: boolean;
  isToday: boolean;
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

let lastCalendarClick: { day: number; time: number } | null = null;

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
}: CalendarWidgetProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>(getStoredViewMode);

  const handleOpenFrequencia = useCallback((dayStr: string) => {
    const turmaParam = turmaAtiva?.id ? `&turmaId=${turmaAtiva.id}` : '';
    navigate(`/frequencia?date=${dayStr}${turmaParam}`);
  }, [navigate, turmaAtiva]);

  const handleDayClick = useCallback((e: React.MouseEvent, day: number, details: DayDetails) => {
    const now = Date.now();
    const last = lastCalendarClick;

    // Detect double-click either via browser native e.detail >= 2 or timer interval < 400ms
    if (e.detail >= 2 || (last && last.day === day && (now - last.time) < 400)) {
      lastCalendarClick = null;
      handleOpenFrequencia(details.dayStr);
      return;
    }

    lastCalendarClick = { day, time: now };
    onDaySelect(day, details);
  }, [onDaySelect, handleOpenFrequencia]);

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
    const isDiaDeAula = !!(temAulaHoje && isWithinSchoolYear && isPastOrToday && isWithinSelectedPeriod);

    const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    const activeTurmaId = String(turmaAtiva?.id).split('||')[0];
    const lancamentosDoDia = lancamentos.filter(l => l.data === dayStr && String(l.turmaId).split('||')[0] === activeTurmaId);
    
    const temposValidos = horarioTurma?.filter(h => Number(h.dia_semana) === dayOfWeek).map(h => `${h.tempo_ordem}º TEMPO`) || [];
    const totalTempos = temposValidos.length;

    const avaliacoesDoDia = avaliacoes.filter(av => formatarDataParaISO(av.data) === dayStr && String(av.turmaId).split('||')[0] === activeTurmaId);
    const temAvaliacao = avaliacoesDoDia.length > 0;
    
    const avaliacoesLancadas = temAvaliacao && avaliacoesDoDia.every(av => {
      const notasDessaAv = alunos.filter(a => a.notas && a.notas[av.id]);
      return notasDessaAv.length > 0;
    });

    const frequenciasLancadas = lancamentosDoDia.filter(l => l.tipo === 'frequencia' && temposValidos.includes(l.tempo));
    const conteudosLancados = lancamentosDoDia.filter(l => l.tipo === 'conteudo' && temposValidos.includes(l.tempo));
    
    const uniqueTemposFreq = new Set(frequenciasLancadas.map(l => l.tempo)).size;
    const uniqueTemposCont = new Set(conteudosLancados.map(l => l.tempo)).size;

    const isFrequenciaFull = totalTempos > 0 && uniqueTemposFreq === totalTempos;
    const isFrequenciaPartial = uniqueTemposFreq > 0 && uniqueTemposFreq < totalTempos;
    
    const isConteudoFull = totalTempos > 0 && uniqueTemposCont === totalTempos;
    const isConteudoPartial = uniqueTemposCont > 0 && uniqueTemposCont < totalTempos;

    let status: 'none' | 'pending' | 'full' = 'none';
    if (isFrequenciaFull && isConteudoFull && (!temAvaliacao || avaliacoesLancadas)) status = 'full';
    else if (uniqueTemposFreq > 0 || uniqueTemposCont > 0 || temAvaliacao) status = 'pending';

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
      isWithinSelectedPeriod,
      isToday,
    };
  }, [year, currentMonth, periodoStart, periodoEnd, horarioTurma, turmaAtiva, lancamentos, avaliacoes, alunos]);

  // Coleta dias de aula do mês para a visão em Agenda
  const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
  const agendaDays: Array<DayDetails & { day: number }> = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const details = getDayDetails(d);
    if (details.isDiaDeAula) {
      agendaDays.push({ day: d, ...details });
    }
  }

  // Group agenda by week (ISO week number)
  const agendaByWeek: { weekLabel: string; days: typeof agendaDays }[] = [];
  let currentWeekStart: Date | null = null;
  let currentWeekDays: typeof agendaDays = [];

  agendaDays.forEach(item => {
    const date = new Date(year, currentMonth, item.day);
    // Get Monday of this week
    const dayNum = date.getDay();
    const mondayOffset = dayNum === 0 ? -6 : 1 - dayNum;
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    
    if (!currentWeekStart || monday.getTime() !== currentWeekStart.getTime()) {
      if (currentWeekDays.length > 0 && currentWeekStart) {
        const weekStart = currentWeekStart;
        const friday = new Date(weekStart);
        friday.setDate(weekStart.getDate() + 4);
        agendaByWeek.push({
          weekLabel: `${weekStart.getDate()}–${friday.getDate()} ${MONTH_NAMES[friday.getMonth()].slice(0, 3)}`,
          days: currentWeekDays,
        });
      }
      currentWeekStart = monday;
      currentWeekDays = [];
    }
    currentWeekDays.push(item);
  });

  if (currentWeekDays.length > 0 && currentWeekStart) {
    const lastStart: Date = currentWeekStart;
    const friday = new Date(lastStart);
    friday.setDate(lastStart.getDate() + 4);
    agendaByWeek.push({
      weekLabel: `${lastStart.getDate()}–${friday.getDate()} ${MONTH_NAMES[friday.getMonth()].slice(0, 3)}`,
      days: currentWeekDays,
    });
  }

  // Keyboard nav for grid and agenda
  const handleKeyDown = (e: React.KeyboardEvent, day: number, details: DayDetails) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedDay === day) {
        handleOpenFrequencia(details.dayStr);
      } else {
        onDaySelect(day, details);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      onDaySelect(day, details);
    }
  };

  // Badge renderer
  const StatusBadge = ({ done, partial, label, shortLabel }: { done: boolean; partial: boolean; label: string; shortLabel: string }) => {
    const cls = done ? 'dd-badge dd-badge-done' : partial ? 'dd-badge dd-badge-partial' : 'dd-badge dd-badge-pending';
    const icon = done ? <Check className="w-3 h-3" /> : partial ? <AlertTriangle className="w-3 h-3" /> : <Circle className="w-2.5 h-2.5" />;
    return (
      <span className={cls} aria-label={`${label}: ${done ? 'concluído' : partial ? 'parcial' : 'pendente'}`}>
        {icon}
        <span className="hidden sm:inline">{shortLabel}</span>
      </span>
    );
  };

  // Sync selected day when month changes
  useEffect(() => {
    if (selectedDay !== null) {
      const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
      if (selectedDay > daysInMonth) {
        onDaySelect(null, null);
      }
    }
  }, [currentMonth, year, selectedDay, onDaySelect]);

  return (
    <div className="bg-[var(--dd-surface)] border border-[var(--dd-border)] rounded-2xl overflow-hidden shadow-xs">
      {/* Calendar Header */}
      <div className="p-3 sm:px-5 sm:py-3.5 border-b border-[var(--dd-border)] bg-[var(--dd-surface-subtle)]">
        <div className="flex flex-col sm:grid sm:grid-cols-3 items-center gap-3">
          {/* Left (Desktop): Quick Action Hoje */}
          <div className="hidden sm:flex items-center justify-start">
            <button
              type="button"
              onClick={handleGoToday}
              disabled={!isTodayInPeriod}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--dd-border)] rounded-xl text-xs font-bold text-[var(--dd-ink-muted)] hover:bg-[var(--dd-surface)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              title={!isTodayInPeriod ? 'A data de hoje está fora do período selecionado' : 'Ir para hoje'}
            >
              <CalendarSearch className="w-3.5 h-3.5" />
              <span>Hoje</span>
            </button>
          </div>

          {/* Center: Month Navigation (< Setembro 2026 >) */}
          <div className="flex items-center justify-center gap-2 w-full">
            <button 
              onClick={handlePrevMonth}
              disabled={currentMonth <= minMonth}
              className="p-2 border border-[var(--dd-border)] rounded-xl text-[var(--dd-ink-muted)] hover:bg-[var(--dd-surface)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--dd-ink)] tracking-tight min-w-[160px] sm:min-w-[180px] text-center select-none">
              {MONTH_NAMES[currentMonth]} <span className="text-[var(--dd-ink-muted)] font-semibold">{year}</span>
            </h3>
            <button 
              onClick={handleNextMonth}
              disabled={currentMonth >= maxMonth}
              className="p-2 border border-[var(--dd-border)] rounded-xl text-[var(--dd-ink-muted)] hover:bg-[var(--dd-surface)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Right (Desktop) / Bottom row (Mobile) */}
          <div className="flex items-center justify-between sm:justify-end w-full gap-2">
            {/* Mobile-only Hoje */}
            <div className="sm:hidden">
              <button
                type="button"
                onClick={handleGoToday}
                disabled={!isTodayInPeriod}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--dd-border)] rounded-xl text-xs font-bold text-[var(--dd-ink-muted)] hover:bg-[var(--dd-surface)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                title={!isTodayInPeriod ? 'A data de hoje está fora do período selecionado' : 'Ir para hoje'}
              >
                <CalendarSearch className="w-3.5 h-3.5" />
                <span>Hoje</span>
              </button>
            </div>

            {/* View Switcher: Mês / Agenda */}
            <div className="flex items-center bg-[var(--dd-surface)] p-1 rounded-xl border border-[var(--dd-border)] shadow-xs">
              <button
                type="button"
                onClick={() => handleViewChange('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--dd-primary)] text-white shadow-xs'
                    : 'text-[var(--dd-ink-muted)] hover:text-[var(--dd-ink)]'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Mês</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('agenda')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'agenda'
                    ? 'bg-[var(--dd-primary)] text-white shadow-xs'
                    : 'text-[var(--dd-ink-muted)] hover:text-[var(--dd-ink)]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Agenda</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div>
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-[var(--dd-border)] bg-[var(--dd-surface-subtle)]">
            {WEEK_DAYS.map((day) => (
              <div key={day} className="text-center py-2.5 text-xs font-bold text-[var(--dd-ink-muted)] uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-l border-t border-[var(--dd-border)]">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <div 
                    key={`empty-${index}`} 
                    className="dd-cal-cell dd-cal-empty"
                  />
                );
              }

              const details = getDayDetails(day);
              const isSelected = selectedDay === day;

              if (details.isDiaDeAula) {
                const cellClasses = [
                  'dd-cal-cell dd-cal-lesson',
                  details.isToday ? 'dd-cal-today' : '',
                  isSelected ? 'dd-cal-selected' : '',
                ].filter(Boolean).join(' ');

                return (
                  <div
                    key={`day-${day}`}
                    role="button"
                    tabIndex={0}
                    className={`${cellClasses} flex flex-col justify-between group cursor-pointer select-none`}
                    onClick={(e) => handleDayClick(e, day, details)}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      handleOpenFrequencia(details.dayStr);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, day, details)}
                    aria-label={`${day} de ${MONTH_NAMES[currentMonth]}, ${WEEK_DAYS_FULL[details.dayOfWeek]}${details.temposValidos.length > 0 ? `, ${details.temposValidos.join(', ')}` : ''}`}
                    title="Clique para selecionar ou clique duas vezes para abrir Frequência e notas"
                  >
                    {/* Day number + times */}
                    <div className="flex items-start justify-between">
                      <span className={`text-lg font-bold leading-none ${isSelected ? 'text-[var(--dd-cal-selected-border)]' : 'text-[var(--dd-ink)]'} group-hover:text-[var(--dd-cal-selected-border)] transition-colors`}>
                        {day}
                      </span>
                      {details.temposValidos.length > 0 && (
                        <span className="text-[10px] text-[var(--dd-ink-muted)] font-medium hidden lg:block">
                          {details.temposValidos.length === 1 
                            ? details.temposValidos[0].replace('º TEMPO', 'º') 
                            : `${details.temposValidos[0].replace('º TEMPO', 'º')}–${details.temposValidos[details.temposValidos.length - 1].replace('º TEMPO', 'º')}`
                          }
                        </span>
                      )}
                    </div>

                    {/* Status badges */}
                    <div className="flex flex-wrap items-center gap-0.5 mt-auto pt-1">
                      <StatusBadge 
                        done={details.isFrequenciaFull} 
                        partial={details.isFrequenciaPartial} 
                        label="Frequência" 
                        shortLabel="Freq" 
                      />
                      <StatusBadge 
                        done={details.isConteudoFull} 
                        partial={details.isConteudoPartial} 
                        label="Conteúdo" 
                        shortLabel="Cont" 
                      />
                      {details.temAvaliacao && (
                        <StatusBadge 
                          done={details.avaliacoesLancadas} 
                          partial={false} 
                          label={details.avaliacoesDoDia.some(av => av.tipo?.startsWith('RP')) ? 'Recuperação' : 'Avaliação'} 
                          shortLabel={details.avaliacoesDoDia.some(av => av.tipo?.startsWith('RP')) ? 'RP' : 'Aval'} 
                        />
                      )}
                    </div>
                  </div>
                );
              }

              // Non-lesson day
              const isOutsidePeriod = !details.isWithinSelectedPeriod;
              return (
                <div
                  key={`day-${day}`}
                  className={`dd-cal-cell ${isOutsidePeriod ? 'dd-cal-disabled' : 'dd-cal-empty'} ${details.isToday ? 'dd-cal-today' : ''}`}
                >
                  <span className="text-sm font-semibold text-[var(--dd-ink-muted)]">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda / List View */}
      {viewMode === 'agenda' && (
        <div className="pb-2">
          {agendaByWeek.length > 0 ? (
            agendaByWeek.map((week, wIdx) => (
              <div key={`week-${wIdx}`}>
                {/* Week separator */}
                <div className="dd-agenda-week">
                  Semana de {week.weekLabel}
                </div>

                {/* Days in week */}
                {week.days.map((item) => {
                  const isSelected = selectedDay === item.day;
                  const temRP = item.avaliacoesDoDia.some(av => av.tipo?.startsWith('RP'));

                  return (
                    <div 
                      key={`agenda-${item.day}`}
                      className={`mx-2 mb-1 px-3 py-3 sm:px-4 sm:py-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-[var(--dd-cal-selected-bg)] ring-1 ring-[var(--dd-cal-selected-border)]'
                          : 'hover:bg-[var(--dd-surface-subtle)]'
                      }`}
                      onClick={(e) => handleDayClick(e, item.day, item)}
                      onDoubleClick={(e) => {
                        e.preventDefault();
                        handleOpenFrequencia(item.dayStr);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => handleKeyDown(e, item.day, item)}
                      title="Clique para selecionar ou clique duas vezes para abrir Frequência e notas"
                    >
                      {/* Date & Time Info */}
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          item.isToday 
                            ? 'bg-[var(--dd-primary)] text-white' 
                            : 'bg-[var(--dd-surface-subtle)] border border-[var(--dd-border)] text-[var(--dd-ink)]'
                        }`}>
                          <span className="text-base font-black leading-none">{item.day}</span>
                          <span className={`text-[10px] font-bold uppercase mt-0.5 ${item.isToday ? 'text-white/70' : 'text-[var(--dd-ink-muted)]'}`}>
                            {MONTH_NAMES[currentMonth].slice(0, 3)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--dd-ink)]">
                            {WEEK_DAYS_FULL[item.dayOfWeek]}
                          </p>
                          <p className="text-xs text-[var(--dd-ink-muted)] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {item.temposValidos.join(', ')}
                          </p>
                        </div>
                      </div>

                      {/* Status + Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge done={item.isFrequenciaFull} partial={item.isFrequenciaPartial} label="Frequência" shortLabel="Freq" />
                          <StatusBadge done={item.isConteudoFull} partial={item.isConteudoPartial} label="Conteúdo" shortLabel="Cont" />
                          {item.temAvaliacao && (
                            <StatusBadge done={item.avaliacoesLancadas} partial={false} label={temRP ? 'Recuperação' : 'Avaliação'} shortLabel={temRP ? 'RP' : 'Aval'} />
                          )}
                        </div>

                        <Link
                          to={`/frequencia?date=${item.dayStr}&turmaId=${turmaAtiva?.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--dd-primary)] hover:opacity-90 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span>Abrir registro</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-[var(--dd-ink-muted)] text-sm">
              Não há dias de aula cadastrados neste mês para esta turma.
            </div>
          )}
        </div>
      )}

      {/* Compact Legend Footer */}
      <div className="px-4 py-2.5 bg-[var(--dd-surface-subtle)] border-t border-[var(--dd-border)] flex flex-wrap items-center gap-4 text-xs text-[var(--dd-ink-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="dd-badge dd-badge-done"><Check className="w-3 h-3" /></span>
          Concluído
        </span>
        <span className="flex items-center gap-1.5">
          <span className="dd-badge dd-badge-partial"><AlertTriangle className="w-3 h-3" /></span>
          Parcial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="dd-badge dd-badge-pending"><Circle className="w-2.5 h-2.5" /></span>
          Pendente
        </span>
      </div>
    </div>
  );
}
