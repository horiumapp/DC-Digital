import { offlineOwner } from './offlineIdentity';
import Dexie from 'dexie';
import { db, getOperationalTable } from '../lib/db';

export type MutationRecord = Record<string, unknown>;
export const keyFields: Record<string, string[]> = {
  frequencias: ['turma_id','aluno_id','data','tempo','disciplina'],
  conteudos: ['turma_id','data','tempo','disciplina'],
  avaliacoes: ['id'], notas: ['avaliacao_id','aluno_id'],
  fechamentos: ['turma_id','disciplina','bimestre'],
};
export function recordKey(table: string, row: MutationRecord): string {
  // PostgreSQL jsonb array text uses a space after each separator.
  return '[' + (keyFields[table] || []).map(k => JSON.stringify(row[k] == null ? null : String(row[k]))).join(', ') + ']';
}
export function matchesMutation(table: string, row: MutationRecord, payload: MutationRecord): boolean {
  if (!keyFields[table]) return false;
  return keyFields[table].every(k => payload[k] === undefined || String(row[k]) === String(payload[k]))
    && (!Array.isArray(payload.aluno_ids) || payload.aluno_ids.map(String).includes(String(row.aluno_id)));
}
export async function snapshotMutation(table: string, operation: string, payload: MutationRecord, localId?: number): Promise<MutationRecord> {
  const localTable = getOperationalTable(table);
  if (!localTable) return payload;

  // Otimização: busca direta por chave primária se localId estiver disponível e não for lote
  if (localId !== undefined && !Array.isArray(payload.records)) {
    const local = await localTable.get(localId) as unknown as MutationRecord | undefined;
    if (local) {
      if (operation === 'DELETE') {
        return {
          ...payload,
          _expected: {
            [recordKey(table, table === 'avaliacoes' ? { ...local, id: payload.id } : local)]: Number(local.serverRevision || 0)
          }
        };
      }
      return {
        ...payload,
        _expected_revision: Number(local.serverRevision || 0),
        _local_version: local.version,
        _local_id: local.localId
      };
    }
  }

  const all = await localTable.toArray() as unknown as MutationRecord[];
  if (operation === 'DELETE') {
    const matching = all.filter(r => (localId !== undefined && r.localId === localId) || matchesMutation(table,r,payload));
    return { ...payload, _expected: Object.fromEntries(matching.map(r => [recordKey(table,table === 'avaliacoes' ? {...r,id:payload.id} : r), Number(r.serverRevision || 0)])) };
  }
  const snapshot = (r: MutationRecord) => {
    const local = all.find(l => (localId !== undefined && l.localId === localId) || recordKey(table,l) === recordKey(table,r));
    return { ...r, _expected_revision: Number(local?.serverRevision || 0), _local_version: local?.version, _local_id: local?.localId };
  };
  return Array.isArray(payload.records) ? { ...payload, records: payload.records.map(snapshot) } : snapshot(payload);
}
export function keepTransactionAlive<T>(promise: Promise<T>): Promise<T> {
  return Dexie.currentTransaction ? Dexie.waitFor(promise) : promise;
}
export async function acknowledgeMutation(table: string, payload: MutationRecord, returned: MutationRecord[]): Promise<void> {
  const localTable = getOperationalTable(table);
  if (!localTable) return;
  const sent = (Array.isArray(payload.records) ? payload.records : [payload]) as MutationRecord[];
  const pending = await db.syncQueue.where('table').equals(table).toArray();
  for (const row of returned) {
    const key = recordKey(table,row);
    const request = sent.find(r => recordKey(table,r)===key) || (table==='avaliacoes' ? sent[0] : undefined);
    const localId = request?._local_id as number | undefined;
    if (localId !== undefined) {
      const current = await localTable.get(localId);
      if (current) await localTable.update(localId, {
        serverRevision: Number(row.sync_revision),
        ...(current.version === request?._local_version ? { syncStatus: 'synced' as const } : {}),
      });
    }
    // Later edits in this tab were based on the prior revision. Advance only that base,
    // preserving their value/version and never touching attempted/in-flight operations.
    for (const queued of pending) {
      if (queued.status !== 'pending' || queued.attempted || queued.ownerUserId !== localStorage.getItem('dc_last_user_id')) continue;
      const body = JSON.parse(queued.payload) as MutationRecord;
      const records = (Array.isArray(body.records) ? body.records : [body]) as MutationRecord[];
      let changed = false;
      for (const r of records) {
        if (recordKey(table,r)===key && Number(r._expected_revision || 0)===Number(request?._expected_revision || 0)) {
          r._expected_revision = row.deleted ? 0 : Number(row.sync_revision); changed = true;
        }
      }
      const expected = body._expected as Record<string, number> | undefined;
      if (expected && key in expected) { expected[key]=Number(row.sync_revision); changed=true; }
      if (changed && queued.id) await db.syncQueue.update(queued.id,{payload:JSON.stringify(body)});
    }
  }
}

/** Pending deletions remain authoritative locally until acknowledged or explicitly discarded. */
export async function hidePendingDeletes<T>(table: string, rows: T[], identity: (row: T) => MutationRecord): Promise<T[]> {
  const pending = await db.syncQueue.where('table').equals(table)
    .filter(i => i.ownerUserId === offlineOwner() && i.operation === 'DELETE').toArray();
  const deletions = pending.map(i => JSON.parse(i.payload) as MutationRecord);
  return rows.filter(row => !deletions.some(p => matchesMutation(table, identity(row), p)));
}

export async function hasPendingMutation(table: string, turmaId?: string, disciplina?: string): Promise<boolean> {
  const queued = await db.syncQueue.where('table').equals(table).filter(i => i.ownerUserId === offlineOwner()).toArray();
  return queued.some(i => {
    const body = JSON.parse(i.payload) as MutationRecord;
    const records = (Array.isArray(body.records) ? body.records : [body]) as MutationRecord[];
    return records.some(r => (!turmaId || !r.turma_id || r.turma_id === turmaId)
      && (!disciplina || ['TODAS','GERAL'].includes(disciplina.toUpperCase()) || !r.disciplina || r.disciplina === disciplina));
  });
}

/** Only complete, successful, scoped reads may reconcile deletions from another device. */
export async function pruneSyncedMissing(table: string, remote: MutationRecord[], scope: (row: MutationRecord) => boolean): Promise<void> {
  const target=getOperationalTable(table);
  if (!target) return;
  const keys=new Set(remote.map(r=>recordKey(table,r)));
  await db.transaction('rw',[target,db.syncQueue],async()=>{
    const queued=await db.syncQueue.where('table').equals(table).filter(i=>i.ownerUserId===offlineOwner()).count();
    if (queued) return;
    const local=await target.toArray();
    for (const row of local) {
      const record=row as unknown as MutationRecord;
      if (row.syncStatus==='synced' && row.localId !== undefined && scope(record) && !keys.has(recordKey(table,record))) await target.delete(row.localId);
    }
  });
}
