import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, ChevronLeft, Edit2, GraduationCap, Building2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTurma, Turma } from '../contexts/TurmaContext';
import { useAuth } from '../contexts/AuthContext';

export default function Turmas() {
  const [searchTerm, setSearchTerm] = useState('');
  const { selecionarTurma } = useTurma();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSelectTurma = (turma: Turma) => {
    selecionarTurma(turma);
    navigate('/diario');
  };
  
  const turmas: Turma[] = [
    { 
      id: 1, 
      ensino: 'Ensino Médio - NEM', 
      fase: '3 SÉRIE / 01', 
      componente: 'FILOSOFIA',
      professor: 'FRANCISCO HUDSON GALVAO MAIA',
      escola: 'EE THOME MEDEIROS RAPOSO',
      turno: 'INTEGRAL',
      diasDeAula: [1], // Segunda
      tempos: ['2º TEMPO'],
      metricas: { frequencia: 100, objetosMinistrados: 8, objetosPlanejados: 10, avaliacoesCadastradas: 0, avaliacoesPrevistas: 2, notasLancadas: 0, notasPrevistas: 3 }
    },
    { 
      id: 2, 
      ensino: 'Ensino Médio - NEM', 
      fase: '3 SÉRIE / 02', 
      componente: 'FILOSOFIA',
      professor: 'FRANCISCO HUDSON GALVAO MAIA',
      escola: 'EE THOME MEDEIROS RAPOSO',
      turno: 'INTEGRAL',
      diasDeAula: [1], // Segunda
      tempos: ['4º TEMPO'],
      metricas: { frequencia: 90, objetosMinistrados: 7, objetosPlanejados: 10, avaliacoesCadastradas: 1, avaliacoesPrevistas: 2, notasLancadas: 1, notasPrevistas: 3 }
    },
    { 
      id: 3, 
      ensino: 'Ensino Médio - NEM', 
      fase: '2 SÉRIE / 02', 
      componente: 'FILOSOFIA',
      professor: 'FRANCISCO HUDSON GALVAO MAIA',
      escola: 'EE THOME MEDEIROS RAPOSO',
      turno: 'INTEGRAL',
      diasDeAula: [1], // Segunda
      tempos: ['3º TEMPO'],
      metricas: { frequencia: 85, objetosMinistrados: 5, objetosPlanejados: 10, avaliacoesCadastradas: 1, avaliacoesPrevistas: 2, notasLancadas: 0, notasPrevistas: 3 }
    },
    { 
      id: 4, 
      ensino: 'Ensino Médio - NEM', 
      fase: '2 SÉRIE / 01', 
      componente: 'FILOSOFIA',
      professor: 'FRANCISCO HUDSON GALVAO MAIA',
      escola: 'EE THOME MEDEIROS RAPOSO',
      turno: 'INTEGRAL',
      diasDeAula: [5], // Sexta
      tempos: ['2º TEMPO'],
      metricas: { frequencia: 92, objetosMinistrados: 6, objetosPlanejados: 10, avaliacoesCadastradas: 1, avaliacoesPrevistas: 2, notasLancadas: 1, notasPrevistas: 3 }
    },
    { 
      id: 5, 
      ensino: 'Ensino Médio - NEM', 
      fase: '1 SÉRIE / 01', 
      componente: 'FILOSOFIA',
      professor: 'FRANCISCO HUDSON GALVAO MAIA',
      escola: 'EE THOME MEDEIROS RAPOSO',
      turno: 'INTEGRAL',
      diasDeAula: [5], // Sexta
      tempos: ['3º TEMPO'],
      metricas: { frequencia: 95, objetosMinistrados: 9, objetosPlanejados: 10, avaliacoesCadastradas: 1, avaliacoesPrevistas: 1, notasLancadas: 1, notasPrevistas: 1 }
    },
    { 
      id: 6, 
      ensino: 'Ensino Médio - NEM', 
      fase: '1 SÉRIE / 02', 
      componente: 'FILOSOFIA',
      professor: 'FRANCISCO HUDSON GALVAO MAIA',
      escola: 'EE THOME MEDEIROS RAPOSO',
      turno: 'INTEGRAL',
      diasDeAula: [5], // Sexta
      tempos: ['4º TEMPO'],
      metricas: { frequencia: 88, objetosMinistrados: 4, objetosPlanejados: 10, avaliacoesCadastradas: 2, avaliacoesPrevistas: 2, notasLancadas: 2, notasPrevistas: 4 }
    },
  ];

  const filteredTurmas = turmas.filter(turma => 
    turma.ensino.toLowerCase().includes(searchTerm.toLowerCase()) ||
    turma.fase.toLowerCase().includes(searchTerm.toLowerCase()) ||
    turma.componente.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative">
      <div className="relative z-10">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-medium text-slate-800 dark:text-slate-100">Turmas/Componentes</h1>
            <span className="bg-emerald-50 text-emerald-600 text-sm font-bold px-3 py-1 rounded border border-emerald-100 uppercase tracking-tight">Ano: 2026</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium shadow-sm hover:bg-blue-700">
            <Edit2 className="w-4 h-4" />
            Alterar lotação
          </button>
        </div>

        <main className="px-6 pb-12">
          <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden max-w-[1500px] mx-auto">
            {/* Info Strip */}
            <div className="p-6 bg-blue-50/30 dark:bg-slate-800/50 grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight tracking-wider">Professor</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name?.toUpperCase() || 'NÃO IDENTIFICADO'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight tracking-wider">Escola</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">EE THOME MEDEIROS RAPOSO</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight tracking-wider">Turno</p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">INTEGRAL</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="relative max-w-full">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Pesquisar" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-md text-base placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 bg-slate-50/50" 
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                      <div className="flex items-center gap-1">
                        Ensino / Projeto
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                      <div className="flex items-center gap-1">
                        Fase / Turma
                        <ChevronDown className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider cursor-pointer hover:text-slate-900 dark:hover:text-slate-100">
                      <div className="flex items-center gap-1">
                        Componente
                        <ChevronDown className="w-4 h-4 text-slate-300 dark:text-slate-500" />
                      </div>
                    </th>
                    <th scope="col" className="px-6 py-4 text-left text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredTurmas.length > 0 ? (
                    filteredTurmas.map((turma) => (
                      <tr key={turma.id} className="hover:bg-blue-50/30 dark:hover:bg-slate-800 transition-colors">
                        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-slate-600 dark:text-slate-200">{turma.ensino}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{turma.fase}</td>
                        <td className="px-6 py-5 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{turma.componente}</td>
                        <td className="px-6 py-5 whitespace-nowrap">
                          <button 
                            onClick={() => handleSelectTurma(turma)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-800/50 transition-colors uppercase"
                          >
                            Selecionar
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 dark:text-slate-400 italic">
                        Nenhum registro encontrado para "{searchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-6 py-5 flex items-center justify-between border-t border-slate-100">
              <div className="flex items-center gap-4 text-base text-slate-600">
                <p>Mostrando de 1 até {filteredTurmas.length} de {filteredTurmas.length} registros</p>
                <div className="flex items-center gap-2">
                  <span>Mostrar</span>
                  <select className="border border-slate-200 rounded px-3 py-1.5 text-sm bg-white focus:ring-0 focus:border-blue-600 outline-none">
                    <option>{filteredTurmas.length}</option>
                  </select>
                  <span>registros</span>
                </div>
              </div>
              <div className="flex items-center">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button className="px-4 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-l-lg hover:bg-slate-50 flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </button>
                  <button className="px-4 py-2 text-sm font-bold text-white bg-blue-600 border-t border-b border-blue-600">
                    1
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-r-lg hover:bg-slate-50 flex items-center gap-1">
                    Seguinte
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
