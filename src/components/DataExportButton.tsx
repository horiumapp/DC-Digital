import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface DataExportButtonProps {
  getData: () => Promise<any>;
  fileName?: string;
  onExportSuccess?: () => void;
  onExportError?: (error: any) => void;
}

export default function DataExportButton({ getData, fileName = 'meus_dados_privacidade.json', onExportSuccess, onExportError }: DataExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await getData();
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      if (onExportSuccess) onExportSuccess();
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      if (onExportError) onExportError(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#0f2851] hover:bg-[#1a3a6d] disabled:bg-slate-400 text-white font-bold rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-md cursor-pointer text-sm"
    >
      {isExporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Exportando...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Exportar Meus Dados (JSON)
        </>
      )}
    </button>
  );
}
