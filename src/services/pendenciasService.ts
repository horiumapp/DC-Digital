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

const PERIOD_DATES: Record<string, { start: Date; end: Date }> = {};
APP_CONFIG.PERIODOS.forEach(p => {
  PERIOD_DATES[p.id] = { start: new Date(p.dataInicio), end: new Date(p.dataFim) };
});

/**
 * Conta quantos dias de aula existem para um dia da semana (0-6) em um intervalo.
 */
function countWeekDaysInRange(start: Date, end: Date, dayOfWeek: number): number {
  if (start > end) return 0;
  let count = 0;
  const current = new Date(start);
  // Garante que não ultrapasse 1 ano de busca por segurança
  let safety = 0;
  while (current <= end && safety < 400) {
    if (current.getDay() === dayOfWeek) count++;
    current.setDate(current.getDate() + 1);
    safety++;
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
      .limit(10000);

    if (escolaId !== 'TODAS') {
      query = query.eq('escola_id', escolaId);
    }

    const { data: horarios, error: hError } = await query;
    if (hError) throw hError;
    if (!horarios) return [];

    const professorEmailLower = professorEmail?.toLowerCase().trim();
    const horariosFiltrados = professorEmailLower
      ? horarios.filter(h => h.professores?.email?.toLowerCase().trim() === professorEmailLower)
      : horarios;

    const hoje = new Date();
    const mapConsolidado: Record<string, any> = {};

    // 1. Agrupar horários por Turma+Componente+Periodo
    for (const periodoNome of periodosSelecionados) {
      const dates = PERIOD_DATES[periodoNome];
      if (!dates) continue;

      const dateStart = dates.start;
      const dateEnd = dates.end > hoje ? hoje : dates.end;

      for (const h of horariosFiltrados) {
        const profId = h.professores?.id || 'SEM-ID';
        const key = `${h.turma_id}-${h.componente}-${periodoNome}`;
        
        if (!mapConsolidado[key]) {
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
            ensino: h.turmas?.ensino || 'Ensino Fundamental',
            fase: fasePart,
            tempos: new Set([h.tempo_ordem.toString() + 'º TEMPO']),
            totalAulasEsperadas: 0,
            lancamentosFreq: 0,
            lancamentosCont: 0,
            dateStart,
            dateEnd,
            // Rastrear combinações dia_semana|tempo já contadas para evitar duplicatas
            countedSlots: new Set<string>()
          };
        } else {
          mapConsolidado[key].tempos.add(h.tempo_ordem.toString() + 'º TEMPO');
        }

        // Evitar contagem duplicada: só incrementar se esta combinação dia_semana+tempo_ordem ainda não foi contada
        const slotKey = `${h.dia_semana}|${h.tempo_ordem}`;
        if (!mapConsolidado[key].countedSlots.has(slotKey)) {
          mapConsolidado[key].countedSlots.add(slotKey);
          mapConsolidado[key].totalAulasEsperadas += countWeekDaysInRange(dateStart, dateEnd, h.dia_semana);
        }
      }
    }

    const finalResult: PendenciaDocente[] = [];
    const consolidadoGroups = Object.values(mapConsolidado);
    
    // 2. Otimizar as buscas buscando dados em lote por Turma
    const turmaIds = [...new Set(consolidadoGroups.map(g => g.turmaId))];
    
    // Limitar o processamento em lotes de turmas para não estourar a URL da query
    const TURMA_BATCH_SIZE = 20;
    for (let i = 0; i < turmaIds.length; i += TURMA_BATCH_SIZE) {
      const batchTurmaIds = turmaIds.slice(i, i + TURMA_BATCH_SIZE);
      const batchGroups = consolidadoGroups.filter(g => batchTurmaIds.includes(g.turmaId));

      // Buscar todos os dados relevantes para esse lote de turmas (com limite alto para evitar truncamento)
      const [fData, cData, avData, aluData] = await Promise.all([
        supabase.from('frequencias').select('turma_id, disciplina, tempo, data').in('turma_id', batchTurmaIds).limit(100000),
        supabase.from('conteudos').select('turma_id, disciplina, tempo, data').in('turma_id', batchTurmaIds).limit(100000),
        supabase.from('avaliacoes').select('id, turma_id, disciplina, bimestre').in('turma_id', batchTurmaIds).limit(100000),
        supabase.from('alunos').select('id, turma_id').in('turma_id', batchTurmaIds).limit(100000)
      ]);

      // Buscar notas em lote para todas as avaliações encontradas
      const avIds = (avData.data || []).map(av => av.id);
      const { data: nData } = avIds.length > 0 
        ? await supabase.from('notas').select('avaliacao_id').in('avaliacao_id', avIds).limit(100000)
        : { data: [] };

      // Helper: converte 'DD/MM/YYYY' ou 'YYYY-MM-DD' para Date para comparação
      const parseDataField = (d: string): Date | null => {
        if (!d) return null;
        if (d.includes('/')) {
          const [dia, mes, ano] = d.split('/').map(Number);
          return new Date(ano, mes - 1, dia);
        }
        const [ano, mes, dia] = d.split('-').map(Number);
        return new Date(ano, mes - 1, dia);
      };

      // Processar cada grupo do lote localmente (sem novas queries)
      batchGroups.forEach(group => {
        const temposArr = Array.from(group.tempos);
        const dateStart = group.dateStart;
        const dateEnd = group.dateEnd;

        // Contar Frequências (comparar como Date, não como string)
        const freqCount = new Set(
          (fData.data || []).filter(f => {
            if (f.turma_id !== group.turmaId || f.disciplina !== group.componente || !temposArr.includes(f.tempo)) return false;
            const fDate = parseDataField(f.data);
            return fDate && fDate >= dateStart && fDate <= dateEnd;
          }).map(f => `${f.data}|${f.tempo}`)
        ).size;

        // Contar Conteúdos (comparar como Date, não como string)
        const contCount = new Set(
          (cData.data || []).filter(c => {
            if (c.turma_id !== group.turmaId || c.disciplina !== group.componente || !temposArr.includes(c.tempo)) return false;
            const cDate = parseDataField(c.data);
            return cDate && cDate >= dateStart && cDate <= dateEnd;
          }).map(c => `${c.data}|${c.tempo}`)
        ).size;

        // Contar Alunos
        const totalAlunos = (aluData.data || []).filter(a => a.turma_id === group.turmaId).length;

        // Calcular Pendência de Notas
        let pNotas = 0;
        const avsDoGrupo = (avData.data || []).filter(av => 
          av.turma_id === group.turmaId && 
          av.disciplina === group.componente && 
          av.bimestre?.toUpperCase() === group.periodo.toUpperCase()
        );

        if (avsDoGrupo.length > 0 && totalAlunos > 0) {
          const groupAvIds = avsDoGrupo.map(av => av.id);
          const notasNoLote = (nData || []).filter(n => groupAvIds.includes(n.avaliacao_id)).length;
          const totalNotasEsperadas = groupAvIds.length * totalAlunos;
          pNotas = Math.max(0, ((totalNotasEsperadas - notasNoLote) / totalNotasEsperadas) * 100);
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
          pendFreq: group.totalAulasEsperadas > 0 ? parseFloat(Math.max(0, ((group.totalAulasEsperadas - freqCount) / group.totalAulasEsperadas) * 100).toFixed(2)) : 0,
          pendObjeto: group.totalAulasEsperadas > 0 ? parseFloat(Math.max(0, ((group.totalAulasEsperadas - contCount) / group.totalAulasEsperadas) * 100).toFixed(2)) : 0,
          pendNotas: parseFloat(pNotas.toFixed(2))
        });
      });
    }

    return finalResult.sort((a, b) => a.professor.localeCompare(b.professor));
  } catch (err) {
    console.error('Erro no cálculo de pendências:', err);
    return [];
  }
};
