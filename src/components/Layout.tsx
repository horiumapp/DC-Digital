import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, BarChart2, FileText, Calendar, User, Home, LogOut, ChevronDown, Check } from 'lucide-react';
import ScheduleModal from './ScheduleModal';
import Background from './Background';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // If no user, mock a fallback slightly just to not break layout in weird state
  const hasAdminAccess = ['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user?.role || '');
  const nameDisplay = user?.name || 'Visitante';
  const titleDisplay = user?.title || 'Convidado';

  const isDiario = location.pathname === '/diario';
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200 relative">
      <Background />
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm transition-colors duration-200">
        {/* Logo - Esquerda */}
        <div className="flex-1 flex items-center">
          <Link to="/turmas" className="flex items-center space-x-3 group">
            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold text-indigo-900 dark:text-indigo-100 tracking-tight hidden xl:block">Diário Digital</span>
          </Link>
        </div>

        {/* Navegação - Centro */}
        <nav className="hidden lg:flex items-center justify-center space-x-3 flex-[2]">
          {hasAdminAccess && (
            <Link
              to="/administracao"
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Administração
            </Link>
          )}
          <Link
            to="/estatisticas"
            className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Estatísticas
          </Link>
          
          <div className="relative group">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center space-x-2 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95">
              <span>Relatórios</span>
              <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
            </button>
            {/* Dropdown menu */}
            <div className="absolute left-1/2 -translate-x-1/2 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 border border-slate-100 dark:border-slate-700 transform origin-top scale-95 group-hover:scale-100 p-1">
              <div className="py-2">
                <div className="px-4 py-1.5 mb-1 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentação</span>
                </div>
                <Link to="/relatorio-notas" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl transition-colors">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                  Notas das Avaliações
                </Link>
                <Link to="/relatorio-medias" className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-blue-400 rounded-xl transition-colors">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
                  Médias do Componente
                </Link>
              </div>
            </div>
          </div>

          {user?.role !== 'ADMIN' && (
            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              Horários
            </button>
          )}
        </nav>

        {/* Ações do Usuário - Direita */}
        <div className="flex-1 flex items-center justify-end space-x-4">
          <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-lg hidden sm:flex items-center space-x-3 border border-slate-200 dark:border-slate-700">
            <User className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <div className="text-sm">
              <span className="font-bold text-slate-800 dark:text-slate-100 uppercase block leading-tight">
                {nameDisplay}
              </span>
              <span className="text-slate-500 dark:text-slate-400 text-xs">
                {titleDisplay}
              </span>
            </div>
          </div>
          <Link to="/turmas" className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95">
            <Home className="w-4 h-4" />
            <span className="hidden md:inline">Início</span>
          </Link>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center space-x-2 bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <span className="hidden md:inline">Sair</span>
            <LogOut className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
      />
    </div>
  );
}
