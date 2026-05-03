import { useMemo } from 'react';
import { Avaliacao, Horario, Lancamento, Turma, Aluno } from '../contexts/TurmaContext';
import { APP_CONFIG, PeriodoLetivo } from '../config/appConfig';
import { getBimestrePorData } from '../utils/dateUtils';

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

    let dataInicioValida = new Date(0);
    let dataFimValida = new Date(9999, 11, 31);
    
    if (periodoSelecionado) {
      const [inicioAno, inicioMes, inicioDia] = periodoSelecionado.dataInicio.split('-');
      dataInicioValida = new Date(Number(inicioAno), Number(inicioMes) - 1, Number(inicioDia));
      const [fimAno, fimMes, fimDia] = periodoSelecionado.dataFim.split('-');
      dataFimValida = new Date(Number(fimAno), Number(fimMes) - 1, Number(fimDia));
    }

    let totalEsperado = 0;
    let freqLancadas = 0;
    let conteudoLancados = 0;

    const inicio = new Date(dataInicioValida);
    inicio.setHours(0, 0, 0, 0);
    
    // Limitar o cálculo até HOJE ou até o fim do bimestre (o que for menor)
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    
    const fimBimestre = new Date(dataFimValida);
    fimBimestre.setHours(23, 59, 59, 999);
    
    const fim = hoje < fimBimestre ? hoje : fimBimestre;

    const curso = new Date(inicio.getTime());
    const activeTurmaId = String(turmaAtiva.id).split('||')[0];

    while (curso <= fim) {
      const dow = curso.getDay();
      const temposNoHorario = horarioTurma.filter(h => Number(h.dia_semana) === dow);
      
      if (temposNoHorario.length > 0) {
        const dayStr = `${curso.getDate().toString().padStart(2, '0')}/${(curso.getMonth() + 1).toString().padStart(2, '0')}/${curso.getFullYear()}`;
        
        temposNoHorario.forEach(horario => {
          totalEsperado++;
          
          const temFrequencia = lancamentos.some(l => 
            l.data === dayStr && 
            l.tempo === `${horario.tempo_ordem}º TEMPO` && 
            l.tipo === 'frequencia' &&
            String(l.turmaId).split('||')[0] === activeTurmaId
          );
          
          const temConteudo = lancamentos.some(l => 
            l.data === dayStr && 
            l.tempo === `${horario.tempo_ordem}º TEMPO` && 
            l.tipo === 'conteudo' &&
            String(l.turmaId).split('||')[0] === activeTurmaId
          );

          if (temFrequencia) freqLancadas++;
          if (temConteudo) conteudoLancados++;
        });
      }
      curso.setDate(curso.getDate() + 1);
    }

    const pFreq = totalEsperado > 0 ? Math.min(100, Math.round((freqLancadas / totalEsperado) * 100)) : 0;
    const pObj  = totalEsperado > 0 ? Math.min(100, Math.round((conteudoLancados / totalEsperado) * 100)) : 0;

    const avaliacoesDaTurma = avaliacoes.filter(av => {
      const avTurmaId = String(av.turmaId).split('||')[0];
      if (avTurmaId !== activeTurmaId) return false;
      if (!av.data || !av.data.includes(APP_CONFIG.YEAR.toString()) || av.id.includes('temp_')) return false;
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
