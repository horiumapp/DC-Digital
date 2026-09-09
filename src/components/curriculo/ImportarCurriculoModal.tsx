import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
  Loader2,
  Filter
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../common/Toast';
import { parseCurriculoText, CurriculoParseResult, ParsedCurriculoItem } from '../../utils/curriculoParser';

interface ImportarCurriculoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportarCurriculoModal({
  isOpen,
  onClose,
  onSuccess
}: ImportarCurriculoModalProps) {
  const { showSuccess, showError, showWarning } = useToast();

  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [fileText, setFileText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState<CurriculoParseResult | null>(null);
  const [substituirExistentes, setSubstituirExistentes] = useState(true);

  // Estados de importação
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });

  // Filtros da prévia
  const [previewFilterAno, setPreviewFilterAno] = useState('');
  const [previewFilterDisciplina, setPreviewFilterDisciplina] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFileText(content || '');
      const parsed = parseCurriculoText(content || '');
      setParseResult(parsed);
      if (parsed.records.length === 0) {
        showWarning('Nenhum conteúdo curricular foi detectado no arquivo.');
      }
    };
    // Tenta ler com UTF-8
    reader.readAsText(file, 'UTF-8');
  }

  function handleParseManualText() {
    if (!fileText.trim()) {
      showWarning('Insira ou cole o conteúdo antes de processar.');
      return;
    }
    const parsed = parseCurriculoText(fileText);
    setParseResult(parsed);
    if (parsed.records.length === 0) {
      showWarning('Nenhum conteúdo curricular detectado. Verifique a formatação.');
    }
  }

  async function handleConfirmImport() {
    if (!parseResult || parseResult.records.length === 0) {
      showWarning('Nenhum dado para importar.');
      return;
    }

    setImporting(true);
    const records = parseResult.records;
    const total = records.length;
    setProgress({ current: 0, total, percentage: 0 });

    try {
      // Processar em lotes de 5 para otimização e feedback em tempo real
      const BATCH_SIZE = 5;
      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (item: ParsedCurriculoItem) => {
          if (substituirExistentes) {
            // Remove registros anteriores com a mesma modalidade, ano, disciplina e bimestre
            const { data: existing } = await supabase
              .from('curriculo_unidades')
              .select('id')
              .eq('modalidade', item.modalidade)
              .eq('ano', item.ano)
              .eq('disciplina', item.disciplina)
              .eq('bimestre', item.bimestre);

            if (existing && existing.length > 0) {
              const ids = existing.map(e => e.id);
              await supabase.from('curriculo_objetos').delete().in('unidade_id', ids);
              await supabase.from('curriculo_unidades').delete().in('id', ids);
            }
          }

          // 1. Inserir Unidade
          const { data: unitData, error: unitError } = await supabase
            .from('curriculo_unidades')
            .insert([{
              modalidade: item.modalidade,
              ano: item.ano,
              disciplina: item.disciplina,
              bimestre: item.bimestre,
              nome: item.nome || 'Conteúdo Ministrado'
            }])
            .select('id')
            .single();

          if (unitError) throw unitError;

          // 2. Inserir Objetos de conhecimento
          if (item.objetos.length > 0 && unitData?.id) {
            const objectsToInsert = item.objetos.map(desc => ({
              unidade_id: unitData.id,
              descricao: desc
            }));

            const { error: objError } = await supabase
              .from('curriculo_objetos')
              .insert(objectsToInsert);

            if (objError) throw objError;
          }
        }));

        const currentCount = Math.min(i + BATCH_SIZE, total);
        const percent = Math.round((currentCount / total) * 100);
        setProgress({ current: currentCount, total, percentage: percent });
      }

      showSuccess(`Sucesso! ${total} unidades e ${parseResult.totalObjetos} conteúdos foram importados.`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao importar currículo';
      console.error('Erro na importação do currículo:', err);
      showError(`Erro ao salvar no banco: ${message}`);
    } finally {
      setImporting(false);
    }
  }

  // Filtragem da prévia
  const filteredPreview = (parseResult?.records || []).filter(item => {
    if (previewFilterAno && item.ano !== previewFilterAno) return false;
    if (previewFilterDisciplina && item.disciplina !== previewFilterDisciplina) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Cabeçalho */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#0f2851]">Importar Conteúdos Curriculares (BNCC)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Carregue um arquivo TXT/CSV ou cole os conteúdos para importação automática em lote.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={importing}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com abas e conteúdo */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Seleção de Abas */}
          <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'file'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Upload className="w-4 h-4" />
              Arquivo TXT / CSV
            </button>
            <button
              onClick={() => setActiveTab('text')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'text'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              Colar Texto
            </button>
          </div>

          {/* Tab Arquivo */}
          {activeTab === 'file' && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 hover:bg-blue-50/60 rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".txt,.csv,.tsv"
                  className="hidden"
                />
                <div className="p-4 bg-white rounded-2xl shadow-sm text-blue-600 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-bold text-slate-700 text-sm">
                    {fileName ? fileName : 'Clique aqui para selecionar o arquivo .txt ou .csv'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Suporta arquivos tabulados por série/bimestre (como Conteúdos.txt) ou planilhas delimitadas.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Colar Texto */}
          {activeTab === 'text' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-400 uppercase">
                Cole o conteúdo tabulado ou CSV abaixo:
              </label>
              <textarea
                value={fileText}
                onChange={(e) => setFileText(e.target.value)}
                placeholder="Cole aqui o conteúdo do arquivo TXT ou planilha com cabeçalhos de disciplinas e bimestres..."
                rows={7}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                onClick={handleParseManualText}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                Processar e Reconhecer
              </button>
            </div>
          )}

          {/* Resumo da Prévia do Parser */}
          {parseResult && parseResult.records.length > 0 && (
            <div className="space-y-6 pt-4 border-t border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-bold uppercase text-blue-500 tracking-wider">Unidades</span>
                  <p className="text-2xl font-black text-blue-700 mt-1">{parseResult.records.length}</p>
                  <span className="text-[11px] text-blue-600/80">Séries / Bimestres</span>
                </div>
                <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-bold uppercase text-emerald-500 tracking-wider">Conteúdos</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{parseResult.totalObjetos}</p>
                  <span className="text-[11px] text-emerald-600/80">Itens ministrados</span>
                </div>
                <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-100">
                  <span className="text-[10px] font-bold uppercase text-purple-500 tracking-wider">Séries/Anos</span>
                  <p className="text-sm font-bold text-purple-700 mt-2 truncate">
                    {parseResult.anosEncontrados.join(', ')}
                  </p>
                  <span className="text-[11px] text-purple-600/80">{parseResult.anosEncontrados.length} séries detectadas</span>
                </div>
                <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-bold uppercase text-amber-500 tracking-wider">Disciplinas</span>
                  <p className="text-sm font-bold text-amber-700 mt-2 truncate">
                    {parseResult.disciplinasEncontradas.join(', ')}
                  </p>
                  <span className="text-[11px] text-amber-600/80">{parseResult.disciplinasEncontradas.length} disciplinas</span>
                </div>
              </div>

              {/* Filtros da Prévia */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                  <Filter className="w-4 h-4" />
                  <span>Filtrar Prévia:</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={previewFilterAno}
                    onChange={(e) => setPreviewFilterAno(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="">Todas as Séries</option>
                    {parseResult.anosEncontrados.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>

                  <select
                    value={previewFilterDisciplina}
                    onChange={(e) => setPreviewFilterDisciplina(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                  >
                    <option value="">Todas as Disciplinas</option>
                    {parseResult.disciplinasEncontradas.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {/* Lista expansível de itens da prévia */}
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {filteredPreview.slice(0, 50).map((item, idx) => {
                  const isExpanded = expandedIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="bg-white border border-slate-100 rounded-2xl p-3 hover:border-blue-100 transition-all shadow-sm"
                    >
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold">
                            {item.ano}
                          </span>
                          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
                            {item.bimestre}
                          </span>
                          <span className="px-2.5 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[10px] font-bold">
                            {item.disciplina}
                          </span>
                          <span className="text-xs text-slate-400 font-medium ml-2">
                            ({item.objetos.length} conteúdos)
                          </span>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600 p-1">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-slate-50 space-y-1.5 pl-2">
                          {item.objetos.map((obj, oIdx) => (
                            <div key={oIdx} className="flex items-start gap-2 text-xs text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                              <span>{obj}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredPreview.length > 50 && (
                  <p className="text-center text-xs text-slate-400 py-2">
                    Mostrando os primeiros 50 itens da prévia ({filteredPreview.length} no total)...
                  </p>
                )}
              </div>

              {/* Opções de Importação */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="substituir"
                  checked={substituirExistentes}
                  onChange={(e) => setSubstituirExistentes(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="substituir" className="text-xs text-slate-600 cursor-pointer font-medium">
                  Substituir registros curriculares já cadastrados para a mesma Série, Disciplina e Bimestre
                  <span className="block text-[11px] text-slate-400">
                    Recomendado para evitar duplicações caso já tenha cadastrado testes anteriormente.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Barra de Progresso durante gravação */}
          {importing && (
            <div className="space-y-3 bg-blue-50/70 p-5 rounded-2xl border border-blue-100">
              <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Gravando no banco de dados Supabase...
                </span>
                <span>{progress.current} / {progress.total} unidades ({progress.percentage}%)</span>
              </div>
              <div className="w-full bg-blue-200/60 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <p className="text-[11px] text-blue-600">
                Por favor, aguarde. Os conteúdos e objetos de conhecimento estão sendo organizados e salvos.
              </p>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {parseResult?.records.length ? (
              <span className="flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle className="w-4 h-4" />
                {parseResult.records.length} unidades e {parseResult.totalObjetos} conteúdos prontos para salvar
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <AlertCircle className="w-4 h-4" />
                Aguardando arquivo ou texto
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              disabled={importing}
              className="px-5 py-3 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition-all w-full sm:w-auto disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={importing || !parseResult || parseResult.records.length === 0}
              className="px-6 py-3 bg-[#0f2851] hover:bg-blue-900 text-white rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Confirmar e Gravar Currículo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
