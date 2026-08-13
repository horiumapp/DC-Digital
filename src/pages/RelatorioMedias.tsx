import React, { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, Search, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { APP_CONFIG } from '../config/appConfig';
import { TurmaService, NotaRecord } from '../services/turmaService';
import { Aluno, Avaliacao } from '../contexts/TurmaContext';
import { useToast } from '../components/common/Toast';

const obterLogoEscola = (nomeEscola: string) => {
  if (!nomeEscola) return '/logo.png';
  const nomeUpper = nomeEscola.toUpperCase();
  if (nomeUpper.includes('FRANCISCA')) return '/Francisca Mendes.png';
  if (nomeUpper.includes('MAIA') || nomeUpper.includes('JOSE MAIA') || nomeUpper.includes('JOSÉ MAIA')) return '/José Maia.png';
  if (nomeUpper.includes('PASTOR') || nomeUpper.includes('REIS')) return '/Pastor José Reis.png';
  if (nomeUpper.includes('VARGAS') || nomeUpper.includes('PRESIDENTE')) return '/Presidente Vargas.png';
  if (nomeUpper.includes('SOCORRO') || nomeUpper.includes('BRITO')) return '/Socorro Brito.png';
  if (nomeUpper.includes('FILADÉLFIA') || nomeUpper.includes('FILADELFIA')) return '/Filadelfia.png';
  if (nomeUpper.includes('MÔNICA') || nomeUpper.includes('MONICA')) return '/Turma da Monica.png';
  if (nomeUpper.includes('SÃO FRANCISCO') || nomeUpper.includes('SAO FRANCISCO')) return '/São Francisco.png';
  return '/logo.png';
};

interface TurmaRelatorio {
  id: string;
  nome: string;
  turno: string;
  componente: string;
  ensino: string;
  fase: string;
  numero: string;
  escolaId: string;
  escolaNome: string;
}

export default function RelatorioMedias() {
  const { user } = useAuth();
  const { showError } = useToast();
  const [turmas, setTurmas] = useState<TurmaRelatorio[]>([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [dataLoading, setDataLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [notas, setNotas] = useState<Record<string, unknown>[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTurmasProfessor = React.useCallback(async () => {
    setLoading(true);
    try {
      if (!user) return;

      if (user.role === 'ADMIN' || user.role === 'GESTOR' || user.role === 'SECRETARIO') {
        const { data: todasTurmas, error } = await supabase
          .from('turmas')
          .select('*, escolas(nome)')
          .order('nome');
        
        if (error) throw error;
        if (todasTurmas) {
          const finalTurmas: TurmaRelatorio[] = [];
          todasTurmas.forEach(t => {
            let fase = t.nome;
            let numero = '01';

            const match = t.nome.match(/(.+)\s+([A-Za-z0-9]+)$/);
            if (match) {
              fase = match[1].trim();
              numero = match[2].trim();
            } else {
              const matchNum = t.nome.match(/(\d+)$/);
              if (matchNum) numero = matchNum[1];
            }

            finalTurmas.push({
              id: `${t.id}|GERAL`,
              nome: t.nome,
              turno: t.turno,
              componente: 'GERAL',
              ensino: t.ensino || 'Fundamental Anos Iniciais (1° ao 5° ANO)',
              fase: fase,
              numero: t.turma_codigo || numero,
              escolaId: t.escola_id,
              escolaNome: t.escolas?.nome || 'ESCOLA NÃO IDENTIFICADA'
            });
          });

          setTurmas(finalTurmas);
          if (finalTurmas.length > 0) {
            setSelectedTurma(finalTurmas[0].id);
          }
        }
      } else {
        const emailLimpo = user.email.trim();
        const { data: profs, error: profError } = await supabase
          .from('professores')
          .select('id, disciplinas')
          .ilike('email', `%${emailLimpo}%`);

        if (profError) throw profError;
        if (profs && profs.length > 0) {
          let allDisciplinas: string[] = [];
          profs.forEach(p => {
            if (p.disciplinas && Array.isArray(p.disciplinas)) {
              allDisciplinas = [...allDisciplinas, ...p.disciplinas];
            }
          });
          let componentes = [...new Set(allDisciplinas)];
          if (componentes.length === 0) componentes = ['POLIVALENTE'];

          const profIds = profs.map(p => p.id);
          const { data: alocs, error: alocError } = await supabase
            .from('professor_alocacoes')
            .select('escola_id, turno')
            .in('professor_id', profIds);

          if (alocError) throw alocError;
          if (alocs && alocs.length > 0) {
            const orConditions = alocs.map(a => `and(escola_id.eq.${a.escola_id},turno.eq.${a.turno})`).join(',');
            const { data: turmasAlocadas, error: turmasError } = await supabase
              .from('turmas')
              .select('*, escolas(nome)')
              .or(orConditions)
              .order('nome');

            if (turmasError) throw turmasError;
            if (turmasAlocadas) {
              const finalTurmas: TurmaRelatorio[] = [];
              turmasAlocadas.forEach(t => {
                componentes.forEach(comp => {
                  let fase = t.nome;
                  let numero = '01';

                  const match = t.nome.match(/(.+)\s+([A-Za-z0-9]+)$/);
                  if (match) {
                    fase = match[1].trim();
                    numero = match[2].trim();
                  } else {
                    const matchNum = t.nome.match(/(\d+)$/);
                    if (matchNum) numero = matchNum[1];
                  }

                  finalTurmas.push({
                    id: `${t.id}|${comp}`,
                    nome: t.nome,
                    turno: t.turno,
                    componente: comp,
                    ensino: t.ensino || 'Fundamental Anos Iniciais (1° ao 5° ANO)',
                    fase: fase,
                    numero: t.turma_codigo || numero,
                    escolaId: t.escola_id,
                    escolaNome: t.escolas?.nome || 'ESCOLA NÃO IDENTIFICADA'
                  });
                });
              });
              setTurmas(finalTurmas);
              if (finalTurmas.length > 0) {
                setSelectedTurma(finalTurmas[0].id);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar turmas:', err);
      showError('Não foi possível carregar as turmas.');
    } finally {
      setLoading(false);
    }
  }, [user, showError]);

   
  useEffect(() => {
    if (user?.email) {
      fetchTurmasProfessor();
    }
  }, [user, fetchTurmasProfessor]);
   

  const handleExibir = async () => {
    if (!selectedTurma) return;
    setDataLoading(true);
    setHasSearched(true);
    try {
      const [turmaId, componente] = selectedTurma.split('|');
      const tid = turmaId.split('||')[0];
      
      const alunosData = await TurmaService.fetchAlunos(tid);
      setAlunos(alunosData);

      const { avaliacoes: avsData, notasData } = await TurmaService.fetchAvaliacoes(tid, componente);
      setAvaliacoes(avsData);
      setNotas(notasData);
    } catch (err) {
      console.error(err);
      showError('Erro ao buscar dados do relatório.');
    } finally {
      setDataLoading(false);
    }
  };

  const getNota = (alunoId: string, avaliacaoId: string) => {
    const notaRow = notas.find(n => n.aluno_id?.toString() === alunoId?.toString() && n.avaliacao_id?.toString() === avaliacaoId?.toString());
    return notaRow ? notaRow.valor : null;
  };

  const calcularSomaBimestre = (alunoId: string, bimestre: string) => {
    const prefix = bimestre[0];
    const avsBimestre = avaliacoes.filter(a => a.bimestre && a.bimestre[0] === prefix);
    const principalAvs = avsBimestre.filter(a => a.tipo.startsWith('AV') && !a.tipo.startsWith('RP'));
    
    if (principalAvs.length === 0) return null;
    
    let soma = 0;
    principalAvs.forEach(av => {
      const rp = avsBimestre.find(a => a.parent_id?.toString() === av.id?.toString());
      const valAv = getNota(alunoId, av.id) ?? 0;
      const valRp = rp ? (getNota(alunoId, rp.id) ?? 0) : 0;
      soma += Math.max(valAv, valRp);
    });
    
    const bimNumber = parseInt(bimestre[0]);
    const maxLimit = (bimNumber === 1 || bimNumber === 2) ? 20 : 30;
    
    return Math.min(soma, maxLimit);
  };

  const selectedTurmaObj = turmas.find(t => t.id === selectedTurma);

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <div className="relative z-10">
        {/* SubHeader */}
        <section className="bg-white/80 backdrop-blur-md px-8 py-3 flex items-center justify-between border-b border-blue-100 shadow-sm sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <Link to="/turmas" className="bg-[#eef2ff] text-[#0f2851] px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold border border-blue-100 hover:bg-[#e0e7ff] transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Link>
            <h1 className="text-xl font-semibold text-[#0f2851]">Relatório de Notas do Componente</h1>
          </div>
          <span className="bg-emerald-100 text-emerald-700 text-[12px] font-bold px-3 py-1 rounded-full border border-emerald-200">Ano: {APP_CONFIG.YEAR}</span>
        </section>

      {/* MainContent */}
      <main className="p-6 max-w-[1400px] mx-auto">
        {/* SearchCard */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#0f2851]">Pesquisa</h2>
              <button 
                onClick={() => window.print()}
                className="px-6 py-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 rounded text-base font-semibold hover:bg-[#e0e7ff] transition shadow-sm cursor-pointer"
              >
                Imprimir
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-slate-500 mb-1">Turma</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Users className="w-5 h-5 text-slate-400" />
                  </div>
                  <select 
                    value={selectedTurma}
                    onChange={(e) => setSelectedTurma(e.target.value)}
                    className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-md focus:ring-[#0f2851] focus:border-[#0f2851] block w-full pl-12 p-2.5 outline-none appearance-none font-semibold"
                  >
                    {loading ? (
                      <option>Carregando turmas...</option>
                    ) : turmas.length > 0 ? (
                      turmas.map(t => (
                        <option key={`${t.id}|${t.componente}`} value={`${t.id}|${t.componente}`}>
                          {t.ensino} - {t.fase} {t.numero} - {t.componente}
                        </option>
                      ))
                    ) : (
                      <option>Nenhuma turma encontrada</option>
                    )}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                    <ChevronDown className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </div>
              <div className="md:col-span-4">
                <button 
                  onClick={handleExibir}
                  disabled={dataLoading}
                  className="w-full flex items-center justify-center space-x-2 bg-[#eef2ff] text-[#0f2851] border border-blue-100 px-6 py-2.5 rounded-md text-sm font-semibold hover:bg-[#e0e7ff] transition disabled:opacity-70 shadow-sm"
                >
                  <Search className="w-5 h-5" />
                  <span>{dataLoading ? 'Buscando...' : 'Exibir'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* StudentsTableSection */}
        {hasSearched && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-12">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Alunos</h2>
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Search className="w-5 h-5 text-slate-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Pesquisar por nome do aluno..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-md focus:ring-[#0f2851] focus:border-[#0f2851] block w-full pl-12 p-3 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-base text-left border-collapse">
                <thead className="bg-[#f8f9fa] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-4 border-b border-slate-200 w-16 text-center">
                      <span className="text-[12px] text-[#0f2851] font-bold uppercase">Nº</span>
                    </th>
                    <th className="px-6 py-4 border-b border-slate-200 border-l border-slate-100 min-w-[300px]">
                      <span className="text-[12px] text-[#0f2851] font-bold uppercase">Nome do Aluno</span>
                    </th>
                    <th className="px-4 py-4 border-b border-slate-200 border-l border-slate-100 text-center">
                      <span className="text-[12px] text-[#0f2851] font-bold uppercase">Motivo Saída</span>
                    </th>
                    <th className="px-4 py-4 border-b border-slate-200 border-l border-slate-100 text-center">
                      <span className="text-[12px] text-[#0f2851] font-bold uppercase">Data Saída</span>
                    </th>
                    {['1º BIM', '2º BIM', '3º BIM', '4º BIM', 'RECUP'].map(label => (
                      <th key={label} className="px-2 py-4 border-b border-slate-200 border-l border-slate-100 text-center min-w-[90px]">
                        <span className="text-[12px] text-[#0f2851] font-bold uppercase">{label}</span>
                      </th>
                    ))}
                    <th className="px-4 py-4 border-b border-slate-200 border-l border-slate-100 text-center min-w-[130px] bg-slate-50/50">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-[12px] text-[#0f2851] font-bold uppercase">Nota Final</span>
                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {(() => {
                    const turmaObj = turmas.find(t => `${t.id}|${t.componente}` === selectedTurma);
                    const turmaNomeRaw = turmaObj?.nome || 'N/D';
                    const partesTurma = turmaNomeRaw.split(' ');
                    const _turmaPart = partesTurma.length > 1 ? partesTurma.pop() : '';
                    const _fasePart = partesTurma.join(' ') || turmaNomeRaw;

                    return alunos.filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase())).map((aluno, index) => {
                      const m1 = calcularSomaBimestre(aluno.id, '1. BIMESTRE');
                      const m2 = calcularSomaBimestre(aluno.id, '2. BIMESTRE');
                      const m3 = calcularSomaBimestre(aluno.id, '3. BIMESTRE');
                      const m4 = calcularSomaBimestre(aluno.id, '4. BIMESTRE');
                      
                      const validMedias = [m1, m2, m3, m4].filter(m => m !== null) as number[];
                      const somaFinal = validMedias.length > 0 ? validMedias.reduce((a, b) => a + b, 0) : null;
                      
                      const renderMediaPill = (val: number | null, isFinal = false) => {
                        if (val === null) return <span className="inline-flex min-w-[48px] justify-center text-slate-300 px-2 py-1 text-[13px] font-bold">-</span>;
                        const isLow = isFinal ? val < 50 : false;
                        return (
                          <span className={`inline-flex min-w-[52px] justify-center px-2.5 py-1.5 rounded-lg text-[13px] font-black transition-all shadow-sm ${
                            isLow 
                              ? 'bg-red-50 text-red-600 border border-red-100' 
                              : isFinal ? 'bg-[#0f2851] text-white shadow-[#0f2851]/20' : 'bg-blue-50 text-[#0f2851] border border-blue-100'
                          }`}>
                            {val.toFixed(1).replace('.', ',')}
                          </span>
                        );
                      };

                      return (
                        <tr key={aluno.id} className="hover:bg-blue-50/40 transition-colors group border-b border-slate-50 last:border-0">
                          <td className="px-4 py-4 text-[#64748b] font-bold text-center text-[12px] tracking-tight">
                            {(index + 1).toString().padStart(2, '0')}
                          </td>
                          <td className="px-6 py-4 border-l border-slate-50">
                            <span className="text-[#0f2851] font-bold uppercase text-[13px] group-hover:text-blue-700 transition-colors tracking-tight">
                              {aluno.nome}
                            </span>
                          </td>
                          <td className="px-4 py-4 border-l border-slate-50 text-center">
                            <span className="text-[11px] text-slate-300 font-bold">-</span>
                          </td>
                          <td className="px-4 py-4 border-l border-slate-50 text-center">
                            <span className="text-[11px] text-slate-300 font-bold">-</span>
                          </td>
                          <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(m1)}</td>
                          <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(m2)}</td>
                          <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(m3)}</td>
                          <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(m4)}</td>
                          <td className="px-2 py-4 border-l border-slate-50 text-center">{renderMediaPill(null)}</td>
                          <td className="px-4 py-4 border-l border-slate-100 text-center bg-slate-50/50 font-black">
                            {renderMediaPill(somaFinal, true)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-8 pb-12 text-center text-slate-400 text-xs">
        © {APP_CONFIG.YEAR} Diário Digital - Sistema de Gestão Escolar
      </footer>

      {/* Área de Impressão (invisível na tela, visível apenas na impressão) */}
      {selectedTurmaObj && (
        <div id="printable-relatorio" className="hidden print:block fixed inset-0 bg-white z-[9999] overflow-y-auto">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { margin: 1cm; size: A4 landscape; }
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
            #printable-relatorio table { width: 100%; border-collapse: collapse; table-layout: fixed; }
            #printable-relatorio th, #printable-relatorio td { border: 1px solid black; padding: 4px; text-align: left; font-size: 8px; font-family: Arial, sans-serif; }
            #printable-relatorio .header-grid { width: 100%; border: 1px solid black; border-collapse: collapse; }
            #printable-relatorio .header-grid td { border: 1px solid black; padding: 2px 6px; }
            #printable-relatorio .label { font-size: 6px; text-transform: uppercase; font-weight: normal; margin-bottom: 1px; color: #333; }
            #printable-relatorio .value { font-size: 9px; font-weight: bold; text-transform: uppercase; }
            #printable-relatorio .title-bar { border: 1px solid black; border-top: none; padding: 6px; text-align: center; font-weight: bold; font-size: 14px; text-transform: uppercase; }
            #printable-relatorio .content-table { margin-top: 15px; border: 1px solid black; width: 100%; border-collapse: collapse; }
            #printable-relatorio .content-table th { background: #eee; text-align: center; font-weight: bold; padding: 6px; border: 1px solid black; font-size: 8px; }
            #printable-relatorio .content-table td { border: 1px solid black; padding: 4px; font-size: 8px; }
            #printable-relatorio .signatures { margin-top: 40px; display: flex; justify-content: space-around; page-break-inside: avoid; padding-bottom: 20px; }
            #printable-relatorio .sig-line { border-top: 1px solid black; width: 250px; text-align: center; padding-top: 4px; font-size: 8px; font-weight: bold; margin-top: 25px; }
          `}} />

          <div className="p-4 bg-white text-black h-auto">
            {/* Cabeçalho Oficial */}
            <div className="flex border border-black overflow-hidden">
              {/* Lado Esquerdo: SEMED */}
              <div className="w-[20%] border-r border-black p-4 flex flex-col items-center justify-center text-center">
                <img src="/semed.png" alt="Logo SEMED" className="w-16 h-16 mb-1 object-contain" />
                <div className="font-bold text-[8px] leading-tight uppercase">
                  Secretaria Municipal de Educação<br />
                  Lábrea - AM
                </div>
              </div>

              {/* Centro: Tabela de Metadados */}
              <table className="flex-1 header-grid border-none">
                <tbody>
                  <tr className="h-8">
                    <td colSpan={3} className="border-t-0 border-r-0">
                      <div className="label">Escola:</div>
                      <div className="value shadow-none">{selectedTurmaObj.escolaNome}</div>
                    </td>
                  </tr>
                  <tr className="h-8">
                    <td width="55%" className="border-r border-black">
                      <div className="label">Ensino:</div>
                      <div className="value">{selectedTurmaObj.ensino}</div>
                    </td>
                    <td width="25%" className="border-r border-black">
                      <div className="label">Turno:</div>
                      <div className="value">{selectedTurmaObj.turno}</div>
                    </td>
                    <td width="20%" className="border-r-0">
                      <div className="label">Turma:</div>
                      <div className="value">{selectedTurmaObj.numero}</div>
                    </td>
                  </tr>
                  <tr className="h-8">
                    <td className="border-r border-black">
                      <div className="label">Fase:</div>
                      <div className="value">{selectedTurmaObj.fase}</div>
                    </td>
                    <td className="border-r border-black">
                      <div className="label">Componente:</div>
                      <div className="value">{selectedTurmaObj.componente?.toUpperCase()}</div>
                    </td>
                    <td className="border-r-0">
                      <div className="label">Período Letivo:</div>
                      <div className="value">ANUAL</div>
                    </td>
                  </tr>
                  <tr className="h-8">
                    <td colSpan={3} className="border-b-0 border-r-0">
                      <div className="label">Professor:</div>
                      <div className="value">{user?.name?.toUpperCase() || 'NÃO IDENTIFICADO'}</div>
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Lado Direito: Escola */}
              <div className="w-[20%] border-l border-black p-4 flex flex-col items-center justify-center text-center">
                <img 
                  src={obterLogoEscola(selectedTurmaObj.escolaNome)} 
                  alt="School Logo"
                  className="w-16 h-16 mb-1 object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/logo.png';
                  }}
                />
                <div className="font-bold text-[8px] leading-tight uppercase">
                  {selectedTurmaObj.escolaNome}
                </div>
              </div>
            </div>

            {/* Title Bar */}
            <div className="title-bar">
              RELATÓRIO DE MÉDIAS DO COMPONENTE
            </div>

            {/* Tabela de Dados */}
            <table className="content-table">
              <thead>
                <tr>
                  <th style={{ width: '4%', textAlign: 'center' }}>Nº</th>
                  <th style={{ width: '38%' }}>NOME DO ALUNO</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>MOTIVO SAÍDA</th>
                  <th style={{ width: '14%', textAlign: 'center' }}>DATA SAÍDA</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>1º BIM</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>2º BIM</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>3º BIM</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>4º BIM</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>RECUP</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>NOTA FINAL</th>
                </tr>
              </thead>
              <tbody>
                {alunos.filter(a => a.nome.toLowerCase().includes(searchTerm.toLowerCase())).map((aluno, index) => {
                  const m1 = calcularSomaBimestre(aluno.id, '1. BIMESTRE');
                  const m2 = calcularSomaBimestre(aluno.id, '2. BIMESTRE');
                  const m3 = calcularSomaBimestre(aluno.id, '3. BIMESTRE');
                  const m4 = calcularSomaBimestre(aluno.id, '4. BIMESTRE');
                  
                  const validMedias = [m1, m2, m3, m4].filter(m => m !== null) as number[];
                  const somaFinal = validMedias.length > 0 ? validMedias.reduce((a, b) => a + b, 0) : null;
                  
                  return (
                    <tr key={aluno.id}>
                      <td style={{ textAlign: 'center' }}>{(index + 1).toString().padStart(2, '0')}</td>
                      <td style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{aluno.nome}</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'center' }}>{m1 !== null ? m1.toFixed(1).replace('.', ',') : '-'}</td>
                      <td style={{ textAlign: 'center' }}>{m2 !== null ? m2.toFixed(1).replace('.', ',') : '-'}</td>
                      <td style={{ textAlign: 'center' }}>{m3 !== null ? m3.toFixed(1).replace('.', ',') : '-'}</td>
                      <td style={{ textAlign: 'center' }}>{m4 !== null ? m4.toFixed(1).replace('.', ',') : '-'}</td>
                      <td style={{ textAlign: 'center' }}>-</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {somaFinal !== null ? somaFinal.toFixed(1).replace('.', ',') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Signatures Area */}
            <div className="signatures">
              <div className="sig-line">
                {user?.name?.toUpperCase() || 'NÃO IDENTIFICADO'}<br />
                <span className="text-[7px] text-gray-500 font-normal uppercase">Professor(a)</span>
              </div>
              <div className="sig-line">
                COORDENAÇÃO PEDAGÓGICA<br />
                <span className="text-[7px] text-gray-500 font-normal uppercase">Assinatura</span>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
