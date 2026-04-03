import React, { useState, useEffect } from 'react';
import { X, Users, BookOpen, Building2, Edit2, Check, Loader2, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  professorId?: string;
  escolaId?: string;
}

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const SLOTS = [1, 2, 3, 4, 5, 6, 7];

export default function ScheduleModal({ isOpen, onClose, professorId, escolaId }: ScheduleModalProps) {
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, any>>({});
  const [turmas, setTurmas] = useState<any[]>([]);
  const [professorDisciplinas, setProfessorDisciplinas] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const canEdit = ['ADMIN', 'GESTOR', 'SECRETARIO'].includes(user?.role || '');

  useEffect(() => {
    if (isOpen) {
      if (professorId && escolaId) {
        fetchData(professorId, escolaId);
      } else if (user?.role === 'PROFESSOR') {
        fetchProfessorContext();
      }
    }
  }, [isOpen, professorId, escolaId, user]);

  const fetchProfessorContext = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const emailLimpo = user.email.trim();
      
      // 1. Achar todos os IDs de professor vinculados a este e-mail
      const { data: profs } = await supabase
        .from('professores')
        .select('id')
        .ilike('email', `%${emailLimpo}%`);

      if (profs && profs.length > 0) {
        const profIds = profs.map(p => p.id);
        
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
    } catch (err) {
      console.error('Erro ao buscar contexto do professor:', err);
    }
    setLoading(false);
  };

  const fetchData = async (pIds?: string | string[], eId?: string) => {
    // Garantir que pIds seja um array
    const targetProfIds = Array.isArray(pIds) ? pIds : (pIds ? [pIds] : (professorId ? [professorId] : []));
    const targetEscolaId = eId || escolaId;

    if (targetProfIds.length === 0 || !targetEscolaId) return;

    setLoading(true);
    try {
      // 1. Buscar Turmas desta escola
      const { data: turmasData } = await supabase
        .from('turmas')
        .select('*')
        .eq('escola_id', targetEscolaId);
      
      if (turmasData) setTurmas(turmasData);
      
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

      const mappedSchedule: Record<string, any> = {};
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
      console.error('Erro ao buscar dados do horário:', err);
    }
    setLoading(false);
  };

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
      const { data: p } = await supabase.from('professores').select('id').eq('email', user.email).single();
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

      const inserts = Object.entries(schedule).map(([key, turma]: [string, any]) => {
        const [dia, tempo] = key.split('-').map(Number);
        return {
          professor_id: targetProfId,
          turma_id: turma.id,
          escola_id: targetEscolaId,
          dia_semana: dia,
          tempo_ordem: tempo,
          componente: turma.componente_horario || ''
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shadow-inner">
              <LogIn className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">QUADRO DE HORÁRIOS</h2>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestão de Tempos e Turmas</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {canEdit && (
              !isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar Grade
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-6 py-2.5 text-slate-500 hover:text-slate-700 text-sm font-black uppercase tracking-widest transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Salvar Grade
                  </button>
                </div>
              )
            )}
            <div className="w-px h-8 bg-slate-100 mx-2" />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-0 relative min-h-[500px]">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[1px] z-50">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em]">Carregando Grade...</p>
            </div>
          ) : (
            <table className="w-full border-separate border-spacing-0 table-fixed">
              <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-10">
                <tr>
                  <th className="w-16 border-b border-r border-slate-100 p-4 text-center font-black text-slate-300 text-[10px] uppercase tracking-widest">
                    Tempo
                  </th>
                  {DIAS.map(dia => (
                    <th key={dia} className="border-b border-r border-slate-100 p-4 text-left font-black text-slate-400 text-[10px] uppercase tracking-widest last:border-r-0">
                      {dia}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {SLOTS.map((slot) => (
                  <tr key={slot} className="group transition-colors h-24">
                    <td className="border-r border-b border-slate-50 bg-slate-50/30 p-4 text-center">
                      <span className="text-2xl font-black text-slate-200 tabular-nums leading-none">
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
                            isEditing ? 'hover:bg-blue-50/30' : 'bg-transparent'
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex flex-col gap-1.5 h-full">
                              <select
                                value={cellData?.id || ''}
                                onChange={(e) => handleTurmaSelect(diaIdx, slot, e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[10px] font-bold text-slate-600 focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
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
                                  className="w-full bg-[#eef2ff] border border-blue-100 rounded-lg p-2 text-[9px] font-black text-[#0f2851] focus:outline-none focus:border-blue-400 transition-all cursor-pointer uppercase tracking-tighter"
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
                            <div className="h-full w-full p-2 flex flex-col justify-between">
                              {cellData ? (
                                <>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                                      <Building2 className="w-3 h-3" />
                                      {cellData.turno || 'GERAL'}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[12px] font-black text-slate-800 uppercase tracking-tight leading-tight">
                                      {cellData.nome}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-2 bg-blue-50/50 border border-blue-100 rounded-md px-1.5 py-1">
                                    <BookOpen className="w-3 h-3 text-blue-400" />
                                    <span className="text-[9px] font-black text-[#0f2851] uppercase tracking-widest leading-none truncate">
                                      {cellData.componente_horario || 'N/A'}
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="h-full flex items-center justify-center">
                                  <span className="text-slate-200 font-bold text-2xl">—</span>
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
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Escola</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turma</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disciplina</span>
            </div>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
            Horários atualizados em tempo real com o Banco de Dados
          </p>
        </div>
      </div>
    </div>
  );
}
