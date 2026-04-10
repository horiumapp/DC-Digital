import React, { useState, useEffect } from 'react';
import { Loader2, Check, X } from 'lucide-react';
import { useTurma, Avaliacao, Aluno } from '../../contexts/TurmaContext';
import { APP_CONFIG } from '../../config/appConfig';
import { useCaptcha } from '../../hooks/useCaptcha';
import { getBimestrePorData, formatarDataParaISO } from '../../utils/dateUtils';

// Sub-componentes
import AvaliacoesList from './avaliacoes/AvaliacoesList';
import AvaliacaoForm from './avaliacoes/AvaliacaoForm';
import AvaliacaoDetailsView from './avaliacoes/AvaliacaoDetailsView';
import NotasEditor from './avaliacoes/NotasEditor';
import SegundaChamadaEditor from './avaliacoes/SegundaChamadaEditor';
import DeleteAvaliacaoModal from './avaliacoes/DeleteAvaliacaoModal';

export default function AvaliacoesTab() {
  const { 
    turmaAtiva, alunos, avaliacoes, conteudos, loading, 
    salvarAvaliacao, removerAvaliacao, salvarNotas, 
    carregarFaltasDaData, faltasPorData 
  } = useTurma();

  const [avaliacaoViewMode, setAvaliacaoViewMode] = useState<'list' | 'details' | 'edit' | 'grades' | 'second_call'>('list');
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [instrumentoAvaliacao, setInstrumentoAvaliacao] = useState('AVALIACAO ESCRITA');
  const [objetosAvaliacao, setObjetosAvaliacao] = useState<any[]>([]);
  const [periodoLetivo, setPeriodoLetivo] = useState('');
  const [unidadeDidatica, setUnidadeDidatica] = useState('');
  const [objetoConhecimento, setObjetoConhecimento] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [avaliacaoToDelete, setAvaliacaoToDelete] = useState<any>(null);
  const [localNotas, setLocalNotas] = useState<Record<string, string>>({});
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [successMessage, setSuccessMessage] = useState('');
  const [secondCallRows, setSecondCallRows] = useState<Record<string, { selected: boolean, date: string, grade: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

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

  // Alunos filtrados para notas (lógica de RP)
  const alunosParaNotas = React.useMemo(() => {
    if (!selectedAvaliacao) return [];
    if (selectedAvaliacao.parent_id) {
      return alunos.filter(aluno => {
        const notaPai = parseFloat((aluno.notas?.[selectedAvaliacao.parent_id] || '0').replace(',', '.'));
        return notaPai < 6.0;
      });
    }
    return alunos;
  }, [selectedAvaliacao, alunos]);

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

  // Handlers
  const resetForm = () => {
    setSelectedDate('');
    setObjetosAvaliacao([]);
    setSelectedAvaliacao(null);
    setCaptchaInput('');
    setPeriodoLetivo('');
    setUnidadeDidatica('');
    setObjetoConhecimento('');
    generateNewCaptcha();
  };

  const handleSaveAvaliacao = async () => {
    if (!validateCaptcha()) { alert('Código incorreto!'); return; }
    if (!selectedDate) { alert('Selecione uma data!'); return; }
    if (objetosAvaliacao.length === 0) { alert('Adicione pelo menos um Objeto de Conhecimento!'); return; }

    const payload: Avaliacao = {
      id: selectedAvaliacao ? selectedAvaliacao.id : `temp_${Date.now()}`,
      turmaId: turmaAtiva?.id || '',
      tipo: selectedAvaliacao?.tipo || `AV${String(avaliacoes.filter(a => !a.parent_id).length + 1).padStart(2, '0')}`,
      data: selectedDate,
      instrumento: instrumentoAvaliacao,
      objetos: objetosAvaliacao,
      bimestre: getBimestrePorData(selectedDate),
      valorMaximo: 10,
      parent_id: selectedAvaliacao?.parent_id
    };

    await salvarAvaliacao(payload);
    setAvaliacaoViewMode('list');
    resetForm();
  };

  const handleConfirmGrades = async () => {
    if (!validateCaptcha()) { alert('Código incorreto!'); return; }
    if (!selectedAvaliacao) return;

    const notasToSave = Object.entries(localNotas)
      .filter(([_, val]) => val !== '')
      .map(([alunoId, valor]) => ({ alunoId, valor }));

    await salvarNotas(selectedAvaliacao.id, notasToSave);
    setAvaliacaoViewMode('list');
    resetForm();
  };

  const handleSaveSecondCall = async () => {
    if (!validateCaptcha()) { alert('Código incorreto!'); return; }
    if (!selectedAvaliacao) return;

    const selectedAlunIds = Object.keys(secondCallRows).filter(id => secondCallRows[id].selected);
    if (selectedAlunIds.length === 0) { alert('Selecione pelo menos um aluno!'); return; }

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
        valorMaximo: 10,
        parent_id: selectedAvaliacao.id
      };

      const createdId = await salvarAvaliacao(payload);
      const notasParaData = selectedAlunIds
        .filter(id => secondCallRows[id].date === d)
        .map(id => ({ alunoId: id, valor: secondCallRows[id].grade }));
      
      await salvarNotas(createdId, notasParaData);
    }

    setSuccessMessage('Avaliação(ões) de segunda chamada salva(s) com sucesso!');
    setTimeout(() => setSuccessMessage(''), 5000);
    setAvaliacaoViewMode('list');
    setIsSaving(false);
  };

  const handleNotaChange = (alunoId: string, val: string) => {
    let numStr = val.replace(/\D/g, '');
    if (!numStr) { setLocalNotas(prev => ({ ...prev, [alunoId]: '' })); return; }
    let numVal = parseInt(numStr, 10);
    if (numVal > 1000) return;
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
      {/* Banner de Sucesso */}
      {successMessage && (
        <div className="mb-6 flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
              <Check className="w-5 h-5" />
            </div>
            <p className="font-medium">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage('')} className="p-1 hover:bg-emerald-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
      )}

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
            setAvaliacaoViewMode('edit'); 
          }}
          onDelete={(av) => { setAvaliacaoToDelete(av); setShowDeleteModal(true); }}
          onAddRP={(av) => {
            const novoRP: any = {
              turmaId: av.turmaId,
              tipo: av.tipo.includes('AV') ? av.tipo.replace('AV', 'RP') : `RP - ${av.tipo}`,
              data: new Date().toISOString().split('T')[0],
              instrumento: av.instrumento,
              objetos: av.objetos,
              bimestre: av.bimestre,
              valorMaximo: 10,
              parent_id: av.id
            };
            setSelectedAvaliacao(novoRP);
            setSelectedDate(novoRP.data);
            setInstrumentoAvaliacao(novoRP.instrumento);
            setObjetosAvaliacao(novoRP.objetos);
            setAvaliacaoViewMode('edit');
          }}
          onShowGrades={(av) => { setSelectedAvaliacao(av); setAvaliacaoViewMode('grades'); }}
          onSecondCall={(av) => {
            setSelectedAvaliacao(av);
            const rows: any = {};
            alunos.forEach(a => {
              rows[a.id] = { selected: !a.notas?.[av.id], date: new Date().toISOString().split('T')[0], grade: '' };
            });
            setSecondCallRows(rows);
            setAvaliacaoViewMode('second_call');
            generateNewCaptcha();
          }}
          onAddAvaliacao={() => { resetForm(); setAvaliacaoViewMode('edit'); }}
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
