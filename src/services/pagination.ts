/**
 * Read complete PostgREST results; never interpret a capped page as a full dataset.
 *
 * O PostgREST tem um teto próprio (`db-max-rows`, 1000 por padrão no Supabase) e
 * pode devolver MENOS linhas do que o `range` pediu sem que o conjunto tenha
 * acabado. Por isso o deslocamento avança pelo que realmente chegou e a parada
 * depende de página vazia, não de `length < size` — do contrário a leitura era
 * truncada na primeira resposta capada.
 */
export async function readAllRows<T>(query: {
  range(from: number, to: number): PromiseLike<{data: T[] | null; error: unknown}>;
}): Promise<{data: T[]; error: null}> {
  const data: T[] = [];
  const size = 500;
  // Guarda contra fim de conjunto não sinalizado: sem isso, um `range` que
  // ignorasse o deslocamento (mock, proxy ou endpoint mal comportado) faria o
  // laço repetir a mesma página indefinidamente.
  const MAX_PAGES = 10_000;
  for (let offset = 0, pagina = 0; pagina < MAX_PAGES; pagina += 1) {
    const page = await query.range(offset, offset + size - 1);
    if (page.error) throw page.error;
    const rows = page.data || [];
    if (rows.length === 0) return { data, error: null };
    data.push(...rows);
    offset += rows.length;
  }
  throw new Error('Leitura paginada excedeu o limite de páginas; resultados podem estar incompletos.');
}

/** Bound IN filters as well as response pages, keeping URLs below proxy limits. */
export async function readRowsInBatches<T>(ids: string[], query: (batch: string[]) => {range(from:number,to:number):PromiseLike<{data:T[]|null;error:unknown}>}): Promise<{data:T[];error:null}> {
  const data:T[]=[];
  for (let offset=0;offset<ids.length;offset+=40) data.push(...(await readAllRows(query(ids.slice(offset,offset+40)))).data);
  return {data,error:null};
}
