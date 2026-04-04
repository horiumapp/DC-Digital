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
  periodosSelecionados: string[],
  professorEmail?: string
): Promise<PendenciaDocente[]> => {
  try {
    let query = supabase
      .from('professor_horarios')
      .select('*, turmas(id, nome, turno), professores(id, nome, email)')
      .limit(10000); // Aumentado para garantir cobertura total

    if (escolaId !== 'TODAS') {
      query = query.eq('escola_id', escolaId);
    }

    const { data: horarios, error: hError } = await query;

    if (hError) throw hError;
    if (!horarios) return [];

    // Se um e-mail foi fornecido, filtramos os horários deste professor especificamente
    // Isso garante que se ele tem 8 turmas, todas as 8 desse professor apareçam
    const horariosFiltrados = professorEmail 
      ? horarios.filter(h => h.professores?.email?.toLowerCase().trim() === professorEmail.toLowerCase().trim())
      : horarios;

    const hoje = new Date();
    const mapConsolidado: Record<string, any> = {};

    for (const periodoNome of periodosSelecionados) {
      const dates = PERIOD_DATES[periodoNome];
      if (!dates) continue;

      const dateStart = dates.start;
      const dateEnd = dates.end > hoje ? hoje : dates.end;

      for (const h of horariosFiltrados) {
        const profId = h.professores?.id || 'SEM-ID';
        const key = `${profId}-${h.turma_id}-${h.componente}-${periodoNome}`;
        
        if (!mapConsolidado[key]) {
          // Lógica robusta para separar Fase e Turma
          const nomeCompleto = h.turmas?.nome || 'N/D';
          const partes = nomeCompleto.split(' ');
          const turmaPart = partes.length > 1 ? partes.pop() : '';
          const fasePart = partes.join(' ') || nomeCompleto;

          mapConsolidado[key] = {
            professor: h.professores?.nome || 'N/D',
            turmaId: h.turma_id,
            turma: turmaPart || 'N/D',
            componente: h.componente,
            periodo: periodoNome,
            turno: h.turmas?.turno || 'N/D',
            ensino: 'Ensino Fundamental',
            fase: fasePart,
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
    
    // Processar em lotes
    const BATCH_SIZE = 10;
    for (let i = 0; i < consolidadoKeys.length; i += BATCH_SIZE) {
      const batch = consolidadoKeys.slice(i, i + BATCH_SIZE);
      
      await Promise.all(batch.map(async (key) => {
        const group = mapConsolidado[key];
        const periodoDates = PERIOD_DATES[group.periodo];
        const dateStart = periodoDates.start;
        const dateEnd = periodoDates.end > hoje ? hoje : periodoDates.end;
        const temposArr = Array.from(group.tempos) as string[];

        try {
          const [fRes, cRes, avRes, aluRes] = await Promise.all([
            supabase.from('frequencias')
              .select('id', { count: 'exact' })
              .eq('turma_id', group.turmaId)
              .eq('disciplina', group.componente)
              .in('tempo', temposArr)
              .gte('data', dateStart.toISOString().split('T')[0])
              .lte('data', dateEnd.toISOString().split('T')[0]),
            supabase.from('conteudos')
              .select('id', { count: 'exact' })
              .eq('turma_id', group.turmaId)
              .eq('disciplina', group.componente)
              .in('tempo', temposArr)
              .gte('data', dateStart.toISOString().split('T')[0])
              .lte('data', dateEnd.toISOString().split('T')[0]),
            supabase.from('avaliacoes')
              .select('id')
              .eq('turma_id', group.turmaId)
              .eq('disciplina', group.componente)
              .ilike('bimestre', group.periodo),
            supabase.from('alunos')
              .select('id', { count: 'exact', head: true })
              .eq('turma_id', group.turmaId)
          ]);

          const lancamentosFreq = fRes.count || 0;
          const lancamentosCont = cRes.count || 0;
          const totalAlunos = aluRes.count || 0;

          // Calcular Pendência de Notas
          let pNotas = 0;
          if (avRes.data && avRes.data.length > 0 && totalAlunos > 0) {
            const avIds = avRes.data.map(av => av.id);
            const { count: totalNotas } = await supabase
              .from('notas')
              .select('id', { count: 'exact', head: true })
              .in('avaliacao_id', avIds);
            
            const totalNotasEsperadas = avIds.length * totalAlunos;
            pNotas = Math.max(0, ((totalNotasEsperadas - (totalNotas || 0)) / totalNotasEsperadas) * 100);
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
            pendFreq: group.totalAulasEsperadas > 0 ? parseFloat(Math.max(0, ((group.totalAulasEsperadas - lancamentosFreq) / group.totalAulasEsperadas) * 100).toFixed(2)) : 0,
            pendObjeto: group.totalAulasEsperadas > 0 ? parseFloat(Math.max(0, ((group.totalAulasEsperadas - lancamentosCont) / group.totalAulasEsperadas) * 100).toFixed(2)) : 0,
            pendNotas: parseFloat(pNotas.toFixed(2))
          });
        } catch (innerErr) {
          console.error(`Erro ao processar grupo ${key}:`, innerErr);
        }
      }));
    }

    return finalResult.sort((a, b) => a.professor.localeCompare(b.professor));
  } catch (err) {
    console.error('Erro no cálculo de pendências:', err);
    return [];
  }
};
