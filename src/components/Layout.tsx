import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { User, Home, LogOut, ChevronDown, Menu, X, Shield } from 'lucide-react';
import ScheduleModal from './ScheduleModal';
import Background from './Background';
import ConnectionStatus from './common/ConnectionStatus';
import PrivacyLinksFooter from './PrivacyLinksFooter';
import { useAuth } from '../contexts/AuthContext';
import { useOffline } from '../contexts/OfflineContext';
import { ADMIN_ROLES } from '../constants/authConstants';
import { clearKeyCache } from '../lib/crypto';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { clearLocalData } = useOffline();

  // If no user, mock a fallback slightly just to not break layout in weird state
  const hasAdminAccess = user ? ADMIN_ROLES.includes(user.role) : false;
  const nameDisplay = user?.name || 'Visitante';
  const titleDisplay = user?.title || 'Convidado';

  const _isDiario = location.pathname === '/diario';
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRelatoriosOpen, setIsRelatoriosOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const relatoriosRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (relatoriosRef.current && !relatoriosRef.current.contains(e.target as Node)) {
        setIsRelatoriosOpen(false);
      }
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) {
        setIsAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // BUG-08 FIX: removido o useEffect que forçava a remoção da classe dark,
  // pois conflitava com o suporte a dark mode do CSS. O tema é controlado
  // pelo sistema operacional / preferências do usuário.
  

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200 relative flex flex-col justify-between">
      <Background />
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-colors duration-200">
        {/* Logo e Toggle - Esquerda */}
        <div className="flex-1 flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/turmas" className="flex items-center space-x-3 group">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold text-[#0f2851] tracking-tight hidden xl:block">Diário Digital</span>
          </Link>
        </div>

        {/* Navegação - Centro */}
        <nav className="hidden lg:flex items-center justify-center space-x-3 flex-[2]">
          {hasAdminAccess && (
            <div className="relative" ref={adminRef}>
              <button
                onClick={() => setIsAdminOpen(prev => !prev)}
                className="px-6 py-3 bg-[#eef2ff] border border-blue-100 text-[#0f2851] rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-[#e0e7ff] transition-all shadow-sm active:scale-95"
              >
                <span>Administração</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAdminOpen ? 'rotate-180' : ''}`} />
              </button>
              {isAdminOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 border border-slate-100 dark:border-slate-700 p-1 animate-in">
                  <div className="py-2">
                    <Link
                      to="/administracao"
                      onClick={() => setIsAdminOpen(false)}
                      className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-xl"
                    >
                      Gestão Escolar
                    </Link>
                    <Link
                      to="/curriculo"
                      onClick={() => setIsAdminOpen(false)}
                      className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-xl"
                    >
                      Currículo (BNCC)
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
          <Link
            to="/estatisticas"
            className="px-6 py-3 bg-[#eef2ff] border border-blue-100 text-[#0f2851] rounded-xl text-sm font-bold hover:bg-[#e0e7ff] transition-all shadow-sm active:scale-95"
          >
            Estatísticas
          </Link>
          
          <div className="relative" ref={relatoriosRef}>
            <button
              onClick={() => setIsRelatoriosOpen(prev => !prev)}
              aria-expanded={isRelatoriosOpen}
              aria-haspopup="true"
              className="px-6 py-3 bg-[#eef2ff] border border-blue-100 text-[#0f2851] rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-[#e0e7ff] transition-all shadow-sm active:scale-95"
            >
              <span>Relatórios</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isRelatoriosOpen ? 'rotate-180' : ''}`} />
            </button>
            {/* Dropdown menu */}
            {isRelatoriosOpen && (
              <div
                role="menu"
                className="absolute left-1/2 -translate-x-1/2 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 border border-slate-100 dark:border-slate-700 p-1 animate-in"
              >
                <div className="py-2">
                  <Link
                    to="/relatorio-conteudos"
                    role="menuitem"
                    onClick={() => setIsRelatoriosOpen(false)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-xl"
                  >
                    Conteúdos Ministrados
                  </Link>
                  <Link
                    to="/relatorio-frequencia"
                    role="menuitem"
                    onClick={() => setIsRelatoriosOpen(false)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-xl"
                  >
                    Frequências da Turma
                  </Link>
                  <Link
                    to="/relatorio-medias"
                    role="menuitem"
                    onClick={() => setIsRelatoriosOpen(false)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-xl"
                  >
                    Médias do Componente
                  </Link>
                  <Link
                    to="/relatorio-notas"
                    role="menuitem"
                    onClick={() => setIsRelatoriosOpen(false)}
                    className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors rounded-xl"
                  >
                    Notas da Turma
                  </Link>
                </div>
              </div>
            )}
          </div>

          {user?.role !== 'ADMIN' && (
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-6 py-3 bg-[#eef2ff] border border-blue-100 text-[#0f2851] rounded-xl text-sm font-bold hover:bg-[#e0e7ff] transition-all shadow-sm active:scale-95"
            >
              Horários
            </button>
          )}
        </nav>

        {/* Ações do Usuário - Direita */}
        <div className="flex-1 flex items-center justify-end space-x-4">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg hidden sm:flex items-center space-x-3 border border-slate-200 dark:border-slate-700">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <div className="text-sm min-w-fit">
              <span className="font-bold text-slate-800 dark:text-slate-100 uppercase whitespace-nowrap leading-tight">
                {nameDisplay}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs block">
                {titleDisplay}
              </span>
            </div>
          </div>
          <Link to="/minha-privacidade" className="flex items-center space-x-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all shadow-md active:scale-95" title="Centro de Privacidade">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="hidden md:inline">Privacidade</span>
          </Link>
          <Link to="/turmas" className="flex items-center space-x-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#e0e7ff] transition-all shadow-sm active:scale-95">
            <Home className="w-4 h-4" />
            <span className="hidden md:inline">Início</span>
          </Link>
          <button
            onClick={async () => { clearKeyCache(); await clearLocalData(); await logout(); navigate('/'); }}
            className="flex items-center space-x-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all shadow-md hover:shadow-lg active:scale-95 cursor-pointer"
          >
            <span className="hidden md:inline">Sair</span>
            <LogOut className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </header>

      <ConnectionStatus />

      <main className="flex-1">
        <Outlet />
      </main>

      <PrivacyLinksFooter />

      {/* Navegação Móvel Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="fixed top-16 left-0 w-64 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl p-4 flex flex-col gap-2 animate-in slide-in-from-left" onClick={e => e.stopPropagation()}>
            {hasAdminAccess && (
              <Link to="/administracao" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 bg-[#eef2ff] border border-blue-100 text-[#0f2851] rounded-xl text-sm font-bold">
                Administração
              </Link>
            )}
            <Link to="/minha-privacidade" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 bg-[#eef2ff] border border-blue-100 text-[#0f2851] rounded-xl text-sm font-bold flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-600" />
              Privacidade
            </Link>
            <Link to="/estatisticas" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-3 bg-[#eef2ff] border border-blue-100 text-[#0f2851] rounded-xl text-sm font-bold">
              Estatísticas
            </Link>
            
            <div className="font-bold text-[#0f2851] px-4 py-2 mt-2">Relatórios</div>
            <Link to="/relatorio-conteudos" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl ml-4">Conteúdos</Link>
            <Link to="/relatorio-frequencia" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl ml-4">Frequências</Link>
            <Link to="/relatorio-medias" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl ml-4">Médias</Link>
            <Link to="/relatorio-notas" onClick={() => setIsMobileMenuOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl ml-4">Notas</Link>

            {user?.role !== 'ADMIN' && (
              <button onClick={() => { setIsMobileMenuOpen(false); setIsScheduleModalOpen(true); }} className="mt-4 px-4 py-3 bg-[#eef2ff] border border-blue-100 text-[#0f2851] rounded-xl text-sm font-bold text-left">
                Meus Horários
              </button>
            )}
          </div>
        </div>
      )}

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </div>
  );
}
