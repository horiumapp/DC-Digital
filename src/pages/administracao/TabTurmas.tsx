import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

export default function TabTurmas() {
  const [buscaTurma, setBuscaTurma] = useState('');

  const turmas = [
    { id: 1, nome: '9º Ano A', turno: 'Manhã', anoLetivo: '2026' },
    { id: 2, nome: '1º Ano B', turno: 'Tarde', anoLetivo: '2026' }
  ];

  const turmasFiltradas = turmas.filter(t =>
    t.nome.toLowerCase().includes(buscaTurma.toLowerCase()) ||
    t.turno.toLowerCase().includes(buscaTurma.toLowerCase())
  );

  return (
    <>
      <div className="p-6 flex items-center justify-between border-b border-slate-100 group">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={buscaTurma}
            onChange={(e) => setBuscaTurma(e.target.value)}
            placeholder="Buscar turmas..."
            className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
          />
        </div>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />
          Nova Turma
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Nome da Turma</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Turno</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Ano Letivo</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {turmasFiltradas.map((turma) => (
              <tr key={turma.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-800">{turma.nome}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{turma.turno}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{turma.anoLetivo}</td>
                <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-3">
                    <button className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button className="text-slate-400 hover:text-red-600 transition" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
