import React from 'react';
import { Eye, Pencil, Trash2, List, Check, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Avaliacao } from '../../../contexts/TurmaContext';
import { formatarDataParaISO } from '../../../utils/dateUtils';

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
}

export default function AvaliacoesList({
  avaliacoes,
  alunos,
  faltasPorData,
  onViewDetails,
  onEdit,
  onDelete,
  onAddRP,
  onShowGrades,
  onSecondCall,
  onAddAvaliacao
}: AvaliacoesListProps) {
  const BIMESTRES = ['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'];

  return (
    <div className="space-y-4">
      <div className="flex items-end shadow-sm mb-2">
        <button
          onClick={onAddAvaliacao}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Adicionar Avaliação
        </button>
      </div>

      {avaliacoes.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
              <tr>
                <th className="px-6 py-4 font-black text-[10px] tracking-widest">Tipo</th>
                <th className="px-6 py-4 font-black text-[10px] tracking-widest">Data</th>
                <th className="px-6 py-4 font-black text-[10px] tracking-widest">Instrumento</th>
                <th className="px-6 py-4 font-black text-[10px] tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {BIMESTRES.map(bim => {
                const avsBim = avaliacoes.filter(av => av.bimestre === bim && !av.parent_id);
                if (avsBim.length === 0) return null;
                return (
                  <React.Fragment key={bim}>
                    <tr className="bg-blue-50/50">
                      <td colSpan={4} className="px-6 py-2 font-black text-blue-600 text-[10px] uppercase tracking-tighter">{bim}</td>
                    </tr>
                    {avsBim.map((av) => (
                      <React.Fragment key={av.id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 flex items-center gap-2">
                            <div className="flex gap-1">
                              <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center shadow-sm">
                                <Check className="w-3 h-3" />
                              </div>
                            </div>
                            <span className="text-slate-900 font-bold text-base">{av.tipo}</span>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2 text-slate-600 font-bold uppercase text-xs">
                               <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                               {av.data}
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider">{av.instrumento}</span>
                           </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => onViewDetails(av)}
                                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-[10px] uppercase transition-all border border-blue-100">
                                <Eye className="w-3.5 h-3.5" /> Detalhes
                              </button>
                              
                              <button onClick={() => onEdit(av)}
                                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-[10px] uppercase transition-all">
                                <Pencil className="w-3.5 h-3.5 text-slate-500" /> Alterar
                              </button>

                              <button onClick={() => onDelete(av)}
                                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-[10px] uppercase transition-all border border-red-100">
                                <Trash2 className="w-3.5 h-3.5" /> Remover
                              </button>

                              {alunos.some(aluno => {
                                const nota = parseFloat((aluno.notas?.[av.id] || '').replace(',', '.'));
                                return !isNaN(nota) && nota < 6.0;
                              }) && !avaliacoes.some(rp => String(rp.parent_id) === String(av.id)) && (
                                <button 
                                  onClick={() => onAddRP(av)}
                                  className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-bold text-[10px] uppercase transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5 text-slate-500" /> ADICIONAR RP
                                </button>
                              )}

                              <button onClick={() => onShowGrades(av)}
                                className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-[10px] uppercase transition-all border border-blue-100">
                                <List className="w-3.5 h-3.5" /> Notas
                              </button>
                              
                              {(() => {
                                const hasGrades = alunos.some(a => a.notas?.[av.id]);
                                const hasAbsences = (faltasPorData[formatarDataParaISO(av.data)] || new Set()).size > 0;
                                
                                if (hasGrades && hasAbsences) {
                                  return (
                                    <button onClick={() => onSecondCall(av)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-bold text-[10px] uppercase transition-all shadow-md shadow-blue-600/10">
                                      <div className="w-5 h-5 bg-blue-800 text-white rounded-full flex items-center justify-center text-[10px] scale-90">2</div> 2ª chamada
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
                                     {rp.data}
                                   </div>
                                </td>
                                <td className="px-6 py-5">
                                   <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-wider">{rp.instrumento}</span>
                                </td>
                                <td className="px-6 py-5">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => onViewDetails(rp)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-[10px] uppercase transition-all">
                                      <Eye className="w-3.5 h-3.5" /> Detalhes
                                    </button>
                                    
                                    <button onClick={() => onEdit(rp)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-[10px] uppercase transition-all">
                                      <Pencil className="w-3.5 h-3.5 text-slate-500" /> Alterar
                                    </button>
                                    
                                    <button onClick={() => onDelete(rp)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-[10px] uppercase transition-all border border-red-100">
                                      <Trash2 className="w-3.5 h-3.5" /> Remover
                                    </button>

                                    <button onClick={() => onShowGrades(rp)}
                                      className="whitespace-nowrap flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-bold text-[10px] uppercase transition-all border border-blue-100">
                                      <List className="w-3.5 h-3.5" /> Notas
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </>
                        )}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
