import {describe,it,expect,vi} from 'vitest';
import {readAllRows} from '../services/pagination';
describe('paginação completa',()=>{
 it('obtém mais de mil registros sem truncamento',async()=>{
  const records=Array.from({length:1251},(_,id)=>({id}));
  const range=vi.fn(async(from:number,to:number)=>({data:records.slice(from,to+1),error:null}));
  expect((await readAllRows({range})).data).toEqual(records);expect(range).toHaveBeenCalledTimes(3);
 });
 it('não retorna relatório parcial quando uma página falha',async()=>{
  const range=vi.fn().mockResolvedValueOnce({data:Array(500).fill({id:1}),error:null}).mockResolvedValueOnce({data:null,error:new Error('rede')});
  await expect(readAllRows({range})).rejects.toThrow('rede');
 });
});
