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

const PERIOD_DATES: Record<string, { start: Date; end: Date }> = Object.create(null);
APP_CONFIG.PERIODOS.forEach(p => {
  const [sy, sm, sd] = p.dataInicio.split('-').map(Number);
  const [ey, em, ed] = p.dataFim.split('-').map(Number);
  PERIOD_DATES[p.id] = { start: new Date(sy, sm - 1, sd), end: new Date(ey, em - 1, ed) };
});

/**
 * Conta quantos dias de aula existem para um dia da semana (0-6) em um intervalo.
 * Algoritmo O(1) — sem loop diário.
 */
function countWeekDaysInRange(start: Date, end: Date, dayOfWeek: number): number {
  if (start > end) return 0;
  // Total de dias no intervalo (inclusivo nos dois extremos)
  const totalDays = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  // Semanas completas garantem exatamente 1 ocorrência de cada dia
  const fullWeeks = Math.floor(totalDays / 7);
  // Dias restantes após as semanas completas
  const remainder = totalDays % 7;
  const startDay = start.getDay();
  // Verificar se o dia da semana alvo aparece nos dias restantes
  let extraDay = 0;
  for (let i = 0; i < remainder; i++) {
    if ((startDay + i) % 7 === dayOfWeek) { extraDay = 1; break; }
  }
  return fullWeeks + extraDay;
}

export interface PaginatedPendencias {
  data: PendenciaDocente[];
  total: number;
}

interface ConsolidadoGroup {
  professor: string;
  turmaId: string;
  turma: string;
  componente: string;
  periodo: string;
  turno: string;
  ensino: string;
  fase: string;
  tempos: Set<string>;
  totalAulasEsperadas: number;
  lancamentosFreq: number;
  lancamentosCont: number;
  dateStart: Date;
  dateEnd: Date;
  countedSlots: Set<string>;
}

export const fetchPendenciasPorEscola = async (
  escolaId: string, 
  periodosSelecionados: string[],
  page: number = 1,
  pageSize: number = 20,
  professorEmail?: string
): Promise<PaginatedPendencias> => {
  try {
    // Buscar TODOS os horários relevantes para consolidar pendências corretamente.
    // A paginação é aplicada sobre o resultado consolidado, não sobre os horários brutos.
    let query = supabase
      .from('professor_horarios')
      .select('*, turmas(id, nome, turno), professores(id, nome, email)');

    if (escolaId !== 'TODAS') {
      query = query.eq('escola_id', escolaId);
    }

    const { data: horarios, error: hError } = await query;

    if (hError) throw hError;
    if (!horarios) return { data: [], total: 0 };

    const professorEmailLower = professorEmail?.toLowerCase().trim();
    const horariosFiltrados = professorEmailLower
      ? horarios.filter(h => h.professores?.email?.toLowerCase().trim() === professorEmailLower)
      : horarios;

    const hoje = new Date();
    const mapConsolidado: Record<string, ConsolidadoGroup> = Object.create(null);

    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    for (const periodoNome of periodosSelecionados) {
      const dates = PERIOD_DATES[periodoNome];
      if (dates) {
        if (!minDate || dates.start < minDate) minDate = dates.start;
        if (!maxDate || dates.end > maxDate) maxDate = dates.end;
      }
    }

    const minDateISO = minDate ? minDate.toISOString().split('T')[0] : null;
    const maxDateISO = maxDate ? maxDate.toISOString().split('T')[0] : null;

    // 1. Agrupar horários por Turma+Componente+Periodo
    for (const periodoNome of periodosSelecionados) {
      const dates = PERIOD_DATES[periodoNome];
      if (!dates) continue;

      const dateStart = dates.start;
      const dateEnd = dates.end > hoje ? hoje : dates.end;

      for (const h of horariosFiltrados) {

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

      const batchComponentes = [...new Set(batchGroups.map(g => g.componente))];

      interface PostgrestQueryBuilder {
        abortSignal: (signal: AbortSignal) => this;
        range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: Error | null }>;
      }

      const PAGE_SIZE = 1000;

      /** Busca todos os registros de uma tabela em lote com paginação automática e timeout */
      const fetchAll = async <T>(builder: () => PostgrestQueryBuilder): Promise<T[]> => {
        const result: T[] = [];
        let offset = 0;
        
        // Timeout de 15 segundos (15000 ms) por chamada de lote
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('Timeout excedido'), 15000);

        try {
          while (true) {
            const { data, error } = await builder().abortSignal(controller.signal).range(offset, offset + PAGE_SIZE - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;
            result.push(...(data as T[]));
            if (data.length < PAGE_SIZE) break;
            offset += PAGE_SIZE;
          }
        } finally {
          clearTimeout(timeoutId);
        }
        return result;
      };

      interface FrequenciaLote { turma_id: string; disciplina: string; tempo: string; data: string; }
      interface ConteudoLote { turma_id: string; disciplina: string; tempo: string; data: string; }
      interface AvaliacaoLote { id: string; turma_id: string; disciplina: string; bimestre: string; }
      interface AlunoLote { id: string; turma_id: string; }
      interface NotaLote { avaliacao_id: string; }

      const [fAll, cAll, avAll, aluAll] = await Promise.all([
        fetchAll<FrequenciaLote>(() => {
          let q = supabase.from('frequencias')
            .select('turma_id, disciplina, tempo, data')
            .in('turma_id', batchTurmaIds)
            .in('disciplina', batchComponentes);
          if (minDateISO) q = q.gte('data', minDateISO);
          if (maxDateISO) q = q.lte('data', maxDateISO);
          return q as unknown as PostgrestQueryBuilder;
        }),
        fetchAll<ConteudoLote>(() => {
          let q = supabase.from('conteudos')
            .select('turma_id, disciplina, tempo, data')
            .in('turma_id', batchTurmaIds)
            .in('disciplina', batchComponentes);
          if (minDateISO) q = q.gte('data', minDateISO);
          if (maxDateISO) q = q.lte('data', maxDateISO);
          return q as unknown as PostgrestQueryBuilder;
        }),
        fetchAll<AvaliacaoLote>(() => supabase.from('avaliacoes')
          .select('id, turma_id, disciplina, bimestre')
          .in('turma_id', batchTurmaIds)
          .in('disciplina', batchComponentes) as unknown as PostgrestQueryBuilder),
        fetchAll<AlunoLote>(() => supabase.from('alunos')
          .select('id, turma_id')
          .in('turma_id', batchTurmaIds) as unknown as PostgrestQueryBuilder)
      ]);

      // Alias para compatibilidade com o código abaixo
      const fData = { data: fAll };
      const cData = { data: cAll };
      const avData = { data: avAll };
      const aluData = { data: aluAll };

      // Buscar notas em lote para todas as avaliações encontradas
      const avIds = avAll.map(av => av.id);
      const nData = avIds.length > 0
        ? await fetchAll<NotaLote>(() => supabase.from('notas').select('avaliacao_id').in('avaliacao_id', avIds) as unknown as PostgrestQueryBuilder)
        : [];

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
        
        // Construir set com todas as variantes possíveis do nome do período para match flexível
        const periodoConfig = APP_CONFIG.PERIODOS.find(p => p.id === group.periodo || p.label === group.periodo);
        const periodoVariants = new Set<string>();
        if (periodoConfig) {
          periodoVariants.add(periodoConfig.id.toUpperCase());
          periodoVariants.add(periodoConfig.nome.toUpperCase());
          periodoVariants.add(periodoConfig.label.toUpperCase());
        } else {
          periodoVariants.add(group.periodo.toUpperCase());
        }
        
        const avsDoGrupo = (avData.data || []).filter(av => 
          av.turma_id === group.turmaId && 
          av.disciplina === group.componente && 
          periodoVariants.has((av.bimestre || '').toUpperCase())
        );

        if (avsDoGrupo.length > 0 && totalAlunos > 0) {
          const groupAvIds = avsDoGrupo.map(av => av.id);
          const notasNoLote = (nData || []).filter(n => groupAvIds.includes(n.avaliacao_id)).length;
          const totalNotasEsperadas = groupAvIds.length * totalAlunos;
          pNotas = Math.max(0, ((totalNotasEsperadas - notasNoLote) / totalNotasEsperadas) * 100);
        }

        finalResult.push({
          professor: group.professor,
          dataLotacao: APP_CONFIG.PERIODOS[0]?.dataInicio
            ? APP_CONFIG.PERIODOS[0].dataInicio.split('-').reverse().join('/')
            : '01/01/' + APP_CONFIG.YEAR,
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

    // Paginação aplicada sobre o resultado consolidado (correto)
    const totalConsolidado = finalResult.length;
    const offset = (page - 1) * pageSize;
    const resultadoPaginado = finalResult
      .sort((a, b) => a.professor.localeCompare(b.professor))
      .slice(offset, offset + pageSize);

    return {
      data: resultadoPaginado,
      total: totalConsolidado
    };
  } catch (err) {
    console.error('Erro no cálculo de pendências:', err);
    return { data: [], total: 0 };
  }
};
