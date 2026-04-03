import React, { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, List, Save, Check, Calendar as CalendarIcon, Plus, Loader2, X, ChevronLeft, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useTurma, Avaliacao } from '../../contexts/TurmaContext';
import { useCaptcha } from '../../hooks/useCaptcha';
import { getBimestrePorData } from '../../utils/dateUtils';
import { formatMatricula } from '../../utils/formatters';

export default function AvaliacoesTab() {
  const { turmaAtiva, alunos, avaliacoes, conteudos, loading, salvarAvaliacao, removerAvaliacao, salvarNotas } = useTurma();

  const [avaliacaoViewMode, setAvaliacaoViewMode] = useState<'list' | 'details' | 'edit' | 'grades'>('list');
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [instrumentoAvaliacao, setInstrumentoAvaliacao] = useState('AVALIACAO ESCRITA');
  const [objetosAvaliacao, setObjetosAvaliacao] = useState<any[]>([]);
  const [periodoLetivo, setPeriodoLetivo] = useState('');
  const [unidadeDidatica, setUnidadeDidatica] = useState('');
  const [objetoConhecimento, setObjetoConhecimento] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<any>(null);
  const [localNotas, setLocalNotas] = useState<Record<string, string>>({}); // alunoId -> valor string
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  // Gerar opções dinâmicas de Unidades Didáticas baseadas nos conteúdos lançados
  const unidadesOpcoes = React.useMemo(() => {
    if (!selectedDate || !conteudos) return [];
    const bimestreAtual = getBimestrePorData(selectedDate);
    
    // Filtrar conteúdos do mesmo bimestre e pegar unidades únicas
    const unidades = conteudos
      .filter(c => getBimestrePorData(c.data) === bimestreAtual)
      .map(c => c.habilidades[0]) // Assumindo habilidades[0] como Unidade
      .filter((u, index, self) => u && self.indexOf(u) === index);
      
    return unidades;
  }, [selectedDate, conteudos]);

  // Gerar opções dinâmicas de Objetos de Conhecimento baseadas na Unidade selecionada
  const objetosOpcoes = React.useMemo(() => {
    if (!unidadeDidatica || !conteudos) return [];
    
    const objetos = conteudos
      .filter(c => c.habilidades[0] === unidadeDidatica)
      .flatMap(c => c.objetos) // Pega todos os objetos daquela unidade
      .filter((o, index, self) => o && self.indexOf(o) === index);
      
    return objetos;
  }, [unidadeDidatica, conteudos]);

  const PERIODOS_LABELS: Record<string, string> = {
    '1º Bimestre': '1. BIMESTRE 05/02/2026 - 23/04/2026',
    '2º Bimestre': '2. BIMESTRE 28/04/2026 - 07/07/2026',
    '3º Bimestre': '3. BIMESTRE 21/07/2026 - 24/09/2026',
    '4º Bimestre': '4. BIMESTRE 28/09/2026 - 18/12/2026'
  };

  const {
    generatedCaptcha,
    captchaInput,
    setCaptchaInput,
    captchaError,
    generateNewCaptcha,
    validateCaptcha
  } = useCaptcha();

  // Ao entrar em modo de notas, carregar notas atuais
  useEffect(() => {
    if (avaliacaoViewMode === 'grades' && selectedAvaliacao) {
      const notasMap: Record<string, string> = {};
      
      // Se for RP, precisamos filtrar os alunos que ficaram abaixo de 6,0 na avaliação pai
      let alunosFiltrados = alunos;
      if (selectedAvaliacao.parent_id) {
        alunosFiltrados = alunos.filter(aluno => {
          const notaPai = parseFloat((aluno.notas?.[selectedAvaliacao.parent_id] || '0').replace(',', '.'));
          return notaPai < 6.0;
        });
      }

      alunosFiltrados.forEach(aluno => {
        if (aluno.notas && aluno.notas[selectedAvaliacao.id]) {
          notasMap[aluno.id] = aluno.notas[selectedAvaliacao.id];
        } else {
          notasMap[aluno.id] = '';
        }
      });
      setLocalNotas(notasMap);
    }
  }, [avaliacaoViewMode, selectedAvaliacao, alunos]);

  // Alunos que devem aparecer no lançamento de notas (filtrados se for RP)
  const alunosParaNotas = React.useMemo(() => {
    if (!selectedAvaliacao) return [];
    if (selectedAvaliacao.parent_id) {
      return alunos.filter(aluno => {
        const notaPai = parseFloat((aluno.notas?.[selectedAvaliacao.parent_id] || '0').replace(',', '.'));
        return notaPai < 6.0;
      });
    }
    return alunos;
  }, [selectedAvaliacao, alunos]);

  const handleNotaChange = (alunoId: string, val: string) => {
    // Máscara 0,00 com limite de 10,00
    let numStr = val.replace(/\D/g, '');
    if (!numStr) {
      setLocalNotas(prev => ({ ...prev, [alunoId]: '' }));
      return;
    }

    let numVal = parseInt(numStr, 10);
    if (numVal > 1000) numVal = 1000;

    const formatted = (numVal / 100).toFixed(2).replace('.', ',');
    setLocalNotas(prev => ({ ...prev, [alunoId]: formatted }));
  };

  const handleSaveAvaliacao = async () => {
    if (!validateCaptcha()) {
      alert('Código incorreto!');
      return;
    }

    if (!selectedDate) {
      alert('Selecione uma data para a avaliação!');
      return;
    }

    const payload: Avaliacao = {
      id: selectedAvaliacao ? selectedAvaliacao.id : `temp_${Date.now()}`,
      turmaId: turmaAtiva?.id || '',
      tipo: selectedAvaliacao ? selectedAvaliacao.tipo : `AV${String(avaliacoes.length + 1).padStart(2, '0')}`,
      data: selectedDate,
      instrumento: instrumentoAvaliacao,
      objetos: objetosAvaliacao,
      bimestre: getBimestrePorData(selectedDate),
      valorMaximo: 10,
      parent_id: selectedAvaliacao?.parent_id
    };

    await salvarAvaliacao(payload);
    setAvaliacaoViewMode('list');
    resetForm();
  };

  const resetForm = () => {
    setSelectedDate('');
    setObjetosAvaliacao([]);
    setSelectedAvaliacao(null);
    setCaptchaInput('');
    setPeriodoLetivo('');
    setUnidadeDidatica('');
    setObjetoConhecimento('');
    generateNewCaptcha();
  };

  const handleAdicionarObjeto = () => {
    if (!unidadeDidatica || !objetoConhecimento) {
      alert('Selecione a Unidade Didática e o Objeto de Conhecimento!');
      return;
    }
    const novoObjeto = { unidade: unidadeDidatica, objeto: objetoConhecimento };
    const jáExiste = objetosAvaliacao.some(o => o.unidade === novoObjeto.unidade && o.objeto === novoObjeto.objeto);
    if (jáExiste) {
      alert('Este objeto já foi adicionado!');
      return;
    }
    setObjetosAvaliacao(prev => [...prev, novoObjeto]);
  };

  const handleRemoverObjeto = (index: number) => {
    setObjetosAvaliacao(prev => prev.filter((_, i) => i !== index));
  };

  // Determinar período letivo pela data
  useEffect(() => {
    if (selectedDate) {
      const bim = getBimestrePorData(selectedDate);
      setPeriodoLetivo(bim);
      setUnidadeDidatica('');
      setObjetoConhecimento('');
    }
  }, [selectedDate]);

  const handleConfirmGrades = async () => {
    if (!validateCaptcha()) {
      alert('Código incorreto!');
      return;
    }

    if (!selectedAvaliacao) return;

    const notasToSave = Object.entries(localNotas)
      .filter(([_, val]) => val !== '')
      .map(([alunoId, val]) => ({ alunoId, valor: val }));

    await salvarNotas(selectedAvaliacao.id, notasToSave);
    setAvaliacaoViewMode('list');
    resetForm();
  };

  const confirmarExclusao = async () => {
    if (avaliacaoToDelete) {
      await removerAvaliacao(avaliacaoToDelete.id);
    }
    setShowDeleteModal(false);
    setAvaliacaoToDelete(null);
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-medium">Carregando dados da turma...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
      {avaliacaoViewMode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-end shadow-sm mb-2">
            <button
              onClick={() => {
                setSelectedAvaliacao(null);
                setSelectedDate('');
                setInstrumentoAvaliacao('AVALIACAO ESCRITA');
                setObjetosAvaliacao([]);
                setAvaliacaoViewMode('edit');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar Avaliação
            </button>
          </div>

          {avaliacoes.length > 0 && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                <tr>
                  <th className="px-6 py-4 font-black text-[10px] tracking-widest">Tipo</th>
                  <th className="px-6 py-4 font-black text-[10px] tracking-widest">Data</th>
                  <th className="px-6 py-4 font-black text-[10px] tracking-widest">Instrumento</th>
                  <th className="px-6 py-4 font-black text-[10px] tracking-widest text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map(bim => {
                  const avsBim = avaliacoes.filter(av => av.bimestre === bim && !av.parent_id);
                  if (avsBim.length === 0) return null;
                  return (
                    <React.Fragment key={bim}>
                      <tr className="bg-blue-50/50">
                        <td colSpan={4} className="px-6 py-2 font-black text-blue-600 text-[10px] uppercase tracking-tighter">{bim}</td>
                      </tr>
                      {avsBim.map((av) => (
                        <React.Fragment key={av.id}>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 flex items-center gap-2">
                              {/* Ícones de Status */}
                              <div className="flex gap-1">
                                <div className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center shadow-sm">
                                  <Check className="w-3 h-3" />
                                </div>
                                {avaliacoes.some(rp => rp.parent_id === av.id) && (
                                  <div className="w-5 h-5 bg-amber-400 text-white rounded-full flex items-center justify-center shadow-sm" title="Há alunos em recuperação paralela nesta avaliação.">
                                    <RefreshCw className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                              <span className="text-slate-900 font-bold">{av.tipo}</span>
                            </td>
                            <td className="px-6 py-4 text-slate-600 font-medium uppercase">{av.data}</td>
                            <td className="px-6 py-4 text-slate-500 text-xs font-semibold">{av.instrumento}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => { setSelectedAvaliacao(av); setAvaliacaoViewMode('details'); }}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-[10px] uppercase transition-all shadow-md shadow-blue-600/20">
                                  <Eye className="w-3.5 h-3.5" /> Detalhes
                                </button>
                                
                                <button onClick={() => { setSelectedAvaliacao(av); setSelectedDate(av.data); setInstrumentoAvaliacao(av.instrumento || 'AVALIACAO ESCRITA'); setObjetosAvaliacao(av.objetos || []); setAvaliacaoViewMode('edit'); }}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[10px] uppercase transition-all">
                                  <Pencil className="w-3.5 h-3.5" /> Alterar
                                </button>

                                <button onClick={() => { setAvaliacaoToDelete(av); setShowDeleteModal(true); }}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-bold text-[10px] uppercase transition-all shadow-md shadow-red-600/20">
                                  <Trash2 className="w-3.5 h-3.5" /> Remover
                                </button>

                                {alunos.some(aluno => {
                                  const nota = parseFloat((aluno.notas?.[av.id] || '').replace(',', '.'));
                                  return !isNaN(nota) && nota < 6.0;
                                }) && (
                                  <button 
                                    onClick={() => {
                                      const rpsCount = avaliacoes.filter(rp => rp.parent_id === av.id).length;
                                      const novoRP: any = {
                                        turmaId: av.turmaId,
                                        tipo: `RP${String(rpsCount + 1).padStart(2, '0')}`,
                                        data: new Date().toISOString().split('T')[0],
                                        instrumento: av.instrumento,
                                        objetos: av.objetos,
                                        bimestre: av.bimestre,
                                        valorMaximo: 10,
                                        parent_id: av.id
                                      };
                                      setSelectedAvaliacao(novoRP);
                                      setSelectedDate(novoRP.data);
                                      setInstrumentoAvaliacao(novoRP.instrumento);
                                      setObjetosAvaliacao(novoRP.objetos);
                                      setAvaliacaoViewMode('edit');
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-lg font-bold text-[10px] uppercase transition-all"
                                  >
                                    <Plus className="w-3.5 h-3.5" /> ADICIONAR RP
                                  </button>
                                )}

                                <button onClick={() => { setSelectedAvaliacao(av); setAvaliacaoViewMode('grades'); }}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-[10px] uppercase transition-all shadow-md shadow-blue-600/20">
                                  <List className="w-3.5 h-3.5" /> Notas
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Seção de Recuperações Paralelas */}
                          {avaliacoes.some(rp => rp.parent_id === av.id) && (
                            <>
                              <tr className="bg-slate-50/30">
                                <td colSpan={4} className="px-10 py-1.5 font-bold text-slate-500 text-[10px] uppercase tracking-tight">Recuperações Paralelas</td>
                              </tr>
                              {avaliacoes.filter(rp => rp.parent_id === av.id).map(rp => (
                                <tr key={rp.id} className="bg-slate-50/20 border-l-4 border-l-amber-400">
                                  <td className="px-10 py-3 text-slate-700 font-bold">{rp.tipo}</td>
                                  <td className="px-6 py-3 text-slate-600 font-medium uppercase">{rp.data}</td>
                                  <td className="px-6 py-3 text-slate-500 text-xs font-semibold">{rp.instrumento}</td>
                                  <td className="px-6 py-3">
                                    <div className="flex items-center justify-center gap-2">
                                      <button onClick={() => { setSelectedAvaliacao(rp); setAvaliacaoViewMode('details'); }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-[10px] uppercase transition-all shadow-md shadow-blue-600/20">
                                        <Eye className="w-3.5 h-3.5" /> Detalhes
                                      </button>
                                      
                                      <button onClick={() => { setSelectedAvaliacao(rp); setSelectedDate(rp.data); setInstrumentoAvaliacao(rp.instrumento); setObjetosAvaliacao(rp.objetos); setAvaliacaoViewMode('edit'); }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-[10px] uppercase transition-all">
                                        <Pencil className="w-3.5 h-3.5" /> Alterar
                                      </button>
                                      
                                      <button onClick={() => { setAvaliacaoToDelete(rp); setShowDeleteModal(true); }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-bold text-[10px] uppercase transition-all shadow-md shadow-red-600/20">
                                        <Trash2 className="w-3.5 h-3.5" /> Remover
                                      </button>

                                      <button onClick={() => { setSelectedAvaliacao(rp); setAvaliacaoViewMode('grades'); }}
                                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold text-[10px] uppercase transition-all shadow-md shadow-blue-600/20">
                                        <List className="w-3.5 h-3.5" /> Notas
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </>
                          )}
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}
      {avaliacaoViewMode === 'details' && selectedAvaliacao && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Eye className="w-5 h-5" />
              </div>
              Identificação da Avaliação
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Código da Avaliação</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700">AV-{String(selectedAvaliacao.id).padStart(6, '0')}</div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data da avaliação</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700">{selectedAvaliacao.data}</div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Valor da avaliação</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700">10,00</div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Instrumento pedagógico</label>
                <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold text-slate-700">{selectedAvaliacao.instrumento}</div>
              </div>
            </div>

            <h4 className="text-sm font-bold text-slate-700 mb-4">Objetos de Conhecimento da Avaliação</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                  <tr>
                    <th className="px-6 py-3 font-black text-[10px] tracking-widest">Unidade Didática</th>
                    <th className="px-6 py-3 font-black text-[10px] tracking-widest">Objeto de Conhecimento da avaliação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!selectedAvaliacao.objetos || selectedAvaliacao.objetos.length === 0) ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-5 text-center text-slate-400 text-sm font-medium">
                        Nenhum objeto de conhecimento vinculado
                      </td>
                    </tr>
                  ) : (
                    selectedAvaliacao.objetos.map((obj: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-slate-700 font-bold text-xs">{obj.unidade || '-'}</td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{obj.objeto || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <button
            onClick={() => { setAvaliacaoViewMode('list'); setSelectedAvaliacao(null); }}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
          >
            Voltar
          </button>
        </div>
      )}

      {avaliacaoViewMode === 'edit' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Pencil className="w-5 h-5" />
                </div>
                {selectedAvaliacao ? 'Alterar Avaliação' : 'Cadastrar Nova Avaliação'}
              </h3>
              <button onClick={() => setAvaliacaoViewMode('list')} className="text-slate-400 hover:text-slate-600 transition"><X /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Data da avaliação</label>
                <div className="relative">
                  <input type="text" value={selectedDate} readOnly onClick={() => setIsDatePickerOpen(!isDatePickerOpen)} placeholder="DD/MM/AAAA" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer" />
                  <CalendarIcon className="w-4 h-4 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  {isDatePickerOpen && (() => {
                    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                    const diasNoMes = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                    const primeiroDia = new Date(calendarYear, calendarMonth, 1).getDay();
                    const hoje = new Date();

                    const handlePrevMonth = () => {
                      if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
                      else setCalendarMonth(m => m - 1);
                    };
                    const handleNextMonth = () => {
                      if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
                      else setCalendarMonth(m => m + 1);
                    };

                    return (
                      <div className="absolute top-full left-0 mt-4 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 w-80 p-6 animate-in fade-in zoom-in-95 duration-200">
                        {/* Navegação Mês/Ano */}
                        <div className="flex items-center justify-between mb-5">
                          <button onClick={handlePrevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <div className="flex items-center gap-2">
                            <select value={calendarMonth} onChange={(e) => setCalendarMonth(Number(e.target.value))} className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-sm font-black text-slate-700 cursor-pointer appearance-none text-center focus:ring-2 focus:ring-blue-600/10">
                              {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                            <select value={calendarYear} onChange={(e) => setCalendarYear(Number(e.target.value))} className="bg-slate-50 border-none rounded-xl px-3 py-1.5 text-sm font-black text-slate-700 cursor-pointer appearance-none text-center focus:ring-2 focus:ring-blue-600/10">
                              {Array.from({ length: 21 }, (_, i) => 2020 + i).map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                          <button onClick={handleNextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Cabeçalho dias da semana */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {diasSemana.map((d, i) => <div key={i} className="text-[10px] font-black text-slate-400 text-center py-1.5 uppercase tracking-wider">{d}</div>)}
                        </div>

                        {/* Grid dos dias */}
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: primeiroDia }, (_, i) => <div key={`empty-${i}`} />)}
                          {Array.from({ length: diasNoMes }, (_, i) => {
                            const dia = i + 1;
                            const dateStr = `${String(dia).padStart(2, '0')}/${String(calendarMonth + 1).padStart(2, '0')}/${calendarYear}`;
                            const isSelected = selectedDate === dateStr;
                            const isToday = dia === hoje.getDate() && calendarMonth === hoje.getMonth() && calendarYear === hoje.getFullYear();
                            return (
                              <button
                                key={dia}
                                onClick={() => { setSelectedDate(dateStr); setIsDatePickerOpen(false); }}
                                className={`aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all ${
                                  isSelected
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                                    : isToday
                                      ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-600/20'
                                      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                                }`}
                              >
                                {dia}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
                {selectedDate && <p className="text-[10px] font-bold text-blue-600 ml-1">BIMESTRE: {getBimestrePorData(selectedDate)}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Instrumento Pedagógico</label>
                <select value={instrumentoAvaliacao} onChange={(e) => setInstrumentoAvaliacao(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer appearance-none">
                  <option value="AVALIACAO ESCRITA">AVALIAÇÃO ESCRITA</option>
                  <option value="AVALIACAO ORAL">AVALIAÇÃO ORAL</option>
                  <option value="TRABALHO">TRABALHO</option>
                  <option value="SEMINÁRIO">SEMINÁRIO</option>
                  <option value="EXERCÍCIOS">EXERCÍCIOS</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Valor Máximo</label>
                <div className="w-full bg-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-400 select-none">10,00</div>
              </div>
            </div>
          </div>

          {/* Objetos de Conhecimento da Avaliação */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <List className="w-5 h-5" />
              </div>
              Objetos de Conhecimento da Avaliação
            </h3>

            {!selectedDate ? (
              <div className="bg-slate-50 rounded-2xl px-6 py-4 text-sm font-medium text-slate-400">
                Selecione uma data para mostrar os Objetos de conhecimento
              </div>
            ) : (
              <div className="space-y-6">
                {/* Dropdowns */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Período letivo</label>
                      <select
                        value={periodoLetivo}
                        onChange={(e) => { setPeriodoLetivo(e.target.value); setUnidadeDidatica(''); setObjetoConhecimento(''); }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer"
                        disabled
                      >
                        <option value="">Selecione...</option>
                        {Object.entries(PERIODOS_LABELS).map(([bim, label]) => (
                          <option key={bim} value={bim}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Unidade didática</label>
                      <select
                        value={unidadeDidatica}
                        onChange={(e) => { setUnidadeDidatica(e.target.value); setObjetoConhecimento(''); }}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer"
                        disabled={!periodoLetivo || unidadesOpcoes.length === 0}
                      >
                        <option value="">{unidadesOpcoes.length > 0 ? "Selecione..." : "Nenhuma unidade lançada"}</option>
                        {unidadesOpcoes.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Objeto de Conhecimento</label>
                      <select
                        value={objetoConhecimento}
                        onChange={(e) => setObjetoConhecimento(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-600/10 cursor-pointer"
                        disabled={!unidadeDidatica || objetosOpcoes.length === 0}
                      >
                        <option value="">{objetosOpcoes.length > 0 ? "Selecione..." : "Nenhum objeto lançado"}</option>
                        {objetosOpcoes.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={handleAdicionarObjeto}
                      disabled={!objetoConhecimento}
                      className="bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-sm font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-600/20 whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                </div>

                {/* Tabela de objetos adicionados */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
                      <tr>
                        <th className="px-6 py-3 font-black text-[10px] tracking-widest">Unidade Didática</th>
                        <th className="px-6 py-3 font-black text-[10px] tracking-widest">Objeto de Conhecimento da avaliação</th>
                        <th className="px-6 py-3 font-black text-[10px] tracking-widest text-center w-28">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {objetosAvaliacao.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-6 py-5 text-center text-slate-400 text-sm font-medium">
                            Clique em Adicionar para inserir os Objetos de conhecimento na tabela
                          </td>
                        </tr>
                      ) : (
                        objetosAvaliacao.map((obj, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-slate-700 font-bold text-xs">{obj.unidade}</td>
                            <td className="px-6 py-4 text-slate-600 text-xs">{obj.objeto}</td>
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleRemoverObjeto(idx)}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-red-700 transition flex items-center gap-1.5 mx-auto shadow-md shadow-red-600/20"
                              >
                                Excluir <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
            <Captcha generatedCaptcha={generatedCaptcha} captchaInput={captchaInput} setCaptchaInput={setCaptchaInput} captchaError={captchaError} generateNewCaptcha={generateNewCaptcha} className="mb-8" />
            <div className="flex gap-4">
              <button onClick={handleSaveAvaliacao} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-3"><Save className="w-5 h-5" /> Salvar Avaliação</button>
              <button onClick={() => setAvaliacaoViewMode('list')} className="px-10 bg-slate-100 text-slate-500 py-4 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition">Sair</button>
            </div>
          </div>
        </div>
      )}

      {avaliacaoViewMode === 'grades' && selectedAvaliacao && (
        <div className="space-y-6">
          <div className="bg-blue-600 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full -mr-20 -mt-20"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <List className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Lançamento de Notas</h3>
                  <p className="text-slate-400 text-sm font-medium">{selectedAvaliacao.tipo} • {selectedAvaliacao.instrumento}</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">Data: {selectedAvaliacao.data}</div>
                <div className="bg-white/5 backdrop-blur-md px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">Escala: 0 a 10,0</div>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-[32px] overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 uppercase">
                <tr>
                  <th className="px-8 py-5 font-black text-[10px] tracking-widest w-20">Nº</th>
                  <th className="px-8 py-5 font-black text-[10px] tracking-widest">Aluno</th>
                  <th className="px-8 py-5 font-black text-[10px] tracking-widest w-56 text-center">Nota (0,0 a 10,0)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {alunosParaNotas.map((aluno, index) => (
                  <tr key={aluno.id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-6 text-slate-400 font-bold tabular-nums">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-8 py-6">
                      <p className="text-base font-bold text-slate-700">{aluno.nome}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1">Matrícula: {formatMatricula(aluno.id)}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="relative max-w-[140px] mx-auto">
                        <input type="text" placeholder="0,00" value={localNotas[aluno.id] || ''} onChange={(e) => handleNotaChange(aluno.id, e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-center text-lg font-black text-blue-600 focus:ring-2 focus:ring-blue-600/20 transition-all group-hover:bg-white placeholder:text-slate-200" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
            <Captcha generatedCaptcha={generatedCaptcha} captchaInput={captchaInput} setCaptchaInput={setCaptchaInput} captchaError={captchaError} generateNewCaptcha={generateNewCaptcha} className="mb-8" />
            <div className="flex gap-4">
              <button onClick={handleConfirmGrades} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3"><Check className="w-6 h-6" /> Confirmar Notas</button>
              <button onClick={() => setAvaliacaoViewMode('list')} className="px-12 bg-slate-100 text-slate-500 py-5 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition">Voltar</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                <Trash2 className="w-12 h-12" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 mb-3">Remover?</h3>
              <p className="text-slate-500 font-medium leading-relaxed">As notas também serão apagadas. <br />Deseja continuar?</p>
            </div>
            <div className="bg-slate-50 p-8 flex gap-4">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-6 py-4 bg-white text-slate-600 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-slate-200 transition">Voltar</button>
              <button onClick={confirmarExclusao} className="flex-1 px-6 py-4 bg-red-600 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-red-700 transition shadow-lg shadow-red-600/20 text-center">Sim, Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
