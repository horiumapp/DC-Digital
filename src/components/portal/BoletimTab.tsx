import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { getBimestrePorData } from '../../utils/dateUtils';
import BoletimDocumento, { AlunoBoletimData, NotaBoletimItem, FrequenciaBoletimItem } from '../boletim/BoletimDocumento';

export type AlunoData = AlunoBoletimData;
export type NotaItem = NotaBoletimItem;
export type FrequenciaItem = FrequenciaBoletimItem;

interface BoletimTabProps {
  alunoData: AlunoData;
  notas: NotaItem[];
  frequencias: FrequenciaItem[];
}

function navegadorSemPreviaDeImpressao() {
  if (typeof navigator === 'undefined') return false;
  return /Electron|Cursor/i.test(navigator.userAgent);
}

export default function BoletimTab({ alunoData, notas, frequencias }: BoletimTabProps) {
  const bimestres = ['1º', '2º', '3º', '4º'];
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [erroPdf, setErroPdf] = useState('');
  const previaIndisponivel = navegadorSemPreviaDeImpressao();

  // Agrupar disciplinas únicas para a visão mobile
  const disciplinas = Array.from(new Set([
    ...notas.map(n => n.disciplina),
    ...frequencias.map(f => f.disciplina)
  ])).filter(d => d && d !== 'N/D').sort();

  const salvarPdf = async () => {
    const elemento = document.getElementById('boletim-view');
    if (!elemento) {
      setErroPdf('O boletim ainda não está pronto para salvar.');
      return;
    }
    setGerandoPdf(true);
    setErroPdf('');
    const host = elemento.parentElement;
    host?.classList.add('boletim-captura');
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const largura = pdf.internal.pageSize.getWidth();
      const alturaPagina = pdf.internal.pageSize.getHeight();
      const alturaImagem = (canvas.height * largura) / canvas.width;
      const imagem = canvas.toDataURL('image/jpeg', 0.95);
      let restante = alturaImagem;
      let posicao = 0;
      pdf.addImage(imagem, 'JPEG', 0, posicao, largura, alturaImagem);
      restante -= alturaPagina;
      while (restante > 0) {
        posicao = restante - alturaImagem;
        pdf.addPage();
        pdf.addImage(imagem, 'JPEG', 0, posicao, largura, alturaImagem);
        restante -= alturaPagina;
      }
      const nomeArquivo = (alunoData.nome || 'Aluno').replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim();
      pdf.save(`Boletim-${nomeArquivo}.pdf`);
    } catch {
      setErroPdf('Não foi possível gerar o PDF. Tente de novo.');
    } finally {
      host?.classList.remove('boletim-captura');
      setGerandoPdf(false);
    }
  };

  const handlePrint = () => {
    if (previaIndisponivel) {
      void salvarPdf();
      return;
    }
    window.print();
  };

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
          type="button"
          onClick={() => void salvarPdf()}
          disabled={gerandoPdf}
          className="flex items-center gap-2 px-4 py-2 bg-[#6354c7] border border-[#6354c7] rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all shadow-sm cursor-pointer disabled:opacity-60"
        >
          <Download className="w-4 h-4" /> {gerandoPdf ? 'Gerando PDF…' : 'Salvar PDF'}
        </button>
        {!previaIndisponivel && (
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Imprimir Boletim
          </button>
        )}
      </div>
      {erroPdf && <p className="text-sm font-semibold text-rose-700 no-print">{erroPdf}</p>}

      <section className="boletim-mobile-view md:hidden space-y-4" aria-label="Boletim resumido">
        <div className="rounded-2xl bg-[#6354c7] p-5 text-white shadow-sm">
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
                <span className="shrink-0 rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-[#6354c7]">Total {resumo.total > 0 ? resumo.total.toFixed(1) : '—'}</span>
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

      <div className="boletim-oficial-host">
        <BoletimDocumento
          id="boletim-view"
          alunoData={alunoData}
          notas={notas}
          frequencias={frequencias}
        />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .boletim-oficial-host { display: none; }
        @media (min-width: 768px) {
          .boletim-oficial-host { display: block; }
        }
        .boletim-captura {
          display: block !important;
          position: absolute;
          left: 0;
          top: 0;
          width: 210mm;
          z-index: 0;
        }
        @media print {
          body * { visibility: hidden; }
          .boletim-oficial-host, .boletim-oficial-host * { visibility: visible; }
          .boletim-oficial-host { display: block !important; position: absolute; left: 0; top: 0; width: 100%; }
          #boletim-view { 
            position: relative; 
            left: 0; 
            top: 0; 
            width: 100%;
            border: none !important;
            padding: 0 !important;
            display: block !important;
          }
          .no-print, .boletim-mobile-view { display: none !important; }
        }
      `}} />
    </div>
  );
}
