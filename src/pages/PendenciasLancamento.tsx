import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
      // 1. Buscar alocações/horários da escola selecionada
      // Se o usuário for um professor, ele só deve ver as dele, MAS nesta tela geralmente é visão de gestor
      const { data: horarios } = await supabase
        .from('professor_horarios')
        .select('*, turmas(nome, turno), professores(nome)')
        .eq('escola_id', id);

      if (horarios) {
        // Mapear dados para a tabela
        // Agrupar por professor e turma/componente
        const mapped = horarios.map(h => ({
          professor: h.professores?.nome || 'Docente N/D',
          dataLotacao: '01/02/2026', // Placeholder
          periodo: '1. BIMESTRE',
          turno: h.turmas?.turno || 'N/D',
          ensino: 'Ensino Médio',
          fase: '3 Serie',
          turma: h.turmas?.nome || 'N/D',
          componente: h.componente,
          pendNotas: 100, // Lógica de cálculo seria complexa e precisa de query separada
          pendFreq: 100,
          pendObjeto: 100
        }));
        setDocentes(mapped);
      }
    } catch (err) {
      console.error('Erro ao buscar docentes:', err);
    } finally {
      setLoadingDocentes(false);
    }
  };

  const escolasPorDistrito = (!distrito || distrito === 'TODOS') ? escolas : escolas.filter(e => e.distrito === distrito);

  const docentesFiltrados = docentes.filter(d => {
    const matchesSearch = d.professor.toLowerCase().includes(buscaDocente.toLowerCase()) ||
      d.turma.toLowerCase().includes(buscaDocente.toLowerCase()) ||
      d.componente.toLowerCase().includes(buscaDocente.toLowerCase());
    
    const periodoFormatado = d.periodo.toUpperCase();
    // Só mostrar se o período estiver explicitamente selecionado
    const matchesPeriodo = selectedPeriodos.includes(periodoFormatado);
    
    return matchesSearch && matchesPeriodo;
  });

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
        <h1 className="text-base font-medium text-slate-800 dark:text-slate-100">Pendências de lançamento</h1>
      </div>

      {/* Main Content */}
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Consulta Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Consulta</h2>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-bold shadow-sm active:scale-95">
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Escola</label>
              <select 
                value={escolaId}
                onChange={(e) => setEscolaId(e.target.value)}
                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <option>Carregando escolas...</option>
                ) : escolas.length > 0 ? (
                  escolas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))
                ) : (
                  <option>Nenhuma escola cadastrada</option>
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Endereço</label>
               <select 
                 value={distrito}
                 readOnly
                 className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 focus:outline-none cursor-not-allowed shadow-sm appearance-none"
               >
                 <option value={distrito}>{distrito || 'Endereço não disponível'}</option>
               </select>
            </div>
          </div>

           <div className="mb-8">
             <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Período</label>
             <div className="flex flex-wrap gap-6">
               {periodos.map((p) => (
                 <label key={p} className="flex items-center gap-2.5 cursor-pointer">
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
                     className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                   />
                   <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p}</span>
                 </label>
               ))}
             </div>
           </div>

          <div className="mb-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-6">
            <button 
              onClick={() => fetchDocentes(escolaId)}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-bold shadow-md active:scale-95"
            >
              <Search className="w-5 h-5" />
              CONSULTAR
            </button>

            <div className="text-sm">
              <span className="font-bold text-slate-700 dark:text-slate-200">Data da extração: </span>
              <span className="text-slate-600 dark:text-slate-400">01/04/2026</span>
            </div>
          </div>
        </div>

        {/* Docentes Card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6 overflow-hidden">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Docentes</h2>
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                value={buscaDocente}
                onChange={(e) => setBuscaDocente(e.target.value)}
                placeholder="Pesquisar..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 text-sm font-bold text-slate-700 dark:text-slate-400 uppercase tracking-wider border-y border-slate-200 dark:border-slate-700">
                  <th className="px-6 py-4">Professor</th>
                  <th className="px-3 py-4 whitespace-nowrap">Data Lotação</th>
                  <th className="px-3 py-4">Período</th>
                  <th className="px-3 py-4">Turno</th>
                  <th className="px-3 py-4">Ensino</th>
                  <th className="px-3 py-4">Fase</th>
                  <th className="px-3 py-4">Turma</th>
                  <th className="px-3 py-4">Componente</th>
                  <th className="px-3 py-4 text-center">% Pend Notas</th>
                  <th className="px-3 py-4 text-center">% Pend Freq</th>
                  <th className="px-3 py-4 text-center">% Pend Objeto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {!hasSearched ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-20 text-center text-sm text-slate-500 italic">
                      Selecione os filtros e clique em CONSULTAR para ver os resultados.
                    </td>
                  </tr>
                ) : loadingDocentes ? (
                  <tr>
                    <td colSpan={11} className="px-6 py-12 text-center text-sm text-slate-500">
                      Carregando dados dos docentes...
                    </td>
                  </tr>
                ) : docentesFiltrados.length > 0 ? (
                  docentesFiltrados.map((d, i) => (
                    <tr key={i} className="hover:bg-blue-50/30 dark:hover:bg-slate-900 text-sm text-slate-600 dark:text-slate-300">
                      <td className="px-6 py-5 text-slate-900 dark:text-white uppercase">{d.professor}</td>
                      <td className="px-3 py-5 whitespace-nowrap">{d.dataLotacao}</td>
                      <td className="px-3 py-5 text-blue-600 uppercase">{d.periodo}</td>
                      <td className="px-3 py-5">{d.turno}</td>
                      <td className="px-3 py-5">{d.ensino}</td>
                      <td className="px-3 py-5">{d.fase}</td>
                      <td className="px-3 py-5 uppercase font-medium">{d.turma}</td>
                      <td className="px-3 py-5">{d.componente}</td>
                      <td className="px-3 py-5 text-center">{d.pendNotas.toFixed(2)}</td>
                      <td className="px-3 py-5 text-center">{d.pendFreq.toFixed(2)}</td>
                      <td className="px-3 py-5 text-center">{d.pendObjeto.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="px-6 py-20 text-center text-sm text-slate-500 italic">
                      Nenhum docente encontrado para os critérios selecionados.
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
