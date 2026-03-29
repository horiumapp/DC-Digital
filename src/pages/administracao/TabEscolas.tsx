import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import NovaEscolaModal from '../../components/NovaEscolaModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';

export default function TabEscolas() {
  const { user } = useAuth();
  const [buscaEscola, setBuscaEscola] = useState('');
  const [isNovaEscolaModalOpen, setIsNovaEscolaModalOpen] = useState(false);
  const [escolaParaEditar, setEscolaParaEditar] = useState<any>(null);
  const [escolaParaExcluir, setEscolaParaExcluir] = useState<any>(null);

  const [escolas, setEscolas] = useState([
    { id: 1, nome: 'E.M.E.F. Machado de Assis', distrito: 'Centro', inep: '12345678', diretor: 'Maria Silva', status: 'Ativa' },
    { id: 2, nome: 'E.M.E.I. Monteiro Lobato', distrito: 'Zona Norte', inep: '87654321', diretor: 'João Carlos', status: 'Ativa' }
  ]);

  const handleSaveEscola = (novaEscola: any) => {
    if (escolaParaEditar) {
      const escolasAtualizadas = escolas.map((e) =>
        e.id === escolaParaEditar.id
          ? {
            ...e,
            nome: novaEscola.nome,
            distrito: novaEscola.localizacao,
            inep: novaEscola.inep,
            diretor: novaEscola.gestor,
            status: novaEscola.ativo ? 'Ativa' : 'Inativa'
          }
          : e
      );
      setEscolas(escolasAtualizadas);
    } else {
      const newId = escolas.length > 0 ? Math.max(...escolas.map((e) => e.id)) + 1 : 1;
      const escolaFormatada = {
        id: newId,
        nome: novaEscola.nome,
        distrito: novaEscola.localizacao,
        inep: novaEscola.inep,
        diretor: novaEscola.gestor,
        status: novaEscola.ativo ? 'Ativa' : 'Inativa'
      };
      setEscolas([...escolas, escolaFormatada]);
    }
    setEscolaParaEditar(null);
  };

  const handleEditEscola = (escola: any) => {
    setEscolaParaEditar(escola);
    setIsNovaEscolaModalOpen(true);
  };

  const confirmDeleteEscola = () => {
    if (escolaParaExcluir) {
      setEscolas(escolas.filter((e) => e.id !== escolaParaExcluir.id));
      setEscolaParaExcluir(null);
    }
  };

  const escolasFiltradas = escolas.filter(e => 
    e.nome.toLowerCase().includes(buscaEscola.toLowerCase()) || 
    (e.inep && e.inep.includes(buscaEscola)) ||
    (e.diretor && e.diretor.toLowerCase().includes(buscaEscola.toLowerCase()))
  );

  if (user?.role !== 'ADMIN') return null;

  return (
    <>
      <div className="p-6 flex items-center justify-between border-b border-slate-100 group">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            value={buscaEscola}
            onChange={(e) => setBuscaEscola(e.target.value)}
            placeholder="Buscar escolas..."
            className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
          />
        </div>
        <button
          onClick={() => {
            setEscolaParaEditar(null);
            setIsNovaEscolaModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nova Escola
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Nome da Escola</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Localização</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">INEP</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Diretor(a)</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Status</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {escolasFiltradas.map((escola) => (
              <tr key={escola.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-800">{escola.nome}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{escola.distrito}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{escola.inep || '-'}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{escola.diretor}</td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                    {escola.status}
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-3">
                    <button onClick={() => handleEditEscola(escola)} className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEscolaParaExcluir(escola)} className="text-slate-400 hover:text-red-600 transition" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NovaEscolaModal
        isOpen={isNovaEscolaModalOpen}
        onClose={() => {
          setIsNovaEscolaModalOpen(false);
          setEscolaParaEditar(null);
        }}
        onSave={handleSaveEscola}
        escolaParaEditar={escolaParaEditar}
      />

      <ConfirmActionModal
        isOpen={!!escolaParaExcluir}
        onClose={() => setEscolaParaExcluir(null)}
        onConfirm={confirmDeleteEscola}
        title="Excluir Escola"
        message={
          <>
            Tem certeza que deseja excluir a escola <strong>{escolaParaExcluir?.nome}</strong>? Esta ação não pode ser desfeita.
          </>
        }
      />
    </>
  );
}
