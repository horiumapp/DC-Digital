import React, { useState, useEffect } from 'react';
import { Search, Check, Trash2, ArrowLeft } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useTurma, Aluno } from '../../contexts/TurmaContext';
import { useCaptcha } from '../../hooks/useCaptcha';
import { useToast } from '../common/Toast';


interface FrequenciaTabProps {
  selectedDate: string;
  tempoAula: string;
  setTempoAula: (v: string) => void;
  disponiveisTempos: string[];
  disabled?: boolean;
}

export default function FrequenciaTab({
  selectedDate,
  tempoAula,
  setTempoAula,
  disponiveisTempos,
  disabled,
}: FrequenciaTabProps) {
  const { turmaAtiva, alunos, registrarLancamento, removerLancamento, salvarFrequencia, buscarFrequencia, removerFrequencia, lancamentos } = useTurma();
  const { showError: showToastError } = useToast();
  
  const [studentData, setStudentData] = useState<Aluno[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showDeleteFreqModal, setShowDeleteFreqModal] = useState(false);

  const isLancado = lancamentos.some(l => 
    l.data === selectedDate && 
    l.tempo === tempoAula && 
    l.tipo === 'frequencia'
  );

  const {
    generatedCaptcha,
    captchaInput,
    setCaptchaInput,
    captchaError,
    generateNewCaptcha,
    validateCaptcha
  } = useCaptcha();

  // Carregar frequência do banco quando a data ou o tempo mudar
  useEffect(() => {
    if (turmaAtiva && selectedDate && tempoAula) {
      buscarFrequencia(selectedDate, tempoAula);
    }
  }, [selectedDate, tempoAula, turmaAtiva, buscarFrequencia]);

  // Sincronizar o estado local com os alunos do contexto (que agora vêm do banco)
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setStudentData(alunos.map(a => ({ ...a })));
  }, [alunos]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleFreq = (id: string) => {
    setStudentData(prev => prev.map(s => {
      if (s.id === id) {
        // Ciclo: P -> F -> FJ -> '' (Cinza) -> P
        const nextFreq = s.freq === 'P' ? 'F' : s.freq === 'F' ? 'FJ' : s.freq === 'FJ' ? '' : 'P';
        return { ...s, freq: nextFreq };
      }
      return s;
    }));
  };

  const togglePart = (id: string, part: string) => {
    setStudentData(prev => prev.map(s => s.id === id ? { ...s, part } : s));
  };

  const handleConfirm = async () => {
    if (validateCaptcha()) {
      if (turmaAtiva) {
        await salvarFrequencia(selectedDate, tempoAula, studentData);
        setIsLaunching(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else {
      showToastError('Código incorreto. Tente novamente.');
    }
  };

  const handleExcluirFrequencia = async () => {
    await removerFrequencia(selectedDate, tempoAula);
    generateNewCaptcha();
    setShowDeleteFreqModal(false);
    setIsLaunching(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
      
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
        {!isLaunching && (
          <button
            onClick={() => setIsLaunching(true)}
            disabled={disabled}
            className={`bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition h-[38px] shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Efetuar lançamento
          </button>
        )}
      </div>

      {isLaunching && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-slate-800">Alunos</h3>
            <div className="flex items-center gap-4">
              {isLancado && (
                <button
                  onClick={() => !disabled && setShowDeleteFreqModal(true)}
                  disabled={disabled}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 transition h-[38px] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir frequência
                </button>
              )}
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-4 py-2 bg-white">
                <span className="text-sm text-slate-600">Frequência(s) lançada(s):</span>
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Check className="w-4 h-4" />
                </div>
              </div>
              <div className="border border-slate-200 rounded-lg px-4 py-2 bg-white flex items-center gap-3">
                <span className="text-sm text-slate-600">Legenda</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs"><span className="w-4 h-4 rounded-full bg-slate-400"></span> Sem frequência</span>
                  <span className="flex items-center gap-1 text-xs"><span className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-[10px]">F</span> Falta</span>
                  <span className="flex items-center gap-1 text-xs"><span className="w-4 h-4 rounded-full bg-amber-400 text-white flex items-center justify-center font-bold text-[10px]">FJ</span> Falta Justificada</span>
                  <span className="flex items-center gap-1 text-xs"><span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-[10px]">P</span> Presença</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Pesquisar"
              className="w-full border border-blue-100 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0f2851] bg-white shadow-sm"
            />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-16">Nº</th>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3 text-center w-32">{tempoAula}</th>
                  <th className="px-4 py-3 text-center w-64">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentData.map((aluno, index) => (
                  <tr key={aluno.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                    <td className="px-4 py-3 text-slate-500 font-bold tabular-nums">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">{aluno.nome}</p>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mt-1">Matrícula: {aluno.matricula}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => !disabled && toggleFreq(aluno.id)}
                        disabled={disabled}
                        className={`w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-[10px] mx-auto transition-colors disabled:cursor-not-allowed
                          ${aluno.freq === 'P' ? 'bg-green-500' :
                            aluno.freq === 'F' ? 'bg-red-500' :
                            aluno.freq === 'FJ' ? 'bg-amber-400' : 'bg-slate-400'}`}
                      >
                        {aluno.freq}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center justify-center rounded-lg overflow-hidden border w-fit mx-auto transition-all ${!aluno.freq ? 'opacity-30 grayscale pointer-events-none border-slate-200' : 'border-blue-100 shadow-sm'}`}>
                        <button
                          disabled={disabled || !aluno.freq}
                          onClick={() => togglePart(aluno.id, 'Presencial')}
                          className={`px-4 py-1.5 text-xs font-bold transition-all ${aluno.part === 'Presencial' ? 'bg-[#0f2851] text-white' : 'bg-white text-[#0f2851] hover:bg-[#eef2ff]'}`}
                        >
                          Presencial
                        </button>
                        <button
                          disabled={disabled || !aluno.freq}
                          onClick={() => togglePart(aluno.id, 'Remoto')}
                          className={`px-4 py-1.5 text-xs font-bold transition-all border-l border-blue-100 ${aluno.part === 'Remoto' ? 'bg-[#0f2851] text-white' : 'bg-white text-[#0f2851] hover:bg-[#eef2ff]'}`}
                        >
                          Remoto
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span>Mostrando de 1 até {studentData.length} de {studentData.length} registros</span>
              <div className="flex items-center gap-2 ml-4">
                <span>Mostrar</span>
                <select className="border border-slate-300 rounded px-2 py-1">
                  <option>100</option><option>50</option><option>25</option>
                </select>
                <span>registros</span>
              </div>
            </div>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button className="px-3 py-1.5 bg-slate-50 text-slate-400 flex items-center gap-1 hover:bg-slate-100 transition">
                <ArrowLeft className="w-3 h-3" /> Anterior
              </button>
              <button className="px-3 py-1.5 bg-[#0f2851] text-white font-bold">1</button>
              <button className="px-3 py-1.5 bg-slate-50 text-slate-600 flex items-center gap-1 hover:bg-slate-100 transition border-l border-slate-200">
                Seguinte <ArrowLeft className="w-3 h-3 rotate-180" />
              </button>
            </div>
          </div>

          <div className="pt-6">
            {!disabled && (
              <Captcha
                generatedCaptcha={generatedCaptcha}
                captchaInput={captchaInput}
                setCaptchaInput={setCaptchaInput}
                captchaError={captchaError}
                generateNewCaptcha={generateNewCaptcha}
                className="mb-6"
              />
            )}
            <div className="flex items-center gap-3">
              {!disabled && (
                <button
                  onClick={handleConfirm}
                  className="flex items-center gap-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-bold hover:bg-[#e0e7ff] transition shadow-sm active:scale-95"
                >
                  <Check className="w-4 h-4" /> Confirmar
                </button>
              )}
              <button
                onClick={() => setIsLaunching(false)}
                className={`bg-white text-slate-600 border border-slate-200 px-6 py-2 rounded text-sm font-medium hover:bg-slate-50 transition ${disabled ? 'w-full py-3 text-base rounded-xl font-bold bg-slate-50 hover:bg-slate-100' : ''}`}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir (moved from Frequencia.tsx if we want it fully encapsulated) */}
      {showDeleteFreqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteFreqModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-800 mb-1">Excluir frequência</h3>
                <p className="text-sm text-slate-600">
                  Tem certeza que deseja excluir a frequência lançada para o dia <strong>{selectedDate}</strong>, tempo <strong>{tempoAula}</strong>?
                </p>
                <p className="text-xs text-red-600 mt-2 font-medium">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setShowDeleteFreqModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition">Cancelar</button>
              <button onClick={handleExcluirFrequencia} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded transition flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

