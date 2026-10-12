import React from 'react';
import { X, Building2, Clock, Check } from 'lucide-react';
import type { Alocacao } from '../contexts/AuthContext';

// FIX #10: Reutilizar Alocacao do AuthContext
type EscolaAlocacao = Alocacao;

interface SelecionarLotacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  alocacoes: EscolaAlocacao[];
  alocacaoAtiva: EscolaAlocacao | null;
  onSelect: (aloc: EscolaAlocacao) => void;
  /** Sem fechar: o professor precisa escolher a escola desta sessão. */
  obrigatoria?: boolean;
}

export default function SelecionarLotacaoModal({
  isOpen,
  onClose,
  alocacoes,
  alocacaoAtiva,
  onSelect,
  obrigatoria = false,
}: SelecionarLotacaoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-white z-10 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {obrigatoria ? 'Onde você vai trabalhar agora?' : 'Alterar Lotação'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {obrigatoria
                ? 'Escolha a escola e o turno desta sessão. Você pode trocar depois, sem sair da conta.'
                : 'Selecione a escola e turno para visualizar suas turmas'}
            </p>
          </div>
          {!obrigatoria && (
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          )}
        </div>

        {/* List of Allocations */}
        <div className="overflow-y-auto p-6 space-y-3 flex-1 bg-slate-50/50">
          {alocacoes.map((aloc) => {
            const isSelected = alocacaoAtiva?.id === aloc.id;
            return (
              <button
                key={aloc.id}
                type="button"
                onClick={() => {
                  onSelect(aloc);
                  onClose();
                }}
                className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-slate-50 border-[#6354c7] shadow-sm ring-1 ring-[#6354c7]/20'
                    : 'bg-white border-slate-200 hover:border-[#6354c7]/50 hover:bg-slate-50/50 hover:shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                    isSelected ? 'bg-[#6354c7] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className={`text-sm font-bold ${
                      isSelected ? 'text-[#6354c7]' : 'text-slate-800'
                    }`}>
                      {aloc.escolas?.nome || 'Escola sem nome'}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Turno: {aloc.turno}</span>
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="bg-[#6354c7] text-white p-1 rounded-full shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        {!obrigatoria && (
        <div className="flex justify-end p-5 border-t border-slate-200 bg-white sticky bottom-0 z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
          >
            Cancelar
          </button>
        </div>
        )}
      </div>
    </div>
  );
}
