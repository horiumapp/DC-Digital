import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTurma, Avaliacao, ObjetoAvaliacao } from '../../contexts/TurmaContext';
import { APP_CONFIG } from '../../config/appConfig';
import { useCaptcha } from '../../hooks/useCaptcha';
import { getBimestrePorData, getBimestreNumero, formatarDataParaISO } from '../../utils/dateUtils';
import { isAvaliacaoPendente, getMensagemPendenciaAvaliacao, getInfoPontosBimestre } from '../../utils/avaliacaoUtils';

// Sub-componentes
import AvaliacoesList from './avaliacoes/AvaliacoesList';
import AvaliacaoForm from './avaliacoes/AvaliacaoForm';
import AvaliacaoDetailsView from './avaliacoes/AvaliacaoDetailsView';
import NotasEditor from './avaliacoes/NotasEditor';
import SegundaChamadaEditor from './avaliacoes/SegundaChamadaEditor';
import DeleteAvaliacaoModal from './avaliacoes/DeleteAvaliacaoModal';
import { supabase } from '../../lib/supabase';
import * as OfflineStorage from '../../services/offlineStorage';

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

interface AvaliacoesTabProps {
  selectedDate?: string;
  disabled?: boolean;
}

export default function AvaliacoesTab({ selectedDate: dataContexto = '', disabled }: AvaliacoesTabProps) {
  const { 
    turmaAtiva, alunos, avaliacoes, conteudos, loading, 
    salvarAvaliacao, removerAvaliacao, salvarNotas, 
    carregarFaltasDaData, faltasPorData 
  } = useTurma();

  const currentBimestre = React.useMemo(() => {
    return (dataContexto ? getBimestrePorData(dataContexto) : '') || '1º Bimestre';
  }, [dataContexto]);

  const avaliacoesDoBimestre = React.useMemo(() => {
    const targetNum = getBimestreNumero(currentBimestre);
    return avaliacoes.filter(av => {
      if (av.parent_id) return false;
      const avNum = getBimestreNumero(av.bimestre || '') ?? getBimestreNumero(av.data);
      return avNum === targetNum;
    });
  }, [avaliacoes, currentBimestre]);

  const [avaliacaoViewMode, setAvaliacaoViewMode] = useState<'list' | 'details' | 'edit' | 'grades' | 'second_call'>('list');
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<Avaliacao | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [instrumentoAvaliacao, setInstrumentoAvaliacao] = useState('AVALIACAO ESCRITA');
  const [objetosAvaliacao, setObjetosAvaliacao] = useState<ObjetoAvaliacao[]>([]);
  const [periodoLetivo, setPeriodoLetivo] = useState('');
  const [unidadeDidatica, setUnidadeDidatica] = useState('');
  const [objetoConhecimento, setObjetoConhecimento] = useState('');
  const [valorMaximo, setValorMaximo] = useState('10,00');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<Avaliacao | null>(null);
  const [localNotas, setLocalNotas] = useState<Record<string, string>>({});
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [isSaving, setIsSaving] = useState(false);
  const [secondCallRows, setSecondCallRows] = useState<Record<string, { selected: boolean, date: string, grade: string }>>({});

  const PERIODOS_LABELS: Record<string, string> = {};
  APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE')).forEach(b => {
    // Formata a exibição como: "1. BIMESTRE 05/02/2026 - 23/04/2026"
    const start = new Date(b.dataInicio).toLocaleDateString('pt-BR');
    const end = new Date(b.dataFim).toLocaleDateString('pt-BR');
    PERIODOS_LABELS[b.nome] = `${b.label} ${start} - ${end}`;
  });

  const {
    generatedCaptcha,
    captchaInput,
    setCaptchaInput,
    captchaError,
    generateNewCaptcha,
    validateCaptcha
  } = useCaptcha();

  const [unidadesBD, setUnidadesBD] = useState<CurriculoUnidade[]>([]);
  const [_loadingCurriculo, setLoadingCurriculo] = useState(false);

  useEffect(() => {
    async function loadCurriculo() {
      if (!turmaAtiva) return;
      setLoadingCurriculo(true);

      const modalidadeRaw = turmaAtiva.ensino || '';
      const modalidade = modalidadeRaw.split('(')[0].trim();
      let ano = turmaAtiva.fase || '';
      const matchAno = ano.match(/^(\d+)/);
      if (matchAno) ano = `${matchAno[1]}º Ano`;

      const bimestreAlvo = periodoLetivo || (selectedDate ? getBimestrePorData(selectedDate) : currentBimestre) || '1º Bimestre';

      const chave = {
        modalidade,
        ano,
        bimestre: bimestreAlvo,
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
          unidades = (await OfflineStorage.getCachedCurriculo(chave)) as unknown as CurriculoUnidade[];
        }

        setUnidadesBD(unidades || []);
      } catch (err) {
        console.error('Erro ao buscar currículo para avaliação:', err);
        const unidadesCache = (await OfflineStorage.getCachedCurriculo(chave)) as unknown as CurriculoUnidade[];
        setUnidadesBD(unidadesCache || []);
      } finally {
        setLoadingCurriculo(false);
      }
    }

    loadCurriculo();
  }, [turmaAtiva, selectedDate, periodoLetivo, currentBimestre]);

  // Memos para opções de objetos de conhecimento
  const unidadesOpcoes = React.useMemo(() => {
    const list: string[] = [];
    unidadesBD.forEach(u => {
      if (u.nome && !list.includes(u.nome)) {
        list.push(u.nome);
      }
    });
    if (selectedDate && conteudos) {
      const bim = periodoLetivo || getBimestrePorData(selectedDate);
      conteudos
        .filter(c => getBimestrePorData(c.data) === bim)
        .forEach(c => {
          if (c.habilidades && c.habilidades[0] && !list.includes(c.habilidades[0])) {
            list.push(c.habilidades[0]);
          }
        });
    }
    return list;
  }, [unidadesBD, selectedDate, periodoLetivo, conteudos]);

  const objetosOpcoes = React.useMemo(() => {
    if (!unidadeDidatica) return [];
    const list: string[] = [];

    const matchedUnidade = unidadesBD.find(u => u.nome === unidadeDidatica);
    if (matchedUnidade && matchedUnidade.objetos) {
      matchedUnidade.objetos.forEach((o: CurriculoObjeto | string) => {
        const desc = typeof o === 'object' && o !== null ? (o.descricao || '') : String(o);
        if (desc && !list.includes(desc)) {
          list.push(desc);
        }
      });
    }

    if (conteudos) {
      conteudos
        .filter(c => c.habilidades && c.habilidades[0] === unidadeDidatica)
        .flatMap(c => c.objetos || [])
        .forEach(desc => {
          if (desc && !list.includes(desc)) {
            list.push(desc);
          }
        });
    }

    return list;
  }, [unidadeDidatica, unidadesBD, conteudos]);

  // Alunos filtrados para notas:
  // - 2ª Chamada (2CH): alunos faltosos na data original OU sem nota lançada na original OU que já tenham nota nesta 2CH
  // - Recuperação Paralela (RP): alunos que realizaram a avaliação original e obtiveram nota abaixo de 50%
  const alunosParaNotas = React.useMemo(() => {
    if (!selectedAvaliacao) return [];
    if (selectedAvaliacao.parent_id) {
      const parentAv = avaliacoes.find(a => String(a.id) === String(selectedAvaliacao.parent_id));
      const parentId = String(selectedAvaliacao.parent_id);

      if (selectedAvaliacao.tipo?.includes('2CH')) {
        const parentDataIso = parentAv ? formatarDataParaISO(parentAv.data) : '';
        const faltasPai = parentDataIso ? (faltasPorData[parentDataIso] || new Set()) : new Set();
        return alunos.filter(aluno => {
          const jaTemNota2CH = aluno.notas?.[selectedAvaliacao.id] !== undefined && String(aluno.notas[selectedAvaliacao.id]).trim() !== '';
          const faltouNaOrigem = faltasPai.has(aluno.id);
          const notaPai = aluno.notas?.[parentId];
          const semNotaOrigem = notaPai === undefined || notaPai === null || String(notaPai).trim() === '';
          return jaTemNota2CH || faltouNaOrigem || semNotaOrigem;
        });
      }

      // Lógica de RP: alunos com nota abaixo de 50% do valor máximo da avaliação
      const parentMax = parentAv?.valorMaximo ? Number(parentAv.valorMaximo) : (selectedAvaliacao.valorMaximo ? Number(selectedAvaliacao.valorMaximo) : 10);
      const mediaCorte = parentMax / 2;
      return alunos.filter(aluno => {
        const notaPaiStr = aluno.notas?.[parentId];
        if (notaPaiStr === undefined || notaPaiStr === null || String(notaPaiStr).trim() === '') return false;
        const notaPai = parseFloat(notaPaiStr.replace(',', '.'));
        return !isNaN(notaPai) && notaPai < mediaCorte;
      });
    }
    return alunos;
  }, [selectedAvaliacao, alunos, avaliacoes, faltasPorData]);

  // Carregar notas ao entrar em modo editor
   
  useEffect(() => {
    if (avaliacaoViewMode === 'grades' && selectedAvaliacao) {
      const notasMap: Record<string, string> = {};
      alunosParaNotas.forEach(aluno => {
        notasMap[aluno.id] = aluno.notas?.[selectedAvaliacao.id] || '';
      });
      setLocalNotas(notasMap);
    }
  }, [avaliacaoViewMode, selectedAvaliacao, alunosParaNotas]);
   

  // Handlers para sincronização de período letivo e data
  const handleSetPeriodoLetivo = (novoBim: string) => {
    setPeriodoLetivo(novoBim);
    setUnidadeDidatica('');
    setObjetoConhecimento('');
    if (novoBim) {
      const periodoConfig = APP_CONFIG.PERIODOS.find(p => p.nome === novoBim || p.id === novoBim);
      if (periodoConfig && getBimestrePorData(selectedDate) !== novoBim) {
        setSelectedDate(periodoConfig.dataInicio);
        const [y, m] = periodoConfig.dataInicio.split('-').map(Number);
        if (y && m) {
          setCalendarYear(y);
          setCalendarMonth(m - 1);
        }
      }
    }
  };

  const handleSetSelectedDate = (novaData: string) => {
    setSelectedDate(novaData);
    const novoBim = getBimestrePorData(novaData);
    if (novoBim) {
      setPeriodoLetivo(novoBim);
      setUnidadeDidatica('');
      setObjetoConhecimento('');
    }
  };

  // Carregar faltas de cada data de avaliação automaticamente
  useEffect(() => {
    if (avaliacoes && avaliacoes.length > 0) {
      avaliacoes.forEach(av => {
        if (av.data && !av.parent_id) {
          carregarFaltasDaData(av.data);
        }
      });
    }
  }, [avaliacoes, carregarFaltasDaData]);
   

  // Avaliação com notas/RP/2CH pendentes no bimestre ativo (se houver)
  const avaliacaoPendente = React.useMemo(() => {
    if (!avaliacoes || avaliacoes.length === 0 || !alunos || alunos.length === 0) {
      return null;
    }

    const targetNum = getBimestreNumero(currentBimestre);
    const avsPrincipaisDoBimestre = avaliacoes.filter(av => {
      if (av.parent_id) return false;
      const avNum = getBimestreNumero(av.bimestre || '') ?? getBimestreNumero(av.data);
      return avNum === targetNum;
    });

    if (avsPrincipaisDoBimestre.length === 0) return null;

    for (const av of avsPrincipaisDoBimestre) {
      if (isAvaliacaoPendente(av, avaliacoes, alunos, faltasPorData)) {
        return av;
      }
    }

    return null;
  }, [avaliacoes, alunos, faltasPorData, currentBimestre]);

  // Handlers
  const resetForm = () => {
    setSelectedDate('');
    setObjetosAvaliacao([]);
    setSelectedAvaliacao(null);
    setCaptchaInput('');
    setPeriodoLetivo('');
    setUnidadeDidatica('');
    setObjetoConhecimento('');
    setValorMaximo('10,00');
    generateNewCaptcha();
  };

  const handleSaveAvaliacao = async () => {
    if (isSaving) return;
    if (!validateCaptcha()) { alert('Código incorreto!'); return; }
    if (!selectedDate) { alert('Selecione uma data!'); return; }
    if (objetosAvaliacao.length === 0) { alert('Adicione pelo menos um Objeto de Conhecimento!'); return; }

    const isEditingExisting = selectedAvaliacao && avaliacoes.some(a => String(a.id) === String(selectedAvaliacao.id));
    const isCreatingChildEvaluation = selectedAvaliacao && !!selectedAvaliacao.parent_id;

    if (!isEditingExisting && !isCreatingChildEvaluation && avaliacaoPendente) {
      alert(getMensagemPendenciaAvaliacao(avaliacaoPendente, avaliacoes, alunos, faltasPorData));
      return;
    }

    const valMax = parseFloat(valorMaximo.replace(',', '.')) || 10;
    const bimestre = getBimestrePorData(selectedDate);

    // Validação de limite de pontos do bimestre para avaliações principais
    if (!isCreatingChildEvaluation) {
      const { limite, somaExistentes, pontosDisponiveis } = getInfoPontosBimestre(
        bimestre,
        avaliacoes,
        isEditingExisting ? selectedAvaliacao.id : undefined
      );

      if (valMax > pontosDisponiveis) {
        alert(
          `A pontuação informada (${valMax.toFixed(2).replace('.', ',')} pts) excede o limite máximo permitido de ${limite.toFixed(2).replace('.', ',')} pontos do ${bimestre}.\n\n` +
          `Pontos já utilizados em outras avaliações do bimestre: ${somaExistentes.toFixed(2).replace('.', ',')} pts.\n` +
          `Pontos disponíveis para esta avaliação: ${pontosDisponiveis.toFixed(2).replace('.', ',')} pts.`
        );
        return;
      }
    }

    const payload: Avaliacao = {
      id: isEditingExisting ? selectedAvaliacao.id : `temp_${Date.now()}`,
      turmaId: turmaAtiva?.id || '',
      tipo: selectedAvaliacao?.tipo || `AV${String(avaliacoesDoBimestre.length + 1).padStart(2, '0')}`,
      data: selectedDate,
      instrumento: instrumentoAvaliacao,
      objetos: objetosAvaliacao,
      bimestre,
      valorMaximo: valMax,
      parent_id: selectedAvaliacao?.parent_id
    };

    try {
      setIsSaving(true);
      await salvarAvaliacao(payload);
      setAvaliacaoViewMode('list');
      resetForm();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmGrades = async () => {
    if (!validateCaptcha()) { alert('Código incorreto!'); return; }
    if (!selectedAvaliacao) return;

    const maxVal = selectedAvaliacao.valorMaximo ? Number(selectedAvaliacao.valorMaximo) : 10;

    const notasToSave: { alunoId: string; valor: string }[] = [];
    const removidos: string[] = [];

    Object.entries(localNotas).forEach(([alunoId, valor]) => {
      if (valor !== '') {
        notasToSave.push({ alunoId, valor });
      } else {
        removidos.push(alunoId);
      }
    });

    const notaInvalida = notasToSave.find(n => {
      const v = parseFloat(n.valor.replace(',', '.'));
      return !isNaN(v) && v > maxVal;
    });

    if (notaInvalida) {
      alert(`A nota informada (${notaInvalida.valor}) é superior ao valor máximo permitido (${maxVal.toFixed(2).replace('.', ',')}) para esta avaliação.`);
      return;
    }

    await salvarNotas(selectedAvaliacao.id, notasToSave, removidos);
    setAvaliacaoViewMode('list');
    resetForm();
  };

  const handleSaveSecondCall = async () => {
    if (!validateCaptcha()) { alert('Código incorreto!'); return; }
    if (!selectedAvaliacao) return;

    const maxVal = selectedAvaliacao.valorMaximo ? Number(selectedAvaliacao.valorMaximo) : 10;
    const selectedAlunIds = Object.keys(secondCallRows).filter(id => secondCallRows[id].selected);
    if (selectedAlunIds.length === 0) { alert('Selecione pelo menos um aluno!'); return; }

    for (const id of selectedAlunIds) {
      const g = parseFloat((secondCallRows[id].grade || '').replace(',', '.'));
      if (!isNaN(g) && g > maxVal) {
        alert(`A nota digitada (${secondCallRows[id].grade}) excede o valor máximo permitido (${maxVal.toFixed(2).replace('.', ',')}).`);
        return;
      }
    }

    try {
      setIsSaving(true);
      const dates = [...new Set(selectedAlunIds.map(id => secondCallRows[id].date))];

      for (const d of dates) {
        const payload: Avaliacao = {
          id: `temp_2ch_${Date.now()}_${d}`,
          turmaId: selectedAvaliacao.turmaId,
          tipo: `2CH`,
          data: d,
          instrumento: selectedAvaliacao.instrumento,
          objetos: selectedAvaliacao.objetos,
          bimestre: selectedAvaliacao.bimestre,
          valorMaximo: selectedAvaliacao.valorMaximo || 10,
          parent_id: selectedAvaliacao.id
        };

        const createdId = await salvarAvaliacao(payload);
        const notasParaData = selectedAlunIds
          .filter(id => secondCallRows[id].date === d && secondCallRows[id].grade && secondCallRows[id].grade.trim() !== '')
          .map(id => ({ alunoId: id, valor: secondCallRows[id].grade }));
        
        if (notasParaData.length > 0 && createdId) {
          await salvarNotas(createdId, notasParaData);
        }
      }

      setAvaliacaoViewMode('list');
      resetForm();
    } catch (err) {
      console.error('Erro ao salvar segunda chamada:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotaChange = (alunoId: string, val: string) => {
    const numStr = val.replace(/\D/g, '');
    if (!numStr) { setLocalNotas(prev => ({ ...prev, [alunoId]: '' })); return; }
    const numVal = parseInt(numStr, 10);
    const maxVal = selectedAvaliacao?.valorMaximo ? Number(selectedAvaliacao.valorMaximo) : 10;
    const maxPermitido = Math.round(maxVal * 100);
    if (numVal > maxPermitido) return;
    const formatted = (numVal / 100).toFixed(2).replace('.', ',');
    setLocalNotas(prev => ({ ...prev, [alunoId]: formatted }));
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p className="font-medium">Carregando dados da turma...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-4 duration-300">

      {avaliacaoViewMode === 'list' && (
        <AvaliacoesList 
          avaliacoes={avaliacoes}
          todasAvaliacoes={avaliacoes}
          currentBimestre={currentBimestre}
          alunos={alunos}
          faltasPorData={faltasPorData}
          onViewDetails={(av) => { setSelectedAvaliacao(av); setAvaliacaoViewMode('details'); }}
          onEdit={(av) => { 
            setSelectedAvaliacao(av); 
            setSelectedDate(av.data); 
            setPeriodoLetivo(av.bimestre || getBimestrePorData(av.data));
            const [y, m] = av.data.split('-').map(Number);
            if (y && m) {
              setCalendarYear(y);
              setCalendarMonth(m - 1);
            }
            setInstrumentoAvaliacao(av.instrumento || 'AVALIACAO ESCRITA'); 
            setObjetosAvaliacao(av.objetos || []); 
            setValorMaximo(av.valorMaximo ? av.valorMaximo.toString().replace('.', ',') : '10,00');
            setAvaliacaoViewMode('edit'); 
          }}
          onDelete={(av) => { setAvaliacaoToDelete(av); setShowDeleteModal(true); }}
          onAddRP={(av) => {
            const dataIso = formatarDataParaISO(av.data);
            const faltasNoDia = faltasPorData[dataIso] || new Set();
            const alunosPresentes = alunos.filter(a => !faltasNoDia.has(a.id));
            const temNotasPendentes = alunosPresentes.length > 0 && alunosPresentes.some(a => {
              const nota = a.notas?.[av.id] ?? a.notas?.[String(av.id)];
              return nota === undefined || nota === null || String(nota).trim() === '';
            });

            if (temNotasPendentes) {
              alert(`Não é possível adicionar Recuperação Paralela. A avaliação ${av.tipo} possui notas pendentes. Lance todas as notas da avaliação antes de prosseguir.`);
              return;
            }

            const novoRP: Avaliacao = {
              id: '',
              turmaId: av.turmaId,
              tipo: av.tipo.includes('AV') ? av.tipo.replace('AV', 'RP') : `RP - ${av.tipo}`,
              data: av.data,
              instrumento: av.instrumento,
              objetos: av.objetos,
              bimestre: av.bimestre,
              valorMaximo: av.valorMaximo || 10,
              parent_id: av.id
            };
            setSelectedAvaliacao(novoRP);
            setSelectedDate(novoRP.data);
            setPeriodoLetivo(novoRP.bimestre || getBimestrePorData(novoRP.data));
            const [y, m] = novoRP.data.split('-').map(Number);
            if (y && m) {
              setCalendarYear(y);
              setCalendarMonth(m - 1);
            }
            setInstrumentoAvaliacao(novoRP.instrumento);
            setObjetosAvaliacao(novoRP.objetos || []);
            setValorMaximo(novoRP.valorMaximo ? novoRP.valorMaximo.toString().replace('.', ',') : '10,00');
            setAvaliacaoViewMode('edit');
          }}
          onShowGrades={(av) => { setSelectedAvaliacao(av); carregarFaltasDaData(av.data); setAvaliacaoViewMode('grades'); }}
          onSecondCall={(av) => {
            setSelectedAvaliacao(av);
            carregarFaltasDaData(av.data);
            const rows: Record<string, { selected: boolean; date: string; grade: string }> = {};
            alunos.forEach(a => {
              rows[a.id] = { selected: !a.notas?.[av.id], date: av.data, grade: '' };
            });
            setSecondCallRows(rows);
            setAvaliacaoViewMode('second_call');
            generateNewCaptcha();
          }}
          onAddAvaliacao={() => { 
            if (avaliacaoPendente) {
              alert(getMensagemPendenciaAvaliacao(avaliacaoPendente, avaliacoes, alunos, faltasPorData));
              return;
            }
            const periodoConfig = APP_CONFIG.PERIODOS.find(p => p.nome === currentBimestre || p.id === currentBimestre);
            let dataPadrao = dataContexto;
            if (!dataPadrao || getBimestrePorData(dataPadrao) !== currentBimestre) {
              dataPadrao = periodoConfig?.dataInicio || new Date().toISOString().split('T')[0];
            }
            const { limite, pontosDisponiveis } = getInfoPontosBimestre(currentBimestre, avaliacoes);

            if (pontosDisponiveis <= 0) {
              alert(`A pontuação máxima do ${currentBimestre} (${limite.toFixed(2).replace('.', ',')} pontos) já foi totalmente distribuída entre as avaliações cadastradas.`);
              return;
            }

            resetForm(); 
            setSelectedDate(dataPadrao);
            setPeriodoLetivo(currentBimestre);
            const [pY, pM] = dataPadrao.split('-').map(Number);
            if (pY && pM) {
              setCalendarYear(pY);
              setCalendarMonth(pM - 1);
            }
            const maxSugerido = Math.min(10, pontosDisponiveis);
            setValorMaximo(maxSugerido.toFixed(2).replace('.', ','));
            setAvaliacaoViewMode('edit'); 
          }}
          disabled={disabled}
        />
      )}

      {avaliacaoViewMode === 'edit' && (
        <AvaliacaoForm 
          selectedAvaliacao={selectedAvaliacao}
          selectedDate={selectedDate}
          instrumentoAvaliacao={instrumentoAvaliacao}
          objetosAvaliacao={objetosAvaliacao}
          periodoLetivo={periodoLetivo}
          unidadeDidatica={unidadeDidatica}
          objetoConhecimento={objetoConhecimento}
          valorMaximo={valorMaximo}
          unidadesOpcoes={unidadesOpcoes}
          objetosOpcoes={objetosOpcoes}
          generatedCaptcha={generatedCaptcha}
          captchaInput={captchaInput}
          captchaError={captchaError}
          isDatePickerOpen={isDatePickerOpen}
          calendarMonth={calendarMonth}
          calendarYear={calendarYear}
          PERIODOS_LABELS={PERIODOS_LABELS}
          onSave={handleSaveAvaliacao}
          onCancel={() => { setAvaliacaoViewMode('list'); resetForm(); }}
          onAddObjeto={() => {
            const u = unidadeDidatica.trim() || 'Conteúdo da Avaliação';
            const o = objetoConhecimento.trim();
            if (!o) return alert('Por favor, informe o Objeto de Conhecimento!');
            if (objetosAvaliacao.some(item => item.unidade === u && item.objeto === o)) {
              return alert('Este objeto de conhecimento já foi adicionado à avaliação!');
            }
            setObjetosAvaliacao(prev => [...prev, { unidade: u, objeto: o }]);
            setObjetoConhecimento('');
          }}
          onRemoveObjeto={(idx) => setObjetosAvaliacao(prev => prev.filter((_, i) => i !== idx))}
          onSetSelectedDate={handleSetSelectedDate}
          onSetIsDatePickerOpen={setIsDatePickerOpen}
          onSetInstrumentoAvaliacao={setInstrumentoAvaliacao}
          onSetPeriodoLetivo={handleSetPeriodoLetivo}
          onSetUnidadeDidatica={setUnidadeDidatica}
          onSetObjetoConhecimento={setObjetoConhecimento}
          onSetValorMaximo={setValorMaximo}
          onSetCaptchaInput={setCaptchaInput}
          onGenerateNewCaptcha={generateNewCaptcha}
          onSetCalendarMonth={setCalendarMonth}
          onSetCalendarYear={setCalendarYear}
          isSaving={isSaving}
        />
      )}

      {avaliacaoViewMode === 'details' && (
        <AvaliacaoDetailsView 
          selectedAvaliacao={selectedAvaliacao}
          onBack={() => { setAvaliacaoViewMode('list'); setSelectedAvaliacao(null); }}
        />
      )}

      {avaliacaoViewMode === 'grades' && (
        <NotasEditor 
          selectedAvaliacao={selectedAvaliacao}
          alunosParaNotas={alunosParaNotas}
          localNotas={localNotas}
          faltasPorData={faltasPorData}
          generatedCaptcha={generatedCaptcha}
          captchaInput={captchaInput}
          captchaError={captchaError}
          onNotaChange={handleNotaChange}
          onConfirm={handleConfirmGrades}
          onCancel={() => { setAvaliacaoViewMode('list'); resetForm(); }}
          onSetCaptchaInput={setCaptchaInput}
          onGenerateNewCaptcha={generateNewCaptcha}
          disabled={disabled}
        />
      )}

      {avaliacaoViewMode === 'second_call' && (
        <SegundaChamadaEditor 
          selectedAvaliacao={selectedAvaliacao}
          alunos={alunos.filter(a => faltasPorData[formatarDataParaISO(selectedAvaliacao?.data || '')]?.has(a.id))}
          secondCallRows={secondCallRows}
          isSaving={isSaving}
          generatedCaptcha={generatedCaptcha}
          captchaInput={captchaInput}
          captchaError={captchaError}
          onSetSecondCallRows={setSecondCallRows}
          onSave={handleSaveSecondCall}
          onCancel={() => { setAvaliacaoViewMode('list'); resetForm(); }}
          onSetCaptchaInput={setCaptchaInput}
          onGenerateNewCaptcha={generateNewCaptcha}
        />
      )}

      {showDeleteModal && (
        <DeleteAvaliacaoModal 
          onConfirm={async () => {
            if (avaliacaoToDelete) await removerAvaliacao(avaliacaoToDelete.id);
            setShowDeleteModal(false);
            setAvaliacaoToDelete(null);
          }}
          onCancel={() => { setShowDeleteModal(false); setAvaliacaoToDelete(null); }}
        />
      )}
    </div>
  );
}
