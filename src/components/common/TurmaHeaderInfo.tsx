import React from 'react';
import { GraduationCap, Building2, Clock, BookOpen } from 'lucide-react';
import { Turma } from '../../contexts/TurmaContext';

interface TurmaHeaderInfoProps {
  turmaAtiva: Turma;
}

const TurmaHeaderInfo = React.memo(function TurmaHeaderInfo({ turmaAtiva }: TurmaHeaderInfoProps) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
        <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Professor</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100" title={turmaAtiva.professor}>
            {turmaAtiva.professor.length > 20 ? turmaAtiva.professor.substring(0, 18) + '...' : turmaAtiva.professor}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
        <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Escola</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{turmaAtiva.escola}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
        <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Turno</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{turmaAtiva.turno}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
        <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-300 uppercase">Componente</p>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase">{turmaAtiva.componente}</p>
        </div>
      </div>
    </div>
  );
});

export default TurmaHeaderInfo;
