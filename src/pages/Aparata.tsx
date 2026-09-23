import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, GraduationCap, Building2, Clock, BookOpen, Search, Eye, Unlock, AlertTriangle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/common/Toast';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import { APP_CONFIG } from '../config/appConfig';

const PERIODOS = [
  { value: '1. BIMESTRE', label: '1. BIMESTRE' },
  { value: '2. BIMESTRE', label: '2. BIMESTRE' },
  { value: '3. BIMESTRE', label: '3. BIMESTRE' },
  { value: '4. BIMESTRE', label: '4. BIMESTRE' },
  { value: 'RECUPERAÇÃO', label: 'RECUPERAÇÃO' },
];

export default function Aparata() {
  const { turmaAtiva, salvarFechamento } = useTurma();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const [periodoSelecionado, setPeriodoSelecionado] = useState('1. BIMESTRE');
  const [disciplinaSelecionada, setDisciplinaSelecionada] = useState<string>(
    turmaAtiva?.componente && turmaAtiva.componente !== 'POLIVALENTE' ? turmaAtiva.componente : 'TODAS'
  );
  const [disciplinas, setDisciplinas] = useState<string[]>([]);
  const [fechamentosRaw, setFechamentosRaw] = useState<{ id?: string; bimestre: string; status: string; disciplina: string; data_fechamento?: string; created_at?: string; usuario_fechamento_id?: string }[]>([]);
  const [showDados, setShowDados] = useState(true);
  const [searchMovimentacao, setSearchMovimentacao] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal de Reabertura
  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false);
  const [tipoReabertura, setTipoReabertura] = useState<'ESPECIFICA' | 'TODAS'>('ESPECIFICA');
  const [disciplinaEscolhida, setDisciplinaEscolhida] = useState<string>('');
  const [reabrindo, setReabrindo] = useState(false);

  const rawTurmaId = turmaAtiva?.id ? turmaAtiva.id.toString().split('||')[0] : '';

  const carregarDadosTurma = useCallback(async () => {
    if (!rawTurmaId) return;
    try {
      setLoading(true);
      const [discs, fechs] = await Promise.all([
        OfflineTurmaService.fetchDisciplinasDaTurma(rawTurmaId),
        OfflineTurmaService.fetchFechamentosRaw(rawTurmaId)
      ]);
      setDisciplinas(discs);
      setFechamentosRaw(fechs);
    } catch (err) {
      console.error('Erro ao carregar dados de aparata:', err);
    } finally {
      setLoading(false);
    }
  }, [rawTurmaId]);

  useEffect(() => {
    carregarDadosTurma();
  }, [carregarDadosTurma]);

  // Permissão de reabertura (ADMIN da rede ou GESTOR/SECRETARIO da mesma escola)
  const canReabrir =
    user?.role === 'ADMIN' ||
    ((user?.role === 'GESTOR' || user?.role === 'SECRETARIO') &&
      Boolean(user?.escola_id && turmaAtiva?.escola_id && user.escola_id === turmaAtiva.escola_id));

  // Fechamentos do período selecionado
  const fechamentosDoPeriodo = useMemo(() => {
    return fechamentosRaw.filter(f => f.bimestre === periodoSelecionado && f.status === 'FECHADO');
  }, [fechamentosRaw, periodoSelecionado]);

  const disciplinasFechadasNoPeriodo = useMemo(() => {
    return fechamentosDoPeriodo.map(f => f.disciplina);
  }, [fechamentosDoPeriodo]);

  // Se a turma inteira ou alguma disciplina está fechada
  const isPeriodoFechadoGeral = disciplinasFechadasNoPeriodo.length > 0;

  // Situação para a disciplina atualmente selecionada
  const isDisciplinaSelecionadaFechada = useMemo(() => {
    if (disciplinaSelecionada === 'TODAS') {
      return isPeriodoFechadoGeral;
    }
    return disciplinasFechadasNoPeriodo.includes(disciplinaSelecionada);
  }, [disciplinaSelecionada, isPeriodoFechadoGeral, disciplinasFechadasNoPeriodo]);

  // Sincronizar disciplina escolhida no modal quando abre
  useEffect(() => {
    if (disciplinasFechadasNoPeriodo.length > 0) {
      if (disciplinaSelecionada !== 'TODAS' && disciplinasFechadasNoPeriodo.includes(disciplinaSelecionada)) {
        setDisciplinaEscolhida(disciplinaSelecionada);
      } else {
        setDisciplinaEscolhida(disciplinasFechadasNoPeriodo[0]);
      }
    } else if (disciplinas.length > 0) {
      setDisciplinaEscolhida(disciplinas[0]);
    }
  }, [disciplinasFechadasNoPeriodo, disciplinaSelecionada, disciplinas]);

  const handleExibir = () => {
    setShowDados(true);
  };

  const handleConfirmarReabertura = async () => {
    if (!turmaAtiva) return;
    setReabrindo(true);
    try {
      const escopo = tipoReabertura === 'TODAS' ? 'TODAS' : disciplinaEscolhida;
      await salvarFechamento(periodoSelecionado, 'ABERTO', escopo);
      showSuccess(
        tipoReabertura === 'TODAS'
          ? `Todas as disciplinas do ${periodoSelecionado} foram reabertas com sucesso!`
          : `A disciplina ${disciplinaEscolhida} foi reaberta com sucesso no ${periodoSelecionado}!`
      );
      setIsReabrirModalOpen(false);
      await carregarDadosTurma();
    } catch (err) {
      console.error('Erro ao reabrir aparata:', err);
      showError('Não foi possível reabrir a aparata. Tente novamente.');
    } finally {
      setReabrindo(false);
    }
  };

  // Movimentações reais da aparata
  const movimentacoes = useMemo(() => {
    if (!showDados) return [];

    const filtrados = fechamentosRaw.filter(f => f.bimestre === periodoSelecionado);
    if (filtrados.length === 0) {
      return [];
    }

    return filtrados.map((f, idx) => ({
      seq: idx + 1,
      data: (f.data_fechamento || f.created_at) ? new Date(f.data_fechamento || f.created_at!).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR'),
      operacao: f.status === 'FECHADO' ? 'FECHAMENTO' : 'ABERTURA',
      componente: f.disciplina,
      usuario: user?.name?.toUpperCase() || 'SECRETARIA',
    }));
  }, [showDados, fechamentosRaw, periodoSelecionado, user?.name]);

  const movimentacoesFiltradas = movimentacoes.filter(m =>
    searchMovimentacao === '' ||
    m.operacao.toLowerCase().includes(searchMovimentacao.toLowerCase()) ||
    m.componente.toLowerCase().includes(searchMovimentacao.toLowerCase()) ||
    m.usuario.toLowerCase().includes(searchMovimentacao.toLowerCase()) ||
    m.data.includes(searchMovimentacao)
  );

  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-[#eef2ff] text-[#0f2851] rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-50">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhuma turma selecionada</h2>
          <p className="text-slate-600 mb-6">Por favor, volte e selecione uma turma.</p>
          <Link to="/administracao" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#0f2851] text-white font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20">
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-6">
        <div className="max-w-[1400px] mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 px-4 py-2 bg-[#eef2ff] text-[#0f2851] text-sm font-bold rounded-lg border border-blue-100 hover:bg-[#e0e7ff] transition cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h2 className="text-xl font-medium text-slate-700 flex items-center gap-2">
              Aparatas da Turma
              <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded ml-1">Ano: {APP_CONFIG.YEAR}</span>
            </h2>
          </div>

          {/* Main Info Card */}
          <div className="bg-white/70 rounded-2xl p-6 border border-slate-200">
            {/* Info da Turma */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
                <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Turma / Fase</p>
                  <p className="text-sm font-bold text-[#0f2851]" title={turmaAtiva.fase}>
                    {turmaAtiva.fase}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
                <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Escola</p>
                  <p className="text-sm font-bold text-[#0f2851]">{turmaAtiva.escola}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
                <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Turno</p>
                  <p className="text-sm font-bold text-[#0f2851]">{turmaAtiva.turno}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
                <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Componente Atual</p>
                  <p className="text-sm font-bold text-[#0f2851] uppercase">
                    {disciplinaSelecionada === 'TODAS' ? 'Todas as Disciplinas' : disciplinaSelecionada}
                  </p>
                </div>
              </div>
            </div>

            {/* Filtros: Seletor de Período e Componente Curricular */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Período</label>
                  <select
                    value={periodoSelecionado}
                    onChange={(e) => { setPeriodoSelecionado(e.target.value); }}
                    className="w-56 border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm text-[#0f2851] font-bold focus:ring-2 focus:ring-[#0f2851]/10 cursor-pointer shadow-sm"
                  >
                    {PERIODOS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Componente Curricular</label>
                  <select
                    value={disciplinaSelecionada}
                    onChange={(e) => { setDisciplinaSelecionada(e.target.value); }}
                    className="w-72 border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm text-[#0f2851] font-bold focus:ring-2 focus:ring-[#0f2851]/10 cursor-pointer shadow-sm"
                  >
                    <option value="TODAS">TODAS AS DISCIPLINAS (VISÃO GERAL)</option>
                    {disciplinas.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleExibir}
                  className="px-8 py-2.5 bg-[#0f2851] text-white text-sm font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 active:scale-95 cursor-pointer"
                >
                  Exibir
                </button>
              </div>
            </div>

            {/* Área de conteúdo */}
            <div className="mt-6">
              {loading ? (
                <div className="bg-slate-100/80 rounded-xl px-5 py-6 text-sm text-slate-500 text-center animate-pulse">
                  Carregando dados da aparata...
                </div>
              ) : !showDados ? (
                <div className="bg-slate-100/80 rounded-xl px-5 py-4 text-sm text-slate-500">
                  Selecione um período para exibir as aparatas
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">

                  {/* Dados da Aparata */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-700">Dados da Aparata</h3>
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${isDisciplinaSelecionadaFechada ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {disciplinaSelecionada === 'TODAS'
                            ? (isPeriodoFechadoGeral
                                ? `FECHADO (${disciplinasFechadasNoPeriodo.length} de ${disciplinas.length} disciplinas)`
                                : 'ABERTO')
                            : (isDisciplinaSelecionadaFechada ? 'FECHADO' : 'ABERTO')
                          }
                        </span>
                      </div>

                      {/* Botão Reabrir Aparata (Aparece se houver fechamento e permissão) */}
                      {canReabrir && isPeriodoFechadoGeral && (
                        <button
                          type="button"
                          onClick={() => setIsReabrirModalOpen(true)}
                          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                        >
                          <Unlock className="w-4 h-4" />
                          Reabrir Aparata
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Período</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Componente</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Situação</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Turma</th>
                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {disciplinaSelecionada === 'TODAS' ? (
                            disciplinas.map(disc => {
                              const fechado = disciplinasFechadasNoPeriodo.includes(disc);
                              return (
                                <tr key={disc} className="hover:bg-slate-50 transition">
                                  <td className="px-4 py-3 text-slate-700 font-medium">{periodoSelecionado}</td>
                                  <td className="px-4 py-3 text-slate-800 font-bold">{disc}</td>
                                  <td className="px-4 py-3">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border ${fechado ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                      {fechado ? 'FECHADO' : 'ABERTO'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-slate-600">{turmaAtiva.fase} - {turmaAtiva.turno.toUpperCase()}</td>
                                  <td className="px-4 py-3 text-right">
                                    <Link
                                      to={`/aparata-detalhes?periodo=${encodeURIComponent(periodoSelecionado)}&disciplina=${encodeURIComponent(disc)}`}
                                      className="bg-[#0f2851] text-white text-[10px] font-bold px-4 py-1.5 rounded-lg hover:bg-[#1a3a6d] transition inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                      Detalhes
                                    </Link>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3 text-slate-700 font-medium">{periodoSelecionado}</td>
                              <td className="px-4 py-3 text-slate-800 font-bold">{disciplinaSelecionada}</td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border ${isDisciplinaSelecionadaFechada ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                  {isDisciplinaSelecionadaFechada ? 'FECHADO' : 'ABERTO'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{turmaAtiva.fase} - {turmaAtiva.turno.toUpperCase()}</td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  to={`/aparata-detalhes?periodo=${encodeURIComponent(periodoSelecionado)}&disciplina=${encodeURIComponent(disciplinaSelecionada)}`}
                                  className="bg-[#0f2851] text-white text-[10px] font-bold px-4 py-1.5 rounded-lg hover:bg-[#1a3a6d] transition inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Detalhes
                                </Link>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Movimentações da Aparata */}
                  <div>
                    <h3 className="text-base font-bold text-slate-700 mb-3">Movimentações da Aparata</h3>

                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Pesquisar registros..."
                        value={searchMovimentacao}
                        onChange={(e) => setSearchMovimentacao(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0f2851] font-bold focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10"
                      />
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Seq</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Data</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Operação</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Componente</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Usuário</th>
                            <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimentacoesFiltradas.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="px-4 py-6 text-center text-slate-400 text-sm">
                                {isPeriodoFechadoGeral
                                  ? 'Nenhum registro encontrado na busca.'
                                  : 'Nenhum fechamento registrado para este período (Aparata aberta).'}
                              </td>
                            </tr>
                          ) : movimentacoesFiltradas.map((mov) => (
                            <tr key={mov.seq} className="hover:bg-slate-50 transition border-b border-slate-100 last:border-none">
                              <td className="px-4 py-3 text-[#0f2851] font-bold tabular-nums">{String(mov.seq).padStart(2, '0')}</td>
                              <td className="px-4 py-3 text-slate-700 font-medium">{mov.data}</td>
                              <td className="px-4 py-3">
                                <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-red-100">
                                  {mov.operacao}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-800 font-semibold">{mov.componente}</td>
                              <td className="px-4 py-3 text-slate-600 font-medium">{mov.usuario}</td>
                              <td className="px-4 py-3 text-right">
                                <Link
                                  to={`/aparata-detalhes?periodo=${encodeURIComponent(periodoSelecionado)}&disciplina=${encodeURIComponent(mov.componente)}`}
                                  className="bg-[#0f2851] text-white text-[10px] font-bold px-4 py-1.5 rounded-lg hover:bg-[#1a3a6d] transition inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Detalhes
                                </Link>
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
          </div>

        </div>
      </div>

      {/* Modal de Reabertura de Aparata */}
      {isReabrirModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Reabrir Aparata Fechada</h3>
                  <p className="text-xs text-slate-500">{turmaAtiva.fase} • {periodoSelecionado}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReabrirModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <p className="text-slate-600 font-medium">
                Selecione o escopo da reabertura para permitir novos lançamentos e correções:
              </p>

              {/* Opção 1: Disciplina Específica */}
              <label
                className={`flex flex-col gap-2 p-3.5 rounded-xl border-2 transition cursor-pointer ${tipoReabertura === 'ESPECIFICA' ? 'border-blue-600 bg-blue-50/40' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="tipoReabertura"
                    value="ESPECIFICA"
                    checked={tipoReabertura === 'ESPECIFICA'}
                    onChange={() => setTipoReabertura('ESPECIFICA')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div>
                    <span className="font-bold text-slate-800">Apenas uma disciplina específica (Recomendado)</span>
                    <p className="text-xs text-slate-500">
                      Reabre apenas a disciplina selecionada, mantendo as demais travadas com segurança.
                    </p>
                  </div>
                </div>

                {tipoReabertura === 'ESPECIFICA' && (
                  <div className="mt-2 ml-7">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Qual disciplina deseja reabrir?</label>
                    <select
                      value={disciplinaEscolhida}
                      onChange={(e) => setDisciplinaEscolhida(e.target.value)}
                      className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm font-bold text-[#0f2851] focus:ring-2 focus:ring-[#0f2851]/10"
                    >
                      {disciplinasFechadasNoPeriodo.length > 0 ? (
                        disciplinasFechadasNoPeriodo.map(d => (
                          <option key={d} value={d}>{d} (FECHADO)</option>
                        ))
                      ) : (
                        disciplinas.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))
                      )}
                    </select>
                  </div>
                )}
              </label>

              {/* Opção 2: Todas as disciplinas */}
              <label
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition cursor-pointer ${tipoReabertura === 'TODAS' ? 'border-amber-600 bg-amber-50/40' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <input
                  type="radio"
                  name="tipoReabertura"
                  value="TODAS"
                  checked={tipoReabertura === 'TODAS'}
                  onChange={() => setTipoReabertura('TODAS')}
                  className="w-4 h-4 text-amber-600 mt-1"
                />
                <div>
                  <span className="font-bold text-slate-800">Todas as disciplinas da turma</span>
                  <p className="text-xs text-slate-500">
                    Reabrirá todos os componentes curriculares desta turma no {periodoSelecionado}.
                  </p>
                </div>
              </label>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Ao reabrir, os professores poderão retificar notas, faltas e conteúdos ministrados até que a aparata seja novamente fechada.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReabrirModalOpen(false)}
                disabled={reabrindo}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarReabertura}
                disabled={reabrindo}
                className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {reabrindo ? 'Reabrindo...' : 'Confirmar e Reabrir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
