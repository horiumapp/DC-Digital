import React from 'react';
import { Eye, Pencil, Trash2, List, Check, Calendar as CalendarIcon, Plus, Clock } from 'lucide-react';
import { Avaliacao } from '../../../contexts/TurmaContext';
import { formatarDataParaISO, formatarDataParaExibicao } from '../../../utils/dateUtils';

interface AvaliacoesListProps {
  avaliacoes: Avaliacao[];
  alunos: any[];
  faltasPorData: Record<string, Set<string>>;
  onViewDetails: (av: Avaliacao) => void;
  onEdit: (av: Avaliacao) => void;
  onDelete: (av: Avaliacao) => void;
  onAddRP: (av: Avaliacao) => void;
  onShowGrades: (av: Avaliacao) => void;
  onSecondCall: (av: Avaliacao) => void;
  onAddAvaliacao: () => void;
  disabled?: boolean;
}

const AvaliacoesList = React.memo(function AvaliacoesList({
  avaliacoes,
  alunos,
  faltasPorData,
  onViewDetails,
  onEdit,
  onDelete,
  onAddRP,
  onShowGrades,
  onSecondCall,
  onAddAvaliacao,
  disabled
}: AvaliacoesListProps) {
  const BIMESTRES = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

  // Helper para verificar se uma avaliação tem notas pendentes
  const isAvaliacaoPendente = (av: Avaliacao) => {
    if (!alunos || alunos.length === 0) return false;
    const dataIso = formatarDataParaISO(av.data);
    const faltasNoDia = faltasPorData[dataIso] || new Set();
    const alunosPresentes = alunos.filter(a => !faltasNoDia.has(a.id));
    if (alunosPresentes.length === 0) return false;
    return alunosPresentes.some(a => {
      const nota = a.notas?.[av.id] ?? a.notas?.[String(av.id)];
      return nota === undefined || nota === null || String(nota).trim() === '';
    });
  };

  const avPendente = avaliacoes.filter(av => !av.parent_id).find(av => isAvaliacaoPendente(av));

  return (
    <div className="space-y-4">
      {!disabled && (
        <div className="flex items-end shadow-sm mb-2">
          <button
            onClick={onAddAvaliacao}
            className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#e0e7ff] transition flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" /> Adicionar Avaliação
          </button>
        </div>
      )}

      {avaliacoes.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#f8f9fa] border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-bold text-[#0f2851] text-[11px] tracking-wider uppercase">Tipo</th>
                <th className="px-6 py-4 font-bold text-[#0f2851] text-[11px] tracking-wider uppercase">Data</th>
                <th className="px-6 py-4 font-bold text-[#0f2851] text-[11px] tracking-wider uppercase">Instrumento</th>
                <th className="px-6 py-4 font-bold text-[#0f2851] text-[11px] tracking-wider uppercase text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {BIMESTRES.map(bim => {
                const avsBim = avaliacoes.filter(av => av.bimestre === bim && !av.parent_id);
                if (avsBim.length === 0) return null;
                return (
                  <React.Fragment key={bim}>
                    <tr className="bg-[#eef2ff]/30">
                      <td colSpan={4} className="px-6 py-2 font-bold text-[#0f2851] text-[11px] uppercase tracking-wider">{bim}</td>
                    </tr>
                    {avsBim.map((av) => {
                      const temPendencia = isAvaliacaoPendente(av);
                      return (
                      <React.Fragment key={av.id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-2 flex-wrap">
                            <div className="flex gap-1 items-center">
                              {temPendencia ? (
                                <div className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center shadow-sm" title="Notas pendentes">
                                  <Clock className="w-3 h-3" />
                                </div>
                              ) : (
                                <div className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-sm" title="Notas lançadas">
                                  <Check className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                            <span className="text-slate-900 font-bold text-base">{av.tipo}</span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2 text-slate-600 font-bold uppercase text-xs">
                               <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                               {formatarDataParaExibicao(av.data)}
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider">{av.instrumento}</span>
                           </td>
                           <td className="px-6 py-4">
                             <div className="flex items-center justify-center gap-2">
                              <button onClick={() => onViewDetails(av)}
                                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-[#eef2ff] text-[#0f2851] hover:bg-[#e0e7ff] rounded-lg font-bold text-[10px] uppercase transition-all border border-blue-100">
                                <Eye className="w-3.5 h-3.5" /> Detalhes
                              </button>
                              
                              {!disabled && (
                                <>
                                  <button onClick={() => onEdit(av)}
                                    className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-[10px] uppercase transition-all">
                                    <Pencil className="w-3.5 h-3.5 text-slate-500" /> Alterar
                                  </button>

                                  <button onClick={() => onDelete(av)}
                                    className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-[10px] uppercase transition-all border border-red-100">
                                    <Trash2 className="w-3.5 h-3.5" /> Remover
                                  </button>

                                  {alunos.some(aluno => {
                                    const notaStr = aluno.notas?.[av.id] || aluno.notas?.[String(av.id)];
                                    const nota = parseFloat((notaStr || '').replace(',', '.'));
                                    const maxVal = av.valorMaximo ? Number(av.valorMaximo) : 10;
                                    const mediaCorte = maxVal / 2;
                                    return !isNaN(nota) && nota < mediaCorte;
                                  }) && !avaliacoes.some(rp => String(rp.parent_id) === String(av.id)) && (
                                    <button 
                                      onClick={() => onAddRP(av)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-white text-[#0f2851] border border-blue-100 hover:bg-[#eef2ff] rounded-lg font-bold text-[10px] uppercase transition-all"
                                    >
                                      <Plus className="w-3.5 h-3.5 text-[#0f2851]" /> ADICIONAR RP
                                    </button>
                                  )}
                                </>
                              )}

                              <button onClick={() => onShowGrades(av)}
                                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-[#eef2ff] text-[#0f2851] hover:bg-[#e0e7ff] rounded-lg font-bold text-[10px] uppercase transition-all border border-blue-100">
                                <List className="w-3.5 h-3.5" /> Notas
                              </button>
                              
                              {!disabled && (() => {
                                const hasAbsences = (faltasPorData[formatarDataParaISO(av.data)] || new Set()).size > 0;
                                const alreadyHasSecondCall = avaliacoes.some(rp => String(rp.parent_id) === String(av.id) && rp.tipo.includes('2CH'));
                                
                                if (hasAbsences && !alreadyHasSecondCall) {
                                  return (
                                    <button onClick={() => onSecondCall(av)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-[#eef2ff] text-[#0f2851] hover:bg-[#e0e7ff] rounded-lg font-bold text-[10px] uppercase transition-all border border-blue-100 shadow-sm">
                                      <div className="w-5 h-5 bg-[#0f2851] text-white rounded-full flex items-center justify-center text-[10px] scale-90">2</div> 2ª chamada
                                    </button>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Seção de Recuperações Paralelas */}
                        {avaliacoes.some(rp => String(rp.parent_id) === String(av.id)) && (
                          <>
                            {avaliacoes.filter(rp => String(rp.parent_id) === String(av.id)).map(rp => (
                              <tr key={rp.id} className="bg-amber-50/40 border-b border-slate-50 group/rp transition-colors hover:bg-amber-50/60">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                      <Plus className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-slate-900 font-bold text-base">{rp.tipo}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5">
                                   <div className="flex items-center gap-2 text-slate-600 font-bold uppercase text-xs">
                                     <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                                     {formatarDataParaExibicao(rp.data)}
                                   </div>
                                </td>
                                <td className="px-6 py-5">
                                   <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider">{rp.instrumento}</span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => onViewDetails(rp)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-[#eef2ff] text-[#0f2851] hover:bg-[#e0e7ff] rounded-lg font-bold text-[10px] uppercase transition-all">
                                      <Eye className="w-3.5 h-3.5" /> Detalhes
                                    </button>
                                    
                                    {!disabled && (
                                      <>
                                        <button onClick={() => onEdit(rp)}
                                          className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-[10px] uppercase transition-all">
                                          <Pencil className="w-3.5 h-3.5 text-slate-500" /> Alterar
                                        </button>
                                        
                                        <button onClick={() => onDelete(rp)}
                                          className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-[10px] uppercase transition-all border border-red-100">
                                          <Trash2 className="w-3.5 h-3.5" /> Remover
                                        </button>
                                      </>
                                    )}

                                    <button onClick={() => onShowGrades(rp)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-[#eef2ff] text-[#0f2851] hover:bg-[#e0e7ff] rounded-lg font-bold text-[10px] uppercase transition-all border border-blue-100">
                                      <List className="w-3.5 h-3.5" /> Notas
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});

export default AvaliacoesList;
