import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type CampoSenhaProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export default function CampoSenha({ className = '', disabled, ...props }: CampoSenhaProps) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        disabled={disabled}
        type={visivel ? 'text' : 'password'}
        className={`${className} pr-12`.trim()}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setVisivel((atual) => !atual)}
        className="absolute inset-y-0 right-0 z-10 flex w-11 items-center justify-center text-slate-500 hover:text-[#6354c7] disabled:opacity-40 transition-colors"
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        title={visivel ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visivel ? <EyeOff className="w-5 h-5" strokeWidth={2} /> : <Eye className="w-5 h-5" strokeWidth={2} />}
      </button>
    </div>
  );
}
