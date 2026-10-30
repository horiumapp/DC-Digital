import { APP_CONFIG } from '../config/appConfig';
import { supabase } from '../lib/supabase';

export interface Feriado {
  data: string;
  nome: string;
}

/** Datas fixas. Carnaval e feriado municipal ficam de fora porque mudam de ano. */
export const FERIADOS_NACIONAIS_FIXOS: ReadonlyArray<readonly [string, string]> = [
  ['01-01', 'Confraternização Universal'],
  ['04-21', 'Tiradentes'],
  ['05-01', 'Dia do Trabalho'],
  ['09-07', 'Independência do Brasil'],
  ['10-12', 'Nossa Senhora Aparecida'],
  ['11-02', 'Finados'],
  ['11-15', 'Proclamação da República'],
  ['11-20', 'Consciência Negra'],
  ['12-25', 'Natal'],
];

const cache = new Map<string, string>();

function chave(ano: number) {
  return `dc_feriados_${ano}`;
}

export function feriadosNacionaisDoAno(ano: number): Feriado[] {
  return FERIADOS_NACIONAIS_FIXOS.map(([mesDia, nome]) => ({ data: `${ano}-${mesDia}`, nome }));
}

export function definirFeriados(lista: Feriado[]) {
  cache.clear();
  for (const item of lista) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(item.data) && item.nome.trim()) {
      cache.set(item.data, item.nome.trim());
    }
  }
}

export function limparFeriados() {
  cache.clear();
}

export function mapaFeriados(): Record<string, string> {
  return Object.fromEntries(cache);
}

export function nomeFeriado(dataIso: string): string | null {
  return cache.get(dataIso) ?? null;
}

export function contarFeriados(fonte: Record<string, string>, inicio: Date, fim: Date, diaSemana: number): number {
  const ini = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
  const end = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
  let total = 0;
  for (const data of Object.keys(fonte)) {
    const [ano, mes, dia] = data.split('-').map(Number);
    const quando = new Date(ano, mes - 1, dia);
    if (quando.getDay() !== diaSemana) continue;
    if (quando < ini || quando > end) continue;
    total += 1;
  }
  return total;
}

/** Quantos feriados do cache caem naquele dia da semana, dentro do intervalo. */
export function feriadosNoDiaDaSemana(inicio: Date, fim: Date, diaSemana: number): number {
  return contarFeriados(Object.fromEntries(cache), inicio, fim, diaSemana);
}

function lerCacheLocal(ano: number): Feriado[] {
  try {
    const bruto = JSON.parse(localStorage.getItem(chave(ano)) || 'null') as Feriado[] | null;
    if (!Array.isArray(bruto)) return [];
    return bruto.filter(item => typeof item?.data === 'string' && typeof item?.nome === 'string');
  } catch {
    return [];
  }
}

function gravarCacheLocal(ano: number, lista: Feriado[]) {
  localStorage.setItem(chave(ano), JSON.stringify(lista));
  definirFeriados(lista);
}

export async function carregarFeriados(ano: number = APP_CONFIG.YEAR): Promise<Feriado[]> {
  const local = lerCacheLocal(ano);
  if (local.length) definirFeriados(local);
  try {
    const { data, error } = await supabase
      .from('feriados_rede')
      .select('data, nome')
      .gte('data', `${ano}-01-01`)
      .lte('data', `${ano}-12-31`)
      .order('data');
    if (error) return local;
    const lista = (data || []).map(row => ({
      data: String(row.data).slice(0, 10),
      nome: String(row.nome),
    }));
    gravarCacheLocal(ano, lista);
    return lista;
  } catch {
    return local;
  }
}

export async function salvarFeriado(data: string, nome: string): Promise<void> {
  const limpo = nome.trim().slice(0, 80);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !limpo) {
    throw new Error('Informe o dia e o nome do feriado.');
  }
  const { error } = await supabase.from('feriados_rede').upsert({ data, nome: limpo }, { onConflict: 'data' });
  if (error) throw error;
  await carregarFeriados(Number(data.slice(0, 4)));
}

export async function removerFeriado(data: string): Promise<void> {
  const { error } = await supabase.from('feriados_rede').delete().eq('data', data);
  if (error) throw error;
  await carregarFeriados(Number(data.slice(0, 4)));
}

export async function incluirFeriadosNacionais(ano: number): Promise<number> {
  const atuais = new Set((await carregarFeriados(ano)).map(item => item.data));
  const novos = feriadosNacionaisDoAno(ano).filter(item => !atuais.has(item.data));
  if (novos.length === 0) return 0;
  const { error } = await supabase.from('feriados_rede').upsert(novos, { onConflict: 'data' });
  if (error) throw error;
  await carregarFeriados(ano);
  return novos.length;
}
