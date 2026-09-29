import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  selectedDate: string;
  calendarMonth: number;
  calendarYear: number;
  onSelectDate: (date: string) => void;
  onSetCalendarMonth: (val: number) => void;
  onSetCalendarYear: (val: number) => void;
}

export default function CustomDatePicker({
  selectedDate,
  calendarMonth,
  calendarYear,
  onSelectDate,
  onSetCalendarMonth,
  onSetCalendarYear
}: CustomDatePickerProps) {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const diasNoMes = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const primeiroDia = new Date(calendarYear, calendarMonth, 1).getDay();
  const hoje = new Date();

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      onSetCalendarMonth(11);
      onSetCalendarYear(calendarYear - 1);
    } else {
      onSetCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      onSetCalendarMonth(0);
      onSetCalendarYear(calendarYear + 1);
    } else {
      onSetCalendarMonth(calendarMonth + 1);
    }
  };

  return (
    <div className="absolute top-full left-0 mt-4 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 w-80 p-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-5">
        <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#eef2ff] text-slate-400 hover:text-[#0f2851] transition">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <select 
            value={calendarMonth} 
            onChange={(e) => onSetCalendarMonth(Number(e.target.value))} 
            className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer appearance-none text-center focus:ring-2 focus:ring-[#0f2851]/10"
          >
            {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select 
            value={calendarYear} 
            onChange={(e) => onSetCalendarYear(Number(e.target.value))} 
            className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-sm font-bold text-slate-700 cursor-pointer appearance-none text-center focus:ring-2 focus:ring-[#0f2851]/10"
          >
            {Array.from({ length: 21 }, (_, i) => 2020 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-[#eef2ff] text-slate-400 hover:text-[#0f2851] transition">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {diasSemana.map((d, i) => <div key={i} className="text-[10px] font-black text-slate-400 text-center py-1.5 uppercase tracking-wider">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: primeiroDia }, (_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: diasNoMes }, (_, i) => {
          const dia = i + 1;
          const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
          const isSelected = selectedDate === dateStr;
          const isToday = dia === hoje.getDate() && calendarMonth === hoje.getMonth() && calendarYear === hoje.getFullYear();
          return (
            <button
              key={dia}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all ${
                isSelected
                  ? 'bg-[#0f2851] text-white shadow-lg shadow-[#0f2851]/30'
                  : isToday
                    ? 'bg-[#eef2ff] text-[#0f2851] ring-2 ring-[#0f2851]/20'
                    : 'text-slate-600 hover:bg-[#eef2ff] hover:text-[#0f2851]'
              }`}
            >
              {dia}
            </button>
          );
        })}
      </div>
    </div>
  );
}
