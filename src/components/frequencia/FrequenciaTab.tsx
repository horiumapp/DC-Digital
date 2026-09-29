import React, { useState, useEffect, useMemo } from 'react';
import { Search, Check, Trash2, Users, AlertTriangle, RefreshCw } from 'lucide-react';
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

  // Estatísticas pedagógicas em tempo real
  const stats = useMemo(() => {
    const total = studentData.length;
    const presentes = studentData.filter(s => s.freq === 'P').length;
    const faltas = studentData.filter(s => s.freq === 'F').length;
    const justificadas = studentData.filter(s => s.freq === 'FJ').length;
    const pendentes = studentData.filter(s => !s.freq).length;
    return { total, presentes, faltas, justificadas, pendentes };
  }, [studentData]);

  const toggleFreq = (id: string) => {
    setStudentData(prev => prev.map(s => {
      if (s.id === id) {
        // Ciclo ergonômico: P -> F -> FJ -> '' -> P
        const nextFreq = s.freq === 'P' ? 'F' : s.freq === 'F' ? 'FJ' : s.freq === 'FJ' ? '' : 'P';
        return { 
          ...s, 
          freq: nextFreq,
          part: nextFreq && !s.part ? 'Presencial' : s.part 
        };
      }
      return s;
    }));
  };

  const setDirectFreq = (id: string, freq: 'P' | 'F' | 'FJ' | '') => {
    setStudentData(prev => prev.map(s => {
      if (s.id === id) {
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
    setStudentData(prev => prev.map(student => ({ 
      ...student, 
      freq: 'P', 
      part: student.part || 'Presencial' 
    })));
  };

  const visibleStudents = studentData.filter(student => 
    student.nome.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()) || 
    student.matricula?.includes(searchTerm)
  );

  const handleConfirm = async () => {
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

            // Auto-advance para o próximo tempo pendente (ou próximo sequencial)
            const nextPendingTempo = disponiveisTempos.find(t => 
              t !== tempoAula && !lancamentos.some(l => l.data === selectedDate && l.tempo === t && l.tipo === 'frequencia')
            );
            if (nextPendingTempo) {
              setTempoAula(nextPendingTempo);
            } else {
              const currentIndex = disponiveisTempos.indexOf(tempoAula);
              if (currentIndex >= 0 && currentIndex < disponiveisTempos.length - 1) {
                setTempoAula(disponiveisTempos[currentIndex + 1]);
              }
            }
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
              className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#0b1f3f]/10 focus:border-[#0b1f3f] min-w-[140px]"
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

        <div className="flex items-center gap-2">
          {!isLaunching ? (
            <button
              onClick={() => setIsLaunching(true)}
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 bg-[#0b1f3f] hover:bg-[#133060] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLancado ? 'Editar Frequência' : 'Efetuar Lançamento'}
            </button>
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
                <span>Presentes: <strong className="font-bold">{stats.presentes}</strong></span>
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
                className="w-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0b1f3f]/10 focus:border-[#0b1f3f] shadow-sm"
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
                Falta Justificada
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600" />
                Sem lançamento
              </span>
            </div>
          </div>

          {/* Student Attendance List: Mobile Cards (< md) & Desktop Table (>= md) */}
          
          {/* Mobile Attendance Cards */}
          <div className="md:hidden space-y-3">
            {visibleStudents.map((aluno, index) => (
              <div 
                key={aluno.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3.5"
              >
                {/* Card Header: Index, Name, Registration */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center tabular-nums mt-0.5">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {aluno.nome}
                      </h4>
                      {aluno.matricula && (
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                          Matrícula: {aluno.matricula}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {aluno.freq && (
                    <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-extrabold text-white shadow-xs ${
                      aluno.freq === 'P' 
                        ? 'bg-emerald-600' 
                        : aluno.freq === 'F' 
                        ? 'bg-rose-600' 
                        : 'bg-amber-600'
                    }`}>
                      {aluno.freq === 'P' ? 'Presente' : aluno.freq === 'F' ? 'Falta' : 'Justificada'}
                    </span>
                  )}
                </div>

                {/* Frequency Selector: Circle Buttons (P / F / FJ) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Frequência ({tempoAula})
                    </label>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Toque para selecionar</span>
                  </div>
                  <div className="flex items-center gap-4 justify-start">
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setDirectFreq(aluno.id, aluno.freq === 'P' ? '' : 'P')}
                      aria-label="Presença"
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black transition-all active:scale-90 cursor-pointer disabled:cursor-not-allowed ${
                        aluno.freq === 'P'
                          ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300/50 dark:ring-emerald-700/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600'
                      }`}
                    >
                      P
                    </button>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setDirectFreq(aluno.id, aluno.freq === 'F' ? '' : 'F')}
                      aria-label="Falta"
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black transition-all active:scale-90 cursor-pointer disabled:cursor-not-allowed ${
                        aluno.freq === 'F'
                          ? 'bg-rose-500 text-white shadow-md ring-2 ring-rose-300/50 dark:ring-rose-700/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-rose-400 hover:text-rose-600'
                      }`}
                    >
                      F
                    </button>

                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && setDirectFreq(aluno.id, aluno.freq === 'FJ' ? '' : 'FJ')}
                      aria-label="Falta Justificada"
                      className={`w-11 h-11 rounded-full flex items-center justify-center text-[11px] font-black transition-all active:scale-90 cursor-pointer disabled:cursor-not-allowed ${
                        aluno.freq === 'FJ'
                          ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300/50 dark:ring-amber-700/50'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600'
                      }`}
                    >
                      FJ
                    </button>
                  </div>
                </div>

                {/* Participation Selector: Full-Width 50%/50% Segmented Pill */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Participação
                  </label>
                  <div className={`flex w-full rounded-xl overflow-hidden border transition-all ${
                    !aluno.freq
                      ? 'opacity-40 grayscale pointer-events-none border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-xs'
                  }`}>
                    <button
                      type="button"
                      disabled={disabled || !aluno.freq}
                      onClick={() => togglePart(aluno.id, 'Presencial')}
                      className={`flex-1 py-2.5 px-3 text-center text-xs font-bold transition-all cursor-pointer ${
                        aluno.part === 'Presencial'
                          ? 'bg-[#0b1f3f] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                      }`}
                    >
                      Presencial
                    </button>
                    <button
                      type="button"
                      disabled={disabled || !aluno.freq}
                      onClick={() => togglePart(aluno.id, 'Remoto')}
                      className={`flex-1 py-2.5 px-3 text-center text-xs font-bold transition-all border-l border-slate-200 dark:border-slate-700 cursor-pointer ${
                        aluno.part === 'Remoto'
                          ? 'bg-[#0b1f3f] text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                      }`}
                    >
                      Remoto
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Attendance Table (>= md) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wider border-b border-slate-200/80 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5 w-16 text-center">Nº</th>
                  <th className="px-4 py-3.5">Estudante</th>
                  <th className="px-4 py-3.5 text-center w-48">{tempoAula}</th>
                  <th className="px-4 py-3.5 text-center w-56">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {visibleStudents.map((aluno, index) => (
                  <tr 
                    key={aluno.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                      index % 2 === 0 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/30 dark:bg-slate-800/20'
                    }`}
                  >
                    <td className="px-4 py-3.5 text-center text-slate-500 dark:text-slate-400 font-bold tabular-nums">
                      {String(index + 1).padStart(2, '0')}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        {aluno.nome}
                      </p>
                      {aluno.matricula && (
                        <p className="text-[11px] font-mono text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                          Matrícula: {aluno.matricula}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center justify-center gap-2">
                        {/* Main Touch Toggle Button */}
                        <button
                          type="button"
                          onClick={() => !disabled && toggleFreq(aluno.id)}
                          disabled={disabled}
                          title="Clique para alternar P → F → FJ"
                          aria-label={`Status de frequência de ${aluno.nome}: ${aluno.freq || 'não lançado'}`}
                          className={`w-8 h-8 rounded-full text-white font-black text-xs flex items-center justify-center transition-all transform active:scale-90 shadow-sm cursor-pointer disabled:cursor-not-allowed ${
                            aluno.freq === 'P'
                              ? 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700'
                              : aluno.freq === 'F'
                              ? 'bg-rose-500 ring-2 ring-rose-300 dark:ring-rose-700'
                              : aluno.freq === 'FJ'
                              ? 'bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-700'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-600 hover:bg-slate-300'
                          }`}
                        >
                          {aluno.freq || '—'}
                        </button>

                        {/* Quick 1-click status shortcuts for desktop */}
                        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                          <button
                            type="button"
                            onClick={() => !disabled && setDirectFreq(aluno.id, 'P')}
                            disabled={disabled}
                            title="Presença"
                            className={`w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer ${aluno.freq === 'P' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'}`}
                          >
                            P
                          </button>
                          <button
                            type="button"
                            onClick={() => !disabled && setDirectFreq(aluno.id, 'F')}
                            disabled={disabled}
                            title="Falta"
                            className={`w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer ${aluno.freq === 'F' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-500 hover:text-rose-700 hover:bg-rose-50'}`}
                          >
                            F
                          </button>
                          <button
                            type="button"
                            onClick={() => !disabled && setDirectFreq(aluno.id, 'FJ')}
                            disabled={disabled}
                            title="Falta Justificada"
                            className={`w-6 h-6 rounded text-[11px] font-bold transition-all cursor-pointer ${aluno.freq === 'FJ' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'}`}
                          >
                            FJ
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className={`inline-flex rounded-xl overflow-hidden border transition-all min-w-[170px] ${
                        !aluno.freq 
                          ? 'opacity-40 grayscale pointer-events-none border-slate-200 dark:border-slate-700' 
                          : 'border-slate-200 dark:border-slate-700 shadow-sm'
                      }`}>
                        <button
                          type="button"
                          disabled={disabled || !aluno.freq}
                          onClick={() => togglePart(aluno.id, 'Presencial')}
                          className={`px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                            aluno.part === 'Presencial' 
                              ? 'bg-[#0b1f3f] text-white' 
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
                        >
                          Presencial
                        </button>
                        <button
                          type="button"
                          disabled={disabled || !aluno.freq}
                          onClick={() => togglePart(aluno.id, 'Remoto')}
                          className={`px-3.5 py-1.5 text-xs font-bold transition-all border-l border-slate-200 dark:border-slate-700 cursor-pointer ${
                            aluno.part === 'Remoto' 
                              ? 'bg-[#0b1f3f] text-white' 
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                          }`}
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

          {/* Registration Count Info */}
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span>Mostrando {visibleStudents.length} de {studentData.length} alunos</span>
            <span>Total da turma: {studentData.length} matriculados</span>
          </div>

          {/* Captcha & Save Action Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
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
                  className="inline-flex items-center gap-2 bg-[#0b1f3f] hover:bg-[#133060] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-[#0b1f3f]/15 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Gravando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Confirmar e Gravar Frequência
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
