import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, ArrowRight, CalendarSearch } from 'lucide-react';
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
  const lastEmittedRef = useRef<string | null>(null);

  const handleOpenFrequencia = useCallback((dayStr: string) => {
    const turmaParam = turmaAtiva?.id ? `&turmaId=${turmaAtiva.id}` : '';
    navigate(`/frequencia?date=${dayStr}${turmaParam}`);
  }, [navigate, turmaAtiva]);

  const handleDayClick = (e: React.MouseEvent, day: number, details: DayDetails) => {
    e.preventDefault();
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
    const isDiaDeAula = !!(temAulaHoje && isWithinSchoolYear && isPastOrToday && isWithinSelectedPeriod);

    const dayStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
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
      onDaySelect(day, details);
      if (details.isDiaDeAula) {
        handleOpenFrequencia(details.dayStr);
      }
    } else if (e.key === ' ') {
      e.preventDefault();
      onDaySelect(day, details);
    }
  };

  // Circular Status Indicator (F, C, A)
  const StatusCircle = ({ 
    letter, 
    done, 
    partial, 
    title 
  }: { 
    letter: 'F' | 'C' | 'A' | 'R'; 
    done: boolean; 
    partial?: boolean; 
    title: string; 
  }) => {
    const cls = `dd-circle-badge ${done ? 'dd-circle-done' : partial ? 'dd-circle-partial' : 'dd-circle-pending'}`;
    return (
      <span className={cls} title={title} aria-label={title}>
        {letter}
      </span>
    );
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

  return (
    <div className="bg-[var(--dd-cal-bg)] border border-[var(--dd-cal-border)] rounded-2xl overflow-hidden shadow-xs">
      {/* Calendar Header */}
      <div className="p-3 sm:px-5 sm:py-3.5 border-b border-[var(--dd-cal-border)] bg-[var(--dd-cal-header)]">
        <div className="flex flex-col sm:grid sm:grid-cols-3 items-center gap-3">
          {/* Left (Desktop): Quick Action Hoje */}
          <div className="hidden sm:flex items-center justify-start">
            <button
              type="button"
              onClick={handleGoToday}
              disabled={!isTodayInPeriod}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--dd-cal-border)] rounded-xl text-xs font-semibold text-[var(--dd-cal-text-primary)] hover:bg-[var(--dd-cal-bg)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              title={!isTodayInPeriod ? 'A data de hoje está fora do período selecionado' : 'Ir para hoje'}
            >
              <CalendarSearch className="w-3.5 h-3.5 text-[var(--dd-cal-selected)]" />
              <span>Hoje</span>
            </button>
          </div>

          {/* Center: Month Navigation (< Setembro 2026 >) */}
          <div className="flex items-center justify-center gap-2 w-full">
            <button 
              onClick={handlePrevMonth}
              disabled={currentMonth <= minMonth}
              className="p-2 border border-[var(--dd-cal-border)] rounded-xl text-[var(--dd-cal-text-secondary)] hover:text-[var(--dd-cal-text-primary)] hover:bg-[var(--dd-cal-bg)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--dd-cal-text-primary)] tracking-tight min-w-[160px] sm:min-w-[180px] text-center select-none">
              {MONTH_NAMES[currentMonth]} <span className="text-[var(--dd-cal-text-secondary)] font-normal">{year}</span>
            </h3>
            <button 
              onClick={handleNextMonth}
              disabled={currentMonth >= maxMonth}
              className="p-2 border border-[var(--dd-cal-border)] rounded-xl text-[var(--dd-cal-text-secondary)] hover:text-[var(--dd-cal-text-primary)] hover:bg-[var(--dd-cal-bg)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[var(--dd-cal-border)] rounded-xl text-xs font-semibold text-[var(--dd-cal-text-primary)] hover:bg-[var(--dd-cal-bg)] transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                title={!isTodayInPeriod ? 'A data de hoje está fora do período selecionado' : 'Ir para hoje'}
              >
                <CalendarSearch className="w-3.5 h-3.5 text-[var(--dd-cal-selected)]" />
                <span>Hoje</span>
              </button>
            </div>

            {/* View Switcher: Mês / Agenda */}
            <div className="flex items-center bg-[var(--dd-cal-bg)] p-1 rounded-xl border border-[var(--dd-cal-border)] shadow-xs">
              <button
                type="button"
                onClick={() => handleViewChange('grid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[var(--dd-cal-primary)] text-white shadow-xs'
                    : 'text-[var(--dd-cal-text-secondary)] hover:text-[var(--dd-cal-text-primary)]'
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
                    ? 'bg-[var(--dd-cal-primary)] text-white shadow-xs'
                    : 'text-[var(--dd-cal-text-secondary)] hover:text-[var(--dd-cal-text-primary)]'
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
          <div className="grid grid-cols-6 sm:grid-cols-7 border-b border-[var(--dd-cal-border)] bg-[var(--dd-cal-header)]">
            {WEEK_DAYS.map((day, dIdx) => (
              <div 
                key={day} 
                className={`text-center py-2 sm:py-2.5 text-xs font-bold text-[var(--dd-cal-text-secondary)] uppercase tracking-wider ${
                  dIdx === 0 ? 'hidden sm:block' : ''
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-6 sm:grid-cols-7 border-l border-t border-[var(--dd-cal-border)] bg-[var(--dd-cal-bg)]">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <div 
                    key={`empty-${index}`} 
                    className={`dd-cal-cell dd-cal-empty ${index === 0 ? 'hidden sm:block' : ''}`}
                  />
                );
              }

              const details = getDayDetails(day);
              const isSelected = selectedDay === day;
              const isSunday = details.dayOfWeek === 0;

              if (details.isDiaDeAula) {
                const cellStatusClass = details.status === 'full' 
                  ? 'dd-cal-cell-full' 
                  : details.status === 'partial' 
                  ? 'dd-cal-cell-partial' 
                  : 'dd-cal-cell-pending';

                const cellClasses = [
                  'dd-cal-cell dd-cal-lesson',
                  cellStatusClass,
                  details.isToday ? 'dd-cal-today' : '',
                  isSelected ? 'dd-cal-selected' : '',
                  isSunday ? 'hidden sm:flex' : 'flex',
                ].filter(Boolean).join(' ');

                return (
                  <div
                    key={`day-${day}`}
                    role="button"
                    tabIndex={0}
                    className={`${cellClasses} flex-col justify-between group cursor-pointer select-none`}
                    onClick={(e) => handleDayClick(e, day, details)}
                    onKeyDown={(e) => handleKeyDown(e, day, details)}
                    aria-label={`${day} de ${MONTH_NAMES[currentMonth]}, ${WEEK_DAYS_FULL[details.dayOfWeek]}${details.temposValidos.length > 0 ? `, ${details.temposValidos.join(', ')}` : ''}`}
                    title="Clique para abrir Frequência e notas"
                  >
                    {/* Content inside cell */}
                    <div className="flex items-start justify-between w-full h-full">
                      {/* Left: Day number and tempo */}
                      <div className="flex flex-col items-start gap-0.5 sm:gap-1">
                        <span className={`text-sm sm:text-lg font-bold leading-none ${
                          isSelected ? 'text-[var(--dd-cal-selected)]' : 'text-[var(--dd-cal-text-primary)]'
                        } transition-colors`}>
                          {day}
                        </span>
                        {details.temposValidos.length > 0 && (
                          <span className={`text-[10px] sm:text-[11px] font-medium leading-none ${
                            isSelected ? 'text-[var(--dd-cal-selected)]' : 'text-[var(--dd-cal-text-secondary)]'
                          }`}>
                            {details.temposValidos.length === 1 
                              ? details.temposValidos[0].replace('º TEMPO', 'º') 
                              : `${details.temposValidos[0].replace('º TEMPO', 'º')}–${details.temposValidos[details.temposValidos.length - 1].replace('º TEMPO', 'º')}`
                            }
                          </span>
                        )}
                      </div>

                      {/* Right: Badges F, C, A stacked vertically */}
                      <div className="flex flex-col items-center gap-1 shrink-0 ml-0.5 sm:ml-1">
                        <StatusCircle 
                          letter="F" 
                          done={details.isFrequenciaFull} 
                          partial={details.isFrequenciaPartial} 
                          title={`Frequência: ${details.isFrequenciaFull ? 'Concluída' : details.isFrequenciaPartial ? 'Parcial' : 'Pendente'}`} 
                        />
                        <StatusCircle 
                          letter="C" 
                          done={details.isConteudoFull} 
                          partial={details.isConteudoPartial} 
                          title={`Conteúdo: ${details.isConteudoFull ? 'Concluído' : details.isConteudoPartial ? 'Parcial' : 'Pendente'}`} 
                        />
                        {details.temAvaliacao && (
                          <StatusCircle 
                            letter="A" 
                            done={details.avaliacoesLancadas} 
                            title={`Avaliação: ${details.avaliacoesLancadas ? 'Notas lançadas' : 'Pendente de notas'}`} 
                          />
                        )}
                        {details.temRecuperacao && (
                          <StatusCircle
                            letter="R"
                            done={details.recuperacoesLancadas}
                            title={`Recuperação paralela: ${details.recuperacoesLancadas ? 'Notas lançadas' : 'Pendente de notas'}`}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Non-lesson day
              const isOutsidePeriod = !details.isWithinSelectedPeriod;
              return (
                <div
                  key={`day-${day}`}
                  className={`dd-cal-cell ${isOutsidePeriod ? 'dd-cal-disabled' : 'dd-cal-empty'} ${details.isToday ? 'dd-cal-today' : ''} ${isSelected ? 'dd-cal-selected' : ''} ${isSunday ? 'hidden sm:block' : ''}`}
                >
                  <span className="text-sm sm:text-base font-semibold text-[var(--dd-cal-text-muted)]">{day}</span>
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
                  return (
                    <div 
                      key={`agenda-${item.day}`}
                      className={`mx-2 mb-1 px-3 py-3 sm:px-4 sm:py-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all cursor-pointer select-none ${
                        isSelected 
                          ? 'bg-[var(--dd-cal-selected-bg)] ring-1 ring-[var(--dd-cal-selected-border)]'
                          : 'hover:bg-[var(--dd-surface-subtle)]'
                      }`}
                      onClick={(e) => handleDayClick(e, item.day, item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => handleKeyDown(e, item.day, item)}
                      title="Clique para abrir Frequência e notas"
                    >
                      {/* Date & Time Info */}
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
                          item.isToday 
                            ? 'bg-[var(--dd-cal-primary)] text-white' 
                            : 'bg-[var(--dd-cal-header)] border border-[var(--dd-cal-border)] text-[var(--dd-cal-text-primary)]'
                        }`}>
                          <span className="text-base font-black leading-none">{item.day}</span>
                          <span className={`text-[10px] font-bold uppercase mt-0.5 ${item.isToday ? 'text-white/70' : 'text-[var(--dd-cal-text-secondary)]'}`}>
                            {MONTH_NAMES[currentMonth].slice(0, 3)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--dd-cal-text-primary)]">
                            {WEEK_DAYS_FULL[item.dayOfWeek]}
                          </p>
                          <p className="text-xs text-[var(--dd-cal-text-secondary)] flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {item.temposValidos.join(', ')}
                          </p>
                        </div>
                      </div>

                      {/* Status + Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--dd-cal-text-primary)]">
                            <StatusCircle letter="F" done={item.isFrequenciaFull} partial={item.isFrequenciaPartial} title="Frequência" />
                            <span className="hidden sm:inline">Freq</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--dd-cal-text-primary)]">
                            <StatusCircle letter="C" done={item.isConteudoFull} partial={item.isConteudoPartial} title="Conteúdo" />
                            <span className="hidden sm:inline">Cont</span>
                          </span>
                          {item.temAvaliacao && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--dd-cal-text-primary)]">
                              <StatusCircle letter="A" done={item.avaliacoesLancadas} title="Avaliação" />
                              <span className="hidden sm:inline">Aval</span>
                            </span>
                          )}
                          {item.temRecuperacao && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--dd-cal-text-primary)]">
                              <StatusCircle letter="R" done={item.recuperacoesLancadas} title="Recuperação paralela" />
                              <span className="hidden sm:inline">RP</span>
                            </span>
                          )}
                        </div>

                        <Link
                          to={`/frequencia?date=${item.dayStr}&turmaId=${turmaAtiva?.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--dd-cal-primary)] hover:opacity-90 text-white rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
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
            <div className="py-12 text-center text-[var(--dd-cal-text-muted)] text-sm">
              Não há dias de aula cadastrados neste mês para esta turma.
            </div>
          )}
        </div>
      )}

      {/* Compact Legend Footer */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 bg-[var(--dd-cal-header)] border-t border-[var(--dd-cal-border)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs text-[var(--dd-cal-text-secondary)]">
        {/* Quadrinhos colors */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="font-bold text-[var(--dd-cal-text-primary)]">Quadrinhos:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-[#D3F0DA] bg-[#EFFBF2] dark:border-emerald-700/40 dark:bg-emerald-950/40 shadow-2xs" />
            <span className="font-medium text-[var(--dd-cal-text-secondary)]">Concluído</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-[#F8DEA0] bg-[#FFF9E8] dark:border-amber-700/40 dark:bg-amber-950/40 shadow-2xs" />
            <span className="font-medium text-[var(--dd-cal-text-secondary)]">Parcial</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded border border-[#F8D1D1] bg-[#FFF1F1] dark:border-rose-700/40 dark:bg-rose-950/40 shadow-2xs" />
            <span className="font-medium text-[var(--dd-cal-text-secondary)]">Pendente</span>
          </span>
        </div>

        {/* Badges F, C, A */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <span className="font-bold text-[var(--dd-cal-text-primary)]">Indicadores:</span>
          <span className="flex items-center gap-1.5" title="Frequência">
            <span className="dd-circle-badge dd-circle-done">F</span>
            <span className="font-medium text-[var(--dd-cal-text-secondary)]">Frequência</span>
          </span>
          <span className="flex items-center gap-1.5" title="Conteúdo Ministrado">
            <span className="dd-circle-badge dd-circle-done">C</span>
            <span className="font-medium text-[var(--dd-cal-text-secondary)]">Conteúdo</span>
          </span>
          <span className="flex items-center gap-1.5" title="Avaliação (quando agendada)">
            <span className="dd-circle-badge dd-circle-done">A</span>
            <span className="font-medium text-[var(--dd-cal-text-secondary)]">Avaliação</span>
          </span>
          <span className="flex items-center gap-1.5" title="Recuperação paralela">
            <span className="dd-circle-badge dd-circle-done">R</span>
            <span className="font-medium text-[var(--dd-cal-text-secondary)]">Recuperação</span>
          </span>
        </div>
      </div>
    </div>
  );
}
