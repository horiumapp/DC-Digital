import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Printer, Users, GraduationCap, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { APP_CONFIG } from '../config/appConfig';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { readAllRows } from '../services/pagination';
import * as OfflineTurmaService from '../services/turmaServiceOffline';
import BoletimDocumento, { AlunoBoletimData, NotaBoletimItem, FrequenciaBoletimItem } from '../components/boletim/BoletimDocumento';
import { formatMatriculaCpf } from '../utils/formatters';
import { getEscolaLogo, obterEquipeEscolar } from '../utils/escolaUtils';
import { useToast } from '../components/common/Toast';
import { ADMIN_ROLES } from '../constants/authConstants';

interface TurmaOpcao {
  id: string;
  nome: string;
  turno: string;
  ensino: string;
  escolaId: string;
  escolaNome: string;
}

interface AlunoCompletoBoletim {
  alunoData: AlunoBoletimData;
  notas: NotaBoletimItem[];
  frequencias: FrequenciaBoletimItem[];
}

export default function RelatorioBoletins() {
  const { user } = useAuth();
  const { showError, showWarning } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Apenas secretário, gestor e administrador podem visualizar/imprimir boletins escolares oficiais
  if (user && !ADMIN_ROLES.includes(user.role)) {
    return <Navigate to="/turmas" replace />;
  }

  const paramTurmaId = searchParams.get('turmaId') || '';
  const paramAlunoId = searchParams.get('alunoId') || '';

  const [turmas, setTurmas] = useState<TurmaOpcao[]>([]);
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(paramTurmaId);
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>(paramAlunoId); // '' significa "Todos"

  const [loadingTurmas, setLoadingTurmas] = useState(true);
  const [loadingDados, setLoadingDados] = useState(false);
  const [boletins, setBoletins] = useState<AlunoCompletoBoletim[]>([]);

  // Carregar lista de turmas acessíveis pelo usuário logado
  const carregarTurmas = useCallback(async () => {
    if (!user) return;
    setLoadingTurmas(true);
    try {
      const relatorioTurmas = await OfflineTurmaService.fetchTurmasRelatorio(user);
      
      // Eliminar duplicatas de turma (que ocorrem quando há múltiplos componentes)
      const turmasUnicasMap = new Map<string, TurmaOpcao>();
      relatorioTurmas.forEach(t => {
        if (!turmasUnicasMap.has(t.id)) {
          turmasUnicasMap.set(t.id, {
            id: t.id,
            nome: t.nome,
            turno: t.turno,
            ensino: t.ensino,
            escolaId: t.escolaId,
            escolaNome: t.escolaNome || 'Escola'
          });
        }
      });

      const lista = Array.from(turmasUnicasMap.values()).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      setTurmas(lista);

      // Se houver turma nos params e ela existir na lista, selecionar. Se não, selecionar a primeira
      if (paramTurmaId && lista.some(t => t.id === paramTurmaId)) {
        setSelectedTurmaId(paramTurmaId);
      } else if (lista.length > 0 && !selectedTurmaId) {
        setSelectedTurmaId(lista[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar turmas:', err);
      showError('Não foi possível carregar as turmas para o relatório de boletins.');
    } finally {
      setLoadingTurmas(false);
    }
  }, [user, paramTurmaId, selectedTurmaId, showError]);

  useEffect(() => {
    carregarTurmas();
  }, [carregarTurmas]);

  // Carregar dados de todos os alunos da turma selecionada
  const carregarDadosTurma = useCallback(async (turmaId: string) => {
    if (!turmaId) {
      setBoletins([]);
      return;
    }

    setLoadingDados(true);
    try {
      // 1. Buscar informações da Turma e da Escola
      let turmaInfo: any = null;
      let escolaInfo: any = null;

      try {
        const { data: turmaDb } = await supabase
          .from('turmas')
          .select('id, nome, turno, ano_letivo, ensino, escola_id, escolas(id, nome, inep, diretor, distrito, secretario, logo_url)')
          .eq('id', turmaId)
          .maybeSingle();

        if (turmaDb) {
          turmaInfo = turmaDb;
          escolaInfo = (Array.isArray(turmaDb.escolas) ? turmaDb.escolas[0] : turmaDb.escolas) || null;
        }
      } catch (err) {
        console.warn('Erro ao consultar turma online, tentando IndexedDB:', err);
      }

      // Fallback offline para Turma e Escola
      if (!turmaInfo) {
        const localTurma = await db.turmas.get(turmaId);
        if (localTurma) {
          turmaInfo = localTurma;
          if (localTurma.escola_id) {
            escolaInfo = await db.escolas.get(localTurma.escola_id);
          }
        }
      }

      const escolaId = turmaInfo?.escola_id || escolaInfo?.id;
      const { diretorNome, secretarioNome } = await obterEquipeEscolar(
        supabase,
        escolaId,
        escolaInfo?.diretor,
        escolaInfo?.secretario
      );

      const logoEscola = getEscolaLogo(escolaInfo);

      // 2. Buscar Alunos da Turma
      let alunosLista: any[] = [];
      try {
        const { data: alunosDb } = await readAllRows(
          supabase
            .from('alunos')
            .select('id, nome, cpf, data_nascimento, sexo, nome_responsavel, endereco, status, matricula')
            .eq('turma_id', turmaId)
            .order('nome')
        );
        if (alunosDb && alunosDb.length > 0) {
          alunosLista = alunosDb;
        }
      } catch {
        // Fallback offline
      }

      if (alunosLista.length === 0) {
        const localAlunos = await db.alunos.where('turma_id').equals(turmaId).sortBy('nome');
        alunosLista = localAlunos;
      }

      if (alunosLista.length === 0) {
        setBoletins([]);
        setLoadingDados(false);
        return;
      }

      const alunoIds = alunosLista.map(a => a.id);

      // 3. Buscar Notas de todos os alunos da turma
      let notasLista: any[] = [];
      try {
        const { data: notasDb } = await readAllRows(
          supabase
            .from('notas')
            .select('valor, aluno_id, avaliacao_id, avaliacoes(tipo, disciplina, bimestre, valor_maximo, turma_id)')
            .in('aluno_id', alunoIds)
        );
        if (notasDb) {
          notasLista = notasDb;
        }
      } catch {
        // Fallback offline
      }

      if (notasLista.length === 0) {
        const localNotas = await db.notas.where('aluno_id').anyOf(alunoIds.map(String)).toArray();
        const localAvs = await db.avaliacoes.where('turma_id').equals(turmaId).toArray();
        const avMap = new Map(localAvs.map(a => [String(a.id), a]));
        notasLista = localNotas.map(n => ({
          valor: n.valor,
          aluno_id: n.aluno_id,
          avaliacao_id: n.avaliacao_id,
          avaliacoes: avMap.get(String(n.avaliacao_id))
        }));
      }

      // 4. Buscar Frequências de todos os alunos da turma
      let frequenciasLista: any[] = [];
      try {
        const { data: freqDb } = await readAllRows(
          supabase
            .from('frequencias')
            .select('data, disciplina, status, participacao, aluno_id')
            .eq('turma_id', turmaId)
        );
        if (freqDb) {
          frequenciasLista = freqDb;
        }
      } catch {
        // Fallback offline
      }

      if (frequenciasLista.length === 0) {
        const localFreqs = await db.frequencias.where('turma_id').equals(turmaId).toArray();
        frequenciasLista = localFreqs;
      }

      // 5. Montar estrutura consolidada para cada aluno da turma
      const consolidado: AlunoCompletoBoletim[] = alunosLista.map((aluno, index) => {
        const notasDoAluno: NotaBoletimItem[] = notasLista
          .filter(n => String(n.aluno_id) === String(aluno.id))
          .map(n => ({
            disciplina: n.avaliacoes?.disciplina || 'N/D',
            tipo: n.avaliacoes?.tipo || 'N/D',
            valor: Number(n.valor) || 0,
            valor_maximo: Number(n.avaliacoes?.valor_maximo) || 10,
            bimestre: n.avaliacoes?.bimestre || '1º',
          }));

        const frequenciasDoAluno: FrequenciaBoletimItem[] = frequenciasLista
          .filter(f => String(f.aluno_id) === String(aluno.id))
          .map(f => ({
            data: f.data,
            disciplina: f.disciplina || 'Geral',
            status: f.status || 'P',
            participacao: f.participacao || 'Presencial'
          }));

        const alunoData: AlunoBoletimData = {
          id: String(aluno.id),
          nome: aluno.nome || 'Aluno Sem Nome',
          escola_nome: escolaInfo?.nome || turmaInfo?.escola_nome || 'Escola Municipal',
          escola_inep: escolaInfo?.inep || '---',
          escola_diretor: diretorNome,
          escola_secretario: secretarioNome,
          escola_endereco: escolaInfo?.distrito || '---',
          turma_nome: turmaInfo?.nome || 'Turma',
          turma_turno: turmaInfo?.turno || 'Manhã',
          turma_ano: String(turmaInfo?.ano_letivo || APP_CONFIG.YEAR),
          matricula: formatMatriculaCpf(aluno.cpf || aluno.matricula),
          data_nascimento: aluno.data_nascimento || '---',
          nome_responsavel: aluno.nome_responsavel || '---',
          endereco: aluno.endereco || '---',
          sexo: aluno.sexo || '---',
          numero_aluno: index + 1,
          ensino_modalidade: turmaInfo?.ensino || 'ENSINO FUNDAMENTAL I (EF1) 1º AO 5º ANO',
          escola_logo_url: logoEscola
        };

        return {
          alunoData,
          notas: notasDoAluno,
          frequencias: frequenciasDoAluno
        };
      });

      setBoletins(consolidado);
    } catch (err) {
      console.error('Erro ao carregar dados dos boletins da turma:', err);
      showError('Ocorreu um erro ao carregar os dados dos alunos para emissão dos boletins.');
    } finally {
      setLoadingDados(false);
    }
  }, [showError]);

  useEffect(() => {
    if (selectedTurmaId) {
      carregarDadosTurma(selectedTurmaId);
    }
  }, [selectedTurmaId, carregarDadosTurma]);

  // Atualizar URL params ao mudar filtros
  const handleMudarTurma = (novaTurmaId: string) => {
    setSelectedTurmaId(novaTurmaId);
    setSelectedAlunoId('');
    setSearchParams({ turmaId: novaTurmaId });
  };

  const handleMudarAluno = (novoAlunoId: string) => {
    setSelectedAlunoId(novoAlunoId);
    if (novoAlunoId) {
      setSearchParams({ turmaId: selectedTurmaId, alunoId: novoAlunoId });
    } else {
      setSearchParams({ turmaId: selectedTurmaId });
    }
  };

  // Filtrar lista de boletins a exibir com base no dropdown de Aluno
  const boletinsFiltrados = useMemo(() => {
    if (!selectedAlunoId) return boletins;
    return boletins.filter(b => b.alunoData.id === selectedAlunoId);
  }, [boletins, selectedAlunoId]);

  const turmaAtual = useMemo(() => {
    return turmas.find(t => t.id === selectedTurmaId);
  }, [turmas, selectedTurmaId]);

  const handleImprimir = () => {
    if (boletinsFiltrados.length === 0) {
      showWarning('Nenhum boletim disponível para impressão.');
      return;
    }
    window.print();
  };

  const homePath = user?.role === 'PROFESSOR' ? '/turmas' : '/administracao';

  return (
    <div className="min-h-screen bg-slate-50 relative pb-16">
      {/* SubHeader / Navegação Superior */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-30 shadow-sm no-print">
        <div className="flex items-center gap-4">
          <Link
            to={homePath}
            className="bg-[#eef2ff] text-[#0f2851] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-blue-100 hover:bg-[#e0e7ff] transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[#0f2851] flex items-center gap-2 leading-tight">
              Boletins Escolares
            </h1>
            <p className="text-xs text-slate-500 font-medium hidden sm:block">
              Emissão e impressão oficial em folhas A4 individuais ou em lote
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleImprimir}
            disabled={loadingDados || boletinsFiltrados.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0f2851] text-white rounded-xl text-sm font-bold hover:bg-[#1a3a6d] transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            title="Imprimir boletins visualizados"
          >
            <Printer className="w-4 h-4" />
            <span>
              Imprimir {boletinsFiltrados.length > 1 ? `Turma (${boletinsFiltrados.length})` : 'Boletim'}
            </span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Seleção */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-4 no-print">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* Seletor de Turma */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-600" />
                Turma da Escola
              </label>
              <div className="relative">
                <select
                  value={selectedTurmaId}
                  onChange={(e) => handleMudarTurma(e.target.value)}
                  disabled={loadingTurmas || turmas.length === 0}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#0f2851] focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] appearance-none cursor-pointer transition disabled:opacity-50"
                >
                  {turmas.length === 0 ? (
                    <option value="">Nenhuma turma disponível</option>
                  ) : (
                    turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} — {t.turno} ({t.escolaNome})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Seletor de Aluno */}
            <div className="md:col-span-6 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                Estudante / Emissão
              </label>
              <div className="relative">
                <select
                  value={selectedAlunoId}
                  onChange={(e) => handleMudarAluno(e.target.value)}
                  disabled={loadingDados || boletins.length === 0}
                  className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-[#0f2851] focus:ring-2 focus:ring-[#0f2851]/10 focus:border-[#0f2851] appearance-none cursor-pointer transition disabled:opacity-50"
                >
                  <option value="">
                    📄 Turma Completa em Lote (Todos os {boletins.length} alunos)
                  </option>
                  {boletins.map((b) => (
                    <option key={b.alunoData.id} value={b.alunoData.id}>
                      Nº {b.alunoData.numero_aluno.toString().padStart(2, '0')} — {b.alunoData.nome}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Badges de Resumo e Instruções */}
          {turmaAtual && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-blue-50 text-[#0f2851] px-3 py-1 rounded-lg border border-blue-100">
                  <strong>Turma:</strong> {turmaAtual.nome}
                </span>
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg border border-slate-200">
                  <strong>Turno:</strong> {turmaAtual.turno}
                </span>
                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-100">
                  <strong>Total:</strong> {boletins.length} estudante(s)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 italic">
                {selectedAlunoId 
                  ? 'Visualizando boletim individual selecionado' 
                  : 'Ao imprimir a turma completa, cada boletim será impresso em sua própria folha A4 com quebra de página automática.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal / Visualização dos Boletins */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 mt-4">
        {loadingDados ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm no-print">
            <div className="animate-spin w-10 h-10 border-4 border-[#0f2851] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600 font-bold text-base">Consolidando notas, frequências e dados dos alunos...</p>
            <p className="text-slate-400 text-xs mt-1">Isso levará apenas alguns segundos.</p>
          </div>
        ) : boletinsFiltrados.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm no-print">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">Nenhum aluno encontrado para esta turma</h3>
            <p className="text-xs text-slate-500 mt-1">Verifique se os alunos já foram matriculados nesta turma.</p>
          </div>
        ) : (
          <div id="boletim-impressao-area" className="space-y-8 print:space-y-0">
            {boletinsFiltrados.map((item, index) => {
              const isLast = index === boletinsFiltrados.length - 1;
              return (
                <div key={item.alunoData.id} className="relative boletim-wrapper">
                  {/* Indicador na tela para navegação amigável (oculto na impressão) */}
                  <div className="no-print max-w-[21cm] mx-auto mb-2 flex items-center justify-between px-2 text-xs font-bold text-slate-400">
                    <span>Aluno {index + 1} de {boletinsFiltrados.length}</span>
                    <span className="uppercase text-[#0f2851]">{item.alunoData.nome}</span>
                  </div>

                  <BoletimDocumento
                    alunoData={item.alunoData}
                    notas={item.notas}
                    frequencias={item.frequencias}
                    pageBreak={boletinsFiltrados.length > 1 && !isLast}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Regras CSS de Impressão */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            background: white !important;
            height: auto !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden;
          }
          #boletim-impressao-area,
          #boletim-impressao-area * {
            visibility: visible;
          }
          #boletim-impressao-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .no-print {
            display: none !important;
          }
          .boletim-wrapper {
            display: block !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .boletim-wrapper:not(:last-child) {
            break-after: page !important;
            page-break-after: always !important;
          }
          .boletim-page {
            display: block !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          #boletim-impressao-area > div:last-child,
          #boletim-impressao-area > div:last-child .boletim-page {
            page-break-after: auto !important;
            break-after: auto !important;
          }
        }
      `}} />
    </div>
  );
}
