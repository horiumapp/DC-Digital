// @vitest-environment node
import 'fake-indexeddb/auto';
import { beforeEach, afterAll, describe, expect, it, vi } from 'vitest';
import { db, now } from '../lib/db';
import * as Queue from '../services/offlineQueue';
import { setOfflineOwner } from '../services/offlineIdentity';
import { acknowledgeMutation, keepConflictRecords, normalizeMutationResponse } from '../services/syncProtocol';
const storage = new Map<string,string>();
vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)||null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
const owner='00000000-0000-0000-0000-000000000001';
const other='00000000-0000-0000-0000-000000000002';
const freq={turma_id:owner,aluno_id:other,data:'2026-03-01',tempo:'1',disciplina:'MAT',status:'P',participacao:'Presencial'};
beforeEach(async()=>{ await db.open(); await Promise.all(db.tables.map(t=>t.clear())); storage.set('dc_last_user_id',owner);setOfflineOwner(owner); });
afterAll(()=>db.close());
describe('offlineQueue com IndexedDB real',()=>{
 it('persiste identidade, deduplica somente operação nunca enviada e captura revisão',async()=>{
  await db.frequencias.add({...freq,syncStatus:'pending',version:2,serverRevision:4,createdAt:now(),updatedAt:now()});
  const id=await Queue.enqueue('frequencias','UPSERT',{records:[freq]});
  expect(await Queue.enqueue('frequencias','UPSERT',{records:[{...freq,status:'F'}]})).toBe(id);
  const row=await db.syncQueue.get(id);
  expect(row?.ownerUserId).toBe(owner); expect(row?.operationId).toMatch(/^[a-f0-9-]{36}$/);
  expect(JSON.parse(row!.payload).records[0]._expected_revision).toBe(4);
 });
 it('claim e enqueue concorrentes não perdem o payload mais novo',async()=>{
  await Queue.enqueue('frequencias','UPSERT',{records:[freq]});
  const [claimed] = await Promise.all([Queue.claimNext(owner),Queue.enqueue('frequencias','UPSERT',{records:[{...freq,status:'F'}]})]);
  expect(claimed).toBeDefined();
  await Queue.markDone(claimed!.id!);
  const left=await db.syncQueue.toArray();
  if (JSON.parse(claimed!.payload).records[0].status==='P') expect(left).toHaveLength(1);
  else expect(left).toHaveLength(0);
 });
 it('não modifica requisição que pode já ter sido aplicada',async()=>{
  const id=await Queue.enqueue('frequencias','UPSERT',{records:[freq]});
  await db.syncQueue.update(id,{attempted:true,status:'pending'});
  expect(await Queue.enqueue('frequencias','UPSERT',{records:[{...freq,status:'F'}]})).not.toBe(id);
 });
 it('confirma versão enviada sem promover edição posterior a synced',async()=>{
  const localId=await db.frequencias.add({...freq,syncStatus:'pending',version:1,createdAt:now(),updatedAt:now()});
  await Queue.enqueue('frequencias','UPSERT',{records:[freq]});
  const claimed=(await Queue.claimNext(owner))!;
  await db.frequencias.update(localId,{version:2,status:'F'});
  await Queue.enqueue('frequencias','UPSERT',{records:[{...freq,status:'F'}]});
  await db.transaction('rw',[db.frequencias,db.syncQueue],async()=>{
   await acknowledgeMutation('frequencias',JSON.parse(claimed.payload),[{...freq,sync_revision:1}]);
   await Queue.markDone(claimed.id!);
  });
  const local=await db.frequencias.get(localId); expect(local?.status).toBe('F');expect(local?.syncStatus).toBe('pending');
  const pending=(await db.syncQueue.toArray())[0];expect(JSON.parse(pending.payload).records[0]._expected_revision).toBe(1);
 });
 it('não reserva operação de outra pessoa',async()=>{
  await Queue.enqueue('frequencias','UPSERT',{records:[freq]});
  storage.set('dc_last_user_id',other);setOfflineOwner(other);
  expect(await Queue.claimNext(other)).toBeUndefined();
  expect(await db.syncQueue.count()).toBe(1);
 });
 it('rejeita gravação de aba cuja sessão foi trocada',async()=>{
  storage.set('dc_last_user_id',other);
  await expect(Queue.enqueue('frequencias','UPSERT',{records:[freq]})).rejects.toThrow('Sessão offline');
 });
 it('transação com SHA-256 permanece ativa e reverte em erro',async()=>{
  await expect(db.transaction('rw',[db.frequencias,db.syncQueue],async()=>{
   await db.frequencias.add({...freq,syncStatus:'pending',version:1,createdAt:now(),updatedAt:now()});
   await Queue.enqueue('frequencias','UPSERT',{records:[freq]});
   throw new Error('rollback');
  })).rejects.toThrow('rollback');
  expect(await db.frequencias.count()).toBe(0);expect(await db.syncQueue.count()).toBe(0);
 });
 it('aplica backoff e não revive conflitos automaticamente',async()=>{
  const id=await Queue.enqueue('frequencias','UPSERT',{records:[freq]});
  await Queue.retry(id,'rede');expect((await db.syncQueue.get(id))?.retryAfter).toBeDefined();
  await Queue.fail(id,'[DEAD_LETTER] CONFLICT: revisão');
  expect(await Queue.retryAllErrors(true)).toBe(0);expect(await Queue.retryDeadLetterItems()).toBe(0);
 });
 it('limita tentativas e recupera operações interrompidas',async()=>{
  const id=await Queue.enqueue('frequencias','UPSERT',{records:[freq]});
  for(let i=0;i<5;i++) await Queue.retry(id,'rede');
  expect((await db.syncQueue.get(id))?.status).toBe('error');
  expect(await Queue.retryAllErrors()).toBe(0);expect(await Queue.retryAllErrors(true)).toBe(1);
  await db.syncQueue.update(id,{status:'processing',updatedAt:'2020-01-01T00:00:00Z'});
  expect(await Queue.resetStuckItems()).toBe(1);
 });
 it('não excede capacidade da fila',async()=>{
  await db.syncQueue.bulkAdd(Array.from({length:5000},(_,i)=>({ownerUserId:owner,table:'notas',operation:'UPSERT' as const,payload:'{}',status:'pending' as const,createdAt:now(),updatedAt:now(),retryCount:0,hash:String(i)})));
  await expect(Queue.enqueue('frequencias','UPSERT',{records:[freq]})).rejects.toThrow('Limite');
 }, 30000);
 it('item com erro anterior na mesma tabela não bloqueia reivindicação de novos itens pendentes (anti-starvation)', async () => {
  const deadId = await Queue.enqueue('frequencias', 'UPSERT', { records: [freq] });
  await db.syncQueue.update(deadId, { status: 'error', lastError: '[DEAD_LETTER] Payload rejeitado' });
  const newFreq = { ...freq, data: '2026-03-02' };
  const newId = await Queue.enqueue('frequencias', 'UPSERT', { records: [newFreq] });

  const claimed = await Queue.claimNext(owner);
  expect(claimed).toBeDefined();
  expect(claimed?.id).toBe(newId);
  expect(claimed?.status).toBe('processing');
 });
 it('recibo já processado confirma a revisão enviada sem exigir um array', () => {
  const wire = { records: [{ turma_id: 't', aluno_id: 'a', _expected_revision: 4 }] };
  const rows = normalizeMutationResponse({ status: 'already_processed', operation_id: 'x' }, wire);
  expect(rows).toHaveLength(1);
  expect(rows[0].sync_revision).toBe(4);
  expect(() => normalizeMutationResponse({ status: 'outro' }, wire)).toThrow('Resposta de sincronização inválida');
  expect(() => normalizeMutationResponse({ status: 'partial', applied: [], conflicts: [] }, wire)).toThrow('Resposta de sincronização inválida');
 });
 it('separa o registro em conflito e preserva os demais do lote', () => {
  const records = [
    { turma_id: 't', aluno_id: 'a', data: '2026-03-01', tempo: '1', disciplina: 'MAT', status: 'P' },
    { turma_id: 't', aluno_id: 'b', data: '2026-03-01', tempo: '1', disciplina: 'MAT', status: 'F' },
    { turma_id: 't', aluno_id: 'c', data: '2026-03-01', tempo: '1', disciplina: 'MAT', status: 'P' },
  ];
  const kept = keepConflictRecords('frequencias', { records }, [records[1]]);
  expect(kept.records).toEqual([records[1]]);
 });
});
