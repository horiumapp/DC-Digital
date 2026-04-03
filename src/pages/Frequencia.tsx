import React, { useState } from 'react';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { useAuth } from '../contexts/AuthContext';
import { getDayOfWeek } from '../utils/dateUtils';

import FrequenciaTab from '../components/frequencia/FrequenciaTab';
import ObjetoConhecimentoTab from '../components/frequencia/ObjetoConhecimentoTab';
import AnotacoesTab from '../components/frequencia/AnotacoesTab';
import AvaliacoesTab from '../components/frequencia/AvaliacoesTab';

export default function Frequencia() {
  const { turmaAtiva, horarioTurma } = useTurma();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedDateParam = searchParams.get('date') || '06/02/2026';

  // ── Shared state ──
  const [activeTab, setActiveTab] = useState('frequencia');
  const [selectedDate, setSelectedDate] = useState(selectedDateParam);
  
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
  const temposParaMostrar = temposValidosDoDia.length > 0 ? temposValidosDoDia : ['1º TEMPO'];

  const [tempoAula, setTempoAula] = useState(temposParaMostrar[0]);

  // Sincronizar data da URL
  React.useEffect(() => { setSelectedDate(selectedDateParam); }, [selectedDateParam]);

  // Resetar o tempo quando a data mudar (se o tempo atual não for válido para o novo dia)
  React.useEffect(() => {
    if (!temposParaMostrar.includes(tempoAula)) {
      setTempoAula(temposParaMostrar[0]);
    }
  }, [selectedDate, temposParaMostrar]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 relative pb-20">
      <div className="relative z-10">
        {/* SubHeader */}
        <div className="bg-indigo-50/50 px-8 py-3 flex items-center justify-between border-b border-indigo-100">
          <div className="flex items-center gap-4">
            <Link to="/diario" className="bg-blue-100 text-blue-700 px-4 py-2 rounded flex items-center gap-2 text-sm font-semibold border border-blue-200 hover:bg-blue-200 transition">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <div className="flex items-center gap-3">
              <h2 className="text-slate-800 text-base font-medium">{turmaAtiva?.ensino} - {turmaAtiva?.fase}</h2>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-md border border-emerald-100 uppercase tracking-widest">Ano: 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-200 rounded flex items-center overflow-hidden">
              <span className="px-3 py-1.5 text-sm text-slate-600">{selectedDate}</span>
              <button className="bg-blue-600 text-white p-2 hover:bg-blue-700 transition">
                <CalendarIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="p-8 max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

            {/* Info Cards */}
            <div className="p-6 bg-slate-50/50 border-b border-slate-200">
              <div className="grid grid-cols-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" /></svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Professor</p>
                    <p className="text-sm font-medium text-slate-800">{user?.name?.toUpperCase() || 'NÃO IDENTIFICADO'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Escola</p>
                    <p className="text-sm font-medium text-slate-800 truncate">{turmaAtiva?.escola}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Turno</p>
                    <p className="text-sm font-medium text-slate-800 uppercase">{turmaAtiva?.turno}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Período</p>
                    <p className="text-sm font-medium text-slate-800">1. BIMESTRE</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Componente</p>
                    <p className="text-sm font-medium text-slate-800 uppercase truncate">{turmaAtiva?.componente}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6">
              {(['frequencia', 'objeto', 'anotacoes', 'avaliacoes'] as const).map((tab) => {
                const labels: Record<string, string> = { frequencia: 'Frequência', objeto: 'Objeto de Conhecimento', anotacoes: 'Anotações', avaliacoes: 'Avaliações' };
                return (
                  <button key={tab} onClick={() => handleTabChange(tab)}
                    className={`px-4 py-3 text-sm font-medium transition ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'}`}>
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* Content Area */}
            <div className="p-6">
              {activeTab === 'frequencia' && (
                <FrequenciaTab
                  selectedDate={selectedDate}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                />
              )}
              {activeTab === 'objeto' && (
                <ObjetoConhecimentoTab
                  turmaAtiva={turmaAtiva}
                  selectedDate={selectedDate}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                />
              )}
              {activeTab === 'anotacoes' && (
                <AnotacoesTab
                  turmaAtiva={turmaAtiva}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                />
              )}
              {activeTab === 'avaliacoes' && (
                <AvaliacoesTab />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
