import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';

export interface PendenciaDocente {
  professor: string;
  dataLotacao: string;
  periodo: string;
  turno: string;
  ensino: string;
  fase: string;
  turma: string;
  componente: string;
  pendNotas: number;
  pendFreq: number;
  pendObjeto: number;
  unidade?: string;
}

const PERIOD_DATES: Record<string, { start: Date; end: Date }> = {
  '1. BIMESTRE': { start: new Date(APP_CONFIG.YEAR, 1, 2), end: new Date(APP_CONFIG.YEAR, 3, 23) },
  '2. BIMESTRE': { start: new Date(APP_CONFIG.YEAR, 3, 24), end: new Date(APP_CONFIG.YEAR, 6, 7) },
  '3. BIMESTRE': { start: new Date(APP_CONFIG.YEAR, 6, 27), end: new Date(APP_CONFIG.YEAR, 8, 24) },
  '4. BIMESTRE': { start: new Date(APP_CONFIG.YEAR, 8, 25), end: new Date(APP_CONFIG.YEAR, 11, 18) },
  '1. SEMESTRE': { start: new Date(APP_CONFIG.YEAR, 1, 2), end: new Date(APP_CONFIG.YEAR, 6, 7) },
  '2. SEMESTRE': { start: new Date(APP_CONFIG.YEAR, 6, 27), end: new Date(APP_CONFIG.YEAR, 11, 18) },
  'ÚNICO': { start: new Date(APP_CONFIG.YEAR, 1, 2), end: new Date(APP_CONFIG.YEAR, 11, 18) },
  'RECUPERAÇÃO': { start: new Date(APP_CONFIG.YEAR, 11, 19), end: new Date(APP_CONFIG.YEAR, 11, 30) },
};

/**
 * Conta quantos dias de aula existem para um dia da semana (0-6) em um intervalo.
 */
function countWeekDaysInRange(start: Date, end: Date, dayOfWeek: number): number {
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() === dayOfWeek) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
}

export const fetchPendenciasPorEscola = async (
  escolaId: string, 
  periodosSelecionados: string[]
): Promise<PendenciaDocente[]> => {
  try {
    const { data: horarios, error: hError } = await supabase
      .from('professor_horarios')
      .select('*, turmas(id, nome, turno), professores(id, nome)')
      .eq('escola_id', escolaId);

    if (hError) throw hError;
    if (!horarios) return [];

    const hoje = new Date();
    const mapConsolidado: Record<string, any> = {};

    for (const periodoNome of periodosSelecionados) {
      const dates = PERIOD_DATES[periodoNome];
      if (!dates) continue;

      const dateStart = dates.start;
      const dateEnd = dates.end > hoje ? hoje : dates.end;

      for (const h of horarios) {
        const key = `${h.professores?.id}-${h.turma_id}-${h.componente}-${periodoNome}`;
        
        if (!mapConsolidado[key]) {
          mapConsolidado[key] = {
            professor: h.professores?.nome || 'N/D',
            turmaId: h.turma_id,
            turma: h.turmas?.nome || 'N/D',
            componente: h.componente,
            periodo: periodoNome,
            turno: h.turmas?.turno || 'N/D',
            ensino: 'Ensino Fundamental', // Mapeamento fixo conforme padrão do sistema
            fase: h.turmas?.nome || 'N/D', // Fase é o nome da turma
            tempos: new Set([h.tempo_ordem.toString() + 'º TEMPO']),
            totalAulasEsperadas: 0,
            lancamentosFreq: 0,
            lancamentosCont: 0
          };
        } else {
          mapConsolidado[key].tempos.add(h.tempo_ordem.toString() + 'º TEMPO');
        }

        mapConsolidado[key].totalAulasEsperadas += countWeekDaysInRange(dateStart, dateEnd, h.dia_semana);
      }
    }

    const finalResult: PendenciaDocente[] = [];
    const consolidadoKeys = Object.keys(mapConsolidado);
    
    // Processar em lotes para evitar sobrecarga ou timeouts
    const BATCH_SIZE = 5;
    for (let i = 0; i < consolidadoKeys.length; i += BATCH_SIZE) {
      const batch = consolidadoKeys.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (key) => {
        const group = mapConsolidado[key];
        if (group.totalAulasEsperadas === 0) return;

        const periodoDates = PERIOD_DATES[group.periodo];
        const dateStart = periodoDates.start;
        const dateEnd = periodoDates.end > hoje ? hoje : periodoDates.end;

        const temposArr = Array.from(group.tempos) as string[];

        try {
          // Queries de contagem (Frequência e Conteúdo) - AGORA FILTRANDO POR COMPONENTE (disciplina)
          const [fRes, cRes, avRes, aluRes] = await Promise.all([
            supabase.from('frequencias')
              .select('id')
              .eq('turma_id', group.turmaId)
              .eq('disciplina', group.componente)
              .in('tempo', temposArr)
              .gte('data', dateStart.toISOString().split('T')[0])
              .lte('data', dateEnd.toISOString().split('T')[0]),
            supabase.from('conteudos')
              .select('id')
              .eq('turma_id', group.turmaId)
              .eq('disciplina', group.componente)
              .in('tempo', temposArr)
              .gte('data', dateStart.toISOString().split('T')[0])
              .lte('data', dateEnd.toISOString().split('T')[0]),
            supabase.from('avaliacoes')
              .select('id')
              .eq('turma_id', group.turmaId)
              .eq('disciplina', group.componente)
              .ilike('bimestre', group.periodo), // Case-insensitive para garantir o match
            supabase.from('alunos')
              .select('id', { count: 'exact', head: true })
              .eq('turma_id', group.turmaId)
          ]);

          const lancamentosFreq = fRes.data?.length || 0;
          const lancamentosCont = cRes.data?.length || 0;
          const totalAlunos = aluRes.count || 0;

          // Calcular Pendência de Notas
          let pNotas = 0;
          if (avRes.data && avRes.data.length > 0 && totalAlunos > 0) {
            const avIds = avRes.data.map(av => av.id);
            const { data: notas } = await supabase.from('notas').select('aluno_id').in('avaliacao_id', avIds);
            const totalNotasEsperadas = avIds.length * totalAlunos;
            pNotas = Math.max(0, ((totalNotasEsperadas - (notas?.length || 0)) / totalNotasEsperadas) * 100);
          }

          finalResult.push({
            professor: group.professor,
            dataLotacao: '01/02/2026',
            periodo: group.periodo,
            turno: group.turno,
            ensino: group.ensino,
            fase: group.fase,
            turma: group.turma,
            componente: group.componente,
            pendFreq: parseFloat(Math.max(0, ((group.totalAulasEsperadas - lancamentosFreq) / group.totalAulasEsperadas) * 100).toFixed(2)),
            pendObjeto: parseFloat(Math.max(0, ((group.totalAulasEsperadas - lancamentosCont) / group.totalAulasEsperadas) * 100).toFixed(2)),
            pendNotas: parseFloat(pNotas.toFixed(2))
          });
        } catch (innerErr) {
          console.error(`Erro ao processar grupo ${key}:`, innerErr);
        }
      }));
    }

    return finalResult;
  } catch (err) {
    console.error('Erro no cálculo de pendências:', err);
    return [];
  }
};
