import React from 'react';
import { GraduationCap, Building2, Clock, BookOpen } from 'lucide-react';
import { Turma } from '../../contexts/TurmaContext';

interface TurmaHeaderInfoProps {
  turmaAtiva: Turma;
}

const TurmaHeaderInfo = React.memo(function TurmaHeaderInfo({ turmaAtiva }: TurmaHeaderInfoProps) {
  return (
    <div 
      className="bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/90 dark:border-slate-700/80 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
      data-testid="turma-header"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-slate-700 text-[#0b1f3f] dark:text-sky-400 flex items-center justify-center shrink-0">
          <GraduationCap className="w-3.5 h-3.5" />
        </div>
        <div className="truncate">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase mr-1.5">Professor:</span>
          <strong className="font-bold text-slate-700 dark:text-slate-200">{turmaAtiva.professor?.toUpperCase()}</strong>
        </div>
      </div>

      <div className="flex items-center gap-2 min-w-0">
        <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-slate-700 text-[#0b1f3f] dark:text-sky-400 flex items-center justify-center shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="truncate">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase mr-1.5">Escola:</span>
          <strong className="font-bold text-slate-700 dark:text-slate-200">{turmaAtiva.escola}</strong>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-slate-700 text-[#0b1f3f] dark:text-sky-400 flex items-center justify-center shrink-0">
          <Clock className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase mr-1.5">Turno:</span>
          <strong className="font-bold text-slate-700 dark:text-slate-200 uppercase">{turmaAtiva.turno}</strong>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-slate-700 text-[#0b1f3f] dark:text-sky-400 flex items-center justify-center shrink-0">
          <BookOpen className="w-3.5 h-3.5" />
        </div>
        <div>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase mr-1.5">Componente:</span>
          <strong className="font-bold text-blue-700 dark:text-sky-400 uppercase">{turmaAtiva.componente}</strong>
        </div>
      </div>
    </div>
  );
});

export default TurmaHeaderInfo;
