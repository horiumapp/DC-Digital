import { PageHeading } from '../components/common/PortalUI';
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
import { getBimestrePorData, formatarDataParaExibicao } from '../utils/dateUtils';
import { carregarFeriados, nomeFeriado } from '../services/feriados';

export default function Frequencia() {
  const { turmaAtiva, horarioTurma, lancamentos, verificarPeriodoFechado } = useTurma();
  const [searchParams] = useSearchParams();
  const selectedDateParam = searchParams.get('date') || `${APP_CONFIG.YEAR}-02-06`;
  const veioDaChamadaRapida = searchParams.get('origem') === 'ultima-aula';
  const periodoDaChamada = searchParams.get('periodo');

  // ── Shared state ──
  const [activeTab, setActiveTab] = useState('frequencia');
  const [selectedDate, setSelectedDate] = useState(selectedDateParam);
  
  const [feriadosVersao, setFeriadosVersao] = useState(0);
  React.useEffect(() => {
    carregarFeriados(APP_CONFIG.YEAR).finally(() => setFeriadosVersao(valor => valor + 1));
  }, []);

  const isPeriodoFechado = React.useMemo(() => {
    return verificarPeriodoFechado(selectedDate);
  }, [selectedDate, verificarPeriodoFechado]);
  const feriadoNome = React.useMemo(() => nomeFeriado(selectedDate), [selectedDate, feriadosVersao]);
  const somenteLeitura = isPeriodoFechado || Boolean(feriadoNome);
  
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

  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090e17] flex items-center justify-center p-6">
        <div role="status" className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Escolha a turma para lançar</h2>
          <p className="text-slate-500 mb-6">A frequência, o conteúdo e as avaliações são lançados por turma e componente. Depois de escolher, você volta direto para esta tela.</p>
          <Link to="/turmas?destino=frequencia" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#6354c7] text-white font-bold rounded-xl hover:opacity-90 transition">
            Escolher turma
          </Link>
        </div>
      </div>
    );
  }

  const registeredTimes=(tipo:'frequencia'|'conteudo')=>new Set(lancamentos.filter(l=>l.data===selectedDate&&l.tipo===tipo&&String(l.turmaId).split('||')[0]===String(turmaAtiva.id).split('||')[0]&&temposValidosDoDia.includes(l.tempo)).map(l=>l.tempo)).size;
  const steps = [{id:'frequencia',title:'Frequência',hint:'Quem esteve com você'},{id:'objeto',title:'Conteúdo',hint:'O que foi ensinado'},{id:'anotacoes',title:'Anotações',hint:'O que vale lembrar'},{id:'avaliacoes',title:'Avaliações',hint:'Como a turma avançou'}];
  return <div className="portal-page portal-lesson"><PageHeading eyebrow="SEU DIÁRIO EM AÇÃO" title="Registro da aula" description={turmaAtiva.fase+' · '+turmaAtiva.componente} actions={<Link className="portal-button secondary" to={'/diario?date='+selectedDate}><ArrowLeft size={16}/>Voltar ao diário</Link>}/>
        {feriadoNome && (
          <div className="bg-amber-50 text-amber-950 border-b border-amber-200 px-4 py-2.5 sm:px-8 text-xs sm:text-sm">
            <strong className="font-bold">Feriado:</strong> {feriadoNome}. Não há aula neste dia. O que já foi lançado continua visível, sem edição.
          </div>
        )}

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

        {veioDaChamadaRapida && (
          <div role="status" className="bg-sky-50 text-sky-950 border-b border-sky-200 px-4 py-2.5 sm:px-8 text-xs sm:text-sm">
            Chamada rápida abriu a última aula do {periodoDaChamada || 'bimestre aberto'}: {formatarDataParaExibicao(selectedDate)}. Esse é o bimestre ainda aberto com dia de aula previsto. Troque a data ao lado para lançar outro dia.
          </div>
        )}


    <div className="portal-lesson-workspace"><div className="portal-lesson-toolbar"><div className="portal-lesson-date"><CalendarIcon size={20}/><label htmlFor="lesson-date">DATA DA AULA</label><input id="lesson-date" aria-label="Data da aula" type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}/><span>{getBimestrePorData(selectedDate)||'Período letivo'}</span></div><p className="portal-lesson-rail-note">Confira a turma, a data e o tempo antes de gravar cada etapa.</p></div><nav className="portal-lesson-steps" aria-label="Etapas do registro">{steps.map((step,index)=><button key={step.id} aria-pressed={activeTab===step.id} onClick={()=>handleTabChange(step.id)}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{step.title}</strong><small>{step.id==='frequencia'||step.id==='objeto'?`${registeredTimes(step.id==='frequencia'?'frequencia':'conteudo')} de ${temposValidosDoDia.length} tempos registrados`:step.hint}</small></div></button>)}</nav><section className="portal-lesson-content"><header><span className="portal-eyebrow">REGISTRO DA AULA · {formatarDataParaExibicao(selectedDate)}</span><h2>{steps.find(s=>s.id===activeTab)?.title}</h2><p>{steps.find(s=>s.id===activeTab)?.hint}.</p></header><details className="portal-step-help"><summary>Como usar esta etapa</summary><p>{activeTab==='frequencia'?'Abra o lançamento, confira as presenças de cada estudante e confirme a gravação. As marcações só são salvas após confirmar.':activeTab==='objeto'?'Selecione o tempo da aula e registre os objetos de conhecimento e as habilidades trabalhadas.':activeTab==='anotacoes'?'Registre as observações pedagógicas relacionadas à aula e confirme a gravação.':'Cadastre as avaliações e confira as notas de cada estudante nos controles desta etapa.'}</p></details><div className="portal-lesson-form">              {activeTab === 'frequencia' && (
                <FrequenciaTab
                  selectedDate={selectedDate}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                  disabled={somenteLeitura}
                  onDiaSemPendencia={() => handleTabChange('objeto')}
                />
              )}
              {activeTab === 'objeto' && (
                <ObjetoConhecimentoTab
                  turmaAtiva={turmaAtiva}
                  selectedDate={selectedDate}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                  disabled={somenteLeitura}
                />
              )}
              {activeTab === 'anotacoes' && (
                <AnotacoesTab
                  turmaAtiva={turmaAtiva}
                  selectedDate={selectedDate}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                  disabled={somenteLeitura}
                />
              )}
              {activeTab === 'avaliacoes' && (
                <AvaliacoesTab 
                  selectedDate={selectedDate}
                  disabled={somenteLeitura} 
                />
              )}</div></section></div></div>;
}
