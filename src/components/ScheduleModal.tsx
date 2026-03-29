import React from 'react';
import { X, Users, BookOpen, Building2 } from 'lucide-react';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean; // For future use
}

const scheduleData = [
  {
    row: 1,
    segunda: null,
    terca: null,
    quarta: null,
    quinta: null,
    sexta: null,
    sabado: null,
  },
  {
    row: 2,
    segunda: { ensino: 'ENSINO MEDIO', turma: '3 SÉRIE / 01', componente: 'FILO' },
    terca: null,
    quarta: null,
    quinta: null,
    sexta: { ensino: 'ENSINO MEDIO', turma: '2 SÉRIE / 01', componente: 'FILO' },
    sabado: null,
  },
  {
    row: 3,
    segunda: { ensino: 'ENSINO MEDIO', turma: '2 SÉRIE / 02', componente: 'FILO' },
    terca: null,
    quarta: null,
    quinta: null,
    sexta: { ensino: 'ENSINO MEDIO', turma: '1 SÉRIE / 01', componente: 'FILO' },
    sabado: null,
  },
  {
    row: 4,
    segunda: { ensino: 'ENSINO MEDIO', turma: '3 SÉRIE / 02', componente: 'FILO' },
    terca: null,
    quarta: null,
    quinta: null,
    sexta: { ensino: 'ENSINO MEDIO', turma: '1 SÉRIE / 02', componente: 'FILO' },
    sabado: null,
  },
  {
    row: 5,
    segunda: null,
    terca: null,
    quarta: null,
    quinta: null,
    sexta: null,
    sabado: null,
  },
  {
    row: 6,
    segunda: null,
    terca: null,
    quarta: null,
    quinta: null,
    sexta: null,
    sabado: null,
  },
  {
    row: 7,
    segunda: null,
    terca: null,
    quarta: null,
    quinta: null,
    sexta: null,
    sabado: null,
  },
];

export default function ScheduleModal({ isOpen, onClose, isAdmin = false }: ScheduleModalProps) {
  if (!isOpen) return null;

  const renderCell = (data: any) => {
    if (!data) {
      return (
        <div className="h-full w-full min-h-[80px] flex items-center p-2 text-slate-400">
          —
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1 p-2 text-xs">
        <div className="flex items-center gap-1.5 text-blue-600">
          <Building2 className="w-3 h-3" />
          <span className="font-medium">{data.ensino}</span>
        </div>
        <div className="flex items-center gap-1.5 text-indigo-600">
          <Users className="w-3 h-3" />
          <span>{data.turma}</span>
        </div>
        <div className="flex items-center gap-1.5 text-purple-600">
          <BookOpen className="w-3 h-3" />
          <span>{data.componente}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">Horários do Professor</h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-0 overflow-auto flex-1">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-white sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="border-b border-r border-slate-200 p-3 text-left font-semibold text-slate-600 w-12">
                  <div className="flex justify-center">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-slate-400"></div>
                  </div>
                </th>
                <th className="border-b border-r border-slate-200 p-3 text-left font-semibold text-slate-600 w-[16%]">Segunda</th>
                <th className="border-b border-r border-slate-200 p-3 text-left font-semibold text-slate-600 w-[16%]">Terça</th>
                <th className="border-b border-r border-slate-200 p-3 text-left font-semibold text-slate-600 w-[16%]">Quarta</th>
                <th className="border-b border-r border-slate-200 p-3 text-left font-semibold text-slate-600 w-[16%]">Quinta</th>
                <th className="border-b border-r border-slate-200 p-3 text-left font-semibold text-slate-600 w-[16%]">Sexta</th>
                <th className="border-b border-slate-200 p-3 text-left font-semibold text-slate-600 w-[16%]">Sábado</th>
              </tr>
            </thead>
            <tbody>
              {scheduleData.map((row) => (
                <tr key={row.row} className="border-b border-slate-200 last:border-0 hover:bg-slate-50/50 transition-colors">
                  <td className="border-r border-slate-200 p-3 text-center text-slate-500 font-medium bg-slate-50/50">
                    {row.row}
                  </td>
                  <td className="border-r border-slate-200 p-0 align-top bg-slate-50/30">
                    {renderCell(row.segunda)}
                  </td>
                  <td className="border-r border-slate-200 p-0 align-top">
                    {renderCell(row.terca)}
                  </td>
                  <td className="border-r border-slate-200 p-0 align-top bg-slate-50/30">
                    {renderCell(row.quarta)}
                  </td>
                  <td className="border-r border-slate-200 p-0 align-top">
                    {renderCell(row.quinta)}
                  </td>
                  <td className="border-r border-slate-200 p-0 align-top bg-slate-50/30">
                    {renderCell(row.sexta)}
                  </td>
                  <td className="p-0 align-top">
                    {renderCell(row.sabado)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl text-sm text-slate-600">
          Mostrando de 1 até {scheduleData.length} de {scheduleData.length} registros
        </div>
      </div>
    </div>
  );
}
