import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Cookie } from 'lucide-react';
import { getSavedConsent, saveConsentLocal } from '../utils/lgpdConsent';
import { saveUserConsent } from '../services/lgpdService';
import { useAuth } from '../contexts/AuthContext';

export default function CookieBanner() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const saved = getSavedConsent();
    if (!saved) {
      setIsVisible(true);
    }
  }, []);

  const handleConsent = async (status: 'accepted' | 'declined') => {
    setIsVisible(false);
    saveConsentLocal(status);

    // Salvar no Supabase se o usuário estiver logado
    if (user?.id) {
      await saveUserConsent({
        userId: user.id,
        finalidade: 'Uso de cookies do sistema e termos legais',
        status: status === 'accepted' ? 'aceito' : 'recusado',
        userAgent: navigator.userAgent,
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 md:p-6 bg-slate-900/95 dark:bg-slate-950/98 backdrop-blur-md border-t border-slate-800 text-white shadow-2xl animate-in slide-in-from-bottom duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Descrição */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-[#0f2851] rounded-xl text-blue-400 shrink-0 hidden sm:flex">
            <Cookie className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Privacidade & Cookies no Diário Digital
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
              Este sistema utiliza apenas cookies essenciais para garantir o funcionamento seguro da autenticação, navegação e integridade das sessões de professores e alunos. 
              Não coletamos dados pessoais para fins de publicidade ou marketing de terceiros. Ao continuar navegando, você declara estar ciente de nossos Termos de Uso e Política de Privacidade.
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto justify-end">
          <Link
            to="/politica-de-privacidade"
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-xl border border-slate-700/50 text-center"
          >
            Política de Privacidade
          </Link>
          <button
            onClick={() => handleConsent('declined')}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-all bg-transparent hover:bg-slate-800 rounded-xl border border-slate-800 text-center cursor-pointer"
          >
            Recusar não essenciais
          </button>
          <button
            onClick={() => handleConsent('accepted')}
            className="px-6 py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 text-center cursor-pointer"
          >
            Aceitar tudo
          </button>
        </div>
      </div>
    </div>
  );
}
