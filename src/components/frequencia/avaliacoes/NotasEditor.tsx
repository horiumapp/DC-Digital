import React from 'react';
import { List, Check, AlertCircle } from 'lucide-react';
import Captcha from '../../common/Captcha';

import { formatarDataParaISO, formatarDataParaExibicao } from '../../../utils/dateUtils';

interface AvaliacaoSelect {
  id?: string | number;
  tipo?: string;
  instrumento?: string;
  data?: string;
  bimestre?: string;
  valor_maximo?: number;
  valorMaximo?: number;
}

interface AlunoNotaItem {
  id: string;
  nome: string;
  matricula?: string;
}

interface NotasEditorProps {
  selectedAvaliacao: AvaliacaoSelect | null;
  alunosParaNotas: AlunoNotaItem[];
  localNotas: Record<string, string>;
  faltasPorData: Record<string, Set<string>>;
  generatedCaptcha: string;
  captchaInput: string;
  captchaError: boolean;
  onNotaChange: (alunoId: string, val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onSetCaptchaInput: (val: string) => void;
  onGenerateNewCaptcha: () => void;
  disabled?: boolean;
}

const NotasEditor = React.memo(function NotasEditor({
  selectedAvaliacao,
  alunosParaNotas,
  localNotas,
  faltasPorData,
  generatedCaptcha,
  captchaInput,
  captchaError,
  onNotaChange,
  onConfirm,
  onCancel,
  onSetCaptchaInput,
  onGenerateNewCaptcha,
  disabled
}: NotasEditorProps) {
  if (!selectedAvaliacao) return null;

  return (
    <div className="space-y-6 text-left">
      <div className="bg-[#0f2851] p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] rounded-full -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
              <List className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Lançamento de Notas</h3>
              <p className="text-slate-400 text-sm font-medium">{selectedAvaliacao.tipo} • {selectedAvaliacao.instrumento}</p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">Data: {formatarDataParaExibicao(selectedAvaliacao.data || '')}</div>
            <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">Escala: 0 a {selectedAvaliacao.valorMaximo ? Number(selectedAvaliacao.valorMaximo).toFixed(2).replace('.', ',') : '10,00'}</div>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-[32px] overflow-hidden bg-white shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 uppercase">
            <tr>
              <th className="px-8 py-5 font-black text-[10px] tracking-widest w-20">Nº</th>
              <th className="px-8 py-5 font-black text-[10px] tracking-widest">Aluno</th>
              <th className="px-8 py-5 font-black text-[10px] tracking-widest w-56 text-center">
                Nota (0,00 a {selectedAvaliacao.valorMaximo ? Number(selectedAvaliacao.valorMaximo).toFixed(2).replace('.', ',') : '10,00'})
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {alunosParaNotas.map((aluno, index) => (
              <tr key={aluno.id} className="group hover:bg-blue-50/30 transition-colors text-left">
                <td className="px-8 py-6 text-slate-400 font-bold tabular-nums">{String(index + 1).padStart(2, '0')}</td>
                <td className="px-8 py-6">
                  <p className="text-base font-bold text-slate-700">{aluno.nome}</p>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1">Matrícula: {aluno.matricula}</p>
                </td>
                <td className="px-8 py-6">
                  <div className="relative max-w-[140px] mx-auto">
                    {faltasPorData[formatarDataParaISO(selectedAvaliacao.data || '')]?.has(aluno.id) ? (
                      <div className="w-full bg-red-50 border-2 border-red-100 rounded-2xl px-4 py-3 text-center text-sm font-black text-red-600 uppercase tracking-widest flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4" /> Falta
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        placeholder="0,00" 
                        value={localNotas[aluno.id] || ''} 
                        onChange={(e) => onNotaChange(aluno.id, e.target.value)} 
                        disabled={disabled}
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-center text-lg font-bold text-[#0f2851] focus:ring-2 focus:ring-[#0f2851]/20 transition-all group-hover:bg-white placeholder:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
        {!disabled && (
          <Captcha 
            generatedCaptcha={generatedCaptcha} 
            captchaInput={captchaInput} 
            setCaptchaInput={onSetCaptchaInput} 
            captchaError={captchaError} 
            generateNewCaptcha={onGenerateNewCaptcha} 
            className="mb-8" 
          />
        )}
        <div className="flex gap-4">
          {!disabled && (
            <button 
              onClick={onConfirm} 
              className="flex-1 bg-[#0f2851] text-white py-5 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-[#1a3a6d] transition shadow-xl shadow-[#0f2851]/30 flex items-center justify-center gap-3 active:scale-95"
            >
              <Check className="w-6 h-6 text-emerald-400" /> Confirmar Notas
            </button>
          )}
          <button 
            onClick={onCancel} 
            className={`px-12 bg-slate-100 text-slate-500 py-5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition ${disabled ? 'flex-1' : ''}`}
          >
            {disabled ? 'Voltar' : 'Voltar'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default NotasEditor;
