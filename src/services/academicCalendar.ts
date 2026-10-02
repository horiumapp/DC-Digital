import { APP_CONFIG, type PeriodoLetivo } from '../config/appConfig';
import { supabase } from '../lib/supabase';
import { readAllRows } from './pagination';
const bundled = APP_CONFIG.PERIODOS.map(p => ({...p}));
type CalendarRow = {escola_id: string | null; periodo: string; data_inicio: string; data_fim: string};
/** Calendar data is presentation/validation guidance; the database enforces closures. */
export async function loadAcademicCalendar(escolaId?: string): Promise<void> {
  const key = `dc_calendar_${APP_CONFIG.YEAR}_${escolaId || 'global'}`;
  let periods: PeriodoLetivo[] = APP_CONFIG.YEAR === 2026 ? bundled.map(p => ({...p})) : [];
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null') as PeriodoLetivo[] | null;
    if (Array.isArray(cached) && cached.every(p => typeof p.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.dataInicio) && /^\d{4}-\d{2}-\d{2}$/.test(p.dataFim))) periods=cached;
  } catch { /* A corrupt cache does not replace the bundled calendar. */ }
  try {
    let query = supabase.from('periodos_letivos').select('escola_id, periodo, data_inicio, data_fim').eq('ano', APP_CONFIG.YEAR);
    const q = query as unknown as Record<string, unknown>;
    query = (escolaId && typeof q.or === 'function')
      ? (q.or as (arg: string) => typeof query)(`escola_id.is.null,escola_id.eq.${escolaId}`)
      : (typeof q.is === 'function' ? (q.is as (col: string, val: unknown) => typeof query)('escola_id', null) : query);
    const orderedQuery = typeof (query as unknown as Record<string, unknown>).order === 'function'
      ? query.order('periodo').order('id')
      : query;
    const {data} = await readAllRows<CalendarRow>(orderedQuery);
    if (data.length) {
      const byPeriod = new Map<string,CalendarRow>();
      for (const row of data.filter(r => !r.escola_id)) byPeriod.set(row.periodo,row);
      for (const row of data.filter(r => r.escola_id === escolaId)) byPeriod.set(row.periodo,row);
      periods = [...byPeriod.values()].map(row => ({
        id:row.periodo,label:row.periodo,nome:bundled.find(p => p.id===row.periodo)?.nome || row.periodo,
        dataInicio:row.data_inicio,dataFim:row.data_fim,
      })).sort((a,b) => Number(!a.id.includes('BIMESTRE'))-Number(!b.id.includes('BIMESTRE')) || a.dataInicio.localeCompare(b.dataInicio) || a.id.localeCompare(b.id));
      localStorage.setItem(key,JSON.stringify(periods));
    }
  } catch (error) { console.warn('[Calendário] Usando calendário local:',error); }
  APP_CONFIG.PERIODOS = periods;
}

export interface CalendarPeriodItem {
  id?: string;
  periodo: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  escolaId?: string | null;
  ano?: number;
}

/** Retorna a lista de anos com calendário já cadastrado no banco */
export async function fetchAvailableCalendarYears(): Promise<number[]> {
  try {
    const { data } = await supabase.from('periodos_letivos').select('ano');
    const dbYears = (data || []).map(r => r.ano);
    const yearsSet = new Set<number>([
      APP_CONFIG.YEAR - 1,
      APP_CONFIG.YEAR,
      APP_CONFIG.YEAR + 1,
      ...dbYears
    ]);
    return Array.from(yearsSet).sort((a, b) => a - b);
  } catch {
    return [APP_CONFIG.YEAR - 1, APP_CONFIG.YEAR, APP_CONFIG.YEAR + 1];
  }
}

/** Busca os períodos cadastrados no banco para o ano letivo especificado */
export async function fetchCalendarPeriods(
  escolaId?: string | null,
  ano: number = APP_CONFIG.YEAR
): Promise<CalendarPeriodItem[]> {
  try {
    let query = supabase
      .from('periodos_letivos')
      .select('id, escola_id, periodo, data_inicio, data_fim, ano')
      .eq('ano', ano);

    query = escolaId ? query.eq('escola_id', escolaId) : query.is('escola_id', null);

    const { data, error } = await query;
    if (error) throw error;

    const dbMap = new Map<string, { id: string; data_inicio: string; data_fim: string }>();
    (data || []).forEach(row => {
      dbMap.set(row.periodo, { id: row.id, data_inicio: row.data_inicio, data_fim: row.data_fim });
    });

    // Mescla com os períodos base do sistema, adaptando o ano caso seja diferente
    return bundled.map(bp => {
      const dbEntry = dbMap.get(bp.id);
      const defaultStart = bp.dataInicio.replace(/^\d{4}/, String(ano));
      const defaultEnd = bp.dataFim.replace(/^\d{4}/, String(ano));

      return {
        id: dbEntry?.id,
        periodo: bp.id,
        nome: bp.nome,
        dataInicio: dbEntry?.data_inicio || defaultStart,
        dataFim: dbEntry?.data_fim || defaultEnd,
        escolaId: escolaId || null,
        ano: ano,
      };
    });
  } catch (err) {
    console.warn(`[Calendário] Erro ao buscar períodos do ano ${ano} do banco, usando padrão:`, err);
    return bundled.map(bp => ({
      periodo: bp.id,
      nome: bp.nome,
      dataInicio: bp.dataInicio.replace(/^\d{4}/, String(ano)),
      dataFim: bp.dataFim.replace(/^\d{4}/, String(ano)),
      escolaId: escolaId || null,
      ano: ano,
    }));
  }
}

/** Salva as alterações de datas no Supabase para o ano especificado */
export async function saveAcademicCalendar(
  items: CalendarPeriodItem[],
  escolaId?: string | null,
  ano: number = APP_CONFIG.YEAR
): Promise<void> {
  for (const item of items) {
    if (item.id) {
      const { error } = await supabase
        .from('periodos_letivos')
        .update({
          data_inicio: item.dataInicio,
          data_fim: item.dataFim,
          ano: ano,
        })
        .eq('id', item.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('periodos_letivos')
        .insert({
          escola_id: escolaId || null,
          ano: ano,
          periodo: item.periodo,
          data_inicio: item.dataInicio,
          data_fim: item.dataFim,
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) item.id = data.id;
    }
  }

  // Recarrega o calendário ativo em memória e atualiza cache local se for o ano vigente
  if (ano === APP_CONFIG.YEAR) {
    await loadAcademicCalendar(escolaId || undefined);
  }
}


