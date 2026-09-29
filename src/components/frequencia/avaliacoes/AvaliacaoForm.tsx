import React from 'react';
import { Pencil, Calendar as CalendarIcon, X, List, Plus, Trash2, Check } from 'lucide-react';
import Captcha from '../../common/Captcha';
import { getBimestrePorData } from '../../../utils/dateUtils';
import CustomDatePicker from './CustomDatePicker';

import { Avaliacao } from '../../../contexts/TurmaContext';

interface AvaliacaoFormProps {
  selectedAvaliacao: Avaliacao | null;
  selectedDate: string;
  instrumentoAvaliacao: string;
  objetosAvaliacao: { unidade?: string; objeto?: string }[];
  periodoLetivo: string;
  unidadeDidatica: string;
  objetoConhecimento: string;
  valorMaximo: string;
  unidadesOpcoes: string[];
  objetosOpcoes: string[];
  generatedCaptcha: string;
  captchaInput: string;
  captchaError: boolean;
  isDatePickerOpen: boolean;
  calendarMonth: number;
  calendarYear: number;
  PERIODOS_LABELS: Record<string, string>;
  onSave: () => void;
  onCancel: () => void;
  onAddObjeto: () => void;
  onRemoveObjeto: (index: number) => void;
  onSetSelectedDate: (date: string) => void;
  onSetIsDatePickerOpen: (open: boolean) => void;
  onSetInstrumentoAvaliacao: (val: string) => void;
  onSetPeriodoLetivo: (val: string) => void;
  onSetUnidadeDidatica: (val: string) => void;
  onSetObjetoConhecimento: (val: string) => void;
  onSetValorMaximo: (val: string) => void;
  onSetCaptchaInput: (val: string) => void;
  onGenerateNewCaptcha: () => void;
  onSetCalendarMonth: (val: number) => void;
  onSetCalendarYear: (val: number) => void;
}

const AvaliacaoForm = React.memo(function AvaliacaoForm({
  selectedAvaliacao,
  selectedDate,
  instrumentoAvaliacao,
  objetosAvaliacao,
  periodoLetivo,
  unidadeDidatica,
  objetoConhecimento,
  valorMaximo,
  unidadesOpcoes,
  objetosOpcoes,
  generatedCaptcha,
  captchaInput,
  captchaError,
  isDatePickerOpen,
  calendarMonth,
  calendarYear,
  PERIODOS_LABELS,
  onSave,
  onCancel,
  onAddObjeto,
  onRemoveObjeto,
  onSetSelectedDate,
  onSetIsDatePickerOpen,
  onSetInstrumentoAvaliacao,
  onSetPeriodoLetivo,
  onSetUnidadeDidatica,
  onSetObjetoConhecimento,
  onSetValorMaximo,
  onSetCaptchaInput,
  onGenerateNewCaptcha,
  onSetCalendarMonth,
  onSetCalendarYear
}: AvaliacaoFormProps) {
  const displayDate = selectedDate.includes('-') ? selectedDate.split('-').reverse().join('/') : selectedDate;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#eef2ff] text-[#0f2851] rounded-xl flex items-center justify-center">
              <Pencil className="w-5 h-5" />
            </div>
            {selectedAvaliacao ? (selectedAvaliacao.parent_id ? 'Agendar Recuperação Paralela (RP)' : 'Alterar Avaliação') : 'Cadastrar Nova Avaliação'}
          </h3>
          <div className="flex items-center gap-4">
            {selectedAvaliacao && (
              <div className="px-4 py-2 bg-[#eef2ff] border border-blue-100 rounded-xl">
                <span className="text-[10px] font-bold text-[#0f2851]/60 uppercase tracking-widest block leading-none mb-1">Tipo</span>
                <span className="text-sm font-bold text-[#0f2851] uppercase">{selectedAvaliacao.tipo}</span>
              </div>
            )}
            <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 transition"><X /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data da avaliação</label>
            <div className="relative">
              <input 
                type="text" 
                value={displayDate} 
                readOnly 
                onClick={() => onSetIsDatePickerOpen(!isDatePickerOpen)} 
                placeholder="DD/MM/AAAA" 
                className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#0f2851]/10 cursor-pointer" 
              />
              <CalendarIcon className="w-4 h-4 text-[#0f2851] absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              
              {isDatePickerOpen && (
                <CustomDatePicker
                  selectedDate={selectedDate}
                  calendarMonth={calendarMonth}
                  calendarYear={calendarYear}
                  onSelectDate={(date) => { onSetSelectedDate(date); onSetIsDatePickerOpen(false); }}
                  onSetCalendarMonth={onSetCalendarMonth}
                  onSetCalendarYear={onSetCalendarYear}
                />
              )}
            </div>
            {selectedDate && <p className="text-[10px] font-bold text-[#0f2851] ml-1">BIMESTRE: {getBimestrePorData(selectedDate)}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Instrumento Pedagógico</label>
            <select 
              value={instrumentoAvaliacao} 
              onChange={(e) => onSetInstrumentoAvaliacao(e.target.value)} 
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#0f2851]/10 cursor-pointer appearance-none"
            >
              <option value="AVALIACAO ESCRITA">AVALIAÇÃO ESCRITA</option>
              <option value="AVALIACAO ORAL">AVALIAÇÃO ORAL</option>
              <option value="TRABALHO">TRABALHO</option>
              <option value="SEMINÁRIO">SEMINÁRIO</option>
              <option value="EXERCÍCIOS">EXERCÍCIOS</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Valor Máximo</label>
            <input 
              type="text" 
              value={valorMaximo}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9,]/g, '');
                onSetValorMaximo(val);
              }}
              onBlur={() => {
                 let val = parseFloat(valorMaximo.replace(',', '.')) || 0;
                 if (val > 100) val = 100;
                 onSetValorMaximo(val.toFixed(2).replace('.', ','));
              }}
              className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-black text-slate-700 focus:ring-2 focus:ring-[#0f2851]/10"
              placeholder="0,00"
            />
            {!selectedAvaliacao?.parent_id && selectedDate && (
              <p className="text-[11px] font-bold text-slate-500 pl-1 mt-1">
                Meta do {getBimestrePorData(selectedDate)}: <span className="text-[#0f2851] font-extrabold">{(getBimestrePorData(selectedDate).includes('3') || getBimestrePorData(selectedDate).includes('4') ? 30 : 20).toFixed(2).replace('.', ',')} pts</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Objetos de Conhecimento da Avaliação */}
      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#eef2ff] text-[#0f2851] rounded-xl flex items-center justify-center">
            <List className="w-5 h-5" />
          </div>
          Objetos de Conhecimento da Avaliação
        </h3>

        {!selectedDate ? (
          <div className="bg-slate-50 rounded-2xl px-6 py-4 text-sm font-medium text-slate-400">
            Selecione uma data para mostrar os Objetos de conhecimento
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Período letivo</label>
                  <select
                    value={periodoLetivo}
                    onChange={(e) => { onSetPeriodoLetivo(e.target.value); onSetUnidadeDidatica(''); onSetObjetoConhecimento(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#0f2851]/10 cursor-pointer"
                    disabled
                  >
                    <option value="">Selecione...</option>
                    {Object.entries(PERIODOS_LABELS).map(([bim, label]) => (
                      <option key={bim} value={bim}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Unidade didática</label>
                  <select
                    value={unidadeDidatica}
                    onChange={(e) => { onSetUnidadeDidatica(e.target.value); onSetObjetoConhecimento(''); }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#0f2851]/10 cursor-pointer"
                    disabled={!periodoLetivo || unidadesOpcoes.length === 0}
                  >
                    <option value="">{unidadesOpcoes.length > 0 ? "Selecione..." : "Nenhuma unidade lançada"}</option>
                    {unidadesOpcoes.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Objeto de Conhecimento</label>
                  <select
                    value={objetoConhecimento}
                    onChange={(e) => onSetObjetoConhecimento(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#0f2851]/10 cursor-pointer"
                    disabled={!unidadeDidatica || objetosOpcoes.length === 0}
                  >
                    <option value="">{objetosOpcoes.length > 0 ? "Selecione..." : "Nenhum objeto lançado"}</option>
                    {objetosOpcoes.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <button
                  onClick={onAddObjeto}
                  disabled={!objetoConhecimento}
                  className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-3.5 rounded-2xl text-sm font-bold hover:bg-[#e0e7ff] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-3 font-black text-[10px] tracking-widest">Unidade Didática</th>
                    <th className="px-6 py-3 font-black text-[10px] tracking-widest">Objeto de Conhecimento da avaliação</th>
                    <th className="px-6 py-3 font-black text-[10px] tracking-widest text-center w-28">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {objetosAvaliacao.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-5 text-center text-slate-400 text-sm font-medium">
                        Clique em Adicionar para inserir os Objetos de conhecimento na tabela
                      </td>
                    </tr>
                  ) : (
                    objetosAvaliacao.map((obj, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-700 font-bold text-xs">{obj.unidade}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{obj.objeto}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => onRemoveObjeto(idx)}
                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition flex items-center gap-1.5 mx-auto shadow-md shadow-red-600/20"
                          >
                            Excluir <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
        <Captcha 
          generatedCaptcha={generatedCaptcha} 
          captchaInput={captchaInput} 
          setCaptchaInput={onSetCaptchaInput} 
          captchaError={captchaError} 
          generateNewCaptcha={onGenerateNewCaptcha} 
          className="mb-8" 
        />
        <div className="flex gap-4">
          <button 
            onClick={onSave} 
            className="flex-1 bg-[#0f2851] text-white py-4 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 flex items-center justify-center gap-3 active:scale-95"
          >
            <Check className="w-5 h-5 text-emerald-400" /> Salvar Avaliação
          </button>
          <button onClick={onCancel} className="px-10 bg-slate-100 text-slate-500 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition">Sair</button>
        </div>
      </div>
    </div>
  );
});

export default AvaliacaoForm;
