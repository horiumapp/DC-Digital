import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Printer, Search, BookOpen, Unlock, Lock } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTurma, Avaliacao } from '../contexts/TurmaContext';
import { useAuth } from '../contexts/AuthContext';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import { supabase } from '../lib/supabase';
import TurmaHeaderInfo from '../components/common/TurmaHeaderInfo';
import { APP_CONFIG, getBimestreAtual } from '../config/appConfig';
import { getBimestreNumero } from '../utils/dateUtils';
import { classeElipseNota, corNota, limitePontosBimestre } from '../utils/corNota';
import { getEscolaLogo, LOGO_PADRAO_SEMED } from '../utils/escolaUtils';

export default function AparataDetalhes() {
  const { turmaAtiva, alunos, avaliacoes, lancamentos, fechamentos, salvarFechamento } = useTurma();
  const { user: _user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const periodoQuery = searchParams.get('periodo');
  const disciplinaQuery = searchParams.get('disciplina');
  const componenteAtivo = disciplinaQuery || turmaAtiva?.componente || 'POLIVALENTE';
  
  const bimestres = APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE'));
  const bimestreInfo = bimestres.find(b => b.id === periodoQuery) || getBimestreAtual() || bimestres[0];

  const [search, setSearch] = useState('');
  const [faltasMap, setFaltasMap] = useState<Record<string, number>>({});
  const [fechamentosLocais, setFechamentosLocais] = useState<Record<string, boolean>>({});
  const [disciplinasTurma, setDisciplinasTurma] = useState<string[]>([]);
  const [disciplinaEscolhidaReabrir, setDisciplinaEscolhidaReabrir] = useState<string>(componenteAtivo);
  const [isReabrirModalOpen, setIsReabrirModalOpen] = useState(false);
  const [escopoReabertura, setEscopoReabertura] = useState<'COMPONENTE' | 'TODAS'>('COMPONENTE');
  const [reabrindo, setReabrindo] = useState(false);
  const [isFecharModalOpen, setIsFecharModalOpen] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [avaliacoesComponente, setAvaliacoesComponente] = useState<Avaliacao[]>(avaliacoes);
  const [logoEscola, setLogoEscola] = useState(() => getEscolaLogo({ nome: turmaAtiva?.escola }));

  useEffect(() => {
    const nome = turmaAtiva?.escola;
    const escolaId = turmaAtiva?.escola_id;
    setLogoEscola(getEscolaLogo({ nome }));
    if (!escolaId) return;
    let ativo = true;
    void (async () => {
      try {
        const { data } = await supabase
          .from('escolas')
          .select('logo_url, nome')
          .eq('id', escolaId)
          .maybeSingle();
        if (!ativo || !data) return;
        setLogoEscola(getEscolaLogo({ logo_url: data.logo_url, nome: data.nome || nome }));
      } catch {
        /* mantém o logo local pelo nome da escola */
      }
    })();
    return () => { ativo = false; };
  }, [turmaAtiva?.escola, turmaAtiva?.escola_id]);

  useEffect(() => {
    setAvaliacoesComponente(avaliacoes);
  }, [avaliacoes]);

  useEffect(() => {
    async function carregarFechamentosEDisciplinas() {
      if (!turmaAtiva) return;
      const rawId = turmaAtiva.id.toString().split('||')[0];
      try {
        const [fechs, discs, avsResult] = await Promise.all([
          OfflineTurmaService.fetchFechamentos(rawId, componenteAtivo),
          OfflineTurmaService.fetchDisciplinasDaTurma(rawId),
          OfflineTurmaService.fetchAvaliacoes(rawId, componenteAtivo)
        ]);
        setFechamentosLocais(fechs);
        setDisciplinasTurma(discs);
        if (avsResult && avsResult.avaliacoes && avsResult.avaliacoes.length > 0) {
          setAvaliacoesComponente(avsResult.avaliacoes);
        }
      } catch (err) {
        console.error('Erro ao carregar fechamentos e disciplinas:', err);
      }
    }
    carregarFechamentosEDisciplinas();
  }, [turmaAtiva, componenteAtivo]);

  // Buscar histórico de faltas para todos os alunos da turma filtrados pelo período da aparata.
  // O serviço offline-first devolve o cache local quando não há conexão, incluindo registros pending.
  useEffect(() => {
    async function fetchFaltas() {
      if (!turmaAtiva) return;
      try {
        const rawId = turmaAtiva.id.toString().split('||')[0];
        const frequenciasAtuais = await OfflineTurmaService.fetchAllFrequencias(rawId, componenteAtivo);
        const alunosDaTurma = new Set(alunos.map(aluno => String(aluno.id)));
        if (alunosDaTurma.size === 0) {
          setFaltasMap({});
          return;
        }
        // Histórico permanece na turma de origem; para o aparata, consolidamos por aluno no período do bimestre.
        const { data: frequenciasHistoricas } = await supabase
          .from('frequencias')
          .select('data, aluno_id, tempo, status, disciplina')
          .in('aluno_id', [...alunosDaTurma])
          .eq('disciplina', componenteAtivo)
          .gte('data', bimestreInfo.dataInicio)
          .lte('data', bimestreInfo.dataFim)
          .in('status', ['F', 'FJ']);
        // O retorno do servidor não contém lançamentos ainda pendentes na fila offline.
        // Unir as duas fontes (deduplicando pelo registro) evita que faltas locais
        // desapareçam da Aparata assim que o servidor responde.
        const registrosPorChave = new Map<string, { data: string; aluno_id: string; status: string }>();
        [...(frequenciasHistoricas || []), ...frequenciasAtuais].forEach(registro => {
          const chave = `${registro.aluno_id}|${registro.data}|${registro.tempo ?? ''}|${registro.disciplina ?? ''}`;
          registrosPorChave.set(chave, registro);
        });
        const map: Record<string, number> = {};
        const pStart = new Date(bimestreInfo.dataInicio + 'T00:00:00');
        const pEnd = new Date(bimestreInfo.dataFim + 'T23:59:59');

        registrosPorChave.forEach(f => {
          // turma e disciplina são filtradas pelo serviço; os demais filtros são
          // aplicados aqui para manter o escopo da Aparata.
          if (!alunosDaTurma.has(String(f.aluno_id))) return;
          if (f.disciplina !== componenteAtivo) return;
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
  }, [turmaAtiva, alunos, bimestreInfo, componenteAtivo]);

  // Cálculo de Aulas Dadas (Lançamentos únicos de frequência)
  const aulasDadas = useMemo(() => {
    if (!lancamentos) return 0;
    const uniq = new Set(lancamentos.filter(l => l.tipo === 'frequencia').map(l => `${l.data}|${l.tempo}`));
    return uniq.size;
  }, [lancamentos]);

  // Quantidade real de avaliações feitas no bimestre para o componente
  const targetBimestreNum = useMemo(() => {
    return getBimestreNumero(bimestreInfo.id) ?? getBimestreNumero(bimestreInfo.nome) ?? getBimestreNumero(bimestreInfo.label) ?? 1;
  }, [bimestreInfo]);

  const principalAvs = useMemo(() => {
    const lista = avaliacoesComponente && avaliacoesComponente.length > 0 ? avaliacoesComponente : avaliacoes;
    return (lista || []).filter(a => {
      // Excluir 2ª chamada e recuperação
      if (a.parent_id) return false;
      if (a.tipo && (a.tipo.startsWith('RP') || a.tipo.includes('CH') || a.tipo.toLowerCase().includes('recupera') || a.tipo.toLowerCase().includes('chamada'))) {
        return false;
      }
      // Filtrar pelo componente ativo se aplicável
      if (a.disciplina && componenteAtivo && a.disciplina !== componenteAtivo && componenteAtivo !== 'POLIVALENTE') {
        return false;
      }
      // Filtrar pelo bimestre da aparata
      const avNum = getBimestreNumero(a.bimestre || '') ?? getBimestreNumero(a.data);
      if (avNum !== null && targetBimestreNum !== null) {
        return avNum === targetBimestreNum;
      }
      if (a.data && bimestreInfo.dataInicio && bimestreInfo.dataFim) {
        return a.data >= bimestreInfo.dataInicio && a.data <= bimestreInfo.dataFim;
      }
      return true;
    });
  }, [avaliacoesComponente, avaliacoes, componenteAtivo, targetBimestreNum, bimestreInfo]);

  const avsFeitas = principalAvs.length;

  const hoje = new Date();
  const dataHoje = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;

  const alunosDetalhados = useMemo(() => {
    const listaGeral = avaliacoesComponente && avaliacoesComponente.length > 0 ? avaliacoesComponente : avaliacoes;

    return (alunos || []).map((aluno, index) => {
      // Cálculo da Soma Parcial (considerando as notas, 2ª chamada e eventuais recuperações)
      let somaParcial = '0,00';
      if (principalAvs.length > 0) {
        let soma = 0;
        principalAvs.forEach(av => {
          const rp = listaGeral.find(a => String(a.parent_id) === String(av.id) && (a.tipo?.includes('RP') || a.tipo?.toLowerCase().includes('recupera')));
          const ch = listaGeral.find(a => String(a.parent_id) === String(av.id) && (a.tipo?.includes('2CH') || a.tipo?.includes('CH') || a.tipo?.toLowerCase().includes('chamada')));
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
  }, [alunos, principalAvs, avaliacoesComponente, avaliacoes, faltasMap]);

  const alunosFiltrados = alunosDetalhados.filter(a =>
    search === '' ||
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.matricula.includes(search)
  );

  if (!turmaAtiva) {
    return (
      <div className="portal-data-module min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-[#eef2ff] text-[#6354c7] rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhuma turma selecionada</h2>
          <Link to="/diario" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#6354c7] text-white font-bold rounded-xl hover:bg-[#5142ad] transition shadow-lg shadow-[#6354c7]/20 mt-4">
            <ArrowLeft className="w-5 h-5" /> Voltar ao Diário
          </Link>
        </div>
      </div>
    );
  }

  const periodo = bimestreInfo.nome;
  const meses = `${new Date(bimestreInfo.dataInicio).toLocaleDateString('pt-BR', { month: 'long' })} - ${new Date(bimestreInfo.dataFim).toLocaleDateString('pt-BR', { month: 'long' })}`;

  const isAparataFechada = !!fechamentos[bimestreInfo.id] || !!fechamentosLocais[bimestreInfo.id];

  const handleFecharAparata = () => {
    setIsFecharModalOpen(true);
  };

  const handleConfirmarFechamento = async () => {
    setFechando(true);
    try {
      await salvarFechamento(bimestreInfo.id, 'FECHADO', componenteAtivo);
      setIsFecharModalOpen(false);
      navigate(-1);
    } catch (err) {
      console.error('Erro ao fechar aparata:', err);
    } finally {
      setFechando(false);
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
        await salvarFechamento(bimestreInfo.id, 'ABERTO', disciplinaEscolhidaReabrir || componenteAtivo);
      }
      setIsReabrirModalOpen(false);
      navigate(-1);
    } catch (err) {
      console.error('Erro ao reabrir aparata:', err);
    } finally {
      setReabrindo(false);
    }
  };

  const canReabrir =
    _user?.role === 'ADMIN' ||
    ((_user?.role === 'GESTOR' || _user?.role === 'SECRETARIO') &&
      Boolean(_user?.escola_id && turmaAtiva?.escola_id && _user.escola_id === turmaAtiva.escola_id));

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-6 no-print">
        <div className="max-w-[1400px] mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 px-4 py-2 bg-[#eef2ff] text-[#6354c7] text-sm font-bold rounded-xl border border-blue-100 hover:bg-[#e0e7ff] transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h2 className="text-xl font-medium text-slate-700 flex items-center gap-2">
              Detalhes da Movimentação
              <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded">Ano: {APP_CONFIG.YEAR}</span>
              <span className="bg-[#eef2ff] text-[#6354c7] text-sm font-bold px-3 py-1 rounded">Período: {bimestreInfo.id}</span>
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
                    className="flex items-center gap-2 bg-[#6354c7] text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-[#5142ad] transition shadow-md shadow-[#6354c7]/20 active:scale-95"
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
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50 font-bold">{componenteAtivo}</div>
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
                  <label className="block text-xs font-bold text-slate-500 mb-1" title="Quantidade real de avaliações feitas no bimestre">Qtde de AVs Feitas</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">{avsFeitas}</div>
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
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-[#6354c7] font-bold focus:outline-none focus:ring-2 focus:ring-[#6354c7]/10"
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
                        <td className="px-4 py-2.5 text-[#6354c7] font-bold text-sm hover:underline cursor-pointer">{aluno.nome}</td>
                        <td className="px-4 py-2.5 text-slate-700 text-sm font-mono uppercase">{aluno.matricula}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block text-white text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[42px] text-center ${classeElipseNota(parseFloat(aluno.somaParcial.replace(',', '.')), limitePontosBimestre(targetBimestreNum))}`}>
                            {aluno.somaParcial}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[32px] text-center ${aluno.faltas > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-[#eef2ff] text-[#6354c7] border border-blue-50'}`}>
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
                    <button className="px-3 py-1 bg-[#6354c7] text-white rounded-lg text-xs font-bold">1</button>
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

      {/* Modal de Confirmação de Fechamento */}
      {isFecharModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Fechar Aparata</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {periodo} • {componenteAtivo}
                </p>
              </div>
            </div>

            <p className="text-sm text-slate-600">
              Tem certeza que deseja fechar a aparata do <strong>{periodo}</strong> ({componenteAtivo})? 
              Após o fechamento, não será mais possível lançar novas frequências, conteúdos ou notas para este período até que seja reaberta pela gestão.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFecharModalOpen(false)}
                disabled={fechando}
                className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmarFechamento}
                disabled={fechando}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-900 text-white shadow-md transition flex items-center gap-2 cursor-pointer"
              >
                {fechando ? 'Fechando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Reabertura Granular */}
      {isReabrirModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in no-print">
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
              <label className={`flex flex-col gap-2 p-3.5 rounded-xl border cursor-pointer transition ${escopoReabertura === 'COMPONENTE' ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950' : 'border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="escopo-reabertura"
                    checked={escopoReabertura === 'COMPONENTE'}
                    onChange={() => setEscopoReabertura('COMPONENTE')}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold block">
                      Apenas uma disciplina específica (Recomendado)
                    </span>
                    <span className="text-xs text-slate-500 block">
                      Reabre apenas o diário deste componente curricular para correções pontuais. As demais disciplinas continuam fechadas.
                    </span>
                  </div>
                </div>

                {escopoReabertura === 'COMPONENTE' && (
                  <div className="mt-1 ml-7">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Qual disciplina deseja reabrir?</label>
                    <select
                      value={disciplinaEscolhidaReabrir}
                      onChange={(e) => setDisciplinaEscolhidaReabrir(e.target.value)}
                      className="w-full border border-slate-300 bg-white rounded-lg px-3 py-2 text-sm font-bold text-[#6354c7]"
                    >
                      {disciplinasTurma.length > 0 ? (
                        disciplinasTurma.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))
                      ) : (
                        <option value={componenteAtivo}>{componenteAtivo}</option>
                      )}
                    </select>
                  </div>
                )}
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

      <div id="printable-aparata" aria-hidden="true" style={{ display: 'none' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 8mm; }
            html, body { background: white !important; margin: 0 !important; }
            html body .portal-sidebar,
            html body .portal-school-topbar,
            html body .portal-page-location,
            html body .portal-class-trail,
            html body .portal-system-alert,
            html body .portal-bottom-nav,
            html body .portal-workspace-footer,
            html body .portal-drawer-backdrop,
            html body .dd-skip-link,
            html body .no-print { display: none !important; }
            #printable-aparata {
              display: block !important;
              position: static !important;
              width: 100% !important;
              background: white !important;
            }
            #printable-aparata .sheet { break-inside: avoid; page-break-inside: avoid; }
          }
          #printable-aparata { font-family: Arial, sans-serif; color: #111; }
          #printable-aparata .doc-head {
            display: flex; align-items: center; gap: 10px;
            border: 1px solid #111; border-bottom: none; padding: 4px 8px;
          }
          #printable-aparata .escola-logo { width: 52px; height: 52px; object-fit: contain; flex: none; }
          #printable-aparata .doc-title {
            flex: 1; text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 0.4px;
            text-transform: uppercase; padding: 2px 8px;
          }
          #printable-aparata .meta { width: 100%; border-collapse: collapse; table-layout: fixed; }
          #printable-aparata .meta td { border: 1px solid #111; padding: 3px 6px; vertical-align: top; }
          #printable-aparata .label { display: block; font-size: 7px; text-transform: uppercase; color: #444; font-weight: 600; line-height: 1.2; }
          #printable-aparata .value { display: block; font-size: 10px; font-weight: 700; text-transform: uppercase; line-height: 1.25; }
          #printable-aparata .alunos { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 6px; }
          #printable-aparata .alunos th, #printable-aparata .alunos td { border: 1px solid #111; padding: 2px 5px; font-size: 9px; line-height: 1.2; }
          #printable-aparata .alunos th { background: #f2f2f2; text-align: left; font-size: 8px; text-transform: uppercase; }
          #printable-aparata .alunos .num { width: 28px; text-align: center; }
          #printable-aparata .alunos .mat { width: 28%; }
          #printable-aparata .alunos .soma, #printable-aparata .alunos .faltas { width: 72px; text-align: center; }
          #printable-aparata .nota-cor, #printable-aparata .falta-cor { font-weight: 700; }
          #printable-aparata .nota-cor { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #printable-aparata .falta-cor { color: #111; }
          #printable-aparata .legenda { margin-top: 4px; font-size: 8px; display: flex; gap: 12px; }
          #printable-aparata .legenda b { font-weight: 700; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          #printable-aparata .rodape { margin-top: 2px; font-size: 8px; text-align: right; }
        `}} />
        <div className="sheet">
          <div className="doc-head">
            <img
              className="escola-logo"
              src={logoEscola}
              alt={`Logo da ${turmaAtiva.escola}`}
              onError={() => {
                if (logoEscola !== LOGO_PADRAO_SEMED) setLogoEscola(LOGO_PADRAO_SEMED);
              }}
            />
            <div className="doc-title">Aparata — {periodo}</div>
          </div>
          <table className="meta">
            <tbody>
              <tr>
                <td colSpan={3}>
                  <span className="label">Escola</span>
                  <span className="value">{turmaAtiva.escola}</span>
                </td>
                <td>
                  <span className="label">Ano letivo</span>
                  <span className="value">{APP_CONFIG.YEAR}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="label">Professor</span>
                  <span className="value">{turmaAtiva.professor}</span>
                </td>
                <td>
                  <span className="label">Componente</span>
                  <span className="value">{componenteAtivo}</span>
                </td>
                <td>
                  <span className="label">Turno</span>
                  <span className="value">{turmaAtiva.turno}</span>
                </td>
                <td>
                  <span className="label">Fase / Turma</span>
                  <span className="value">{turmaAtiva.fase}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="label">Ensino</span>
                  <span className="value">{turmaAtiva.ensino}</span>
                </td>
                <td>
                  <span className="label">Mês(es)</span>
                  <span className="value">{meses}</span>
                </td>
                <td>
                  <span className="label">Data</span>
                  <span className="value">{dataHoje}</span>
                </td>
                <td>
                  <span className="label">Operação</span>
                  <span className="value">{isAparataFechada ? 'FECHADA' : 'ABERTURA'}</span>
                </td>
              </tr>
              <tr>
                <td>
                  <span className="label">Aulas dadas</span>
                  <span className="value">{aulasDadas}</span>
                </td>
                <td>
                  <span className="label">Avaliações feitas</span>
                  <span className="value">{avsFeitas}</span>
                </td>
                <td colSpan={2}>
                  <span className="label">Alunos</span>
                  <span className="value">{alunosDetalhados.length}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <table className="alunos">
            <thead>
              <tr>
                <th className="num">Nº</th>
                <th>Nome</th>
                <th className="mat">Matrícula</th>
                <th className="soma">Soma parcial</th>
                <th className="faltas">Faltas</th>
              </tr>
            </thead>
            <tbody>
              {alunosDetalhados.map((aluno) => {
                const pontos = parseFloat(aluno.somaParcial.replace(',', '.'));
                const corSoma = corNota(pontos, limitePontosBimestre(targetBimestreNum));
                return (
                  <tr key={aluno.id}>
                    <td className="num">{String(aluno.n).padStart(2, '0')}</td>
                    <td>{aluno.nome}</td>
                    <td className="mat">{aluno.matricula}</td>
                    <td className="soma">
                      <span className="nota-cor" style={{ color: corSoma }}>{aluno.somaParcial}</span>
                    </td>
                    <td className="faltas">
                      <span className="falta-cor">{aluno.faltas}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="legenda">
            <span><b style={{ color: '#4361ee' }}>Azul</b> soma na média ou acima</span>
            <span><b style={{ color: '#c2463e' }}>Vermelho</b> soma abaixo da média</span>
          </div>
          <div className="rodape">{alunosDetalhados.length} aluno(s)</div>
        </div>
      </div>
    </div>
  );
}
