import {describe,it,expect,vi} from 'vitest';
import {readAllRows} from '../services/pagination';
describe('paginação completa',()=>{
 it('obtém mais de mil registros sem truncamento',async()=>{
  const records=Array.from({length:1251},(_,id)=>({id}));
  const range=vi.fn(async(from:number,to:number)=>({data:records.slice(from,to+1),error:null}));
  expect((await readAllRows({range})).data).toEqual(records);
  // 3 páginas cheias + 1 página vazia que confirma o fim do conjunto.
  expect(range).toHaveBeenCalledTimes(4);
 });
 it('não retorna relatório parcial quando uma página falha',async()=>{
  const range=vi.fn().mockResolvedValueOnce({data:Array(500).fill({id:1}),error:null}).mockResolvedValueOnce({data:null,error:new Error('rede')});
  await expect(readAllRows({range})).rejects.toThrow('rede');
 });
 it('continua lendo quando o servidor capa a resposta abaixo do tamanho pedido',async()=>{
  // O PostgREST limita a resposta (db-max-rows). Antes, a primeira página menor
  // que o `range` pedido era tratada como fim do conjunto e o relatório saía incompleto.
  const records=Array.from({length:1500},(_,id)=>({id}));
  const capped=vi.fn(async(from:number,to:number)=>({data:records.slice(from,Math.min(to,from+299)),error:null}));
  expect((await readAllRows({range:capped})).data).toEqual(records);
 });
});
