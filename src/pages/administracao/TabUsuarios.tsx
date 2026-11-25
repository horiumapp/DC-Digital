import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  Search,
  Shield,
  User,
  GraduationCap,
  Briefcase,
  Key,
  Users,
  Building2,
  Mail,
  Plus,
  X,
  Landmark,
  ChevronRight,
  ArrowLeft,
  Network,
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import CampoSenha from '../../components/CampoSenha';
import { readAllRows } from '../../services/pagination';
import { getEscolaLogo } from '../../utils/escolaUtils';

interface UsuarioRow {
  id: string;
  nome_completo?: string;
  email?: string;
  cargo: string;
  escola_id?: string;
  criado_em: string;
}

interface EscolaRow {
  id: string;
  nome: string;
  logo_url?: string;
}

/** Seleção: null = grade de escolas; 'GERAL' = sem vínculo; string = id da escola */
type SelecaoUsuarios = null | 'GERAL' | string;

function isUsuarioSemEscola(u: UsuarioRow) {
  return !u.escola_id || u.cargo === 'GESTOR_SEMEC' || u.cargo === 'ADMIN';
}

export default function TabUsuarios() {
  const { user: _user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [cadastroAberto, setCadastroAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [formSemec, setFormSemec] = useState({ nome: '', email: '', senha: '' });

  const [usuarios, setUsuarios] = useState<UsuarioRow[]>([]);
  const [escolas, setEscolas] = useState<EscolaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroCargo, setFiltroCargo] = useState('TODOS');
  const [selecao, setSelecao] = useState<SelecaoUsuarios>(null);

  const CARGOS = ['TODOS', 'ADMIN', 'GESTOR_SEMEC', 'GESTOR', 'SECRETARIO', 'PROFESSOR', 'ALUNO'];

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: escData } = await supabase
        .from('escolas')
        .select('id, nome, logo_url')
        .eq('status', 'Ativa')
        .order('nome');
      if (escData) setEscolas(escData);

      const usuQuery = supabase
        .from('usuarios')
        .select('id, nome_completo, email, cargo, escola_id, criado_em')
        .order('id');

      const { data: usuData } = await readAllRows<UsuarioRow>(usuQuery);
      if (usuData) {
        usuData.sort((a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime());
        setUsuarios(usuData);
      }
    } catch (err: unknown) {
      console.error(err);
      showError('Erro ao carregar usuários.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const matchBuscaUsuario = (u: UsuarioRow, termo: string) => {
    const searchString = `${u.nome_completo || ''} ${u.email || ''}`.toLowerCase();
    return searchString.includes(termo);
  };

  const matchCargo = (u: UsuarioRow) => filtroCargo === 'TODOS' || u.cargo === filtroCargo;

  const countUsuariosEscola = (escolaId: string) =>
    usuarios.filter((u) => u.escola_id === escolaId && !isUsuarioSemEscola(u)).length;

  const usuariosGerais = usuarios.filter(isUsuarioSemEscola);
  const countGerais = usuariosGerais.length;

  const escolasFiltradas = escolas.filter((e) =>
    e.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const escolaSelecionada =
    selecao && selecao !== 'GERAL' ? escolas.find((e) => e.id === selecao) ?? null : null;

  const usuariosDaSelecao = (() => {
    const termo = busca.toLowerCase();
    let base: UsuarioRow[];
    if (selecao === 'GERAL') {
      base = usuariosGerais;
    } else if (selecao) {
      base = usuarios.filter((u) => u.escola_id === selecao && !isUsuarioSemEscola(u));
    } else {
      base = [];
    }
    return base.filter((u) => matchCargo(u) && matchBuscaUsuario(u, termo));
  })();

  const criarGestorSemec = async (event: React.FormEvent) => {
    event.preventDefault();
    const nome = formSemec.nome.trim();
    const email = formSemec.email.trim().toLowerCase();
    const senha = formSemec.senha;
    if (!nome || !email) {
      showError('Informe nome e e-mail.');
      return;
    }
    if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) {
      showError('A senha deve ter no mínimo 8 caracteres, com letra e número.');
      return;
    }
    setSalvando(true);
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { nome, email, senha, cargo: 'GESTOR_SEMEC', escola_id: '' },
    });
    setSalvando(false);
    if (error || data?.error) {
      showError(data?.error || 'Não foi possível criar o gestor SEMEC.');
      return;
    }
    showSuccess('Gestor SEMEC cadastrado. No primeiro acesso a senha precisa ser trocada.');
    setFormSemec({ nome: '', email: '', senha: '' });
    setCadastroAberto(false);
    fetchData();
  };

  const getEscolaNome = (escolaId?: string, cargo?: string) => {
    if (cargo === 'GESTOR_SEMEC') return 'Rede municipal';
    if (cargo === 'ADMIN') return 'Sistema';
    if (!escolaId) return 'Sem vínculo';
    const esc = escolas.find((e) => e.id === escolaId);
    return esc ? esc.nome : '-';
  };

  const getCargoConfig = (cargo: string) => {
    switch (cargo) {
      case 'ADMIN':
        return { icon: <Shield className="w-4 h-4" />, color: 'bg-purple-100 text-purple-700 border-purple-200' };
      case 'GESTOR_SEMEC':
        return { icon: <Landmark className="w-4 h-4" />, color: 'bg-teal-100 text-teal-800 border-teal-200' };
      case 'GESTOR':
        return { icon: <Briefcase className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700 border-blue-200' };
      case 'SECRETARIO':
        return { icon: <Key className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
      case 'PROFESSOR':
        return { icon: <GraduationCap className="w-4 h-4" />, color: 'bg-orange-100 text-orange-700 border-orange-200' };
      case 'ALUNO':
        return { icon: <User className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700 border-slate-200' };
      default:
        return { icon: <User className="w-4 h-4" />, color: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const voltarParaGrade = () => {
    setSelecao(null);
    setBusca('');
    setFiltroCargo('TODOS');
  };

  const tituloSelecao =
    selecao === 'GERAL' ? 'Usuários sem vínculo escolar' : escolaSelecionada?.nome || 'Usuários';

  const renderListaUsuarios = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6354c7]" />
        </div>
      );
    }

    if (usuariosDaSelecao.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Users className="w-12 h-12 text-slate-200" />
          <p className="font-medium">Nenhum usuário encontrado com este filtro.</p>
        </div>
      );
    }

    return (
      <>
        <div className="md:hidden space-y-3">
          {usuariosDaSelecao.map((u) => {
            const config = getCargoConfig(u.cargo);
            return (
              <article key={u.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-xs shrink-0 ${config.color}`}>
                    {u.nome_completo ? u.nome_completo.substring(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{u.nome_completo || 'Sem nome'}</h3>
                    <p className="text-xs text-slate-500 truncate">{u.email || '-'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black border ${config.color}`}>
                    {config.icon}
                    {u.cargo}
                  </span>
                  {selecao === 'GERAL' && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {getEscolaNome(u.escola_id, u.cargo)}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 tabular-nums">
                  Criado em {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                </p>
              </article>
            );
          })}
        </div>

        <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Usuário</th>
                  <th className="px-6 py-4">Contato / E-mail</th>
                  <th className="px-6 py-4">Perfil</th>
                  {selecao === 'GERAL' && <th className="px-6 py-4">Escopo</th>}
                  <th className="px-6 py-4">Data de Criação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosDaSelecao.map((u) => {
                  const config = getCargoConfig(u.cargo);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-bold text-xs ${config.color}`}>
                            {u.nome_completo ? u.nome_completo.substring(0, 2).toUpperCase() : 'US'}
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{u.nome_completo || 'Sem nome'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600 text-sm">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {u.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black border ${config.color}`}>
                          {config.icon}
                          {u.cargo}
                        </span>
                      </td>
                      {selecao === 'GERAL' && (
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                            <Building2 className="w-4 h-4 text-slate-400" />
                            <span className="truncate max-w-[200px]" title={getEscolaNome(u.escola_id, u.cargo)}>
                              {getEscolaNome(u.escola_id, u.cargo)}
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500 font-medium tabular-nums">
                          {new Date(u.criado_em).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 overflow-hidden">
      {!selecao ? (
        <div className="p-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 gap-4 bg-white shrink-0">
          <div className="shrink-0">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#6354c7]" />
              Usuários de Acesso
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Contas de login no sistema (não é a mesma coisa que alunos matriculados).
            </p>
          </div>
          <div className="relative w-full sm:w-64 shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar escolas..."
              className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6354c7] focus:border-[#6354c7] bg-slate-50/50 transition-all font-medium"
            />
          </div>
        </div>
      ) : (
        <div className="bg-[#6354c7] p-6 md:p-8 relative overflow-hidden shrink-0">
          <Users className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 pointer-events-none rotate-12" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={voltarParaGrade}
                className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  {selecao === 'GERAL' ? (
                    <Network className="w-6 h-6 text-white/80" />
                  ) : (
                    <Building2 className="w-6 h-6 text-white/80" />
                  )}
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{tituloSelecao}</h1>
                </div>
                <p className="text-blue-100/80 text-sm mt-1 font-medium">
                  {selecao === 'GERAL'
                    ? 'ADMIN, GESTOR_SEMEC e contas sem escola vinculada.'
                    : 'Contas vinculadas a esta unidade escolar.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/10 border border-white/20 backdrop-blur-sm rounded-xl p-2.5 flex flex-col items-center justify-center min-w-[70px]">
                <span className="text-[7px] font-black text-blue-100 uppercase tracking-tighter">Total</span>
                <span className="text-xl font-black text-white leading-none mt-1">
                  {usuariosDaSelecao.length.toString().padStart(2, '0')}
                </span>
              </div>
              {escolaSelecionada && (
                <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-2xl p-2 border border-white/20 flex items-center justify-center overflow-hidden">
                  <img
                    src={getEscolaLogo(escolaSelecionada)}
                    alt="Logo Escola"
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      if (!e.currentTarget.src.endsWith('/semed.png')) {
                        e.currentTarget.src = '/semed.png';
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selecao && (
        <div className="px-4 md:px-6 py-4 bg-white border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg gap-1">
            {CARGOS.map((cargo) => (
              <button
                key={cargo}
                type="button"
                onClick={() => setFiltroCargo(cargo)}
                className={`shrink-0 px-3 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                  filtroCargo === cargo
                    ? 'bg-white text-[#6354c7] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {cargo}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selecao === 'GERAL' && (filtroCargo === 'GESTOR_SEMEC' || filtroCargo === 'TODOS') && (
              <button
                type="button"
                onClick={() => setCadastroAberto(true)}
                className="flex items-center gap-2 bg-[#6354c7] hover:bg-[#5142ad] text-white px-3 py-2 rounded-lg text-xs font-bold"
              >
                <Plus className="w-4 h-4" />
                Gestor SEMEC
              </button>
            )}
            <div className="relative w-full sm:w-64 shrink-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6354c7] focus:border-[#6354c7] bg-slate-50/50 transition-all font-medium"
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-6 md:p-8">
        {!selecao ? (
          loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6354c7]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 tracking-tight">
              {/* Card geral — usuários sem escola */}
              {(!busca.trim() ||
                'geral sem vínculo admin semec rede municipal sistema'.includes(busca.toLowerCase().trim())) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelecao('GERAL');
                    setBusca('');
                    setFiltroCargo('TODOS');
                  }}
                  className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-teal-300 hover:shadow-xl hover:shadow-teal-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                >
                  <div className="absolute top-4 right-4 w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100">
                    <Network className="w-6 h-6 text-teal-600" />
                  </div>
                  <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors duration-300">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg leading-snug mb-1 group-hover:text-teal-700 transition-colors pr-10">
                    Geral — sem vínculo
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mb-4 pr-6">
                    ADMIN, SEMEC e contas sem escola
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contas</span>
                      <span className="text-2xl font-black text-slate-700 tabular-nums">
                        {countGerais.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-teal-50 group-hover:text-teal-700 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              )}

              {escolasFiltradas.map((escola) => {
                const count = countUsuariosEscola(escola.id);
                return (
                  <button
                    key={escola.id}
                    type="button"
                    onClick={() => {
                      setSelecao(escola.id);
                      setBusca('');
                      setFiltroCargo('TODOS');
                    }}
                    className="group relative flex flex-col bg-white border border-slate-200 rounded-2xl p-6 text-left hover:border-blue-300 hover:shadow-xl hover:shadow-blue-600/5 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                  >
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
                    <div className="w-12 h-12 bg-[#eef2ff] text-[#6354c7] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#6354c7] group-hover:text-white transition-colors duration-300">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg leading-snug mb-2 group-hover:text-[#6354c7] transition-colors pr-10">
                      {escola.nome}
                    </h3>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contas</span>
                        <span className="text-2xl font-black text-slate-700 tabular-nums">
                          {count.toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-[#eef2ff] group-hover:text-[#6354c7] transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </button>
                );
              })}

              {escolasFiltradas.length === 0 && busca !== '' && (
                <div className="col-span-full py-16 text-center text-slate-400">
                  <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="font-medium">Nenhuma escola encontrada com este filtro.</p>
                </div>
              )}
            </div>
          )
        ) : (
          renderListaUsuarios()
        )}
      </div>

      {cadastroAberto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <form onSubmit={criarGestorSemec} className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Cadastrar gestor SEMEC</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Este perfil vê e gerencia escolas, turmas, professores e alunos de toda a rede. Não acessa frequência nem nota.
                </p>
              </div>
              <button type="button" onClick={() => setCadastroAberto(false)} className="text-slate-400 hover:text-slate-700" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Nome
              <input
                value={formSemec.nome}
                onChange={(event) => setFormSemec({ ...formSemec, nome: event.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              E-mail
              <input
                type="email"
                value={formSemec.email}
                onChange={(event) => setFormSemec({ ...formSemec, email: event.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Senha temporária
              <CampoSenha
                value={formSemec.senha}
                onChange={(event) => setFormSemec({ ...formSemec, senha: event.target.value })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCadastroAberto(false)} className="px-4 py-2 text-sm font-bold text-slate-600">
                Cancelar
              </button>
              <button type="submit" disabled={salvando} className="px-4 py-2 rounded-lg bg-[#6354c7] text-white text-sm font-bold disabled:opacity-60">
                {salvando ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
