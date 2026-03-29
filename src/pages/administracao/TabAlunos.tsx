import React, { useState } from 'react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import NovoAlunoModal from '../../components/NovoAlunoModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import { formatCpfObscured } from '../../utils/formatters';

export default function TabAlunos() {
  const [buscaAluno, setBuscaAluno] = useState('');
  const [isNovoAlunoModalOpen, setIsNovoAlunoModalOpen] = useState(false);
  const [alunoParaEditar, setAlunoParaEditar] = useState<any>(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<any>(null);

  const [alunos, setAlunos] = useState([
    { id: 1, nome: 'João da Silva', dataNascimento: '2010-05-15', cpf: '123.456.789-00', sexo: 'Masculino', nomeResponsavel: 'Maria da Silva', telefone: '(92) 99999-9999', endereco: 'Rua das Flores, 123, Centro', status: 'Ativo' },
    { id: 2, nome: 'Ana Maria Souza', dataNascimento: '2011-08-22', cpf: '', sexo: 'Feminino', nomeResponsavel: 'José Souza', telefone: '(92) 98888-8888', endereco: 'Av. Principal, 456, Bairro Novo', status: 'Ativo' }
  ]);

  const handleSaveAluno = (novoAluno: any) => {
    if (alunoParaEditar) {
      const alunosAtualizados = alunos.map((a) =>
        a.id === alunoParaEditar.id ? { ...a, ...novoAluno } : a
      );
      setAlunos(alunosAtualizados);
    } else {
      const newId = alunos.length > 0 ? Math.max(...alunos.map((a) => a.id)) + 1 : 1;
      setAlunos([...alunos, { id: newId, ...novoAluno }]);
    }
    setAlunoParaEditar(null);
  };

  const handleEditAluno = (aluno: any) => {
    setAlunoParaEditar(aluno);
    setIsNovoAlunoModalOpen(true);
  };

  const confirmDeleteAluno = () => {
    if (alunoParaExcluir) {
      setAlunos(alunos.filter((a) => a.id !== alunoParaExcluir.id));
      setAlunoParaExcluir(null);
    }
  };

  const alunosFiltrados = alunos.filter(a =>
    a.nome.toLowerCase().includes(buscaAluno.toLowerCase()) ||
    (a.cpf && a.cpf.includes(buscaAluno)) ||
    (a.nomeResponsavel && a.nomeResponsavel.toLowerCase().includes(buscaAluno.toLowerCase()))
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
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-white">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Nome do Aluno</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Responsável</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Telefone</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">CPF</th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-slate-500">Status</th>
              <th scope="col" className="px-6 py-4 text-right text-xs font-bold text-slate-500">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {alunosFiltrados.map((aluno) => (
              <tr key={aluno.id} className="hover:bg-slate-50/50 transition">
                <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-800">{aluno.nome}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{aluno.nomeResponsavel}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{aluno.telefone}</td>
                <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-500">{aluno.cpf ? formatCpfObscured(aluno.cpf) : '-'}</td>
                <td className="px-6 py-5 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${(aluno.status || 'Ativo') === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {aluno.status || 'Ativo'}
                  </span>
                </td>
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
