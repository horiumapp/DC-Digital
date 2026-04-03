import React from 'react';
import { Eye } from 'lucide-react';

interface AvaliacaoDetailsViewProps {
  selectedAvaliacao: any;
  onBack: () => void;
}

export default function AvaliacaoDetailsView({
  selectedAvaliacao,
  onBack
}: AvaliacaoDetailsViewProps) {
  if (!selectedAvaliacao) return null;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          Identificação da Avaliação
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Código da Avaliação</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700">
              AV-{String(selectedAvaliacao.id).padStart(6, '0')}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data da avaliação</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700">{selectedAvaliacao.data}</div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Valor da avaliação</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700">10,00</div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Instrumento pedagógico</label>
            <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700">{selectedAvaliacao.instrumento}</div>
          </div>
        </div>

        <h4 className="text-sm font-bold text-slate-700 mb-4">Objetos de Conhecimento da Avaliação</h4>
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
              <tr>
                <th className="px-6 py-3 font-black text-[10px] tracking-widest">Unidade Didática</th>
                <th className="px-6 py-3 font-black text-[10px] tracking-widest">Objeto de Conhecimento da avaliação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!selectedAvaliacao.objetos || selectedAvaliacao.objetos.length === 0) ? (
                <tr>
                  <td colSpan={2} className="px-6 py-5 text-center text-slate-400 text-sm font-medium">
                    Nenhum objeto de conhecimento vinculado
                  </td>
                </tr>
              ) : (
                selectedAvaliacao.objetos.map((obj: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-700 font-bold text-xs">{obj.unidade || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 text-xs">{obj.objeto || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={onBack}
        className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
      >
        Voltar
      </button>
    </div>
  );
}
