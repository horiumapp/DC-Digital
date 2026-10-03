import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, Pencil, Trash2, X, RefreshCw, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useToast } from '../common/Toast';
import { useTurma } from '../../contexts/TurmaContext';
import { supabase } from '../../lib/supabase';
import * as OfflineStorage from '../../services/offlineStorage';
import { getBimestrePorData } from '../../utils/dateUtils';
import Captcha from '../common/Captcha';
import { useCaptcha } from '../../hooks/useCaptcha';

interface CurriculoObjeto {
  id?: string;
  unidade_id?: string;
  descricao: string;
}
interface CurriculoHabilidade {
  id?: string;
  unidade_id?: string;
  codigo: string;
}
interface CurriculoUnidade {
  id: string;
  modalidade: string;
  ano: string;
  bimestre: string;
  disciplina: string;
  nome: string;
  objetos: CurriculoObjeto[];
  habilidades: CurriculoHabilidade[];
}

interface ObjetoConhecimentoTabProps {
  turmaAtiva: { id: string; nome?: string; ensino?: string; fase?: string; componente?: string } | null;
  selectedDate: string;
  tempoAula: string;
  setTempoAula: (v: string) => void;
  disponiveisTempos: string[];
  disabled?: boolean;
}

export default function ObjetoConhecimentoTab({
  turmaAtiva,
  selectedDate,
  tempoAula,
  setTempoAula,
  disponiveisTempos,
  disabled,
}: ObjetoConhecimentoTabProps) {
  const navigate = useNavigate();
  const { registrarLancamento: _registrarLancamento, removerLancamento: _removerLancamento, salvarConteudo, buscarConteudo, removerConteudo, lancamentos } = useTurma();

  const _isLancado = lancamentos.some(l => 
    l.data === selectedDate && 
    l.tempo === tempoAula && 
    l.tipo === 'conteudo'
  );

  const [isAddingObjeto, setIsAddingObjeto] = useState(false);
  const [objetoSalvo, setObjetoSalvo] = useState(false);
  const [objetoData, setObjetoData] = useState<{ descricao: string; observacao: string; status: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    generatedCaptcha,
    captchaInput,
    setCaptchaInput,
    captchaError,
    generateNewCaptcha,
    validateCaptcha
  } = useCaptcha();
  
  // Lógica de Currículo Dinâmico (Busca no Banco)
  const [unidadesBD, setUnidadesBD] = useState<CurriculoUnidade[]>([]);
  const [_loadingCurriculo, setLoadingCurriculo] = useState(false);
  const [curriculoIndisponivel, setCurriculoIndisponivel] = useState(false);

  useEffect(() => {
    async function loadCurriculo() {
      if (!turmaAtiva) return;
      setLoadingCurriculo(true);

      const modalidadeRaw = turmaAtiva.ensino || '';
      // Extract prefix before '(' to avoid mismatches between '°' and 'º'.
      const modalidade = modalidadeRaw.split('(')[0].trim();
      let ano = turmaAtiva.fase || '';
      // Extract leading digit from phase (e.g. "1° ANO A" -> "1º Ano") to match curriculum format.
      const matchAno = ano.match(/^(\d+)/);
      if (matchAno) ano = `${matchAno[1]}º Ano`;

      const chave = {
        modalidade,
        ano,
        bimestre: getBimestrePorData(selectedDate) || '',
        disciplina: turmaAtiva.componente || '',
      };

      try {
        let unidades: CurriculoUnidade[] = [];

        if (navigator.onLine) {
          const { data, error } = await supabase
            .from('curriculo_unidades')
            .select('*, objetos:curriculo_objetos(*), habilidades:curriculo_habilidades(*)')
            .ilike('modalidade', `%${chave.modalidade}%`)
            .eq('ano', chave.ano)
            .eq('bimestre', chave.bimestre)
            .ilike('disciplina', `%${chave.disciplina}%`);

          if (error) throw error;
          unidades = (data || []) as CurriculoUnidade[];
          if (unidades.length > 0) {
            await OfflineStorage.cacheCurriculo(unidades.map(unidade => ({
              id: unidade.id,
              modalidade: unidade.modalidade,
              ano: unidade.ano,
              bimestre: unidade.bimestre,
              disciplina: unidade.disciplina,
              nome: unidade.nome,
              objetos: unidade.objetos || [],
              habilidades: unidade.habilidades || [],
            })));
          }
        }

        if (unidades.length === 0) {
          unidades = await OfflineStorage.getCachedCurriculo(chave);
        }

        setUnidadesBD(unidades);
        setCurriculoIndisponivel(unidades.length === 0);
      } catch (err) {
        console.error('Erro ao buscar currículo:', err);
        const unidadesCache = await OfflineStorage.getCachedCurriculo(chave);
        setUnidadesBD(unidadesCache);
        setCurriculoIndisponivel(unidadesCache.length === 0);
      } finally {
        setLoadingCurriculo(false);
      }
    }
    loadCurriculo();
  }, [turmaAtiva, selectedDate]);

  const unidadesDisponiveis = unidadesBD;

  const todosConteudos = React.useMemo(() => {
    const list: { unidade: string; descricao: string }[] = [];
    unidadesDisponiveis.forEach(u => {
      u.objetos?.forEach((o: CurriculoObjeto | string) => {
        const desc = typeof o === 'object' && o !== null ? (o.descricao || '') : o;
        if (desc) list.push({ unidade: u.nome || '', descricao: desc });
      });
    });
    return list;
  }, [unidadesDisponiveis]);

  const [objetoConhecimento, setObjetoConhecimento] = useState('');
  const [objetoObservacao, setObjetoObservacao] = useState('');
  const [objetoStatus, setObjetoStatus] = useState('Ministrado');
  const [modoTextoLivre, setModoTextoLivre] = useState(false);

  const [showObjetoTable, setShowObjetoTable] = useState(false);
  const [showNoRecordsObjeto, setShowNoRecordsObjeto] = useState(false);
  const [showDeleteObjetoModal, setShowDeleteObjetoModal] = useState(false);

  // Carregar do banco de dados ao mudar data ou tempo
  React.useEffect(() => {
    const carregar = async () => {
      if (turmaAtiva && selectedDate && tempoAula) {
        const dados = await buscarConteudo(selectedDate, tempoAula);
        if (dados) {
          // Garantir que o valor de objetos é sempre string (pode vir como objeto do banco)
          const rawObj = dados.objetos[0];
          const objStr = typeof rawObj === 'object' && rawObj !== null
            ? ((rawObj as Record<string, unknown>).descricao as string || (rawObj as Record<string, unknown>).titulo_oc as string || JSON.stringify(rawObj))
            : (rawObj || '');
          setObjetoSalvo(true);
          setObjetoData({
            descricao: objStr,
            observacao: dados.descricao || '',
            status: 'Ministrado'
          });
          setObjetoConhecimento(objStr);
          setObjetoObservacao(dados.descricao || '');
        } else {
          setObjetoSalvo(false);
          setObjetoData(null);
          setShowObjetoTable(false);
          setObjetoConhecimento('');
        }
      }
    };
    carregar();
  }, [selectedDate, tempoAula, turmaAtiva, buscarConteudo, unidadesDisponiveis, curriculoIndisponivel]);

  const { showWarning, showError } = useToast();

  const handleExcluirObjeto = async () => {
    await removerConteudo(selectedDate, tempoAula);
    setObjetoSalvo(false);
    setObjetoData(null);
    setShowObjetoTable(false);
    setObjetoObservacao('');
    setShowDeleteObjetoModal(false);
  };

  const handleVoltar = () => {
    setIsAddingObjeto(false);
    setCaptchaInput('');
    generateNewCaptcha();
  };

  const handleSave = async () => {
    // Validação: todos os campos obrigatórios devem estar preenchidos
    if (!objetoConhecimento || (typeof objetoConhecimento === 'string' && objetoConhecimento.trim() === '')) {
      showWarning('Por favor, preencha o Conteúdo Ministrado antes de salvar.');
      return;
    }

    if (!validateCaptcha()) {
      showError('Código de confirmação incorreto. Tente novamente.');
      return;
    }

    // Garantir que objetoConhecimento seja string ao salvar
    const objParaSalvar = typeof objetoConhecimento === 'object' && objetoConhecimento !== null
      ? ((objetoConhecimento as Record<string, unknown>).descricao as string || (objetoConhecimento as Record<string, unknown>).titulo_oc as string || JSON.stringify(objetoConhecimento))
      : objetoConhecimento;

    setIsSaving(true);
    try {
      await salvarConteudo({
        turmaId: String(turmaAtiva?.id || ''),
        data: selectedDate,
        tempo: tempoAula,
        objetos: [objParaSalvar],
        habilidades: [],
        descricao: objetoObservacao
      });

      setObjetoData({ descricao: objParaSalvar, observacao: objetoObservacao, status: objetoStatus });
      setObjetoSalvo(true);
      setShowObjetoTable(false);
      setIsAddingObjeto(false);
      setCaptchaInput('');
      generateNewCaptcha();
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Auto-advance to the next tempo that doesn't have content yet
      const nextPendingTempo = disponiveisTempos.find(t => 
        t !== tempoAula && !lancamentos.some(l => l.data === selectedDate && l.tempo === t && l.tipo === 'conteudo')
      );
      if (nextPendingTempo) {
        setTempoAula(nextPendingTempo);
      }

      // Redireciona diretamente para o Diário no mês e dia do preenchimento
      navigate(`/diario?date=${selectedDate}${turmaAtiva?.id ? `&turmaId=${turmaAtiva.id}` : ''}`);
    } catch (err) {
      console.error('Erro ao salvar conteúdo ministrado:', err);
      showError('Erro ao salvar conteúdo ministrado. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300 relative">
      {!isAddingObjeto ? (
        <>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 mb-6">
            <div className="w-full sm:w-64">
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
            <div className="flex flex-wrap items-center gap-3">
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
                 className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition h-[38px] shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
               >
                 Exibir
               </button>
                {!disabled && (
                  <button
                    onClick={() => {
                      setShowObjetoTable(false);
                      setShowNoRecordsObjeto(false);
                      generateNewCaptcha();
                      setIsAddingObjeto(true);
                    }}
                    className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-4 sm:px-6 py-2 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition h-[38px] flex items-center gap-2 shadow-sm active:scale-95 whitespace-nowrap cursor-pointer"
                  >
                    <span className="text-lg leading-none">+</span> Adicionar Conteúdo
                  </button>
                )}
                <Link
                  to={`/diario?date=${selectedDate}${turmaAtiva?.id ? `&turmaId=${turmaAtiva.id}` : ''}`}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded text-sm font-semibold transition h-[38px] flex items-center gap-1.5 shadow-xs active:scale-95 whitespace-nowrap cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar ao Diário
                </Link>
            </div>
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
                    <th className="px-4 py-3 font-medium">Conteúdo ministrado</th>
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
                       <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 uppercase">{objetoData.status}</span>
                     </td>
                     <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {!disabled ? (
                            <>
                              <button
                                onClick={() => { 
                                  setShowObjetoTable(false); 
                                  generateNewCaptcha();
                                  setIsAddingObjeto(true); 
                                }}
                                className="flex items-center gap-1 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-3 py-1.5 rounded text-xs font-bold hover:bg-[#e0e7ff] transition"
                              >
                                <Pencil className="w-3 h-3" /> Alterar
                              </button>
                              <button
                                onClick={() => setShowDeleteObjetoModal(true)}
                                className="flex items-center gap-1 bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 transition"
                              >
                                <Trash2 className="w-3 h-3" /> Excluir
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">—</span>
                          )}
                        </div>
                      </td>
                  </tr>
                </tbody>
              </table>
               <div className="px-4 py-3 bg-white border-t border-slate-200 text-sm text-slate-600 font-medium">
                 Mostrando de 1 até 1 de <span className="font-bold text-[#0f2851]">1</span> registros
               </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-6">
          {curriculoIndisponivel && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg flex items-start gap-3">
              <span className="text-xl leading-none">⚠️</span>
              <div>
                <h4 className="text-sm font-bold">Currículo não cadastrado</h4>
                <p className="text-xs mt-1">O currículo para a disciplina de <strong>{turmaAtiva?.componente || 'esta turma'}</strong> ainda não foi inserido no sistema. O modo de <strong>Texto Livre</strong> foi ativado automaticamente para que você possa registrar o conteúdo manualmente.</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label className="block text-sm text-slate-600 mb-1">Conteúdo ministrado</label>
              {todosConteudos.length > 0 && !modoTextoLivre ? (
                <select
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                  value={objetoConhecimento}
                  onChange={(e) => {
                    if (e.target.value === 'TEXTO LIVRE') {
                      setModoTextoLivre(true);
                      setObjetoConhecimento('');
                    } else {
                      setObjetoConhecimento(e.target.value);
                    }
                  }}
                >
                  <option value="">Selecione o Conteúdo Ministrado...</option>
                  {todosConteudos.map((item, idx) => (
                    <option key={idx} value={item.descricao}>
                      {item.descricao}
                    </option>
                  ))}
                  <option value="TEXTO LIVRE">-- OUTRO / TEXTO LIVRE --</option>
                </select>
              ) : (
                <div className="space-y-1">
                  <input
                    type="text"
                    className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                    value={objetoConhecimento}
                    onChange={(e) => setObjetoConhecimento(e.target.value)}
                    placeholder="Digite o conteúdo ministrado..."
                  />
                  {todosConteudos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setModoTextoLivre(false)}
                      className="text-xs text-blue-600 hover:underline font-medium"
                    >
                      ← Selecionar da lista de currículo
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 sm:col-span-4 sm:grid-cols-2">
              <div>
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
              <div>
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
          </div>

          <div>
            <label className="block text-sm text-slate-600 mb-1">Observação</label>
            <textarea
              className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 min-h-[120px] resize-y bg-slate-50/50"
              value={objetoObservacao}
              onChange={(e) => setObjetoObservacao(e.target.value)}
            />
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
                  onClick={handleSave}
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
                      Confirmar e Gravar Conteúdo Ministrado
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
                onClick={handleVoltar}
                className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-750 transition cursor-pointer"
              >
                Voltar
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
                <h3 className="text-base font-semibold text-slate-800 mb-1">Excluir Conteúdo Ministrado</h3>
                <p className="text-sm text-slate-600">
                  Tem certeza que deseja excluir o conteúdo ministrado lançado para o dia <strong>{selectedDate}</strong>, tempo <strong>{tempoAula}</strong>?
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
