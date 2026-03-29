import React, { useState, useEffect } from 'react';
import { Eye, Pencil, Trash2, List, Save, Check, Calendar as CalendarIcon, Plus, Loader2, X } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useTurma, Avaliacao } from '../../contexts/TurmaContext';
import { useCaptcha } from '../../hooks/useCaptcha';
import { getBimestrePorData } from '../../utils/dateUtils';
import { formatMatricula } from '../../utils/formatters';

export default function AvaliacoesTab() {
  const { turmaAtiva, alunos, avaliacoes, loading, salvarAvaliacao, removerAvaliacao, salvarNotas } = useTurma();

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
      valorMaximo: 10
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
                {avaliacoes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      <List className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      Nenhuma avaliação registrada
                    </td>
                  </tr>
                ) : (
                  <>
                    {['1º Bimestre', '2º Bimestre', '3º Bimestre', '4º Bimestre'].map(bim => {
                      const avsBim = avaliacoes.filter(av => av.bimestre === bim);
                      if (avsBim.length === 0) return null;
                      return (
                        <React.Fragment key={bim}>
                          <tr className="bg-blue-50/50">
                            <td colSpan={4} className="px-6 py-2 font-black text-blue-600 text-[10px] uppercase tracking-tighter">{bim}</td>
                          </tr>
                          {avsBim.map((av) => (
                            <tr key={av.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-slate-900 font-bold">{av.tipo}</td>
                              <td className="px-6 py-4 text-slate-600 font-medium uppercase">{av.data}</td>
                              <td className="px-6 py-4 text-slate-500 text-xs font-semibold">{av.instrumento}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-center gap-2">
                                  <button onClick={() => { setSelectedAvaliacao(av); setAvaliacaoViewMode('details'); }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"><Eye className="w-4 h-4" /></button>
                                  <button onClick={() => { setSelectedAvaliacao(av); setSelectedDate(av.data); setInstrumentoAvaliacao(av.instrumento || 'AVALIACAO ESCRITA'); setObjetosAvaliacao(av.objetos || []); setAvaliacaoViewMode('edit'); }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil className="w-4 h-4" /></button>
                                  <button onClick={() => { setAvaliacaoToDelete(av); setShowDeleteModal(true); }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                                  <button onClick={() => { setSelectedAvaliacao(av); setAvaliacaoViewMode('grades'); }}
                                    className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-blue-700 transition shadow-md shadow-blue-600/20">Notas</button>
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
                  {isDatePickerOpen && (
                    <div className="absolute top-full left-0 mt-4 bg-white border border-slate-100 rounded-3xl shadow-2xl z-50 w-80 p-6 animate-in fade-in zoom-in-95 duration-200">
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {['D','S','T','Q','Q','S','S'].map((d, i) => <div key={i} className="text-[10px] font-black text-slate-300 text-center py-2">{d}</div>)}
                        {Array.from({length: 31}, (_, i) => {
                          const dateStr = `${String(i+1).padStart(2,'0')}/03/2026`;
                          return (
                            <button key={i} onClick={() => { setSelectedDate(dateStr); setIsDatePickerOpen(false); }} className={`aspect-square flex items-center justify-center text-xs font-bold rounded-xl transition-all ${selectedDate === dateStr ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'}`}>{i + 1}</button>
                          );
                        })}
                      </div>
                    </div>
                  )}
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
          <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-2xl relative overflow-hidden">
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
                {alunos.map((aluno, index) => (
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
              <p className="text-slate-500 font-medium leading-relaxed">As notas também serão apagadas. <br/>Deseja continuar?</p>
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
