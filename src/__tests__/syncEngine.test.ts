// @vitest-environment node
import 'fake-indexeddb/auto';
import {beforeEach,afterEach,afterAll,describe,it,expect,vi} from 'vitest';
vi.mock('../utils/network',()=>({pingInternet:vi.fn(async()=>true),pingSupabase:vi.fn(async()=>true)}));
const mock=vi.hoisted(()=>({rpc:vi.fn(),session:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{rpc:mock.rpc,auth:{getSession:mock.session,refreshSession:vi.fn(async()=>({error:null}))}}}));
import {db,now} from '../lib/db';
import * as Queue from '../services/offlineQueue';
import {syncAll,cancelSync,getState} from '../services/syncEngine';
import {setOfflineOwner} from '../services/offlineIdentity';
import {deleteAvaliacaoLocal, deleteFrequenciasLocal, getLocalPendingCount, cacheFrequencias} from '../services/offlineStorage';
import {recordKey} from '../services/syncProtocol';
import {pingInternet} from '../utils/network';
const storage=new Map<string,string>();
vi.stubGlobal('localStorage',{getItem:(k:string)=>storage.get(k)||null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)});
const owner='00000000-0000-0000-0000-000000000001';
const row={turma_id:owner,aluno_id:'00000000-0000-0000-0000-000000000002',data:'2026-03-01',tempo:'1',disciplina:'MAT',status:'P',participacao:'Presencial'};
beforeEach(async()=>{
 await db.open();await Promise.all(db.tables.map(t=>t.clear()));
 storage.set('dc_last_user_id',owner);setOfflineOwner(owner);
 mock.session.mockResolvedValue({data:{session:{user:{id:owner}}},error:null});
 mock.rpc.mockReset();mock.rpc.mockReturnValue({abortSignal:()=>Promise.resolve({data:[{...row,id:1,sync_revision:1}],error:null})});
 vi.mocked(pingInternet).mockResolvedValue(true);
});
afterEach(()=>{cancelSync();vi.useRealTimers();});afterAll(()=>db.close());
async function enqueue(){
 await db.frequencias.add({...row,version:1,syncStatus:'pending',createdAt:now(),updatedAt:now()});
 return Queue.enqueue('frequencias','UPSERT',{records:[row]});
}
describe('syncEngine com fila e transações reais',()=>{
 it('não processa offline ou sem sessão válida',async()=>{
  await enqueue();vi.mocked(pingInternet).mockResolvedValue(false);expect((await syncAll()).synced).toBe(0);
  vi.mocked(pingInternet).mockResolvedValue(true);mock.session.mockResolvedValue({data:{session:null},error:null});
  expect((await syncAll()).synced).toBe(0);expect(mock.rpc).not.toHaveBeenCalled();
 });
 it('confirma local e fila na mesma transação depois de RPC bem sucedida',async()=>{
  await enqueue();expect((await syncAll()).synced).toBe(1);expect(await db.syncQueue.count()).toBe(0);
  const local=(await db.frequencias.toArray())[0];expect(local.syncStatus).toBe('synced');expect(local.serverRevision).toBe(1);
 });
 it('preserva conflitos como erro acionável',async()=>{
  const id=await enqueue();mock.rpc.mockReturnValue({abortSignal:()=>Promise.resolve({error:{code:'40001',message:'CONFLICT: revisão'},data:null})});
  expect((await syncAll()).failed).toBe(1);expect((await db.syncQueue.get(id))?.lastError).toContain('CONFLICT');
  expect((await db.frequencias.toArray())[0].syncStatus).toBe('pending');
 });
 it('reenvia exatamente o mesmo operation_id e payload após resposta perdida',async()=>{
  const id=await enqueue();mock.rpc.mockReturnValueOnce({abortSignal:()=>Promise.resolve({error:{message:'Failed to fetch'},data:null})});
  await syncAll();const first=mock.rpc.mock.calls[0][1];
  await db.syncQueue.update(id,{retryAfter:undefined});await syncAll();
  expect(mock.rpc.mock.calls[1][1]).toEqual(first);
 });
 it('cancelamento aborta a rede e libera o mecanismo',async()=>{
  await enqueue();
  let ready!:()=>void;
  const started=new Promise<void>(resolve=>{ready=resolve;});
  mock.rpc.mockImplementation(()=>({abortSignal:(signal:AbortSignal)=>new Promise((_,reject)=>{
    signal.addEventListener('abort',()=>reject(signal.reason));ready();
  })}));
  const promise=syncAll();await started;cancelSync();const result=await promise;
  expect(result.failed).toBe(1);expect(getState()).not.toBe('SYNCING');expect(await db.syncQueue.count()).toBe(1);
 });
 it('não envia fila pertencente a outro usuário',async()=>{
  await enqueue();storage.set('dc_last_user_id',row.aluno_id);setOfflineOwner(row.aluno_id);
  mock.session.mockResolvedValue({data:{session:{user:{id:row.aluno_id}}},error:null});
  await syncAll();expect(mock.rpc).not.toHaveBeenCalled();expect(await db.syncQueue.count()).toBe(1);
 });
 it('aguarda avaliação temporária sem enviar notas inválidas',async()=>{
  await Queue.enqueue('notas','UPSERT',{records:[{avaliacao_id:'temp_1',aluno_id:row.aluno_id,valor:7}]});
  await syncAll();expect(mock.rpc).not.toHaveBeenCalled();expect((await db.syncQueue.toArray())[0].status).toBe('pending');
 });
});

it('exclusão de frequência preserva outras datas, tempos e disciplinas e continua pendente sem registros locais', async () => {
 const local = {...row,version:1,syncStatus:'synced' as const,serverRevision:2,createdAt:now(),updatedAt:now()};
 await db.frequencias.bulkAdd([local,{...local,data:'2026-03-02'},{...local,tempo:'2'},{...local,disciplina:'HIST'}]);
 await db.transaction('rw',[db.frequencias,db.syncQueue],async()=>{
  await Queue.enqueue('frequencias','DELETE',{turma_id:row.turma_id,data:row.data,tempo:row.tempo,disciplina:row.disciplina});
  await deleteFrequenciasLocal(row.turma_id,row.disciplina,row.data,row.tempo);
 });
 expect(await db.frequencias.count()).toBe(3);
 const deletion=(await db.syncQueue.toArray())[0];
 expect(JSON.parse(deletion.payload)._expected[recordKey('frequencias',row)]).toBe(2);
 expect(await getLocalPendingCount()).toBeGreaterThan(0);
});
it('remapeia e confirma exclusão de avaliação removida localmente durante o INSERT remoto', async () => {
 const av={turma_id:owner,clientTempId:'temp_ui_123',tipo:'AV01',data:'2026-03-01',disciplina:'MAT',bimestre:'1. BIMESTRE',valor_maximo:10,instrumento:'Prova',objetos:[]};
 const lid=await db.avaliacoes.add({...av,syncStatus:'pending',version:1,createdAt:now(),updatedAt:now()});
 await Queue.enqueue('avaliacoes','INSERT',av,lid);
 let ready!:()=>void; let release!:(v:unknown)=>void;
 const started=new Promise<void>(resolve=>{ready=resolve;});
 mock.rpc.mockImplementationOnce(()=>({abortSignal:()=>new Promise(resolve=>{release=resolve;ready();})}));
 mock.rpc.mockImplementationOnce(()=>({abortSignal:()=>Promise.resolve({data:[{...av,id:99,sync_revision:1,deleted:true}],error:null})}));
 const running=syncAll();await started;
 await db.transaction('rw',[db.avaliacoes,db.notas,db.syncQueue],async()=>{
  await Queue.enqueue('avaliacoes','DELETE',{id:av.clientTempId},lid);
  await deleteAvaliacaoLocal(av.clientTempId);
 });
 release({data:[{...av,id:99,sync_revision:1}],error:null});
 const result=await running;
 expect(result.failed).toBe(0);expect(result.synced).toBe(2);
 const request=mock.rpc.mock.calls[1][1];expect(request.p_payload.id).toBe('99');
 expect(request.p_payload._expected['["99"]']).toBe(1);
 expect(await db.avaliacoes.count()).toBe(0);expect(await db.syncQueue.count()).toBe(0);
});

it('cache concorrente não duplica registros nem restaura uma exclusão pendente',async()=>{
 const remote={...row,serverRevision:4};
 await Promise.all([cacheFrequencias(owner,[remote]),cacheFrequencias(owner,[remote])]);
 expect(await db.frequencias.count()).toBe(1);
 await db.transaction('rw',[db.frequencias,db.syncQueue],async()=>{
  await Queue.enqueue('frequencias','DELETE',row);await deleteFrequenciasLocal(owner,row.disciplina,row.data,row.tempo);
 });
 await cacheFrequencias(owner,[remote]);expect(await db.frequencias.count()).toBe(0);
});
it('a tela pode editar notas e excluir avaliação usando o alias anterior à sincronização',async()=>{
 vi.stubGlobal('navigator',{onLine:false});
 const service=await import('../services/turmaServiceOffline');service.setOnlineStatus(false);
 const av={id:'99',serverId:'99',clientTempId:'temp_ui_old',turma_id:owner,tipo:'AV01',data:'2026-03-01',disciplina:'MAT',bimestre:'1. BIMESTRE',valor_maximo:10,instrumento:'Prova',objetos:[],serverRevision:4,version:1,syncStatus:'synced' as const,createdAt:now(),updatedAt:now()};
 await db.avaliacoes.add(av);
 await db.notas.add({avaliacao_id:'99',aluno_id:row.aluno_id,valor:5,serverRevision:6,version:1,syncStatus:'synced',createdAt:now(),updatedAt:now()});
 await service.salvarNotas('temp_ui_old',[{alunoId:row.aluno_id,valor:'7'}]);
 const grade=(await db.syncQueue.toArray())[0];const sent=JSON.parse(grade.payload).records[0];
 expect(sent.avaliacao_id).toBe('99');expect(sent._expected_revision).toBe(6);
 await service.removerAvaliacao('temp_ui_old');
 const deleted=(await db.syncQueue.toArray()).find(i=>i.table==='avaliacoes')!;
 expect(JSON.parse(deleted.payload).id).toBe('99');expect(JSON.parse(deleted.payload)._expected['["99"]']).toBe(4);
 expect(await db.avaliacoes.count()).toBe(0);
});
