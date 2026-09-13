import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpenCheck, CalendarDays, ClipboardCheck, FileBarChart, GraduationCap, Home, LogOut, Menu, Shield, Users, X } from 'lucide-react';
import ScheduleModal from './ScheduleModal';
import ConnectionStatus from './common/ConnectionStatus';
import PrivacyLinksFooter from './PrivacyLinksFooter';
import { useAuth } from '../contexts/AuthContext';
import { useTurma } from '../contexts/TurmaContext';
import { useOffline } from '../contexts/OfflineContext';
import { ADMIN_ROLES } from '../constants/authConstants';

type Item = { label: string; to: string; icon: typeof Home; end?: boolean };
const reports: Item[] = [
  { label: 'Conteúdos ministrados', to: '/relatorio-conteudos', icon: BookOpenCheck },
  { label: 'Frequência da turma', to: '/relatorio-frequencia', icon: ClipboardCheck },
  { label: 'Médias do componente', to: '/relatorio-medias', icon: BarChart3 },
  { label: 'Notas da turma', to: '/relatorio-notas', icon: FileBarChart },
];

export default function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { turmaAtiva } = useTurma();
  const { deadLetterCount } = useOffline();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const canManage = !!user && ADMIN_ROLES.includes(user.role);
  const close = () => setMenuOpen(false);
  const openQuickAttendance = () => {
    if (!turmaAtiva) {
      navigate('/turmas');
      return;
    }
    const hoje = new Date();
    const data = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    navigate(`/frequencia?date=${data}&turmaId=${encodeURIComponent(String(turmaAtiva.id))}`);
  };
  const navClass = ({ isActive }: { isActive: boolean }) => `dd-nav-item ${isActive ? 'dd-nav-item-active' : ''}`;
  const work: Item[] = [
    { label: 'Visão geral', to: '/turmas', icon: Home, end: true },
    { label: 'Minhas turmas', to: '/turmas', icon: Users },
    { label: 'Diário de classe', to: '/diario', icon: BookOpenCheck },
    { label: 'Frequência e notas', to: '/frequencia', icon: ClipboardCheck },
  ];
  const management: Item[] = canManage ? [
    { label: 'Gestão escolar', to: '/administracao', icon: GraduationCap },
    { label: 'Currículo BNCC', to: '/curriculo', icon: BookOpenCheck },
    { label: 'Pendências', to: '/estatisticas', icon: BarChart3 },
  ] : [];
  const renderNav = () => <nav className="space-y-6" aria-label="Navegação principal">
    <section><p className="dd-nav-label">Trabalho</p>{work.map(({label,to,icon:Icon,end}) => <NavLink key={label} to={to} end={end} onClick={close} className={navClass}><Icon aria-hidden="true"/><span>{label}</span></NavLink>)}</section>
    {management.length > 0 && <section><p className="dd-nav-label">Gestão</p>{management.map(({label,to,icon:Icon}) => <NavLink key={to} to={to} onClick={close} className={navClass}><Icon aria-hidden="true"/><span>{label}</span></NavLink>)}</section>}
    <section><p className="dd-nav-label">Consultas</p><details><summary className="dd-nav-item cursor-pointer list-none"><FileBarChart aria-hidden="true"/><span>Relatórios</span></summary><div className="ml-5 border-l border-slate-200 pl-3 dark:border-slate-700">{reports.map(({label,to}) => <NavLink key={to} to={to} onClick={close} className={({isActive}) => `block rounded-md px-3 py-2 text-sm ${isActive ? 'font-semibold text-primary' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>{label}</NavLink>)}</div></details><NavLink to="/minha-privacidade" onClick={close} className={navClass}><Shield aria-hidden="true"/><span>Privacidade e LGPD</span></NavLink></section>
  </nav>;

  return <div className="min-h-screen bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
    <aside className="dd-sidebar hidden lg:flex"><Link to="/turmas" className="dd-brand" aria-label="Diário Digital, ir para visão geral"><img src="/logo.png" alt="" className="h-10 w-10 object-contain"/><span><strong>Diário</strong><small>Digital</small></span></Link><div className="flex-1 overflow-y-auto">{renderNav()}</div><div className="border-t border-slate-200 pt-4 dark:border-slate-800"><p className="truncate text-sm font-semibold">{user?.name || 'Usuário'}</p><p className="mb-3 text-xs text-slate-500">{user?.title || user?.role}</p><button onClick={async()=>{await logout();navigate('/')}} className="dd-nav-item w-full text-left text-red-700"><LogOut aria-hidden="true"/><span>Sair</span></button></div></aside>
    <div className="lg:pl-72"><header className="dd-topbar"><div className="flex items-center gap-3"><button onClick={()=>setMenuOpen(true)} className="dd-icon-button lg:hidden" aria-label="Abrir menu"><Menu aria-hidden="true"/></button><Link to="/turmas" className="flex items-center gap-2 lg:hidden"><img src="/logo.png" alt="" className="h-8 w-8 object-contain"/><b className="text-primary">Diário Digital</b></Link><p className="hidden text-sm text-slate-500 md:block">{canManage ? 'Ambiente de gestão escolar' : 'Ambiente de trabalho docente'}</p></div><div className="flex gap-2">{user?.role !== 'ADMIN' && <button onClick={()=>setScheduleOpen(true)} className="dd-icon-button" aria-label="Ver horários" title="Horários"><CalendarDays aria-hidden="true"/></button>}<NavLink to="/minha-privacidade" className="dd-icon-button" aria-label="Central de privacidade"><Shield aria-hidden="true"/></NavLink><button onClick={async()=>{await logout();navigate('/')}} className="dd-icon-button text-red-700" aria-label="Sair do sistema" title="Sair"><LogOut aria-hidden="true"/></button></div></header><ConnectionStatus/>{deadLetterCount > 0 && <div className="dd-sync-alert">Há {deadLetterCount} registro(s) aguardando sincronização. Verifique a conexão antes de encerrar a sessão.</div>}<main className="min-h-[calc(100vh-4rem)] pb-20 lg:pb-0"><Outlet/></main><PrivacyLinksFooter className="hidden lg:flex"/></div>
    {menuOpen && <div className="fixed inset-0 z-[60] bg-slate-950/40 lg:hidden" onClick={close}><aside className="h-full w-[min(20rem,86vw)] overflow-y-auto bg-white p-5 shadow-2xl dark:bg-slate-900" onClick={e=>e.stopPropagation()}><div className="mb-8 flex justify-end"><button className="dd-icon-button" onClick={close} aria-label="Fechar menu"><X aria-hidden="true"/></button></div>{renderNav()}</aside></div>}
    <nav className="dd-mobile-nav lg:hidden" aria-label="Ações principais"><NavLink to="/turmas" end><Home aria-hidden="true"/><span>Início</span></NavLink><NavLink to="/diario"><BookOpenCheck aria-hidden="true"/><span>Diário</span></NavLink><button onClick={openQuickAttendance} aria-label="Abrir frequência rápida"><ClipboardCheck aria-hidden="true"/><span>Frequência</span></button>{canManage ? <NavLink to="/administracao"><GraduationCap aria-hidden="true"/><span>Gestão</span></NavLink> : <button onClick={()=>setScheduleOpen(true)}><CalendarDays aria-hidden="true"/><span>Horários</span></button>}</nav><ScheduleModal isOpen={scheduleOpen} onClose={()=>setScheduleOpen(false)}/>
  </div>;
}

