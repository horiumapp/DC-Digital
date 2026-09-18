import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  periodoEnd
}: CalendarWidgetProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'agenda'>('grid');

  const periodosLetivos = useMemo(() => {
    return APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE')).map(p => {
      const [aiY, aiM, aiD] = p.dataInicio.split('-');
      const start = new Date(Number(aiY), Number(aiM) - 1, Number(aiD));
      const [afY, afM, afD] = p.dataFim.split('-');
      const end = new Date(Number(afY), Number(afM) - 1, Number(afD));
      return { start, end };
    });
  }, []);

  const isDateWithinSchoolYear = (date: Date) => {
    return periodosLetivos.some(p => date >= p.start && date <= p.end);
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    if (currentMonth > minMonth) onMonthChange(currentMonth - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth < maxMonth) onMonthChange(currentMonth + 1);
  };

  const getDaysArray = () => {
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, currentMonth, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  };

  const calendarDays = getDaysArray();
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const weekDaysFull = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // Helper para verificar dia de aula
  const getDayDetails = useCallback((day: number) => {
    const currentDate = new Date(year, currentMonth, day);
    const dayOfWeek = currentDate.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isWithinSchoolYear = isDateWithinSchoolYear(currentDate);
    
    let isWithinSelectedPeriod = true;
    if (periodoStart && periodoEnd) {
      const [sY, sM, sD] = periodoStart.split('-').map(Number);
      const pStart = new Date(sY, sM - 1, sD);
      const [eY, eM, eD] = periodoEnd.split('-').map(Number);
      const pEnd = new Date(eY, eM - 1, eD);
      isWithinSelectedPeriod = currentDate >= pStart && currentDate <= pEnd;
    }

    const isPastOrToday = currentDate <= today;
    const temAulaHoje = horarioTurma?.some(h => Number(h.dia_semana) === dayOfWeek);
    const isDiaDeAula = temAulaHoje && isWithinSchoolYear && isPastOrToday && isWithinSelectedPeriod;

    const dayStr = `${year}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
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

    const fColor = isFrequenciaFull ? 'bg-emerald-600' : (isFrequenciaPartial ? 'bg-amber-500' : 'bg-red-500');
    const cmColor = isConteudoFull ? 'bg-emerald-600' : (isConteudoPartial ? 'bg-amber-500' : 'bg-red-500');
    const aColor = avaliacoesLancadas ? 'bg-emerald-600' : 'bg-red-500';

    return {
      dayStr,
      dayOfWeek,
      isDiaDeAula,
      temposValidos,
      status,
      fColor,
      cmColor,
      aColor,
      isFrequenciaFull,
      isConteudoFull,
      temAvaliacao,
      avaliacoesDoDia,
    };
  }, [year, currentMonth, periodoStart, periodoEnd, horarioTurma, turmaAtiva, lancamentos, avaliacoes, alunos]);

  // Coleta dias de aula do mês para a visão em Agenda
  const agendaDays = useMemo(() => {
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const details = getDayDetails(d);
      if (details.isDiaDeAula) {
        list.push({ day: d, ...details });
      }
    }
    return list;
  }, [year, currentMonth, getDayDetails]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
      {/* Calendar Header with Mode Switcher */}
      <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2">
          <button 
            onClick={handlePrevMonth}
            disabled={currentMonth <= minMonth}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base sm:text-lg font-bold text-[#0b1f3f] dark:text-sky-300 tracking-tight min-w-[130px] text-center">
            {monthNames[currentMonth]} {year}
          </h3>
          <button 
            onClick={handleNextMonth}
            disabled={currentMonth >= maxMonth}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Próximo mês"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode Switcher (Grid vs. Agenda) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-white dark:bg-slate-700 text-[#0b1f3f] dark:text-sky-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grade</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('agenda')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'agenda'
                ? 'bg-white dark:bg-slate-700 text-[#0b1f3f] dark:text-sky-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Agenda</span>
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div>
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/60">
            {weekDays.map((day) => (
              <div key={day} className="text-center py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 border-l border-t border-slate-200 dark:border-slate-800">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return (
                  <div 
                    key={`empty-${index}`} 
                    className="min-h-[95px] sm:min-h-[110px] p-2 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30"
                  />
                );
              }

              const details = getDayDetails(day);

              if (details.isDiaDeAula) {
                const bgTint = details.status === 'none' 
                  ? 'bg-red-50/50 hover:bg-red-50 dark:bg-red-950/15' 
                  : details.status === 'pending'
                  ? 'bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/15'
                  : 'bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/15';

                return (
                  <Link
                    key={`day-${day}`}
                    to={`/frequencia?date=${details.dayStr}&turmaId=${turmaAtiva?.id}`}
                    className={`min-h-[95px] sm:min-h-[110px] p-2 sm:p-2.5 border-b border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between ${bgTint} transition-all group relative`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-sky-300">
                        {day}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-1 mt-1">
                      <span 
                        title="Frequência" 
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${details.fColor} text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-xs`}
                      >
                        F
                      </span>
                      <span 
                        title="Conteúdo Ministrado" 
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full ${details.cmColor} text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-xs`}
                      >
                        CM
                      </span>
                      {details.temAvaliacao && (() => {
                        const temRP = details.avaliacoesDoDia.some(av => av.tipo?.startsWith('RP'));
                        return (
                          <span 
                            title={temRP ? 'Recuperação Paralela' : 'Avaliação'}
                            className={`${temRP ? 'px-1' : 'w-4 sm:w-5'} h-4 sm:h-5 rounded-full ${details.aColor} text-white flex items-center justify-center text-[9px] sm:text-[10px] font-black shadow-xs`}
                          >
                            {temRP ? 'RP' : 'A'}
                          </span>
                        );
                      })()}
                    </div>
                  </Link>
                );
              }

              return (
                <div
                  key={`day-${day}`}
                  className="min-h-[95px] sm:min-h-[110px] p-2 sm:p-2.5 border-b border-r border-slate-200 dark:border-slate-800 bg-slate-100/30 dark:bg-slate-900/40 text-slate-300 dark:text-slate-600 select-none"
                >
                  <span className="text-xs font-semibold">{day}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agenda / List View */}
      {viewMode === 'agenda' && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {agendaDays.length > 0 ? (
            agendaDays.map((item) => {
              const temRP = item.avaliacoesDoDia.some(av => av.tipo?.startsWith('RP'));
              return (
                <div 
                  key={`agenda-${item.day}`}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center shrink-0">
                      <span className="text-base font-black text-[#0b1f3f] dark:text-sky-300 leading-none">{item.day}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{monthNames[currentMonth].slice(0, 3)}</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {weekDaysFull[item.dayOfWeek]}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {item.temposValidos.join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white ${item.fColor}`}>
                        Frequência
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white ${item.cmColor}`}>
                        Conteúdo
                      </span>
                      {item.temAvaliacao && (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white ${item.aColor}`}>
                          {temRP ? 'Recuperação' : 'Avaliação'}
                        </span>
                      )}
                    </div>

                    <Link
                      to={`/frequencia?date=${item.dayStr}&turmaId=${turmaAtiva?.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0b1f3f] hover:bg-[#16325c] dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    >
                      <span>Abrir</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
              Não há dias de aula cadastrados neste mês para esta turma.
            </div>
          )}
        </div>
      )}

      {/* Embedded Clean Legend */}
      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
          <span className="font-bold text-slate-700 dark:text-slate-300">Legenda:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">F</span>
            Frequência
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">CM</span>
            Conteúdo
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">A</span>
            Avaliação
          </span>
        </div>

        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Concluído
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Parcial
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Pendente
          </span>
        </div>
      </div>
    </div>
  );
}
