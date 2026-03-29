import React, { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, List, Save, Check, Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus, Loader2 } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useTurma, Avaliacao } from '../../contexts/TurmaContext';
import { useCaptcha } from '../../hooks/useCaptcha';
import { getBimestrePorData } from '../../utils/dateUtils';

export default function AvaliacoesTab() {
  const { alunos, avaliacoes, loading, salvarAvaliacao, removerAvaliacao, salvarNotas } = useTurma();

  const [avaliacaoViewMode, setAvaliacaoViewMode] = useState<'list' | 'details' | 'edit' | 'grades'>('list');
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [instrumentoAvaliacao, setInstrumentoAvaliacao] = useState('AVALIACAO ESCRITA');
  const [objetosAvaliacao, setObjetosAvaliacao] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<any>(null);
  const [localNotas, setLocalNotas] = useState<Record<string, string>>({}); // alunoId -> valor string

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
      alunos.forEach(aluno => {
        if (aluno.notas && aluno.notas[selectedAvaliacao.id]) {
          notasMap[aluno.id] = aluno.notas[selectedAvaliacao.id];
        } else {
          notasMap[aluno.id] = '';
        }
      });
      setLocalNotas(notasMap);
    }
  }, [avaliacaoViewMode, selectedAvaliacao, alunos]);

  const handleNotaChange = (alunoId: string, val: string) => {
    // Máscara 0,00 com limite de 10,00
    let numStr = val.replace(/\D/g, '');
    if (!numStr) {
      setLocalNotas(prev => ({ ...prev, [alunoId]: '' }));
      return;
    }

    let numVal = parseInt(numStr, 10);
    // Bloquear valores maiores que 1000 (representing 10.00)
    if (numVal > 1000) {
      numVal = 1000;
    }

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
      id: selectedAvaliacao ? selectedAvaliacao.id : String(Date.now()),
      turmaId: 1, // Será ignorado se estivermos enviando para a função do contexto que já sabe a turma
      tipo: selectedAvaliacao ? selectedAvaliacao.tipo : `AV${String(avaliacoes.length + 1).padStart(2, '0')}`,
      data: selectedDate,
      instrumento: instrumentoAvaliacao,
      objetos: objetosAvaliacao,
      bimestre: getBimestrePorData(selectedDate),
      valorMaximo: 10
    };

    await salvarAvaliacao(payload);
    setAvaliacaoViewMode('list');
    setSelectedDate('');
    setObjetosAvaliacao([]);
    setSelectedAvaliacao(null);
    setCaptchaInput('');
    generateNewCaptcha();
  };

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
    setSelectedAvaliacao(null);
    setCaptchaInput('');
    generateNewCaptcha();
  };

  const confirmarExclusao = async () => {
    if (avaliacaoToDelete) {
      await removerAvaliacao(avaliacaoToDelete.id);
    }
    setShowDeleteModal(false);
    setAvaliacaoToDelete(null);
  };

  const bimestresVisiveis = Array.from(new Set(avaliacoes.map(av => av.bimestre).filter(Boolean)));

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
          <div className="flex items-end gap-4 mb-2">
            <button
              onClick={() => {
                setSelectedAvaliacao(null);
                setSelectedDate('');
                setInstrumentoAvaliacao('AVALIACAO ESCRITA');
                setObjetosAvaliacao([]);
                setAvaliacaoViewMode('edit');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition h-[38px] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar Avaliação
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Tipo da Avaliação</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Instrumento Pedagógico</th>
                  <th className="px-4 py-3 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {avaliacoes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 bg-white">
                      <List className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      Nenhuma avaliação cadastrada nesta turma
                    </td>
                  </tr>
                ) : (
                  <>
                    {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map(bim => {
                      const avsBim = avaliacoes.filter(av => av.bimestre === bim);
                      if (avsBim.length === 0) return null;
                      
                      return (
                        <React.Fragment key={bim}>
                          <tr className="bg-blue-50/50 border-b border-blue-100">
                            <td colSpan={4} className="px-4 py-2 font-black text-blue-600 text-[10px] uppercase tracking-widest">{bim}</td>
                          </tr>
                          {avsBim.map((av) => (
                            <tr key={av.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 bg-white">
                              <td className="px-4 py-3 text-slate-700 font-bold">{av.tipo}</td>
                              <td className="px-4 py-3 text-slate-600 uppercase font-medium">{av.data}</td>
                              <td className="px-4 py-3 text-slate-500 text-xs font-semibold">{av.instrumento}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => { setSelectedAvaliacao(av); setAvaliacaoViewMode('details'); }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition" title="Ver detalhes">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setSelectedAvaliacao(av); setSelectedDate(av.data); setInstrumentoAvaliacao(av.instrumento || 'AVALIACAO ESCRITA'); setObjetosAvaliacao(av.objetos || []); setAvaliacaoViewMode('edit'); }}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition" title="Alterar">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setAvaliacaoToDelete(av); setShowDeleteModal(true); }}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition" title="Remover">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setSelectedAvaliacao(av); setAvaliacaoViewMode('grades'); }}
                                    className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1">
                                    <List className="w-3 h-3" /> Notas
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {avaliacaoViewMode === 'edit' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-600" />
              {selectedAvaliacao ? 'Editar Avaliação' : 'Identificação da Nova Avaliação'}
            </h3>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Data da avaliação</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedDate}
                    readOnly
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    placeholder="DD/MM/AAAA"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 bg-slate-50 cursor-pointer pr-10"
                  />
                  <div onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="absolute right-0 top-0 bottom-0 bg-blue-600 flex items-center justify-center px-3 rounded-r-lg cursor-pointer hover:bg-blue-700 transition">
                    <CalendarIcon className="w-4 h-4 text-white" />
                  </div>
                  {isDatePickerOpen && (
                    <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 w-72 p-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i} className="text-[10px] font-black text-slate-400 py-1">{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({length: 31}, (_, i) => {
                          const dateStr = `${String(i+1).padStart(2,'0')}/03/2026`;
                          return (
                            <button key={i}
                              onClick={() => { setSelectedDate(dateStr); setIsDatePickerOpen(false); }}
                              className={`py-2 text-xs font-bold rounded-lg transition-all ${selectedDate === dateStr ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}
                            >{i + 1}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {selectedDate && (
                  <p className="mt-1.5 text-[10px] font-black text-blue-600 uppercase">
                    Detectado: {getBimestrePorData(selectedDate)}
                  </p>
                )}
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Valor Máximo</label>
                <input type="text" readOnly value="10,0" className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-400 bg-slate-100 cursor-not-allowed" />
              </div>
              <div className="col-span-7">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Instrumento pedagógico</label>
                <select value={instrumentoAvaliacao} onChange={(e) => setInstrumentoAvaliacao(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20 bg-white cursor-pointer">
                  <option value="AVALIACAO ESCRITA">AVALIACAO ESCRITA</option>
                  <option value="AVALIACAO ORAL">AVALIACAO ORAL</option>
                  <option value="TRABALHO">TRABALHO</option>
                  <option value="SEMINARIO">SEMINARIO</option>
                  <option value="EXERCICIOS">EXERCICIOS</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Captcha
              generatedCaptcha={generatedCaptcha}
              captchaInput={captchaInput}
              setCaptchaInput={setCaptchaInput}
              captchaError={captchaError}
              generateNewCaptcha={generateNewCaptcha}
              className="mb-8"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAvaliacao}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
              >
                <Save className="w-4 h-4" /> Salvar Avaliação
              </button>
              <button onClick={() => { setAvaliacaoViewMode('list'); setSelectedDate(''); setObjetosAvaliacao([]); setSelectedAvaliacao(null); setCaptchaInput(''); generateNewCaptcha(); }}
                className="bg-slate-200 text-slate-700 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-300 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {avaliacaoViewMode === 'grades' && selectedAvaliacao && (
        <div className="space-y-6">
          <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-xl shadow-blue-600/20">
            <h3 className="text-xl font-bold flex items-center gap-3">
              <List className="w-6 h-6" />
              Lançamento de Notas: {selectedAvaliacao.tipo}
            </h3>
            <p className="text-blue-100 text-sm font-medium mt-1">
              Data: {selectedAvaliacao.data} • {selectedAvaliacao.bimestre} • Máx: 10,0
            </p>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-16">Nº</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Aluno</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48 text-center">Nota (0,00 a 10,00)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {alunos.map((aluno, index) => (
                  <tr key={aluno.id} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4 text-slate-400 font-bold tabular-nums">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{aluno.nome}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Matrícula: {aluno.id.padStart(8, '0')}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative max-w-[120px] mx-auto">
                        <input 
                          type="text" 
                          placeholder="0,00"
                          value={localNotas[aluno.id] || ''}
                          onChange={(e) => handleNotaChange(aluno.id, e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-black text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 bg-slate-50 transition-all group-hover:bg-white" 
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2">
            <Captcha
              generatedCaptcha={generatedCaptcha}
              captchaInput={captchaInput}
              setCaptchaInput={setCaptchaInput}
              captchaError={captchaError}
              generateNewCaptcha={generateNewCaptcha}
              className="mb-8"
            />
            <div className="flex items-center gap-4">
              <button onClick={handleConfirmGrades}
                className="flex items-center gap-2 bg-blue-600 text-white px-10 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-600/20">
                <Check className="w-5 h-5" /> Confirmar Notas
              </button>
              <button onClick={() => { setAvaliacaoViewMode('list'); setSelectedAvaliacao(null); setCaptchaInput(''); generateNewCaptcha(); }}
                className="bg-slate-100 text-slate-500 px-8 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-slate-200 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Remover Avaliação?</h3>
              <p className="text-slate-500 text-sm">
                Tem certeza que deseja remover esta avaliação? <br />
                <strong>As notas dos alunos vinculadas a ela também serão perdidas.</strong>
              </p>
            </div>
            <div className="bg-slate-50 p-6 flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition">Não, Voltar</button>
              <button onClick={confirmarExclusao} className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition">Sim, Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
      {avaliacaoViewMode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-end gap-4 mb-2">
            <button
              onClick={() => {
                setSelectedAvaliacao(null);
                setSelectedDate('');
                setInstrumentoAvaliacao('AVALIACAO ESCRITA');
                setObjetosAvaliacao([]);
                setAvaliacaoViewMode('edit');
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition h-[38px] flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Adicionar Avaliação
            </button>
          </div>

          {showAvaliacaoTable && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Tipo da Avaliação</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                    <th className="px-4 py-3 font-medium">Instrumento Pedagógico</th>
                    <th className="px-4 py-3 font-medium text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {avaliacoes.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-slate-500 bg-white">Nenhum registro encontrado</td>
                    </tr>
                  ) : (
                    <>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <td colSpan={4} className="px-4 py-2 font-bold text-slate-700 text-xs">1. BIMESTRE</td>
                      </tr>
                      {avaliacoes.map((av) => (
                        <tr key={av.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 bg-white">
                        <td className="px-4 py-3 text-slate-700">{av.tipo}</td>
                        <td className="px-4 py-3 text-slate-700">{av.data}</td>
                        <td className="px-4 py-3 text-slate-700">{av.instrumento}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => { setSelectedAvaliacao(av); setAvaliacaoViewMode('details'); }}
                              className="bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-600 transition flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Detalhes
                            </button>
                            <button onClick={() => { setSelectedAvaliacao(av); setSelectedDate(av.data); setInstrumentoAvaliacao(av.instrumento || 'AVALIACAO ESCRITA'); setObjetosAvaliacao(av.objetos || []); setAvaliacaoViewMode('edit'); }}
                              className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-200 transition flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Alterar
                            </button>
                            <button onClick={() => { setAvaliacaoToDelete(av); setShowDeleteModal(true); }}
                              className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> Remover
                            </button>
                            <button onClick={() => { setSelectedAvaliacao(av); setAvaliacaoViewMode('grades'); }}
                              className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-200 transition flex items-center gap-1">
                              <List className="w-3 h-3" /> Notas
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    </>
                  )}
                </tbody>
              </table>
              {avaliacoes.length > 0 && (
                <div className="px-4 py-3 bg-white border-t border-slate-200 text-sm text-slate-600">
                  Mostrando de 1 até {avaliacoes.length} de {avaliacoes.length} registros
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {avaliacaoViewMode === 'edit' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base text-slate-700 mb-4">Identificação da Avaliação</h3>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Data da avaliação</label>
                <div className="relative">
                  <input
                    type="text"
                    value={selectedDate}
                    readOnly
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-slate-50 cursor-pointer pr-10"
                  />
                  <div onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="absolute right-0 top-0 bottom-0 bg-blue-600 flex items-center justify-center px-3 rounded-r cursor-pointer hover:bg-blue-700 transition">
                    <CalendarIcon className="w-4 h-4 text-white" />
                  </div>
                  {isDatePickerOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-blue-200 rounded-lg shadow-lg z-50 w-64 p-2">
                      <div className="flex items-center justify-between mb-2 bg-blue-100/50 p-1 rounded">
                        <button className="p-1 hover:bg-blue-200 rounded"><ChevronLeft className="w-4 h-4" /></button>
                        <div className="flex gap-1">
                          <select className="bg-transparent text-sm font-medium outline-none cursor-pointer"><option>Mar</option></select>
                          <select className="bg-transparent text-sm font-medium outline-none cursor-pointer"><option>2026</option></select>
                        </div>
                        <button className="p-1 hover:bg-blue-200 rounded"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center mb-1">
                        {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i} className="text-[10px] font-bold text-slate-400 py-1">{d}</div>)}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({length: 31}, (_, i) => (
                          <button key={i}
                            onClick={() => { setSelectedDate(`${String(i+1).padStart(2,'0')}/03/2026`); setIsDatePickerOpen(false); }}
                            className={`py-1 text-xs rounded hover:bg-blue-600 hover:text-white transition ${selectedDate === `${String(i+1).padStart(2,'0')}/03/2026` ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
                          >{i + 1}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-slate-600 mb-1">Valor da avaliação</label>
                <input type="text" defaultValue="10,00" className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white" />
              </div>
              <div className="col-span-8">
                <label className="block text-sm text-slate-600 mb-1">Instrumento pedagógico</label>
                <select value={instrumentoAvaliacao} onChange={(e) => setInstrumentoAvaliacao(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                  <option value="AVALIACAO ESCRITA">AVALIACAO ESCRITA</option>
                  <option value="AVALIACAO ORAL">AVALIACAO ORAL</option>
                  <option value="TRABALHO">TRABALHO</option>
                  <option value="TRABALHO EM GRUPO">TRABALHO EM GRUPO</option>
                  <option value="SEMINARIO">SEMINARIO</option>
                  <option value="EXERCICIOS">EXERCICIOS</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base text-slate-700 mb-4">Objetos de Conhecimento da Avaliação</h3>
            <div className="grid grid-cols-12 gap-3 items-end mb-3">
              <div className="col-span-3">
                <label className="block text-xs text-blue-600 font-medium mb-1">Período letivo</label>
                <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                  <option>1. BIMESTRE 05/02/2026 - 23/04/2026</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs text-blue-600 font-medium mb-1">Unidade didática</label>
                <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                  <option>GEOMETRIA PLANA</option>
                </select>
              </div>
              <div className="col-span-4">
                <label className="block text-xs text-blue-600 font-medium mb-1">Objeto de Conhecimento</label>
                <select className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white">
                  <option>POLÍGONOS REGULARES</option>
                </select>
              </div>
              <div className="col-span-2">
                <button
                  onClick={() => setObjetosAvaliacao([...objetosAvaliacao, { id: String(Date.now()), unidade: 'GEOMETRIA PLANA', objeto: 'POLÍGONOS REGULARES' }])}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 transition flex items-center justify-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Unidade Didática</th>
                    <th className="px-4 py-3 font-medium">Objeto de Conhecimento da avaliação</th>
                    <th className="px-4 py-3 font-medium w-24 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {objetosAvaliacao.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-blue-500 italic bg-white">
                        Clique em Adicionar para inserir os Objetos de conhecimento na tabela
                      </td>
                    </tr>
                  ) : (
                    objetosAvaliacao.map(obj => (
                      <tr key={obj.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 bg-white">
                        <td className="px-4 py-3 text-slate-700 font-medium">{obj.unidade}</td>
                        <td className="px-4 py-3 text-slate-700">{obj.objeto}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setObjetosAvaliacao(objetosAvaliacao.filter(o => o.id !== obj.id))}
                            className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-600 transition ml-auto">
                            <Trash2 className="w-3 h-3" /> Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2">
            <Captcha
              generatedCaptcha={generatedCaptcha}
              captchaInput={captchaInput}
              setCaptchaInput={setCaptchaInput}
              captchaError={captchaError}
              generateNewCaptcha={generateNewCaptcha}
              className="mb-6"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveAvaliacao}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
              >
                <Save className="w-4 h-4" /> Salvar
              </button>
              <button onClick={() => { setAvaliacaoViewMode('list'); setSelectedDate(''); setObjetosAvaliacao([]); setSelectedAvaliacao(null); setCaptchaInput(''); generateNewCaptcha(); }}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded text-sm font-medium hover:bg-slate-300 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {avaliacaoViewMode === 'details' && selectedAvaliacao && (
        <div className="space-y-6">
          <h3 className="text-base text-slate-700 mb-4">Identificação da Avaliação</h3>
          <div className="border border-slate-200 rounded-lg p-6 bg-white space-y-6">
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Código da Avaliação</label>
                <input type="text" readOnly value={`AV-${selectedAvaliacao.id.slice(-4)}`} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 bg-slate-50" />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Data da avaliação</label>
                <input type="text" readOnly value={selectedAvaliacao.data} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 bg-slate-50" />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor da avaliação</label>
                <input type="text" readOnly value="10,00" className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 bg-slate-50" />
              </div>
              <div className="col-span-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Instrumento pedagógico</label>
                <input type="text" readOnly value={selectedAvaliacao.instrumento} className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 bg-slate-50" />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Objetos de Conhecimento da Avaliação</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Unidade Didática</th>
                      <th className="px-4 py-3 font-medium">Objeto de Conhecimento da avaliação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAvaliacao.objetos && selectedAvaliacao.objetos.length > 0 ? (
                      selectedAvaliacao.objetos.map((obj: any) => (
                        <tr key={obj.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-700">{obj.unidade}</td>
                          <td className="px-4 py-3 text-slate-700">{obj.objeto}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={2} className="px-4 py-4 text-center text-slate-500">Nenhum objeto de conhecimento vinculado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <button onClick={() => { setAvaliacaoViewMode('list'); setSelectedAvaliacao(null); }}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition">
              Voltar
            </button>
          </div>
        </div>
      )}

      {avaliacaoViewMode === 'grades' && selectedAvaliacao && (
        <div className="space-y-6">
          <h3 className="text-base text-slate-700 mb-4">Avaliação: {selectedAvaliacao.tipo} em {selectedAvaliacao.data}</h3>
          <div className="relative">
            <input type="text" placeholder="Pesquisar"
              className="w-full border border-slate-300 rounded px-3 py-2 pl-9 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-slate-50" />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium w-16">Nº</th>
                  <th className="px-4 py-3 font-medium">Nome do Aluno</th>
                  <th className="px-4 py-3 font-medium w-48">Nota</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, index) => (
                  <tr key={aluno.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 bg-blue-50/30">
                    <td className="px-4 py-3 text-slate-700">{index + 1}</td>
                    <td className="px-4 py-3 text-slate-700">{aluno.nome}</td>
                    <td className="px-4 py-3">
                      <input type="text" placeholder="S/N"
                        onChange={handleNotaChange}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white placeholder-slate-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-white border-t border-slate-200 text-sm text-slate-600 flex items-center justify-between">
              <span>Mostrando de 1 até {alunos.length} de {alunos.length} registros</span>
              <div className="flex items-center gap-1">
                <button className="px-3 py-1 border border-slate-300 rounded text-slate-500 hover:bg-slate-50 transition flex items-center gap-1">
                  <ChevronLeft className="w-4 h-4" /> Anterior
                </button>
                <button className="px-3 py-1 bg-blue-600 text-white rounded font-medium">1</button>
                <button className="px-3 py-1 border border-slate-300 rounded text-slate-500 hover:bg-slate-50 transition flex items-center gap-1">
                  Seguinte <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        <div className="pt-2">
            <Captcha
              generatedCaptcha={generatedCaptcha}
              captchaInput={captchaInput}
              setCaptchaInput={setCaptchaInput}
              captchaError={captchaError}
              generateNewCaptcha={generateNewCaptcha}
              className="mb-6"
            />
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer border border-slate-200 px-3 py-2 rounded bg-slate-50">
                <input type="checkbox" className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Emitir Mapa das Notas?
              </label>
              <button onClick={handleConfirmGrades}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition">
                <Check className="w-4 h-4" /> Confirmar
              </button>
              <button onClick={() => { setAvaliacaoViewMode('list'); setSelectedAvaliacao(null); setCaptchaInput(''); generateNewCaptcha(); }}
                className="bg-slate-200 text-slate-700 px-6 py-2 rounded text-sm font-medium hover:bg-slate-300 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && avaliacaoToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-medium text-slate-800">Confirmar Exclusão</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600 mb-6">
                Tem certeza que deseja remover a avaliação <strong>{avaliacaoToDelete.tipo}</strong> do dia <strong>{avaliacaoToDelete.data}</strong>? Esta ação não poderá ser desfeita.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button onClick={() => { setShowDeleteModal(false); setAvaliacaoToDelete(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition">
                  Cancelar
                </button>
                <button onClick={confirmarExclusao}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
