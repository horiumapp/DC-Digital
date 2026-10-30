import { useEffect, useState } from 'react';
import { Wifi } from 'lucide-react';
import {
  getConnectionProfile,
  isEconomyPreferenceEnabled,
  setEconomyPreference,
  subscribeDataSaverChange,
} from '../utils/dataSaver';

/**
 * Alterna a preferência de economia de internet.
 * Rede 2G/Save-Data continua ativando modo leve mesmo com o toggle desligado.
 */
export default function DataSaverToggle() {
  const [enabled, setEnabled] = useState(() => isEconomyPreferenceEnabled());
  const [networkConstrained, setNetworkConstrained] = useState(() => getConnectionProfile() === 'constrained');

  useEffect(() => {
    return subscribeDataSaverChange(() => {
      setEnabled(isEconomyPreferenceEnabled());
      setNetworkConstrained(getConnectionProfile() === 'constrained');
    });
  }, []);

  const handleToggle = () => {
    const next = !enabled;
    setEconomyPreference(next);
    setEnabled(next);
  };

  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
      <div className="space-y-1 pr-2 min-w-0">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-[#6354c7] dark:text-blue-400 shrink-0" aria-hidden />
          <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Economia de Internet</label>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Reduz imagens e efeitos, sincroniza em lotes menores e verifica a conexão com menos frequência.
          Ideal para internet lenta ou instável.
        </p>
        {networkConstrained && !enabled && (
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 pt-1">
            Conexão limitada detectada — modo leve ativo automaticamente.
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="Economia de Internet"
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6354c7]/40 ${
          enabled ? 'bg-[#6354c7] dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
