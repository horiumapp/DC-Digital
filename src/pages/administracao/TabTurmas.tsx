import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, Building2, ArrowLeft, GraduationCap, Users, ChevronRight } from 'lucide-react';
import NovaTurmaModal from '../../components/NovaTurmaModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';

export default function TabTurmas() {
  const { user } = useAuth();
  const [buscaTurma, setBuscaTurma] = useState('');
  const [isNovaTurmaModalOpen, setIsNovaTurmaModalOpen] = useState(false);
  const [turmaParaEditar, setTurmaParaEditar] = useState<any>(null);
  const [turmaParaExcluir, setTurmaParaExcluir] = useState<any>(null);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([
      fetchEscolas(),
      fetchTurmas()
    ]);
    setLoading(false);
  };

  const fetchEscolas = async () => {
    const { data: escolasData } = await supabase
      .from('escolas')
      .select('id, nome')
      .eq('status', 'Ativa')
      .order('nome');

    if (escolasData) {
      // Para cada escola, vamos contar as turmas (poderia ser feito via SQL join complexo, mas para simplicidade aqui...)
      const { data: countsData } = await supabase
        .from('turmas')
        .select('escola_id');
      
      const counts: Record<string, number> = {};
      countsData?.forEach(t => {
        counts[t.escola_id] = (counts[t.escola_id] || 0) + 1;
      });

      const processed = escolasData.map(e => ({
        ...e,
        turmasCount: counts[e.id] || 0
      }));
      
      setEscolas(processed);
    }
  };

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

  const turmasFiltradas = turmas.filter(t => {
    const matchesBusca = 
      t.nome.toLowerCase().includes(buscaTurma.toLowerCase()) ||
      t.turno.toLowerCase().includes(buscaTurma.toLowerCase()) ||
      (t.escolas?.nome && t.escolas.nome.toLowerCase().includes(buscaTurma.toLowerCase()));
    
    // Se houver uma escola selecionada, o filtro de escola é obrigatório
    const matchesEscola = selectedEscola ? t.escola_id === selectedEscola.id : true;
    
    return matchesBusca && matchesEscola;
  });

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium">Carregando dados...</p>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4">
        <div className="flex items-center gap-4">
          {selectedEscola && (
            <button 
              onClick={() => setSelectedEscola(null)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
              title="Voltar para escolas"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {selectedEscola ? (
                <>
                  <Building2 className="w-5 h-5 text-blue-600" />
                  {selectedEscola.nome}
                </>
              ) : (
                'Gerenciamento de Turmas'
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selectedEscola 
                ? `Listando ${turmasFiltradas.length} turmas desta unidade`
                : 'Selecione uma escola para gerenciar suas turmas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={buscaTurma}
              onChange={(e) => setBuscaTurma(e.target.value)}
              placeholder="Filtro rápido..."
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50 transition-all"
            />
          </div>
          {user?.role === 'ADMIN' && selectedEscola && (
            <button 
              onClick={() => {
                setTurmaParaEditar(null);
                setIsNovaTurmaModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              Nova Turma
            </button>
          )}
        </div>
      </div>

      {!selectedEscola ? (
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {escolas.filter(e => e.nome.toLowerCase().includes(buscaTurma.toLowerCase())).map((escola) => (
              <button
                key={escola.id}
                onClick={() => setSelectedEscola(escola)}
                className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 className="w-16 h-16 text-blue-900" />
                </div>
                
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Building2 className="w-6 h-6" />
                </div>
                
                <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2 group-hover:text-blue-700 transition-colors">
                  {escola.nome}
                </h3>
                
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Turmas</span>
                    <span className="text-2xl font-black text-slate-700 tabular-nums">
                      {escola.turmasCount.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          {escolas.length === 0 && (
            <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-slate-500 font-medium">Nenhuma escola ativa para gerenciar turmas.</h3>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50/50">
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
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">{turma.escolas?.nome || 'N/A'}</span>
                  </div>
                </td>
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
      )}

      <NovaTurmaModal
        isOpen={isNovaTurmaModalOpen}
        onClose={() => {
          setIsNovaTurmaModalOpen(false);
          setTurmaParaEditar(null);
        }}
        onSave={(data) => {
          handleSaveTurma(data);
          fetchEscolas(); // Atualiza a contagem nos cards se necessário em background
        }}
        turmaParaEditar={turmaParaEditar}
        fixedEscolaId={selectedEscola?.id}
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
