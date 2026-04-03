import { useState } from 'react';
import { ArrowLeft, GraduationCap, Building2, Clock, BookOpen, Search, Info, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { APP_CONFIG } from '../config/appConfig';

const PERIODOS = [
  { value: '1. BIMESTRE', label: '1. BIMESTRE' },
  { value: '2. BIMESTRE', label: '2. BIMESTRE' },
  { value: '3. BIMESTRE', label: '3. BIMESTRE' },
  { value: '4. BIMESTRE', label: '4. BIMESTRE' },
  { value: 'RECUPERAÇÃO', label: 'RECUPERAÇÃO' },
];

export default function Aparata() {
  const { turmaAtiva } = useTurma();
  const [periodoSelecionado, setPeriodoSelecionado] = useState('1. BIMESTRE');
  const [showDados, setShowDados] = useState(false);
  const [searchMovimentacao, setSearchMovimentacao] = useState('');

  const hoje = new Date();
  const dataHoje = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;

  const handleExibir = () => {
    if (periodoSelecionado) setShowDados(true);
  };

  const movimentacoes = showDados ? [
    { seq: 1, data: dataHoje, operacao: 'ABERTURA', usuario: turmaAtiva?.professor?.toUpperCase() || '' },
  ] : [];

  const movimentacoesFiltradas = movimentacoes.filter(m =>
    searchMovimentacao === '' ||
    m.operacao.toLowerCase().includes(searchMovimentacao.toLowerCase()) ||
    m.usuario.toLowerCase().includes(searchMovimentacao.toLowerCase()) ||
    m.data.includes(searchMovimentacao)
  );

  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhuma turma selecionada</h2>
          <p className="text-slate-600 mb-6">Por favor, volte ao diário e selecione uma turma.</p>
          <Link to="/diario" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#0f2851] text-white font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20">
            <ArrowLeft className="w-5 h-5" />
            Voltar ao Diário
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
            <Link
              to="/diario"
              className="flex items-center gap-1 px-4 py-2 bg-[#eef2ff] text-[#0f2851] text-sm font-bold rounded-lg border border-blue-100 hover:bg-[#e0e7ff] transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <h2 className="text-xl font-medium text-slate-700 flex items-center gap-2">
              Aparatas da Turma
              <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded ml-1">Ano: {APP_CONFIG.YEAR}</span>
            </h2>
          </div>

          {/* Main Info Card */}
          <div className="bg-white/70 rounded-2xl p-6 border border-slate-200">
            {/* Info da Turma */}
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-3 bg-[#eef2ff]/40 p-4 rounded-2xl border border-blue-50">
                <div className="w-10 h-10 rounded-full bg-[#eef2ff] flex items-center justify-center text-[#0f2851]">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Professor</p>
                  <p className="text-sm font-bold text-[#0f2851]" title={turmaAtiva.professor}>
                    {turmaAtiva.professor.length > 20 ? turmaAtiva.professor.substring(0, 18) + '...' : turmaAtiva.professor}
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
                  <p className="text-xs font-bold text-slate-400 uppercase">Componente</p>
                  <p className="text-sm font-bold text-[#0f2851] uppercase">{turmaAtiva.componente}</p>
                </div>
              </div>
            </div>

            {/* Seletor de Período */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <label className="block text-sm font-bold text-slate-500 mb-2">Período</label>
              <div className="flex items-center gap-3">
                <select
                  value={periodoSelecionado}
                  onChange={(e) => { setPeriodoSelecionado(e.target.value); setShowDados(false); }}
                  className="w-56 border-none bg-slate-50 rounded-xl px-4 py-2 text-sm text-[#0f2851] font-bold focus:ring-2 focus:ring-[#0f2851]/10 cursor-pointer"
                >
                  {PERIODOS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleExibir}
                  className="px-8 py-2 bg-[#0f2851] text-white text-sm font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 active:scale-95"
                >
                  Exibir
                </button>
              </div>
            </div>

            {/* Área de conteúdo */}
            <div className="mt-6">
              {!showDados ? (
                <div className="bg-slate-100/80 rounded-xl px-5 py-4 text-sm text-slate-500">
                  Selecione um período para exibir as aparatas
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">

                  {/* Dados da Aparata */}
                  <div>
                    <h3 className="text-base font-bold text-slate-700 mb-3">Dados da Aparata</h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Período</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Situação</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Turma</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Componente</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white hover:bg-slate-50 transition">
                            <td className="px-4 py-3 text-slate-700 font-medium">{periodoSelecionado}</td>
                            <td className="px-4 py-3">
                              <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded">ABERTO</span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{turmaAtiva.fase} - {turmaAtiva.turno.toUpperCase()}</td>
                            <td className="px-4 py-3 text-slate-700">{turmaAtiva.componente}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Movimentações */}
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

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Seq</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Data</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Operação</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Usuário</th>
                            <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {movimentacoesFiltradas.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-sm">
                                Nenhum registro encontrado
                              </td>
                            </tr>
                          ) : movimentacoesFiltradas.map((mov) => (
                            <tr key={mov.seq} className="bg-white hover:bg-slate-50 transition">
                              <td className="px-4 py-3 text-[#0f2851] font-bold tabular-nums">{String(mov.seq).padStart(2, '0')}</td>
                              <td className="px-4 py-3 text-slate-700 font-medium">{mov.data}</td>
                              <td className="px-4 py-3">
                                <span className="bg-[#eef2ff] text-[#0f2851] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest border border-blue-100">{mov.operacao}</span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 font-medium">{mov.usuario}</td>
                              <td className="px-4 py-3">
                                <Link
                                  to="/aparata-detalhes"
                                  className="bg-[#0f2851] text-white text-[10px] font-bold px-5 py-2 rounded-xl hover:bg-[#1a3a6d] transition inline-flex items-center justify-center gap-2 w-32 uppercase tracking-widest shadow-md shadow-[#0f2851]/20 active:scale-95"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  Detalhes
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {movimentacoesFiltradas.length > 0 && (
                        <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
                          <span>
                            Mostrando de 1 até {movimentacoesFiltradas.length} de{' '}
                            <span className="font-bold text-blue-600">{movimentacoesFiltradas.length}</span> registros
                            &nbsp;&nbsp;Mostrar{' '}
                            <select className="border border-slate-300 rounded px-1 py-0.5 text-xs bg-white ml-1 mr-1">
                              <option>10</option>
                              <option>25</option>
                              <option>50</option>
                            </select>{' '}
                            registros
                          </span>
                          <div className="flex items-center gap-1">
                            <button className="px-3 py-1 border border-slate-200 rounded text-xs text-slate-500 hover:bg-slate-50 transition disabled:opacity-40" disabled>
                              ← Anterior
                            </button>
                            <button className="px-3 py-1 bg-[#0f2851] text-white rounded-lg text-xs font-bold">1</button>
                            <button className="px-3 py-1 border border-slate-200 rounded text-xs text-slate-500 hover:bg-slate-50 transition disabled:opacity-40" disabled>
                              Seguinte →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
