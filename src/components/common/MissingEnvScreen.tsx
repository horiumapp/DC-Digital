import React from 'react';
import { AlertTriangle, Server, ExternalLink, RefreshCw, Key, Globe } from 'lucide-react';

export default function MissingEnvScreen() {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-8 font-sans relative overflow-hidden">
      {/* Background Glow Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-10 shadow-2xl shadow-slate-950/50 relative z-10">
        
        {/* Header Badge & Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
              Configuração Necessária
            </span>
            <h1 className="text-2xl md:text-3xl font-bold text-white mt-1">
              Variáveis de Ambiente Ausentes
            </h1>
          </div>
        </div>

        {/* Description */}
        <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-6">
          A aplicação foi iniciada no servidor sem as credenciais do <strong className="text-white">Supabase</strong>. 
          Sem essas variáveis de ambiente, o sistema não pode conectar ao banco de dados e autenticação.
        </p>

        {/* Missing Variables Box */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 md:p-5 mb-8 space-y-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            Variáveis Requeridas:
          </div>
          <div className="grid grid-cols-1 gap-2 font-mono text-xs md:text-sm">
            <div className="flex items-center justify-between bg-slate-900/80 px-3.5 py-2.5 rounded-xl border border-slate-800/80 text-rose-300">
              <span>VITE_SUPABASE_URL</span>
              <span className="text-slate-500 text-xs">Ausente / Não Definida</span>
            </div>
            <div className="flex items-center justify-between bg-slate-900/80 px-3.5 py-2.5 rounded-xl border border-slate-800/80 text-rose-300">
              <span>VITE_SUPABASE_ANON_KEY</span>
              <span className="text-slate-500 text-xs">Ausente / Não Definida</span>
            </div>
          </div>
        </div>

        {/* How to Fix Instructions */}
        <div className="space-y-6 mb-8">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" />
            Como resolver no Vercel (Produção):
          </h2>

          <ol className="list-decimal list-inside text-sm text-slate-300 space-y-3 bg-slate-950/40 p-5 rounded-2xl border border-slate-800/60">
            <li className="leading-relaxed">
              Acesse o dashboard da Vercel: <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1 font-medium">vercel.com <ExternalLink className="w-3 h-3" /></a>
            </li>
            <li className="leading-relaxed">
              Selecione o projeto <span className="font-semibold text-white">ddigital-lbr</span> (ou <span className="font-semibold text-white">dc-digital</span>).
            </li>
            <li className="leading-relaxed">
              Vá em <strong className="text-white">Settings</strong> &rarr; <strong className="text-white">Environment Variables</strong>.
            </li>
            <li className="leading-relaxed">
              Adicione as duas variáveis:
              <div className="mt-2 pl-4 border-l-2 border-indigo-500/30 text-xs space-y-1 font-mono text-indigo-200">
                <p>• <strong>VITE_SUPABASE_URL</strong> = https://seu-projeto.supabase.co</p>
                <p>• <strong>VITE_SUPABASE_ANON_KEY</strong> = sua-chave-anon-aqui</p>
              </div>
            </li>
            <li className="leading-relaxed">
              Vá na aba <strong className="text-white">Deployments</strong>, clique nos três pontos (...) da última implantação e selecione <strong className="text-emerald-400">Redeploy</strong>.
            </li>
          </ol>

          <div className="pt-2">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-400" />
              Desenvolvimento Local (.env):
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Copie o arquivo <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">.env.example</code> para <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-200">.env</code> na raiz do projeto e preencha as variáveis.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800/80">
          <button
            onClick={handleReload}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold rounded-2xl transition shadow-lg shadow-indigo-600/25 active:scale-[0.98] text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar a Página
          </button>
        </div>

      </div>
    </div>
  );
}
