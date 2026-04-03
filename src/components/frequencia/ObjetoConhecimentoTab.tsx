import React, { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useTurma } from '../../contexts/TurmaContext';
import { useCaptcha } from '../../hooks/useCaptcha';

interface ObjetoConhecimentoTabProps {
  turmaAtiva: any;
  selectedDate: string;
  tempoAula: string;
  setTempoAula: (v: string) => void;
  disponiveisTempos: string[];
}

export default function ObjetoConhecimentoTab({
  turmaAtiva,
  selectedDate,
  tempoAula,
  setTempoAula,
  disponiveisTempos,
}: ObjetoConhecimentoTabProps) {
  const { registrarLancamento, removerLancamento, salvarConteudo, buscarConteudo, removerConteudo, lancamentos } = useTurma();

  const isLancado = lancamentos.some(l => 
    l.data === selectedDate && 
    l.tempo === tempoAula && 
    l.tipo === 'conteudo'
  );

  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [isAddingObjeto, setIsAddingObjeto] = useState(false);
  const [objetoSalvo, setObjetoSalvo] = useState(false);
  const [objetoData, setObjetoData] = useState<{ descricao: string; observacao: string; status: string } | null>(null);
  
  const [objetoUnidade, setObjetoUnidade] = useState('AS ORIGENS, O PENSAMENTO RACIONAL E O PENSAMENTO..');
  const [objetoConhecimento, setObjetoConhecimento] = useState('O MITO (GREGOS E AMAZÔNICOS)');
  const [objetoObservacao, setObjetoObservacao] = useState('');
  const [objetoStatus, setObjetoStatus] = useState('Ministrado');
  
  const [showObjetoTable, setShowObjetoTable] = useState(false);
  const [showNoRecordsObjeto, setShowNoRecordsObjeto] = useState(false);
  const [showDeleteObjetoModal, setShowDeleteObjetoModal] = useState(false);

  // Carregar do banco de dados ao mudar data ou tempo
  React.useEffect(() => {
    const carregar = async () => {
      if (turmaAtiva && selectedDate && tempoAula) {
        const dados = await buscarConteudo(selectedDate, tempoAula);
        if (dados) {
          setObjetoSalvo(true);
          setObjetoData({
            descricao: dados.objetos[0] || '',
            observacao: dados.descricao || '',
            status: 'Ministrado' // Simplificado para o exemplo
          });
          setObjetoConhecimento(dados.objetos[0] || '');
          setObjetoUnidade(dados.habilidades[0] || '');
          setObjetoObservacao(dados.descricao || '');
        } else {
          setObjetoSalvo(false);
          setObjetoData(null);
          setShowObjetoTable(false);
        }
      }
    };
    carregar();
  }, [selectedDate, tempoAula, turmaAtiva]);

  const {
    generatedCaptcha,
    captchaInput,
    setCaptchaInput,
    captchaError,
    generateNewCaptcha,
    validateCaptcha
  } = useCaptcha();

  const handleExcluirObjeto = async () => {
    await removerConteudo(selectedDate, tempoAula);
    setObjetoSalvo(false);
    setObjetoData(null);
    setShowObjetoTable(false);
    setShowSuccessAlert(false);
    setObjetoObservacao('');
    setCaptchaInput('');
    generateNewCaptcha();
    setShowDeleteObjetoModal(false);
  };

  const handleSave = async () => {
    if (validateCaptcha()) {
      await salvarConteudo({
        turmaId: turmaAtiva?.id || 0,
        data: selectedDate,
        tempo: tempoAula,
        objetos: [objetoConhecimento],
        habilidades: [objetoUnidade],
        descricao: objetoObservacao
      });

      setObjetoData({ descricao: objetoConhecimento, observacao: objetoObservacao, status: objetoStatus });
      setShowSuccessAlert(true);
      setObjetoSalvo(true);
      setShowObjetoTable(false);
      setIsAddingObjeto(false);
      setCaptchaInput('');
      generateNewCaptcha();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert('Código incorreto!');
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300 relative">
      {showSuccessAlert && (
        <div className="bg-emerald-100/80 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
          <span className="text-sm font-medium">Dados cadastrados com sucesso!</span>
          <button onClick={() => setShowSuccessAlert(false)} className="text-emerald-600 hover:text-emerald-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      {!isAddingObjeto ? (
        <>
          <div className="flex items-end gap-4 mb-6">
            <div className="w-64">
              <label className="block text-sm text-slate-600 mb-1">Tempo da aula</label>
              <select
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500"
                value={tempoAula}
                onChange={(e) => setTempoAula(e.target.value)}
              >
                {disponiveisTempos.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (objetoSalvo && objetoData) {
                  setShowObjetoTable(true);
                  setShowNoRecordsObjeto(false);
                } else {
                  setShowNoRecordsObjeto(true);
                  setShowObjetoTable(false);
                }
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition h-[38px]"
            >
              Exibir
            </button>
            <button
              onClick={() => {
                setShowObjetoTable(false);
                setShowNoRecordsObjeto(false);
                setIsAddingObjeto(true);
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition h-[38px] flex items-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Adicionar Objeto de Conhecimento
            </button>
          </div>

          {showNoRecordsObjeto && !showObjetoTable && (
            <div className="bg-red-100/80 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium">NENHUM REGISTRO ENCONTRADO.</span>
              <button onClick={() => setShowNoRecordsObjeto(false)} className="text-red-600 hover:text-red-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {showObjetoTable && objetoData && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Descrição</th>
                    <th className="px-4 py-3 font-medium">Observações</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 text-slate-700">{objetoData.descricao}</td>
                    <td className="px-4 py-3 text-slate-500">{objetoData.observacao || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">{objetoData.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setShowObjetoTable(false); setIsAddingObjeto(true); }}
                          className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-200 transition"
                        >
                          <Pencil className="w-3 h-3" /> Alterar
                        </button>
                        <button
                          onClick={() => setShowDeleteObjetoModal(true)}
                          className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition"
                        >
                          <Trash2 className="w-3 h-3" /> Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="px-4 py-3 bg-white border-t border-slate-200 text-sm text-slate-600">
                Mostrando de 1 até 1 de <span className="font-bold text-blue-600">1</span> registros
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <label className="block text-sm text-slate-600 mb-1">Unidade didática</label>
              <select
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                value={objetoUnidade}
                onChange={(e) => setObjetoUnidade(e.target.value)}
              >
                <option>AS ORIGENS, O PENSAMENTO RACIONAL E O PENSAMENTO..</option>
              </select>
            </div>
            <div className="col-span-4">
              <label className="block text-sm text-slate-600 mb-1">Objeto de Conhecimento</label>
              <select
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                value={objetoConhecimento}
                onChange={(e) => setObjetoConhecimento(e.target.value)}
              >
                <option>O MITO (GREGOS E AMAZÔNICOS)</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Tempo de aula</label>
              <select
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                value={tempoAula}
                onChange={(e) => setTempoAula(e.target.value)}
              >
                {disponiveisTempos.map((t: string) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm text-slate-600 mb-1">Status</label>
              <select
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                value={objetoStatus}
                onChange={(e) => setObjetoStatus(e.target.value)}
              >
                <option>Ministrado</option>
                <option>Planejado</option>
                <option>Em andamento</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Observação</label>
            <textarea
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 min-h-[120px] resize-y bg-slate-50/50"
              value={objetoObservacao}
              onChange={(e) => setObjetoObservacao(e.target.value)}
            />
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
                onClick={handleSave}
                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium hover:bg-blue-700 transition"
              >
                <Check className="w-4 h-4" /> Confirmar
              </button>
              <button onClick={() => setIsAddingObjeto(false)} className="bg-slate-200 text-slate-700 px-6 py-2 rounded text-sm font-medium hover:bg-slate-300 transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir (Moved from Frequencia.tsx) */}
      {showDeleteObjetoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteObjetoModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800 mb-1">Excluir Objeto de Conhecimento</h3>
                <p className="text-sm text-slate-600">
                  Tem certeza que deseja excluir o objeto de conhecimento lançado para o dia <strong>{selectedDate}</strong>, tempo <strong>{tempoAula}</strong>?
                </p>
                <p className="text-xs text-red-600 mt-2 font-medium">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowDeleteObjetoModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition">Cancelar</button>
              <button onClick={handleExcluirObjeto} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
