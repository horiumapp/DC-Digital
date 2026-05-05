import { useMemo } from 'react';
import { Avaliacao, Horario, Lancamento, Turma, Aluno } from '../contexts/TurmaContext';
import { APP_CONFIG, PeriodoLetivo } from '../config/appConfig';
import { getBimestrePorData, formatarDataParaISO } from '../utils/dateUtils';

// Interfazes para as dependências e retornos
interface ProgressStats {
  pFreq: number;
  pObj: number;
  pAvaliacoes: number;
  pNotas: number;
  freqLancadas: number;
  conteudoLancados: number;
  totalEsperado: number;
  barColor: (pct: number) => string;
}

/**
 * Conta ocorrências de um dia-da-semana em um intervalo — O(1).
 * Substitui o loop diário anterior que era O(N×dias).
 */
function countWeekDaysInRange(start: Date, end: Date, dayOfWeek: number): number {
  if (start > end) return 0;
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  const fullWeeks = Math.floor(totalDays / 7);
  const remainder = totalDays % 7;
  const startDay = start.getDay();
  let extra = 0;
  for (let i = 0; i < remainder; i++) {
    if ((startDay + i) % 7 === dayOfWeek) { extra = 1; break; }
  }
  return fullWeeks + extra;
}

export function useTurmaProgress(
  turmaAtiva: Turma | null,
  periodoSelecionado: PeriodoLetivo | null,
  lancamentos: Lancamento[],
  horarioTurma: Horario[],
  avaliacoes: Avaliacao[],
  alunos: Aluno[]
): ProgressStats {

  return useMemo(() => {
    const barColor = (pct: number) => {
      if (pct > 75) return 'bg-emerald-500';
      if (pct > 50) return 'bg-amber-400';
      return 'bg-red-500';
    };

    if (!turmaAtiva || !horarioTurma || !periodoSelecionado) {
      return { 
        pFreq: 0, pObj: 0, pAvaliacoes: 0, pNotas: 0, 
        freqLancadas: 0, conteudoLancados: 0, totalEsperado: 0, barColor 
      };
    }

    // Calcular intervalo válido
    const [inicioAno, inicioMes, inicioDia] = periodoSelecionado.dataInicio.split('-').map(Number);
    const inicio = new Date(inicioAno, inicioMes - 1, inicioDia);
    inicio.setHours(0, 0, 0, 0);

    const [fimAno, fimMes, fimDia] = periodoSelecionado.dataFim.split('-').map(Number);
    const fimBimestre = new Date(fimAno, fimMes - 1, fimDia);
    fimBimestre.setHours(23, 59, 59, 999);

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const fim = hoje < fimBimestre ? hoje : fimBimestre;

    const activeTurmaId = String(turmaAtiva.id).split('||')[0];

    // --- O(1): calcular total de aulas esperadas agrupando por dia da semana ---
    let totalEsperado = 0;
    const slotsPorDia = new Map<number, number>(); // dia_semana -> quantidade de tempos
    const temposPorDia = new Map<number, Set<string>>(); // dia_semana -> tempos válidos

    horarioTurma.forEach(h => {
      const dow = Number(h.dia_semana);
      slotsPorDia.set(dow, (slotsPorDia.get(dow) || 0) + 1);
      
      if (!temposPorDia.has(dow)) temposPorDia.set(dow, new Set());
      temposPorDia.get(dow)!.add(`${h.tempo_ordem}º TEMPO`);
    });
    
    slotsPorDia.forEach((qtd, dow) => {
      totalEsperado += countWeekDaysInRange(inicio, fim, dow) * qtd;
    });

    // --- Contar lançamentos com Set para O(1) por lookup ---
    const freqSet = new Set<string>();
    const contSet = new Set<string>();

    lancamentos.forEach(l => {
      if (String(l.turmaId).split('||')[0] !== activeTurmaId) return;
      
      const [lY, lM, lD] = l.data.split('-').map(Number);
      const lDate = new Date(lY, lM - 1, lD);
      if (lDate < inicio || lDate > fim) return;
      
      const dow = lDate.getDay();
      const temposValidos = temposPorDia.get(dow);
      if (!temposValidos || !temposValidos.has(l.tempo)) return;

      const key = `${l.data}|${l.tempo}`;
      if (l.tipo === 'frequencia') freqSet.add(key);
      if (l.tipo === 'conteudo') contSet.add(key);
    });

    const freqLancadas = freqSet.size;
    const conteudoLancados = contSet.size;

    const pFreq = totalEsperado > 0 ? Math.min(100, Math.round((freqLancadas / totalEsperado) * 100)) : 0;
    const pObj  = totalEsperado > 0 ? Math.min(100, Math.round((conteudoLancados / totalEsperado) * 100)) : 0;

    const avaliacoesDaTurma = avaliacoes.filter(av => {
      const avTurmaId = String(av.turmaId).split('||')[0];
      if (avTurmaId !== activeTurmaId) return false;
      if (!av.data || av.id.includes('temp_')) return false;
      const dataIso = formatarDataParaISO(av.data);
      if (!dataIso.startsWith(APP_CONFIG.YEAR.toString())) return false;
      const bNome = av.bimestre || getBimestrePorData(av.data);
      return bNome === periodoSelecionado.nome;
    });
    
    const avaliacoesCadastradas = avaliacoesDaTurma.length;
    const nAulasSemanais = horarioTurma?.length || 0;
    const totalSlotsSemanais = nAulasSemanais > 0 ? nAulasSemanais : (turmaAtiva.tempos?.length || 0);
    const avaliacoesPrevistas = totalSlotsSemanais <= 3 ? 2 : 3;
    
    const pAvaliacoes = (totalEsperado > 0 && avaliacoesPrevistas > 0 && avaliacoesCadastradas > 0) 
      ? Math.min(100, Math.round((avaliacoesCadastradas / avaliacoesPrevistas) * 100)) 
      : 0;

    let notasLancadasCount = 0;
    if (avaliacoesDaTurma.length > 0 && alunos.length > 0) {
      avaliacoesDaTurma.forEach(av => {
        alunos.forEach(aluno => {
          const nota = aluno.notas ? aluno.notas[av.id] : null;
          if (nota !== undefined && nota !== null && nota !== '') {
            notasLancadasCount++;
          }
        });
      });
    }

    const totalNotasEsperadas = avaliacoesDaTurma.length * alunos.length;
    const pNotas = (totalNotasEsperadas > 0 && avaliacoesDaTurma.length > 0) 
      ? Math.min(100, Math.round((notasLancadasCount / totalNotasEsperadas) * 100)) 
      : 0;

    return {
      pFreq, pObj, pAvaliacoes, pNotas, freqLancadas, conteudoLancados, totalEsperado, barColor
    };
  }, [turmaAtiva, periodoSelecionado, lancamentos, horarioTurma, avaliacoes, alunos]);
}
