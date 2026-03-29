import { useState } from 'react';
import { ArrowLeft, Bell, ChevronDown, GraduationCap, Building2, Clock, BookOpen, Folder, CheckSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import CalendarWidget from '../components/common/CalendarWidget';

export default function Diario() {
  const { turmaAtiva, lancamentos } = useTurma();
  const [currentMonth, setCurrentMonth] = useState(1); // 1 = February (0-indexed)
  const year = 2026;

  const periodosLetivos = [
    { id: 1, nome: '1º Bimestre', dataInicio: '2026-02-05', dataFim: '2026-04-23' },
    { id: 2, nome: '2º Bimestre', dataInicio: '2026-04-24', dataFim: '2026-07-07' },
    { id: 3, nome: '3º Bimestre', dataInicio: '2026-07-16', dataFim: '2026-09-24' },
    { id: 4, nome: '4º Bimestre', dataInicio: '2026-09-25', dataFim: '2026-12-14' },
  ];

  const [periodoSelecionadoId, setPeriodoSelecionadoId] = useState(1);
  const periodoSelecionado = periodosLetivos.find(p => p.id === periodoSelecionadoId) || periodosLetivos[0];

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

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

  const calendarDays = getDaysArray();
  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 relative">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 text-center max-w-md relative z-10 w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Nenhuma turma selecionada</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">Por favor, volte à lista de turmas e selecione um diário para visualizar.</p>
          <Link to="/turmas" className="inline-flex flex-1 items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition">
            <ArrowLeft className="w-5 h-5" />
            Voltar para Turmas
          </Link>
        </div>
      </div>
    );
  }

  const calcPercent = (val: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((val / total) * 100);
  };

  // Datas do período selecionado (devem vir ANTES de calcProgressStats)
  let dataInicioValida = new Date(0);
  let dataFimValida = new Date(9999, 11, 31);
  if (periodoSelecionado) {
    const [inicioAno, inicioMes, inicioDia] = periodoSelecionado.dataInicio.split('-');
    dataInicioValida = new Date(Number(inicioAno), Number(inicioMes) - 1, Number(inicioDia));
    const [fimAno, fimMes, fimDia] = periodoSelecionado.dataFim.split('-');
    dataFimValida = new Date(Number(fimAno), Number(fimMes) - 1, Number(fimDia));
  }

  // ─── Cálculo dinâmico de progresso ───────────────────────────────────────
  //
  // Total esperado = (dias letivos passados no bimestre) × (nº de tempos da turma)
  // Um "tempo" gera 1 lançamento de frequência + 1 de conteúdo por dia de aula.
  // Só conta dias que já passaram (até hoje) dentro do bimestre selecionado.

  const calcProgressStats = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 0);

    const tempos = turmaAtiva.tempos.length || 1;
    let totalDiasLetivos = 0;

    // Percorrer todos os dias do bimestre até hoje
    const inicio = dataInicioValida;
    const fim = dataFimValida < today ? dataFimValida : today;

    const cursor = new Date(inicio);
    while (cursor <= fim) {
      const dow = cursor.getDay(); // 0=Dom … 6=Sáb
      if (turmaAtiva.diasDeAula.includes(dow)) {
        totalDiasLetivos++;
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    const totalEsperado = totalDiasLetivos * tempos;

    // Lançamentos reais da turma dentro do período
    const lancamentosDaTurma = lancamentos.filter(l => {
      if (l.turmaId !== turmaAtiva.id) return false;
      // Converter DD/MM/YYYY para Date
      const [d, m, y] = l.data.split('/');
      const dataLanc = new Date(Number(y), Number(m) - 1, Number(d));
      return dataLanc >= dataInicioValida && dataLanc <= dataFimValida;
    });

    const freqLancadas = lancamentosDaTurma.filter(l => l.tipo === 'frequencia').length;
    const conteudoLancados = lancamentosDaTurma.filter(l => l.tipo === 'conteudo').length;

    const pFreq = totalEsperado > 0 ? Math.min(100, Math.round((freqLancadas / totalEsperado) * 100)) : 0;
    const pObj  = totalEsperado > 0 ? Math.min(100, Math.round((conteudoLancados / totalEsperado) * 100)) : 0;

    return { pFreq, pObj, totalEsperado, freqLancadas, conteudoLancados };
  };

  const { pFreq, pObj } = calcProgressStats();

  // Cor dinâmica por porcentagem
  const barColor = (pct: number) => {
    if (pct >= 80) return 'bg-emerald-500';
    if (pct >= 50) return 'bg-amber-400';
    return 'bg-red-500';
  };

  const pAvaliacoes = calcPercent(turmaAtiva.metricas.avaliacoesCadastradas, turmaAtiva.metricas.avaliacoesPrevistas);
  const pNotas = calcPercent(turmaAtiva.metricas.notasLancadas, turmaAtiva.metricas.notasPrevistas);


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative">
      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-6">
        <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        {/* Secondary Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/turmas" className="flex items-center gap-1 px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg border border-blue-200 hover:bg-blue-200 transition">
              <ArrowLeft className="w-4 h-4" /> 
              Voltar
            </Link>
            <h2 className="text-xl font-medium text-slate-700 dark:text-slate-100">
              {turmaAtiva.ensino} - {turmaAtiva.fase}
              <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded ml-2">Ano: 2026</span>
            </h2>
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-md transition">
              <Bell className="w-4 h-4" /> 
              Notificações 
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Info Cards */}
        <div className="bg-white/70 dark:bg-slate-800/70 rounded-2xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="grid grid-cols-4 gap-4">
            <div className="flex items-center gap-3 bg-blue-50/50 dark:bg-slate-700/50 p-4 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-slate-600 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Professor</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100" title={turmaAtiva.professor}>
                  {turmaAtiva.professor.length > 20 ? turmaAtiva.professor.substring(0, 18) + '...' : turmaAtiva.professor}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-blue-50/50 dark:bg-slate-700/50 p-4 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-slate-600 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Escola</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{turmaAtiva.escola}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-blue-50/50 dark:bg-slate-700/50 p-4 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-slate-600 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Turno</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{turmaAtiva.turno}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 bg-blue-50/50 dark:bg-slate-700/50 p-4 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-slate-600 flex items-center justify-center text-blue-700 dark:text-blue-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Componente</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">{turmaAtiva.componente}</p>
              </div>
            </div>
          </div>

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
                className="w-full border border-slate-300 dark:border-slate-600 rounded-lg text-base bg-white dark:bg-slate-700 dark:text-slate-100 p-2.5 outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
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
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h4 className="text-base font-bold text-slate-700 mb-6">Lançamentos da Turma</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Frequências</span> <span>{pFreq}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pFreq)} transition-all duration-1000`} style={{ width: `${pFreq}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Objetos de Conhecimento Ministrados</span> <span>{pObj}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor(pObj)} transition-all duration-1000`} style={{ width: `${pObj}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Avaliações</span> <span>{pAvaliacoes}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${pAvaliacoes}%` }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                    <span>Notas</span> <span>{pNotas}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${pNotas}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <h4 className="text-base font-bold text-slate-700">Aparata</h4>
                <Link to="/aparata" className="bg-blue-600 hover:bg-blue-700 transition text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1">
                  <Folder className="w-4 h-4" /> 
                  Ver aparata
                </Link>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Situação</span>
                  <span className="bg-emerald-500 text-white px-2 py-0.5 rounded-full">ABERTO</span>
                </div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                  <span>Sincronização</span>
                  <span className="bg-red-500 text-white px-2 py-0.5 rounded-full uppercase">Não</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <h4 className="text-base font-bold text-slate-700">Atividades da Turma</h4>
                <button className="bg-blue-600 hover:bg-blue-700 transition text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1">
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
              dataInicioValida={dataInicioValida}
              dataFimValida={dataFimValida}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

