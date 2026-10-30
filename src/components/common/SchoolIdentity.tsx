import {useEffect,useState} from 'react';
import {Building2,CalendarDays} from 'lucide-react';
import {supabase} from '../../lib/supabase';
import {findSuggestedLogo,getEscolaLogo,LOGO_PADRAO_SEMED} from '../../utils/escolaUtils';

interface SchoolInfo {id:string;nome:string;logo_url?:string|null;inep?:string|null;distrito?:string|null}
interface SchoolIdentityProps {schoolId?:string;name:string;year:number;turn?:string;variant?:'banner'|'header'}
function SchoolMark({name,source}:{name:string;source:string}) {
  const [failedSources,setFailedSources]=useState<string[]>([]);
  const candidates=[...new Set([source,findSuggestedLogo(name),LOGO_PADRAO_SEMED].filter((candidate): candidate is string => Boolean(candidate)))];
  const currentSource=candidates.find(candidate=>!failedSources.includes(candidate))||null;
  const initials=name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('').toUpperCase()||'ES';
  return <div className="portal-school-mark">{currentSource?<img src={currentSource} alt={`Logo da ${name}`} onError={()=>setFailedSources(previous=>[...previous,currentSource])} referrerPolicy="no-referrer"/>:<span title="Identificação da escola — logo indisponível" aria-hidden="true">{initials}</span>}</div>;
}
/** Reads the existing school registration; no record is created or changed. */
export default function SchoolIdentity({schoolId,name,year,turn,variant='banner'}:SchoolIdentityProps) {
  const [record,setRecord]=useState<SchoolInfo|null>(null);
  useEffect(()=>{
    let active=true;
    if(!schoolId)return;
    async function load(){
      try{
        const {data,error}=await supabase.from('escolas').select('id,nome,logo_url,inep,distrito').eq('id',schoolId!).maybeSingle();
        if(active&&!error&&data)setRecord({...data,id:schoolId!} as SchoolInfo);
      }catch{/* Keep the class name and packaged logo when the registration cannot be read. */}
    }
    void load();
    return()=>{active=false};
  },[schoolId]);
  // Prevent a previous school's name or logo from appearing while another loads.
  const school=record?.id===schoolId?record:null;
  const schoolName=school?.nome?.trim()||name;
  const source=getEscolaLogo({logo_url:school?.logo_url,nome:schoolName});
  return <section className={`portal-school-identity ${variant==='header'?'is-header':''}`} aria-label="Identificação da escola"><SchoolMark key={`${schoolId}:${schoolName}:${source}`} name={schoolName} source={source}/><div className="portal-school-name"><span className="portal-eyebrow"><Building2 size={13}/> SUA ESCOLA</span><h2>{schoolName}</h2><div className="portal-school-meta">{school?.distrito&&<span>{school.distrito}</span>}{school?.inep&&<span>INEP {school.inep}</span>}{turn&&<span>{turn}</span>}</div></div><div className="portal-school-year"><CalendarDays size={19}/><span>Ano letivo<strong>{year}</strong></span></div></section>;
}
