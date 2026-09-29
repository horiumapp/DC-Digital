import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './common/Toast';

type Aluno = { id:string; nome:string; turma_id:string; escola_id?:string };
type Turma = { id:string; nome:string; turno:string; ano_letivo:string };
export default function RemanejarAlunoModal({aluno,onClose,onSuccess}:{aluno:Aluno|null;onClose:()=>void;onSuccess:()=>void}) {
 const {showError,showSuccess}=useToast(); const [turmas,setTurmas]=useState<Turma[]>([]);const [destino,setDestino]=useState('');const [motivo,setMotivo]=useState('');const [saving,setSaving]=useState(false);
 useEffect(()=>{if(!aluno?.escola_id)return;supabase.from('turmas').select('id,nome,turno,ano_letivo').eq('escola_id',aluno.escola_id).order('nome').then(({data})=>setTurmas((data||[]).filter(t=>t.id!==aluno.turma_id)));},[aluno]);
 if(!aluno)return null;
 const confirmar=async()=>{if(!destino){showError('Selecione a turma de destino.');return;}setSaving(true);const {error}=await supabase.rpc('remanejar_aluno',{p_aluno_id:aluno.id,p_turma_destino_id:destino,p_motivo:motivo||null});setSaving(false);if(error){showError(error.message);return;}showSuccess('Aluno remanejado com sucesso.');onSuccess();onClose();};
 return <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-black text-slate-800">Remanejar aluno</h2><p className="mt-1 text-sm text-slate-500">{aluno.nome}</p></div><button onClick={onClose} className="rounded-lg p-2 text-slate-500"><X/></button></div><label className="mt-5 block text-sm font-bold text-slate-700">Turma de destino</label><select value={destino} onChange={e=>setDestino(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3"><option value="">Selecione a turma</option>{turmas.map(t=><option key={t.id} value={t.id}>{t.nome} — {t.turno}</option>)}</select><label className="mt-4 block text-sm font-bold text-slate-700">Motivo (opcional)</label><textarea value={motivo} onChange={e=>setMotivo(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 p-3" rows={3}/><button disabled={saving} onClick={confirmar} className="mt-5 w-full rounded-xl bg-[#0f2851] py-3 font-bold text-white disabled:opacity-50">{saving?'Remanejando...':'Confirmar remanejamento'}</button></div></div>;
}