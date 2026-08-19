import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Edit2, Trash2, Building2, Users, GraduationCap, ChevronRight, ArrowLeft } from 'lucide-react';
import NovoAlunoModal from '../../components/NovoAlunoModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import { formatMatricula, getMatriculaLogin, formatCpfObscured, gerarSenhaTemporaria } from '../../utils/formatters';

import { useToast } from '../../components/common/Toast';

const ALUNO_EMAIL_DOMAIN = 'aluno.dcdigital.local';

export interface AlunoRow {
  id: string;
  nome: string;
  cpf?: string;
  turma_id: string;
  escola_id?: string;
  data_nascimento?: string;
  sexo?: string;
  nome_responsavel?: string;
  telefone?: string;
  endereco?: string;
  status?: string;
  turmas?: { nome: string; turno?: string };
  escolas?: { nome: string };
}

export interface EscolaItem {
  id: string;
  nome: string;
  logo_url?: string;
  alunosCount?: number;
}

export interface TurmaItem {
  id: string;
  nome: string;
  escola_id: string;
  turno?: string;
}

export default function TabAlunos() {
  const { user } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();
  const [busca, setBusca] = useState('');
  const [isNovoAlunoModalOpen, setIsNovoAlunoModalOpen] = useState(false);
  const [alunoParaEditar, setAlunoParaEditar] = useState<AlunoRow | null>(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<AlunoRow | null>(null);
  const [alunos, setAlunos] = useState<AlunoRow[]>([]);
  const [escolas, setEscolas] = useState<EscolaItem[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<EscolaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTurmas, setExpandedTurmas] = useState<Set<string>>(new Set());
  const [todasTurmas, setTodasTurmas] = useState<TurmaItem[]>([]);

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carregar turmas da escola selecionada
  useEffect(() => {
    if (selectedEscola) {
      fetchTodasTurmas(selectedEscola.id);
    }
  }, [selectedEscola]);

  async function fetchTodasTurmas(escolaId: string) {
    const { data, error: _error } = await supabase
      .from('turmas')
      .select('*')
      .eq('escola_id', escolaId)
      .order('nome');
    
    if (data) setTodasTurmas(data);
  }

  // Auto-selecionar escola se for Gestor ou Secretário
  useEffect(() => {
    if ((user?.role === 'GESTOR' || user?.role === 'SECRETARIO') && user.escola_id && escolas.length > 0 && !selectedEscola) {
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

  const handleSaveAluno = async (novoAluno: { escola_id: string; turma_id: string; nome: string; dataNascimento?: string; data_nascimento?: string; cpf?: string; sexo?: string; nomeResponsavel?: string; nome_responsavel?: string; telefone?: string; status?: string; endereco?: string }) => {
    const alunoData = {
      escola_id: novoAluno.escola_id,
      turma_id: novoAluno.turma_id,
      nome: novoAluno.nome,
      data_nascimento: novoAluno.dataNascimento || novoAluno.data_nascimento,
      cpf: novoAluno.cpf,
      sexo: novoAluno.sexo,
      nome_responsavel: novoAluno.nomeResponsavel || novoAluno.nome_responsavel,
      telefone: novoAluno.telefone,
      endereco: novoAluno.endereco,
      status: novoAluno.status || 'Ativo'
    };

    if (alunoParaEditar) {
      const { error } = await supabase
        .from('alunos')
        .update(alunoData)
        .eq('id', alunoParaEditar.id);

      if (error) {
        showError("Erro ao editar aluno: " + error.message);
      } else {
        // Sincronizar escola_id na tabela usuarios (para transferências)
        if (novoAluno.cpf) {
          const cpfDigits = getMatriculaLogin(novoAluno.cpf);
          const pseudoEmail = `${cpfDigits}@${ALUNO_EMAIL_DOMAIN}`;
          await supabase
            .from('usuarios')
            .update({ escola_id: novoAluno.escola_id })
            .eq('email', pseudoEmail);
        }
        
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
        console.error("Erro ao criar aluno:", error);
        showError("Erro ao criar aluno. Verifique se os dados são válidos e tente novamente.");
      } else {
        const newAluno = newAlunoList?.[0];
        
        // Criar conta de acesso para o aluno usando CPF como pseudo-email
        if (newAluno && novoAluno.escola_id && novoAluno.cpf) {
          const cpfDigits = getMatriculaLogin(novoAluno.cpf);
          const pseudoEmail = `${cpfDigits}@${ALUNO_EMAIL_DOMAIN}`;
          
          try {
            // FIX C2: senha temporária aleatória forte — nunca mais "Aluno2026"
            const senhaTemporaria = gerarSenhaTemporaria();
            const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
              body: {
                nome: novoAluno.nome,
                email: pseudoEmail,
                senha: senhaTemporaria,
                cargo: 'ALUNO',
                escola_id: novoAluno.escola_id,
              },
            });

            if (authError || authData?.error) {
              const msg = authData?.error || authError?.message || 'Erro desconhecido';
              showWarning(`Aluno cadastrado, mas não foi possível criar a conta de acesso: ${msg}`);
            } else {
              showSuccess(`Aluno ${novoAluno.nome} cadastrado! Matrícula (CPF): ${formatMatricula(newAluno.id, novoAluno.cpf)} | Senha: ${senhaTemporaria}`);
            }
          } catch (err: unknown) {
            console.error("Erro ao criar conta de acesso do aluno:", err);
            showWarning('Aluno cadastrado, mas houve um erro ao criar a conta de acesso.');
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

  const handleEditAluno = (aluno: AlunoRow) => {
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
        // Revogar conta Auth correspondente se o aluno tiver CPF
        if (alunoParaExcluir.cpf) {
          const cpfDigits = getMatriculaLogin(alunoParaExcluir.cpf);
          const pseudoEmail = `${cpfDigits}@${ALUNO_EMAIL_DOMAIN}`;
          try {
            await supabase.functions.invoke('admin-create-user', {
              body: { action: 'delete-user', email: pseudoEmail },
            });
          } catch (e) {
            console.warn('Erro ao remover conta Auth do aluno excluído:', e);
          }
        }

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

  // Agrupar alunos por turma e turno
  const alunosAgrupados = alunosDaEscola.reduce((acc: Record<string, { id: string; nome: string; turno: string; alunos: AlunoRow[] }>, a) => {
    const turmaKey = a.turma_id || 'sem-turma';
    if (!acc[turmaKey]) {
      acc[turmaKey] = {
        id: turmaKey,
        nome: a.turmas?.nome || 'Sem Turma',
        turno: a.turmas?.turno || 'N/A',
        alunos: []
      };
    }
    acc[turmaKey].alunos.push(a);
    return acc;
  }, {});

  const _turmasComAlunos = Object.values(alunosAgrupados).sort((a, b) => {
    if (a.id === 'sem-turma') return 1;
    if (b.id === 'sem-turma') return -1;
    return a.nome.localeCompare(b.nome);
  });

  // Agrupar turmas por turno para o acordeão
  const turnosOrdenados = ['MANHÃ', 'TARDE', 'NOITE', 'INTEGRAL'];
  const turmasPorTurno = todasTurmas.reduce((acc: Record<string, TurmaItem[]>, t) => {
    const turno = t.turno?.toUpperCase() || 'N/A';
    if (!acc[turno]) acc[turno] = [];
    acc[turno].push(t);
    return acc;
  }, {});

  const toggleTurma = (id: string) => {
    const newSet = new Set(expandedTurmas);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedTurmas(newSet);
  };

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
                  className={`p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 ${
                    (user?.role === 'GESTOR' || user?.role === 'SECRETARIO') ? 'hidden' : ''
                  }`}
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
                <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl p-2.5 flex flex-col items-center justify-center min-w-[70px] shadow-lg">
                  <span className="text-[7px] font-black text-blue-100 uppercase tracking-tighter">ALUNOS</span>
                  <span className="text-xl font-black text-white leading-none mt-1">
                    {alunosDaEscola.length.toString().padStart(2, '0')}
                  </span>
                </div>

                {selectedEscola.logo_url && (
                  <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 flex items-center justify-center overflow-hidden group hover:bg-white transition-all duration-300 shadow-2xl">
                    <img 
                      src={(/^https?:\/\//.test(selectedEscola.logo_url) || selectedEscola.logo_url.startsWith('data:image/') || selectedEscola.logo_url.startsWith('/')) ? selectedEscola.logo_url : undefined} 
                      alt="Logo Escola" 
                      className="max-w-full max-h-full object-contain filter drop-shadow-md" 
                    />
                  </div>
                )}
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
                      <img 
                        src={(/^https?:\/\//.test(escola.logo_url) || escola.logo_url.startsWith('data:image/') || escola.logo_url.startsWith('/')) ? escola.logo_url : undefined} 
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
                
                <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2 group-hover:text-[#0f2851] transition-colors pr-10">
                  {escola.nome}
                </h3>
                
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Alunos</span>
                    <span className="text-2xl font-black text-slate-700 tabular-nums">
                      {(escola.alunosCount || 0).toString().padStart(2, '0')}
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
          <div className="space-y-12 pb-12">
            {turnosOrdenados.map((turno) => {
              const turmasDoTurno = turmasPorTurno[turno] || [];
              if (turmasDoTurno.length === 0 && turno !== 'N/A') return null;
              
              return (
                <div key={turno} className="space-y-6">
                  {/* Cabeçalho do Turno */}
                  <div className="flex items-center gap-4 px-2">
                    <h3 className="text-[10px] font-black text-[#0f2851] uppercase tracking-[0.2em] bg-[#eef2ff] px-3 py-1.5 rounded-lg border border-blue-100/50">
                      TURNO: {turno}
                    </h3>
                    <div className="flex-1 h-px bg-slate-200/60" />
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {turmasDoTurno.map((turma) => {
                      const alunosDaTurma = alunosAgrupados[turma.id]?.alunos || [];
                      const isExpanded = expandedTurmas.has(turma.id);

                      return (
                        <div key={turma.id} className="space-y-4">
                          {/* Card da Turma (Acordeão) */}
                          <button
                            onClick={() => toggleTurma(turma.id)}
                            className={`w-full flex items-center justify-between p-4 bg-white border rounded-2xl transition-all hover:shadow-md ${
                              isExpanded ? 'border-blue-200 shadow-sm ring-1 ring-blue-50' : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                isExpanded ? 'bg-[#0f2851] text-white' : 'bg-slate-50 text-slate-400'
                              }`}>
                                <Users className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <h4 className="font-black text-[#0f2851] text-sm uppercase tracking-wider">{turma.nome}</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                  {turno} • {alunosDaTurma.length.toString().padStart(2, '0')} Alunos
                                </p>
                              </div>
                            </div>
                            <div className={`p-2 rounded-lg transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-blue-50 text-blue-600' : 'text-slate-300'}`}>
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </button>

                          {/* Lista de Alunos (Expandível) */}
                          {isExpanded && (
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in slide-in-from-top-2 duration-200">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-slate-100 bg-slate-50/50">
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Nº</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Aluno</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {alunosDaTurma.length > 0 ? (
                                      alunosDaTurma.map((aluno: AlunoRow, index: number) => (
                                        <tr key={aluno.id} className="hover:bg-slate-50/50 transition-colors group">
                                          <td className="px-6 py-4 text-xs font-black text-slate-300 tabular-nums">
                                            {(index + 1).toString().padStart(2, '0')}
                                          </td>
                                          <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 bg-[#eef2ff] text-[#0f2851] rounded-full flex items-center justify-center font-bold text-xs border border-blue-100 shrink-0">
                                                {aluno.nome.charAt(0)}
                                              </div>
                                              <div className="flex flex-col min-w-0">
                                                <span className="font-bold text-slate-700 text-sm truncate max-w-[250px]" title={aluno.nome}>
                                                  {aluno.nome}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 tabular-nums uppercase tracking-tight">
                                                  {/* FIX H4: mascarar CPF na listagem (LGPD) */}
                                                  MATRÍCULA: {aluno.cpf ? formatCpfObscured(aluno.cpf) : 'CPF Pendente'}
                                                </span>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <span className="text-xs text-slate-500 font-medium truncate max-w-[150px] block" title={aluno.nome_responsavel}>
                                              {aluno.nome_responsavel || '---'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4">
                                            <span className="text-xs text-slate-500 font-medium tabular-nums">
                                              {aluno.telefone || '---'}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                              aluno.status === 'Ativo' 
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                                : 'bg-slate-50 text-slate-400 border border-slate-100'
                                            }`}>
                                              {aluno.status}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                              <button 
                                                onClick={() => handleEditAluno(aluno)}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="Editar"
                                              >
                                                <Edit2 className="w-4 h-4" />
                                              </button>
                                              <button 
                                                onClick={() => setAlunoParaExcluir(aluno)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Excluir"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic text-sm">
                                          Nenhum aluno matriculado nesta turma.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Seção Alunos Sem Turma (Opcional) */}
            {alunosAgrupados['sem-turma'] && (
              <div className="space-y-6 mt-12">
                <div className="flex items-center gap-4 px-2">
                  <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em] bg-red-50 px-3 py-1.5 rounded-lg border border-red-100/50">
                    PENDENTES: ALUNOS SEM TURMA
                  </h3>
                  <div className="flex-1 h-px bg-red-100" />
                </div>
                <div className="bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-red-50 bg-red-50/30">
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Nº</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Aluno</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {alunosAgrupados['sem-turma'].alunos.map((aluno: AlunoRow, index: number) => (
                          <tr key={aluno.id} className="hover:bg-red-50/30 transition-colors group">
                            <td className="px-6 py-4 text-xs font-black text-slate-300 tabular-nums">
                              {(index + 1).toString().padStart(2, '0')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-red-50 text-red-400 rounded-full flex items-center justify-center font-bold text-xs border border-red-100 shrink-0">
                                  {aluno.nome.charAt(0)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-700 text-sm truncate max-w-[250px]" title={aluno.nome}>
                                    {aluno.nome}
                                  </span>
                                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-tight">
                                    ⚠ SEM TURMA ATRIBUÍDA
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500 font-medium truncate max-w-[150px] block" title={aluno.nome_responsavel}>
                                {aluno.nome_responsavel || '---'}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs text-slate-500 font-medium tabular-nums">
                                {aluno.telefone || '---'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                aluno.status === 'Ativo' 
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                  : 'bg-slate-50 text-slate-400 border border-slate-100'
                              }`}>
                                {aluno.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <button 
                                  onClick={() => handleEditAluno(aluno)}
                                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar e atribuir turma"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setAlunoParaExcluir(aluno)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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
