import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2 } from 'lucide-react';

export default function Estatisticas() {
  const navigate = useNavigate();

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
        <h1 className="text-base font-medium text-slate-800 dark:text-slate-100">Estatísticas de Pendências</h1>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 min-h-[600px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              to="/pendencias-lancamento"
              className="flex items-center gap-4 p-4 bg-[#eef2ff] rounded-lg hover:bg-[#e0e7ff] transition-colors border border-blue-100"
            >
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
                <BarChart2 className="w-5 h-5 text-[#0f2851]" />
              </div>
              <span className="text-sm font-medium text-[#0f2851]">Pendências de Lançamento</span>
            </Link>

            <Link 
              to="/pendencias-frequencia"
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-800 flex items-center justify-center shrink-0">
                <BarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              </div>
              <span className="text-sm font-medium text-indigo-900 dark:text-indigo-100">Pendências de Lançamentos de<br/>Frequências/Objetos de Conhecimento</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
