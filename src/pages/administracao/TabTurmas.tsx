import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, Building2, MapPin, User, Hash, ChevronRight, GraduationCap, Users, Clock, ArrowLeft } from 'lucide-react';
import NovaTurmaModal from '../../components/NovaTurmaModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';

import { useToast } from '../../components/common/Toast';

export default function TabTurmas() {
  const { user } = useAuth();
  const { showError } = useToast();
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

  async function fetchInitialData() {
    setLoading(true);
    await Promise.all([
      fetchEscolas(),
      fetchTurmas()
    ]);
    setLoading(false);
  };

  async function fetchEscolas() {
    const { data: escolasData } = await supabase
      .from('escolas')
      .select('id, nome, logo_url')
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

  async function fetchTurmas() {
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
        showError("Erro ao editar turma: " + error.message);
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
        showError("Erro ao criar turma: " + error.message);
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
        showError("Erro ao deletar turma: " + error.message);
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

  // Agrupar turmas por turno para melhor visualização
  const turmasPorTurno = turmasFiltradas.reduce((acc: Record<string, any[]>, t) => {
    const turno = t.turno || 'Não Definido';
    if (!acc[turno]) acc[turno] = [];
    acc[turno].push(t);
    return acc;
  }, {});

  const ordensTurno = ['Manhã', 'Tarde', 'Noite', 'Integral'];
  const turnosOrdenados = Object.keys(turmasPorTurno).sort((a, b) => {
    return ordensTurno.indexOf(a) - ordensTurno.indexOf(b);
  });

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#0f2851] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium tracking-tight">Preparando ambiente de turmas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header Condicional */}
      {!selectedEscola ? (
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Gerenciamento de Turmas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Selecione uma escola para gerenciar suas turmas e horários.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={buscaTurma}
              onChange={(e) => setBuscaTurma(e.target.value)}
              placeholder="Filtrar escolas..."
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2851] focus:border-[#0f2851] bg-slate-50/50 font-bold text-[#0f2851]"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Banner Azul (Estilo Referência) */}
          <div className="bg-[#0f2851] p-8 pt-10 pb-12 relative overflow-hidden">
            {/* Background Icon Decor */}
            <Users className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 pointer-events-none rotate-12" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => setSelectedEscola(null)}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <Users className="w-6 h-6 text-white/80" />
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase">TURMAS</h1>
                  </div>
                  <p className="text-blue-100/80 text-sm mt-1 font-semibold italic">
                    Quais turmas desta unidade precisam de atenção?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Logo da Escola */}
                {selectedEscola.logo_url && (
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 flex items-center justify-center overflow-hidden group hover:bg-white transition-all duration-300 shadow-2xl">
                    <img 
                      src={(/^https?:\/\//.test(selectedEscola.logo_url) || selectedEscola.logo_url.startsWith('data:image/')) ? selectedEscola.logo_url : ''} 
                      alt="Logo Escola" 
                      className="max-w-full max-h-full object-contain filter drop-shadow-md" 
                    />
                  </div>
                )}
                
                <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-lg">
                  <span className="text-[10px] font-black text-blue-100 uppercase tracking-tighter">TURMAS</span>
                  <span className="text-3xl font-black text-white leading-none mt-1">
                    {turmasFiltradas.length.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Pesquisa e Botão (Estilo Referência) */}
          <div className="px-8 -mt-6 relative z-20">
            <div className="bg-white p-5 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  IDENTIFICAÇÃO DA TURMA
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={buscaTurma}
                    onChange={(e) => setBuscaTurma(e.target.value)}
                    placeholder="Ex: 1º Ano A"
                    className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] bg-slate-50/30 transition-all font-bold text-[#0f2851]"
                  />
                </div>
              </div>
              
              {user?.role === 'ADMIN' && (
                <button 
                  onClick={() => {
                    setTurmaParaEditar(null);
                    setIsNovaTurmaModalOpen(true);
                  }}
                  className="bg-[#0f2851] hover:bg-[#1a3a6d] text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-[#0f2851]/20 active:scale-95 whitespace-nowrap h-[54px]"
                >
                  Adicionar Turma
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0">
        {!selectedEscola ? (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {escolas.filter(e => e.nome.toLowerCase().includes(buscaTurma.toLowerCase())).map((escola) => (
                <button
                  key={escola.id}
                  onClick={() => setSelectedEscola(escola)}
                  className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                >
                  {/* Logo (Top Right) */}
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    {escola.logo_url ? (
                      <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                        <img 
                          src={(/^https?:\/\//.test(escola.logo_url) || escola.logo_url.startsWith('data:image/')) ? escola.logo_url : ''} 
                          alt="Logo" 
                          className="max-w-full max-h-full object-contain" 
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 opacity-20">
                        <Building2 className="w-8 h-8 text-[#0f2851]" />
                      </div>
                    )}
                  </div>
                  
                  <div className="w-12 h-12 bg-[#eef2ff] text-[#0f2851] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#0f2851] group-hover:text-white transition-colors duration-300">
                    <Building2 className="w-6 h-6" />
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2 group-hover:text-[#0f2851] transition-colors">
                    {escola.nome}
                  </h3>
                  
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Turmas</span>
                      <span className="text-2xl font-black text-slate-700 tabular-nums">
                        {escola.turmasCount.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-[#eef2ff] group-hover:text-[#0f2851] transition-colors">
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
          <div className="p-8 pt-10 space-y-12">
            {turnosOrdenados.length > 0 ? (
              turnosOrdenados.map((turno) => (
                <div key={turno} className="space-y-6">
                  <div className="flex items-center gap-4 px-2">
                    <h3 className="text-[10px] font-black text-[#0f2851] uppercase tracking-[0.2em] bg-[#eef2ff] px-3 py-1.5 rounded-lg border border-blue-100/50">
                      TURNO: {turno}
                    </h3>
                    <div className="h-px bg-slate-100 flex-1" />
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                      {turmasPorTurno[turno].length} TURMA(S)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {turmasPorTurno[turno].map((turma) => (
                      <div 
                        key={turma.id} 
                        className="group bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col relative"
                      >
                        {/* Botões de Ação (Hover Only) */}
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditTurma(turma)}
                            className="p-2 bg-slate-50 text-slate-400 hover:text-[#0f2851] hover:bg-[#eef2ff] rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setTurmaParaExcluir(turma)}
                            className="p-2 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 bg-[#eef2ff] text-[#0f2851] rounded-xl flex items-center justify-center font-bold text-lg">
                            {turma.nome.charAt(0)}
                          </div>
                          <h4 className="font-bold text-slate-800 text-xl tracking-tight leading-tight">
                            {turma.nome}
                          </h4>
                        </div>

                        <div className="space-y-3 mb-6">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Users className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium">{turma.turno}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <GraduationCap className="w-4 h-4 text-slate-400" />
                            <span className="text-sm font-medium">Ano Letivo: {turma.ano_letivo}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-500 font-medium italic">
                  Nenhuma turma cadastrada nesta unidade ou encontrada na busca.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}
