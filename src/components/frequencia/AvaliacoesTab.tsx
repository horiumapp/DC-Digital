import React, { useState } from 'react';
import { Eye, Pencil, Trash2, List, Save, Check, Search, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useTurma, Avaliacao } from '../../contexts/TurmaContext';
import { useCaptcha } from '../../hooks/useCaptcha';

export default function AvaliacoesTab() {
  const { alunos, avaliacoes, salvarAvaliacao, removerAvaliacao } = useTurma();

  const [avaliacaoViewMode, setAvaliacaoViewMode] = useState<'list' | 'details' | 'edit' | 'grades'>('list');
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [instrumentoAvaliacao, setInstrumentoAvaliacao] = useState('AVALIACAO ESCRITA');
  const [objetosAvaliacao, setObjetosAvaliacao] = useState<any[]>([]);
  const [showAvaliacaoTable, setShowAvaliacaoTable] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<any>(null);

  const {
    generatedCaptcha,
    captchaInput,
    setCaptchaInput,
    captchaError,
    generateNewCaptcha,
    validateCaptcha
  } = useCaptcha();

  const handleNotaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    if (!val) {
      e.target.value = '';
      return;
    }

    let numStr = val.replace(/\D/g, '');
    
    if (!numStr) {
      e.target.value = '';
      return;
    }

    let numVal = parseInt(numStr, 10);

    if (numVal > 1000) {
      numStr = numStr.slice(0, -1);
      numVal = parseInt(numStr, 10);
      
      if (numVal > 1000) {
        numVal = 1000;
      }
    }

    let num = numVal / 100;
    e.target.value = num.toFixed(2).replace('.', ',');
  };

  const handleSaveAvaliacao = () => {
    if (!validateCaptcha()) {
      alert('Código incorreto!');
      return;
    }

    const novaAvaliacao: Avaliacao = {
      id: selectedAvaliacao ? selectedAvaliacao.id : String(Date.now()),
      turmaId: 1,
      tipo: selectedAvaliacao ? selectedAvaliacao.tipo : 'AV01',
      data: selectedDate || '13/03/2026',
      instrumento: instrumentoAvaliacao,
      objetos: objetosAvaliacao
    };

    salvarAvaliacao(novaAvaliacao);
    setAvaliacaoViewMode('list');
    setShowAvaliacaoTable(true);
    setSelectedDate('');
    setObjetosAvaliacao([]);
    setSelectedAvaliacao(null);
    setCaptchaInput('');
    generateNewCaptcha();
  };

  const handleConfirmGrades = () => {
    if (!validateCaptcha()) {
      alert('Código incorreto!');
      return;
    }
    setAvaliacaoViewMode('list');
    setSelectedAvaliacao(null);
    setCaptchaInput('');
    generateNewCaptcha();
  };

  const confirmarExclusao = () => {
    if (avaliacaoToDelete) {
      removerAvaliacao(avaliacaoToDelete.id);
    }
    setShowDeleteModal(false);
    setAvaliacaoToDelete(null);
  };

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
