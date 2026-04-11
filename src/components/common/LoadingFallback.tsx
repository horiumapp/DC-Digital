import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingFallback() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
      <p className="mt-4 text-lg font-medium text-gray-600 dark:text-gray-300 animate-pulse">
        Carregando...
      </p>
    </div>
  );
}
