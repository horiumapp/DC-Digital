import React, { useState } from 'react';
import { Save } from 'lucide-react';
import { useToast } from '../common/Toast';

interface AnotacoesTabProps {
  turmaAtiva: { id: string | number; nome?: string } | null;
  tempoAula: string;
  setTempoAula: (v: string) => void;
  disponiveisTempos: string[];
  disabled?: boolean;
}

export default function AnotacoesTab({
  turmaAtiva: _turmaAtiva,
  tempoAula,
  setTempoAula,
  disponiveisTempos,
  disabled,
}: AnotacoesTabProps) {
  const [isAddingAnotacao, setIsAddingAnotacao] = useState(false);
  const [anotacoes, setAnotacoes] = useState<{ id: string; texto: string; tempo: string; data: string }[]>([]);
  const [textoAnotacao, setTextoAnotacao] = useState('');

  const { showWarning, showSuccess } = useToast();

  const handleSave = () => {
    if (!textoAnotacao.trim()) {
      showWarning('Por favor, descreva a anotação.');
      return;
    }
    
    const sanitizedText = textoAnotacao
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    const novaAnotacao = {
      id: Math.random().toString(36).substr(2, 9),
      texto: sanitizedText,
      tempo: tempoAula,
      data: new Date().toLocaleDateString('pt-BR')
    };

    setAnotacoes(prev => [novaAnotacao, ...prev]);
    setIsAddingAnotacao(false);
    setTextoAnotacao('');
    showSuccess('Anotação adicionada. Ela fica só nesta tela e ainda não é gravada no servidor.');
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
            As anotações pedagógicas ficam apenas nesta tela e não são gravadas no servidor nem sincronizadas.
          </p>

          {anotacoes.filter(a => a.tempo === tempoAula).length === 0 && (
            <div role="status" className="bg-slate-50 border border-slate-200 text-slate-600 px-4 py-3 rounded-lg text-sm mb-6">
              Nenhuma anotação para o {tempoAula || 'tempo selecionado'}.
            </div>
          )}

          {anotacoes.some(a => a.tempo === tempoAula) && (
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Tempo</th>
                    <th className="px-4 py-3 font-medium">Anotação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {anotacoes.filter(a => a.tempo === tempoAula).map(anot => (
                    <tr key={anot.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-500">{anot.data}</td>
                      <td className="px-4 py-3 text-slate-500">{anot.tempo}</td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{anot.texto}</td>
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
              placeholder="Descreva aqui sua anotação pedagógica..."
            ></textarea>
          </div>

          <div className="pt-2">
             <div className="flex items-center gap-3">
               <button onClick={handleSave} className="flex items-center gap-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-bold hover:bg-[#e0e7ff] transition shadow-sm active:scale-95">
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
