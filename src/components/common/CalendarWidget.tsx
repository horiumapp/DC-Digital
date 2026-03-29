import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CalendarWidgetProps {
  year: number;
  currentMonth: number;
  onMonthChange: (month: number) => void;
  turmaAtiva: any;
  lancamentos: any[];
  dataInicioValida: Date;
  dataFimValida: Date;
}

export default function CalendarWidget({ 
  year, 
  currentMonth,
  onMonthChange,
  turmaAtiva, 
  lancamentos,
  dataInicioValida,
  dataFimValida
}: CalendarWidgetProps) {

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handlePrevMonth = () => {
    if (currentMonth > 0) onMonthChange(currentMonth - 1);
  };

  const handleNextMonth = () => {
    if (currentMonth < 11) onMonthChange(currentMonth + 1);
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
  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Calendar Header */}
      <div className="p-5 flex items-center justify-between border-b border-slate-200">
        <button 
          onClick={handlePrevMonth}
          disabled={currentMonth === 0}
          className="flex items-center gap-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </button>
        <h3 className="text-lg font-semibold text-slate-700">{monthNames[currentMonth]} de {year}</h3>
        <button 
          onClick={handleNextMonth}
          disabled={currentMonth === 11}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Próximo
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border-l border-slate-200">
        {/* Weekday Headers */}
        {weekDays.map((day) => (
          <div key={day} className="text-center py-4 text-sm font-semibold text-slate-800 border-b border-r border-slate-200">
            {day}
          </div>
        ))}

        {/* Days */}
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-[120px] p-3 border-b border-r border-slate-200 bg-slate-50/50"></div>;
          }

          const dayOfWeek = index % 7;
          const currentDate = new Date(year, currentMonth, day);
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const isWithinPeriod = currentDate >= dataInicioValida && currentDate <= dataFimValida;
          const isPastOrToday = currentDate <= today;
          const isDiaDeAula = turmaAtiva?.diasDeAula?.includes(dayOfWeek) && isWithinPeriod && isPastOrToday;
          
          if (isDiaDeAula) {
            const dayStr = `${day.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}/${year}`;
            const lancamentosDoDia = lancamentos.filter(l => l.data === dayStr && l.turmaId === turmaAtiva?.id);
            const temFrequencia = lancamentosDoDia.some(l => l.tipo === 'frequencia');
            const temConteudo = lancamentosDoDia.some(l => l.tipo === 'conteudo');

            let status: 'none' | 'partial' | 'full' = 'none';
            if (temFrequencia && temConteudo) status = 'full';
            else if (temFrequencia || temConteudo) status = 'partial';

            const fColor = temFrequencia ? 'bg-emerald-500' : 'bg-red-500';
            const cmColor = temConteudo ? 'bg-emerald-500' : 'bg-red-500';
            const bgColor = status === 'none' ? 'bg-red-100/60' : (status === 'partial' ? 'bg-amber-100/60' : 'bg-emerald-100/60');
            
            return (
              <Link 
                key={`day-${day}`}
                to={`/frequencia?date=${dayStr}&turmaId=${turmaAtiva?.id}`}
                className={`min-h-[120px] p-3 border-b border-r border-slate-200 flex justify-between ${bgColor} transition-all group relative hover:shadow-md hover:brightness-95`}
              >
                <span className="text-base font-medium text-slate-700">{day}</span>
                <div className="flex flex-col gap-1 items-end">
                  <span className={`w-6 h-6 rounded-full ${fColor} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}>F</span>
                  <span className={`w-6 h-6 rounded-full ${cmColor} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}>CM</span>
                </div>
              </Link>
            );
          }

          return (
            <div 
              key={`day-${day}`} 
              className="min-h-[120px] p-3 border-b border-r border-slate-200 flex justify-between bg-slate-100/50 opacity-50 cursor-not-allowed"
            >
              <span className="text-base font-medium text-slate-400">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
