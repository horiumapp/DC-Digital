import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteAvaliacaoModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteAvaliacaoModal({
  onConfirm,
  onCancel
}: DeleteAvaliacaoModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 text-center">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-10 text-center">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
            <Trash2 className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-3">Remover?</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            As notas também serão apagadas. <br />Deseja continuar?
          </p>
        </div>
        <div className="bg-slate-50 p-8 flex gap-4">
          <button 
            onClick={onCancel} 
            className="flex-1 px-6 py-4 bg-white text-[#0f2851] font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:bg-[#eef2ff] border border-slate-200 transition"
          >
            Voltar
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 px-6 py-4 bg-red-600 text-white font-bold uppercase text-[10px] tracking-widest rounded-2xl hover:bg-red-700 transition shadow-lg shadow-red-600/20 text-center active:scale-95"
          >
            Sim, Remover
          </button>
        </div>
      </div>
    </div>
  );
}
