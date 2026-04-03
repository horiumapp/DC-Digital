import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CalendarWidgetProps {
  year: number;
  currentMonth: number;
  onMonthChange: (month: number) => void;
  turmaAtiva: any;
  lancamentos: any[];
  avaliacoes: any[];
  alunos: any[];
  horarioTurma?: any[];
}

export default function CalendarWidget({ 
  year, 
  currentMonth,
  onMonthChange,
  turmaAtiva, 
  lancamentos,
  avaliacoes,
  alunos,
  horarioTurma
}: CalendarWidgetProps) {

  // Re-calcular datas do período baseadas no Bimestre selecionado (poderiam vir de props, mas mantemos isolado)
  const periodosLetivos = [
    { id: 1, nome: '1º Bimestre', dataInicio: '2026-02-05', dataFim: '2026-04-23' },
    { id: 2, nome: '2º Bimestre', dataInicio: '2026-04-24', dataFim: '2026-07-07' },
    { id: 3, nome: '3º Bimestre', dataInicio: '2026-07-16', dataFim: '2026-09-24' },
    { id: 4, nome: '4º Bimestre', dataInicio: '2026-09-25', dataFim: '2026-12-14' },
  ];

  // Identificar em qual período estamos (heurística baseada no mês atual)
  // Nota: Isso é uma redundância para manter o widget funcionando se as props de data sumirem.
  const periodoAtual = periodosLetivos.find(p => {
    const [y, m, d] = p.dataInicio.split('-');
    return parseInt(m, 10) - 1 <= currentMonth;
  }) || periodosLetivos[0];

  const [aiY, aiM, aiD] = periodoAtual.dataInicio.split('-');
  const dataInicioValida = new Date(Number(aiY), Number(aiM) - 1, Number(aiD));
  const [afY, afM, afD] = periodoAtual.dataFim.split('-');
  const dataFimValida = new Date(Number(afY), Number(afM) - 1, Number(afD));

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
          
          // Agora verificamos se o dia da semana existe no horário cadastrado para esta turma
          const temAulaHoje = horarioTurma?.some(h => Number(h.dia_semana) === dayOfWeek);
          const isDiaDeAula = temAulaHoje && isWithinPeriod && isPastOrToday;
          
          if (isDiaDeAula) {
            const dayStr = `${day.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}/${year}`;
            const lancamentosDoDia = lancamentos.filter(l => l.data === dayStr && String(l.turmaId) === String(turmaAtiva?.id));
            const temFrequencia = lancamentosDoDia.some(l => l.tipo === 'frequencia');
            const temConteudo = lancamentosDoDia.some(l => l.tipo === 'conteudo');
            
            // Buscar avaliações no dia
            const avaliacoesDoDia = avaliacoes.filter(av => av.data === dayStr && av.turmaId === turmaAtiva?.id);
            const temAvaliacao = avaliacoesDoDia.length > 0;
            
            // Verificar se as avaliações têm notas para todos (ou maioria) dos alunos
            const avaliacoesLancadas = temAvaliacao && avaliacoesDoDia.every(av => {
              const notasDessaAv = alunos.filter(a => a.notas && a.notas[av.id]);
              return notasDessaAv.length > 0; // Se tiver pelo menos uma nota, consideramos "lançada" na legenda visual
            });

            let status: 'none' | 'pending' | 'full' = 'none';
            if (temFrequencia && temConteudo && (!temAvaliacao || avaliacoesLancadas)) status = 'full';
            else if (temFrequencia || temConteudo || temAvaliacao) status = 'pending';

            const fColor = temFrequencia ? 'bg-emerald-500' : 'bg-red-500';
            const cmColor = temConteudo ? 'bg-emerald-500' : 'bg-red-500';
            const aColor = avaliacoesLancadas ? 'bg-emerald-500' : 'bg-red-500';
            
            const bgColor = status === 'none' ? 'bg-red-100/60' : (status === 'pending' ? 'bg-amber-100/60' : 'bg-emerald-100/60');
            
            return (
              <Link 
                key={`day-${day}`}
                to={`/frequencia?date=${dayStr}&turmaId=${turmaAtiva?.id}`}
                className={`min-h-[120px] p-3 border-b border-r border-slate-200 flex justify-between ${bgColor} transition-all group relative hover:shadow-md hover:brightness-95`}
              >
                <div className="flex flex-col justify-between">
                  <span className="text-base font-medium text-slate-700">{day}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className={`w-5 h-5 rounded-full ${fColor} text-white flex items-center justify-center text-[10px] font-black shadow-sm`}>F</span>
                  <span className={`w-5 h-5 rounded-full ${cmColor} text-white flex items-center justify-center text-[10px] font-black shadow-sm`}>CM</span>
                  {temAvaliacao && (
                    <span className={`w-5 h-5 rounded-full ${aColor} text-white flex items-center justify-center text-[10px] font-black shadow-sm`}>A</span>
                  )}
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
