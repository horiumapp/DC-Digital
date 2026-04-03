import React from 'react';
import { X, Calendar as CalendarIcon, Save, Loader2 } from 'lucide-react';
import Captcha from '../../common/Captcha';

interface SegundaChamadaEditorProps {
  selectedAvaliacao: any;
  alunos: any[];
  secondCallRows: Record<string, { selected: boolean, date: string, grade: string }>;
  isSaving: boolean;
  generatedCaptcha: string;
  captchaInput: string;
  captchaError: boolean;
  onSetSecondCallRows: (rows: any) => void;
  onSave: () => void;
  onCancel: () => void;
  onSetCaptchaInput: (val: string) => void;
  onGenerateNewCaptcha: () => void;
}

export default function SegundaChamadaEditor({
  selectedAvaliacao,
  alunos,
  secondCallRows,
  isSaving,
  generatedCaptcha,
  captchaInput,
  captchaError,
  onSetSecondCallRows,
  onSave,
  onCancel,
  onSetCaptchaInput,
  onGenerateNewCaptcha
}: SegundaChamadaEditorProps) {
  if (!selectedAvaliacao) return null;

  const handleSelectAll = (checked: boolean) => {
    const newRows = { ...secondCallRows };
    Object.keys(newRows).forEach(id => newRows[id].selected = checked);
    onSetSecondCallRows(newRows);
  };

  const handleRowChange = (alunoId: string, field: string, value: any) => {
    onSetSecondCallRows((prev: any) => ({
      ...prev,
      [alunoId]: { ...prev[alunoId], [field]: value }
    }));
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
      <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
            AVALIAÇÃO DE 2ª CHAMADA
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-wider">
            VINCULADA A: <span className="text-blue-600 font-bold">{selectedAvaliacao.tipo} - {selectedAvaliacao.instrumento}</span>
          </p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-4 text-left">
                <input 
                  type="checkbox" 
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Nº</th>
              <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">CÓDIGO DO ALUNO</th>
              <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">MATRÍCULA NO.</th>
              <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">ALUNO</th>
              <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">DATA DA AVALIAÇÃO</th>
              <th className="px-8 py-4 text-left text-xs font-black text-slate-400 uppercase tracking-widest">NOTA (0,00 A 10,00)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {alunos.map((aluno, index) => (
              <tr key={aluno.id} className={`group hover:bg-blue-50/30 transition-colors ${secondCallRows[aluno.id]?.selected ? 'bg-blue-50/20' : ''}`}>
                <td className="px-8 py-4">
                  <input 
                    type="checkbox" 
                    checked={secondCallRows[aluno.id]?.selected}
                    onChange={(e) => handleRowChange(aluno.id, 'selected', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-8 py-4 text-slate-400 font-bold tabular-nums">{String(index + 1).padStart(2, '0')}</td>
                <td className="px-8 py-4 text-slate-600 font-medium">{aluno.id}</td>
                <td className="px-8 py-4 text-slate-500 font-medium tracking-wider">{aluno.matricula || '---'}</td>
                <td className="px-8 py-4">
                  <div className="font-bold text-slate-800 uppercase tracking-tight">{aluno.nome}</div>
                </td>
                <td className="px-8 py-4">
                  <div className="relative max-w-[160px]">
                    <input
                      type="date"
                      value={secondCallRows[aluno.id]?.date || ''}
                      disabled={!secondCallRows[aluno.id]?.selected}
                      onChange={(e) => handleRowChange(aluno.id, 'date', e.target.value)}
                      className="w-full pl-3 pr-10 py-2 border-2 border-slate-100 rounded-xl focus:border-blue-200 focus:ring-0 transition-all font-bold text-slate-700 disabled:opacity-50"
                    />
                    <CalendarIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500 pointer-events-none" />
                  </div>
                </td>
                <td className="px-8 py-4">
                  <input
                    type="text"
                    value={secondCallRows[aluno.id]?.grade || ''}
                    disabled={!secondCallRows[aluno.id]?.selected}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val) {
                        let numVal = parseInt(val, 10);
                        if (numVal > 1000) return;
                        val = (numVal / 100).toFixed(2).replace('.', ',');
                      }
                      handleRowChange(aluno.id, 'grade', val);
                    }}
                    placeholder="0,00"
                    className="w-24 text-center py-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-slate-700 font-black focus:border-blue-400 focus:bg-white transition-all outline-none disabled:opacity-50"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-8 bg-slate-50 border-t border-slate-100">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-left">
          <div className="w-full md:w-auto">
            <Captcha 
              generatedCaptcha={generatedCaptcha}
              captchaInput={captchaInput}
              setCaptchaInput={onSetCaptchaInput}
              captchaError={captchaError}
              generateNewCaptcha={onGenerateNewCaptcha}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={onCancel}
              className="flex-1 md:flex-none px-8 py-3 bg-white text-slate-600 font-black rounded-2xl border-2 border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all uppercase tracking-widest text-xs"
            >
              Cancelar
            </button>
            <button 
              onClick={onSave}
              disabled={isSaving}
              className="flex-1 md:flex-none px-12 py-3 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg shadow-blue-600/30 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
