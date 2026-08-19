import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useTurma, Avaliacao, ObjetoAvaliacao } from '../../contexts/TurmaContext';
import { APP_CONFIG } from '../../config/appConfig';
import { useCaptcha } from '../../hooks/useCaptcha';
import { getBimestrePorData, formatarDataParaISO } from '../../utils/dateUtils';
import { isAvaliacaoPendente, getMensagemPendenciaAvaliacao, getInfoPontosBimestre } from '../../utils/avaliacaoUtils';

// Sub-componentes
import AvaliacoesList from './avaliacoes/AvaliacoesList';
import AvaliacaoForm from './avaliacoes/AvaliacaoForm';
import AvaliacaoDetailsView from './avaliacoes/AvaliacaoDetailsView';
import NotasEditor from './avaliacoes/NotasEditor';
import SegundaChamadaEditor from './avaliacoes/SegundaChamadaEditor';
import DeleteAvaliacaoModal from './avaliacoes/DeleteAvaliacaoModal';

interface AvaliacoesTabProps {
  disabled?: boolean;
}

export default function AvaliacoesTab({ disabled }: AvaliacoesTabProps) {
  const { 
    turmaAtiva, alunos, avaliacoes, conteudos, loading, 
    salvarAvaliacao, removerAvaliacao, salvarNotas, 
    carregarFaltasDaData, faltasPorData 
  } = useTurma();

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

  // Memos para opções de objetos de conhecimento
  const unidadesOpcoes = React.useMemo(() => {
    if (!selectedDate || !conteudos) return [];
    const bimestreAtual = getBimestrePorData(selectedDate);
    const unidades = conteudos
      .filter(c => getBimestrePorData(c.data) === bimestreAtual)
      .map(c => c.habilidades[0])
      .filter((u, index, self) => u && self.indexOf(u) === index);
    return unidades;
  }, [selectedDate, conteudos]);

  const objetosOpcoes = React.useMemo(() => {
    if (!unidadeDidatica || !conteudos) return [];
    const objetos = conteudos
      .filter(c => c.habilidades[0] === unidadeDidatica)
      .flatMap(c => c.objetos)
      .filter((o, index, self) => o && self.indexOf(o) === index);
    return objetos;
  }, [unidadeDidatica, conteudos]);

  // Alunos filtrados para notas (lógica de RP: alunos com nota abaixo de 50% do valor máximo da avaliação)
  const alunosParaNotas = React.useMemo(() => {
    if (!selectedAvaliacao) return [];
    if (selectedAvaliacao.parent_id) {
      const parentAv = avaliacoes.find(a => String(a.id) === String(selectedAvaliacao.parent_id));
      const parentMax = parentAv?.valorMaximo ? Number(parentAv.valorMaximo) : (selectedAvaliacao.valorMaximo ? Number(selectedAvaliacao.valorMaximo) : 10);
      const mediaCorte = parentMax / 2;
      return alunos.filter(aluno => {
        const parentId = String(selectedAvaliacao.parent_id);
        const notaPaiStr = aluno.notas?.[parentId];
        const notaPai = parseFloat((notaPaiStr || '0').replace(',', '.'));
        return !isNaN(notaPai) && notaPai < mediaCorte;
      });
    }
    return alunos;
  }, [selectedAvaliacao, alunos, avaliacoes]);

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
   

  // Atualizar período letivo pela data selecionada
   
  useEffect(() => {
    if (selectedDate) {
      const bim = getBimestrePorData(selectedDate);
      setPeriodoLetivo(bim);
      setUnidadeDidatica('');
      setObjetoConhecimento('');
    }
  }, [selectedDate]);

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
   

  // Avaliação com notas/RP/2CH pendentes (se houver)
  const avaliacaoPendente = React.useMemo(() => {
    if (!avaliacoes || avaliacoes.length === 0 || !alunos || alunos.length === 0) {
      return null;
    }

    const avsPrincipais = avaliacoes.filter(av => !av.parent_id);
    if (avsPrincipais.length === 0) return null;

    for (const av of avsPrincipais) {
      if (isAvaliacaoPendente(av, avaliacoes, alunos, faltasPorData)) {
        return av;
      }
    }

    return null;
  }, [avaliacoes, alunos, faltasPorData]);

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
      tipo: selectedAvaliacao?.tipo || `AV${String(avaliacoes.filter(a => !a.parent_id).length + 1).padStart(2, '0')}`,
      data: selectedDate,
      instrumento: instrumentoAvaliacao,
      objetos: objetosAvaliacao,
      bimestre,
      valorMaximo: valMax,
      parent_id: selectedAvaliacao?.parent_id
    };

    await salvarAvaliacao(payload);
    setAvaliacaoViewMode('list');
    resetForm();
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
        .filter(id => secondCallRows[id].date === d)
        .map(id => ({ alunoId: id, valor: secondCallRows[id].grade }));
      
      await salvarNotas(createdId, notasParaData);
    }

    setAvaliacaoViewMode('list');
    setIsSaving(false);
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
          alunos={alunos}
          faltasPorData={faltasPorData}
          onViewDetails={(av) => { setSelectedAvaliacao(av); setAvaliacaoViewMode('details'); }}
          onEdit={(av) => { 
            setSelectedAvaliacao(av); 
            setSelectedDate(av.data); 
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
              data: new Date().toISOString().split('T')[0],
              instrumento: av.instrumento,
              objetos: av.objetos,
              bimestre: av.bimestre,
              valorMaximo: av.valorMaximo || 10,
              parent_id: av.id
            };
            setSelectedAvaliacao(novoRP);
            setSelectedDate(novoRP.data);
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
              rows[a.id] = { selected: !a.notas?.[av.id], date: new Date().toISOString().split('T')[0], grade: '' };
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
            const dataPadrao = new Date().toISOString().split('T')[0];
            const bimPadrao = getBimestrePorData(dataPadrao);
            const { limite, pontosDisponiveis } = getInfoPontosBimestre(bimPadrao, avaliacoes);

            if (pontosDisponiveis <= 0) {
              alert(`A pontuação máxima do ${bimPadrao} (${limite.toFixed(2).replace('.', ',')} pontos) já foi totalmente distribuída entre as avaliações cadastradas.`);
              return;
            }

            resetForm(); 
            setSelectedDate(dataPadrao);
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
            if (!unidadeDidatica || !objetoConhecimento) return alert('Selecione os campos!');
            if (objetosAvaliacao.some(o => o.unidade === unidadeDidatica && o.objeto === objetoConhecimento)) return alert('Já existe!');
            setObjetosAvaliacao(prev => [...prev, { unidade: unidadeDidatica, objeto: objetoConhecimento }]);
          }}
          onRemoveObjeto={(idx) => setObjetosAvaliacao(prev => prev.filter((_, i) => i !== idx))}
          onSetSelectedDate={setSelectedDate}
          onSetIsDatePickerOpen={setIsDatePickerOpen}
          onSetInstrumentoAvaliacao={setInstrumentoAvaliacao}
          onSetPeriodoLetivo={setPeriodoLetivo}
          onSetUnidadeDidatica={setUnidadeDidatica}
          onSetObjetoConhecimento={setObjetoConhecimento}
          onSetValorMaximo={setValorMaximo}
          onSetCaptchaInput={setCaptchaInput}
          onGenerateNewCaptcha={generateNewCaptcha}
          onSetCalendarMonth={setCalendarMonth}
          onSetCalendarYear={setCalendarYear}
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
