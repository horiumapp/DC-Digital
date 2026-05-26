import { useState } from 'react';

interface ConsentToggleProps {
  label: string;
  description: string;
  initialChecked?: boolean;
  onChange?: (checked: boolean) => void;
}

export default function ConsentToggle({ label, description, initialChecked = false, onChange }: ConsentToggleProps) {
  const [checked, setChecked] = useState(initialChecked);

  const handleToggle = () => {
    const nextState = !checked;
    setChecked(nextState);
    if (onChange) onChange(nextState);
  };

  return (
    <div className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl">
      <div className="space-y-1 pr-4">
        <label className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</label>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-[#0f2851] dark:bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
