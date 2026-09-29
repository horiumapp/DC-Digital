import React from 'react';
import { Printer } from 'lucide-react';
import { getBimestrePorData } from '../../utils/dateUtils';

interface AlunoData {
  id: string;
  nome: string;
  escola_nome: string;
  escola_inep: string;
  escola_diretor: string;
  escola_secretario?: string;
  escola_endereco: string;
  turma_nome: string;
  turma_turno: string;
  turma_ano: string;
  matricula: string;
  data_nascimento: string;
  nome_responsavel: string;
  endereco: string;
  sexo: string;
  numero_aluno: number;
  ensino_modalidade: string;
  escola_logo_url?: string;
}

interface NotaItem {
  disciplina: string;
  tipo: string;
  valor: number;
  valor_maximo: number;
  bimestre: string;
}

interface FrequenciaItem {
  data: string;
  disciplina: string;
  status: string;
  participacao: string;
}

interface BoletimTabProps {
  alunoData: AlunoData;
  notas: NotaItem[];
  frequencias: FrequenciaItem[];
}

export default function BoletimTab({ alunoData, notas, frequencias }: BoletimTabProps) {
  const bimestres = ['1º', '2º', '3º', '4º'];
  
  // Agrupar disciplinas únicas
  const disciplinas = Array.from(new Set([
    ...notas.map(n => n.disciplina),
    ...frequencias.map(f => f.disciplina)
  ])).filter(d => d && d !== 'N/D').sort();

  const handlePrint = () => {
    window.print();
  };

  // Lógica para extrair Série e Turma
  const parts = alunoData.turma_nome.split(' ');
  const serie = parts.length > 1 ? parts.slice(0, -1).join(' ').toUpperCase() : alunoData.turma_nome.toUpperCase();
  const turmaLetra = parts[parts.length - 1]?.length === 1 ? parts[parts.length - 1].toUpperCase() : '---';

  // Garantir um mínimo de 12 linhas na tabela para estética de documento oficial
  const minRows = 12;
  const disciplinasPadded = [...disciplinas];
  while (disciplinasPadded.length < minRows) {
    disciplinasPadded.push(`EMPTY_${disciplinasPadded.length}`);
  }

  const resumoDisciplinas = disciplinas.map(disciplina => {
    const notasDisciplina = notas.filter(nota => nota.disciplina === disciplina);
    const frequenciasDisciplina = frequencias.filter(frequencia => frequencia.disciplina === disciplina);
    const resultadosBimestres = bimestres.map(bimestre => {
      const notasBimestre = notasDisciplina.filter(nota => nota.bimestre.startsWith(bimestre[0]));
      let nota = notasBimestre.length > 0 ? notasBimestre.reduce((soma, item) => soma + (item.valor || 0), 0) : null;
      const numeroBimestre = parseInt(bimestre[0]);
      const limite = numeroBimestre <= 2 ? 20 : 30;
      if (nota !== null && nota > limite) nota = limite;
      const faltas = frequenciasDisciplina.filter(frequencia =>
        (frequencia.status === 'F' || frequencia.status === 'Ausente') && getBimestrePorData(frequencia.data).startsWith(bimestre[0])
      ).length;
      return { bimestre, nota, faltas };
    });
    const total = resultadosBimestres.reduce((soma, item) => soma + (item.nota ?? 0), 0);
    const faltas = resultadosBimestres.reduce((soma, item) => soma + item.faltas, 0);
    return { disciplina, resultadosBimestres, total, faltas };
  });
  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3 no-print">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Printer className="w-4 h-4" /> Imprimir Boletim
        </button>
      </div>

            <section className="boletim-mobile-view md:hidden space-y-4" aria-label="Boletim resumido">
        <div className="rounded-2xl bg-[#0f2851] p-5 text-white shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Boletim individual</p>
          <h2 className="mt-1 text-lg font-black uppercase leading-tight">{alunoData.nome}</h2>
          <p className="mt-2 text-sm text-blue-100">{alunoData.turma_nome} · {alunoData.turma_turno.toUpperCase()}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <div><p className="text-xs font-bold uppercase text-slate-400">Escola</p><p className="mt-1 font-bold text-slate-700">{alunoData.escola_nome}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Matrícula</p><p className="mt-1 font-bold text-slate-700">{alunoData.matricula}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Ano letivo</p><p className="mt-1 font-bold text-slate-700">{alunoData.turma_ano}</p></div>
          <div><p className="text-xs font-bold uppercase text-slate-400">Total de faltas</p><p className="mt-1 text-lg font-black text-slate-800">{frequencias.filter(f => f.status === 'F' || f.status === 'Ausente').length}</p></div>
        </div>
        <div className="space-y-3">
          <h3 className="px-1 text-base font-black text-slate-800">Notas e frequência</h3>
          {resumoDisciplinas.length > 0 ? resumoDisciplinas.map(resumo => (
            <article key={resumo.disciplina} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 bg-slate-50 px-4 py-3">
                <h4 className="text-sm font-black uppercase text-slate-800">{resumo.disciplina}</h4>
                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-[#0f2851]">Total {resumo.total > 0 ? resumo.total.toFixed(1) : '—'}</span>
              </div>
              <div className="grid grid-cols-2 gap-px bg-slate-200">
                {resumo.resultadosBimestres.map(resultado => (
                  <div key={resultado.bimestre} className="bg-white px-3 py-3">
                    <p className="text-xs font-black uppercase text-slate-400">{resultado.bimestre} bimestre</p>
                    <div className="mt-2 flex items-end justify-between gap-2"><span><span className="block text-[11px] font-bold uppercase text-slate-400">Nota</span><strong className="text-lg text-slate-800">{resultado.nota !== null ? resultado.nota.toFixed(1) : '—'}</strong></span><span className="text-right"><span className="block text-[11px] font-bold uppercase text-slate-400">Faltas</span><strong className="text-lg text-slate-800">{resultado.faltas || '—'}</strong></span></div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm"><span className="font-bold text-slate-500">Faltas no componente</span><strong className="text-slate-800">{resumo.faltas}</strong></div>
            </article>
          )) : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-medium text-slate-500">Ainda não há notas ou frequências disponíveis.</div>}
        </div>
      </section>
      <div className="hidden md:block bg-white border border-slate-300 p-8 shadow-sm max-w-[21cm] mx-auto print:shadow-none print:border-none print:p-0 print:m-0" id="boletim-view">
        {/* Header Documento Oficial */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center justify-between gap-4">
            {/* Lado Esquerdo: SEMED */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 flex items-center justify-center">
                <img src="/semed.png" alt="SEMED Logo" className="w-full h-full object-contain" />
              </div>
              <div className="space-y-0">
                <h2 className="text-sm font-black uppercase leading-tight">SEMED</h2>
                <h3 className="text-[10px] font-bold uppercase leading-tight text-slate-700">Secretaria Municipal de Educação</h3>
                <h3 className="text-[10px] font-bold uppercase leading-tight text-slate-700">Lábrea - AM</h3>
              </div>
            </div>

            <div className="self-stretch w-[1px] bg-black/20 my-1" />

            {/* Lado Direito: Escola */}
            <div className="flex items-center gap-4 flex-1 justify-end">
              <div className="text-[10px] space-y-1 text-right">
                <p><strong className="text-[9px]">ESCOLA:</strong> {alunoData.escola_nome}</p>
                <p><strong className="text-[9px]">ENDEREÇO:</strong> {alunoData.escola_endereco}</p>
                <p><strong className="text-[9px]">DIRETOR(A):</strong> {alunoData.escola_diretor}</p>
                {alunoData.escola_secretario && (
                  <p><strong className="text-[9px]">SECRETÁRIO(A):</strong> {alunoData.escola_secretario}</p>
                )}
                <p><strong className="text-[9px]">DATA EMISSÃO:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
              {alunoData.escola_logo_url && (
                <div className="w-20 h-20 flex items-center justify-center">
                  <img 
                    src={alunoData.escola_logo_url} 
                    alt="Logo Escola" 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="text-center border-y border-black py-2 mb-6 bg-slate-50 print:bg-transparent">
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">Boletim Individual</h1>
        </div>

        {/* Informações Aluno - Layout Totalmente Padronizado */}
        <div className="border-t border-l border-black mb-6">
          {/* Linha 1 */}
          <div className="flex w-full">
            <div className="border-r border-b border-black p-2 w-[20%]">
              <p className="font-bold text-[8px] text-slate-500 uppercase leading-none mb-1">Matrícula</p>
              <p className="font-bold text-[10px] leading-none">{alunoData.matricula}</p>
            </div>
            <div className="border-r border-b border-black p-2 w-[12%] text-center">
              <p className="font-bold text-[8px] text-slate-500 uppercase leading-none mb-1">Nº Aluno</p>
              <p className="font-bold text-[10px] leading-none">{alunoData.numero_aluno || '---'}</p>
            </div>
            <div className="border-r border-b border-black p-2 flex-1">
              <p className="font-bold text-[8px] text-slate-500 uppercase leading-none mb-1">Nome do Aluno</p>
              <p className="font-bold text-[10px] uppercase leading-none">{alunoData.nome}</p>
            </div>
          </div>
          
          {/* Linha 2 */}
          <div className="flex w-full">
            <div className="border-r border-b border-black p-2 w-[40%]">
              <p className="font-bold text-[8px] text-slate-500 uppercase leading-none mb-1">Ensino / Modalidade</p>
              <p className="font-bold text-[10px] leading-none">{alunoData.ensino_modalidade}</p>
            </div>
            <div className="border-r border-b border-black p-2 w-[15%] text-center">
              <p className="font-bold text-[8px] text-slate-500 uppercase leading-none mb-1">Ano Letivo</p>
              <p className="font-bold text-[10px] leading-none">{alunoData.turma_ano}</p>
            </div>
            <div className="border-r border-b border-black p-2 w-[15%] text-center">
              <p className="font-bold text-[8px] text-slate-500 uppercase leading-none mb-1">Série</p>
              <p className="font-bold text-[10px] leading-none">{serie}</p>
            </div>
            <div className="border-r border-b border-black p-2 w-[10%] text-center">
              <p className="font-bold text-[8px] text-slate-500 uppercase leading-none mb-1">Turma</p>
              <p className="font-bold text-[10px] leading-none">{turmaLetra}</p>
            </div>
            <div className="border-r border-b border-black p-2 w-[20%] text-center">
              <p className="font-bold text-[8px] text-slate-500 uppercase leading-none mb-1">Turno</p>
              <p className="font-bold text-[10px] uppercase leading-none">{alunoData.turma_turno}</p>
            </div>
          </div>
        </div>

        {/* Tabela de Notas e Faltas */}
        <div className="border border-black">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b border-black bg-slate-50 print:bg-transparent">
                <th rowSpan={2} className="border-r border-black p-2 text-left uppercase w-48">Área / Componente Curricular</th>
                <th rowSpan={2} className="border-r border-black p-1 text-center w-12 text-[8px]">CH Anual</th>
                {bimestres.map(bim => (
                  <th key={bim} colSpan={2} className="border-r border-black p-1 text-center uppercase">{bim} Bimestre</th>
                ))}
                <th rowSpan={2} className="border-r border-black p-1 text-center uppercase w-14">Recup. Final</th>
                <th rowSpan={2} className="border-r border-black p-1 text-center uppercase w-14">Total Final</th>
                <th rowSpan={2} className="p-1 text-center uppercase w-16">Resultado</th>
              </tr>
              <tr className="border-b border-black bg-slate-50/50 print:bg-transparent text-[8px]">
                {bimestres.map(bim => (
                  <React.Fragment key={`${bim}-sub`}>
                    <th className="border-r border-black p-1 text-center">Nota</th>
                    <th className="border-r border-black p-1 text-center">Faltas</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {disciplinasPadded.map((disc, _idx) => {
                const isEmpty = disc.startsWith('EMPTY_');
                const notasDisc = isEmpty ? [] : notas.filter(n => n.disciplina === disc);
                const freqDisc = isEmpty ? [] : frequencias.filter(f => f.disciplina === disc);
                
                let somaMedias = 0;
                let bimestresComNota = 0;

                const resumoDisciplinas = disciplinas.map(disciplina => {
    const notasDisciplina = notas.filter(nota => nota.disciplina === disciplina);
    const frequenciasDisciplina = frequencias.filter(frequencia => frequencia.disciplina === disciplina);
    const resultadosBimestres = bimestres.map(bimestre => {
      const notasBimestre = notasDisciplina.filter(nota => nota.bimestre.startsWith(bimestre[0]));
      let nota = notasBimestre.length > 0 ? notasBimestre.reduce((soma, item) => soma + (item.valor || 0), 0) : null;
      const numeroBimestre = parseInt(bimestre[0]);
      const limite = numeroBimestre <= 2 ? 20 : 30;
      if (nota !== null && nota > limite) nota = limite;
      const faltas = frequenciasDisciplina.filter(frequencia =>
        (frequencia.status === 'F' || frequencia.status === 'Ausente') && getBimestrePorData(frequencia.data).startsWith(bimestre[0])
      ).length;
      return { bimestre, nota, faltas };
    });
    const total = resultadosBimestres.reduce((soma, item) => soma + (item.nota ?? 0), 0);
    const faltas = resultadosBimestres.reduce((soma, item) => soma + item.faltas, 0);
    return { disciplina, resultadosBimestres, total, faltas };
  });
  return (
                  <tr key={disc} className="border-b border-black last:border-0 h-[25px]">
                    <td className="border-r border-black px-2 py-0.5 font-bold uppercase truncate max-w-[180px]">
                      {isEmpty ? '' : disc}
                    </td>
                    <td className="border-r border-black px-1 py-0.5 text-center text-slate-400">
                      {isEmpty ? '' : '---'}
                    </td>
                    {bimestres.map(bim => {
                      // Calcular nota do bimestre
                      const notasBim = notasDisc.filter(n => n.bimestre.startsWith(bim[0]));
                      let somaBim = notasBim.length > 0 
                        ? notasBim.reduce((s, n) => s + (n.valor || 0), 0)
                        : null;
                      
                      if (somaBim !== null) {
                        const bimNumber = parseInt(bim[0]);
                        const maxLimit = (bimNumber === 1 || bimNumber === 2) ? 20 : 30;
                        if (somaBim > maxLimit) somaBim = maxLimit;
                        
                        somaMedias += somaBim;
                        bimestresComNota++;
                      }

                      // Calcular faltas do bimestre
                      const faltasBim = freqDisc.filter(f => 
                        (f.status === 'F' || f.status === 'Ausente') && 
                        getBimestrePorData(f.data).startsWith(bim[0])
                      ).length;

                      const resumoDisciplinas = disciplinas.map(disciplina => {
    const notasDisciplina = notas.filter(nota => nota.disciplina === disciplina);
    const frequenciasDisciplina = frequencias.filter(frequencia => frequencia.disciplina === disciplina);
    const resultadosBimestres = bimestres.map(bimestre => {
      const notasBimestre = notasDisciplina.filter(nota => nota.bimestre.startsWith(bimestre[0]));
      let nota = notasBimestre.length > 0 ? notasBimestre.reduce((soma, item) => soma + (item.valor || 0), 0) : null;
      const numeroBimestre = parseInt(bimestre[0]);
      const limite = numeroBimestre <= 2 ? 20 : 30;
      if (nota !== null && nota > limite) nota = limite;
      const faltas = frequenciasDisciplina.filter(frequencia =>
        (frequencia.status === 'F' || frequencia.status === 'Ausente') && getBimestrePorData(frequencia.data).startsWith(bimestre[0])
      ).length;
      return { bimestre, nota, faltas };
    });
    const total = resultadosBimestres.reduce((soma, item) => soma + (item.nota ?? 0), 0);
    const faltas = resultadosBimestres.reduce((soma, item) => soma + item.faltas, 0);
    return { disciplina, resultadosBimestres, total, faltas };
  });
  return (
                        <React.Fragment key={`${disc}-${bim}`}>
                          <td className="border-r border-black px-1 py-0.5 text-center font-medium">
                            {!isEmpty && somaBim !== null ? somaBim.toFixed(1) : ''}
                          </td>
                          <td className="border-r border-black px-1 py-0.5 text-center text-slate-500">
                            {!isEmpty && faltasBim > 0 ? faltasBim : ''}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="border-r border-black px-1 py-0.5 text-center"></td>
                    <td className="border-r border-black px-1 py-0.5 text-center font-black">
                      {!isEmpty && bimestresComNota > 0 ? somaMedias.toFixed(1) : ''}
                    </td>
                    <td className="px-1 py-0.5 text-center text-[8px] font-bold">
                      {!isEmpty && bimestresComNota >= 4 ? (somaMedias >= 50 ? 'APROVADO' : 'EXAME') : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Rodapé da Tabela com Total de Faltas */}
          <div className="flex border-t border-black">
            <div className="flex-1 bg-slate-50 print:bg-transparent"></div>
            <div className="border-l border-black p-1.5 w-44 bg-white">
              <p className="text-[7px] font-bold uppercase leading-none mb-1 text-slate-500">Total de Faltas</p>
              <p className="text-[11px] font-black leading-none text-right pr-2">
                {frequencias.filter(f => f.status === 'F' || f.status === 'Ausente').length}
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do Boletim - Assinaturas */}
        <div className="mt-16 grid grid-cols-2 gap-12">
          <div className="text-center pt-2 border-t border-black">
            <p className="text-[8px] font-bold uppercase mb-0.5">{alunoData.escola_diretor || 'DIRETOR(A)'}</p>
            <p className="text-[7px] text-slate-500 uppercase">DIRETOR(A)</p>
          </div>
          <div className="text-center pt-2 border-t border-black">
            <p className="text-[8px] font-bold uppercase mb-0.5">{alunoData.escola_secretario || 'SECRETÁRIO(A)'}</p>
            <p className="text-[7px] text-slate-500 uppercase">SECRETÁRIO(A) ESCOLAR</p>
          </div>
        </div>

        <div className="mt-8 text-[7px] text-slate-400 italic text-center">
          Documento gerado eletronicamente pelo Sistema Diário Digital em {new Date().toLocaleString('pt-BR')}.
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #boletim-view, #boletim-view * { visibility: visible; }
          #boletim-view { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            border: none !important;
            padding: 0 !important;
          }
          .no-print, .boletim-mobile-view { display: none !important; }
          #boletim-view { display: block !important; }
        }
      `}} />
    </div>
  );
}
