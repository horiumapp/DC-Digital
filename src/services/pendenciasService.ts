import { readAllRows } from './pagination';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';
import { feriadosNoDiaDaSemana } from './feriados';
import {
  consolidarPendencias,
  consolidarPendenciasViaApi,
  countWeekDaysInRangeIso,
} from '../utils/dcRulesEngine';
import type { ConsolidarPendenciasInput } from '../utils/pendenciasConsolidar.tsImpl';

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

function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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

// FIX: Interface e função movidas para escopo do módulo (antes estavam dentro do loop por lote)
interface PostgrestQueryBuilder {
  abortSignal: (signal: AbortSignal) => this;
  range: (from: number, to: number) => Promise<{ data: unknown[] | null; error: Error | null }>;
}

const FETCH_ALL_PAGE_SIZE = 1000;

/** Busca todos os registros de uma tabela em lote com paginação automática e timeout */
async function fetchAllPaginated<T>(builder: () => PostgrestQueryBuilder): Promise<T[]> {
  const result: T[] = [];
  let offset = 0;

  // Timeout de 15 segundos (15000 ms) por chamada de lote
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort('Timeout excedido'), 15000);

  try {
    while (true) {
      const { data, error } = await builder().abortSignal(controller.signal).range(offset, offset + FETCH_ALL_PAGE_SIZE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      result.push(...(data as T[]));
      if (data.length < FETCH_ALL_PAGE_SIZE) break;
      offset += FETCH_ALL_PAGE_SIZE;
    }
  } finally {
    clearTimeout(timeoutId);
  }
  return result;
}

export const fetchPendenciasPorEscola = async (
  escolaId: string, 
  periodosSelecionados: string[],
  page: number = 1,
  pageSize: number = 20,
  professorEmail?: string
): Promise<PaginatedPendencias> => {
  const PERIOD_DATES: Record<string, { start: Date; end: Date }> = Object.create(null);
  APP_CONFIG.PERIODOS.forEach(p => {
    const [sy, sm, sd] = p.dataInicio.split('-').map(Number);
    const [ey, em, ed] = p.dataFim.split('-').map(Number);
    PERIOD_DATES[p.id] = { start: new Date(sy, sm - 1, sd), end: new Date(ey, em - 1, ed) };
  });
  
  try {
    // 1. Tentar executar a agregação server-side via RPC no PostgreSQL (elimina download massivo de tabelas)
    try {
      const periodosPayload = periodosSelecionados.map(pId => {
        const cfg = APP_CONFIG.PERIODOS.find(p => p.id === pId || p.label === pId || p.nome === pId);
        return {
          id: pId,
          data_inicio: cfg?.dataInicio || '2026-02-05',
          data_fim: cfg?.dataFim || '2026-12-14'
        };
      });

      const { data: rpcData, error: rpcError } = await readAllRows(supabase.rpc('get_pendencias_docentes', {
        p_escola_id: escolaId === 'TODAS' ? null : escolaId,
        p_periodos: periodosPayload,
        p_professor_email: professorEmail ? professorEmail.toLowerCase().trim() : null
      }).order('professor').order('turma_id').order('componente').order('periodo'));

      if (!rpcError && rpcData) {
        interface RpcRow {
          professor: string;
          turma: string;
          componente: string;
          periodo: string;
          turno: string;
          ensino: string;
          fase: string;
          pend_notas: number | string;
          pend_freq: number | string;
          pend_objeto: number | string;
        }

        const mapped: PendenciaDocente[] = (rpcData as RpcRow[]).map(row => ({
          professor: row.professor,
          dataLotacao: APP_CONFIG.PERIODOS[0]?.dataInicio
            ? APP_CONFIG.PERIODOS[0].dataInicio.split('-').reverse().join('/')
            : '01/01/' + APP_CONFIG.YEAR,
          periodo: row.periodo,
          turno: row.turno,
          ensino: row.ensino,
          fase: row.fase,
          turma: row.turma,
          componente: row.componente,
          pendFreq: Number(row.pend_freq) || 0,
          pendObjeto: Number(row.pend_objeto) || 0,
          pendNotas: Number(row.pend_notas) || 0
        }));

        const totalConsolidado = mapped.length;
        const offset = (page - 1) * pageSize;
        const resultadoPaginado = mapped
          .sort((a, b) => a.professor.localeCompare(b.professor))
          .slice(offset, offset + pageSize);

        return {
          data: resultadoPaginado,
          total: totalConsolidado
        };
      }
    } catch (rpcErr) {
      console.warn('[pendenciasService] RPC get_pendencias_docentes indisponível, usando fallback client-side:', rpcErr);
    }

    // 2. Fallback client-side caso a RPC ainda não esteja disponível no banco

    let query = supabase
      .from('professor_horarios')
      .select('id, escola_id, turma_id, professor_id, dia_semana, tempo_ordem, componente, turmas(id, nome, turno, ensino), professores(id, nome, email)')
      .order('id');

    if (escolaId !== 'TODAS') {
      query = query.eq('escola_id', escolaId);
    }

    const professorEmailLower = professorEmail?.toLowerCase().trim();
    if (professorEmailLower) {
      query = query.ilike('professores.email', professorEmailLower);
    }

    const { data: horarios, error: hError } = await readAllRows(query);

    if (hError) throw hError;
    if (!horarios) return { data: [], total: 0 };

    const horariosFiltrados = horarios;

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
          const tObj = (Array.isArray(h.turmas) ? h.turmas[0] : h.turmas) as { nome?: string; turno?: string; ensino?: string } | null;
          const pObj = (Array.isArray(h.professores) ? h.professores[0] : h.professores) as { nome?: string; email?: string } | null;
          const nomeCompleto = tObj?.nome || 'N/D';
          const partes = nomeCompleto.split(' ');
          const turmaPart = partes.length > 1 ? partes.pop() : '';
          const fasePart = partes.join(' ') || nomeCompleto;

          mapConsolidado[key] = {
            professor: pObj?.nome || 'N/D',
            turmaId: h.turma_id,
            turma: turmaPart || 'N/D',
            componente: h.componente,
            periodo: periodoNome,
            turno: tObj?.turno || 'N/D',
            ensino: tObj?.ensino || 'Ensino Fundamental',
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
          const dias = countWeekDaysInRangeIso(
            toLocalIso(dateStart),
            toLocalIso(dateEnd),
            Number(h.dia_semana)
          );
          const semAula = feriadosNoDiaDaSemana(dateStart, dateEnd, Number(h.dia_semana));
          mapConsolidado[key].totalAulasEsperadas += Math.max(0, dias - semAula);
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

      interface FrequenciaLote { turma_id: string; disciplina: string; tempo: string; data: string; }
      interface ConteudoLote { turma_id: string; disciplina: string; tempo: string; data: string; }
      interface AvaliacaoLote { id: string; turma_id: string; disciplina: string; bimestre: string; }
      interface AlunoLote { id: string; turma_id: string; }
      interface NotaLote { avaliacao_id: string; }

      const fetchFreqsPromise = (async (): Promise<FrequenciaLote[]> => {
        try {
          const { data: rpcFreqs, error: rpcErr } = await readAllRows<FrequenciaLote>(supabase.rpc('get_frequencias_distinct_lote', {
            p_turma_ids: batchTurmaIds,
            p_disciplinas: batchComponentes,
            p_start: minDateISO,
            p_end: maxDateISO,
          }).order('turma_id').order('disciplina').order('data').order('tempo'));
          if (!rpcErr && rpcFreqs) return rpcFreqs;
          throw rpcErr || new Error('RPC fallback');
        } catch {
          return fetchAllPaginated<FrequenciaLote>(() => {
            let q = supabase.from('frequencias')
              .select('turma_id, disciplina, tempo, data')
              .in('turma_id', batchTurmaIds)
              .in('disciplina', batchComponentes);
            if (minDateISO) q = q.gte('data', minDateISO);
            if (maxDateISO) q = q.lte('data', maxDateISO);
            return q.order('id') as unknown as PostgrestQueryBuilder;
          });
        }
      })();

      const [fAll, cAll, avAll, aluAll] = await Promise.all([
        fetchFreqsPromise,
        fetchAllPaginated<ConteudoLote>(() => {
          let q = supabase.from('conteudos')
            .select('turma_id, disciplina, tempo, data')
            .in('turma_id', batchTurmaIds)
            .in('disciplina', batchComponentes);
          if (minDateISO) q = q.gte('data', minDateISO);
          if (maxDateISO) q = q.lte('data', maxDateISO);
          return q.order('id') as unknown as PostgrestQueryBuilder;
        }),
        fetchAllPaginated<AvaliacaoLote>(() => supabase.from('avaliacoes')
          .select('id, turma_id, disciplina, bimestre')
          .in('turma_id', batchTurmaIds)
          .in('disciplina', batchComponentes).order('id') as unknown as PostgrestQueryBuilder),
        fetchAllPaginated<AlunoLote>(() => supabase.from('alunos')
          .select('id, turma_id')
          .in('turma_id', batchTurmaIds).order('id') as unknown as PostgrestQueryBuilder)
      ]);

      // Alias para compatibilidade com o código abaixo
      const fData = { data: fAll };
      const cData = { data: cAll };
      const avData = { data: avAll };
      const aluData = { data: aluAll };

      // Buscar notas em lote para todas as avaliações encontradas
      const avIds = avAll.map(av => av.id);
      const nData = avIds.length > 0
        ? await fetchAllPaginated<NotaLote>(() => supabase.from('notas').select('avaliacao_id').in('avaliacao_id', avIds).order('id') as unknown as PostgrestQueryBuilder)
        : [];

      const dataLotacao = APP_CONFIG.PERIODOS[0]?.dataInicio
        ? APP_CONFIG.PERIODOS[0].dataInicio.split('-').reverse().join('/')
        : '01/01/' + APP_CONFIG.YEAR;

      const alunoCountByTurma = new Map<string, number>();
      for (const a of (aluData.data || [])) {
        alunoCountByTurma.set(a.turma_id, (alunoCountByTurma.get(a.turma_id) || 0) + 1);
      }

      const notasByAvId = new Map<string, number>();
      for (const n of (nData || [])) {
        notasByAvId.set(n.avaliacao_id, (notasByAvId.get(n.avaliacao_id) || 0) + 1);
      }

      // Fase 3: consolidação pura (TS↔WASM / API opcional) — I/O acima permanece com RLS.
      const consolidarInput: ConsolidarPendenciasInput = {
        groups: batchGroups.map(group => {
          const periodoConfig = APP_CONFIG.PERIODOS.find(
            p => p.id === group.periodo || p.label === group.periodo
          );
          const periodoVariants = periodoConfig
            ? [periodoConfig.id, periodoConfig.nome, periodoConfig.label]
            : [group.periodo];
          return {
            professor: group.professor,
            turmaId: group.turmaId,
            turma: group.turma,
            componente: group.componente,
            periodo: group.periodo,
            turno: group.turno,
            ensino: group.ensino,
            fase: group.fase,
            tempos: [...group.tempos],
            totalAulasEsperadas: group.totalAulasEsperadas,
            dateStart: toLocalIso(group.dateStart),
            dateEnd: toLocalIso(group.dateEnd),
            periodoVariants,
            dataLotacao,
          };
        }),
        frequencias: (fData.data || []).map(f => ({
          turmaId: f.turma_id,
          disciplina: f.disciplina,
          tempo: f.tempo,
          data: f.data,
        })),
        conteudos: (cData.data || []).map(c => ({
          turmaId: c.turma_id,
          disciplina: c.disciplina,
          tempo: c.tempo,
          data: c.data,
        })),
        avaliacoes: (avData.data || []).map(av => ({
          id: av.id,
          turmaId: av.turma_id,
          disciplina: av.disciplina,
          bimestre: av.bimestre,
        })),
        alunoCounts: [...alunoCountByTurma.entries()].map(([key, total]) => ({ key, total })),
        notasCounts: [...notasByAvId.entries()].map(([key, total]) => ({ key, total })),
      };

      const apiUrl = import.meta.env.VITE_DC_RULES_API_URL as string | undefined;
      let consolidados;
      if (apiUrl) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          consolidados = await consolidarPendenciasViaApi(
            consolidarInput,
            sessionData.session?.access_token
          );
        } catch (apiErr) {
          console.warn('[pendenciasService] dc_rules_api indisponível, usando motor local:', apiErr);
          consolidados = consolidarPendencias(consolidarInput);
        }
      } else {
        consolidados = consolidarPendencias(consolidarInput);
      }

      for (const row of consolidados) {
        finalResult.push({
          professor: row.professor,
          dataLotacao: row.dataLotacao,
          periodo: row.periodo,
          turno: row.turno,
          ensino: row.ensino,
          fase: row.fase,
          turma: row.turma,
          componente: row.componente,
          pendFreq: row.pendFreq,
          pendObjeto: row.pendObjeto,
          pendNotas: row.pendNotas,
          unidade: row.unidade,
        });
      }
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
