import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, MapPin, Building2, User, Mail, Phone, ArrowLeft, GraduationCap, Users, Hash, ChevronRight, Calendar, Clock, LayoutGrid } from 'lucide-react';
import NovoProfessorModal from '../../components/NovoProfessorModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import GerenciarAlocacoesModal from '../../components/GerenciarAlocacoesModal';
import ScheduleModal from '../../components/ScheduleModal';
import { formatCpfObscured } from '../../utils/formatters';

const DEPARTAMENTOS = ['Geral', 'BIOLÓGICAS', 'HUMANAS', 'EXATAS', 'LINGUAGENS'];
const DISCIPLINAS = [
  'ARTES', 'BIOLOGIA', 'EDUCAÇÃO FÍSICA', 'ENFAS CIENTE', 'ENFAS HUMANAS',
  'ENFAS LINGUAGEM', 'ENFAS MATEMÁTICA', 'FILOSOFIA', 'FÍSICA', 'GEOGRAFIA',
  'HISTÓRIA', 'INFORMÁTICA', 'INGLÊS', 'JURÍDICO', 'LMAT', 'LPT',
  'MATEMÁTICA', 'PORTUGUÊS', 'QUÍMICA', 'SOCIOLOGIA'
];

export default function TabProfessores() {
  const { user } = useAuth();
  const [buscaProfessor, setBuscaProfessor] = useState('');
  const [isNovoProfessorModalOpen, setIsNovoProfessorModalOpen] = useState(false);
  const [professorParaEditar, setProfessorParaEditar] = useState<any>(null);
  const [professorParaExcluir, setProfessorParaExcluir] = useState<any>(null);
  const [isAlocacoesModalOpen, setIsAlocacoesModalOpen] = useState(false);
  const [professorParaAlocar, setProfessorParaAlocar] = useState<any>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [professorParaHorario, setProfessorParaHorario] = useState<any>(null);

  const [professores, setProfessores] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Estado para o formulário inline
  const [inlineFormData, setInlineFormData] = useState({
    nome: '',
    departamento: 'Geral',
    disciplinas: [] as string[]
  });

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
      .select('*, professor_alocacoes(id, escola_id, turno, escolas(nome)), professor_horarios(id, escola_id)')
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
    const professorData = {
      nome: novoProfessor.nome,
      email: novoProfessor.email,
      cpf: novoProfessor.cpf,
      telefone: novoProfessor.telefone,
      vinculo: novoProfessor.vinculo,
      status: novoProfessor.status,
      departamento: novoProfessor.departamento,
      disciplinas: novoProfessor.disciplinas
    };

    if (professorParaEditar) {
      const { error } = await supabase
        .from('professores')
        .update(professorData)
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
      // Limpa chaves vazias para não conflitar com constraints UNIQUE (tipo cpf vazio)
      const dataToInsert = { ...professorData };
      if (!dataToInsert.cpf) dataToInsert.cpf = null;
      if (!dataToInsert.email) dataToInsert.email = null;

      const { data: newProfList, error } = await supabase
        .from('professores')
        .insert([dataToInsert])
        .select();

      if (error) {
        console.error("Erro ao inserir:", error);
        alert("Erro ao criar professor: " + error.message);
      } else {
        const newProf = newProfList?.[0];
        // Se existe uma escola selecionada, alocamos ele automaticamente nela!
        if (selectedEscola && newProf) {
          const { error: alocError } = await supabase
            .from('professor_alocacoes')
            .insert({
               professor_id: newProf.id,
               escola_id: selectedEscola.id,
               turno: 'Manhã'
            });
          if (alocError) console.error("Erro ao alocar:", alocError);
        }

        fetchProfessores();
        setProfessorParaEditar(null);
        setIsNovoProfessorModalOpen(false);
        // Limpar form inline
        setInlineFormData({ nome: '', departamento: 'Geral', disciplinas: [] });
      }
    }
  };

  const handleInlineSubmit = () => {
    if (!inlineFormData.nome) {
      alert("Por favor, informe o nome do professor.");
      return;
    }
    
    // O email PRECISA ser previsível para que a coordenação saiba qual email o professor vai usar para criar a conta depois.
    const emailPrevisivel = `${inlineFormData.nome.toLowerCase().replace(/\s+/g, '.')}@escola.com`;

    handleSaveProfessor({
      ...inlineFormData,
      email: emailPrevisivel,
      cpf: '',
      telefone: '',
      status: 'Ativo',
      vinculo: 'Efetivo'
    });
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

  const getProfessorCount = (escolaId: string) => {
    return professores.filter(p => 
      p.professor_alocacoes?.some((aloc: any) => aloc.escola_id === escolaId)
    ).length;
  };

  const toggleDisciplinaInline = (disc: string) => {
    setInlineFormData(prev => ({
      ...prev,
      disciplinas: prev.disciplinas.includes(disc)
        ? prev.disciplinas.filter(d => d !== disc)
        : [...prev.disciplinas, disc]
    }));
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
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Header */}
      {!selectedEscola ? (
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4 bg-white shrink-0">
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
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2851] focus:border-[#0f2851] bg-slate-50/50 transition-all font-medium"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col shrink-0">
          {/* Banner */}
          <div className="bg-[#0f2851] p-8 relative overflow-hidden">
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
                  <p className="text-blue-100/80 text-sm mt-1 font-bold italic">
                    Cadastre o corpo docente e suas especialidades.
                  </p>
                </div>
              </div>
              <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px]">
                <span className="text-[10px] font-black text-blue-100 uppercase tracking-tighter">PROFESSORES</span>
                <span className="text-3xl font-black text-white leading-none mt-1">
                  {professoresDaEscola.length.toString().padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Form Inline (Image 1 style) */}
          <div className="px-8 -mt-6 relative z-20 mb-6">
            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NOME DO PROFESSOR</label>
                  <input
                    type="text"
                    value={inlineFormData.nome}
                    onChange={(e) => setInlineFormData({...inlineFormData, nome: e.target.value})}
                    placeholder="Nome Completo"
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] bg-slate-50/30 transition-all font-bold text-[#0f2851]"
                  />
                </div>
                {/* Departamento */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DEPARTAMENTO / ÁREA</label>
                  <select
                    value={inlineFormData.departamento}
                    onChange={(e) => setInlineFormData({...inlineFormData, departamento: e.target.value})}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] bg-slate-50/30 transition-all font-bold text-[#0f2851] appearance-none"
                  >
                    {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Disciplinas */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DISCIPLINAS QUE ESTE PROFESSOR MINISTRA</label>
                <div className="flex flex-wrap gap-2">
                  {DISCIPLINAS.slice(0, 15).map(disc => { // Limitando para não ocupar muito espaço
                    const isSelected = inlineFormData.disciplinas.includes(disc);
                    return (
                      <button
                        key={disc}
                        onClick={() => toggleDisciplinaInline(disc)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider transition-all border ${
                          isSelected 
                            ? 'bg-[#0f2851] border-[#0f2851] text-white shadow-md' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-[#0f2851]/30'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#eef2ff]'}`} />
                        {disc}
                      </button>
                    );
                  })}
                  <button className="text-[9px] font-bold text-[#0f2851] uppercase hover:underline ml-2">Ver todas...</button>
                </div>
              </div>

              {/* Botão */}
              <button 
                onClick={handleInlineSubmit}
                className="w-full bg-[#0f2851] hover:bg-[#1a3a6d] text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all shadow-lg shadow-[#0f2851]/20 active:scale-[0.98]"
              >
                Cadastrar Professor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8 pt-0">
        {!selectedEscola ? (
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
                  <div className="w-12 h-12 bg-[#eef2ff] text-[#0f2851] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#0f2851] group-hover:text-white transition-colors duration-300">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2 group-hover:text-[#0f2851] transition-colors pr-10">{escola.nome}</h3>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Professores</span>
                      <span className="text-2xl font-black text-slate-700 tabular-nums">{count.toString().padStart(2, '0')}</span>
                    </div>
                    <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-[#eef2ff] group-hover:text-[#0f2851] transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-8">
            {professoresDaEscola.length > 0 ? (
              professoresDaEscola.map((professor) => (
                <div 
                  key={professor.id} 
                  className="group bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col"
                >
                  {/* Top: Avatar and Info */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-[#eef2ff] text-[#0f2851] rounded-full flex items-center justify-center font-bold text-xl border-4 border-white shadow-sm ring-1 ring-blue-50">
                      {professor.nome.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 text-base uppercase tracking-tight truncate leading-tight">{professor.nome}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{professor.departamento || 'GERAL'}</p>
                    </div>
                  </div>

                  {/* Actions (Image 1 row style) */}
                  <div className="bg-slate-50/50 rounded-xl p-2 flex items-center justify-between mb-6 border border-slate-100 shadow-inner">
                    <button 
                      onClick={() => {
                        setProfessorParaAlocar(professor);
                        setIsAlocacoesModalOpen(true);
                      }}
                      className="p-2.5 text-slate-400 hover:text-blue-600 bg-white rounded-lg shadow-sm border border-slate-100 flex-1 flex justify-center transition-colors"
                      title="Gerenciar Escolas / Alocações"
                    >
                      <Building2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button 
                      onClick={() => {
                        setProfessorParaHorario(professor);
                        setIsScheduleModalOpen(true);
                      }}
                      className="p-2.5 text-slate-400 hover:text-emerald-600 bg-white rounded-lg shadow-sm border border-slate-100 flex-1 flex justify-center transition-colors"
                      title="Horário"
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button 
                      onClick={() => handleEditProfessor(professor)}
                      className="p-2.5 text-slate-400 hover:text-blue-600 bg-white rounded-lg shadow-sm border border-slate-100 flex-1 flex justify-center transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1" />
                    <button 
                      onClick={() => setProfessorParaExcluir(professor)}
                      className="p-2.5 text-slate-400 hover:text-red-500 bg-white rounded-lg shadow-sm border border-slate-100 flex-1 flex justify-center transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Bottom: Disciplinas and Aulas */}
                  <div className="mt-auto flex items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-1">
                      {professor.disciplinas?.slice(0, 2).map((d: string) => (
                        <span key={d} className="px-2 py-0.5 bg-[#eef2ff] text-[#0f2851] rounded text-[8px] font-bold uppercase tracking-tighter">
                          {d.slice(0, 4)}
                        </span>
                      ))}
                      {(professor.disciplinas?.length > 2) && (
                        <span className="text-[8px] font-bold text-slate-400">+{professor.disciplinas.length - 2}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
                        {professor.professor_horarios?.filter((h: any) => h.escola_id === selectedEscola.id).length || 0} AULAS
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium italic">Nenhum professor lotado nesta unidade.</p>
              </div>
            )}
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

      <ScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => {
          setIsScheduleModalOpen(false);
          fetchProfessores();
        }}
        professorId={professorParaHorario?.id}
        escolaId={selectedEscola?.id}
      />

      <ConfirmActionModal
        isOpen={!!professorParaExcluir}
        onClose={() => setProfessorParaExcluir(null)}
        onConfirm={confirmDeleteProfessor}
        title="Excluir Professor"
        message={<>Tem certeza que deseja excluir o(a) professor(a) <strong>{professorParaExcluir?.nome}</strong>? Esta ação não pode ser desfeita.</>}
      />
    </div>
  );
}

