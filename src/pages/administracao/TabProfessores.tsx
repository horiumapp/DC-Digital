import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Trash2, Building2, User, ArrowLeft, Users, ChevronRight, Calendar, Clock, X, Download, Upload } from 'lucide-react';
import NovoProfessorModal, { type NovoProfessorFormData } from '../../components/NovoProfessorModal';
import ConfirmActionModal from '../../components/ConfirmActionModal';
import GerenciarAlocacoesModal from '../../components/GerenciarAlocacoesModal';
import ScheduleModal from '../../components/ScheduleModal';
import ImportCsvModal, { type PreviewColumn } from '../../components/common/ImportCsvModal';
import {
  exportProfessoresToCsv,
  getProfessoresTemplateCsv,
  parseProfessoresCsv,
  downloadCsvFile
} from '../../utils/csvImportExport';
import { gerarSenhaTemporaria } from '../../utils/formatters';

const DEPARTAMENTOS = ['Geral', 'BIOLÓGICAS', 'HUMANAS', 'EXATAS', 'LINGUAGENS'];
const DISCIPLINAS = [
  'Português', 'Matemática', 'Ciências', 'História', 'Geografia',
  'Artes', 'Educação Física', 'Inglês', 'Ensino Religioso'
];

import { useToast } from '../../components/common/Toast';
import { readAllRows } from '../../services/pagination';
import { getEscolaLogo } from '../../utils/escolaUtils';

export interface ProfessorRow {
  id: string;
  nome: string;
  email: string;
  cpf?: string;
  telefone?: string;
  vinculo?: string;
  status?: string;
  senha?: string;
  departamento?: string;
  disciplinas?: string[];
  usuario_id?: string;
  alocacoes_count?: number;
  professor_alocacoes?: { id?: string; escola_id: string; turno?: string; escolas?: { nome?: string } | { nome?: string }[] }[];
  professor_horarios?: { id?: string; escola_id?: string; dia_semana?: number }[];
}

export interface EscolaOption {
  id: string;
  nome: string;
  logo_url?: string;
}

export default function TabProfessores() {
  const { user } = useAuth();
  const { showError, showWarning, showSuccess } = useToast();
  const [buscaProfessor, setBuscaProfessor] = useState('');
  const [isNovoProfessorModalOpen, setIsNovoProfessorModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [professorParaEditar, setProfessorParaEditar] = useState<ProfessorRow | null>(null);
  const [professorParaExcluir, setProfessorParaExcluir] = useState<ProfessorRow | null>(null);
  const [isAlocacoesModalOpen, setIsAlocacoesModalOpen] = useState(false);
  const [professorParaAlocar, setProfessorParaAlocar] = useState<ProfessorRow | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [professorParaHorario, setProfessorParaHorario] = useState<ProfessorRow | null>(null);

  const [professores, setProfessores] = useState<ProfessorRow[]>([]);
  const [escolas, setEscolas] = useState<EscolaOption[]>([]);
  const [selectedEscola, setSelectedEscola] = useState<EscolaOption | null>(null);
  const [_loading, setLoading] = useState(true);

  // Estado para o formulário inline
  const [inlineFormData, setInlineFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    departamento: 'Geral',
    disciplinas: [] as string[]
  });
  
  const [novaDisciplinaInline, setNovaDisciplinaInline] = useState('');
  const [showNovaDisciplinaInline, setShowNovaDisciplinaInline] = useState(false);

  const handleAddCustomDisciplinaInline = () => {
    if (novaDisciplinaInline.trim() && !inlineFormData.disciplinas.includes(novaDisciplinaInline.trim())) {
      setInlineFormData(prev => ({
        ...prev,
        disciplinas: [...prev.disciplinas, novaDisciplinaInline.trim()]
      }));
      setNovaDisciplinaInline('');
      setShowNovaDisciplinaInline(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fase 2: Se o usuário é GESTOR ou SECRETARIO, auto-selecionar a escola dele
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
    await Promise.all([fetchProfessores(), fetchEscolas()]);
    setLoading(false);
  };

  async function fetchEscolas() {
    const { data, error } = await supabase
      .from('escolas')
      .select('id, nome, logo_url')
      .order('nome');
    
    // BUG-06 FIX: tratar erro silenciado anteriormente
    if (error) {
      console.error('Erro ao carregar escolas:', error);
      showError('Não foi possível carregar a lista de escolas.');
      return;
    }
    if (data) setEscolas(data);
  };

  async function fetchProfessores() {
    // SEC-04 FIX: especificar campos em vez de select('*') para evitar expor CPF e dados desnecessários
    try {
      const query = supabase
        .from('professores')
        .select('id, nome, email, status, departamento, disciplinas, vinculo, telefone, professor_alocacoes(id, escola_id, turno, escolas(nome)), professor_horarios(id, escola_id)')
        .order('nome');
        
      const { data } = await readAllRows<ProfessorRow>(query.order('id'));
      if (data) {
        setProfessores(data);
      }
    } catch (error) {
      console.error("Erro ao carregar professores e alocações:", error);
      showError("Não foi possível carregar a lista de professores.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfessor = async (novoProfessor: NovoProfessorFormData | ProfessorRow) => {
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
      const { data: updatedData, error } = await supabase
        .from('professores')
        .update(professorData)
        .eq('id', professorParaEditar.id)
        .select();

      if (error) {
        console.error("Erro ao atualizar:", error);
        showError("Erro ao atualizar professor: " + error.message);
      } else if (!updatedData || updatedData.length === 0) {
        showWarning("Nenhum registro foi atualizado. Verifique suas permissões.");
      } else {
        showSuccess(`Dados do(a) professor(a) ${novoProfessor.nome} atualizados com sucesso!`);
        fetchProfessores();
        setProfessorParaEditar(null);
        setIsNovoProfessorModalOpen(false);
      }
    } else {
      // Limpa chaves vazias para não conflitar com constraints UNIQUE (tipo cpf vazio)
      const dataToInsert: Record<string, string | null | string[] | undefined> = { ...professorData };
      if (!dataToInsert.cpf) dataToInsert.cpf = null;
      if (!dataToInsert.email) dataToInsert.email = null;

      const { data: newProfData, error: rpcError } = await supabase.rpc('criar_professor_com_alocacao', {
        p_nome: dataToInsert.nome,
        p_email: dataToInsert.email || null,
        p_telefone: dataToInsert.telefone || null,
        p_departamento: dataToInsert.departamento || 'Geral',
        p_disciplinas: dataToInsert.disciplinas || [],
        p_escola_id: selectedEscola?.id || null,
        p_turno: 'Manhã',
        p_cpf: dataToInsert.cpf || null,
        p_vinculo: (dataToInsert.vinculo as string) || 'Efetivo',
        p_status: (dataToInsert.status as string) || 'Ativo',
      });

      if (rpcError) {
        console.error("Erro ao inserir:", rpcError);
        showError("Erro ao criar professor: " + rpcError.message);
      } else {
        const _newProf = newProfData as unknown as ProfessorRow | null;

        // Fase 2: Se forneceu e-mail, criar conta de acesso via Edge Function
        if (novoProfessor.email && selectedEscola) {
          // FIX C2: senha temporária aleatória forte — nunca mais "@prof123"
          const senhaDeAcesso = novoProfessor.senha || gerarSenhaTemporaria();

          if (senhaDeAcesso.length >= 8) {
            try {
              const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
                body: {
                  nome: novoProfessor.nome,
                  email: novoProfessor.email.trim().toLowerCase(),
                  senha: senhaDeAcesso,
                  cargo: 'PROFESSOR',
                  escola_id: selectedEscola.id,
                },
              });

              if (authError || authData?.error) {
                let msg = authData?.error || authError?.message || 'Erro desconhecido';
                if (authData?.details) msg += ` - Detalhes: ${JSON.stringify(authData.details)}`;
                showWarning(`Professor cadastrado, mas não foi possível criar a conta de acesso: ${msg}`);
              } else {
                showSuccess(`Professor ${novoProfessor.nome} cadastrado com acesso! (Senha: ${senhaDeAcesso})`);
              }
            } catch (err: unknown) {
              console.error("Erro ao criar conta de acesso do professor:", err);
              showWarning('Professor cadastrado, mas houve um erro ao criar a conta de acesso.');
            }
          } else {
            showWarning('Professor cadastrado, mas a senha deve ter no mínimo 8 caracteres, incluindo letras e números, para criar conta de acesso.');
          }
        }

        fetchProfessores();
        setProfessorParaEditar(null);
        setIsNovoProfessorModalOpen(false);
        // Limpar form inline
        setInlineFormData({ nome: '', email: '', senha: '', departamento: 'Geral', disciplinas: [] });
      }
    }
  };

  const handleInlineSubmit = () => {
    if (!inlineFormData.nome) {
      showWarning("Por favor, informe o nome do professor.");
      return;
    }
    
    handleSaveProfessor({
      ...inlineFormData,
      email: inlineFormData.email || '',
      cpf: '',
      telefone: '',
      status: 'Ativo',
      vinculo: 'Efetivo'
    });
  };

  const handleEditProfessor = (professor: ProfessorRow) => {
    setProfessorParaEditar(professor);
    setIsNovoProfessorModalOpen(true);
  };

  const confirmDeleteProfessor = async () => {
    if (!professorParaExcluir) return;

    if (user?.role === 'ADMIN') {
      // ADMIN: Exclusão mestre do professor em todo o sistema
      // 1. Tenta RPC transacional no banco
      let deleteError: { message: string } | null = null;
      const { error: rpcErr } = await supabase.rpc('admin_excluir_professor', {
        p_professor_id: professorParaExcluir.id
      });

      if (rpcErr) {
        // Fallback resiliente: limpa explicitamente dependências de chave estrangeira
        await supabase.from('professor_horarios').delete().eq('professor_id', professorParaExcluir.id);
        await supabase.from('professor_alocacoes').delete().eq('professor_id', professorParaExcluir.id);
        const { error: fallbackErr } = await supabase
          .from('professores')
          .delete()
          .eq('id', professorParaExcluir.id);
        deleteError = fallbackErr;
      }

      if (deleteError) {
        console.error("Erro ao deletar:", deleteError);
        showError("Erro ao deletar professor: " + deleteError.message);
      } else {
        let authRemoved = true;
        // Revogar conta Auth correspondente se o professor tiver email cadastrado
        if (professorParaExcluir.email) {
          try {
            const { data: authData, error: authError } = await supabase.functions.invoke('admin-create-user', {
              body: { action: 'delete-user', email: professorParaExcluir.email.trim().toLowerCase() },
            });
            if (authError || authData?.error) {
              console.warn('Aviso ao remover conta Auth do professor:', authError || authData?.error);
              authRemoved = false;
              showWarning('Professor excluído do banco, mas a conta de autenticação requer remoção manual ou não existia.');
            }
          } catch (e) {
            console.warn('Erro ao remover conta Auth do professor excluído:', e);
            authRemoved = false;
            showWarning('Professor excluído do banco, mas houve falha ao remover a conta de autenticação.');
          }
        }

        fetchProfessores();
        setProfessorParaExcluir(null);
        if (authRemoved) {
          showSuccess("Professor excluído com sucesso do sistema!");
        }
      }
    } else if (selectedEscola?.id) {
      // NÃO-ADMIN (GESTOR / SECRETARIO): Remove a alocação e horários do professor apenas nesta escola
      // Preserva o cadastro global e os vínculos com outras escolas da rede municipal via RPC atômica
      const { error: rpcError } = await supabase.rpc('desvincular_professor_escola', {
        p_professor_id: professorParaExcluir.id,
        p_escola_id: selectedEscola.id,
      });

      if (rpcError) {
        console.error("Erro ao desvincular professor da escola:", rpcError);
        showError("Erro ao desvincular professor: " + rpcError.message);
        return;
      }

      fetchProfessores();
      setProfessorParaExcluir(null);
      showSuccess(`Professor(a) desvinculado(a) da unidade ${selectedEscola.nome} com sucesso!`);
    } else {
      showWarning("Selecione uma escola para desvincular o professor.");
    }
  };

  const getProfessorCount = (escolaId: string) => {
    return professores.filter(p => 
      p.professor_alocacoes?.some((aloc: { escola_id: string }) => aloc.escola_id === escolaId)
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
        p.professor_alocacoes?.some((aloc: { escola_id: string }) => aloc.escola_id === selectedEscola.id) &&
        (p.nome.toLowerCase().includes(buscaProfessor.toLowerCase()) ||
         (p.cpf && p.cpf.includes(buscaProfessor)) ||
         (p.email && p.email.toLowerCase().includes(buscaProfessor.toLowerCase())))
      )
    : [];

  const handleExportProfessores = () => {
    const listToExport = selectedEscola ? professoresDaEscola : professores;
    if (listToExport.length === 0) {
      showWarning('Nenhum professor disponível para exportar.');
      return;
    }
    const csvContent = exportProfessoresToCsv(listToExport);
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = selectedEscola
      ? `professores_${selectedEscola.nome.replace(/\s+/g, '_')}_${dateStr}.csv`
      : `professores_todos_${dateStr}.csv`;
    downloadCsvFile(csvContent, fileName);
    showSuccess(`Professores exportados com sucesso (${listToExport.length} registros)!`);
  };

  const handleSaveImportProfessores = async (items: Array<{
    nome: string;
    email: string;
    cpf?: string;
    telefone?: string;
    departamento: string;
    disciplinas: string[];
    vinculo: string;
    status: string;
  }>) => {
    const payload = items.map(p => ({
      nome: p.nome,
      email: p.email || null,
      cpf: p.cpf || null,
      telefone: p.telefone || null,
      departamento: p.departamento || 'Geral',
      disciplinas: p.disciplinas || [],
      vinculo: p.vinculo || 'Concursado',
      status: p.status || 'Ativo'
    }));

    const { data: insertedData, error } = await supabase
      .from('professores')
      .insert(payload)
      .select('id');

    if (error) {
      console.error('Erro ao importar professores:', error);
      throw new Error(error.message || 'Erro ao importar professores.');
    }

    if (selectedEscola && insertedData && insertedData.length > 0) {
      const alocacoes = insertedData.map(p => ({
        professor_id: p.id,
        escola_id: selectedEscola.id,
        turno: 'Manhã'
      }));
      const { error: alocError } = await supabase
        .from('professor_alocacoes')
        .insert(alocacoes);
      if (alocError) {
        console.warn('Aviso ao alocar professores na escola selecionada:', alocError);
      }
    }

    await fetchProfessores();
  };

  const professorPreviewColumns: PreviewColumn<{
    nome: string;
    email: string;
    cpf?: string;
    telefone?: string;
    departamento: string;
    disciplinas: string[];
    vinculo: string;
    status: string;
  }>[] = [
    { header: 'Professor', accessor: (item) => <span className="font-semibold text-slate-800">{item.nome}</span> },
    { header: 'E-mail', accessor: (item) => <span className="text-slate-600 font-mono text-xs">{item.email}</span> },
    { header: 'Departamento', accessor: (item) => <span className="text-slate-600 text-xs font-medium">{item.departamento}</span> },
    {
      header: 'Disciplinas',
      accessor: (item) => (
        <span className="text-slate-500 text-xs">
          {item.disciplinas.length > 0 ? item.disciplinas.join(', ') : 'Geral'}
        </span>
      )
    },
    { header: 'Vínculo', accessor: (item) => <span className="text-slate-600 text-xs">{item.vinculo}</span> },
    {
      header: 'Status',
      accessor: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${item.status === 'Inativo' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {item.status || 'Ativo'}
        </span>
      )
    }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {/* Header */}
      {!selectedEscola ? (
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 gap-4 bg-white shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              Gerenciamento de Professores
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Selecione uma escola para gerenciar seu corpo docente.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-56">
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
            <button
              onClick={handleExportProfessores}
              disabled={professores.length === 0}
              className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-[38px]"
              title="Exportar todos os professores cadastrados para CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Exportar CSV
            </button>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 border border-blue-200 shrink-0 h-[38px]"
              title="Importar professores em lote via CSV ou TXT"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              Importar TXT / Planilha
            </button>
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
                  className={`p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10 ${
                    (user?.role === 'GESTOR' || user?.role === 'SECRETARIO') ? 'hidden' : ''
                  }`}
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

              <div className="flex items-center gap-6">
                <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl p-2.5 flex flex-col items-center justify-center min-w-[70px]">
                  <span className="text-[7px] font-black text-blue-100 uppercase tracking-tighter">PROFESSORES</span>
                  <span className="text-xl font-black text-white leading-none mt-1">
                    {professoresDaEscola.length.toString().padStart(2, '0')}
                  </span>
                </div>

                {/* Logo da Escola */}
                <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 flex items-center justify-center overflow-hidden group hover:bg-white transition-all duration-300 shadow-2xl">
                  <img 
                    src={getEscolaLogo(selectedEscola)} 
                    alt="Logo Escola" 
                    className="max-w-full max-h-full object-contain filter drop-shadow-md" 
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith('/semed.png')) {
                        e.currentTarget.src = '/semed.png';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Inline (Image 1 style) */}
          <div className="px-8 -mt-6 relative z-20 mb-6">
            <div className="bg-white p-6 rounded-2xl shadow-xl shadow-blue-900/5 border border-slate-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {/* Nome */}
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NOME DO PROFESSOR</label>
                  <input
                    type="text"
                    value={inlineFormData.nome}
                    onChange={(e) => setInlineFormData({...inlineFormData, nome: e.target.value})}
                    placeholder="Nome Completo"
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] bg-slate-50/30 transition-all font-bold text-[#0f2851]"
                  />
                </div>
                {/* E-mail */}
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-MAIL (OPCIONAL)</label>
                  <input
                    type="email"
                    value={inlineFormData.email}
                    onChange={(e) => setInlineFormData({...inlineFormData, email: e.target.value})}
                    placeholder="E-mail de acesso"
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] bg-slate-50/30 transition-all font-bold text-[#0f2851]"
                  />
                </div>
                {/* Departamento */}
                <div className="space-y-2 lg:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DEPARTAMENTO</label>
                  <select
                    value={inlineFormData.departamento}
                    onChange={(e) => setInlineFormData({...inlineFormData, departamento: e.target.value})}
                    className="block w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] bg-slate-50/30 transition-all font-bold text-[#0f2851] appearance-none"
                  >
                    {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Disciplinas */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">DISCIPLINAS QUE ESTE PROFESSOR MINISTRA</label>
                <div className="flex flex-wrap gap-2 items-center">
                  {Array.from(new Set([...DISCIPLINAS, ...inlineFormData.disciplinas])).map(disc => {
                    const isSelected = inlineFormData.disciplinas.includes(disc);
                    return (
                      <button
                        key={disc}
                        type="button"
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
                  
                  {showNovaDisciplinaInline ? (
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        value={novaDisciplinaInline}
                        onChange={(e) => setNovaDisciplinaInline(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomDisciplinaInline(); } }}
                        placeholder="Nova disciplina..."
                        className="px-3 py-1.5 w-32 rounded-full text-[10px] font-bold border border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
                        autoFocus
                      />
                      <button onClick={handleAddCustomDisciplinaInline} type="button" className="p-1.5 rounded-full bg-[#0f2851] text-white hover:bg-blue-800 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                      <button onClick={() => { setShowNovaDisciplinaInline(false); setNovaDisciplinaInline(''); }} type="button" className="p-1.5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNovaDisciplinaInline(true)}
                      type="button"
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wider transition-all border border-dashed border-slate-300 text-slate-500 hover:text-[#0f2851] hover:border-[#0f2851]/50 bg-slate-50 hover:bg-blue-50"
                    >
                      <Plus className="w-3 h-3" />
                      ADICIONAR
                    </button>
                  )}
                </div>
              </div>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button 
                  onClick={handleInlineSubmit}
                  className="flex-1 w-full sm:w-auto bg-[#0f2851] hover:bg-[#1a3a6d] text-white py-3.5 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-[#0f2851]/20 active:scale-[0.98] min-h-[46px]"
                >
                  Cadastrar Professor
                </button>
                <button
                  onClick={handleExportProfessores}
                  disabled={professoresDaEscola.length === 0}
                  className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[46px] w-full sm:w-auto"
                  title="Exportar professores desta unidade para CSV"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  Exportar CSV
                </button>
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-5 py-3 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 border border-blue-200 min-h-[46px] w-full sm:w-auto"
                  title="Importar professores em lote via CSV ou TXT"
                >
                  <Upload className="w-4 h-4 text-blue-600" />
                  Importar TXT / Planilha
                </button>
              </div>
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
                  {/* Logo (Top Right) */}
                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <div className="w-12 h-12 bg-white rounded-xl p-1 shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden">
                      <img 
                        src={getEscolaLogo(escola)} 
                        alt="Logo" 
                        className="max-w-full max-h-full object-contain" 
                        onError={(e) => {
                          if (!e.currentTarget.src.endsWith('/semed.png')) {
                            e.currentTarget.src = '/semed.png';
                          }
                        }}
                      />
                    </div>
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
                      {(professor.disciplinas && professor.disciplinas.length > 2) && (
                        <span className="text-[8px] font-bold text-slate-400">+{professor.disciplinas.length - 2}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-slate-400 shrink-0">
                      <Clock className="w-3 h-3" />
                      <span className="text-[10px] font-black uppercase tracking-widest tabular-nums">
                        {professor.professor_horarios?.filter((h: { escola_id?: string }) => h.escola_id === selectedEscola.id).length || 0} AULAS
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
        title={user?.role === 'ADMIN' ? "Excluir Professor do Sistema" : "Desvincular Professor da Escola"}
        message={
          user?.role === 'ADMIN' ? (
            <>Tem certeza que deseja excluir permanentemente o(a) professor(a) <strong>{professorParaExcluir?.nome}</strong> do sistema? Todas as alocações e horários em todas as escolas serão removidos.</>
          ) : (
            <>Tem certeza que deseja desvincular o(a) professor(a) <strong>{professorParaExcluir?.nome}</strong> da escola <strong>{selectedEscola?.nome}</strong>? As aulas e alocações nesta unidade serão removidas, preservando o cadastro nas demais escolas.</>
          )
        }
      />

      <ImportCsvModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title={selectedEscola ? `Importação de Professores — ${selectedEscola.nome}` : "Importação de Professores em Lote"}
        subtitle="Importe corpo docente a partir de arquivo Excel (.csv) ou texto tabulado"
        templateFileName={selectedEscola ? `modelo_importacao_professores_${selectedEscola.nome.replace(/\s+/g, '_')}.csv` : "modelo_importacao_professores.csv"}
        templateCsvContent={getProfessoresTemplateCsv()}
        parseFn={parseProfessoresCsv}
        onSave={handleSaveImportProfessores}
        previewColumns={professorPreviewColumns}
        entityNamePlural="professores"
      />
    </div>
  );
}

