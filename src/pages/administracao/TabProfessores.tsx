import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, MapPin, Building2, User, Mail, Phone, ArrowLeft, GraduationCap, Users, Hash, ChevronRight } from 'lucide-react';
import NovoProfessorModal from '../../components/NovoProfessorModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import GerenciarAlocacoesModal from '../../components/GerenciarAlocacoesModal';
import { formatCpfObscured } from '../../utils/formatters';

export default function TabProfessores() {
  const { user } = useAuth();
  const [buscaProfessor, setBuscaProfessor] = useState('');
  const [isNovoProfessorModalOpen, setIsNovoProfessorModalOpen] = useState(false);
  const [professorParaEditar, setProfessorParaEditar] = useState<any>(null);
  const [professorParaExcluir, setProfessorParaExcluir] = useState<any>(null);
  const [isAlocacoesModalOpen, setIsAlocacoesModalOpen] = useState(false);
  const [professorParaAlocar, setProfessorParaAlocar] = useState<any>(null);

  const [professores, setProfessores] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchProfessores(), fetchEscolas()]);
    setLoading(false);
  };

  const fetchEscolas = async () => {
    const { data, error } = await supabase
      .from('escolas')
      .select('id, nome')
      .order('nome');
    
    if (data) setEscolas(data);
  };

  const fetchProfessores = async () => {
    const { data, error } = await supabase
      .from('professores')
      .select('*, professor_alocacoes(id, escola_id, turno, escolas(nome))')
      .order('nome');
      
    if (error) {
      console.error("Erro ao carregar professores e alocações:", error);
    }
    
    if (data) {
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

  // Contagem de professores por escola (considerando alocações)
  const getProfessorCount = (escolaId: string) => {
    return professores.filter(p => 
      p.professor_alocacoes?.some((aloc: any) => aloc.escola_id === escolaId)
    ).length;
  };

  const escolasFiltradas = escolas.filter(e => 
    e.nome.toLowerCase().includes(buscaProfessor.toLowerCase())
  );

  const professoresDaEscola = selectedEscola 
    ? professores.filter(p => 
        p.professor_alocacoes?.some((aloc: any) => aloc.escola_id === selectedEscola.id) &&
        (p.nome.toLowerCase().includes(buscaProfessor.toLowerCase()) ||
         (p.cpf && p.cpf.includes(buscaProfessor)) ||
         (p.email && p.email.toLowerCase().includes(buscaProfessor.toLowerCase())))
      )
    : [];

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header Dinâmico */}
      {!selectedEscola ? (
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Gerenciamento de Professores
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Selecione uma escola para gerenciar seu corpo docente.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={buscaProfessor}
                onChange={(e) => setBuscaProfessor(e.target.value)}
                placeholder="Filtrar escolas..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50 transition-all font-medium"
              />
            </div>
            {['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user?.role || '') && (
              <button
                onClick={() => {
                  setProfessorParaEditar(null);
                  setIsNovoProfessorModalOpen(true);
                }}
                className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/10 shrink-0 h-[38px]"
              >
                <Plus className="w-4 h-4" />
                Novo Professor
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Banner Azul (Estilo Referência) */}
          <div className="bg-blue-600 p-8 pt-10 pb-12 relative overflow-hidden shrink-0">
            {/* Background Icon Decor */}
            <Users className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 pointer-events-none rotate-12" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => {
                    setSelectedEscola(null);
                    setBuscaProfessor('');
                  }}
                  className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-white/80" />
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase">PROFESSORES</h1>
                  </div>
                  <p className="text-blue-100/80 text-sm mt-1 font-semibold italic">
                    {selectedEscola.nome}
                  </p>
                </div>
              </div>
              
              <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-lg">
                <span className="text-[10px] font-black text-blue-100 uppercase tracking-tighter">PROFESSORES</span>
                <span className="text-3xl font-black text-white leading-none mt-1">
                  {professoresDaEscola.length.toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de Pesquisa e Botão (Estilo Referência) */}
          <div className="px-8 -mt-6 relative z-20">
            <div className="bg-white p-5 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  IDENTIFICAÇÃO DO PROFESSOR
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={buscaProfessor}
                    onChange={(e) => setBuscaProfessor(e.target.value)}
                    placeholder="Nome, CPF ou E-mail..."
                    className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 bg-slate-50/30 transition-all font-medium"
                  />
                </div>
              </div>
              
              {['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user?.role || '') && (
                <button 
                  onClick={() => {
                    setProfessorParaEditar(null);
                    setIsNovoProfessorModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95 whitespace-nowrap h-[54px]"
                >
                  Novo Professor
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Dinâmico */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {!selectedEscola ? (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 tracking-tight">
              {escolasFiltradas.map((escola) => {
                const count = getProfessorCount(escola.id);
                return (
                  <button
                    key={escola.id}
                    onClick={() => {
                      setSelectedEscola(escola);
                      setBuscaProfessor('');
                    }}
                    className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Building2 className="w-16 h-16 text-blue-900" />
                    </div>
                    
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                      <Building2 className="w-6 h-6" />
                    </div>
                    
                    <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2 group-hover:text-blue-700 transition-colors pr-10">
                      {escola.nome}
                    </h3>
                    
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Professores</span>
                        <span className="text-2xl font-black text-slate-700 tabular-nums">
                          {count.toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
              {professoresDaEscola.length > 0 ? (
                professoresDaEscola.map((professor) => {
                  const alocacaoNaEscola = professor.professor_alocacoes?.find((aloc: any) => aloc.escola_id === selectedEscola.id);
                  return (
                    <div 
                      key={professor.id} 
                      className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-5 text-left hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    >
                      {/* Actions (Top Right) */}
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0 duration-300 z-10">
                        <button 
                          onClick={() => {
                            setProfessorParaAlocar(professor);
                            setIsAlocacoesModalOpen(true);
                          }} 
                          className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-emerald-600 shadow-sm border border-slate-100 rounded-lg transition-colors"
                          title="Gerenciar Lotacão"
                        >
                          <MapPin className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditProfessor(professor)}
                          className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-blue-600 shadow-sm border border-slate-100 rounded-lg transition-colors"
                          title="Editar Professor"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setProfessorParaExcluir(professor)}
                          className="p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-600 shadow-sm border border-slate-100 rounded-lg transition-colors"
                          title="Excluir Professor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>


                      {/* Avatar and Main Info */}
                      <div className="flex items-start gap-4 mb-5">
                        <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-blue-600/20 shrink-0 transform -rotate-3 group-hover:rotate-0 transition-transform duration-300">
                          {professor.nome.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-black text-slate-800 text-lg leading-[1.1] group-hover:text-blue-700 transition-colors break-words tracking-tight">
                              {professor.nome}
                            </h4>
                          </div>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="space-y-2 mb-4 text-slate-500">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-500 tabular-nums">CPF: {formatCpfObscured(professor.cpf)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] font-medium truncate max-w-[140px]">{professor.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-[11px] font-bold text-slate-600">{professor.telefone}</span>
                        </div>
                      </div>

                      {/* Bottom Info Section */}
                      <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-400">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GraduationCap className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest truncate">{professor.vinculo}</span>
                          </div>
                          
                          {alocacaoNaEscola && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100/50">
                              <span className="text-[9px] font-black uppercase tracking-widest leading-none">
                                {alocacaoNaEscola.turno}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0 ${
                          professor.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          {professor.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                  <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium italic">Nenhum professor lotado nesta unidade.</p>
                </div>
              )}
            </div>
          </div>
        )}
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

      <GerenciarAlocacoesModal
        isOpen={isAlocacoesModalOpen}
        onClose={() => setIsAlocacoesModalOpen(false)}
        professor={professorParaAlocar}
        onAlocacoesChanged={fetchInitialData}
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
    </div>
  );
}

