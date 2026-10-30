import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Building2, ClipboardCheck, FileWarning, GraduationCap, RefreshCw, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Totals = { escolas: number | null; turmas: number | null; alunos: number | null; usuarios: number | null };
const initialTotals: Totals = { escolas: null, turmas: null, alunos: null, usuarios: null };

export default function Estatisticas() {
  const [totals, setTotals] = useState<Totals>(initialTotals);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [escolas, turmas, alunos, usuarios] = await Promise.all([
      supabase.from('escolas').select('*', { count: 'exact', head: true }),
      supabase.from('turmas').select('*', { count: 'exact', head: true }),
      supabase.from('alunos').select('*', { count: 'exact', head: true }),
      supabase.from('usuarios').select('*', { count: 'exact', head: true }),
    ]);
    setTotals({
      escolas: escolas.error ? null : escolas.count ?? 0,
      turmas: turmas.error ? null : turmas.count ?? 0,
      alunos: alunos.error ? null : alunos.count ?? 0,
      usuarios: usuarios.error ? null : usuarios.count ?? 0,
    });
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  const cards = [
    { label: 'Escolas ativas', value: totals.escolas, icon: Building2, detail: 'Unidades cadastradas' },
    { label: 'Turmas', value: totals.turmas, icon: GraduationCap, detail: 'Turmas do ano letivo' },
    { label: 'Alunos', value: totals.alunos, icon: Users, detail: 'Matrículas visíveis' },
    { label: 'Usuários', value: totals.usuarios, icon: ClipboardCheck, detail: 'Acessos cadastrados' },
  ];

  return <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[.14em] text-slate-500">Visão geral</p><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Painel administrativo</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Acompanhe a estrutura escolar e priorize os lançamentos pendentes.</p></div>
      <button onClick={() => void load()} disabled={loading} className="dd-secondary-button self-start sm:self-auto"><RefreshCw className={loading ? 'animate-spin' : ''} aria-hidden="true"/>Atualizar</button>
    </header>

    <section aria-label="Indicadores da rede" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, detail }) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</span><span className="rounded-lg bg-blue-50 p-2 text-primary dark:bg-blue-950"><Icon className="h-4 w-4" aria-hidden="true"/></span></div><p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{loading ? '—' : value === null ? 'N/D' : value}</p><p className="mt-1 text-xs text-slate-500">{value === null && !loading ? 'Consulta indisponível para este perfil' : detail}</p></article>)}
    </section>

    <section className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      <article className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="font-bold text-slate-900 dark:text-white">Prioridades de lançamento</h2><p className="mt-1 text-sm text-slate-500">Acesse as pendências reais da rede para agir por escola e turma.</p></div><span className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><AlertTriangle className="h-5 w-5" aria-hidden="true"/></span></div><div className="space-y-3"><Link to="/pendencias-lancamento" className="group flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:hover:bg-slate-800"><div><p className="font-semibold text-slate-800 dark:text-white">Diário de classe</p><p className="mt-1 text-sm text-slate-500">Conteúdos e lançamentos pendentes</p></div><ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary" aria-hidden="true"/></Link><Link to="/pendencias-frequencia" className="group flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:hover:bg-slate-800"><div><p className="font-semibold text-slate-800 dark:text-white">Frequência e BNCC</p><p className="mt-1 text-sm text-slate-500">Frequências e objetos de conhecimento</p></div><ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary" aria-hidden="true"/></Link></div></article>
      <article className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-white dark:border-slate-700 sm:p-6"><FileWarning className="mb-5 h-6 w-6 text-amber-300" aria-hidden="true"/><h2 className="text-lg font-bold">Gestão com menos cliques</h2><p className="mt-2 text-sm leading-6 text-slate-300">Use a Gestão escolar para organizar escolas, turmas, professores e alunos em um único fluxo.</p><Link to="/administracao" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-primary hover:bg-slate-100">Abrir gestão <ArrowRight className="h-4 w-4" aria-hidden="true"/></Link></article>
    </section>
  </div>;
}
