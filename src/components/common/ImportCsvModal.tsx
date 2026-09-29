import React, { useState, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Download,
  Info,
  Layers
} from 'lucide-react';
import { useToast } from './Toast';
import { downloadCsvFile } from '../../utils/csvImportExport';

export interface PreviewColumn<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
}

interface ImportCsvModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  templateFileName: string;
  templateCsvContent: string;
  parseFn: (text: string) => { valid: T[]; errors: string[] };
  onSave: (items: T[]) => Promise<void>;
  previewColumns: PreviewColumn<T>[];
  entityNamePlural: string;
}

export default function ImportCsvModal<T>({
  isOpen,
  onClose,
  title,
  subtitle,
  templateFileName,
  templateCsvContent,
  parseFn,
  onSave,
  previewColumns,
  entityNamePlural
}: ImportCsvModalProps<T>) {
  const { showSuccess, showError, showWarning } = useToast();

  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file');
  const [fileText, setFileText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedItems, setParsedItems] = useState<T[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processText = (text: string) => {
    setFileText(text);
    const { valid, errors } = parseFn(text);
    setParsedItems(valid);
    setParseErrors(errors);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        processText(text);
      };
      reader.readAsText(file, 'utf-8');
    } catch {
      showError('Erro ao ler o arquivo selecionado.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        processText(text);
      };
      reader.readAsText(file, 'utf-8');
    }
  };

  const handleDownloadTemplate = () => {
    downloadCsvFile(templateCsvContent, templateFileName);
    showSuccess('Modelo de planilha baixado! Abra no Excel ou Google Sheets para preencher.');
  };

  const handleConfirmSave = async () => {
    if (parsedItems.length === 0) {
      showWarning('Nenhum registro válido identificado para importar.');
      return;
    }

    setImporting(true);
    try {
      await onSave(parsedItems);
      showSuccess(`Sucesso! ${parsedItems.length} ${entityNamePlural} foram importados.`);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro ao gravar no banco.';
      showError(`Falha na importação: ${msg}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-800">{title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition"
              title="Baixar planilha de exemplo com as colunas corretas"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Baixar Modelo Exemplo
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Tabs: Enviar Arquivo vs Colar Texto */}
          <div className="flex bg-slate-100 p-1 rounded-xl max-w-xs">
            <button
              type="button"
              onClick={() => setActiveTab('file')}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                activeTab === 'file' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Enviar Arquivo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('text')}
              className={`flex-1 py-1.5 px-3 text-xs font-bold rounded-lg transition ${
                activeTab === 'text' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Colar Dados
            </button>
          </div>

          {activeTab === 'file' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
                isDragOver 
                  ? 'border-blue-500 bg-blue-50/50' 
                  : 'border-slate-200 hover:border-blue-400 bg-slate-50/50 hover:bg-blue-50/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt, .tsv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 bg-white shadow-xs rounded-2xl border border-slate-200 text-blue-600">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <p className="font-bold text-slate-700 text-sm">
                  {fileName ? fileName : 'Arraste e solte o arquivo CSV / Planilha aqui'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Ou clique para selecionar um arquivo (.csv ou .txt)
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Cole o texto delimitado (com cabeçalhos na primeira linha):
              </label>
              <textarea
                value={fileText}
                onChange={(e) => processText(e.target.value)}
                placeholder="Exemplo:&#10;Nome da Escola;Distrito;INEP&#10;Escola Exemplo 1;Centro;12345678"
                rows={6}
                className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}

          {/* Estatísticas e Badges */}
          {fileText && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <Layers className="w-4 h-4" />
                  <span>Linhas Válidas</span>
                </div>
                <div className="text-2xl font-black text-slate-800 mt-1">
                  {parsedItems.length}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-700 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Prontos para Gravar</span>
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  {parsedItems.length}
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 text-amber-700 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Alertas / Ignorados</span>
                </div>
                <div className="text-2xl font-black text-amber-700 mt-1">
                  {parseErrors.length}
                </div>
              </div>
            </div>
          )}

          {/* Avisos de Validação */}
          {parseErrors.length > 0 && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 max-h-32 overflow-y-auto text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5 text-amber-950">
                <Info className="w-4 h-4 text-amber-600" />
                Linhas com inconformidades ignoradas:
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-amber-800 text-[11px]">
                {parseErrors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {parseErrors.length > 5 && (
                  <li>...e mais {parseErrors.length - 5} linha(s) ignoradas.</li>
                )}
              </ul>
            </div>
          )}

          {/* Prévia dos Dados */}
          {parsedItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Prévia dos Primeiros Registros ({Math.min(parsedItems.length, 6)} de {parsedItems.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-56">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        {previewColumns.map((col, idx) => (
                          <th key={idx} className="py-2.5 px-3">{col.header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedItems.slice(0, 6).map((item, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-mono text-slate-400">{rowIdx + 1}</td>
                          {previewColumns.map((col, colIdx) => (
                            <td key={colIdx} className="py-2 px-3 text-slate-700 font-medium">
                              {col.accessor(item)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            {parsedItems.length > 0 ? (
              <span className="font-semibold text-emerald-700">
                ✓ {parsedItems.length} {entityNamePlural} prontos para importação
              </span>
            ) : (
              <span>Carregue ou cole uma planilha para visualizar a prévia</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={importing}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={importing || parsedItems.length === 0}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition ${
                importing || parsedItems.length === 0
                  ? 'bg-slate-300 cursor-not-allowed text-slate-500'
                  : 'bg-[#0f2851] hover:bg-[#1a3a6d] shadow-[#0f2851]/20'
              }`}
            >
              {importing && <Loader2 className="w-4 h-4 animate-spin" />}
              {importing ? 'Importando registros...' : `Confirmar e Gravar ${parsedItems.length} ${entityNamePlural}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
