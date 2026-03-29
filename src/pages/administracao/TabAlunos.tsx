import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import NovoAlunoModal from '../../components/NovoAlunoModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import { formatCpfObscured } from '../../utils/formatters';

export default function TabAlunos() {
  const { user } = useAuth();
  const [buscaAluno, setBuscaAluno] = useState('');
  const [isNovoAlunoModalOpen, setIsNovoAlunoModalOpen] = useState(false);
  const [alunoParaEditar, setAlunoParaEditar] = useState<any>(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<any>(null);
  const [alunos, setAlunos] = useState<any[]>([]);

  useEffect(() => {
    fetchAlunos();
  }, []);

  const fetchAlunos = async () => {
    const { data, error } = await supabase
      .from('alunos')
      .select('*, escolas(nome), turmas(nome, turno)')
      .order('nome');
      
    if (!error && data) {
      setAlunos(data);
    }
  };

  const handleSaveAluno = async (novoAluno: any) => {
    if (alunoParaEditar) {
      const { error } = await supabase
        .from('alunos')
        .update({
          escola_id: novoAluno.escola_id,
          turma_id: novoAluno.turma_id,
          nome: novoAluno.nome,
          data_nascimento: novoAluno.data_nascimento,
          cpf: novoAluno.cpf,
          sexo: novoAluno.sexo,
          nome_responsavel: novoAluno.nome_responsavel,
          telefone: novoAluno.telefone,
          endereco: novoAluno.endereco,
          status: novoAluno.status
        })
        .eq('id', alunoParaEditar.id);

      if (error) alert("Erro ao editar aluno: " + error.message);
      else {
        fetchAlunos();
        setAlunoParaEditar(null);
        setIsNovoAlunoModalOpen(false);
      }
    } else {
      const { error } = await supabase
        .from('alunos')
        .insert([{
          escola_id: novoAluno.escola_id,
          turma_id: novoAluno.turma_id,
          nome: novoAluno.nome,
          data_nascimento: novoAluno.data_nascimento,
          cpf: novoAluno.cpf,
          sexo: novoAluno.sexo,
          nome_responsavel: novoAluno.nome_responsavel,
          telefone: novoAluno.telefone,
          endereco: novoAluno.endereco,
          status: novoAluno.status
        }]);

      if (error) alert("Erro ao criar aluno: " + error.message);
      else {
        fetchAlunos();
        setAlunoParaEditar(null);
        setIsNovoAlunoModalOpen(false);
      }
    }
  };

  const handleEditAluno = (aluno: any) => {
    setAlunoParaEditar(aluno);
    setIsNovoAlunoModalOpen(true);
  };

  const confirmDeleteAluno = async () => {
    if (alunoParaExcluir) {
      const { error } = await supabase
        .from('alunos')
        .delete()
        .eq('id', alunoParaExcluir.id);

      if (error) alert("Erro ao excluir aluno: " + error.message);
      else {
        fetchAlunos();
        setAlunoParaExcluir(null);
      }
    }
  };

  const alunosFiltrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(buscaAluno.toLowerCase()) ||
    (a.cpf && a.cpf.includes(buscaAluno)) ||
    (a.nome_responsavel && a.nome_responsavel.toLowerCase().includes(buscaAluno.toLowerCase())) ||
    (a.escolas?.nome && a.escolas.nome.toLowerCase().includes(buscaAluno.toLowerCase())) ||
    (a.turmas?.nome && a.turmas.nome.toLowerCase().includes(buscaAluno.toLowerCase()))
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
            value={buscaAluno}
            onChange={(e) => setBuscaAluno(e.target.value)}
            placeholder="Buscar alunos..."
            className="block w-full pl-11 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-white"
          />
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => {
              setAlunoParaEditar(null);
              setIsNovoAlunoModalOpen(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Aluno
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Aluno</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Matrícula (Turma/Escola)</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Responsável / Contato</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Status</th>
              {user?.role === 'ADMIN' && (
                <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500">Ações</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {alunosFiltrados.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-bold text-slate-800">{aluno.nome}</div>
                  <div className="text-xs text-slate-500 mt-0.5">CPF: {aluno.cpf ? formatCpfObscured(aluno.cpf) : 'Não informado'}</div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                    {aluno.turmas?.nome || 'Sem Turma'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{aluno.escolas?.nome || 'Sem Escola'}</div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="text-sm text-slate-700">{aluno.nome_responsavel}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{aluno.telefone}</div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${(aluno.status || 'Ativo') === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {aluno.status || 'Ativo'}
                  </span>
                </td>
                {user?.role === 'ADMIN' && (
                  <td className="px-6 py-5 whitespace-nowrap text-right text-sm">
                    <div className="flex items-center justify-end gap-3">
                      <button onClick={() => handleEditAluno(aluno)} className="text-slate-400 hover:text-blue-600 transition" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setAlunoParaExcluir(aluno)} className="text-slate-400 hover:text-red-600 transition" title="Excluir">
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

      <NovoAlunoModal
        isOpen={isNovoAlunoModalOpen}
        onClose={() => {
          setIsNovoAlunoModalOpen(false);
          setAlunoParaEditar(null);
        }}
        onSave={handleSaveAluno}
        alunoParaEditar={alunoParaEditar}
      />

      <ConfirmActionModal
        isOpen={!!alunoParaExcluir}
        onClose={() => setAlunoParaExcluir(null)}
        onConfirm={confirmDeleteAluno}
        title="Excluir Aluno"
        message={
          <>
            Tem certeza que deseja excluir o(a) aluno(a) <strong>{alunoParaExcluir?.nome}</strong>? Esta ação não pode ser desfeita.
          </>
        }
      />
    </>
  );
}
