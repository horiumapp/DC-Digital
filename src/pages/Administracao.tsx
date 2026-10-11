import { PageHeading } from '../components/common/PortalUI';
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SEMEC_ROLE } from '../constants/authConstants';
import { Building2, Users, User, GraduationCap, ShieldAlert, CalendarDays } from 'lucide-react';
import TabEscolas from './administracao/TabEscolas';
import TabAlunos from './administracao/TabAlunos';
import TabTurmas from './administracao/TabTurmas';
import TabProfessores from './administracao/TabProfessores';
import TabUsuarios from './administracao/TabUsuarios';
import TabLgpd from './administracao/TabLgpd';
import TabCalendario from './administracao/TabCalendario';
import TabFeriados from './administracao/TabFeriados';

export default function Administracao() {
  const { user } = useAuth();
  const isSemec = user?.role === SEMEC_ROLE;
  const seesAllSchools = user?.role === 'ADMIN' || isSemec;
  const defaultTab = seesAllSchools ? 'escolas' : user?.role === 'GESTOR' ? 'professores' : 'turmas';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const sections = [
    ...(seesAllSchools?[{id:'escolas',label:'Escolas',description:'Unidades da rede',icon:Building2}]:[]),
    {id:'turmas',label:'Turmas',description:'Organização das classes',icon:Users},
    {id:'professores',label:'Professores',description:'Equipe pedagógica',icon:GraduationCap},
    {id:'alunos',label:'Alunos',description:'Trajetórias de aprendizagem',icon:User},
    ...(user?.role==='ADMIN'?[{id:'usuarios',label:'Usuários',description:'Acessos ao sistema',icon:Users},{id:'calendario',label:'Calendário',description:'Planejamento do ano',icon:CalendarDays}]:[]),
    ...(seesAllSchools?[{id:'feriados',label:'Feriados',description:'Datas da rede',icon:CalendarDays}]:[]),
    ...(user?.role==='ADMIN'?[{id:'lgpd',label:'LGPD',description:'Cuidado com os dados',icon:ShieldAlert}]:[]),
  ];
  return <div className="portal-page portal-admin"><PageHeading eyebrow="CONEXÕES QUE FAZEM A ESCOLA" title="Gestão que aproxima." description={isSemec?'Uma visão integrada de todas as escolas da rede.':'Pessoas, turmas e planejamento. Tudo no seu lugar.'}/><nav className="portal-admin-shortcuts" aria-label="Atalhos da gestão">{sections.filter(section=>['turmas','alunos','professores'].includes(section.id)).map(({id,label,description,icon:Icon})=><button key={id} onClick={()=>setActiveTab(id)} aria-label={`Gerenciar ${label.toLowerCase()}`} aria-pressed={activeTab===id}><span><Icon size={23}/></span><div><strong>{label}</strong><small>{description}</small></div></button>)}</nav><div className="portal-admin-workspace"><aside className="portal-admin-rail"><span className="portal-eyebrow">EXPLORE A ESCOLA</span>{sections.map(({id,label,description,icon:Icon})=><button key={id} onClick={()=>setActiveTab(id)} aria-pressed={activeTab===id}><Icon size={19}/><span><strong>{label}</strong><small>{description}</small></span></button>)}</aside><section className="portal-admin-content"><header><span className="portal-eyebrow">GESTÃO ESCOLAR</span><h2>{sections.find(s=>s.id===activeTab)?.label}</h2></header>          {seesAllSchools && activeTab === 'escolas' && <TabEscolas />}
          {user?.role === 'ADMIN' && activeTab === 'calendario' && <TabCalendario />}
          {seesAllSchools && activeTab === 'feriados' && <TabFeriados />}
          {user?.role === 'ADMIN' && activeTab === 'usuarios' && <TabUsuarios />}
          {user?.role === 'ADMIN' && activeTab === 'lgpd' && <TabLgpd />}
          {activeTab === 'alunos' && <TabAlunos />}
          {activeTab === 'turmas' && <TabTurmas />}
          {activeTab === 'professores' && <TabProfessores />}</section></div></div>;
}
