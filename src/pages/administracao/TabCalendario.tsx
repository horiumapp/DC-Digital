import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  CalendarDays, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Building2, 
  ChevronDown, 
  ChevronUp,
  Info
} from 'lucide-react';
import { useToast } from '../../components/common/Toast';
import { APP_CONFIG } from '../../config/appConfig';
import { 
  fetchCalendarPeriods, 
  saveAcademicCalendar, 
  type CalendarPeriodItem 
} from '../../services/academicCalendar';

interface EscolaSimple {
  id: string;
  nome: string;
}

export default function TabCalendario() {
  const { showSuccess, showError, showWarning } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [escolas, setEscolas] = useState<EscolaSimple[]>([]);
  const [selectedEscolaId, setSelectedEscolaId] = useState<string>(''); // '' = Geral da Rede
  
  const [periodos, setPeriodos] = useState<CalendarPeriodItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [showOtherPeriods, setShowOtherPeriods] = useState(false);

  // Carrega escolas para permitir calendário específico por escola se desejado
  useEffect(() => {
    async function loadEscolas() {
      const { data } = await supabase.from('escolas').select('id, nome').order('nome');
      if (data) setEscolas(data);
    }
    loadEscolas();
  }, []);

  const loadData = useCallback(async (escolaId?: string) => {
    setLoading(true);
    try {
      const data = await fetchCalendarPeriods(escolaId ? escolaId : null);
      setPeriodos(data);
      setHasChanges(false);
    } catch (err) {
      console.error(err);
      showError('Não foi possível carregar os períodos letivos.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadData(selectedEscolaId);
  }, [selectedEscolaId, loadData]);

  const handleDateChange = (periodoId: string, field: 'dataInicio' | 'dataFim', value: string) => {
    setPeriodos(prev => prev.map(p => {
      if (p.periodo === periodoId) {
        return { ...p, [field]: value };
      }
      return p;
    }));
    setHasChanges(true);
  };

  const handleResetToDefault = () => {
    setPeriodos(prev => prev.map(p => {
      const bundled = APP_CONFIG.PERIODOS.find(bp => bp.id === p.periodo);
      if (bundled) {
        return { ...p, dataInicio: bundled.dataInicio, dataFim: bundled.dataFim };
      }
      return p;
    }));
    setHasChanges(true);
    showWarning('Datas redefinidas para o padrão da aplicação. Clique em "Salvar" para confirmar.');
  };

  const handleSave = async () => {
    // 1. Validação de consistência de datas
    for (const p of periodos) {
      if (!p.dataInicio || !p.dataFim) {
        showError(`Preencha a data de início e término de ${p.nome}.`);
        return;
      }
      if (p.dataInicio > p.dataFim) {
        showError(`A data de início de ${p.nome} não pode ser posterior à data de término.`);
        return;
      }
    }

    setSaving(true);
    try {
      await saveAcademicCalendar(periodos, selectedEscolaId ? selectedEscolaId : null);
      setHasChanges(false);
      showSuccess('Calendário letivo salvo e atualizado com sucesso!');
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro ao salvar no banco.';
      showError(`Falha ao salvar calendário: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // Separação entre Bimestres e outros períodos (Semestrais/Recuperação)
  const bimestres = useMemo(() => {
    return periodos.filter(p => p.periodo.includes('BIMESTRE'));
  }, [periodos]);

  const outrosPeriodos = useMemo(() => {
    return periodos.filter(p => !p.periodo.includes('BIMESTRE'));
  }, [periodos]);

  // Função para identificar o status do período em relação à data de hoje
  const getPeriodoStatus = (dataInicio: string, dataFim: string) => {
    const hojeStr = new Date().toISOString().split('T')[0];
    if (hojeStr >= dataInicio && hojeStr <= dataFim) {
      return { label: 'Bimestre Vigente', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    }
    if (hojeStr < dataInicio) {
      return { label: 'Futuro', color: 'bg-sky-50 text-sky-700 border-sky-200' };
    }
    return { label: 'Encerrado', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  // Cálculo de dias úteis aproximados / duração
  const calculateDays = (inicio: string, fim: string) => {
    if (!inicio || !fim) return 0;
    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner & Scope Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#0f2851]/10 rounded-lg text-[#0f2851]">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Calendário Letivo — Ano {APP_CONFIG.YEAR}
              </h2>
              <p className="text-sm text-slate-500">
                Configure manualmente as datas de início e término de cada bimestre e período letivo.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Escopo (Rede vs Escola específica) */}
          {escolas.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <Building2 className="w-4 h-4 text-slate-400" />
              <select
                aria-label="Escopo do calendário"
                value={selectedEscolaId}
                onChange={(e) => setSelectedEscolaId(e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none"
              >
                <option value="">Geral da Rede (Padrão Municipal)</option>
                {escolas.map(esc => (
                  <option key={esc.id} value={esc.id}>
                    Escola: {esc.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleResetToDefault}
            disabled={saving}
            className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            title="Redefinir para as datas padrão da aplicação"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar Padrão
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold shadow-sm transition ${
              hasChanges 
                ? 'bg-[#0f2851] text-white hover:bg-[#1a3a6d] shadow-[#0f2851]/20' 
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="flex items-start gap-3 p-4 bg-sky-50/60 border border-sky-200/80 rounded-xl text-sky-900 text-sm">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-sky-950">Aviso sobre o Fechamento de Bimestres</p>
          <p className="text-xs text-sky-800 mt-0.5">
            As datas configuradas abaixo são utilizadas pelos professores no diário eletrônico para lançar frequências e notas no bimestre correspondente. Alterações aqui são sincronizadas instantaneamente com o banco e o modo offline.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Carregando períodos letivos...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seção 1: Bimestres Oficiais */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>Bimestres Regulares</span>
              <span className="text-xs font-normal text-slate-400">({bimestres.length} períodos)</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bimestres.map((item, index) => {
                const status = getPeriodoStatus(item.dataInicio, item.dataFim);
                const dias = calculateDays(item.dataInicio, item.dataFim);
                const isInvalid = item.dataInicio && item.dataFim && item.dataInicio > item.dataFim;

                return (
                  <div 
                    key={item.periodo}
                    className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-[#0f2851] text-white text-xs font-black flex items-center justify-center">
                          {index + 1}
                        </span>
                        <div>
                          <h4 className="font-bold text-slate-800 text-base">{item.nome}</h4>
                          <span className="text-[11px] text-slate-400 font-mono">{item.periodo}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Data de Início
                        </label>
                        <input
                          type="date"
                          value={item.dataInicio}
                          onChange={(e) => handleDateChange(item.periodo, 'dataInicio', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] bg-slate-50/50 font-medium text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1.5">
                          Data de Término
                        </label>
                        <input
                          type="date"
                          value={item.dataFim}
                          onChange={(e) => handleDateChange(item.periodo, 'dataFim', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0f2851]/20 focus:border-[#0f2851] bg-slate-50/50 font-medium text-slate-800"
                        />
                      </div>
                    </div>

                    {isInvalid ? (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium pt-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Data de término deve ser posterior à data de início.
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          Duração: {dias} dias corridos
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.dataInicio + 'T12:00:00').toLocaleDateString('pt-BR')} até {new Date(item.dataFim + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Seção 2: Outros Períodos (Semestres, Recuperação) */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowOtherPeriods(!showOtherPeriods)}
              className="flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition py-2"
            >
              {showOtherPeriods ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showOtherPeriods ? 'Ocultar outros períodos' : 'Ver outros períodos (Semestres, Período Único e Recuperação)'}
            </button>

            {showOtherPeriods && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-200">
                {outrosPeriodos.map((item) => {
                  const dias = calculateDays(item.dataInicio, item.dataFim);
                  return (
                    <div 
                      key={item.periodo}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-700 text-sm">{item.nome}</h4>
                        <span className="text-xs text-slate-400">{dias} dias</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Início
                          </label>
                          <input
                            type="date"
                            value={item.dataInicio}
                            onChange={(e) => handleDateChange(item.periodo, 'dataInicio', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Término
                          </label>
                          <input
                            type="date"
                            value={item.dataFim}
                            onChange={(e) => handleDateChange(item.periodo, 'dataFim', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Barra inferior de confirmação se houver alterações */}
          {hasChanges && (
            <div className="sticky bottom-4 flex items-center justify-between p-4 bg-[#0f2851] text-white rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-sm font-semibold">
                  Você possui alterações de datas não salvas no calendário escolar.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-sm transition"
                >
                  {saving ? 'Gravando...' : 'Confirmar e Salvar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
