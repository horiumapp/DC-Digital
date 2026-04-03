import { useState } from 'react';
import { ArrowLeft, Bell, ChevronDown, BookOpen, Folder, CheckSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { APP_CONFIG } from '../config/appConfig';
import CalendarWidget from '../components/common/CalendarWidget';
import { useTurmaProgress } from '../hooks/useTurmaProgress';
import TurmaHeaderInfo from '../components/common/TurmaHeaderInfo';

export default function Diario() {
  const { turmaAtiva, lancamentos, avaliacoes, alunos, horarioTurma } = useTurma();
  const [currentMonth, setCurrentMonth] = useState(1); // 1 = February (0-indexed)
  const year = APP_CONFIG.YEAR;

  const periodosLetivos = APP_CONFIG.BIMESTRES;

  const [periodoSelecionadoId, setPeriodoSelecionadoId] = useState(1);
  const periodoSelecionado = periodosLetivos.find(p => p.id === periodoSelecionadoId) || periodosLetivos[0];

  const handlePrevMonth = () => {
    if (currentMonth > 0) {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth < 11) {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const getDaysArray = () => {
    const daysInMonth = new Date(year, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, currentMonth, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

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

  const { pFreq, pObj, pAvaliacoes, pNotas, barColor } = useTurmaProgress(
    turmaAtiva, 
    periodoSelecionado, 
    lancamentos, 
    horarioTurma, 
    avaliacoes, 
    alunos
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative">
      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-6">
        <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        {/* Secondary Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/turmas" className="flex items-center gap-1 px-4 py-2 bg-[#eef2ff] text-[#0f2851] text-sm font-bold rounded-xl border border-blue-100 hover:bg-[#e0e7ff] transition">
              <ArrowLeft className="w-4 h-4" /> 
              Voltar
            </Link>
            <h2 className="text-xl font-medium text-slate-700 dark:text-slate-100">
              {turmaAtiva.ensino} - {turmaAtiva.fase}
              <span className="bg-green-100 text-green-700 text-sm font-bold px-3 py-1 rounded-full border border-green-200 ml-2">Ano: {APP_CONFIG.YEAR}</span>
            </h2>
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 bg-[#0f2851] hover:bg-[#1a3a6d] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#0f2851]/20 transition">
              <Bell className="w-4 h-4" /> 
              Notificações 
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Info Cards */}
        <div className="bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <TurmaHeaderInfo turmaAtiva={turmaAtiva} />

          <div className="flex flex-col lg:flex-row gap-8 mt-6">
            <div className="w-full lg:w-[340px] shrink-0">
              <label className="text-sm font-bold text-slate-500 dark:text-slate-300 mb-1 block">Período letivo</label>
              <select 
                value={periodoSelecionadoId}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setPeriodoSelecionadoId(newId);
                  const selectedPeriod = periodosLetivos.find(p => p.id === newId);
                  if (selectedPeriod) {
                    const month = parseInt(selectedPeriod.dataInicio.split('-')[1], 10) - 1;
                    setCurrentMonth(month);
                  }
                }}
                className="w-full border border-slate-300 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-slate-100 px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] cursor-pointer font-bold text-[#0f2851]"
              >
                {periodosLetivos.map(p => {
                  const format = (d: string) => d.split('-').reverse().join('/');
                  return (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({format(p.dataInicio)} - {format(p.dataFim)})
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-bold text-slate-500 dark:text-slate-300 mb-1 block">Legenda</label>
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-200">
                  <span className="w-4 h-4 rounded bg-blue-500 text-white flex items-center justify-center text-[10px]">F</span> Frequência
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-200">
                  <span className="w-4 h-4 rounded bg-blue-400 text-white flex items-center justify-center text-[10px]">A</span> Avaliação
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-200">
                  <span className="w-4 h-4 rounded bg-blue-700 text-white flex items-center justify-center text-[10px]">CM</span> Objeto de Conhecimento Ministrado
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-200">
                  <span className="w-4 h-4 rounded-full bg-emerald-500"></span> Concluído
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-200">
                  <span className="w-4 h-4 rounded-full bg-amber-400"></span> Iniciado
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-200">
                  <span className="w-4 h-4 rounded-full bg-red-500"></span> Pendente
                </span>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold text-slate-600 dark:text-slate-200">
                  <span className="w-4 h-4 rounded-full bg-blue-500"></span> Hoje
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm transition-all">
              <h4 className="text-base font-bold text-slate-700 mb-6 uppercase tracking-tight">Lançamentos da Turma</h4>
              
              <div className="space-y-4">
                {/* Frequência */}
                <div>
                  <div className="flex justify-between text-[12px] font-bold text-slate-500 mb-1.5 uppercase">
                    <span>Frequências</span> <span>{pFreq}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pFreq)} transition-all duration-1000`} style={{ width: `${pFreq}%` }}></div>
                  </div>
                </div>

                {/* Objetos */}
                <div>
                  <div className="flex justify-between text-[12px] font-bold text-slate-500 mb-1.5 uppercase">
                    <span>Objetos de Conhecimento Ministrados</span> <span>{pObj}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pObj)} transition-all duration-1000`} style={{ width: `${pObj}%` }}></div>
                  </div>
                </div>

                {/* Avaliações */}
                <div>
                  <div className="flex justify-between text-[12px] font-bold text-slate-500 mb-1.5 uppercase">
                    <span>Avaliações</span> <span>{pAvaliacoes}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pAvaliacoes)} transition-all duration-1000`} style={{ width: `${pAvaliacoes}%` }}></div>
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <div className="flex justify-between text-[12px] font-bold text-slate-500 mb-1.5 uppercase">
                    <span>Notas</span> <span>{pNotas}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pNotas)} transition-all duration-1000`} style={{ width: `${pNotas}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-tight">Aparata</h4>
                <Link to="/aparata" className="bg-[#0f2851] hover:bg-[#1a3a6d] transition text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-[#0f2851]/20">
                  <Folder className="w-4 h-4" /> 
                  Ver aparata
                </Link>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 uppercase">
                  <span>Situação</span>
                  <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px]">ABERTO</span>
                </div>
                <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 uppercase">
                  <span>Sincronização</span>
                  <span className="bg-red-500 text-white px-2.5 py-1 rounded-full text-[10px]">NÃO</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-700">Atividades da Turma</h4>
                <button className="bg-[#0f2851] hover:bg-[#1a3a6d] transition text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-lg shadow-[#0f2851]/20">
                  <CheckSquare className="w-4 h-4" /> 
                  Ver atividades
                </button>
              </div>
            </div>
          </div>

          {/* Calendar Section */}
          <div className="col-span-8">
            <CalendarWidget
              year={year}
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              turmaAtiva={turmaAtiva}
              lancamentos={lancamentos}
              avaliacoes={avaliacoes}
              alunos={alunos}
              horarioTurma={horarioTurma}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

