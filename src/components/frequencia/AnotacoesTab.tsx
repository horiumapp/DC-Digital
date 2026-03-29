import React, { useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useCaptcha } from '../../hooks/useCaptcha';

interface AnotacoesTabProps {
  turmaAtiva: any;
  tempoAula: string;
  setTempoAula: (v: string) => void;
}

export default function AnotacoesTab({
  turmaAtiva,
  tempoAula,
  setTempoAula,
}: AnotacoesTabProps) {
  const [isAddingAnotacao, setIsAddingAnotacao] = useState(false);
  const [showNoRecordsAnotacao, setShowNoRecordsAnotacao] = useState(false);

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
      alert('Anotação salva com sucesso! (Mocada na interface por enquanto)');
      setIsAddingAnotacao(false);
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
                {turmaAtiva?.tempos.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowNoRecordsAnotacao(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition h-[38px]"
            >
              Exibir
            </button>
            <button
              onClick={() => setIsAddingAnotacao(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition h-[38px] flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Adicionar anotação
            </button>
          </div>

          {showNoRecordsAnotacao && (
            <div className="bg-red-100/80 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">NENHUM REGISTRO ENCONTRADO.</span>
              <button onClick={() => setShowNoRecordsAnotacao(false)} className="text-red-600 hover:text-red-800 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
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
              <button onClick={handleSave} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition">
                <Save className="w-4 h-4" /> Salvar
              </button>
              <button
                onClick={() => { setIsAddingAnotacao(false); setCaptchaInput(''); generateNewCaptcha(); }}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded text-sm font-medium hover:bg-slate-300 transition"
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
