import { ArrowLeft, ChevronDown, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RelatorioMedias() {
  const alunos = [
    { id: 1, nome: 'Raylla Queiroz dos Santos' },
    { id: 2, nome: 'Felipe Oliveira da Silva' },
    { id: 3, nome: 'Luciana Marcely dos Santos Nascimento' },
    { id: 4, nome: 'Gabriel Maia Ramos' },
    { id: 5, nome: 'Stenio Silva Castro' },
    { id: 6, nome: 'Adrielly Ferreira da Costa' },
    { id: 7, nome: 'Jaisson Castro Damascena' },
    { id: 8, nome: 'Laysila Nogueira Barros' },
    { id: 9, nome: 'Urias de Araujo Falcao' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10">
        {/* SubHeader */}
        <section className="bg-blue-50/50 px-6 py-4 flex items-center space-x-4 border-b border-blue-100">
        <Link to="/turmas" className="flex items-center space-x-2 text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-4 py-1.5 rounded text-base font-medium transition">
          <ArrowLeft className="w-5 h-5" />
          <span>Voltar</span>
        </Link>
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-semibold text-slate-700">Relatório das Médias do Componente</h1>
          <span className="bg-emerald-100 text-emerald-700 text-sm font-bold px-3 py-1 rounded-full border border-emerald-200">Ano: 2026</span>
        </div>
      </section>

      {/* MainContent */}
      <main className="p-6 max-w-[1400px] mx-auto">
        {/* SearchCard */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-800">Pesquisa</h2>
              <button className="px-6 py-2.5 bg-blue-600 text-white rounded-md text-base font-bold shadow-sm hover:bg-blue-700 transition">
                Imprimir
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="block text-base font-medium text-slate-600">Turma</label>
              <div className="flex items-center space-x-3">
                <div className="relative w-full max-w-md">
                  <select className="w-full bg-slate-50 border border-slate-300 text-slate-700 text-base rounded-lg focus:ring-blue-600 focus:border-blue-600 block p-3 appearance-none outline-none">
                    <option>Ensino Médio - NEM - 3 SERIE - 01 - MATEMATICA</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
                <button className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-md text-base font-bold hover:bg-blue-700 transition">
                  <Search className="w-5 h-5" />
                  <span>Exibir</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* StudentsTableSection */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-4">Alunos</h2>
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="w-5 h-5 text-slate-400" />
              </div>
              <input 
                type="text" 
                placeholder="Pesquisar" 
                className="bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-md focus:ring-blue-600 focus:border-blue-600 block w-full pl-12 p-3 outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-base text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-sm">
                <tr>
                  <th className="px-4 py-5 border-b border-slate-200 w-16">
                    <div className="flex items-center justify-between">
                      <span>Nº</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-5 border-b border-slate-200 border-l">
                    <div className="flex items-center justify-between">
                      <span>NOME DO ALUNO</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-5 border-b border-slate-200 border-l text-center">
                    <div className="flex items-center justify-between">
                      <span>MOTIVO SAÍDA</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-6 py-5 border-b border-slate-200 border-l text-center">
                    <div className="flex items-center justify-between">
                      <span>DATA SAÍDA</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-5 border-b border-slate-200 border-l text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span>1. BIM</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-5 border-b border-slate-200 border-l text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span>2. BIM</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-5 border-b border-slate-200 border-l text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span>3. BIM</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-5 border-b border-slate-200 border-l text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span>4. BIM</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-5 border-b border-slate-200 border-l text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span>RECUP</span>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                  <th className="px-4 py-5 border-b border-slate-200 border-l text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <span>MÉDIA FINAL</span>
                      <div className="w-2 h-2 bg-red-500 rounded-full ml-1"></div>
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alunos.map((aluno) => (
                  <tr key={aluno.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-5 text-slate-400 font-medium">{aluno.id}</td>
                    <td className="px-6 py-5 text-slate-700 font-medium uppercase border-l">{aluno.nome}</td>
                    <td className="px-6 py-5 border-l"></td>
                    <td className="px-6 py-5 border-l"></td>
                    <td className="px-4 py-5 border-l text-center"><span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded text-sm font-bold">S/N</span></td>
                    <td className="px-4 py-5 border-l text-center"><span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded text-sm font-bold">S/N</span></td>
                    <td className="px-4 py-5 border-l text-center"><span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded text-sm font-bold">S/N</span></td>
                    <td className="px-4 py-5 border-l text-center"><span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded text-sm font-bold">S/N</span></td>
                    <td className="px-4 py-5 border-l text-center"><span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded text-sm font-bold">S/N</span></td>
                    <td className="px-4 py-5 border-l text-center"><span className="bg-slate-100 text-slate-500 px-3 py-1.5 rounded text-sm font-bold">S/N</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <footer className="mt-8 pb-12 text-center text-slate-400 text-xs">
        © 2026 Diário Digital - Sistema de Gestão Escolar
      </footer>
      </div>
    </div>
  );
}
