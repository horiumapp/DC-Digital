import React, { useState } from 'react';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { APP_CONFIG } from '../config/appConfig';
import { getDayOfWeek } from '../utils/dateUtils';

import FrequenciaTab from '../components/frequencia/FrequenciaTab';
import ObjetoConhecimentoTab from '../components/frequencia/ObjetoConhecimentoTab';
import AnotacoesTab from '../components/frequencia/AnotacoesTab';
import AvaliacoesTab from '../components/frequencia/AvaliacoesTab';
import { getBimestrePorData } from '../utils/dateUtils';

export default function Frequencia() {
  const { turmaAtiva, horarioTurma, lancamentos, verificarPeriodoFechado } = useTurma();
  const [searchParams] = useSearchParams();
  const selectedDateParam = searchParams.get('date') || `${APP_CONFIG.YEAR}-02-06`;

  // ── Shared state ──
  const [activeTab, setActiveTab] = useState('frequencia');
  const [selectedDate, setSelectedDate] = useState(selectedDateParam);
  
  const isPeriodoFechado = React.useMemo(() => {
    return verificarPeriodoFechado(selectedDate);
  }, [selectedDate, verificarPeriodoFechado]);
  
  // Obter tempos válidos para o dia selecionado
  const dow = getDayOfWeek(selectedDate);
  const temposValidosDoDia = React.useMemo(() => {
    if (!turmaAtiva || !horarioTurma) return [];
    return horarioTurma
      .filter(h => Number(h.dia_semana) === dow)
      .sort((a, b) => a.tempo_ordem - b.tempo_ordem)
      .map(h => `${h.tempo_ordem}º TEMPO`);
  }, [horarioTurma, dow, turmaAtiva]);

  // Se não houver aula no dia, mostramos pelo menos o 1º tempo como fallback para não quebrar a UI
  const temposParaMostrar = React.useMemo(() => {
    return temposValidosDoDia.length > 0 ? temposValidosDoDia : ['1º TEMPO'];
  }, [temposValidosDoDia]);

  const [tempoAula, setTempoAula] = useState(temposParaMostrar[0]);

  // Sincronizar data da URL
   
  React.useEffect(() => { setSelectedDate(selectedDateParam); }, [selectedDateParam]);
   

  // Resetar o tempo quando a data mudar (se o tempo atual não for válido para o novo dia)
   
  React.useEffect(() => {
    if (!temposParaMostrar.includes(tempoAula)) {
      setTempoAula(temposParaMostrar[0]);
    }
  }, [selectedDate, temposParaMostrar, tempoAula, setTempoAula]);
   

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    
    if (tab === 'objeto') {
      const pendingTempo = temposParaMostrar.find(t => 
        !lancamentos.some(l => l.data === selectedDate && l.tempo === t && l.tipo === 'conteudo')
      );
      if (pendingTempo) {
        setTempoAula(pendingTempo);
      }
    } else if (tab === 'frequencia') {
      const pendingTempo = temposParaMostrar.find(t => 
        !lancamentos.some(l => l.data === selectedDate && l.tempo === t && l.tipo === 'frequencia')
      );
      if (pendingTempo) {
        setTempoAula(pendingTempo);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090e17] relative pb-20">
      <div className="relative z-10">
        {/* Banner de Período Fechado */}
        {isPeriodoFechado && (
          <div className="bg-amber-600 text-white px-4 py-2.5 sm:px-8 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 text-xs font-semibold">
              <span className="text-base">⚠️</span>
              <div>
                <strong className="font-bold">Bimestre Fechado:</strong> Este período foi encerrado para lançamentos. As informações abaixo estão em modo somente leitura.
              </div>
            </div>
          </div>
        )}

        {/* Workspace Sticky Action Bar */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 px-4 py-3 sm:px-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Link 
                to="/diario" 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> 
                <span>Diário</span>
              </Link>

              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-[#0b1f3f] dark:text-sky-300 tracking-tight">
                  {turmaAtiva?.fase}
                </h2>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-sky-300 font-bold text-xs rounded-md border border-blue-100 dark:border-blue-900">
                  {turmaAtiva?.componente}
                </span>
                <span className="text-slate-300 dark:text-slate-600 text-xs">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {getBimestrePorData(selectedDate) || 'Período Letivo'}
                </span>
              </div>
            </div>

            {/* Date Picker Control */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-xs">
                <CalendarIcon className="w-3.5 h-3.5 text-blue-600 dark:text-sky-400 mr-2 shrink-0" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="text-xs font-bold text-[#0b1f3f] dark:text-slate-100 bg-transparent outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Workspace */}
        <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200/90 dark:border-slate-800 overflow-hidden">
            {/* Pedagogical Tabs */}
            <div className="flex overflow-x-auto border-b border-slate-200/90 dark:border-slate-800 px-4 sm:px-6 bg-slate-50/50 dark:bg-slate-800/40 gap-1">
              {(['frequencia', 'objeto', 'anotacoes', 'avaliacoes'] as const).map((tab) => {
                const labels: Record<string, string> = { 
                  frequencia: 'Chamada & Frequência', 
                  objeto: 'Conteúdo Ministrado', 
                  anotacoes: 'Anotações Pedagógicas', 
                  avaliacoes: 'Avaliações & Notas' 
                };
                const isActive = activeTab === tab;
                return (
                  <button 
                    key={tab} 
                    onClick={() => handleTabChange(tab)}
                    className={`shrink-0 px-4 py-3.5 text-xs font-bold transition-all relative cursor-pointer ${
                      isActive 
                        ? 'text-[#0b1f3f] dark:text-sky-300' 
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {labels[tab]}
                    {isActive && (
                      <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#0b1f3f] dark:bg-sky-400 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="p-4 sm:p-6">
              {activeTab === 'frequencia' && (
                <FrequenciaTab
                  selectedDate={selectedDate}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                  disabled={isPeriodoFechado}
                />
              )}
              {activeTab === 'objeto' && (
                <ObjetoConhecimentoTab
                  turmaAtiva={turmaAtiva}
                  selectedDate={selectedDate}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                  disabled={isPeriodoFechado}
                />
              )}
              {activeTab === 'anotacoes' && (
                <AnotacoesTab
                  turmaAtiva={turmaAtiva}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                  disabled={isPeriodoFechado}
                />
              )}
              {activeTab === 'avaliacoes' && (
                <AvaliacoesTab 
                  selectedDate={selectedDate}
                  disabled={isPeriodoFechado} 
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
