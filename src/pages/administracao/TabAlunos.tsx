import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, Users, Building2 } from 'lucide-react';
import { formatMatricula } from '../../utils/formatters';
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

      <div className="flex-1 overflow-hidden bg-white border-t border-slate-100">
        <div className="overflow-x-auto h-full scrollbar-thin scrollbar-thumb-slate-200">
          <table className="min-w-full divide-y divide-slate-100 border-separate border-spacing-0">
            <thead className="bg-slate-50/80 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Cód./Matrícula</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Aluno</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Unidade / Turma</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Responsável</th>
                <th scope="col" className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Data Cadastro</th>
                <th scope="col" className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                {user?.role === 'ADMIN' && (
                  <th scope="col" className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 bg-white">
              {alunosFiltrados.map((aluno) => (
                <tr key={aluno.id} className="group hover:bg-blue-50/30 transition-colors duration-150">
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className="text-slate-400 font-medium tabular-nums px-3 py-1 bg-slate-100 rounded-lg text-xs">
                      {formatMatricula(aluno.id)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-bold text-xs border border-blue-100/50 group-hover:bg-blue-600 group-hover:text-white transition-all">
                        {aluno.nome.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{aluno.nome}</p>
                        <p className="text-[10px] text-slate-400 font-medium">CPF: {aluno.cpf ? formatCpfObscured(aluno.cpf) : '---'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-slate-300" />
                        <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">{aluno.escolas?.nome || 'N/D'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Users className="w-3 h-3 text-blue-300" />
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">{aluno.turmas?.nome || 'SEM TURMA'}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <p className="text-xs font-semibold text-slate-600 truncate max-w-[180px]">{aluno.nome_responsavel || '---'}</p>
                    <p className="text-[10px] text-slate-400 tabular-nums">{aluno.telefone || '---'}</p>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap">
                    <span className="text-xs font-medium text-slate-500 tabular-nums">
                      {aluno.created_at ? new Date(aluno.created_at).toLocaleDateString('pt-BR') : '---'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${
                      (aluno.status || 'Ativo') === 'Ativo' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      {aluno.status || 'Ativo'}
                    </span>
                  </td>
                  {user?.role === 'ADMIN' && (
                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditAluno(aluno)} 
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setAlunoParaExcluir(aluno)} 
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {alunosFiltrados.length === 0 && (
            <div className="py-20 text-center">
              <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium italic">Nenhum aluno encontrado para sua busca.</p>
            </div>
          )}
        </div>
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
