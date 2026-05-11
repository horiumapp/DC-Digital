import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, Building2, ArrowLeft, GraduationCap, Users, ChevronRight, User, Phone, MapPin, Calendar } from 'lucide-react';
import NovoAlunoModal from '../../components/NovoAlunoModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import { formatMatricula, getMatriculaLogin, formatCpfObscured } from '../../utils/formatters';

import { useToast } from '../../components/common/Toast';

const ALUNO_EMAIL_DOMAIN = 'aluno.dcdigital.local';
const ALUNO_SENHA_PADRAO = 'Aluno2026';

export default function TabAlunos() {
  const { user } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [busca, setBusca] = useState('');
  const [isNovoAlunoModalOpen, setIsNovoAlunoModalOpen] = useState(false);
  const [alunoParaEditar, setAlunoParaEditar] = useState<any>(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<any>(null);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [escolas, setEscolas] = useState<any[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Auto-selecionar escola se for Gestor
  useEffect(() => {
    if (user?.role === 'GESTOR' && user.escola_id && escolas.length > 0 && !selectedEscola) {
      const minhaEscola = escolas.find(e => e.id === user.escola_id);
      if (minhaEscola) {
        setSelectedEscola(minhaEscola);
      }
    }
  }, [user, escolas, selectedEscola]);

  async function fetchInitialData() {
    setLoading(true);
    await Promise.all([
      fetchEscolas(),
      fetchAlunos()
    ]);
    setLoading(false);
  }

  async function fetchEscolas() {
    const { data: escolasData, error } = await supabase
      .from('escolas')
      .select('id, nome, logo_url')
      .eq('status', 'Ativa')
      .order('nome');

    if (error) {
      console.error('Erro ao carregar escolas:', error);
      showError('Não foi possível carregar a lista de escolas.');
      return;
    }

    if (escolasData) {
      // Contar alunos por escola
      const { data: countsData } = await supabase
        .from('alunos')
        .select('escola_id');
      
      const counts: Record<string, number> = {};
      countsData?.forEach(a => {
        counts[a.escola_id] = (counts[a.escola_id] || 0) + 1;
      });

      const processed = escolasData.map(e => ({
        ...e,
        alunosCount: counts[e.id] || 0
      }));
      
      setEscolas(processed);
    }
  }

  async function fetchAlunos() {
    const { data, error } = await supabase
      .from('alunos')
      .select('*, escolas(nome), turmas(nome, turno)')
      .order('nome');
      
    if (error) {
      console.error("Erro ao carregar alunos:", error);
    }
    
    if (data) {
      setAlunos(data);
    }
  }

  const handleSaveAluno = async (novoAluno: any) => {
    const alunoData = {
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
    };

    if (alunoParaEditar) {
      const { error } = await supabase
        .from('alunos')
        .update(alunoData)
        .eq('id', alunoParaEditar.id);

      if (error) {
        showError("Erro ao editar aluno: " + error.message);
      } else {
        fetchAlunos();
        fetchEscolas();
        setAlunoParaEditar(null);
        setIsNovoAlunoModalOpen(false);
        showSuccess("Dados do aluno atualizados com sucesso!");
      }
    } else {
      const { data: newAlunoList, error } = await supabase
        .from('alunos')
        .insert([alunoData])
        .select();

      if (error) {
        showError("Erro ao criar aluno: " + error.message);
      } else {
        const newAluno = newAlunoList?.[0];
        
        // Criar conta de acesso para o aluno usando CPF como pseudo-email
        if (newAluno && novoAluno.escola_id && novoAluno.cpf) {
          const cpfDigits = getMatriculaLogin(novoAluno.cpf);
          const pseudoEmail = `${cpfDigits}@${ALUNO_EMAIL_DOMAIN}`;
          
          try {
            const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
              body: {
                nome: novoAluno.nome,
                email: pseudoEmail,
                senha: ALUNO_SENHA_PADRAO,
                cargo: 'ALUNO',
                escola_id: novoAluno.escola_id,
              },
            });

            if (authError || authData?.error) {
              const msg = authData?.error || authError?.message || 'Erro desconhecido';
              showWarning(`Aluno cadastrado, mas não foi possível criar a conta de acesso: ${msg}`);
            } else {
              showSuccess(`Aluno ${novoAluno.nome} cadastrado! Matrícula (CPF): ${formatMatricula(newAluno.id, novoAluno.cpf)} | Senha: ${ALUNO_SENHA_PADRAO}`);
            }
          } catch (err: any) {
            showWarning(`Aluno cadastrado, mas erro ao criar conta: ${err.message}`);
          }
        } else if (newAluno) {
          showSuccess(`Aluno ${novoAluno.nome} cadastrado! CPF não informado — a conta de acesso será criada quando o CPF for adicionado.`);
        }

        fetchAlunos();
        fetchEscolas();
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

      if (error) {
        showError("Erro ao excluir aluno: " + error.message);
      } else {
        fetchAlunos();
        fetchEscolas();
        setAlunoParaExcluir(null);
        showSuccess("Aluno excluído com sucesso!");
      }
    }
  };

  const escolasFiltradas = escolas.filter(e => 
    e.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const alunosDaEscola = selectedEscola 
    ? alunos.filter(a => 
        a.escola_id === selectedEscola.id &&
        (a.nome.toLowerCase().includes(busca.toLowerCase()) ||
         (a.cpf && a.cpf.includes(busca)) ||
         (a.nome_responsavel && a.nome_responsavel.toLowerCase().includes(busca.toLowerCase())) ||
         (a.turmas?.nome && a.turmas.nome.toLowerCase().includes(busca.toLowerCase())))
      )
    : [];

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#0f2851] border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-500 font-medium tracking-tight">Carregando dados dos alunos...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Header Condicional */}
      {!selectedEscola ? (
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 gap-4 bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Gerenciamento de Alunos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Selecione uma escola para gerenciar os alunos matriculados.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar escolas..."
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0f2851] focus:border-[#0f2851] bg-slate-50/50 transition-all font-bold text-[#0f2851]"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col shrink-0">
          {/* Banner Azul */}
          <div className="bg-[#0f2851] p-8 pt-10 pb-12 relative overflow-hidden">
            <GraduationCap className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 pointer-events-none rotate-12" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => {
                    setSelectedEscola(null);
                    setBusca('');
                  }}
                  className={`p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 ${user?.role === 'GESTOR' ? 'hidden' : ''}`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-6 h-6 text-white/80" />
                    <h1 className="text-2xl font-black text-white tracking-widest uppercase">ALUNOS</h1>
                  </div>
                  <p className="text-blue-100/80 text-sm mt-1 font-bold italic">
                    Gerencie matrículas e informações dos estudantes.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {selectedEscola.logo_url && (
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 flex items-center justify-center overflow-hidden group hover:bg-white transition-all duration-300 shadow-2xl">
                    <img 
                      src={selectedEscola.logo_url} 
                      alt="Logo Escola" 
                      className="max-w-full max-h-full object-contain filter drop-shadow-md" 
                    />
                  </div>
                )}
                
                <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center min-w-[100px] shadow-lg">
                  <span className="text-[10px] font-black text-blue-100 uppercase tracking-tighter">ALUNOS</span>
                  <span className="text-3xl font-black text-white leading-none mt-1">
                    {alunosDaEscola.length.toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Pesquisa e Botão Novo Aluno */}
          <div className="px-8 -mt-6 relative z-20 mb-6">
            <div className="bg-white p-5 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 space-y-1.5 w-full">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                  BUSCAR ALUNO POR NOME, CPF OU RESPONSÁVEL
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Ex: João Silva ou 123.456..."
                    className="block w-full pl-12 pr-4 py-3.5 border border-slate-200 rounded-xl text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] bg-slate-50/30 transition-all font-bold text-[#0f2851]"
                  />
                </div>
              </div>
              
              {(user?.role === 'ADMIN' || user?.role === 'GESTOR' || user?.role === 'SECRETARIO') && (
                <button 
                  onClick={() => {
                    setAlunoParaEditar(null);
                    setIsNovoAlunoModalOpen(true);
                  }}
                  className="bg-[#0f2851] hover:bg-[#1a3a6d] text-white px-8 py-3.5 rounded-xl font-bold transition-all shadow-lg shadow-[#0f2851]/20 active:scale-95 whitespace-nowrap h-[54px]"
                >
                  Novo Aluno
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal */}
      <div className="flex-1 overflow-y-auto p-8 pt-0">
        {!selectedEscola ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 tracking-tight">
            {escolasFiltradas.map((escola) => (
              <button
                key={escola.id}
                onClick={() => {
                  setSelectedEscola(escola);
                  setBusca('');
                }}
                className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
              >
                {/* Logo (Top Right) */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  {escola.logo_url ? (
                    <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                      <img src={escola.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
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
                
                <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2 group-hover:text-[#0f2851] transition-colors pr-10">
                  {escola.nome}
                </h3>
                
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Alunos</span>
                    <span className="text-2xl font-black text-slate-700 tabular-nums">
                      {escola.alunosCount.toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-[#eef2ff] group-hover:text-[#0f2851] transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 pb-8">
            {alunosDaEscola.length > 0 ? (
              alunosDaEscola.map((aluno) => (
                <div 
                  key={aluno.id} 
                  className="group bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 flex flex-col"
                >
                  {/* Top: Avatar and Name */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-[#eef2ff] text-[#0f2851] rounded-full flex items-center justify-center font-bold text-xl border-4 border-white shadow-sm ring-1 ring-blue-50">
                      {aluno.nome.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-black text-slate-800 text-base uppercase tracking-tight truncate leading-tight">{aluno.nome}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {aluno.turmas?.nome || 'SEM TURMA'} - {aluno.turmas?.turno || 'N/A'}
                      </p>
                    </div>
                    <div className={`w-2.5 h-2.5 rounded-full ${aluno.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-300'}`} title={aluno.status} />
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 gap-3 mb-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-semibold truncate">Resp: {aluno.nome_responsavel || '---'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-medium tabular-nums">{aluno.telefone || '---'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-medium truncate">{aluno.endereco || '---'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-medium tabular-nums">Nasc: {aluno.data_nascimento ? new Date(aluno.data_nascimento).toLocaleDateString('pt-BR') : '---'}</span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula (CPF)</span>
                      <span className="text-[11px] font-black text-[#0f2851] tabular-nums">
                        {formatMatricula(aluno.id, aluno.cpf)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditAluno(aluno)}
                        className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setAlunoParaExcluir(aluno)}
                        className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <GraduationCap className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                <p className="text-slate-500 font-medium italic">Nenhum aluno encontrado para os critérios de busca.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <NovoAlunoModal
        isOpen={isNovoAlunoModalOpen}
        onClose={() => {
          setIsNovoAlunoModalOpen(false);
          setAlunoParaEditar(null);
        }}
        onSave={handleSaveAluno}
        alunoParaEditar={alunoParaEditar}
        fixedEscolaId={selectedEscola?.id}
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
    </div>
  );
}
