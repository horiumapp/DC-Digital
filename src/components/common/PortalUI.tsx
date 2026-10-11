import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Search, LayoutGrid, List, Building2, ArrowRight, GraduationCap, Star, CalendarDays, ClipboardCheck, FileBarChart } from 'lucide-react';
import type { Turma } from '../../contexts/TurmaContext';

export function PortalBrand() {
  return <span className="portal-brand"><span className="portal-brand-mark"><BookOpen size={23} strokeWidth={2.2} /></span><span>dc<span className="portal-brand-light">digital</span><small>EDUCAÇÃO EM MOVIMENTO</small></span></span>;
}
export function PageHeading({eyebrow,title,description,actions}: {eyebrow:string;title:string;description?:string;actions?:ReactNode}) {
  return <header className="portal-page-heading"><div><span className="portal-eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="portal-heading-actions">{actions}</div>}</header>;
}
export function Metric({label,value,detail,tone='violet'}:{label:string;value:ReactNode;detail:string;tone?:string}) {
  const percent=typeof value==='string'&&/^\d+(\.\d+)?%$/.test(value)?Math.min(100,Math.max(0,parseFloat(value))):null;
  return <article className={`portal-metric tone-${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small>{percent!==null&&<div className="portal-metric-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{width:`${percent}%`}}/></div>}</article>;
}
export function EmptyState({title,description,children}:{title:string;description:string;children?:ReactNode}) {
  return <div className="portal-empty"><span><GraduationCap size={32}/></span><h2>{title}</h2><p>{description}</p>{children}</div>;
}
interface ClassWorkspaceProps {
  name:string; year:number; school:string; classes:Turma[]; search:string;
  onSearch:(value:string)=>void; view:'cards'|'table'; onView:(view:'cards'|'table')=>void;
  onOpen:(turma:Turma)=>void; schoolAction?:ReactNode; activeClass?:Turma|null; preferenceKey?:string;
}
function FavoriteButton({turma,selected,onToggle}:{turma:Turma;selected:boolean;onToggle:()=>void}) {
  return <button className="portal-course-favorite" onClick={onToggle} aria-pressed={selected} aria-label={`${selected?'Remover dos favoritos':'Favoritar'} ${turma.fase}, ${turma.componente}`} title={selected?'Remover dos favoritos':'Favoritar turma'}><Star size={18} fill={selected?'currentColor':'none'}/></button>;
}
export function ClassWorkspace({name,year,school,classes,search,onSearch,view,onView,onOpen,schoolAction,activeClass,preferenceKey='default'}:ClassWorkspaceProps) {
  const storageKey=`dc-portal-favorites:${preferenceKey}:${year}`;
  const [favorites,setFavorites]=useState<string[]>(()=>{try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');return Array.isArray(saved)?saved.filter((id):id is string=>typeof id==='string'):[]}catch{return []}});
  const [onlyFavorites,setOnlyFavorites]=useState(false);
  const [turn,setTurn]=useState('all');
  const turns=[...new Set(classes.map(t=>t.turno).filter(Boolean))];
  const visible=classes.filter(t=>(turn==='all'||t.turno===turn)&&(!onlyFavorites||favorites.includes(t.id)));
  const active=activeClass&&classes.find(t=>t.id===activeClass.id);
  const toggleFavorite=(id:string)=>{const next=favorites.includes(id)?favorites.filter(value=>value!==id):[...favorites,id];setFavorites(next);try{localStorage.setItem(storageKey,JSON.stringify(next))}catch{/* Preference still works for this visit. */}};
  const resetFilters=()=>{setTurn('all');setOnlyFavorites(false);onSearch('')};
  return <div className="portal-page portal-classes portal-refined">
    <PageHeading eyebrow={`PAINEL DO PROFESSOR · ${year}`} title={`Olá, ${name.split(' ')[0]}.`} description="Sua rotina escolar, organizada para o próximo passo." actions={schoolAction}/>
    <section className="portal-routine-grid" aria-label="Seu espaço de trabalho">
      <div className="portal-routine-intro"><span className="portal-pill"><span className="portal-dot"/> MEU ESPAÇO</span><h2>Mais tempo para ensinar.</h2><p>Escolha uma turma para registrar a aula ou acompanhar os resultados.</p><div className="portal-routine-school"><Building2 size={17}/><span>{school}</span></div><div className="portal-routine-art" aria-hidden="true"><BookOpen size={76} strokeWidth={1}/><span>✳</span></div></div>
      <div className="portal-resume"><span className="portal-eyebrow">{active?'CONTINUAR NA TURMA':'COMECE POR AQUI'}</span><span className="portal-resume-icon"><CalendarDays size={24}/></span><h3>{active?active.fase:'Seu diário de classe'}</h3><p>{active?`${active.componente} · ${active.turno}`:'Frequência, conteúdos e avaliações no mesmo espaço.'}</p>{active?<button className="portal-button" onClick={()=>onOpen(active)}>Abrir diário <ArrowRight size={17}/></button>:<a className="portal-button" href="#minhas-turmas">Escolher turma <ArrowRight size={17}/></a>}</div>
    </section>
    <nav className="portal-quick-actions" aria-label="Atalhos do professor"><Link to="/frequencia"><span><ClipboardCheck size={21}/></span><div><strong>Registrar aula</strong><small>Chamada, conteúdo e notas</small></div><ArrowUpRight size={17}/></Link><Link to="/relatorio-frequencia"><span><FileBarChart size={21}/></span><div><strong>Acompanhar frequência</strong><small>Presenças e faltas da turma</small></div><ArrowUpRight size={17}/></Link><Link to="/relatorio-notas"><span><GraduationCap size={21}/></span><div><strong>Consultar notas</strong><small>Resultados das avaliações</small></div><ArrowUpRight size={17}/></Link></nav>
    <section id="minhas-turmas" className="portal-class-section">
      <div className="portal-section-toolbar"><div><span className="portal-eyebrow">ESCOLHA SEU ESPAÇO DE TRABALHO</span><h2>Minhas turmas <span>{visible.length}</span></h2></div><div className="portal-toolbar-controls"><label className="portal-search"><Search size={18}/><input value={search} onChange={e=>onSearch(e.target.value)} placeholder="Turma, componente ou ensino…" aria-label="Buscar turmas"/></label><div className="portal-segment"><button aria-label="Visualizar em cartões" aria-pressed={view==='cards'} onClick={()=>onView('cards')}><LayoutGrid size={18}/></button><button aria-label="Visualizar em tabela" aria-pressed={view==='table'} onClick={()=>onView('table')}><List size={18}/></button></div></div></div>
      <div className="portal-course-filters"><div className="portal-filter-pills"><button aria-pressed={!onlyFavorites} onClick={()=>setOnlyFavorites(false)}>Todas as turmas</button><button aria-pressed={onlyFavorites} onClick={()=>setOnlyFavorites(true)}><Star size={15}/> Favoritas</button></div><label>Turno <select aria-label="Filtrar turmas por turno" value={turn} onChange={e=>setTurn(e.target.value)}><option value="all">Todos os turnos</option>{turns.map(value=><option key={value} value={value}>{value}</option>)}</select></label>{(onlyFavorites||turn!=='all'||search)&&<button className="portal-text-button" onClick={resetFilters}>Limpar filtros</button>}</div>
      {visible.length ? <div className={`portal-course-collection ${view==='table'?'is-list':''}`}>{visible.map((turma,index)=><article className={`portal-course tone-${['violet','apricot','mint','sky'][index%4]}`} key={turma.id}>
        <div className="portal-course-cover"><span className="portal-course-category">{turma.componente}</span><span className="portal-course-glyph" aria-hidden="true">{['✳','◈','⌘','◒'][index%4]}</span><span className="portal-course-turn">{turma.turno}</span><FavoriteButton turma={turma} selected={favorites.includes(turma.id)} onToggle={()=>toggleFavorite(turma.id)}/></div>
        <div className="portal-course-body"><div><h3><button onClick={()=>onOpen(turma)}>{turma.fase || turma.ensino}</button></h3><p>{turma.ensino}</p></div><div className="portal-course-footer"><span><BookOpen size={15}/> Diário de classe</span><button className="portal-open-course" onClick={()=>onOpen(turma)} aria-label={`Abrir diário de ${turma.fase}, ${turma.componente}`}><span>Abrir</span><ArrowRight size={18}/></button></div></div>
      </article>)}</div>:<EmptyState title={onlyFavorites?'Suas favoritas aparecem aqui':'Nenhuma turma encontrada'} description={onlyFavorites?'Toque na estrela de uma turma para guardá-la neste navegador.':'Ajuste a busca e o turno para encontrar sua turma.'}><button className="portal-button secondary" onClick={resetFilters}>Limpar filtros</button></EmptyState>}
      <p className="portal-collection-note">{visible.length} de {classes.length} componentes nesta busca · Favoritos são salvos neste navegador.</p>
    </section>
  </div>;
}
