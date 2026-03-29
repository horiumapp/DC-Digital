import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import NovaTurmaModal from '../../components/NovaTurmaModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';

export default function TabTurmas() {
  const { user } = useAuth();
  const [buscaTurma, setBuscaTurma] = useState('');
  const [isNovaTurmaModalOpen, setIsNovaTurmaModalOpen] = useState(false);
  const [turmaParaEditar, setTurmaParaEditar] = useState<any>(null);
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<any>(null);
  const [turmas, setTurmas] = useState<any[]>([]);

  useEffect(() => {
    fetchTurmas();
  }, []);

  const fetchTurmas = async () => {
    const { data, error } = await supabase
      .from('turmas')
      .select('*, escolas(nome)')
      .order('nome');
      
    if (!error && data) {
      setTurmas(data);
    }
  };

  const handleSaveTurma = async (novaTurma: any) => {
    if (turmaParaEditar) {
      const { error } = await supabase
        .from('turmas')
        .update({
          escola_id: novaTurma.escola_id,
          nome: novaTurma.nome,
          turno: novaTurma.turno,
          ano_letivo: novaTurma.ano_letivo
        })
        .eq('id', turmaParaEditar.id);

      if (error) {
        alert("Erro ao editar turma: " + error.message);
      } else {
        fetchTurmas();
        setTurmaParaEditar(null);
        setIsNovaTurmaModalOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('turmas')
        .insert([{
          escola_id: novaTurma.escola_id,
          nome: novaTurma.nome,
          turno: novaTurma.turno,
          ano_letivo: novaTurma.ano_letivo
        }]);

      if (error) {
        alert("Erro ao criar turma: " + error.message);
      } else {
        fetchTurmas();
        setTurmaParaEditar(null);
        setIsNovaTurmaModalOpen(false);
      }
    }
  };

  const handleEditTurma = (turma: any) => {
    setTurmaParaEditar(turma);
    setIsNovaTurmaModalOpen(true);
  };

  const confirmDeleteTurma = async () => {
    if (turmaParaExcluir) {
      const { error } = await supabase
        .from('turmas')
        .delete()
        .eq('id', turmaParaExcluir.id);

      if (error) {
        alert("Erro ao deletar turma: " + error.message);
      } else {
        fetchTurmas();
        setTurmaParaExcluir(null);
      }
    }
  };

  const turmasFiltradas = turmas.filter(t =>
    t.nome.toLowerCase().includes(buscaTurma.toLowerCase()) ||
    t.turno.toLowerCase().includes(buscaTurma.toLowerCase()) ||
    (t.escolas?.nome && t.escolas.nome.toLowerCase().includes(buscaTurma.toLowerCase()))
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
        {user?.role === 'ADMIN' && (
          <button 
            onClick={() => {
              setTurmaParaEditar(null);
              setIsNovaTurmaModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Nova Turma
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Escola</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Nome da Turma</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Turno</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Ano Letivo</th>
              {user?.role === 'ADMIN' && (
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {turmasFiltradas.map((turma) => (
              <tr key={turma.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{turma.escolas?.nome || 'N/A'}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-800">{turma.nome}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{turma.turno}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{turma.ano_letivo}</td>
                {user?.role === 'ADMIN' && (
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleEditTurma(turma)} className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setTurmaParaExcluir(turma)} className="text-slate-400 hover:text-red-600 transition" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <NovaTurmaModal
        isOpen={isNovaTurmaModalOpen}
        onClose={() => {
          setIsNovaTurmaModalOpen(false);
          setTurmaParaEditar(null);
        }}
        onSave={handleSaveTurma}
        turmaParaEditar={turmaParaEditar}
      />

      <ConfirmActionModal
        isOpen={!!turmaParaExcluir}
        onClose={() => setTurmaParaExcluir(null)}
        onConfirm={confirmDeleteTurma}
        title="Excluir Turma"
        message={
          <>
            Tem certeza que deseja excluir a turma <strong>{turmaParaExcluir?.nome}</strong> da escola <strong>{turmaParaExcluir?.escolas?.nome || 'N/A'}</strong>? Esta ação não pode ser desfeita.
          </>
        }
      />
    </>
  );
}
