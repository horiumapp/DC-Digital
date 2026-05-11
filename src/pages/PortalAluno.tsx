import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GraduationCap, BookOpen, CalendarCheck, BarChart3, Loader2, LogOut, User } from 'lucide-react';
import { APP_CONFIG } from '../config/appConfig';
import { formatMatriculaCpf } from '../utils/formatters';

interface AlunoData {
  id: string;
  nome: string;
  escola_nome: string;
  turma_nome: string;
  turma_turno: string;
  matricula: string;
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
  const [activeTab, setActiveTab] = useState<'notas' | 'frequencia'>('notas');

  useEffect(() => {
    if (user?.email) {
      fetchAlunoData();
    }
  }, [user]);

  async function fetchAlunoData() {
    setLoading(true);
    
    // O email do aluno é {cpf_digits}@aluno.dcdigital.local
    // Extrair os dígitos do CPF do email para buscar o aluno
    const emailParts = user?.email?.split('@') || [];
    const cpfDigits = emailParts[0] || '';
    
    // Buscar aluno diretamente pelo CPF
    const { data: alunos, error: alunoError } = await supabase
      .from('alunos')
      .select('id, nome, cpf, escola_id, turma_id, escolas(nome), turmas(nome, turno)')
      .order('created_at', { ascending: false });

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

    setAlunoData({
      id: alunoEncontrado.id,
      nome: alunoEncontrado.nome,
      escola_nome: escolaData?.nome || 'N/D',
      turma_nome: turmaData?.nome || 'Sem turma',
      turma_turno: turmaData?.turno || '',
      matricula: formatMatriculaCpf(alunoEncontrado.cpf),
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
  const presencas = frequencias.filter(f => f.status === 'Presente').length;
  const faltas = frequencias.filter(f => f.status === 'Ausente' || f.status === 'Falta').length;
  const percentual = totalAulas > 0 ? Math.round((presencas / totalAulas) * 100) : 0;

  // Agrupar notas por disciplina e bimestre
  const notasPorDisciplina = notas.reduce((acc, nota) => {
    if (!acc[nota.disciplina]) acc[nota.disciplina] = [];
    acc[nota.disciplina].push(nota);
    return acc;
  }, {} as Record<string, NotaItem[]>);

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
            <div className="flex bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm">
              <button
                onClick={() => setActiveTab('notas')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
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
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all ${
                  activeTab === 'frequencia'
                    ? 'bg-[#0f2851] text-white shadow-md'
                    : 'text-slate-500 hover:text-[#0f2851] hover:bg-slate-50'
                }`}
              >
                <CalendarCheck className="w-4 h-4" />
                Minha Frequência
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
                  <div className={`rounded-2xl border p-4 text-center ${percentual >= 75 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${percentual >= 75 ? 'text-blue-500' : 'text-orange-500'}`}>Frequência</span>
                    <p className={`text-2xl font-black mt-1 ${percentual >= 75 ? 'text-blue-600' : 'text-orange-600'}`}>{percentual}%</p>
                  </div>
                </div>

                {/* Lista de frequências */}
                {frequencias.length > 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                    <table className="w-full">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                          <th className="px-5 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Disciplina</th>
                          <th className="px-5 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {frequencias.map((freq, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3 text-sm font-medium text-slate-700 tabular-nums">
                              {freq.data ? new Date(freq.data + 'T00:00:00').toLocaleDateString('pt-BR') : '---'}
                            </td>
                            <td className="px-5 py-3 text-sm font-medium text-slate-600">{freq.disciplina || '---'}</td>
                            <td className="px-5 py-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                freq.status === 'Presente'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : 'bg-red-50 text-red-500 border border-red-100'
                              }`}>
                                {freq.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm text-center">
                    <CalendarCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 font-medium italic">Nenhum registro de frequência encontrado.</p>
                  </div>
                )}
              </div>
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
