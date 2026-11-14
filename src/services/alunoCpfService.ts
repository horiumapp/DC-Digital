import { supabase } from '../lib/supabase';

type LinhaComId = { id: string; cpf?: string | null };

/** Junta o CPF vindo da função restrita. Professor da chamada não recebe valor. */
export async function anexarCpfAlunos<T extends LinhaComId>(linhas: T[]): Promise<T[]> {
  if (linhas.length === 0) return linhas;

  const porId = new Map<string, string | undefined>();
  for (let inicio = 0; inicio < linhas.length; inicio += 500) {
    const lote = linhas.slice(inicio, inicio + 500);
    const { data, error } = await supabase.rpc('cpfs_de_alunos', {
      p_ids: lote.map((linha) => linha.id),
    });
    if (error || !data) continue;
    for (const row of data as { id: string; cpf: string | null }[]) {
      porId.set(row.id, row.cpf || undefined);
    }
  }

  return linhas.map((linha) => ({
    ...linha,
    cpf: porId.get(linha.id) ?? linha.cpf,
  }));
}

/** Localiza alunos já cadastrados pelos CPFs do arquivo, sem baixar a tabela inteira. */
export async function idsPorCpfs(cpfs: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  for (let inicio = 0; inicio < cpfs.length; inicio += 400) {
    const lote = cpfs.slice(inicio, inicio + 400);
    const { data, error } = await supabase.rpc('alunos_ids_por_cpf', { p_cpfs: lote });
    if (error || !data) continue;
    for (const row of data as { id: string; cpf: string | null }[]) {
      const limpo = row.cpf?.replace(/\D/g, '');
      if (limpo) mapa.set(limpo, row.id);
    }
  }
  return mapa;
}
