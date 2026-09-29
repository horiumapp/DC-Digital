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
