import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  BookOpenCheck, 
  CalendarDays, 
  ClipboardCheck, 
  FileBarChart, 
  GraduationCap, 
  Home, 
  LogOut, 
  Menu, 
  Shield, 
  Users, 
  X, 
  ChevronRight,
  RefreshCw,
  WifiOff,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import ScheduleModal from './ScheduleModal';
import ConnectionStatus from './common/ConnectionStatus';
import PrivacyLinksFooter from './PrivacyLinksFooter';
import { useAuth } from '../contexts/AuthContext';
import { useTurma } from '../contexts/TurmaContext';
import { useToast } from './common/Toast';
import { useOffline } from '../contexts/OfflineContext';
import { ADMIN_ROLES } from '../constants/authConstants';
import { APP_CONFIG } from '../config/appConfig';

type Item = { label: string; to: string; icon: typeof Home; end?: boolean };
const reports: Item[] = [
  { label: 'Conteúdos ministrados', to: '/relatorio-conteudos', icon: BookOpenCheck },
  { label: 'Frequência da turma', to: '/relatorio-frequencia', icon: ClipboardCheck },
  { label: 'Médias do componente', to: '/relatorio-medias', icon: BarChart3 },
  { label: 'Notas da turma', to: '/relatorio-notas', icon: FileBarChart },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { turmaAtiva, horarioTurma, verificarPeriodoFechado } = useTurma();
  const { showInfo, showWarning } = useToast();
  const { 
    isOnline, 
    connectionState, 
    pendingCount, 
    deadLetterCount, 
    syncNow 
  } = useOffline();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const canManage = !!user && ADMIN_ROLES.includes(user.role);
  const close = () => setMenuOpen(false);

  const isDeepInsideClass = ['/diario', '/frequencia', '/aparata', '/aparata-detalhes'].includes(location.pathname);

  const openQuickAttendance = () => {
    if (!turmaAtiva) {
      showInfo('Selecione uma turma antes de registrar a frequência.');
      navigate('/turmas');
      return;
    }

    const diasComAula = [...new Set(
      horarioTurma.length > 0 ? horarioTurma.map(horario => Number(horario.dia_semana)) : turmaAtiva.diasDeAula
    )];
    if (diasComAula.length === 0) {
      showWarning('Não há horários cadastrados para esta turma. Cadastre os horários antes de lançar a frequência.');
      setScheduleOpen(true);
      return;
    }

    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);
    const bimestres = APP_CONFIG.PERIODOS.filter(periodo => periodo.id.includes('BIMESTRE'));
    const periodosDisponiveis = [] as typeof bimestres;
    for (let indice = 0; indice < bimestres.length; indice += 1) {
      const periodo = bimestres[indice];
      const [ano, mes, dia] = periodo.dataInicio.split('-').map(Number);
      if (new Date(ano, mes - 1, dia) > hoje) break;
      if (indice > 0 && !verificarPeriodoFechado(bimestres[indice - 1].id)) break;
      periodosDisponiveis.push(periodo);
    }
    const periodoAberto = [...periodosDisponiveis].reverse().find(periodo => !verificarPeriodoFechado(periodo.id));
    if (!periodoAberto) {
      showWarning('Não há bimestre aberto para esta turma.');
      return;
    }

    const [anoInicio, mesInicio, diaInicio] = periodoAberto.dataInicio.split('-').map(Number);
    const [anoFim, mesFim, diaFim] = periodoAberto.dataFim.split('-').map(Number);
    const inicioPeriodo = new Date(anoInicio, mesInicio - 1, diaInicio);
    const fimPeriodo = new Date(anoFim, mesFim - 1, diaFim, 23, 59, 59, 999);
    const limiteBusca = hoje < fimPeriodo ? hoje : fimPeriodo;
    const ultimaAula = new Date(limiteBusca);
    let encontrouAula = false;
    for (let candidata = new Date(limiteBusca); candidata >= inicioPeriodo; candidata.setDate(candidata.getDate() - 1)) {
      if (diasComAula.includes(candidata.getDay())) {
        ultimaAula.setTime(candidata.getTime());
        encontrouAula = true;
        break;
      }
    }
    if (!encontrouAula) {
      showWarning(`Não há dia de aula no período ${periodoAberto.nome} para esta turma.`);
      return;
    }

    const data = `${ultimaAula.getFullYear()}-${String(ultimaAula.getMonth() + 1).padStart(2, '0')}-${String(ultimaAula.getDate()).padStart(2, '0')}`;
    showInfo(`Abrindo a última aula do ${periodoAberto.nome}: ${ultimaAula.toLocaleDateString('pt-BR')}.`);
    navigate(`/frequencia?date=${data}&turmaId=${encodeURIComponent(String(turmaAtiva.id))}`);
  };

  const navClass = ({ isActive }: { isActive: boolean }) => `dd-nav-item ${isActive ? 'dd-nav-item-active' : ''}`;
  
  const work: Item[] = [
    { label: 'Minhas turmas', to: '/turmas', icon: Users, end: true },
    { label: 'Diário de classe', to: '/diario', icon: BookOpenCheck },
    { label: 'Frequência e notas', to: '/frequencia', icon: ClipboardCheck },
  ];
  
  const management: Item[] = canManage ? [
    { label: 'Gestão escolar', to: '/administracao', icon: GraduationCap },
    { label: 'Currículo BNCC', to: '/curriculo', icon: BookOpenCheck },
    { label: 'Pendências', to: '/estatisticas', icon: BarChart3 },
  ] : [];

  const renderNav = () => (
    <nav className="space-y-6 py-2" aria-label="Navegação principal">
      <section>
        <p className="dd-nav-label">Rotina Docente</p>
        {work.map(({ label, to, icon: Icon, end }) => (
          <NavLink key={label} to={to} end={end} onClick={close} className={navClass}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        ))}
      </section>

      {management.length > 0 && (
        <section>
          <p className="dd-nav-label">Gestão Pedagógica</p>
          {management.map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={close} className={navClass}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </section>
      )}

      <section>
        <p className="dd-nav-label">Consultas & Apoio</p>
        <details className="group">
          <summary className="dd-nav-item cursor-pointer list-none">
            <FileBarChart aria-hidden="true" />
            <span className="flex-1">Relatórios</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="ml-5 border-l border-slate-200 pl-3 my-1 space-y-0.5 dark:border-slate-800">
            {reports.map(({ label, to }) => (
              <NavLink 
                key={to} 
                to={to} 
                onClick={close} 
                className={({ isActive }) => 
                  `block rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-[#0b1f3f] dark:bg-blue-950/40 dark:text-sky-300 font-bold' 
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </details>
        
        <NavLink to="/minha-privacidade" onClick={close} className={navClass}>
          <Shield aria-hidden="true" />
          <span>Privacidade & LGPD</span>
        </NavLink>
      </section>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-[#090e17] dark:text-slate-100">
      {/* Desktop Persistent Sidebar */}
      <aside className="dd-sidebar hidden lg:flex">
        <Link to="/turmas" className="dd-brand" aria-label="DC Digital, ir para visão geral">
          <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
          <span>
            <strong className="text-[#0b1f3f] dark:text-sky-400 text-base tracking-tight font-extrabold">DC Digital</strong>
            <small className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Espaço Pedagógico</small>
          </span>
        </Link>
        
        <div className="flex-1 overflow-y-auto px-1.5">
          {renderNav()}
        </div>

        {/* User Card */}
        <div className="border-t border-slate-200 p-4 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#eef4fc] text-[#0b1f3f] dark:bg-slate-800 dark:text-sky-400 font-bold flex items-center justify-center text-xs border border-blue-100 dark:border-slate-700">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{user?.name || 'Usuário'}</p>
              <p className="truncate text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{user?.title || user?.role}</p>
            </div>
            <button 
              onClick={async () => { await logout(); navigate('/'); }} 
              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Sair do sistema"
              aria-label="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:pl-72">
        <header className="dd-topbar">
          <div className="flex items-center gap-3 min-w-0">
            <button 
              onClick={() => setMenuOpen(true)} 
              className="dd-icon-button lg:hidden" 
              aria-label="Abrir menu de navegação"
            >
              <Menu aria-hidden="true" />
            </button>
            
            <Link to="/turmas" className="flex items-center gap-2 lg:hidden">
              <img src="/logo.png" alt="" className="h-7 w-7 object-contain" />
              <b className="text-[#0b1f3f] dark:text-sky-400 font-bold text-sm">DC Digital</b>
            </Link>

            {/* Persistent Workspace Context Indicator */}
            {isDeepInsideClass && turmaAtiva ? (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#f0f4fa] dark:bg-slate-800/80 rounded-xl border border-blue-100/70 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
                <span className="font-semibold text-slate-500 dark:text-slate-400">Turma ativa:</span>
                <strong className="text-[#0b1f3f] dark:text-sky-300 font-bold">{turmaAtiva.fase || turmaAtiva.ensino}</strong>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="text-slate-600 dark:text-slate-300 font-medium">{turmaAtiva.componente}</span>
                <Link 
                  to="/turmas" 
                  className="ml-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 dark:text-sky-400 hover:underline"
                >
                  (Trocar)
                </Link>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>{canManage ? 'Gestão Escolar' : 'Ambiente Docente'}</span>
                <span>•</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">Ano Letivo {APP_CONFIG.YEAR}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Status Capsule */}
            <div 
              onClick={() => {
                if (connectionState === 'ERROR' || deadLetterCount > 0 || (isOnline && pendingCount > 0)) {
                  syncNow();
                }
              }}
              title={
                !isOnline 
                  ? `Offline: ${pendingCount} alteração(ões) salva(s) localmente` 
                  : pendingCount > 0 
                  ? `${pendingCount} item(ns) aguardando sincronização` 
                  : 'Conectado e sincronizado'
              }
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
                !isOnline 
                  ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                  : connectionState === 'SYNCING'
                  ? 'bg-blue-50 text-blue-800 border-blue-200 animate-pulse dark:bg-blue-950/40 dark:text-sky-300 dark:border-blue-800'
                  : deadLetterCount > 0
                  ? 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                  : pendingCount > 0
                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              }`}
            >
              {!isOnline ? (
                <>
                  <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="hidden md:inline">Offline</span>
                  {pendingCount > 0 && <span className="font-bold">({pendingCount})</span>}
                </>
              ) : connectionState === 'SYNCING' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-blue-600 dark:text-sky-400 animate-spin" />
                  <span className="hidden md:inline">Sincronizando</span>
                </>
              ) : deadLetterCount > 0 ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />
                  <span className="hidden md:inline">Atenção sync</span>
                  <span className="font-bold">({deadLetterCount})</span>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  <span className="hidden md:inline">Pendente</span>
                  <span className="font-bold">({pendingCount})</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="hidden md:inline">Sincronizado</span>
                </>
              )}
            </div>

            {user?.role !== 'ADMIN' && (
              <button 
                onClick={() => setScheduleOpen(true)} 
                className="dd-icon-button" 
                aria-label="Ver grade de horários" 
                title="Grade de Horários"
              >
                <CalendarDays aria-hidden="true" />
              </button>
            )}
            
            <NavLink 
              to="/minha-privacidade" 
              className="dd-icon-button" 
              aria-label="Central de privacidade" 
              title="Privacidade & LGPD"
            >
              <Shield aria-hidden="true" />
            </NavLink>
            
            <button 
              onClick={async () => { await logout(); navigate('/'); }} 
              className="dd-icon-button text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" 
              aria-label="Sair do sistema" 
              title="Sair"
            >
              <LogOut aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Sync Notifications & Offline Engine Alerts */}
        <ConnectionStatus />
        
        {deadLetterCount > 0 && (
          <div className="bg-amber-500 text-white text-xs font-semibold py-2 px-4 text-center shadow-inner flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Há {deadLetterCount} registro(s) pendentes com erro no envio remoto. Verifique antes de sair.</span>
          </div>
        )}

        <main className="min-h-[calc(100vh-4rem)] pb-20 lg:pb-8">
          <Outlet />
        </main>

        <PrivacyLinksFooter className="hidden lg:flex" />
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-950/50 backdrop-blur-xs lg:hidden animate-in fade-in" 
          onClick={close}
        >
          <aside 
            className="h-full w-[min(20rem,86vw)] flex flex-col justify-between overflow-y-auto bg-white shadow-2xl dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800" 
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="mb-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="" className="h-8 w-8 object-contain" />
                  <div>
                    <strong className="font-extrabold text-[#0b1f3f] dark:text-sky-400 text-sm block leading-tight">DC Digital</strong>
                    <small className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Espaço Pedagógico</small>
                  </div>
                </div>
                <button className="dd-icon-button" onClick={close} aria-label="Fechar menu">
                  <X aria-hidden="true" />
                </button>
              </div>
              {renderNav()}
            </div>

            {/* Mobile Drawer User Card */}
            <div className="border-t border-slate-200 p-4 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#eef4fc] text-[#0b1f3f] dark:bg-slate-800 dark:text-sky-400 font-bold flex items-center justify-center text-xs border border-blue-100 dark:border-slate-700">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">{user?.name || 'Usuário'}</p>
                  <p className="truncate text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider">{user?.title || user?.role}</p>
                </div>
                <button 
                  onClick={async () => { close(); await logout(); navigate('/'); }} 
                  className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Sair do sistema"
                  aria-label="Sair"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="dd-mobile-nav lg:hidden" aria-label="Ações principais do professor">
        <NavLink to="/turmas" end>
          <Home aria-hidden="true" />
          <span>Início</span>
        </NavLink>
        <NavLink to="/diario">
          <BookOpenCheck aria-hidden="true" />
          <span>Diário</span>
        </NavLink>
        <button onClick={openQuickAttendance} aria-label="Abrir chamada rápida">
          <ClipboardCheck aria-hidden="true" />
          <span>Chamada</span>
        </button>
        {canManage ? (
          <NavLink to="/administracao">
            <GraduationCap aria-hidden="true" />
            <span>Gestão</span>
          </NavLink>
        ) : (
          <button onClick={() => setScheduleOpen(true)}>
            <CalendarDays aria-hidden="true" />
            <span>Horários</span>
          </button>
        )}
      </nav>

      <ScheduleModal isOpen={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  );
}
