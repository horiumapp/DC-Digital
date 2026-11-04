import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Printer, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import { ADMIN_ROLES } from '../constants/authConstants';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import { OfflineNoCacheError } from '../services/turmaServiceOffline';
import { getEscolaLogo } from '../utils/escolaUtils';
import {
  deduplicarTurmasRelatorio,
  filtrarTurmasPorTurno,
  turmaPermitida,
  type TurmaListaAlunos,
} from '../utils/relatorioListaAlunos';
import { useToast } from '../components/common/Toast';

interface AlunoLista {
  id: string;
  nome: string;
}

export default function RelatorioListaAlunos() {
  const { user } = useAuth();
  const { showError, showWarning } = useToast();

  const [turmas, setTurmas] = useState<TurmaListaAlunos[]>([]);
  const [turnoFiltro, setTurnoFiltro] = useState('');
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadingAlunos, setLoadingAlunos] = useState(false);
  const [erroTurmas, setErroTurmas] = useState<string | null>(null);
  const [erroAlunos, setErroAlunos] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [alunos, setAlunos] = useState<AlunoLista[]>([]);

  const turnosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    turmas.forEach((t) => {
      if (t.turno?.trim()) set.add(t.turno.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [turmas]);

  const turmasFiltradas = useMemo(
    () => filtrarTurmasPorTurno(turmas, turnoFiltro),
    [turmas, turnoFiltro]
  );

  const turmaSelecionada = useMemo(
    () => turmaPermitida(turmas, selectedTurmaId),
    [turmas, selectedTurmaId]
  );

  const carregarTurmas = useCallback(async () => {
    if (!user) return;
    setLoadingTurmas(true);
    setErroTurmas(null);
    try {
      const relatorioTurmas = await OfflineTurmaService.fetchTurmasRelatorio(user);
      const lista = deduplicarTurmasRelatorio(relatorioTurmas);
      setTurmas(lista);

      const turnosUnicos = [...new Set(lista.map((t) => t.turno?.trim()).filter(Boolean))] as string[];
      if (turnosUnicos.length === 1) {
        setTurnoFiltro(turnosUnicos[0]);
      }

      if (lista.length === 1) {
        setSelectedTurmaId(lista[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar turmas para lista de alunos:', err);
      setErroTurmas('Não foi possível carregar as turmas. Verifique sua conexão e tente novamente.');
      showError('Não foi possível carregar as turmas.');
    } finally {
      setLoadingTurmas(false);
    }
  }, [user, showError]);

  useEffect(() => {
    if (user && ADMIN_ROLES.includes(user.role)) {
      carregarTurmas();
    }
  }, [user, carregarTurmas]);

  useEffect(() => {
    if (!selectedTurmaId) return;
    if (!turmasFiltradas.some((t) => t.id === selectedTurmaId)) {
      setSelectedTurmaId('');
      setAlunos([]);
      setHasSearched(false);
      setErroAlunos(null);
    }
  }, [turnoFiltro, turmasFiltradas, selectedTurmaId]);

  const handleExibir = async () => {
    const turma = turmaPermitida(turmas, selectedTurmaId);
    if (!turma) {
      showWarning('Selecione uma turma válida para consultar a lista.');
      return;
    }

    // Isolamento por escola: SECRETARIO/GESTOR só consultam a própria unidade
    if (
      (user?.role === 'SECRETARIO' || user?.role === 'GESTOR') &&
      user.escola_id &&
      turma.escolaId !== user.escola_id
    ) {
      showError('Você não tem permissão para consultar alunos de outra escola.');
      return;
    }

    setLoadingAlunos(true);
    setHasSearched(true);
    setErroAlunos(null);
    setAlunos([]);

    try {
      const alunosData = await OfflineTurmaService.fetchAlunos(turma.id);
      const ordenados = [...alunosData]
        .map((a) => ({ id: a.id, nome: a.nome }))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      setAlunos(ordenados);
    } catch (err) {
      console.error('Erro ao buscar alunos da turma:', err);
      if (err instanceof OfflineNoCacheError) {
        setErroAlunos(
          'Você está offline e ainda não há dados desta turma salvos neste dispositivo. Conecte-se à internet e tente novamente.'
        );
      } else {
        setErroAlunos('Não foi possível carregar os alunos desta turma. Tente novamente.');
      }
      showError('Erro ao carregar a lista de alunos.');
    } finally {
      setLoadingAlunos(false);
    }
  };

  const handleImprimir = () => {
    if (!turmaSelecionada) {
      showWarning('Selecione uma turma antes de imprimir.');
      return;
    }
    if (!hasSearched) {
      showWarning('Exiba a lista antes de imprimir.');
      return;
    }
    if (alunos.length === 0) {
      showWarning('Não há alunos para imprimir nesta turma.');
      return;
    }
    window.print();
  };

  const homePath = '/administracao';
  const logoEscola = getEscolaLogo({ nome: turmaSelecionada?.escolaNome });

  if (user && !ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/turmas" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 relative pb-16">
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <Link
            to={homePath}
            className="bg-[#eef2ff] text-[#6354c7] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-blue-100 hover:bg-[#e0e7ff] transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Voltar
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#6354c7] leading-tight">Lista de alunos</h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Consulta e impressão dos alunos matriculados por turma e turno
            </p>
          </div>
        </div>
        <span className="bg-emerald-100 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200">
          Ano: {APP_CONFIG.YEAR}
        </span>
      </div>

      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:p-6 no-print">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-bold text-[#6354c7]">Filtros</h2>
              <button
                type="button"
                onClick={handleImprimir}
                disabled={loadingAlunos || !hasSearched || alunos.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 bg-[#eef2ff] text-[#6354c7] border border-blue-100 rounded-lg text-sm font-semibold hover:bg-[#e0e7ff] transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" aria-hidden="true" />
                Imprimir / Salvar PDF
              </button>
            </div>

            {loadingTurmas ? (
              <p className="text-sm text-slate-500" role="status">Carregando turmas disponíveis...</p>
            ) : erroTurmas ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
                {erroTurmas}
                <button
                  type="button"
                  onClick={carregarTurmas}
                  className="ml-2 font-semibold underline"
                >
                  Tentar novamente
                </button>
              </div>
            ) : turmas.length === 0 ? (
              <p className="text-sm text-slate-500" role="status">
                Nenhuma turma encontrada para a sua escola. Verifique se há turmas cadastradas no ano letivo atual.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-end">
                {turnosDisponiveis.length > 0 && (
                  <div className="md:col-span-3">
                    <label htmlFor="filtro-turno" className="block text-sm font-semibold text-slate-500 mb-1">
                      Turno
                    </label>
                    <div className="relative">
                      <select
                        id="filtro-turno"
                        value={turnoFiltro}
                        onChange={(e) => setTurnoFiltro(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-slate-700 focus:border-[#6354c7] focus:outline-none focus:ring-2 focus:ring-[#6354c7]/20"
                      >
                        <option value="">Todos os turnos</option>
                        {turnosDisponiveis.map((turno) => (
                          <option key={turno} value={turno}>{turno}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    </div>
                  </div>
                )}

                <div className={turnosDisponiveis.length > 0 ? 'md:col-span-6' : 'md:col-span-9'}>
                  <label htmlFor="filtro-turma" className="block text-sm font-semibold text-slate-500 mb-1">
                    Turma
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Users className="h-5 w-5 text-slate-400" aria-hidden="true" />
                    </div>
                    <select
                      id="filtro-turma"
                      value={selectedTurmaId}
                      onChange={(e) => {
                        setSelectedTurmaId(e.target.value);
                        setHasSearched(false);
                        setAlunos([]);
                        setErroAlunos(null);
                      }}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-12 pr-10 text-sm font-semibold text-slate-700 focus:border-[#6354c7] focus:outline-none focus:ring-2 focus:ring-[#6354c7]/20"
                    >
                      <option value="">Selecione a turma</option>
                      {turmasFiltradas.map((turma) => (
                        <option key={turma.id} value={turma.id}>
                          {turma.nome}{turma.turno ? ` — ${turma.turno}` : ''}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  </div>
                  {turnoFiltro && turmasFiltradas.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">Nenhuma turma neste turno.</p>
                  )}
                </div>

                <div className="md:col-span-3">
                  <button
                    type="button"
                    onClick={handleExibir}
                    disabled={!selectedTurmaId || loadingAlunos}
                    className="w-full rounded-xl bg-[#6354c7] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#5646b8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingAlunos ? 'Carregando...' : 'Exibir lista'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasSearched && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {loadingAlunos ? (
              <div className="px-6 py-12 text-center text-sm text-slate-500" role="status">
                Carregando alunos matriculados...
              </div>
            ) : erroAlunos ? (
              <div className="px-6 py-8 text-sm text-rose-700" role="alert">
                {erroAlunos}
              </div>
            ) : !turmaSelecionada ? (
              <div className="px-6 py-8 text-sm text-amber-700" role="alert">
                A turma selecionada não está disponível para a sua conta.
              </div>
            ) : (
              <>
                <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Escola</p>
                  <p className="text-base font-bold text-slate-800">{turmaSelecionada.escolaNome}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
                    <div>
                      <span className="text-slate-400 font-semibold">Turma: </span>
                      <span className="font-bold text-slate-700">{turmaSelecionada.nome}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Turno: </span>
                      <span className="font-bold text-slate-700">{turmaSelecionada.turno || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Etapa/série: </span>
                      <span className="font-bold text-slate-700">
                        {turmaSelecionada.ensino || turmaSelecionada.fase || '—'}
                      </span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#6354c7]">
                    {alunos.length} {alunos.length === 1 ? 'aluno encontrado' : 'alunos encontrados'}
                  </p>
                </div>

                {alunos.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-500" role="status">
                    Nenhum aluno matriculado (ativo) encontrado nesta turma.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                          <th scope="col" className="px-6 py-3 w-16">Nº</th>
                          <th scope="col" className="px-6 py-3">Nome do aluno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alunos.map((aluno, index) => (
                          <tr key={aluno.id} className="border-b border-slate-50 last:border-0">
                            <td className="px-6 py-3 text-sm font-semibold text-slate-400">{index + 1}</td>
                            <td className="px-6 py-3 text-sm font-semibold text-slate-800 uppercase">{aluno.nome}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="mt-4 pb-10 text-center text-slate-400 text-xs no-print">
        © {APP_CONFIG.YEAR} Diário Digital - Sistema de Gestão Escolar
      </footer>

      {turmaSelecionada && hasSearched && alunos.length > 0 && (
        <div id="printable-relatorio" className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-y-auto">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { margin: 1.2cm; size: A4 portrait; }
              html, body { height: auto !important; overflow: visible !important; background: white !important; }
              body * { visibility: hidden; }
              #printable-relatorio, #printable-relatorio * { visibility: visible; }
              #printable-relatorio {
                visibility: visible;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                display: block !important;
                overflow: visible !important;
              }
              .no-print { display: none !important; }
            }
            #printable-relatorio table { width: 100%; border-collapse: collapse; }
            #printable-relatorio .header-grid { width: 100%; border: 1px solid black; border-collapse: collapse; }
            #printable-relatorio .header-grid td { border: 1px solid black; padding: 3px 6px; }
            #printable-relatorio .label { font-size: 7px; text-transform: uppercase; font-weight: normal; margin-bottom: 1px; color: #333; }
            #printable-relatorio .value { font-size: 10px; font-weight: bold; text-transform: uppercase; }
            #printable-relatorio .title-bar { border: 1px solid black; border-top: none; padding: 8px; text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; }
            #printable-relatorio .content-table { margin-top: 14px; border: 1px solid black; width: 100%; border-collapse: collapse; }
            #printable-relatorio .content-table th { background: #eee; text-align: center; font-weight: bold; padding: 6px; border: 1px solid black; font-size: 10px; }
            #printable-relatorio .content-table td { border: 1px solid black; padding: 5px 6px; font-size: 11px; }
            #printable-relatorio .signatures { margin-top: 48px; display: flex; justify-content: space-around; page-break-inside: avoid; }
            #printable-relatorio .sig-line { border-top: 1px solid black; width: 240px; text-align: center; padding-top: 4px; font-size: 9px; font-weight: bold; margin-top: 28px; }
          `}} />

          <div className="p-4 bg-white text-black">
            <div className="flex border border-black overflow-hidden">
              <div className="w-[22%] border-r border-black p-3 flex flex-col items-center justify-center text-center">
                <img src="/semed.png" alt="Logo SEMED" className="w-14 h-14 mb-1 object-contain" />
                <div className="font-bold text-[8px] leading-tight uppercase">
                  Secretaria Municipal de Educação<br />
                  Lábrea - AM
                </div>
              </div>

              <table className="flex-1 header-grid border-none">
                <tbody>
                  <tr>
                    <td colSpan={3} className="border-t-0 border-r-0">
                      <div className="label">Escola:</div>
                      <div className="value">{turmaSelecionada.escolaNome}</div>
                    </td>
                  </tr>
                  <tr>
                    <td width="50%" className="border-r border-black">
                      <div className="label">Turma:</div>
                      <div className="value">{turmaSelecionada.nome}</div>
                    </td>
                    <td width="25%" className="border-r border-black">
                      <div className="label">Turno:</div>
                      <div className="value">{turmaSelecionada.turno || '—'}</div>
                    </td>
                    <td width="25%" className="border-r-0">
                      <div className="label">Ano letivo:</div>
                      <div className="value">{APP_CONFIG.YEAR}</div>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="border-r border-black border-b-0">
                      <div className="label">Etapa / série:</div>
                      <div className="value">{turmaSelecionada.ensino || turmaSelecionada.fase || '—'}</div>
                    </td>
                    <td className="border-r-0 border-b-0">
                      <div className="label">Total de alunos:</div>
                      <div className="value">{alunos.length}</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="w-[16%] border-l border-black p-2 flex items-center justify-center">
                <img src={logoEscola} alt="" className="max-h-16 max-w-full object-contain" />
              </div>
            </div>

            <div className="title-bar">Lista de alunos matriculados</div>

            <table className="content-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>Nº</th>
                  <th style={{ width: '90%' }}>Nome do aluno</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, index) => (
                  <tr key={aluno.id}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ textTransform: 'uppercase' }}>{aluno.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="signatures">
              <div className="sig-line">Secretário(a) escolar</div>
              <div className="sig-line">Diretor(a)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
