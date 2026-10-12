import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from './common/Toast';
import {
  lancarAtestadoMedico,
  listarAtestadosDoAluno,
  removerAtestadoMedico,
  type AtestadoMedico,
} from '../services/atestadoService';

interface AtestadoMedicoModalProps {
  aluno: { id: string; nome: string; escolaId: string } | null;
  onClose: () => void;
}

function formatarDia(iso: string): string {
  const [ano, mes, dia] = iso.split('-');
  if (!ano || !mes || !dia) return iso;
  return `${dia}/${mes}/${ano}`;
}

export default function AtestadoMedicoModal({ aluno, onClose }: AtestadoMedicoModalProps) {
  const { showError, showSuccess } = useToast();
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [observacao, setObservacao] = useState('');
  const [lista, setLista] = useState<AtestadoMedico[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aluno) return;
    let ativo = true;
    listarAtestadosDoAluno(aluno.id)
      .then(registros => { if (ativo) setLista(registros); })
      .catch(() => { if (ativo) showError('Não foi possível carregar os atestados deste aluno.'); });
    return () => { ativo = false; };
  }, [aluno, showError]);

  if (!aluno) return null;

  const salvar = async () => {
    if (!inicio || !fim) {
      showError('Informe o início e o fim do atestado.');
      return;
    }
    if (fim < inicio) {
      showError('A data final não pode ser anterior à data inicial.');
      return;
    }
    setSalvando(true);
    try {
      await lancarAtestadoMedico({
        alunoId: aluno.id,
        escolaId: aluno.escolaId,
        dataInicio: inicio,
        dataFim: fim,
        observacao,
      });
      setLista(await listarAtestadosDoAluno(aluno.id));
      setInicio('');
      setFim('');
      setObservacao('');
      showSuccess('Atestado registrado. A chamada desses dias fica como falta justificada.');
    } catch (err) {
      console.error(err);
      showError('Não foi possível registrar o atestado.');
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (id: string) => {
    try {
      await removerAtestadoMedico(id);
      setLista(atual => atual.filter(item => item.id !== id));
      showSuccess('Atestado removido. A falta justificada deixa de ser travada.');
    } catch (err) {
      console.error(err);
      showError('Não foi possível remover o atestado.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true" aria-labelledby="atestado-titulo">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="atestado-titulo" className="text-lg font-black text-slate-800">Atestado médico</h2>
            <p className="text-sm font-bold text-[#6354c7]">{aluno.nome}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-600">
          O atestado justifica a falta e prevalece sobre a chamada do professor. Ele não abona a frequência.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-slate-500">
            Início
            <input type="date" value={inicio} onChange={event => setInicio(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700" />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Fim
            <input type="date" value={fim} onChange={event => setFim(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700" />
          </label>
        </div>
        <label className="mt-3 block text-xs font-bold text-slate-500">
          Observação
          <input value={observacao} onChange={event => setObservacao(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700" placeholder="Opcional" />
        </label>
        <button type="button" onClick={salvar} disabled={salvando} className="mt-4 w-full rounded-xl bg-[#6354c7] py-3 text-sm font-bold text-white disabled:opacity-60">
          {salvando ? 'Registrando...' : 'Registrar atestado'}
        </button>
        {lista.length > 0 && (
          <ul className="mt-4 space-y-2">
            {lista.map(item => (
              <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm">
                <span className="font-bold text-amber-800">{formatarDia(item.data_inicio)} a {formatarDia(item.data_fim)}</span>
                <button type="button" onClick={() => remover(item.id)} className="text-xs font-bold text-rose-600">Remover</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
