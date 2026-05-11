import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GraduationCap, BookOpen, CalendarCheck, BarChart3, Loader2, LogOut, User, ChevronRight, Calendar } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { formatMatriculaCpf } from '../utils/formatters';
import { getBimestrePorData } from '../utils/dateUtils';
import BoletimTab from '../components/portal/BoletimTab';

interface AlunoData {
  id: string;
  nome: string;
  escola_nome: string;
  escola_inep: string;
  escola_diretor: string;
  escola_endereco: string;
  turma_nome: string;
  turma_turno: string;
  turma_ano: string;
  matricula: string;
  data_nascimento: string;
  nome_responsavel: string;
  endereco: string;
  sexo: string;
  numero_aluno: number;
  ensino_modalidade: string;
  escola_logo_url?: string;
}

interface NotaItem {
  disciplina: string;
  tipo: string;
  valor: number;
  valor_maximo: number;
  bimestre: string;
}

interface FrequenciaItem {
  data: string;
  disciplina: string;
  status: string;
  participacao: string;
}

export default function PortalAluno() {
  const { user, logout } = useAuth();
  const [alunoData, setAlunoData] = useState<AlunoData | null>(null);
  const [notas, setNotas] = useState<NotaItem[]>([]);
  const [frequencias, setFrequencias] = useState<FrequenciaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'notas' | 'frequencia' | 'boletim'>('notas');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  const NOMES_MESES = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  useEffect(() => {
    if (user?.id) {
      fetchAlunoData();
    }
  }, [user?.id]);

  async function fetchAlunoData() {
    if (!alunoData) setLoading(true);
    
    // O email do aluno é {cpf_digits}@aluno.dcdigital.local
    // Extrair os dígitos do CPF do email para buscar o aluno
    const emailParts = user?.email?.split('@') || [];
    const cpfDigits = emailParts[0] || '';
    
    // Buscar aluno diretamente pelo CPF
    const { data: alunos, error: alunoError } = await supabase
      .from('alunos')
      .select('*, escolas(*), turmas(*)')
      .order('criado_em', { ascending: false });

    if (alunoError || !alunos || alunos.length === 0) {
      setLoading(false);
      return;
    }

    // Encontrar o aluno cujo CPF (apenas dígitos) corresponde ao login
    const alunoEncontrado = alunos.find(a => {
      if (!a.cpf) return false;
      const alunoDigits = a.cpf.replace(/\D/g, '');
      return alunoDigits === cpfDigits;
    });

    if (!alunoEncontrado) {
      setLoading(false);
      return;
    }

    const escolaData = alunoEncontrado.escolas as any;
    const turmaData = alunoEncontrado.turmas as any;

    // Buscar colegas para calcular o número de chamada (por ordem alfabética)
    const { data: colegas } = await supabase
      .from('alunos')
      .select('id, nome')
      .eq('turma_id', alunoEncontrado.turma_id)
      .order('nome', { ascending: true });
    
    const numeroAluno = colegas ? colegas.findIndex(c => c.id === alunoEncontrado.id) + 1 : 0;

    // Determinar Modalidade de Ensino
    let modalidade = 'ENSINO FUNDAMENTAL I (EF1) 1º AO 5º ANO';
    const nomeTurmaUpper = (turmaData?.nome || '').toUpperCase();
    if (nomeTurmaUpper.includes('6º') || nomeTurmaUpper.includes('7º') || nomeTurmaUpper.includes('8º') || nomeTurmaUpper.includes('9º')) {
      modalidade = 'ENSINO FUNDAMENTAL II (EF2) 6º AO 9º ANO';
    } else if (nomeTurmaUpper.includes('MÉDIO')) {
      modalidade = 'ENSINO MÉDIO';
    } else if (nomeTurmaUpper.includes('INFANTIL')) {
      modalidade = 'EDUCAÇÃO INFANTIL';
    }

    setAlunoData({
      id: alunoEncontrado.id,
      nome: alunoEncontrado.nome,
      escola_nome: escolaData?.nome || 'N/D',
      escola_inep: escolaData?.inep || '---',
      escola_diretor: escolaData?.diretor || '---',
      escola_endereco: escolaData?.distrito || '---',
      turma_nome: turmaData?.nome || 'Sem turma',
      turma_turno: turmaData?.turno || '',
      turma_ano: turmaData?.ano_letivo || APP_CONFIG.YEAR,
      matricula: formatMatriculaCpf(alunoEncontrado.cpf),
      data_nascimento: alunoEncontrado.data_nascimento || '---',
      nome_responsavel: alunoEncontrado.nome_responsavel || '---',
      endereco: alunoEncontrado.endereco || '---',
      sexo: alunoEncontrado.sexo || '---',
      numero_aluno: numeroAluno,
      ensino_modalidade: modalidade,
      escola_logo_url: escolaData?.logo_url || '',
    });

    // Buscar notas do aluno
    const { data: notasData } = await supabase
      .from('notas')
      .select('valor, avaliacao_id, avaliacoes(tipo, disciplina, bimestre, valor_maximo)')
      .eq('aluno_id', alunoEncontrado.id);

    if (notasData) {
      setNotas(notasData.map((n: any) => ({
        disciplina: n.avaliacoes?.disciplina || 'N/D',
        tipo: n.avaliacoes?.tipo || 'N/D',
        valor: n.valor,
        valor_maximo: n.avaliacoes?.valor_maximo || 10,
        bimestre: n.avaliacoes?.bimestre || '1º',
      })));
    }

    // Buscar frequências do aluno
    const { data: freqData } = await supabase
      .from('frequencias')
      .select('data, disciplina, status, participacao')
      .eq('aluno_id', alunoEncontrado.id)
      .order('data', { ascending: false })
      .limit(50);

    if (freqData) {
      setFrequencias(freqData);
    }

    setLoading(false);
  }

  // Calcular estatísticas de frequência
  const totalAulas = frequencias.length;
  const presencas = frequencias.filter(f => f.status === 'P').length;
  const faltas = frequencias.filter(f => f.status === 'F').length;
  const faltasJustificadas = frequencias.filter(f => f.status === 'FJ').length;
  const percentual = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 0;

  // Agrupar notas por disciplina e bimestre
  const notasPorDisciplina = notas.reduce((acc, nota) => {
    if (!acc[nota.disciplina]) acc[nota.disciplina] = [];
    acc[nota.disciplina].push(nota);
    return acc;
  }, {} as Record<string, NotaItem[]>);

  // Ordenar notas por tipo (AV1, RP1, AV2, RP2...) dentro de cada disciplina
  Object.keys(notasPorDisciplina).forEach(disciplina => {
    notasPorDisciplina[disciplina].sort((a, b) => {
      const getPeso = (tipo: string) => {
        const t = tipo.toUpperCase();
        const num = parseInt(t.replace(/\D/g, '')) || 0;
        if (t.startsWith('AV')) return num * 10;     // AV1=10, AV2=20
        if (t.startsWith('RP')) return num * 10 + 5; // RP1=15, RP2=25
        return 900 + num;                            // Outros tipos no final
      };
      return getPeso(a.tipo) - getPeso(b.tipo);
    });
  });

  // Agrupar frequências por mês
  const frequenciasPorMes = frequencias.reduce((acc, freq) => {
    const date = new Date(freq.data + 'T00:00:00');
    const mesKey = `${date.getFullYear()}-${date.getMonth()}`;
    if (!acc[mesKey]) acc[mesKey] = [];
    acc[mesKey].push(freq);
    return acc;
  }, {} as Record<string, FrequenciaItem[]>);

  // Ordenar meses decrescente
  const mesesOrdenados = Object.keys(frequenciasPorMes).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0f2851] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#0f2851] text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-wide">Portal do Aluno</h1>
              <p className="text-blue-200 text-xs font-medium">Diário Digital — {APP_CONFIG.YEAR}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{alunoData?.nome || user?.name}</p>
              <p className="text-blue-200 text-[10px] font-bold uppercase tracking-wider">
                Matrícula: {alunoData?.matricula || '---'}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/10"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Info Card */}
        {alunoData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aluno</span>
                <p className="text-sm font-bold text-slate-800">{alunoData.nome}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escola</span>
                <p className="text-sm font-bold text-slate-800">{alunoData.escola_nome}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</span>
                <p className="text-sm font-bold text-slate-800">{alunoData.turma_nome}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequência</span>
                <p className={`text-sm font-bold ${percentual >= 75 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {percentual}% ({presencas}/{totalAulas} aulas)
                </p>
              </div>
            </div>
          </div>
        )}

        {!alunoData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm text-center">
            <User className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h2 className="text-lg font-bold text-slate-600 mb-2">Dados não encontrados</h2>
            <p className="text-sm text-slate-400">Não foi possível localizar seus dados acadêmicos. Contate a secretaria da sua escola.</p>
          </div>
        )}

        {/* Tabs */}
        {alunoData && (
          <>
            <div className="flex bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm overflow-x-auto no-print">
              <button
                onClick={() => setActiveTab('notas')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'notas'
                    ? 'bg-[#0f2851] text-white shadow-md'
                    : 'text-slate-500 hover:text-[#0f2851] hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Minhas Notas
              </button>
              <button
                onClick={() => setActiveTab('frequencia')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'frequencia'
                    ? 'bg-[#0f2851] text-white shadow-md'
                    : 'text-slate-500 hover:text-[#0f2851] hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                Minha Frequência
              </button>
              <button
                onClick={() => setActiveTab('boletim')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === 'boletim'
                    ? 'bg-[#0f2851] text-white shadow-md'
                    : 'text-slate-500 hover:text-[#0f2851] hover:bg-slate-50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Boletim
              </button>
            </div>

            {/* Notas */}
            {activeTab === 'notas' && (
              <div className="space-y-4">
                {Object.keys(notasPorDisciplina).length > 0 ? (
                  Object.entries(notasPorDisciplina).map(([disciplina, notasDisc]: [string, NotaItem[]]) => (
                    <div key={disciplina} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="px-5 py-4 bg-gradient-to-r from-blue-50/50 to-white border-b border-slate-100 flex items-center gap-3">
                        <BookOpen className="w-5 h-5 text-[#0f2851]" />
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{disciplina}</h3>
                      </div>
                      <div className="p-4">
                        <table className="w-full">
                          <thead>
                            <tr>
                              <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3">Avaliação</th>
                              <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3">Bimestre</th>
                              <th className="text-right text-[10px] font-black text-slate-400 uppercase tracking-widest pb-3">Nota</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {notasDisc.map((nota, i) => (
                              <tr key={i} className="group">
                                <td className="py-2.5 text-sm font-medium text-slate-700">{nota.tipo}</td>
                                <td className="py-2.5">
                                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {nota.bimestre}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right">
                                  <span className={`text-sm font-black ${
                                    nota.valor >= (nota.valor_maximo * 0.6)
                                      ? 'text-emerald-600'
                                      : 'text-red-500'
                                  }`}>
                                    {nota.valor.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-medium"> / {nota.valor_maximo}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm text-center">
                    <BarChart3 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium italic">Nenhuma nota lançada ainda.</p>
                  </div>
                )}
              </div>
            )}

            {/* Frequência */}
            {activeTab === 'frequencia' && (
              <div className="space-y-4">
                {/* Resumo */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                    <p className="text-2xl font-black text-slate-800 mt-1">{totalAulas}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-4 text-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Presenças</span>
                    <p className="text-2xl font-black text-emerald-600 mt-1">{presencas}</p>
                  </div>
                  <div className="bg-red-50 rounded-2xl border border-red-100 p-4 text-center">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Faltas</span>
                    <p className="text-2xl font-black text-red-500 mt-1">{faltas}</p>
                  </div>
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-center">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Justificadas</span>
                    <p className="text-2xl font-black text-amber-600 mt-1">{faltasJustificadas}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 text-center ${percentual >= 75 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${percentual >= 75 ? 'text-blue-500' : 'text-orange-500'}`}>Frequência</span>
                    <p className={`text-2xl font-black mt-1 ${percentual >= 75 ? 'text-blue-600' : 'text-orange-600'}`}>{percentual}%</p>
                  </div>
                </div>

                {/* Lista de frequências agrupadas por mês */}
                {mesesOrdenados.length > 0 ? (
                  <div className="space-y-3">
                    {mesesOrdenados.map((mesKey) => {
                      const [ano, mesIdx] = mesKey.split('-').map(Number);
                      const mesNome = NOMES_MESES[mesIdx];
                      const freqsDoMes = frequenciasPorMes[mesKey];
                      const isExpanded = expandedMonths.has(mesKey);

                      // Estatísticas do mês
                      const presencasMes = freqsDoMes.filter(f => f.status === 'P').length;
                      const faltasMes = freqsDoMes.filter(f => f.status === 'F').length;
                      const justificadasMes = freqsDoMes.filter(f => f.status === 'FJ').length;

                      return (
                        <div key={mesKey} className="space-y-2">
                          <button
                            onClick={() => toggleMonth(mesKey)}
                            className={`w-full flex items-center justify-between p-4 bg-white border rounded-2xl transition-all hover:shadow-md ${
                              isExpanded ? 'border-blue-200 shadow-sm ring-1 ring-blue-50' : 'border-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                                isExpanded ? 'bg-[#0f2851] text-white' : 'bg-slate-50 text-slate-400'
                              }`}>
                                <Calendar className="w-5 h-5" />
                              </div>
                              <div className="text-left">
                                <h4 className="font-black text-[#0f2851] text-sm uppercase tracking-wider">{mesNome}</h4>
                                <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                  <span className="text-blue-400">{freqsDoMes.length.toString().padStart(2, '0')} Aulas</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-emerald-500">{presencasMes.toString().padStart(2, '0')} Presenças</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="text-red-400">{faltasMes.toString().padStart(2, '0')} Faltas</span>
                                  {justificadasMes > 0 && (
                                    <>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-amber-500">{justificadasMes.toString().padStart(2, '0')} Justificadas</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className={`p-2 rounded-lg transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-blue-50 text-blue-600' : 'text-slate-300'}`}>
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead className="bg-slate-50/50">
                                    <tr>
                                      <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                                      <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Disciplina</th>
                                      <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50">
                                    {freqsDoMes.map((freq, i) => (
                                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3 text-sm font-medium text-slate-700 tabular-nums">
                                          {freq.data ? new Date(freq.data + 'T00:00:00').toLocaleDateString('pt-BR') : '---'}
                                        </td>
                                        <td className="px-5 py-3 text-sm font-medium text-slate-600">{freq.disciplina || '---'}</td>
                                        <td className="px-5 py-3 text-center">
                                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
                                            freq.status === 'P'
                                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                              : freq.status === 'F'
                                              ? 'bg-red-50 text-red-500 border-red-200'
                                              : freq.status === 'FJ'
                                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                                              : 'bg-slate-50 text-slate-400 border-slate-200'
                                          }`}>
                                            {freq.status || '-'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm text-center">
                    <CalendarCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium italic">Nenhum registro de frequência encontrado.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'boletim' && (
              <BoletimTab 
                alunoData={alunoData} 
                notas={notas} 
                frequencias={frequencias} 
              />
            )}
          </>
        )}
      </main>

      <footer className="text-center py-6 text-slate-400 text-xs">
        © {APP_CONFIG.YEAR} Diário Digital. Todos os direitos reservados.
      </footer>
    </div>
  );
}
