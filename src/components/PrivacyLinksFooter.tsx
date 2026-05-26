import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../config/appConfig';

interface PrivacyLinksFooterProps {
  className?: string;
}

export default function PrivacyLinksFooter({ className = '' }: PrivacyLinksFooterProps) {
  return (
    <footer className={`text-center py-6 text-xs text-slate-400 dark:text-slate-500 space-y-2 mt-auto ${className}`}>
      <p>© {APP_CONFIG.YEAR} Diário Digital. Todos os direitos reservados.</p>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-semibold text-slate-500 dark:text-slate-400">
        <Link to="/politica-de-privacidade" className="hover:text-[#0f2851] dark:hover:text-white transition-colors">
          Política de Privacidade
        </Link>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <Link to="/termos-de-uso" className="hover:text-[#0f2851] dark:hover:text-white transition-colors">
          Termos de Uso
        </Link>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <Link to="/solicitacao-lgpd" className="hover:text-[#0f2851] dark:hover:text-white transition-colors">
          Solicitação LGPD
        </Link>
      </div>
      <p className="text-[10px] text-slate-400/70 dark:text-slate-500">
        Recursos de apoio à conformidade com a LGPD.
      </p>
    </footer>
  );
}
