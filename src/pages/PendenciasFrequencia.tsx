import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Search } from 'lucide-react';

export default function PendenciasFrequencia() {
  const navigate = useNavigate();
  const [distrito, setDistrito] = useState('LABREA');
  const [escola, setEscola] = useState('EDUCANDARIO SANTA RITA');
  const [ensino, setEnsino] = useState('ENSINO FUNDAMENTAL - 1º CICLO');
  const [turno, setTurno] = useState('Matutino');
  const [tipoPendencia, setTipoPendencia] = useState('FREQUENCIA');
  
  const periodos = [
    '1. SEMESTRE', '2. SEMESTRE', '1. BIMESTRE', '2. BIMESTRE', 
    '3. BIMESTRE', '4. BIMESTRE', 'RECUPERAÇÃO', 'ÚNICO'
  ];

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900">
      {/* Sub-header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <h1 className="text-base font-medium text-slate-800 dark:text-slate-100">Pendências de Lançamentos</h1>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[600px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-slate-800 dark:text-slate-100">Consulta</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Distrito</label>
              <select 
                value={distrito}
                onChange={(e) => setDistrito(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-md text-sm text-blue-800 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LABREA">LABREA</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Ensino</label>
              <select 
                value={ensino}
                onChange={(e) => setEnsino(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ENSINO FUNDAMENTAL - 1º CICLO">ENSINO FUNDAMENTAL - 1º CICLO</option>
                <option value="ENSINO MEDIO - MED TECNO">ENSINO MEDIO - MED TECNO</option>
                <option value="ENSINO FUNDAMENTAL - 6º A 9º ANO">ENSINO FUNDAMENTAL - 6º A 9º ANO</option>
                <option value="ENSINO MEDIO">ENSINO MEDIO</option>
                <option value="ENSINO FUNDAMENTAL - 2º CICLO 2008">ENSINO FUNDAMENTAL - 2º CICLO 2008</option>
                <option value="FUND 6º AO 9º - MED TECNO">FUND 6º AO 9º - MED TECNO</option>
                <option value="FUNDAMENTAL - AVANCAR">FUNDAMENTAL - AVANCAR</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Tipo de pendência</label>
              <select 
                value={tipoPendencia}
                onChange={(e) => setTipoPendencia(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="FREQUENCIA">FREQUENCIA</option>
                <option value="OBJETO DE CONHECIMENTO">OBJETO DE CONHECIMENTO</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Escola</label>
              <select 
                value={escola}
                onChange={(e) => setEscola(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EDUCANDARIO SANTA RITA">EDUCANDARIO SANTA RITA</option>
                <option value="ESCOLA ESTADUAL PROFª BALBINA MESTRINHO">ESCOLA ESTADUAL PROFª BALBINA MESTRINHO</option>
                <option value="ESCOLA ESTADUAL SANTO AGOSTINHO">ESCOLA ESTADUAL SANTO AGOSTINHO</option>
                <option value="ESCOLA ESTADUAL THOME DE MEDEIROS RAPOSO">ESCOLA ESTADUAL THOME DE MEDEIROS RAPOSO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Turno</label>
              <select 
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-md text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Matutino">Matutino</option>
                <option value="Vespertino">Vespertino</option>
                <option value="Noturno">Noturno</option>
                <option value="Integral">Integral</option>
              </select>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Período</label>
            <div className="flex flex-wrap gap-4">
              {periodos.map((periodo) => (
                <label key={periodo} className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300">{periodo}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium">
              <Search className="w-4 h-4" />
              Consultar
            </button>
          </div>

          <div className="text-sm">
            <span className="font-bold text-slate-800 dark:text-slate-200">Data da extração: </span>
            <span className="text-slate-600 dark:text-slate-400">17/03/2026</span>
          </div>
        </div>
      </div>
    </div>
  );
}
