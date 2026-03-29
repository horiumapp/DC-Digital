import { useState } from 'react';
import { ArrowLeft, GraduationCap, Building2, Clock, BookOpen, Printer, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTurma } from '../contexts/TurmaContext';

// Alunos mockados para demonstração
const ALUNOS_MOCK = [
  { n: 1,  nome: 'Adellson Fernandes Lopes',          matricula: '2026/0588874' },
  { n: 2,  nome: 'Adriano Domingos Da Silva',          matricula: '2026/0588865' },
  { n: 3,  nome: 'Adrielly Ferreira Da Costa',         matricula: '2026/0588855' },
  { n: 4,  nome: 'Amanda Lima Da Silva',               matricula: '2026/0588860' },
  { n: 5,  nome: 'Ana Beatriz Souza Ferreira',         matricula: '2026/0588863' },
  { n: 6,  nome: 'Ana Paula De Oliveira',              matricula: '2026/0588868' },
  { n: 7,  nome: 'André Luiz Costa Ramos',             matricula: '2026/0588873' },
  { n: 8,  nome: 'Beatriz Cristina Melo',              matricula: '2026/0588859' },
  { n: 9,  nome: 'Carlos Eduardo Santos Lima',         matricula: '2026/0588875' },
  { n: 10, nome: 'Eloa Cristiny Da Silva Cunha',       matricula: '2026/0588864' },
  { n: 11, nome: 'Felipe Oliveira Da Silva',           matricula: '2026/0588851' },
  { n: 12, nome: 'Gabriel Maia Ramos',                 matricula: '2026/0588853' },
  { n: 13, nome: 'Heitor Do Carmo De Oliveira',        matricula: '2026/0588861' },
  { n: 14, nome: 'Jaisson Castro Damascena',           matricula: '2026/0588856' },
  { n: 15, nome: 'Joseff Cordovil De Oliveira',        matricula: '2026/0588867' },
  { n: 16, nome: 'Laysila Nogueira Barros',            matricula: '2026/0588857' },
  { n: 17, nome: 'Luciana Marcely Dos Santos Nascimento', matricula: '2026/0588852' },
  { n: 18, nome: 'Maira Rodrigues De Araujo',          matricula: '2026/0588866' },
  { n: 19, nome: 'Mariana Da Silva Do Nascimento',     matricula: '2026/0588871' },
  { n: 20, nome: 'Mayra Andrade De Souza',             matricula: '2026/0656956' },
  { n: 21, nome: 'Milena Maria Dos Santos Silva',      matricula: '2026/0588862' },
  { n: 22, nome: 'Nayra Da Silva Ferreira',            matricula: '2026/0588869' },
  { n: 23, nome: 'Raylla Queiroz Dos Santos',          matricula: '2026/0588850' },
  { n: 24, nome: 'Rihanna Vitoria Araujo Ferreira',    matricula: '2026/0588872' },
  { n: 26, nome: 'Stenio Silva Castro',                matricula: '2026/0588854' },
  { n: 27, nome: 'Tayna Fernandes Mariano Apurina',    matricula: '2026/0588870' },
  { n: 28, nome: 'Urias De Araujo Falcao',             matricula: '2026/0588858' },
  { n: 29, nome: 'Zilda Maria Costa De Oliveira',      matricula: '2026/0599576' },
];

export default function AparataDetalhes() {
  const { turmaAtiva } = useTurma();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const hoje = new Date();
  const dataHoje = `${hoje.getDate().toString().padStart(2, '0')}/${(hoje.getMonth() + 1).toString().padStart(2, '0')}/${hoje.getFullYear()}`;

  const alunosFiltrados = ALUNOS_MOCK.filter(a =>
    search === '' ||
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.matricula.includes(search)
  );

  if (!turmaAtiva) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Nenhuma turma selecionada</h2>
          <Link to="/diario" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition mt-4">
            <ArrowLeft className="w-5 h-5" /> Voltar ao Diário
          </Link>
        </div>
      </div>
    );
  }

  const periodo = '1. Bimestre';
  const meses = 'Fev,Mar,Abr';

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10 p-8 max-w-7xl mx-auto space-y-6">
        <div className="max-w-[1400px] mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center gap-3">
            <Link
              to="/aparata"
              className="flex items-center gap-1 px-4 py-2 bg-blue-100 text-blue-800 text-sm font-medium rounded-lg border border-blue-200 hover:bg-blue-200 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <h2 className="text-xl font-medium text-slate-700 flex items-center gap-2">
              Detalhes da Movimentação
              <span className="bg-emerald-100 text-emerald-800 text-sm font-bold px-3 py-1 rounded">Ano: 2026</span>
              <span className="bg-blue-100 text-blue-800 text-sm font-bold px-3 py-1 rounded">Período: 1</span>
            </h2>
          </div>

          {/* Main Card */}
          <div className="bg-white/70 rounded-2xl p-6 border border-slate-200 space-y-6">

            {/* Info da Turma */}
            <div className="grid grid-cols-4 gap-4">
              <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Professor</p>
                  <p className="text-sm font-bold text-slate-800" title={turmaAtiva.professor}>
                    {turmaAtiva.professor.length > 20 ? turmaAtiva.professor.substring(0, 18) + '...' : turmaAtiva.professor}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Escola</p>
                  <p className="text-sm font-bold text-slate-800">{turmaAtiva.escola}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Turno</p>
                  <p className="text-sm font-bold text-slate-800">{turmaAtiva.turno}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-blue-50/50 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-700">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Componente</p>
                  <p className="text-sm font-bold text-slate-800 uppercase">{turmaAtiva.componente}</p>
                </div>
              </div>
            </div>

            {/* Seção Detalhes da Movimentação */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-700">Detalhes da Movimentação</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                  <button
                    onClick={() => navigate('/aparata')}
                    className="flex items-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-800 transition"
                  >
                    Fechar aparata
                  </button>
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
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">2026</div>
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
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">0</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Qtde de AVs Planej</label>
                  <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">0</div>
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
                  placeholder="Pesquisar"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
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
                      <tr key={aluno.matricula} className={`border-b border-slate-100 hover:bg-slate-50 transition ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="px-4 py-2.5 text-slate-500 text-sm">{aluno.n}</td>
                        <td className="px-4 py-2.5 text-blue-600 font-medium text-sm hover:underline cursor-pointer">{aluno.nome}</td>
                        <td className="px-4 py-2.5 text-slate-700 text-sm">{aluno.matricula}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block bg-red-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[42px] text-center">0,00</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-0.5 rounded-full min-w-[32px] text-center">0</span>
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
                    <select className="border border-slate-300 rounded px-1 py-0.5 text-xs bg-white ml-1 mr-1">
                      <option>10</option>
                      <option>25</option>
                      <option value="100" selected>100</option>
                    </select>{' '}
                    registros
                  </span>
                  <div className="flex items-center gap-1">
                    <button className="px-3 py-1 border border-slate-200 rounded text-xs text-slate-500 hover:bg-slate-50 transition disabled:opacity-40" disabled>
                      ← Anterior
                    </button>
                    <button className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold">1</button>
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
