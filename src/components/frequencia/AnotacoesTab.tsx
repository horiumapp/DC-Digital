import React, { useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useCaptcha } from '../../hooks/useCaptcha';

interface AnotacoesTabProps {
  turmaAtiva: any;
  tempoAula: string;
  setTempoAula: (v: string) => void;
  disponiveisTempos: string[];
  disabled?: boolean;
}

export default function AnotacoesTab({
  turmaAtiva,
  tempoAula,
  setTempoAula,
  disponiveisTempos,
  disabled,
}: AnotacoesTabProps) {
  const [isAddingAnotacao, setIsAddingAnotacao] = useState(false);
  const [showNoRecordsAnotacao, setShowNoRecordsAnotacao] = useState(false);
  const [anotacoes, setAnotacoes] = useState<{ id: string; texto: string; tempo: string; data: string }[]>([]);
  const [textoAnotacao, setTextoAnotacao] = useState('');

  const {
    generatedCaptcha,
    captchaInput,
    setCaptchaInput,
    captchaError,
    generateNewCaptcha,
    validateCaptcha
  } = useCaptcha();

  const handleSave = () => {
    if (validateCaptcha()) {
      if (!textoAnotacao.trim()) {
        alert('Por favor, descreva a anotação.');
        return;
      }
      
      const novaAnotacao = {
        id: Math.random().toString(36).substr(2, 9),
        texto: textoAnotacao,
        tempo: tempoAula,
        data: new Date().toLocaleDateString('pt-BR')
      };

      setAnotacoes(prev => [novaAnotacao, ...prev]);
      setIsAddingAnotacao(false);
      setTextoAnotacao('');
      setCaptchaInput('');
      generateNewCaptcha();
    } else {
      alert('Código incorreto!');
    }
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
            <button
              onClick={() => setShowNoRecordsAnotacao(true)}
              className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition h-[38px] shadow-sm active:scale-95"
            >
              Exibir
            </button>
            {!disabled && (
              <button
                onClick={() => setIsAddingAnotacao(true)}
                className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition h-[38px] flex items-center gap-2 shadow-sm active:scale-95"
              >
                <span className="text-lg leading-none">+</span> Adicionar anotação
              </button>
            )}
          </div>

          {showNoRecordsAnotacao && anotacoes.length === 0 && (
            <div className="bg-red-100/80 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between mb-6">
              <span className="text-sm font-medium">NENHUM REGISTRO ENCONTRADO.</span>
              <button onClick={() => setShowNoRecordsAnotacao(false)} className="text-red-600 hover:text-red-800 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {anotacoes.length > 0 && (
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
                  {anotacoes.map(anot => (
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
            <Captcha
              generatedCaptcha={generatedCaptcha}
              captchaInput={captchaInput}
              setCaptchaInput={setCaptchaInput}
              captchaError={captchaError}
              generateNewCaptcha={generateNewCaptcha}
              className="mb-6"
            />
             <div className="flex items-center gap-3">
               <button onClick={handleSave} className="flex items-center gap-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-bold hover:bg-[#e0e7ff] transition shadow-sm active:scale-95">
                 <Save className="w-4 h-4" /> Salvar anotação
               </button>
               <button
                 onClick={() => { setIsAddingAnotacao(false); setCaptchaInput(''); generateNewCaptcha(); }}
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
