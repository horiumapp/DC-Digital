import React, { useState, useEffect } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import Captcha from '../common/Captcha';
import { useTurma } from '../../contexts/TurmaContext';
import { useCaptcha } from '../../hooks/useCaptcha';
import { supabase } from '../../lib/supabase';
import { getBimestrePorData } from '../../utils/dateUtils';

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

  const [isAddingObjeto, setIsAddingObjeto] = useState(false);
  const [objetoSalvo, setObjetoSalvo] = useState(false);
  const [objetoData, setObjetoData] = useState<{ descricao: string; observacao: string; status: string } | null>(null);
  
  // Lógica de Currículo Dinâmico (Busca no Banco)
  const [unidadesBD, setUnidadesBD] = useState<any[]>([]);
  const [loadingCurriculo, setLoadingCurriculo] = useState(false);
  const [curriculoIndisponivel, setCurriculoIndisponivel] = useState(false);

  useEffect(() => {
    async function loadCurriculo() {
      if (!turmaAtiva) return;
      setLoadingCurriculo(true);
      try {
        let modalidadeRaw = turmaAtiva.ensino || "";
        // Extract prefix before '(' to avoid mismatches between '°' and 'º'
        const modalidadeStr = modalidadeRaw.split('(')[0].trim();
        
        let anoStr = turmaAtiva.fase || "";
        // Extract leading digit from phase (e.g. "1° ANO A" -> "1º Ano") to match curriculum format
        const matchAno = anoStr.match(/^(\d+)/);
        if (matchAno) {
          anoStr = `${matchAno[1]}º Ano`;
        }

        const disciplina = turmaAtiva.componente || "";
        const bimestre = getBimestrePorData(selectedDate) || "";
        
        console.log('Filtros Currículo:', { modalidade: modalidadeStr, ano: anoStr, disciplina, bimestre });

        const { data, error } = await supabase
          .from('curriculo_unidades')
          .select('*, objetos:curriculo_objetos(*), habilidades:curriculo_habilidades(*)')
          .ilike('modalidade', `%${modalidadeStr}%`)
          .eq('ano', anoStr)
          .eq('bimestre', bimestre)
          .ilike('disciplina', `%${disciplina}%`);

        if (error) throw error;
        const found = data?.length || 0;
        console.log('Unidades encontradas:', found);
        setUnidadesBD(data || []);
        setCurriculoIndisponivel(found === 0);
      } catch (err) {
        console.error('Erro ao buscar currículo:', err);
        setCurriculoIndisponivel(true);
      } finally {
        setLoadingCurriculo(false);
      }
    }
    loadCurriculo();
  }, [turmaAtiva, selectedDate]);

  const unidadesDisponiveis = unidadesBD;

  const [objetoUnidade, setObjetoUnidade] = useState('');
  const [objetoConhecimento, setObjetoConhecimento] = useState('');
  const [objetoObservacao, setObjetoObservacao] = useState('');
  const [objetoStatus, setObjetoStatus] = useState('Ministrado');

  // Atualiza seleções iniciais quando as unidades mudam
  React.useEffect(() => {
    if (curriculoIndisponivel && !objetoUnidade) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjetoUnidade('TEXTO LIVRE');
    } else if (unidadesDisponiveis.length > 0 && !objetoUnidade) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjetoUnidade(unidadesDisponiveis[0].nome);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadesDisponiveis, curriculoIndisponivel]);

  const objetosDisponiveis = React.useMemo(() => {
    const unidade = unidadesDisponiveis.find(u => u.nome === objetoUnidade);
    return unidade ? unidade.objetos.map((o: any) => o.descricao) : [];
  }, [objetoUnidade, unidadesDisponiveis]);

  const habilidadesDisponiveis = React.useMemo(() => {
    const unidade = unidadesDisponiveis.find(u => u.nome === objetoUnidade);
    return unidade ? unidade.habilidades.map((h: any) => h.codigo) : [];
  }, [objetoUnidade, unidadesDisponiveis]);

  React.useEffect(() => {
    if (objetosDisponiveis.length > 0 && !objetoConhecimento && objetoUnidade !== 'TEXTO LIVRE') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setObjetoConhecimento(objetosDisponiveis[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objetosDisponiveis, objetoUnidade]);
  
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
            status: 'Ministrado'
          });
          setObjetoConhecimento(dados.objetos[0] || '');
          setObjetoUnidade(dados.habilidades && dados.habilidades.length > 0 ? dados.habilidades[0] : 'TEXTO LIVRE');
          setObjetoObservacao(dados.descricao || '');
        } else {
          setObjetoSalvo(false);
          setObjetoData(null);
          setShowObjetoTable(false);
          // Reset para o padrão sugerido
          if (curriculoIndisponivel) {
            setObjetoUnidade('TEXTO LIVRE');
            setObjetoConhecimento('');
          } else if (unidadesDisponiveis.length > 0) {
            setObjetoUnidade(unidadesDisponiveis[0].nome);
            if (unidadesDisponiveis[0].objetos.length > 0) {
              setObjetoConhecimento(unidadesDisponiveis[0].objetos[0]);
            }
          }
        }
      }
    };
    carregar();
  }, [selectedDate, tempoAula, turmaAtiva, unidadesDisponiveis, curriculoIndisponivel]);

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
        habilidades: objetoUnidade === 'TEXTO LIVRE' ? [] : habilidadesDisponiveis,
        descricao: objetoObservacao
      });

      setObjetoData({ descricao: objetoConhecimento, observacao: objetoObservacao, status: objetoStatus });
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
               className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition h-[38px] shadow-sm active:scale-95"
             >
               Exibir
             </button>
             <button
               onClick={() => {
                 setShowObjetoTable(false);
                 setShowNoRecordsObjeto(false);
                 setIsAddingObjeto(true);
               }}
               className="bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2 rounded text-sm font-semibold hover:bg-[#e0e7ff] transition h-[38px] flex items-center gap-2 shadow-sm active:scale-95"
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
                       <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 uppercase">{objetoData.status}</span>
                     </td>
                     <td className="px-4 py-3">
                       <div className="flex items-center justify-center gap-2">
                         <button
                           onClick={() => { setShowObjetoTable(false); setIsAddingObjeto(true); }}
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
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-4">
              <label className="block text-sm text-slate-600 mb-1">Unidade didática</label>
              <select
                className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                value={objetoUnidade}
                onChange={(e) => { setObjetoUnidade(e.target.value); setObjetoConhecimento(''); }}
              >
                <option value="">Selecione a Unidade...</option>
                {unidadesDisponiveis.map(u => (
                  <option key={u.nome} value={u.nome}>{u.nome}</option>
                ))}
                <option value="TEXTO LIVRE">-- OUTRA / TEXTO LIVRE --</option>
              </select>
            </div>
            <div className="col-span-4">
              <label className="block text-sm text-slate-600 mb-1">Objeto de Conhecimento</label>
              {objetoUnidade === 'TEXTO LIVRE' ? (
                <input
                  type="text"
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                  value={objetoConhecimento}
                  onChange={(e) => setObjetoConhecimento(e.target.value)}
                  placeholder="Digite o objeto de conhecimento..."
                />
              ) : (
                <select
                  className="w-full border border-slate-300 rounded px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                  value={objetoConhecimento}
                  onChange={(e) => setObjetoConhecimento(e.target.value)}
                  disabled={!objetoUnidade}
                >
                  <option value="">Selecione o Objeto...</option>
                  {objetosDisponiveis.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                  <option value="OUTRO">-- OUTRO / TEXTO LIVRE --</option>
                </select>
              )}
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

            {habilidadesDisponiveis.length > 0 && objetoUnidade !== 'TEXTO LIVRE' && (
              <div className="col-span-12 mt-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Habilidades Vinculadas</label>
                <div className="flex flex-wrap gap-2">
                  {habilidadesDisponiveis.map(hab => (
                    <span key={hab} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[10px] font-black border border-blue-100">
                      {hab}
                    </span>
                  ))}
                </div>
              </div>
            )}
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
                 className="flex items-center gap-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-8 py-2 rounded text-sm font-bold hover:bg-[#e0e7ff] transition shadow-sm active:scale-95"
               >
                 <Check className="w-4 h-4" /> Confirmar lançamento
               </button>
               <button onClick={() => setIsAddingObjeto(false)} className="bg-white text-slate-600 border border-slate-200 px-6 py-2 rounded text-sm font-medium hover:bg-slate-50 transition">
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
