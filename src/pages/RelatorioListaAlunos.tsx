import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Printer, Users } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import { ADMIN_ROLES } from '../constants/authConstants';
import { supabase } from '../lib/supabase';
import { readAllRows } from '../services/pagination';
import { getCachedAlunos } from '../services/offlineStorage';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import {
  deduplicarTurmasRelatorio,
  filtrarTurmasPorTurno,
  formatarCodigoAluno,
  formatarDataNascimentoLista,
  formatarNumeroLista,
  linhasEmBrancoLista,
  mapearSituacaoAluno,
  turmaPermitida,
  type AlunoListaRelatorio,
  type EscolaListaAlunosInfo,
  type TurmaListaAlunos,
} from '../utils/relatorioListaAlunos';
import { useToast } from '../components/common/Toast';

function dataEmissaoHoje(): string {
  return new Date().toLocaleDateString('pt-BR');
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
  const [alunos, setAlunos] = useState<AlunoListaRelatorio[]>([]);
  const [escolaInfo, setEscolaInfo] = useState<EscolaListaAlunosInfo | null>(null);
  const [dataEmissao, setDataEmissao] = useState(dataEmissaoHoje);

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
      setEscolaInfo(null);
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
    setEscolaInfo(null);
    setDataEmissao(dataEmissaoHoje());

    try {
      let escola: EscolaListaAlunosInfo | null = null;

      try {
        const { data: escolaDb } = await supabase
          .from('escolas')
          .select('id, nome, inep, distrito, logo_url')
          .eq('id', turma.escolaId)
          .maybeSingle();
        if (escolaDb) {
          escola = escolaDb as EscolaListaAlunosInfo;
        }
      } catch (err) {
        console.warn('Falha ao carregar escola online:', err);
      }

      if (!escola) {
        escola = {
          id: turma.escolaId,
          nome: turma.escolaNome,
          inep: '',
          distrito: '',
        };
      }
      setEscolaInfo(escola);

      let lista: AlunoListaRelatorio[] = [];
      try {
        const { data: alunosDb, error } = await readAllRows<AlunoListaRelatorio>(
          supabase
            .from('alunos')
            .select('id, nome, matricula, data_nascimento, status')
            .eq('turma_id', turma.id)
            .order('nome')
            .order('id')
        );
        if (error) throw error;
        lista = alunosDb || [];
      } catch (err) {
        console.warn('Falha ao carregar alunos online, tentando cache local:', err);
        const { alunos: localAlunos, decryptionFailed } = await getCachedAlunos(turma.id);
        if (decryptionFailed) {
          setErroAlunos(
            'Os dados locais desta turma estão protegidos e não puderam ser lidos. Reconecte à internet para atualizar a lista.'
          );
          showError('Erro ao carregar a lista de alunos.');
          return;
        }
        if (!navigator.onLine && localAlunos.length === 0) {
          setErroAlunos(
            'Você está offline e ainda não há dados desta turma salvos neste dispositivo. Conecte-se à internet e tente novamente.'
          );
          showError('Erro ao carregar a lista de alunos.');
          return;
        }
        lista = localAlunos.map((a) => ({
          id: a.id,
          nome: a.nome || 'Aluno sem nome',
          matricula: null,
          data_nascimento: null,
          status: a.status || 'Ativo',
        }));
      }

      const ordenados = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      setAlunos(ordenados);
    } catch (err) {
      console.error('Erro ao buscar alunos da turma:', err);
      setErroAlunos('Não foi possível carregar os alunos desta turma. Tente novamente.');
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

    const relatorio = document.getElementById('printable-relatorio');
    const appRoot = document.getElementById('root');
    if (!relatorio) {
      window.print();
      return;
    }

    // Move o relatório para o body e esconde o app: evita página em branco
    // causada pelo layout invisível que ainda ocupava altura no DOM.
    const marcador = document.createComment('lista-alunos-print-marker');
    const paiOriginal = relatorio.parentNode;
    paiOriginal?.insertBefore(marcador, relatorio);
    document.body.appendChild(relatorio);
    relatorio.setAttribute('data-printing', 'true');
    relatorio.style.display = 'block';
    if (appRoot) appRoot.style.display = 'none';
    document.body.classList.add('printing-lista-alunos');

    const restaurar = () => {
      document.body.classList.remove('printing-lista-alunos');
      if (appRoot) appRoot.style.display = '';
      relatorio.style.display = 'none';
      relatorio.removeAttribute('data-printing');
      if (marcador.parentNode) {
        marcador.parentNode.insertBefore(relatorio, marcador);
        marcador.remove();
      }
      window.removeEventListener('afterprint', restaurar);
    };

    window.addEventListener('afterprint', restaurar);
    window.print();
    // Fallback para navegadores que não disparam afterprint de forma confiável
    window.setTimeout(() => {
      if (document.body.classList.contains('printing-lista-alunos')) {
        restaurar();
      }
    }, 1000);
  };

  const homePath = '/administracao';
  const escolaNome = escolaInfo?.nome || turmaSelecionada?.escolaNome || 'Escola';
  const linhasVazias = linhasEmBrancoLista(alunos.length);
  const codigoTurma = turmaSelecionada?.numero || turmaSelecionada?.nome || '—';

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
              Consulta e impressão da relação de alunos por turma e turno
            </p>
          </div>
        </div>
        <span className="bg-emerald-100 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200">
          Ano: {APP_CONFIG.YEAR}
        </span>
      </div>

      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:p-6 no-print">
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
                <button type="button" onClick={carregarTurmas} className="ml-2 font-semibold underline">
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
                        setEscolaInfo(null);
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
                Carregando relação de alunos...
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
                  <p className="text-base font-bold text-slate-800">{escolaNome}</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div>
                      <span className="text-slate-400 font-semibold">Turma: </span>
                      <span className="font-bold text-slate-700">{turmaSelecionada.nome}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Turno: </span>
                      <span className="font-bold text-slate-700">{turmaSelecionada.turno || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Ensino: </span>
                      <span className="font-bold text-slate-700">{turmaSelecionada.ensino || '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold">Fase: </span>
                      <span className="font-bold text-slate-700">{turmaSelecionada.fase || '—'}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-[#6354c7]">
                    {alunos.length} {alunos.length === 1 ? 'aluno encontrado' : 'alunos encontrados'}
                  </p>
                </div>

                {alunos.length === 0 ? (
                  <div className="px-6 py-12 text-center text-sm text-slate-500" role="status">
                    Nenhum aluno encontrado nesta turma.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
                          <th scope="col" className="px-4 py-3 w-16">Nº</th>
                          <th scope="col" className="px-4 py-3">Código</th>
                          <th scope="col" className="px-4 py-3">Nome do aluno</th>
                          <th scope="col" className="px-4 py-3">Nascimento</th>
                          <th scope="col" className="px-4 py-3">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {alunos.map((aluno, index) => (
                          <tr key={aluno.id} className="border-b border-slate-50 last:border-0">
                            <td className="px-4 py-3 text-sm font-semibold text-slate-400">
                              {formatarNumeroLista(index + 1)}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-600">
                              {formatarCodigoAluno(aluno.matricula)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800 uppercase">
                              {aluno.nome}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatarDataNascimentoLista(aluno.data_nascimento)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                              {mapearSituacaoAluno(aluno.status)}
                            </td>
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
        <div id="printable-relatorio" aria-hidden="true" style={{ display: 'none' }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { margin: 10mm; size: A4 portrait; }
              html, body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
                height: auto !important;
                overflow: visible !important;
              }
              body.printing-lista-alunos #root {
                display: none !important;
              }
              body.printing-lista-alunos > #printable-relatorio,
              #printable-relatorio[data-printing='true'] {
                display: block !important;
                position: static !important;
                width: 100% !important;
                height: auto !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
            }
            #printable-relatorio {
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
            }
            #printable-relatorio table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            #printable-relatorio .doc-header td {
              border: 1px solid #000;
              vertical-align: middle;
            }
            #printable-relatorio .logo-cell {
              width: 18%;
              text-align: center;
              padding: 4px 3px;
            }
            #printable-relatorio .school-cell {
              width: 57%;
              padding: 3px 6px;
              text-align: left;
            }
            #printable-relatorio .meta-cell {
              width: 25%;
              padding: 3px 6px;
              text-align: left;
              vertical-align: top;
            }
            #printable-relatorio .label {
              font-size: 7px;
              font-weight: bold;
              text-transform: uppercase;
            }
            #printable-relatorio .value {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              line-height: 1.2;
            }
            #printable-relatorio .title-bar {
              border: 1px solid #000;
              border-top: none;
              text-align: center;
              font-weight: bold;
              font-size: 13px;
              padding: 4px;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }
            #printable-relatorio .filters-table td {
              border: 1px solid #000;
              border-top: none;
              padding: 2px 5px;
              vertical-align: top;
            }
            #printable-relatorio .content-table {
              margin-top: 0;
            }
            #printable-relatorio .content-table th,
            #printable-relatorio .content-table td {
              border: 1px solid #000;
              padding: 2px 4px;
              font-size: 9px;
              line-height: 1.2;
            }
            #printable-relatorio .content-table th {
              background: #e5e5e5;
              text-align: center;
              font-weight: bold;
              text-transform: uppercase;
            }
            #printable-relatorio .col-num { width: 8%; text-align: center; }
            #printable-relatorio .col-cod { width: 16%; text-align: center; }
            #printable-relatorio .col-nome { width: 44%; text-align: left; text-transform: uppercase; }
            #printable-relatorio .col-nasc { width: 16%; text-align: center; }
            #printable-relatorio .col-sit { width: 16%; text-align: center; text-transform: uppercase; }
            #printable-relatorio .empty-row td { height: 16px; }
          `}} />

          <div className="sheet">
            <table className="doc-header">
              <tbody>
                <tr>
                  <td className="logo-cell">
                    <img src="/semed.png" alt="Logo SEMED" style={{ width: 42, height: 42, objectFit: 'contain', margin: '0 auto 2px' }} />
                    <div style={{ fontSize: 7, fontWeight: 700, lineHeight: 1.15, textTransform: 'uppercase' }}>
                      Secretaria Municipal de Educação<br />
                      Lábrea - AM
                    </div>
                  </td>
                  <td className="school-cell">
                    <div><span className="label">Escola: </span><span className="value">{escolaNome}</span></div>
                    <div style={{ marginTop: 2 }}>
                      <span className="label">Endereço: </span>
                      <span className="value">{escolaInfo?.distrito?.trim() || '—'}</span>
                    </div>
                  </td>
                  <td className="meta-cell">
                    <div><span className="label">INEP:</span></div>
                    <div className="value" style={{ marginBottom: 4 }}>{escolaInfo?.inep?.trim() || '—'}</div>
                    <div><span className="label">Data emissão:</span></div>
                    <div className="value">{dataEmissao}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="title-bar">Relação de alunos</div>

            <table className="filters-table">
              <tbody>
                <tr>
                  <td style={{ width: '12%' }}>
                    <div className="label">Ano</div>
                    <div className="value">{APP_CONFIG.YEAR}</div>
                  </td>
                  <td style={{ width: '36%' }}>
                    <div className="label">Ensino / Projeto</div>
                    <div className="value">{turmaSelecionada.ensino || '—'}</div>
                  </td>
                  <td style={{ width: '20%' }}>
                    <div className="label">Fase</div>
                    <div className="value">{turmaSelecionada.fase || '—'}</div>
                  </td>
                  <td style={{ width: '14%' }}>
                    <div className="label">Turma</div>
                    <div className="value">{codigoTurma}</div>
                  </td>
                  <td style={{ width: '18%' }}>
                    <div className="label">Turno</div>
                    <div className="value">{turmaSelecionada.turno || '—'}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="content-table">
              <thead>
                <tr>
                  <th className="col-num">Nº</th>
                  <th className="col-cod">Código aluno</th>
                  <th className="col-nome">Nome aluno</th>
                  <th className="col-nasc">Data nascimento</th>
                  <th className="col-sit">Situação</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((aluno, index) => (
                  <tr key={aluno.id}>
                    <td className="col-num">{formatarNumeroLista(index + 1)}</td>
                    <td className="col-cod">{formatarCodigoAluno(aluno.matricula)}</td>
                    <td className="col-nome">{aluno.nome}</td>
                    <td className="col-nasc">{formatarDataNascimentoLista(aluno.data_nascimento)}</td>
                    <td className="col-sit">{mapearSituacaoAluno(aluno.status)}</td>
                  </tr>
                ))}
                {Array.from({ length: linhasVazias }).map((_, index) => (
                  <tr key={`empty-${index}`} className="empty-row">
                    <td className="col-num">&nbsp;</td>
                    <td className="col-cod">&nbsp;</td>
                    <td className="col-nome">&nbsp;</td>
                    <td className="col-nasc">&nbsp;</td>
                    <td className="col-sit">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
