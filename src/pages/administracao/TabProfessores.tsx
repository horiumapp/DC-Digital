import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import NovoProfessorModal from '../../components/NovoProfessorModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import { formatCpfObscured } from '../../utils/formatters';

export default function TabProfessores() {
  const { user } = useAuth();
  const [buscaProfessor, setBuscaProfessor] = useState('');
  const [isNovoProfessorModalOpen, setIsNovoProfessorModalOpen] = useState(false);
  const [professorParaEditar, setProfessorParaEditar] = useState<any>(null);
  const [professorParaExcluir, setProfessorParaExcluir] = useState<any>(null);

  const [professores, setProfessores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfessores();
  }, []);

  const fetchProfessores = async () => {
    const { data, error } = await supabase
      .from('professores')
      .select('*')
      .order('nome');
      
    if (!error && data) {
      setProfessores(data);
    }
    setLoading(false);
  };

  const handleSaveProfessor = async (novoProfessor: any) => {
    if (professorParaEditar) {
      const { error } = await supabase
        .from('professores')
        .update({
          nome: novoProfessor.nome,
          email: novoProfessor.email,
          cpf: novoProfessor.cpf,
          telefone: novoProfessor.telefone,
          vinculo: novoProfessor.vinculo,
          status: novoProfessor.status
        })
        .eq('id', professorParaEditar.id);

      if (error) {
        console.error("Erro ao atualizar:", error);
        alert("Erro ao atualizar professor: " + error.message);
      } else {
        fetchProfessores();
        setProfessorParaEditar(null);
        setIsNovoProfessorModalOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('professores')
        .insert([{
          nome: novoProfessor.nome,
          email: novoProfessor.email,
          cpf: novoProfessor.cpf,
          telefone: novoProfessor.telefone,
          vinculo: novoProfessor.vinculo,
          status: novoProfessor.status
        }]);

      if (error) {
        console.error("Erro ao inserir:", error);
        alert("Erro ao criar professor: " + error.message);
      } else {
        fetchProfessores();
        setProfessorParaEditar(null);
        setIsNovoProfessorModalOpen(false);
      }
    }
  };

  const handleEditProfessor = (professor: any) => {
    setProfessorParaEditar(professor);
    setIsNovoProfessorModalOpen(true);
  };

  const confirmDeleteProfessor = async () => {
    if (professorParaExcluir) {
      const { error } = await supabase
        .from('professores')
        .delete()
        .eq('id', professorParaExcluir.id);

      if (error) {
        console.error("Erro ao deletar:", error);
        alert("Erro ao deletar professor: " + error.message);
      } else {
        fetchProfessores();
        setProfessorParaExcluir(null);
      }
    }
  };

  const professoresFiltrados = professores.filter(p =>
    p.nome.toLowerCase().includes(buscaProfessor.toLowerCase()) ||
    (p.cpf && p.cpf.includes(buscaProfessor)) ||
    (p.email && p.email.toLowerCase().includes(buscaProfessor.toLowerCase()))
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
            value={buscaProfessor}
            onChange={(e) => setBuscaProfessor(e.target.value)}
            placeholder="Buscar professores..."
            className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
          />
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => {
              setProfessorParaEditar(null);
              setIsNovoProfessorModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Professor
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Nome do Professor</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">E-mail</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">CPF</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Telefone</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Vínculo</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Status</th>
              {user?.role === 'ADMIN' && (
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {professoresFiltrados.map((professor) => (
              <tr key={professor.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-800">{professor.nome}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{professor.email}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{formatCpfObscured(professor.cpf)}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{professor.telefone}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{professor.vinculo}</td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${professor.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                    {professor.status}
                  </span>
                </td>
                {user?.role === 'ADMIN' && (
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleEditProfessor(professor)} className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setProfessorParaExcluir(professor)} className="text-slate-400 hover:text-red-600 transition" title="Excluir">
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

      <NovoProfessorModal
        isOpen={isNovoProfessorModalOpen}
        onClose={() => {
          setIsNovoProfessorModalOpen(false);
          setProfessorParaEditar(null);
        }}
        onSave={handleSaveProfessor}
        professorParaEditar={professorParaEditar}
      />

      <ConfirmActionModal
        isOpen={!!professorParaExcluir}
        onClose={() => setProfessorParaExcluir(null)}
        onConfirm={confirmDeleteProfessor}
        title="Excluir Professor"
        message={
          <>
            Tem certeza que deseja excluir o(a) professor(a) <strong>{professorParaExcluir?.nome}</strong>? Esta ação não pode ser desfeita.
          </>
        }
      />
    </>
  );
}
