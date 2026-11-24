import React, { Suspense, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useTurma } from '../contexts/TurmaContext';
import { APP_CONFIG } from '../config/appConfig';
import { getDayOfWeek, formatarDataParaExibicao } from '../utils/dateUtils';
import { carregarFeriados, nomeFeriado } from '../services/feriados';
import {
  buildFrequenciaUltimaAulaUrl,
  resolverUltimaAulaBimestreAberto,
} from '../utils/entradaFrequencia';
import { tempoTemFrequencia } from '../utils/frequenciaFluxo';
import { useToast } from '../components/common/Toast';

const FrequenciaTab = React.lazy(() => import('../components/frequencia/FrequenciaTab'));
const ObjetoConhecimentoTab = React.lazy(() => import('../components/frequencia/ObjetoConhecimentoTab'));
const AnotacoesTab = React.lazy(() => import('../components/frequencia/AnotacoesTab'));
const AvaliacoesTab = React.lazy(() => import('../components/frequencia/AvaliacoesTab'));

function TabLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-slate-500" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span className="text-sm font-medium">Carregando…</span>
    </div>
  );
}

export default function Frequencia() {
  const { turmaAtiva, horarioTurma, lancamentos, verificarPeriodoFechado, loading } = useTurma();
  const { showWarning } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateFromUrl = searchParams.get('date');
  const precisaEntradaInteligente = !dateFromUrl;
  const selectedDateParam = dateFromUrl || '';
  const veioDaChamadaRapida = searchParams.get('origem') === 'ultima-aula';
  const periodoDaChamada = searchParams.get('periodo');

  // ── Shared state ──
  const [activeTab, setActiveTab] = useState('frequencia');
  const [selectedDate, setSelectedDate] = useState(selectedDateParam);
  const [entradaErro, setEntradaErro] = useState<string | null>(null);
  
  const [feriadosVersao, setFeriadosVersao] = useState(0);
  React.useEffect(() => {
    carregarFeriados(APP_CONFIG.YEAR).finally(() => setFeriadosVersao(valor => valor + 1));
  }, []);

  // Sem ?date= na URL: abre a última aula do bimestre aberto (não o 1º bimestre fixo).
  React.useEffect(() => {
    if (!precisaEntradaInteligente || !turmaAtiva || loading) return;

    const diasComAula = [...new Set(
      horarioTurma.length > 0
        ? horarioTurma.map(horario => Number(horario.dia_semana))
        : turmaAtiva.diasDeAula
    )];

    const resultado = resolverUltimaAulaBimestreAberto({
      diasComAula,
      verificarPeriodoFechado,
      isFeriado: data => Boolean(nomeFeriado(data)),
    });

    if (resultado.ok) {
      setEntradaErro(null);
      navigate(buildFrequenciaUltimaAulaUrl(String(turmaAtiva.id), resultado), { replace: true });
      return;
    }

    if (resultado.motivo === 'sem-horario') {
      setEntradaErro('Não há horários cadastrados para esta turma. Cadastre os horários antes de lançar.');
    } else if (resultado.motivo === 'sem-bimestre-aberto') {
      setEntradaErro('Não há bimestre aberto para esta turma. Use o Diário para consultar períodos encerrados.');
    } else {
      setEntradaErro(`Não há dia de aula no período ${resultado.periodoNome || 'aberto'} para esta turma.`);
    }
  }, [
    precisaEntradaInteligente,
    turmaAtiva,
    loading,
    horarioTurma,
    verificarPeriodoFechado,
    navigate,
    feriadosVersao,
  ]);

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
   

  const abrirAbaConteudo = (opts?: { aposFrequenciaSalva?: boolean; tempoRecemSalvo?: string }) => {
    const tempoRecemSalvo = opts?.tempoRecemSalvo;
    const temFrequencia = (tempo: string) =>
      tempo === tempoRecemSalvo || tempoTemFrequencia(selectedDate, tempo, lancamentos);

    // Clique manual na aba: só entra se já houver frequência no dia.
    // Após salvar o último tempo, o estado de lancamentos ainda pode estar
    // atrasado — nesse caso confiamos no fluxo "dia sem pendência".
    if (!opts?.aposFrequenciaSalva && !temposParaMostrar.some(temFrequencia)) {
      showWarning('Lance a frequência antes de registrar o conteúdo.');
      setActiveTab('frequencia');
      const pendingFreq = temposParaMostrar.find(t => !temFrequencia(t));
      if (pendingFreq) setTempoAula(pendingFreq);
      return;
    }

    setActiveTab('objeto');

    const pendingComFrequencia = temposParaMostrar.find(t =>
      temFrequencia(t) &&
      !lancamentos.some(l => l.data === selectedDate && l.tempo === t && l.tipo === 'conteudo')
    );
    if (pendingComFrequencia) {
      setTempoAula(pendingComFrequencia);
      return;
    }

    const comFrequencia = temposParaMostrar.find(temFrequencia);
    if (comFrequencia) setTempoAula(comFrequencia);
  };

  const handleTabChange = (tab: string) => {
    if (tab === 'objeto') {
      abrirAbaConteudo();
      return;
    }

    setActiveTab(tab);

    if (tab === 'frequencia') {
      const pendingTempo = temposParaMostrar.find(t =>
        !tempoTemFrequencia(selectedDate, t, lancamentos)
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

  if (precisaEntradaInteligente) {
    if (entradaErro) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#090e17] flex items-center justify-center p-6">
          <div role="alert" className="bg-white border border-slate-200 rounded-2xl p-8 max-w-md w-full text-center">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Não foi possível abrir o lançamento</h2>
            <p className="text-slate-500 mb-6">{entradaErro}</p>
            <div className="flex flex-col gap-3">
              <Link to="/diario" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#6354c7] text-white font-bold rounded-xl hover:opacity-90 transition">
                Ir ao Diário
              </Link>
              <Link to="/turmas" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition">
                Trocar turma
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090e17] flex items-center justify-center p-6">
        <div role="status" className="flex items-center gap-2 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm font-medium">Abrindo a última aula do bimestre aberto…</span>
        </div>
      </div>
    );
  }

  const registeredTimes=(tipo:'frequencia'|'conteudo')=>new Set(lancamentos.filter(l=>l.data===selectedDate&&l.tipo===tipo&&String(l.turmaId).split('||')[0]===String(turmaAtiva.id).split('||')[0]&&temposValidosDoDia.includes(l.tempo)).map(l=>l.tempo)).size;
  const steps = [{id:'frequencia',title:'Frequência',hint:'Quem esteve com você'},{id:'objeto',title:'Conteúdo',hint:'O que foi ensinado'},{id:'anotacoes',title:'Anotações',hint:'O que vale lembrar'},{id:'avaliacoes',title:'Avaliações',hint:'Como a turma avançou'}];
  return <div className="portal-page portal-lesson">
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
            Última aula do {periodoDaChamada || 'bimestre aberto'}: {formatarDataParaExibicao(selectedDate)}. Esse é o bimestre ainda aberto com dia de aula previsto.
          </div>
        )}


    <div className="portal-lesson-workspace"><nav className="portal-lesson-steps" aria-label="Etapas do registro">{steps.map((step,index)=><button key={step.id} aria-pressed={activeTab===step.id} onClick={()=>handleTabChange(step.id)}><span>{String(index+1).padStart(2,'0')}</span><div><strong>{step.title}</strong><small>{step.id==='frequencia'||step.id==='objeto'?`${registeredTimes(step.id==='frequencia'?'frequencia':'conteudo')} de ${temposValidosDoDia.length} tempos registrados`:step.hint}</small></div></button>)}</nav><section className="portal-lesson-content"><header><span className="portal-eyebrow">REGISTRO DA AULA · {formatarDataParaExibicao(selectedDate)}</span><h2>{steps.find(s=>s.id===activeTab)?.title}</h2></header><div className="portal-lesson-form">
              <Suspense fallback={<TabLoading />}>
              {activeTab === 'frequencia' && (
                <FrequenciaTab
                  selectedDate={selectedDate}
                  tempoAula={tempoAula}
                  setTempoAula={setTempoAula}
                  disponiveisTempos={temposParaMostrar}
                  disabled={somenteLeitura}
                  onDiaSemPendencia={() => abrirAbaConteudo({ aposFrequenciaSalva: true, tempoRecemSalvo: tempoAula })}
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
              )}
              </Suspense>
              </div></section></div></div>;
}
