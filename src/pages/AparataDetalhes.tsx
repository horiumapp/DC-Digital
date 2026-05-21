import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Printer, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';
import { useAuth } from '../contexts/AuthContext';
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

  // Buscar histórico de faltas para todos os alunos da turma filtrados pelo período da aparata
  useEffect(() => {
    async function fetchFaltas() {
      if (!turmaAtiva) return;
      try {
        const rawId = turmaAtiva.id.toString().split('||')[0];
        const { data, error } = await supabase
          .from('frequencias')
          .select('aluno_id, status, data')
          .eq('turma_id', rawId)
          .eq('disciplina', turmaAtiva.componente)
          .in('status', ['F', 'FJ']);

        if (error) throw error;
        
        const map: Record<string, number> = {};
        
        const pStart = new Date(bimestreInfo.dataInicio + 'T00:00:00');
        const pEnd = new Date(bimestreInfo.dataFim + 'T23:59:59');

        data?.forEach(f => {
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
  }, [turmaAtiva, bimestreInfo]);

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
    const principalAvs = avaliacoes.filter(a => a.tipo.startsWith('AV') && !a.tipo.startsWith('RP'));

    return (alunos || []).map((aluno, index) => {
      // Cálculo Correto da Média (considerando as notas e eventuais recuperações)
      let media = '0,00';
      if (principalAvs.length > 0) {
        let soma = 0;
        let counted = 0;
        principalAvs.forEach(av => {
          const rp = avaliacoes.find(a => a.parent_id?.toString() === av.id?.toString());
          const valAvStr = aluno.notas?.[av.id];
          const valRpStr = rp ? aluno.notas?.[rp.id] : undefined;
          
          const valAv = valAvStr ? parseFloat(valAvStr.replace(',', '.')) : 0;
          const valRp = valRpStr ? parseFloat(valRpStr.replace(',', '.')) : 0;
          
          soma += Math.max(isNaN(valAv) ? 0 : valAv, isNaN(valRp) ? 0 : valRp);
          counted++;
        });
        media = counted > 0 ? (soma / counted).toFixed(2).replace('.', ',') : '0,00';
      }
      
      const faltas = faltasMap[aluno.id] || 0;

      return {
        ...aluno,
        n: index + 1,
        matricula: aluno.matricula, 
        media,
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

  const handleFecharAparata = async () => {
    if (window.confirm(`Tem certeza que deseja FECHAR a aparata do ${periodo}? Não será mais possível fazer lançamentos de frequência, conteúdos e notas neste período.`)) {
      await salvarFechamento(bimestreInfo.id, 'FECHADO');
      navigate('/diario');
    }
  };

  const handleReabrirAparata = async () => {
    if (window.confirm(`Tem certeza que deseja REABRIR a aparata do ${periodo}? O professor voltará a ter acesso para fazer lançamentos.`)) {
      await salvarFechamento(bimestreInfo.id, 'ABERTO');
      navigate('/diario');
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
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Média</th>
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
                          <span className={`inline-block text-white text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[42px] text-center ${parseFloat(aluno.media.replace(',', '.')) >= 6 ? 'bg-emerald-500' : 'bg-red-500'}`}>
                            {aluno.media}
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
    </div>
  );
}
