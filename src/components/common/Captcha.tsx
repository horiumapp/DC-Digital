import React from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  generatedCaptcha: string;
  captchaInput: string;
  setCaptchaInput: (v: string) => void;
  captchaError: boolean;
  generateNewCaptcha: () => void;
  className?: string;
}

export default function Captcha({
  generatedCaptcha,
  captchaInput,
  setCaptchaInput,
  captchaError,
  generateNewCaptcha,
  className = ''
}: CaptchaProps) {
  return (
    <div className={`border border-slate-200 rounded-lg p-4 w-fit bg-white ${className}`}>
      <div className="flex items-start gap-4">
        <div className="relative w-48 h-16 bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '8px 8px' }}></div>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(45deg, #000 1px, transparent 1px)', backgroundSize: '12px 12px' }}></div>
          <span className="text-3xl font-bold text-blue-800 tracking-widest relative z-10" style={{ fontFamily: 'monospace', transform: 'rotate(-2deg)' }}>
            {generatedCaptcha}
          </span>
        </div>
        <button type="button" onClick={generateNewCaptcha} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-4">
        <label className="block text-xs text-slate-600 mb-1">Código</label>
        <input
          type="text"
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          placeholder="Informe o código de acordo com a imagem"
          className={`w-full border ${captchaError ? 'border-red-500' : 'border-slate-300'} rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 bg-slate-50`}
        />
      </div>
    </div>
  );
}
