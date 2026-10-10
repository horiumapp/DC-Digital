import React, { useCallback, useEffect, useState } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { useToast } from '../common/Toast';
import { formatarDataParaExibicao } from '../../utils/dateUtils';
import { listarAnotacoes, removerAnotacao, salvarAnotacao } from '../../services/turmaServiceOffline';
import type { LocalAnotacao } from '../../lib/db';

interface AnotacoesTabProps {
  turmaAtiva: { id: string | number; componente?: string } | null;
  selectedDate: string;
  tempoAula: string;
  setTempoAula: (v: string) => void;
  disponiveisTempos: string[];
  disabled?: boolean;
}

export default function AnotacoesTab({
  turmaAtiva,
  selectedDate,
  tempoAula,
  setTempoAula,
  disponiveisTempos,
  disabled,
}: AnotacoesTabProps) {
  const [isAddingAnotacao, setIsAddingAnotacao] = useState(false);
  const [anotacoes, setAnotacoes] = useState<LocalAnotacao[]>([]);
  const [textoAnotacao, setTextoAnotacao] = useState('');
  const [carregando, setCarregando] = useState(false);

  const { showWarning, showSuccess, showError } = useToast();
  const disciplina = turmaAtiva?.componente || '';

  const carregar = useCallback(async () => {
    if (!turmaAtiva || !selectedDate || !tempoAula || !disciplina) {
      setAnotacoes([]);
      return;
    }
    setCarregando(true);
    try {
      const lista = await listarAnotacoes(turmaAtiva.id, selectedDate, tempoAula, disciplina);
      setAnotacoes(lista);
    } catch {
      showError('Não foi possível carregar as anotações desta aula.');
    } finally {
      setCarregando(false);
    }
  }, [turmaAtiva, selectedDate, tempoAula, disciplina, showError]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const handleSave = async () => {
    if (!turmaAtiva || !disciplina) {
      showWarning('Escolha uma turma antes de anotar.');
      return;
    }
    if (!textoAnotacao.trim()) {
      showWarning('Por favor, descreva a anotação.');
      return;
    }
    try {
      await salvarAnotacao(turmaAtiva.id, selectedDate, tempoAula, disciplina, textoAnotacao);
      setIsAddingAnotacao(false);
      setTextoAnotacao('');
      showSuccess('Anotação guardada neste aparelho e enviada para sincronizar.');
      await carregar();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Não foi possível guardar a anotação.');
    }
  };

  const handleRemove = async (localId?: number) => {
    if (localId == null) return;
    try {
      await removerAnotacao(localId);
      await carregar();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Não foi possível excluir a anotação.');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
      {!isAddingAnotacao ? (
        <>
          <div className="flex items-end gap-4 mb-6">
            <div className="w-64">
              <label className="block text-sm text-slate-600 mb-1">Tempo de aula</label>
              <select
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                value={tempoAula}
                onChange={(e) => setTempoAula(e.target.value)}
              >
                {disponiveisTempos.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {!disabled && (
              <button
                onClick={() => setIsAddingAnotacao(true)}
                className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition h-[38px] flex items-center gap-2 shadow-sm active:scale-95"
              >
                <span className="text-lg leading-none">+</span> Adicionar anotação
              </button>
            )}
          </div>

          <p role="note" className="text-xs text-slate-500 mb-4">
            A anotação fica ligada a esta turma, à data {formatarDataParaExibicao(selectedDate)} e ao {tempoAula || 'tempo selecionado'}.
          </p>

          {carregando && (
            <div role="status" className="text-sm text-slate-500 mb-4">Carregando anotações…</div>
          )}

          {!carregando && anotacoes.length === 0 && (
            <div role="status" className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-lg text-sm mb-6">
              Nenhuma anotação para o {tempoAula || 'tempo selecionado'}.
            </div>
          )}

          {anotacoes.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Tempo</th>
                    <th className="px-4 py-3 font-medium">Anotação</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    {!disabled && <th className="px-4 py-3 font-medium"><span className="sr-only">Ações</span></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {anotacoes.map(anot => (
                    <tr key={anot.localId ?? anot.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-500">{formatarDataParaExibicao(anot.data)}</td>
                      <td className="px-4 py-3 text-slate-500">{anot.tempo}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{anot.texto}</td>
                      <td className="px-4 py-3 text-slate-500">{anot.syncStatus === 'synced' ? 'Sincronizada' : 'Aguardando envio'}</td>
                      {!disabled && (
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => void handleRemove(anot.localId)}
                            className="text-slate-500 hover:text-red-700"
                            aria-label="Excluir anotação"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="w-64">
            <label className="block text-sm text-slate-600 mb-1">Tempo de aula:</label>
            <input
              type="text"
              value={tempoAula}
              disabled
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 bg-slate-50 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Anotação</label>
            <textarea
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 min-h-[120px] resize-y bg-slate-50/50"
              value={textoAnotacao}
              onChange={(e) => setTextoAnotacao(e.target.value)}
              maxLength={4000}
              placeholder="Descreva aqui sua anotação pedagógica..."
            ></textarea>
          </div>

          <div className="pt-2">
             <div className="flex items-center gap-3">
               <button onClick={() => void handleSave()} className="flex items-center gap-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-bold hover:bg-[#e0e7ff] transition shadow-sm active:scale-95">
                 <Save className="w-4 h-4" /> Salvar anotação
               </button>
               <button
                 onClick={() => { setIsAddingAnotacao(false); }}
                 className="bg-white text-slate-600 border border-slate-200 px-6 py-2 rounded text-sm font-medium hover:bg-slate-50 transition"
               >
                 Cancelar
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
