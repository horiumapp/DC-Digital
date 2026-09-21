import React from 'react';
import { Eye, Pencil, Trash2, List, Check, Calendar as CalendarIcon, Plus, Clock } from 'lucide-react';
import { Avaliacao, Aluno } from '../../../contexts/TurmaContext';
import { formatarDataParaISO, formatarDataParaExibicao, getBimestreNumero } from '../../../utils/dateUtils';
import { isAvaliacaoPendente } from '../../../utils/avaliacaoUtils';

interface AvaliacoesListProps {
  avaliacoes: Avaliacao[];
  todasAvaliacoes?: Avaliacao[];
  currentBimestre?: string;
  onSelectBimestre?: (bimestre: string) => void;
  alunos: Aluno[];
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
  todasAvaliacoes,
  currentBimestre = '1º Bimestre',
  onSelectBimestre,
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

  // Contagem de avaliações por bimestre
  const countsPorBimestre = React.useMemo(() => {
    const list = todasAvaliacoes || avaliacoes;
    const map: Record<string, number> = {
      '1º Bimestre': 0,
      '2º Bimestre': 0,
      '3º Bimestre': 0,
      '4º Bimestre': 0,
    };
    list.forEach(av => {
      if (av.parent_id) return;
      const num = getBimestreNumero(av.bimestre || '') ?? getBimestreNumero(av.data);
      if (num && map[`${num}º Bimestre`] !== undefined) {
        map[`${num}º Bimestre`]++;
      }
    });
    return map;
  }, [todasAvaliacoes, avaliacoes]);

  // Filtra as avaliações principais do bimestre atual
  const avsBim = React.useMemo(() => {
    const targetNum = getBimestreNumero(currentBimestre);
    return avaliacoes.filter(av => {
      if (av.parent_id) return false;
      const avNum = getBimestreNumero(av.bimestre || '') ?? getBimestreNumero(av.data);
      return avNum === targetNum;
    });
  }, [avaliacoes, currentBimestre]);

  return (
    <div className="space-y-4">
      {/* Barra de Seleção de Bimestre e Ação */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/90 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl">
          {BIMESTRES.map(bim => {
            const isSelected = bim === currentBimestre;
            const count = countsPorBimestre[bim] || 0;
            return (
              <button
                key={bim}
                type="button"
                onClick={() => onSelectBimestre?.(bim)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-white dark:bg-slate-900 text-[#0f2851] dark:text-sky-300 shadow-xs ring-1 ring-slate-200/60 dark:ring-slate-700'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span>{bim}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isSelected
                    ? 'bg-[#eef2ff] text-[#0f2851] dark:bg-sky-950 dark:text-sky-300'
                    : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {!disabled && (
          <button
            onClick={onAddAvaliacao}
            className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 hover:bg-[#e0e7ff] dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-900 px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Adicionar Avaliação
          </button>
        )}
      </div>

      {avsBim.length === 0 ? (
        <div className="py-16 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-sky-950/50 text-[#0f2851] dark:text-sky-400 flex items-center justify-center mx-auto shadow-xs">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhuma avaliação cadastrada no {currentBimestre}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Não há avaliações cadastradas para esta turma neste bimestre.
            </p>
          </div>
          {!disabled && (
            <div className="pt-2">
              <button
                onClick={onAddAvaliacao}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0f2851] hover:bg-[#1a3a6d] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" /> Cadastrar Avaliação
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Visualização Mobile (Cards) - para telas menores que md */}
          <div className="block md:hidden space-y-4">
            <div className="bg-[#eef2ff] border border-blue-100 px-4 py-2.5 rounded-xl font-bold text-[#0f2851] text-xs uppercase tracking-wider flex items-center justify-between">
              <span>{currentBimestre}</span>
              <span className="text-[10px] font-bold text-[#0f2851] bg-white px-2.5 py-0.5 rounded-full border border-blue-100 shadow-xs">
                {avsBim.length} {avsBim.length === 1 ? 'avaliação' : 'avaliações'}
              </span>
            </div>

            {/* Lista de Avaliações em Cards */}
            <div className="space-y-3">
              {avsBim.map((av) => {
                const temPendencia = isAvaliacaoPendente(av, avaliacoes, alunos, faltasPorData);
                      const hasAbsences = (faltasPorData[formatarDataParaISO(av.data)] || new Set()).size > 0;
                      const alreadyHasSecondCall = avaliacoes.some(rp => String(rp.parent_id) === String(av.id) && rp.tipo.includes('2CH'));
                      const canAddRP = alunos.some(aluno => {
                        const notaStr = aluno.notas?.[av.id] || aluno.notas?.[String(av.id)];
                        const nota = parseFloat((notaStr || '').replace(',', '.'));
                        const maxVal = av.valorMaximo ? Number(av.valorMaximo) : 10;
                        const mediaCorte = maxVal / 2;
                        return !isNaN(nota) && nota < mediaCorte;
                      }) && !avaliacoes.some(rp => String(rp.parent_id) === String(av.id));

                      const rps = avaliacoes.filter(rp => String(rp.parent_id) === String(av.id));

                      return (
                        <div key={av.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                          {/* Topo do Card: Tipo + Status + Valor Máximo */}
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2.5">
                              {temPendencia ? (
                                <div className="flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg text-xs font-bold" title="Notas pendentes">
                                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Pendente</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg text-xs font-bold" title="Notas lançadas">
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span>Lançada</span>
                                </div>
                              )}
                              <span className="text-slate-900 font-extrabold text-base">{av.tipo}</span>
                            </div>
                            {av.valorMaximo && (
                              <span className="text-xs font-extrabold text-[#0f2851] bg-[#eef2ff] px-2.5 py-1 rounded-lg border border-blue-100">
                                {Number(av.valorMaximo).toFixed(2).replace('.', ',')} pts
                              </span>
                            )}
                          </div>

                          {/* Dados da Avaliação: Data e Instrumento */}
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-600 font-bold uppercase">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatarDataParaExibicao(av.data)}</span>
                            </div>
                            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-wider">
                              {av.instrumento}
                            </span>
                          </div>

                          {/* Recuperações Paralelas (RPs) vinculadas */}
                          {rps.length > 0 && (
                            <div className="space-y-2 pt-1">
                              {rps.map(rp => (
                                <div key={rp.id} className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                                        +
                                      </div>
                                      <span className="text-slate-900 font-bold text-sm">{rp.tipo}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-600 font-bold text-[11px] uppercase">
                                      <CalendarIcon className="w-3 h-3 text-slate-400" />
                                      {formatarDataParaExibicao(rp.data)}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="px-2.5 py-0.5 bg-white text-slate-600 rounded-full text-[9px] font-black uppercase tracking-wider border border-amber-100">
                                      {rp.instrumento}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/50">
                                    <button
                                      onClick={() => onShowGrades(rp)}
                                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-[#0f2851] hover:bg-[#eef2ff] rounded-lg font-bold text-[11px] uppercase border border-blue-100 shadow-xs active:scale-95"
                                    >
                                      <List className="w-3.5 h-3.5" /> Notas
                                    </button>
                                    {!disabled && (
                                      <button
                                        onClick={() => onEdit(rp)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg font-bold text-[11px] uppercase shadow-xs active:scale-95"
                                      >
                                        <Pencil className="w-3.5 h-3.5 text-slate-500" /> Alterar
                                      </button>
                                    )}
                                    <button
                                      onClick={() => onViewDetails(rp)}
                                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white text-slate-600 hover:bg-slate-50 rounded-lg font-bold text-[11px] uppercase border border-slate-200 shadow-xs active:scale-95"
                                    >
                                      <Eye className="w-3.5 h-3.5" /> Detalhes
                                    </button>
                                    {!disabled && (
                                      <button
                                        onClick={() => onDelete(rp)}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg font-bold text-[11px] uppercase border border-red-100 shadow-xs active:scale-95"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" /> Remover
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Ações principais do Card */}
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div className={`grid ${disabled ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
                              <button
                                onClick={() => onShowGrades(av)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#0f2851] text-white hover:bg-[#1a3a6d] rounded-xl font-bold text-xs uppercase transition shadow-sm active:scale-95"
                              >
                                <List className="w-3.5 h-3.5" /> Notas
                              </button>

                              {!disabled && (
                                <button
                                  onClick={() => onEdit(av)}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#eef2ff] text-[#0f2851] hover:bg-[#e0e7ff] border border-blue-100 rounded-xl font-bold text-xs uppercase transition active:scale-95 shadow-xs"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-[#0f2851]" /> Alterar
                                </button>
                              )}

                              <button
                                onClick={() => onViewDetails(av)}
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs uppercase transition active:scale-95"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" /> Detalhes
                              </button>
                            </div>

                            {/* Ações secundárias (RP, 2ª chamada, Remover) */}
                            {!disabled && (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {canAddRP && (
                                  <button
                                    onClick={() => onAddRP(av)}
                                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-xl font-bold text-[11px] uppercase transition shadow-xs active:scale-95"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> ADICIONAR RP
                                  </button>
                                )}

                                {hasAbsences && !alreadyHasSecondCall && (
                                  <button
                                    onClick={() => onSecondCall(av)}
                                    className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 px-3 py-2 bg-[#eef2ff] text-[#0f2851] hover:bg-[#e0e7ff] border border-blue-100 rounded-xl font-bold text-[11px] uppercase transition shadow-xs active:scale-95"
                                  >
                                    <div className="w-4 h-4 bg-[#0f2851] text-white rounded-full flex items-center justify-center text-[9px] font-bold">2</div>
                                    2ª chamada
                                  </button>
                                )}

                                <button
                                  onClick={() => onDelete(av)}
                                  className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl font-bold text-[11px] uppercase transition active:scale-95"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Remover
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
            </div>
          </div>

          {/* Visualização Desktop (Tabela) - para telas md ou maiores */}
          <div className="hidden md:block border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <div className="overflow-x-auto">
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
                  <tr className="bg-[#eef2ff]/30">
                    <td colSpan={4} className="px-6 py-2.5 font-bold text-[#0f2851] text-[11px] uppercase tracking-wider">
                      {currentBimestre} ({avsBim.length} {avsBim.length === 1 ? 'avaliação' : 'avaliações'})
                    </td>
                  </tr>
                  {avsBim.map((av) => {
                          const temPendencia = isAvaliacaoPendente(av, avaliacoes, alunos, faltasPorData);
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
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

export default AvaliacoesList;
