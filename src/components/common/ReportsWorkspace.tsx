import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, ClipboardCheck, BookOpen, FileText, Printer, ArrowUpRight } from 'lucide-react';
import { PageHeading } from './PortalUI';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_ROLES } from '../../constants/authConstants';
export default function ReportsWorkspace({children}:{children:ReactNode}) {
 const {user}=useAuth(); const location=useLocation();
 const items=[{path:'/relatorio-notas',label:'Notas',hint:'Resultados das avaliações',icon:FileText},{path:'/relatorio-medias',label:'Médias',hint:'Evolução por componente',icon:BarChart3},{path:'/relatorio-conteudos',label:'Conteúdos',hint:'Percurso de aprendizagem',icon:BookOpen},{path:'/relatorio-frequencia',label:'Frequência',hint:'Presença e participação',icon:ClipboardCheck},...(user&&ADMIN_ROLES.includes(user.role)?[{path:'/relatorio-boletins',label:'Boletins',hint:'Uma visão de cada estudante',icon:Printer}]:[])];
 return <div className="portal-reports"><div className="portal-page portal-report-heading"><PageHeading eyebrow="DADOS QUE CONTAM HISTÓRIAS" title="Um olhar para cada avanço." description="Explore os registros da turma e transforme informação em acompanhamento."/><nav className="portal-report-categories" aria-label="Tipos de relatório">{items.map(({path,label,hint,icon:Icon})=><NavLink key={path} to={path}><Icon size={23}/><span><strong>{label}</strong><small>{hint}</small></span><ArrowUpRight size={16}/></NavLink>)}</nav></div><div className="portal-report-body" key={location.pathname}>{children}</div></div>;
}
