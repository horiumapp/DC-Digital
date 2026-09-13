import React, { useState, useEffect, useCallback } from 'react';
import { X, BookOpen, Building2, Edit2, Check, Loader2, LogIn, RotateCw, Maximize2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/db';

export interface ScheduleTurmaItem {
  id?: string;
  nome?: string;
  turno?: string;
  componente_horario?: string;
}

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  professorId?: string;
  escolaId?: string;
}

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7];

const ScheduleModal = React.memo(function ScheduleModal({ isOpen, onClose, professorId, escolaId }: ScheduleModalProps) {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, ScheduleTurmaItem>>({});
  const [turmas, setTurmas] = useState<ScheduleTurmaItem[]>([]);
  const [professorDisciplinas, setProfessorDisciplinas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const toggleOrientation = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        }
        if (window.screen.orientation && 'lock' in window.screen.orientation) {
          await (window.screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        if (window.screen.orientation && 'unlock' in window.screen.orientation) {
          (window.screen.orientation as any).unlock();
        }
        if (document.exitFullscreen) {
          await document.exitFullscreen().catch(() => {});
        }
      }
    } catch {
      // Falha silenciosa em navegadores sem suporte
    }
  }, []);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      if (window.screen.orientation && 'unlock' in window.screen.orientation) {
        (window.screen.orientation as any).unlock();
      }
      document.exitFullscreen().catch(() => {});
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        if (window.screen.orientation && 'unlock' in window.screen.orientation) {
          (window.screen.orientation as any).unlock();
        }
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const canEdit = ['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user?.role || '');

  const fetchData = React.useCallback(async (pIds?: string | string[], eId?: string) => {
    // Garantir que pIds seja um array
    const targetProfIds = Array.isArray(pIds) ? pIds : (pIds ? [pIds] : (professorId ? [professorId] : []));
    const targetEscolaId = eId || escolaId;

    if (targetProfIds.length === 0 || !targetEscolaId) return;

    setLoading(true);
    try {
      if (!navigator.onLine) throw new Error('Offline');

      // 1. Buscar Turmas desta escola
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('*')
        .eq('escola_id', targetEscolaId);
      
      if (turmasData) {
        const sortedTurmas = [...turmasData].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
        setTurmas(sortedTurmas);
      }
      
      // 2. Buscar Disciplinas do Professor (unificando de todos os perfis)
      const { data: profsData } = await supabase
        .from('professores')
        .select('disciplinas')
        .in('id', targetProfIds);
      
      const allDisciplinas: string[] = [];
      profsData?.forEach(p => {
        if (p.disciplinas) allDisciplinas.push(...p.disciplinas);
      });
      setProfessorDisciplinas([...new Set(allDisciplinas)]);

      // 3. Buscar Horários atuais de TODOS os perfis vinculados
      const { data: scheduleData } = await supabase
        .from('professor_horarios')
        .select('*, turmas(*)')
        .in('professor_id', targetProfIds)
        .eq('escola_id', targetEscolaId);

      const mappedSchedule: Record<string, ScheduleTurmaItem> = {};
      if (scheduleData) {
        scheduleData.forEach(item => {
          const key = `${item.dia_semana}-${item.tempo_ordem}`;
          // Se houver conflito entre perfis duplicados, o último ganha
          mappedSchedule[key] = {
            ...item.turmas,
            componente_horario: item.componente
          };
        });
      }
      setSchedule(mappedSchedule);
    } catch (err) {
      console.warn('[ScheduleModal] Usando fallback local para horários:', err);
      
      // Fallback local do IndexedDB
      try {
        // 1. Buscar Turmas do IndexedDB
        const localTurmas = await db.turmas.where('escola_id').equals(targetEscolaId).toArray();
        const sortedLocalTurmas = [...localTurmas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
        setTurmas(sortedLocalTurmas);
        
        // 2. Buscar Horários locais
        const localHorarios = await db.horarios.toArray(); 
        // Filtrar localmente os horários que pertencem às turmas da escola alvo
        const schoolTurmaIds = new Set(localTurmas.map(t => t.id));
        const filteredHorarios = localHorarios.filter(h => schoolTurmaIds.has(h.turma_id));
        
        // 3. Mapear horários
        const mappedSchedule: Record<string, ScheduleTurmaItem> = {};
        filteredHorarios.forEach(item => {
          const key = `${item.dia_semana}-${item.tempo_ordem}`;
          const matchingTurma = localTurmas.find(t => t.id === item.turma_id);
          if (matchingTurma) {
            mappedSchedule[key] = {
              id: matchingTurma.id,
              nome: matchingTurma.nome,
              turno: matchingTurma.turno,
              componente_horario: item.componente
            };
          }
        });
        setSchedule(mappedSchedule);
        
        // 4. Disciplinas do professor com base nos horários carregados
        const uniqueComps = [...new Set(filteredHorarios.map(h => h.componente).filter(Boolean))];
        setProfessorDisciplinas(uniqueComps);
        
      } catch (localErr) {
        console.error('[ScheduleModal] Falha crítica no fallback offline de horários:', localErr);
      }
    }
    setLoading(false);
  }, [professorId, escolaId]);

   
  const fetchProfessorContext = React.useCallback(async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      if (!navigator.onLine) throw new Error('Offline');
      const emailLimpo = user.email.trim();
      
      // 1. Achar todos os IDs de professor vinculados a este e-mail ou usuario_id
      const { data: profs } = await supabase
        .from('professores')
        .select('id')
        .or(`usuario_id.eq.${user.id},email.ilike.${emailLimpo}`);

      if (profs && profs.length > 0) {
        const profIds = profs.map(p => p.id);
        
        // Verificar se há uma escola ativa no sessionStorage
        const activeEscolaId = sessionStorage.getItem('activeEscolaId');
        if (activeEscolaId) {
          fetchData(profIds, activeEscolaId);
        } else {
          // 2. Achar a primeira escola alocada para QUALQUER um desses perfis
          const { data: alocData } = await supabase
            .from('professor_alocacoes')
            .select('escola_id')
            .in('professor_id', profIds)
            .limit(1);

          if (alocData && alocData.length > 0) {
            // Passamos a lista de IDs para o fetchData
            fetchData(profIds, alocData[0].escola_id);
          }
        }
      }
    } catch (err) {
      console.warn('[ScheduleModal] Falha ao obter contexto online do professor, tentando local:', err);
      // Quando offline, podemos simplesmente obter a escola_id e turmas_id do cache local de turmas
      try {
        const activeEscolaId = sessionStorage.getItem('activeEscolaId');
        if (activeEscolaId) {
          fetchData(['offline_prof_id'], activeEscolaId);
        } else {
          const localTurmas = await db.turmas.toArray();
          if (localTurmas.length > 0) {
            // Usa a escola_id da primeira turma disponível no cache local
            const escolaId = localTurmas[0].escola_id;
            if (escolaId) {
              // Simulamos um array de profIds vazio ou fake, já que o fallback do fetchData buscará direto pelas turmas
              fetchData(['offline_prof_id'], escolaId);
            }
          }
        }
      } catch (localErr) {
        console.error('[ScheduleModal] Falha crítica no fallback do contexto do professor:', localErr);
      }
    }
    setLoading(false);
  }, [user?.email, user?.id, fetchData]);

   
  useEffect(() => {
    if (isOpen) {
      if (professorId && escolaId) {
        fetchData(professorId, escolaId);
      } else if (user?.role === 'PROFESSOR') {
        fetchProfessorContext();
      }
    }
  }, [isOpen, professorId, escolaId, user, fetchData, fetchProfessorContext]);
   

  const handleTurmaSelect = (diaIndex: number, tempoOrdem: number, turmaId: string) => {
    const key = `${diaIndex + 1}-${tempoOrdem}`;
    const selectedTurma = turmas.find(t => t.id === turmaId);
    
    setSchedule(prev => {
      const next = { ...prev };
      if (turmaId === '') {
        delete next[key];
      } else {
        const componenteAtual = prev[key]?.componente_horario || '';
        next[key] = { ...selectedTurma, componente_horario: componenteAtual };
      }
      return next;
    });
  };

  const handleComponenteSelect = (diaIndex: number, tempoOrdem: number, componente: string) => {
    const key = `${diaIndex + 1}-${tempoOrdem}`;
    setSchedule(prev => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: { ...prev[key], componente_horario: componente }
      };
    });
  };

  const handleSave = async () => {
    // Determinar IDs novamente para segurança no salvamento
    let targetProfId = professorId;
    let targetEscolaId = escolaId;

    if (!targetProfId && user?.email) {
      const { data: p } = await supabase.from('professores').select('id').eq('email', user.email).maybeSingle();
      targetProfId = p?.id;
    }

    if (targetProfId && !targetEscolaId) {
      const { data: a } = await supabase.from('professor_alocacoes').select('escola_id').eq('professor_id', targetProfId).limit(1);
      targetEscolaId = a?.[0]?.escola_id;
    }

    if (!targetProfId || !targetEscolaId) return;

    setSaving(true);
    try {
      await supabase
        .from('professor_horarios')
        .delete()
        .eq('professor_id', targetProfId)
        .eq('escola_id', targetEscolaId);

      const inserts = Object.entries(schedule).map(([key, turma]: [string, ScheduleTurmaItem]) => {
        const [dia, tempo] = key.split('-').map(Number);
        // Garantir que componente nunca fique vazio - usar disciplina selecionada ou fallback para a primeira disciplina do professor
        const componente = turma.componente_horario || professorDisciplinas[0] || '';
        return {
          professor_id: targetProfId,
          turma_id: turma.id,
          escola_id: targetEscolaId,
          dia_semana: dia,
          tempo_ordem: tempo,
          componente
        };
      });

      if (inserts.length > 0) {
        const { error } = await supabase.from('professor_horarios').insert(inserts);
        if (error) throw error;
      }

      setIsEditing(false);
      await fetchData(targetProfId, targetEscolaId);
    } catch (err) {
      console.error('Erro ao salvar horários:', err);
      alert('Erro ao salvar horários.');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col h-[96vh] sm:h-auto sm:max-h-[92vh] animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 sm:p-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#eef2ff] text-[#0f2851] rounded-xl flex items-center justify-center shadow-inner shrink-0">
              <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight leading-tight">QUADRO DE HORÁRIOS</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão de Tempos e Turmas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            {canEdit && (
              !isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 sm:py-2.5 bg-[#0f2851] hover:bg-[#1a3a6d] text-white rounded-xl text-xs sm:text-sm font-bold uppercase tracking-widest transition-all shadow-lg shadow-[#0f2851]/20 active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Editar Grade</span>
                  <span className="sm:hidden">Editar</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-3 sm:px-6 py-2 sm:py-2.5 text-slate-500 hover:text-slate-700 text-xs sm:text-sm font-black uppercase tracking-widest transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-6 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span className="hidden sm:inline">Salvar Grade</span>
                    <span className="sm:hidden">Salvar</span>
                  </button>
                </div>
              )
            )}
            <button
              onClick={toggleOrientation}
              className="md:hidden p-2 text-[#0f2851] bg-[#eef2ff] hover:bg-[#e0e7ff] rounded-xl transition-all"
              title="Girar para modo paisagem"
              aria-label="Girar tela"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <div className="w-px h-6 sm:h-8 bg-slate-100 mx-1 sm:mx-2" />
            <button
              onClick={handleClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Mobile Orientation Hint Banner */}
        <div className="md:hidden bg-blue-50/90 border-b border-blue-100 px-3.5 py-2 flex items-center justify-between text-xs text-[#0f2851] font-medium shrink-0">
          <div className="flex items-center gap-1.5">
            <RotateCw className="w-3 h-3 text-blue-600 shrink-0" />
            <span>Gire o celular na horizontal ou deslize</span>
          </div>
          <button
            onClick={toggleOrientation}
            className="text-[9px] font-extrabold uppercase bg-white border border-blue-200 px-2 py-0.5 rounded-md text-blue-700 shadow-xs flex items-center gap-1 active:scale-95 shrink-0"
          >
            <Maximize2 className="w-2.5 h-2.5" /> Girar
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-0 relative min-h-[260px] sm:min-h-[480px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px] z-50">
              <Loader2 className="w-12 h-12 text-[#0f2851] animate-spin mb-4" />
              <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em]">Carregando Grade...</p>
            </div>
          ) : (
            <table className="min-w-[720px] sm:min-w-full w-full border-separate border-spacing-0 table-fixed">
              <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10">
                <tr>
                  <th className="w-12 sm:w-16 border-b border-r border-slate-100 p-2 sm:p-4 text-center font-black text-slate-400 text-[10px] uppercase tracking-widest">
                    Tempo
                  </th>
                  {DIAS.map(dia => (
                    <th key={dia} className="border-b border-r border-slate-100 p-2.5 sm:p-4 text-left font-black text-slate-500 text-[10px] uppercase tracking-widest last:border-r-0">
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {SLOTS.map((slot) => (
                  <tr key={slot} className="group transition-colors h-20 sm:h-24">
                    <td className="border-r border-b border-slate-50 bg-slate-50/30 p-2 sm:p-4 text-center">
                      <span className="text-lg sm:text-2xl font-black text-slate-300 tabular-nums leading-none">
                        {slot.toString().padStart(2, '0')}
                      </span>
                    </td>
                    {DIAS.map((dia, diaIdx) => {
                      const key = `${diaIdx + 1}-${slot}`;
                      const cellData = schedule[key];
                      
                      return (
                        <td 
                          key={dia} 
                          className={`border-r border-b border-slate-50 p-2 align-top last:border-r-0 transition-colors ${
                            isEditing ? 'hover:bg-[#eef2ff]/30' : 'bg-transparent'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5 h-full">
                              <select
                                value={cellData?.id || ''}
                                onChange={(e) => handleTurmaSelect(diaIdx, slot, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-1.5 sm:p-2 text-[10px] font-bold text-slate-600 focus:outline-none focus:border-[#0f2851] transition-all cursor-pointer"
                              >
                                <option value="">+ Turma</option>
                                {turmas.map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.nome} ({t.turno})
                                  </option>
                                ))}
                              </select>
                              
                              {cellData?.id && (
                                <select
                                  value={cellData?.componente_horario || ''}
                                  onChange={(e) => handleComponenteSelect(diaIdx, slot, e.target.value)}
                                  className="w-full bg-[#eef2ff] border border-blue-100 rounded-lg p-1.5 sm:p-2 text-[9px] font-black text-[#0f2851] focus:outline-none focus:border-blue-400 transition-all cursor-pointer uppercase tracking-tighter"
                                >
                                  <option value="">+ Disciplina</option>
                                  {professorDisciplinas.map(d => (
                                    <option key={d} value={d}>
                                      {d}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ) : (
                            <div className="h-full w-full p-1 sm:p-2 flex flex-col justify-between">
                              {cellData ? (
                                <>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-[#0f2851] uppercase tracking-tighter">
                                      <Building2 className="w-3 h-3 text-[#0f2851]/60 shrink-0" />
                                      {cellData.turno || 'GERAL'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] sm:text-[12px] font-extrabold text-slate-800 uppercase tracking-tight leading-tight">
                                      {cellData.nome}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 bg-[#eef2ff] border border-blue-100 rounded-md px-1.5 py-1">
                                    <BookOpen className="w-3 h-3 text-[#0f2851]/40 shrink-0" />
                                    <span className="text-[9px] font-bold text-[#0f2851] uppercase tracking-widest leading-none truncate">
                                      {cellData.componente_horario || 'N/A'}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="h-full flex items-center justify-center">
                                  <span className="text-slate-200 font-bold text-xl sm:text-2xl">—</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 shrink-0">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#0f2851]" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Escola</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#0f2851]/60" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Turma</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disciplina</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] text-center sm:text-right">
            Horários atualizados em tempo real com o Banco de Dados
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
});

export default ScheduleModal;
