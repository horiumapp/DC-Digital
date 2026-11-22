import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Check, Trash2, Users, AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useTurma, Aluno } from '../../contexts/TurmaContext';
import { useCaptcha } from '../../hooks/useCaptcha';
import { useUnsavedChangesWarning } from '../../hooks/useUnsavedChangesWarning';
import { useToast } from '../common/Toast';
import { formatarDataParaExibicao } from '../../utils/dateUtils';
import { proximoPassoAposFrequencia } from '../../utils/frequenciaFluxo';

interface FrequenciaTabProps {
  selectedDate: string;
  tempoAula: string;
  setTempoAula: (v: string) => void;
  disponiveisTempos: string[];
  disabled?: boolean;
  onDiaSemPendencia?: () => void;
}

export default function FrequenciaTab({
  selectedDate,
  tempoAula,
  setTempoAula,
  disponiveisTempos,
  disabled,
  onDiaSemPendencia,
}: FrequenciaTabProps) {
  const { 
    turmaAtiva, 
    alunos, 
    salvarFrequencia, 
    buscarFrequencia, 
    removerFrequencia, 
    lancamentos 
  } = useTurma();
  const { showError: showToastError } = useToast();
  
  const [studentData, setStudentData] = useState<Aluno[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteFreqModal, setShowDeleteFreqModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [presenceFilter,setPresenceFilter]=useState<'all'|'P'|'F'|'FJ'|'unmarked'>('all');
  useUnsavedChangesWarning(isLaunching);

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

  // Carregar frequência quando a data ou o tempo mudar
  useEffect(() => {
    if (turmaAtiva && selectedDate && tempoAula) {
      buscarFrequencia(selectedDate, tempoAula);
    }
  }, [selectedDate, tempoAula, turmaAtiva, buscarFrequencia]);

  // Sincronizar estado local com os alunos
  useEffect(() => {
    setStudentData(alunos.map(a => ({ ...a })));
  }, [alunos]);

  const dataLegivel = formatarDataParaExibicao(selectedDate);

  // Estatísticas pedagógicas em tempo real
  const stats = useMemo(() => {
    const total = studentData.length;
    const presentes = studentData.filter(s => s.freq === 'P').length;
    const faltas = studentData.filter(s => s.freq === 'F').length;
    const justificadas = studentData.filter(s => s.freq === 'FJ').length;
    const pendentes = studentData.filter(s => !s.freq).length;
    return { total, presentes, faltas, justificadas, pendentes };
  }, [studentData]);

  const setDirectFreq = (id: string, freq: 'P' | 'F' | '') => {
    setStudentData(prev => prev.map(s => {
      if (s.id === id) {
        if (s.atestado) return s;
        return { 
          ...s, 
          freq, 
          part: freq && !s.part ? 'Presencial' : s.part 
        };
      }
      return s;
    }));
  };

  const togglePart = (id: string, part: string) => {
    setStudentData(prev => prev.map(s => s.id === id ? { ...s, part } : s));
  };

  const markAllPresent = () => {
    setStudentData(prev => prev.map(student => (
      student.atestado ? student : {
        ...student,
        freq: 'P',
        part: student.part || 'Presencial',
      }
    )));
  };

  const visibleStudents = studentData.filter(student => 
    student.nome.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()) || 
    student.matricula?.includes(searchTerm)
  ).filter(student=>presenceFilter==='all'||(presenceFilter==='unmarked'?!student.freq:student.freq===presenceFilter));

  const handleConfirm = async () => {
    if (isSaving) return;
    if (validateCaptcha()) {
      if (turmaAtiva) {
        setIsSaving(true);
        try {
          const ok = await salvarFrequencia(selectedDate, tempoAula, studentData);
          if (ok) {
            setIsLaunching(false);
            setCaptchaInput('');
            generateNewCaptcha();
            window.scrollTo({ top: 0, behavior: 'smooth' });

            const passo = proximoPassoAposFrequencia(disponiveisTempos, tempoAula, lancamentos, selectedDate);
            if (passo.tipo === 'proximo-tempo') setTempoAula(passo.tempo);
            else onDiaSemPendencia?.();
          }
        } finally {
          setIsSaving(false);
        }
      }
    } else {
      showToastError('Código de confirmação incorreto. Tente novamente.');
    }
  };

  const handleExcluirFrequencia = async () => {
    const ok = await removerFrequencia(selectedDate, tempoAula);
    if (ok) {
      generateNewCaptcha();
      setShowDeleteFreqModal(false);
      setIsLaunching(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label htmlFor="tempo-aula-select" className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
              Tempo da Aula
            </label>
            <select
              id="tempo-aula-select"
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#6354c7]/10 focus:border-[#6354c7] min-w-[140px]"
              value={tempoAula}
              onChange={(e) => setTempoAula(e.target.value)}
            >
              {disponiveisTempos.map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 sm:pt-5">
            {isLancado ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Check className="w-3.5 h-3.5" /> Frequência lançada neste tempo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Lançamento pendente
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isLaunching ? (
            <>
              <button
                onClick={() => setIsLaunching(true)}
                disabled={disabled}
                className="inline-flex items-center justify-center gap-2 bg-[#6354c7] hover:bg-[#5142ad] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLancado ? 'Editar Frequência' : 'Efetuar Lançamento'}
              </button>
              <Link
                to={`/diario?date=${selectedDate}${turmaAtiva?.id ? `&turmaId=${turmaAtiva.id}` : ''}`}
                className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Diário
              </Link>
            </>
          ) : (
            <button
              onClick={() => setIsLaunching(false)}
              className="inline-flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
            >
              Recolher
            </button>
          )}
        </div>
      </div>

      {!isLaunching && isLancado && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800">Frequência gravada em {dataLegivel}, {tempoAula}</p>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {studentData.map((aluno) => (
              <li key={aluno.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-800 dark:text-slate-100">{aluno.nome}</span>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{aluno.freq === 'P' ? 'Presente' : aluno.freq === 'F' ? 'Falta' : aluno.freq === 'FJ' ? 'Falta justificada' : 'Sem registro'}{aluno.part ? ` · ${aluno.part}` : ''}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isLaunching && !isLancado && (
        <p role="status" className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
          Nenhuma frequência gravada para {dataLegivel}, {tempoAula}. Ao abrir o lançamento, todos começam marcados como presentes. Isso ainda não é um registro.
        </p>
      )}

      {isLaunching && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Quick Metrics Bar & Actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Real-time counters */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Users className="w-4 h-4 text-slate-400" />
                <span>Total: <strong className="text-slate-900 dark:text-white font-bold">{stats.total}</strong></span>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>{isLancado ? 'Presentes gravados' : 'Marcados presentes'}: <strong className="font-bold">{stats.presentes}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>Faltas: <strong className="font-bold">{stats.faltas}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Justificadas: <strong className="font-bold">{stats.justificadas}</strong></span>
              </div>
              {stats.pendentes > 0 && (
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>Pendentes: <strong className="font-bold">{stats.pendentes}</strong></span>
                </div>
              )}
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {!disabled && (
                <button 
                  onClick={markAllPresent} 
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition shadow-sm cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Marcar todos presentes
                </button>
              )}
              {isLancado && (
                <button
                  onClick={() => !disabled && setShowDeleteFreqModal(true)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/80 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  Excluir frequência
                </button>
              )}
            </div>
          </div>

          {/* Search bar & Legend */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou matrícula..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6354c7]/10 focus:border-[#6354c7] shadow-sm"
              />
            </div>

            {/* Legend Bar */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl">
              <span className="font-bold text-slate-700 dark:text-slate-300">Legenda:</span>
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold text-[9px] flex items-center justify-center">P</span>
                Presença
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[9px] flex items-center justify-center">F</span>
                Falta
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-bold text-[9px] flex items-center justify-center">FJ</span>
                Falta justificada pelo atestado da secretaria
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600" />
                Sem lançamento
              </span>
            </div>
          </div>

          <div className="portal-presence-filters" aria-label="Filtrar estudantes por frequência">{([{id:'all',label:'Todos',count:stats.total},{id:'P',label:'Presentes',count:stats.presentes},{id:'F',label:'Faltas',count:stats.faltas},{id:'FJ',label:'Justificadas',count:stats.justificadas},{id:'unmarked',label:'Sem marcação',count:stats.pendentes}] as const).map(item=><button key={item.id} aria-pressed={presenceFilter===item.id} onClick={()=>setPresenceFilter(item.id)}>{item.label}<span>{item.count}</span></button>)}</div>{visibleStudents.length===0&&<p className="portal-filter-empty" role="status">Nenhum estudante neste filtro. <button onClick={()=>{setPresenceFilter('all');setSearchTerm('')}}>Limpar filtros</button></p>}

          <div className="portal-attendance-list" role="list" aria-label={`Frequência ${tempoAula}`}>
            {visibleStudents.map((aluno, index) => {
              const statusLabel = aluno.freq === 'P' ? 'Presente' : aluno.freq === 'F' ? 'Falta' : aluno.freq === 'FJ' ? 'Justificada' : 'Sem marcação';
              return (
                <div key={aluno.id} role="listitem" className="portal-attendance-row">
                  <div className="portal-attendance-identity">
                    <span className="portal-attendance-index" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="portal-attendance-name-block">
                      <p className="portal-attendance-name">{aluno.nome}</p>
                      <p className="portal-attendance-meta">
                        {aluno.matricula ? `Mat. ${aluno.matricula}` : 'Sem matrícula'}
                        <span aria-hidden="true"> · </span>
                        <span className={
                          aluno.freq === 'P' ? 'text-emerald-700 dark:text-emerald-400'
                            : aluno.freq === 'F' ? 'text-rose-700 dark:text-rose-400'
                            : aluno.freq === 'FJ' ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-400 dark:text-slate-500'
                        }>
                          {statusLabel}
                        </span>
                        {aluno.atestado ? <span className="portal-attendance-atestado"> · Atestado</span> : null}
                      </p>
                    </div>
                  </div>

                  <div className="portal-attendance-controls">
                    {aluno.atestado ? (
                      <span
                        className="portal-attendance-fj"
                        title="Falta justificada pelo atestado da secretaria"
                        aria-label={`Falta justificada de ${aluno.nome}`}
                      >
                        FJ
                      </span>
                    ) : (
                      <div className="portal-attendance-freq" role="group" aria-label={`Frequência de ${aluno.nome}`}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && setDirectFreq(aluno.id, aluno.freq === 'P' ? '' : 'P')}
                          aria-label={`Presença de ${aluno.nome}`}
                          aria-pressed={aluno.freq === 'P'}
                          className={aluno.freq === 'P' ? 'is-active-p' : undefined}
                        >
                          P
                        </button>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => !disabled && setDirectFreq(aluno.id, aluno.freq === 'F' ? '' : 'F')}
                          aria-label={`Falta de ${aluno.nome}`}
                          aria-pressed={aluno.freq === 'F'}
                          className={aluno.freq === 'F' ? 'is-active-f' : undefined}
                        >
                          F
                        </button>
                      </div>
                    )}

                    <div
                      className={`portal-attendance-part${!aluno.freq ? ' is-disabled' : ''}`}
                      role="group"
                      aria-label={`Participação de ${aluno.nome}`}
                    >
                      <button
                        type="button"
                        disabled={disabled || !aluno.freq}
                        onClick={() => togglePart(aluno.id, 'Presencial')}
                        aria-pressed={aluno.part === 'Presencial'}
                        className={aluno.part === 'Presencial' ? 'is-active' : undefined}
                      >
                        Pres
                      </button>
                      <button
                        type="button"
                        disabled={disabled || !aluno.freq}
                        onClick={() => togglePart(aluno.id, 'Remoto')}
                        aria-pressed={aluno.part === 'Remoto'}
                        className={aluno.part === 'Remoto' ? 'is-active' : undefined}
                      >
                        Rem
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Registration Count Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Mostrando {visibleStudents.length} de {studentData.length} alunos</span>
            <span>Total da turma: {studentData.length} matriculados</span>
          </div>

          {/* Captcha & Save Action Bar */}
          <div className="portal-attendance-save bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            {!disabled && (
              <div className="max-w-md">
                <Captcha
                  generatedCaptcha={generatedCaptcha}
                  captchaInput={captchaInput}
                  setCaptchaInput={setCaptchaInput}
                  captchaError={captchaError}
                  generateNewCaptcha={generateNewCaptcha}
                  className="mb-2"
                />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!disabled ? (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 bg-[#6354c7] hover:bg-[#5142ad] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#6354c7]/15 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Gravar {turmaAtiva?.fase || 'turma'} · {dataLegivel} · {tempoAula}
                    </>
                  )}
                </button>
              ) : (
                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Período letivo fechado — edições não são permitidas.
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsLaunching(false)}
                className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir Frequência */}
      {showDeleteFreqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" 
            onClick={() => setShowDeleteFreqModal(false)} 
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  Excluir frequência lançada
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Tem certeza que deseja excluir a frequência da aula de <strong>{selectedDate}</strong>, no tempo <strong>{tempoAula}</strong>?
                </p>
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
                  Esta ação removerá todos os registros de presença deste tempo.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button 
                type="button"
                onClick={() => setShowDeleteFreqModal(false)} 
                className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleExcluirFrequencia} 
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
