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
    let query = supabase.from('periodos_letivos').select('escola_id, periodo, data_inicio, data_fim').eq('ano',APP_CONFIG.YEAR);
    query = escolaId ? query.or(`escola_id.is.null,escola_id.eq.${escolaId}`) : query.is('escola_id',null);
    const {data} = await readAllRows<CalendarRow>(query.order('periodo').order('id'));
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
}

/** Busca os períodos cadastrados no banco para o ano letivo ativo */
export async function fetchCalendarPeriods(escolaId?: string | null): Promise<CalendarPeriodItem[]> {
  try {
    let query = supabase
      .from('periodos_letivos')
      .select('id, escola_id, periodo, data_inicio, data_fim')
      .eq('ano', APP_CONFIG.YEAR);

    query = escolaId ? query.eq('escola_id', escolaId) : query.is('escola_id', null);

    const { data, error } = await query;
    if (error) throw error;

    const dbMap = new Map<string, { id: string; data_inicio: string; data_fim: string }>();
    (data || []).forEach(row => {
      dbMap.set(row.periodo, { id: row.id, data_inicio: row.data_inicio, data_fim: row.data_fim });
    });

    // Mescla com os períodos definidos por padrão no sistema para garantir que todos existam
    return bundled.map(bp => {
      const dbEntry = dbMap.get(bp.id);
      return {
        id: dbEntry?.id,
        periodo: bp.id,
        nome: bp.nome,
        dataInicio: dbEntry?.data_inicio || bp.dataInicio,
        dataFim: dbEntry?.data_fim || bp.dataFim,
        escolaId: escolaId || null,
      };
    });
  } catch (err) {
    console.warn('[Calendário] Erro ao buscar períodos do banco, usando padrão local:', err);
    return bundled.map(bp => ({
      periodo: bp.id,
      nome: bp.nome,
      dataInicio: bp.dataInicio,
      dataFim: bp.dataFim,
      escolaId: escolaId || null,
    }));
  }
}

/** Salva as alterações de datas no Supabase e atualiza o calendário da aplicação */
export async function saveAcademicCalendar(
  items: CalendarPeriodItem[],
  escolaId?: string | null
): Promise<void> {
  for (const item of items) {
    if (item.id) {
      const { error } = await supabase
        .from('periodos_letivos')
        .update({
          data_inicio: item.dataInicio,
          data_fim: item.dataFim,
        })
        .eq('id', item.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from('periodos_letivos')
        .insert({
          escola_id: escolaId || null,
          ano: APP_CONFIG.YEAR,
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

  // Recarrega o calendário ativo em memória e atualiza cache local
  await loadAcademicCalendar(escolaId || undefined);
}

