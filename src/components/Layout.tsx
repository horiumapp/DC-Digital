import SchoolIdentity from './common/SchoolIdentity';
import { ModuleWorkspace } from './common/ModuleWorkspace';
import ReportsWorkspace from './common/ReportsWorkspace';
import { PortalBrand } from './common/PortalUI';
import { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Printer, Search, ArrowUpRight
} from 'lucide-react';
import ScheduleModal from './ScheduleModal';
import ConnectionStatus from './common/ConnectionStatus';
import PrivacyLinksFooter from './PrivacyLinksFooter';
import { useAuth } from '../contexts/AuthContext';
import { useTurma } from '../contexts/TurmaContext';
import { useToast } from './common/Toast';
import { useOffline } from '../contexts/OfflineContext';
import { ADMIN_ROLES, SEMEC_ROLE } from '../constants/authConstants';
import { APP_CONFIG } from '../config/appConfig';
import { nomeFeriado } from '../services/feriados';

type Item = { label: string; to: string; icon: typeof Home; end?: boolean };
const reports: Item[] = [
  { label: 'Boletins escolares', to: '/relatorio-boletins', icon: Printer },
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
  
  const [navQuery, setNavQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuOpenerRef = useRef<HTMLElement | null>(null);
  const openMenu = (event: { currentTarget: HTMLButtonElement }) => {
    menuOpenerRef.current = event.currentTarget;
    setMenuOpen(true);
  };
  useEffect(() => {
    if (!menuOpen) return;
    const opener = menuOpenerRef.current ?? menuTriggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    drawerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
      if (event.key !== 'Tab') return;
      const nodes = Array.from(drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button, summary, [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
      const first = nodes[0]; const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', handleKey); opener?.focus(); };
  }, [menuOpen]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const isSemec = user?.role === SEMEC_ROLE;
  const canManage = !!user && (ADMIN_ROLES.includes(user.role) || isSemec);
  const close = () => setMenuOpen(false);

  const availableReports = reports.filter(item => {
    if (isSemec) return false;
    if (item.to === '/relatorio-boletins') {
      return canManage;
    }
    return true;
  });

  const isDeepInsideClass = ['/diario', '/frequencia', '/aparata', '/aparata-detalhes'].includes(location.pathname);

  const openQuickAttendance = () => {
    if (!turmaAtiva) {
      showInfo('Escolha a turma para registrar a frequência.');
      navigate('/turmas?destino=frequencia');
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
      const dataCandidata = `${candidata.getFullYear()}-${String(candidata.getMonth() + 1).padStart(2, '0')}-${String(candidata.getDate()).padStart(2, '0')}`;
      if (diasComAula.includes(candidata.getDay()) && !nomeFeriado(dataCandidata)) {
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
    navigate(`/frequencia?date=${data}&turmaId=${encodeURIComponent(String(turmaAtiva.id))}&origem=ultima-aula&periodo=${encodeURIComponent(periodoAberto.nome)}`);
  };

  const navClass = ({ isActive }: { isActive: boolean }) => `dd-nav-item ${isActive ? 'dd-nav-item-active' : ''}`;
  
  const work: Item[] = [
    { label: 'Minhas turmas', to: '/turmas', icon: Users, end: true },
    { label: 'Diário de classe', to: '/diario', icon: BookOpenCheck },
    { label: 'Frequência e notas', to: '/frequencia', icon: ClipboardCheck },
  ];
  
  const management: Item[] = isSemec
    ? [{ label: 'Gestão escolar', to: '/administracao', icon: GraduationCap }]
    : canManage ? [
      { label: 'Gestão escolar', to: '/administracao', icon: GraduationCap },
      ...(user?.role === 'ADMIN' ? [{ label: 'Currículo BNCC', to: '/curriculo', icon: BookOpenCheck }] : []),
      { label: 'Pendências', to: '/estatisticas', icon: BarChart3 },
    ] : [];

  const isDocente = user?.role === 'PROFESSOR';
  const homePath = canManage ? '/administracao' : '/turmas';

  const renderNav = () => (
    <nav className="space-y-6 py-2" aria-label="Navegação principal">
      {isDocente && (
        <section>
          <p className="dd-nav-label">Rotina Docente</p>
          {work.filter(item => item.label.toLocaleLowerCase().includes(navQuery.toLocaleLowerCase())).map(({ label, to, icon: Icon, end }) => (
            <NavLink key={label} to={to} end={end} onClick={close} className={navClass}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </section>
      )}

      {management.length > 0 && (
        <section>
          <p className="dd-nav-label">Gestão Pedagógica</p>
          {management.filter(item => item.label.toLocaleLowerCase().includes(navQuery.toLocaleLowerCase())).map(({ label, to, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={close} className={navClass}>
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </section>
      )}

      <section>
        <p className="dd-nav-label">Consultas & Apoio</p>
        {availableReports.length > 0 && <details className="group" open={Boolean(navQuery) || location.pathname.startsWith('/relatorio-') || undefined}>
          <summary className="dd-nav-item cursor-pointer list-none">
            <FileBarChart aria-hidden="true" />
            <span className="flex-1">Relatórios</span>
            <ChevronRight className="w-4 h-4 text-slate-400 group-open:rotate-90 transition-transform" />
          </summary>
          <div className="ml-5 border-l border-slate-200 pl-3 my-1 space-y-0.5 dark:border-slate-800">
            {availableReports.filter(item => item.label.toLocaleLowerCase().includes(navQuery.toLocaleLowerCase())).map(({ label, to }) => (
              <NavLink 
                key={to} 
                to={to} 
                onClick={close} 
                className={({ isActive }) => 
                  `block rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-[#6354c7] dark:bg-blue-950/40 dark:text-sky-300 font-bold' 
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </details>}
        
        <NavLink to="/minha-privacidade" onClick={close} className={navClass}>
          <Shield aria-hidden="true" />
          <span>Privacidade & LGPD</span>
        </NavLink>
      </section>
    </nav>
  );

  const allocations=user?.alocacoes||[];
  const soleSchool=[...new Set(allocations.map(item=>item.escola_id))];
  const headerSchoolId=(canManage?user?.escola_id:turmaAtiva?.escola_id||user?.escola_id)||(soleSchool.length===1?soleSchool[0]:undefined);
  const headerSchoolName=turmaAtiva?.escola_id===headerSchoolId&&turmaAtiva?.escola?turmaAtiva.escola:allocations.find(item=>item.escola_id===headerSchoolId)?.escolas?.nome||(headerSchoolId?'Sua escola':canManage?'Rede de ensino':'Selecione uma turma');
  const titles: Record<string,string> = { '/turmas':'Meu espaço', '/diario':'Diário de classe', '/frequencia':'Registro da aula', '/administracao':'Gestão escolar', '/estatisticas':'Visão da escola', '/curriculo':'Currículo', '/aparata':'Fechamento de período', '/aparata-detalhes':'Detalhes da aparata' };
  const pageTitle = titles[location.pathname] || (location.pathname.startsWith('/relatorio-') ? 'Central de relatórios' : 'Acompanhamento');
  const syncText = !isOnline ? 'Modo offline' : connectionState === 'SYNCING' ? 'Sincronizando' : deadLetterCount > 0 ? 'Revisar envios' : pendingCount > 0 ? pendingCount+' pendentes' : 'Tudo sincronizado';
  const searchField = <label className="portal-nav-search"><Search size={16}/><input aria-label="Buscar no menu" placeholder="Buscar no menu" value={navQuery} onChange={e=>setNavQuery(e.target.value)}/></label>;
  const userCard = <div className="portal-user-card"><span className="portal-avatar">{user?.name?.slice(0,2).toUpperCase() || 'DC'}</span><div><strong>{user?.name || 'Usuário'}</strong><small>{user?.title || user?.role}</small></div><button aria-label="Sair" onClick={async()=>{close();await logout();navigate('/');}}><LogOut size={18}/></button></div>;
  return <div className="portal-app">
    <a href="#conteudo-principal" className="dd-skip-link">Pular para o conteúdo</a>
    <aside className="portal-sidebar">
      <Link to={homePath} className="portal-brand-link" aria-label="DC Digital, ir para visão geral"><PortalBrand/></Link>
      {searchField}<div className="portal-navigation">{renderNav()}</div>
      {!canManage && <button className="portal-schedule-card" onClick={()=>setScheduleOpen(true)}><CalendarDays size={21}/><span><strong>Seu tempo, organizado.</strong><small>Consultar grade de horários</small></span><ArrowUpRight size={17}/></button>}
      {userCard}
    </aside>
    <div className="portal-workspace">
      <header className="portal-topbar portal-school-topbar"><button className="portal-icon-button portal-mobile-only" ref={menuTriggerRef} aria-expanded={menuOpen} aria-controls="menu-mobile" aria-label="Abrir menu de navegação" onClick={openMenu}><Menu size={21}/></button><SchoolIdentity schoolId={headerSchoolId} name={headerSchoolName} year={APP_CONFIG.YEAR} turn={turmaAtiva?.escola_id===headerSchoolId?turmaAtiva?.turno:undefined} variant="header"/><div className="portal-topbar-actions"><button className={'portal-sync '+(!isOnline || pendingCount || deadLetterCount ? 'has-pending':'')} onClick={()=>{if(isOnline && pendingCount>0) void syncNow();}} disabled={!isOnline || pendingCount===0} title={syncText}>{!isOnline?<WifiOff size={15}/>:connectionState==='SYNCING'?<RefreshCw size={15}/>:deadLetterCount>0?<AlertTriangle size={15}/>:<CheckCircle2 size={15}/>}<span>{syncText}</span></button><Link className="portal-top-avatar" to="/minha-privacidade" aria-label="Central de privacidade"><Shield size={16} aria-hidden="true"/></Link></div></header>
      <ConnectionStatus/><div className="portal-page-location" aria-label="Página atual"><span>Meu espaço</span><ChevronRight size={13}/><strong>{pageTitle}</strong></div>
      {deadLetterCount>0 && <div className="portal-system-alert" role="status"><AlertTriangle size={17}/>Há {deadLetterCount} registro(s) com erro no envio. Verifique antes de sair.</div>}
      {isDeepInsideClass && turmaAtiva && <div className="portal-class-trail"><BookOpenCheck size={17}/><strong>{turmaAtiva.fase || turmaAtiva.ensino}</strong><span>{turmaAtiva.componente}</span><Link to="/turmas">Trocar turma <ChevronRight size={17}/></Link></div>}
      <main id="conteudo-principal" tabIndex={-1} className="portal-main">{location.pathname.startsWith('/relatorio-')?<ReportsWorkspace><Outlet/></ReportsWorkspace>:<ModuleWorkspace><Outlet/></ModuleWorkspace>}</main><PrivacyLinksFooter className="portal-workspace-footer"/>
    </div>
    {menuOpen && <div className="portal-drawer-backdrop" onClick={close}><aside ref={drawerRef} className="portal-drawer" id="menu-mobile" role="dialog" aria-modal="true" aria-label="Menu de navegação" onClick={e=>e.stopPropagation()}><div className="portal-drawer-heading"><PortalBrand/><button className="portal-icon-button" aria-label="Fechar menu" onClick={close}><X size={21}/></button></div>{searchField}<div className="portal-navigation">{renderNav()}</div>{!canManage&&<button className="portal-button secondary" onClick={()=>{close();setScheduleOpen(true);}}><CalendarDays size={18}/>Horários</button>}{userCard}</aside></div>}
    <nav className="portal-bottom-nav" aria-label={canManage?'Ações principais de gestão':'Ações principais do professor'}>
      <NavLink to={homePath} end><Home size={21}/><span>Início</span></NavLink>
      {canManage ? <NavLink to={isSemec?'/administracao':'/estatisticas'}><BarChart3 size={21}/><span>{isSemec?'Gestão':'Indicadores'}</span></NavLink>:<NavLink to="/diario"><CalendarDays size={21}/><span>Diário</span></NavLink>}
      {canManage ? <NavLink to="/minha-privacidade"><Shield size={21}/><span>Privacidade</span></NavLink>:<button onClick={openQuickAttendance}><ClipboardCheck size={21}/><span>Chamada</span></button>}
      <button aria-label="Mais opções de navegação" aria-expanded={menuOpen} aria-controls="menu-mobile" onClick={openMenu}><Menu size={21}/><span>Mais</span></button>
    </nav>
    <ScheduleModal isOpen={scheduleOpen} onClose={()=>setScheduleOpen(false)}/>
  </div>;
}
