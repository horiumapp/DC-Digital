import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Printer, Search, BookOpen, Unlock } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { useAuth } from '../contexts/AuthContext';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import { supabase } from '../lib/supabase';
import TurmaHeaderInfo from '../components/common/TurmaHeaderInfo';
import { APP_CONFIG, getBimestreAtual } from '../config/appConfig';

export default function AparataDetalhes() {
  const { turmaAtiva, alunos, avaliacoes, lancamentos, fechamentos, salvarFechamento } = useTurma();
  const { user: _user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodoQuery = searchParams.get('periodo');
  
  const bimestres = APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE'));
  const bimestreInfo = bimestres.find(b => b.id === periodoQuery) || getBimestreAtual() || bimestres[0];

  const [search, setSearch] = useState('');
  const [faltasMap, setFaltasMap] = useState<Record<string, number>>({});

  // Buscar histórico de faltas para todos os alunos da turma filtrados pelo período da aparata.
  // O serviço offline-first devolve o cache local quando não há conexão, incluindo registros pending.
  useEffect(() => {
    async function fetchFaltas() {
      if (!turmaAtiva) return;
      try {
        const rawId = turmaAtiva.id.toString().split('||')[0];
        const frequenciasAtuais = await OfflineTurmaService.fetchAllFrequencias(rawId, turmaAtiva.componente);
        const alunosDaTurma = new Set(alunos.map(aluno => String(aluno.id)));
        // Histórico permanece na turma de origem; para o aparata, consolidamos por aluno.
        const { data: frequenciasHistoricas } = await supabase
          .from('frequencias')
          .select('data, aluno_id, status, disciplina')
          .in('aluno_id', [...alunosDaTurma])
          .eq('disciplina', turmaAtiva.componente);
        const frequencias = frequenciasHistoricas || frequenciasAtuais;
        const map: Record<string, number> = {};
        const pStart = new Date(bimestreInfo.dataInicio + 'T00:00:00');
        const pEnd = new Date(bimestreInfo.dataFim + 'T23:59:59');

        frequencias.forEach(f => {
          // turma e disciplina são filtradas pelo serviço; os demais filtros são
          // aplicados aqui para manter o escopo da Aparata.
          if (!alunosDaTurma.has(String(f.aluno_id))) return;
          if (f.disciplina !== turmaAtiva.componente) return;
          if (f.status !== 'F' && f.status !== 'FJ') return;
          if (!f.data) return;

          const dataFreq = new Date(f.data + 'T12:00:00'); // Evitar fuso horário
          if (dataFreq >= pStart && dataFreq <= pEnd) {
            map[f.aluno_id] = (map[f.aluno_id] || 0) + 1;
          }
        });
        setFaltasMap(map);
      } catch (err) {
        console.error('Erro ao buscar faltas totais:', err);
      }
    }
    fetchFaltas();
  }, [turmaAtiva, alunos, bimestreInfo]);

  // Cálculo de Aulas Dadas (Lançamentos únicos de frequência)
  const aulasDadas = useMemo(() => {
    if (!lancamentos) return 0;
    const uniq = new Set(lancamentos.filter(l => l.tipo === 'frequencia').map(l => `${l.data}|${l.tempo}`));
    return uniq.size;
  }, [lancamentos]);

  // Regra de AVs Planejadas
  const aulasSemanais = (turmaAtiva?.diasDeAula?.length || 0) * (turmaAtiva?.tempos?.length || 0);
  const avsPlanejadas = aulasSemanais <= 3 ? 2 : 3;

  const hoje = new Date();
  const dataHoje = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;

  const alunosDetalhados = useMemo(() => {
    const principalAvs = avaliacoes.filter(a => !a.parent_id && a.tipo.startsWith('AV') && !a.tipo.startsWith('RP') && !a.tipo.includes('CH'));

    return (alunos || []).map((aluno, index) => {
      // Cálculo da Soma Parcial (considerando as notas, 2ª chamada e eventuais recuperações)
      let somaParcial = '0,00';
      if (principalAvs.length > 0) {
        let soma = 0;
        principalAvs.forEach(av => {
          const rp = avaliacoes.find(a => String(a.parent_id) === String(av.id) && (a.tipo?.includes('RP') || a.tipo?.toLowerCase().includes('recupera')));
          const ch = avaliacoes.find(a => String(a.parent_id) === String(av.id) && (a.tipo?.includes('2CH') || a.tipo?.includes('CH') || a.tipo?.toLowerCase().includes('chamada')));
          const valAvStr = aluno.notas?.[av.id];
          const valChStr = ch ? aluno.notas?.[ch.id] : undefined;
          const valRpStr = rp ? aluno.notas?.[rp.id] : undefined;
          
          const valAv = valAvStr ? parseFloat(String(valAvStr).replace(',', '.')) : 0;
          const valCh = valChStr ? parseFloat(String(valChStr).replace(',', '.')) : 0;
          const valRp = valRpStr ? parseFloat(String(valRpStr).replace(',', '.')) : 0;
          
          soma += Math.max(isNaN(valAv) ? 0 : valAv, isNaN(valCh) ? 0 : valCh, isNaN(valRp) ? 0 : valRp);
        });
        somaParcial = soma.toFixed(2).replace('.', ',');
      }
      
      const faltas = faltasMap[aluno.id] || 0;

      return {
        ...aluno,
        n: index + 1,
        matricula: aluno.matricula, 
        somaParcial,
        faltas
      };
    });
  }, [alunos, avaliacoes, faltasMap]);

  const alunosFiltrados = alunosDetalhados.filter(a =>
    search === '' ||
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.matricula.includes(search)
  );

  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-[#eef2ff] text-[#0f2851] rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhuma turma selecionada</h2>
          <Link to="/diario" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#0f2851] text-white font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20 mt-4">
            <ArrowLeft className="w-5 h-5" /> Voltar ao Diário
          </Link>
        </div>
      </div>
    );
  }

  const periodo = bimestreInfo.nome;
  const meses = `${new Date(bimestreInfo.dataInicio).toLocaleDateString('pt-BR', { month: 'long' })} - ${new Date(bimestreInfo.dataFim).toLocaleDateString('pt-BR', { month: 'long' })}`;

  const isAparataFechada = !!fechamentos[bimestreInfo.id];

  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false);
  const [escopoReabertura, setEscopoReabertura] = useState<'COMPONENTE' | 'TODAS'>('COMPONENTE');
  const [reabrindo, setReabrindo] = useState(false);

  const handleFecharAparata = async () => {
    if (window.confirm(`Tem certeza que deseja FECHAR a aparata do ${periodo}? Não será mais possível fazer lançamentos de frequência, conteúdos e notas neste período.`)) {
      await salvarFechamento(bimestreInfo.id, 'FECHADO');
      navigate('/diario');
    }
  };

  const handleReabrirAparata = () => {
    setIsReabrirModalOpen(true);
  };

  const handleConfirmarReabertura = async () => {
    setReabrindo(true);
    try {
      if (escopoReabertura === 'TODAS') {
        await salvarFechamento(bimestreInfo.id, 'ABERTO', 'TODAS');
      } else {
        await salvarFechamento(bimestreInfo.id, 'ABERTO', turmaAtiva.componente);
      }
      setIsReabrirModalOpen(false);
      navigate('/diario');
    } catch (err) {
      console.error('Erro ao reabrir aparata:', err);
    } finally {
      setReabrindo(false);
    }
  };

  const canReabrir = _user?.role === 'GESTOR' || _user?.role === 'SECRETARIO' || _user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-6">
        <div className="max-w-[1400px] mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 px-4 py-2 bg-[#eef2ff] text-[#0f2851] text-sm font-bold rounded-xl border border-blue-100 hover:bg-[#e0e7ff] transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h2 className="text-xl font-medium text-slate-700 flex items-center gap-2">
              Detalhes da Movimentação
              <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded">Ano: {APP_CONFIG.YEAR}</span>
              <span className="bg-[#eef2ff] text-[#0f2851] text-sm font-bold px-3 py-1 rounded">Período: {bimestreInfo.id}</span>
            </h2>
          </div>

          {/* Main Card */}
          <div className="bg-white/70 rounded-2xl p-6 border border-slate-200 space-y-6">

            {/* Info da Turma */}
            <TurmaHeaderInfo turmaAtiva={turmaAtiva} />

            {/* Seção Detalhes da Movimentação */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-700">Detalhes da Movimentação</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-[#0f2851] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#1a3a6d] transition shadow-md shadow-[#0f2851]/20 active:scale-95"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                  {!isAparataFechada && (
                    <button
                      onClick={handleFecharAparata}
                      className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
                    >
                      Fechar aparata
                    </button>
                  )}
                  {isAparataFechada && canReabrir && (
                    <button
                      onClick={handleReabrirAparata}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition"
                    >
                      Reabrir aparata
                    </button>
                  )}
                </div>
              </div>

              {/* Campos de detalhe */}
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Período</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{periodo}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Componente</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{turmaAtiva.componente}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Ensino</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{turmaAtiva.ensino}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fase/Turma</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{turmaAtiva.fase}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mês(es)</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{meses}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Ano letivo</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{APP_CONFIG.YEAR}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{dataHoje}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Operação</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">ABERTURA</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Aulas dadas</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{aulasDadas}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Qtde de AVs Planej</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{avsPlanejadas}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Usuário</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{turmaAtiva.professor}</div>
                </div>
              </div>
            </div>

            {/* Tabela de Alunos */}
            <div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar aluno..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#0f2851] font-bold focus:outline-none focus:ring-2 focus:ring-[#0f2851]/10"
                />
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase w-12">Nº</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Nome</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Matrícula</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Soma Parcial</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Faltas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alunosFiltrados.map((aluno, i) => (
                      <tr key={aluno.id} className={`border-b border-slate-100 hover:bg-slate-50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-2.5 text-slate-500 text-sm font-bold tabular-nums">{String(aluno.n).padStart(2, '0')}</td>
                        <td className="px-4 py-2.5 text-[#0f2851] font-bold text-sm hover:underline cursor-pointer">{aluno.nome}</td>
                        <td className="px-4 py-2.5 text-slate-700 text-sm font-mono uppercase">{aluno.matricula}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block text-white text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[42px] text-center ${parseFloat(aluno.somaParcial.replace(',', '.')) >= 6 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {aluno.somaParcial}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[32px] text-center ${aluno.faltas > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-[#eef2ff] text-[#0f2851] border border-blue-50'}`}>
                            {aluno.faltas}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Paginação */}
                <div className="px-4 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Mostrando de 1 até {alunosFiltrados.length} de{' '}
                    <span className="font-bold text-slate-700">{alunosFiltrados.length}</span> registros
                    &nbsp;&nbsp;Mostrar{' '}
                    <select defaultValue="100" className="border border-slate-300 rounded px-1 py-0.5 text-xs bg-white ml-1 mr-1">
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="100">100</option>
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
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Reabertura Granular */}
      {isReabrirModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Reabrir Aparata</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {periodo} • {turmaAtiva.fase}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Selecione o escopo da reabertura para permitir novos lançamentos e correções pelo professor:
            </p>

            <div className="space-y-3">
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${escopoReabertura === 'COMPONENTE' ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                <input
                  type="radio"
                  name="escopo-reabertura"
                  checked={escopoReabertura === 'COMPONENTE'}
                  onChange={() => setEscopoReabertura('COMPONENTE')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-bold block">
                    Apenas {turmaAtiva.componente} (Recomendado)
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Reabre apenas o diário deste componente curricular para correções pontuais. As demais disciplinas continuam fechadas.
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${escopoReabertura === 'TODAS' ? 'border-blue-500 bg-blue-50/40 text-blue-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                <input
                  type="radio"
                  name="escopo-reabertura"
                  checked={escopoReabertura === 'TODAS'}
                  onChange={() => setEscopoReabertura('TODAS')}
                  className="mt-1 text-blue-600 focus:ring-blue-500"
                />
                <div className="space-y-0.5">
                  <span className="text-sm font-bold block">
                    Todas as disciplinas da turma
                  </span>
                  <span className="text-xs text-slate-500 block">
                    Reabre todos os componentes curriculares desta turma para o {periodo} (ideal após conselho de classe geral).
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsReabrirModalOpen(false)}
                disabled={reabrindo}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarReabertura}
                disabled={reabrindo}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
              >
                {reabrindo ? 'Reabrindo...' : 'Confirmar Reabertura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
