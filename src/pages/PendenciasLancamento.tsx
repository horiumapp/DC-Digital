import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import { fetchPendenciasPorEscola } from '../services/pendenciasService';

export default function PendenciasLancamento() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [distrito, setDistrito] = useState('');
  const [distritos, setDistritos] = useState<string[]>([]);
  const [escolaId, setEscolaId] = useState('');
  const [escolas, setEscolas] = useState<any[]>([]);
  const [docentes, setDocentes] = useState<any[]>([]);
  const [buscaDocente, setBuscaDocente] = useState('');
  const [selectedPeriodos, setSelectedPeriodos] = useState<string[]>(['1. BIMESTRE']);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDocentes, setLoadingDocentes] = useState(false);
  
  const periodos = [
    '1. SEMESTRE', '2. SEMESTRE', '1. BIMESTRE', '2. BIMESTRE', 
    '3. BIMESTRE', '4. BIMESTRE', 'RECUPERAÇÃO', 'ÚNICO'
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (escolaId) {
      // Atualizar o endereço (distrito) automaticamente com base na escola selecionada
      const escolaSelecionada = escolas.find(e => e.id === escolaId);
      if (escolaSelecionada && escolaSelecionada.distrito) {
        setDistrito(escolaSelecionada.distrito);
      }
    }
  }, [escolaId, escolas]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: escolasData } = await supabase
        .from('escolas')
        .select('id, nome, distrito')
        .order('nome');
      
      if (escolasData) {
        setEscolas(escolasData);
        // Extrair distritos únicos e adicionar 'TODOS'
        const uniqueDistritos = Array.from(new Set(escolasData.map(e => e.distrito).filter(Boolean))) as string[];
        const distritosComTodos = ['TODOS', ...uniqueDistritos.sort()];
        setDistritos(distritosComTodos);
        setDistrito('TODOS');
        if (escolasData.length > 0) setEscolaId(escolasData[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados iniciais:', err);
    }
    setLoading(false);
  };

   const fetchDocentes = async (id: string) => {
     if (!id) return;
     setHasSearched(true);
     setLoadingDocentes(true);
     try {
       // Se o usuário logado for PROFESSOR, passamos o e-mail dele para filtrar apenas as SUAS turmas em todas as escolas ou na escola selecionada
       const professorEmail = (user?.role === 'PROFESSOR') ? user.email : undefined;
       const resultados = await fetchPendenciasPorEscola(id, selectedPeriodos, professorEmail);
       setDocentes(resultados);
     } catch (err) {
       console.error('Erro ao buscar docentes:', err);
     } finally {
       setLoadingDocentes(false);
     }
   };

  const escolasPorDistrito = (!distrito || distrito === 'TODOS') ? escolas : escolas.filter(e => e.distrito === distrito);

  const docentesFiltrados = docentes.filter(d => {
    const searchLower = buscaDocente.toLowerCase();
    return d.professor.toLowerCase().includes(searchLower) ||
      d.turma.toLowerCase().includes(searchLower) ||
      d.fase.toLowerCase().includes(searchLower) ||
      d.componente.toLowerCase().includes(searchLower);
  });

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50 dark:bg-slate-900 pb-12">
      {/* Sub-header */}
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 bg-[#eef2ff] text-[#0f2851] rounded-xl hover:bg-[#e0e7ff] transition-all text-sm font-bold border border-blue-100 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pendências de Lançamento</h1>
        </div>
        <div className="flex items-center gap-2">
           <span className="bg-blue-100 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-full border border-blue-200 uppercase">
             Ano: {APP_CONFIG.YEAR}
           </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Consulta Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#0f2851] rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Parâmetros de Consulta</h2>
            </div>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all text-sm font-bold border border-slate-200 shadow-sm">
              <Printer className="w-4 h-4" />
              Imprimir Relatório
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">Unidade Escolar</label>
              <select 
                value={escolaId}
                onChange={(e) => setEscolaId(e.target.value)}
                className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-[#0f2851] dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-[#0f2851]/5 transition-all appearance-none"
                disabled={loading}
              >
                {loading ? (
                  <option>Carregando unidades...</option>
                ) : (
                  <>
                    <option value="TODAS">TODAS AS UNIDADES</option>
                    {escolas.map((e) => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 ml-1">Distrito / Localidade</label>
              {escolaId === 'TODAS' ? (
                <select 
                  value={distrito}
                  onChange={(e) => setDistrito(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-[#0f2851] dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-[#0f2851]/5 transition-all appearance-none"
                >
                  {distritos.map((d) => (
                    <option key={d} value={d}>{d === 'TODOS' ? 'TODOS OS DISTRITOS' : d}</option>
                  ))}
                </select>
              ) : (
                <input 
                  value={distrito || 'GERAL'} 
                  readOnly
                  className="w-full px-4 py-3.5 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-400 cursor-not-allowed outline-none"
                />
              )}
            </div>
          </div>

           <div className="mb-10 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
             <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-4 ml-1">Períodos de Referência</label>
             <div className="flex flex-wrap gap-x-8 gap-y-4">
               {periodos.map((p) => (
                 <label key={p} className="flex items-center gap-3 cursor-pointer group">
                   <input 
                     type="checkbox" 
                     checked={selectedPeriodos.includes(p)}
                     onChange={(e) => {
                       if (e.target.checked) {
                         setSelectedPeriodos([...selectedPeriodos, p]);
                       } else {
                         setSelectedPeriodos(selectedPeriodos.filter(item => item !== p));
                       }
                     }}
                     className="w-5 h-5 text-[#0f2851] rounded-md border-slate-300 focus:ring-[#0f2851] transition-all cursor-pointer"
                   />
                   <span className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-[#0f2851] transition-colors">{p}</span>
                 </label>
               ))}
             </div>
           </div>

          <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-slate-700">
            <button 
              onClick={() => fetchDocentes(escolaId)}
              disabled={loadingDocentes}
              className="flex items-center gap-3 px-10 py-4 bg-[#0f2851] text-white rounded-2xl hover:bg-[#1a3a6d] transition-all text-sm font-black shadow-xl shadow-[#0f2851]/20 active:scale-95 disabled:opacity-50"
            >
              {loadingDocentes ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              {loadingDocentes ? 'PROCESSANDO...' : 'CONSULTAR PENDÊNCIAS'}
            </button>

            <div className="text-right">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Última atualização</div>
              <div className="text-sm font-bold text-slate-700 dark:text-slate-200">01/04/{APP_CONFIG.YEAR}</div>
            </div>
          </div>
        </div>

        {/* Resultados Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Docentes e Alocações</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Lista de pendências por componente curricular e turma</p>
            </div>
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={buscaDocente}
                onChange={(e) => setBuscaDocente(e.target.value)}
                placeholder="Pesquisar por docente, turma ou componente..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-[#0f2851] dark:text-slate-200 focus:outline-none focus:ring-4 focus:ring-[#0f2851]/5 transition-all shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.1em] border-b border-slate-200 dark:border-slate-700">
                  <th className="px-8 py-5">Docente Responsável</th>
                  <th className="px-4 py-5">Período</th>
                  <th className="px-4 py-5">Fase</th>
                  <th className="px-2 py-5 text-center">Turma</th>
                  <th className="px-4 py-5">Turno</th>
                  <th className="px-6 py-5">Componente Curricular</th>
                  <th className="px-4 py-5 text-center bg-slate-100/50 dark:bg-slate-900/50">% Pend. Notas</th>
                  <th className="px-4 py-5 text-center">% Pend. Freq.</th>
                  <th className="px-4 py-5 text-center">% Pend. Conteúdo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {!hasSearched ? (
                  <tr>
                    <td colSpan={11} className="px-8 py-32 text-center">
                       <div className="flex flex-col items-center gap-3">
                         <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-300">
                           <Search className="w-8 h-8" />
                         </div>
                         <span className="text-sm text-slate-500 font-bold">Defina os parâmetros e clique em Consultar</span>
                       </div>
                    </td>
                  </tr>
                ) : loadingDocentes ? (
                  <tr>
                    <td colSpan={11} className="px-8 py-32 text-center text-sm text-slate-500 font-bold">
                       <div className="flex flex-col items-center gap-4">
                         <div className="w-10 h-10 border-4 border-[#0f2851]/10 border-t-[#0f2851] rounded-full animate-spin" />
                         Processando dados do sistema...
                       </div>
                    </td>
                  </tr>
                ) : docentesFiltrados.length > 0 ? (
                  docentesFiltrados.map((d, i) => {
                    const renderPendency = (val: number) => {
                      const isHigh = val > 0;
                      return (
                        <span className={`inline-flex min-w-[60px] justify-center px-2 py-1 rounded-lg text-[13px] font-black ${
                          isHigh ? 'text-red-600 bg-red-50 dark:bg-red-900/20' : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                        }`}>
                          {val.toFixed(2).replace('.', ',')}%
                        </span>
                      );
                    };

                    return (
                      <tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-slate-900/50 transition-colors group">
                        <td className="px-8 py-5 text-[#0f2851] dark:text-white font-black uppercase text-[13px]">{d.professor}</td>
                        <td className="px-4 py-5 text-slate-600 dark:text-slate-400 font-bold text-[12px] uppercase">{d.periodo}</td>
                        <td className="px-4 py-5 text-slate-600 dark:text-slate-400 font-bold text-[13px] uppercase">{d.fase}</td>
                        <td className="px-2 py-5 text-center text-[#0f2851] dark:text-blue-400 font-black text-[15px] uppercase">{d.turma}</td>
                        <td className="px-4 py-5 text-slate-500 dark:text-slate-400 text-[12px] font-bold uppercase">{d.turno}</td>
                        <td className="px-6 py-5 text-slate-700 dark:text-slate-200 font-bold text-[13px] uppercase tracking-tight">{d.componente}</td>
                        <td className="px-4 py-5 text-center bg-slate-50/50 dark:bg-slate-900/30">{renderPendency(d.pendNotas)}</td>
                        <td className="px-4 py-5 text-center">{renderPendency(d.pendFreq)}</td>
                        <td className="px-4 py-5 text-center">{renderPendency(d.pendObjeto)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={11} className="px-8 py-32 text-center text-sm text-slate-400 italic">
                      Nenhum registro encontrado para os filtros selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
