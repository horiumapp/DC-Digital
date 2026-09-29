/** Read complete PostgREST results; never interpret a capped page as a full dataset. */
export async function readAllRows<T>(query: {
  range(from: number, to: number): PromiseLike<{data: T[] | null; error: unknown}>;
}): Promise<{data: T[]; error: null}> {
  const data: T[] = [];
  const size = 500;
  for (let offset=0; ; offset+=size) {
    const page = await query.range(offset,offset+size-1);
    if (page.error) throw page.error;
    data.push(...(page.data || []));
    if (!page.data?.length || page.data.length<size) return {data,error:null};
  }
}

/** Bound IN filters as well as response pages, keeping URLs below proxy limits. */
export async function readRowsInBatches<T>(ids: string[], query: (batch: string[]) => {range(from:number,to:number):PromiseLike<{data:T[]|null;error:unknown}>}): Promise<{data:T[];error:null}> {
  const data:T[]=[];
  for (let offset=0;offset<ids.length;offset+=40) data.push(...(await readAllRows(query(ids.slice(offset,offset+40)))).data);
  return {data,error:null};
}
