import React from 'react';
import { Printer, Download, MapPin, Phone, User, Calendar, Hash, School } from 'lucide-react';
import { getBimestrePorData } from '../../utils/dateUtils';

interface AlunoData {
  id: string;
  nome: string;
  escola_nome: string;
  escola_inep: string;
  escola_diretor: string;
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

      <div className="bg-white border border-slate-300 p-8 shadow-sm max-w-[21cm] mx-auto print:shadow-none print:border-none print:p-0 print:m-0" id="boletim-view">
        {/* Header Documento Oficial */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-24 h-24 flex items-center justify-center">
                <img 
                  src="/semed.png" 
                  alt="SEMED Logo" 
                  className="w-full h-full object-contain" 
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const parent = e.currentTarget.parentElement;
                    if (parent) {
                      parent.innerHTML = '<span class="text-[8px] font-bold text-center border border-black p-2">LOGO</span>';
                    }
                  }} 
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-black uppercase leading-tight">SEMED</h2>
                <h3 className="text-xs font-bold uppercase leading-tight text-slate-700">Secretaria Municipal de Educação Lábrea - AM</h3>
              </div>
            </div>
            <div className="text-[10px] space-y-0.5 text-right flex-1 border-l border-black pl-4">
              <p><strong>ESCOLA:</strong> {alunoData.escola_nome}</p>
              <p><strong>ENDEREÇO:</strong> {alunoData.escola_endereco}</p>
              <p><strong>DIRETOR(A):</strong> {alunoData.escola_diretor}</p>
              <p><strong>DATA EMISSÃO:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>
        </div>

        <div className="text-center border-y border-black py-1.5 mb-6 bg-slate-50 print:bg-transparent">
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">Boletim Individual</h1>
        </div>

        {/* Informações Aluno - Layout Novo */}
        <div className="border-t border-l border-black text-[9px] mb-6">
          {/* Linha 1 */}
          <div className="flex w-full">
            <div className="border-r border-b border-black p-1.5 w-[20%]">
              <p className="font-bold text-[7px] text-slate-500 uppercase">Matrícula</p>
              <p className="font-black text-[11px]">{alunoData.matricula}</p>
            </div>
            <div className="border-r border-b border-black p-1.5 w-[10%] text-center">
              <p className="font-bold text-[7px] text-slate-500 uppercase">Nº Aluno</p>
              <p className="font-black text-[11px]">{alunoData.numero_aluno || '---'}</p>
            </div>
            <div className="border-r border-b border-black p-1.5 flex-1">
              <p className="font-bold text-[7px] text-slate-500 uppercase">Nome do Aluno</p>
              <p className="font-black text-[11px] uppercase">{alunoData.nome}</p>
            </div>
          </div>
          
          {/* Linha 2 */}
          <div className="flex w-full">
            <div className="border-r border-b border-black p-1.5 w-[40%]">
              <p className="font-bold text-[7px] text-slate-500 uppercase">Ensino / Modalidade</p>
              <p className="font-black">{alunoData.ensino_modalidade}</p>
            </div>
            <div className="border-r border-b border-black p-1.5 w-[15%] text-center">
              <p className="font-bold text-[7px] text-slate-500 uppercase">Ano Letivo</p>
              <p className="font-black">{alunoData.turma_ano}</p>
            </div>
            <div className="border-r border-b border-black p-1.5 w-[15%] text-center">
              <p className="font-bold text-[7px] text-slate-500 uppercase">Série</p>
              <p className="font-black">{serie}</p>
            </div>
            <div className="border-r border-b border-black p-1.5 w-[10%] text-center">
              <p className="font-bold text-[7px] text-slate-500 uppercase">Turma</p>
              <p className="font-black">{turmaLetra}</p>
            </div>
            <div className="border-r border-b border-black p-1.5 w-[20%] text-center">
              <p className="font-bold text-[7px] text-slate-500 uppercase">Turno</p>
              <p className="font-black uppercase">{alunoData.turma_turno}</p>
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
                <th rowSpan={2} className="border-r border-black p-1 text-center uppercase w-14">Média Final</th>
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
              {disciplinas.map((disc, idx) => {
                const notasDisc = notas.filter(n => n.disciplina === disc);
                const freqDisc = frequencias.filter(f => f.disciplina === disc);
                
                let somaMedias = 0;
                let bimestresComNota = 0;

                return (
                  <tr key={disc} className="border-b border-black last:border-0">
                    <td className="border-r border-black px-2 py-1.5 font-bold uppercase">{disc}</td>
                    <td className="border-r border-black px-1 py-1.5 text-center text-slate-400">---</td>
                    {bimestres.map(bim => {
                      // Calcular nota do bimestre (média das avaliações do bimestre)
                      const notasBim = notasDisc.filter(n => n.bimestre.startsWith(bim[0]));
                      const mediaBim = notasBim.length > 0 
                        ? notasBim.reduce((s, n) => s + (n.valor || 0), 0) / notasBim.length
                        : null;
                      
                      if (mediaBim !== null) {
                        somaMedias += mediaBim;
                        bimestresComNota++;
                      }

                      // Calcular faltas do bimestre
                      const faltasBim = freqDisc.filter(f => 
                        (f.status === 'F' || f.status === 'Ausente') && 
                        getBimestrePorData(f.data).startsWith(bim[0])
                      ).length;

                      return (
                        <React.Fragment key={`${disc}-${bim}`}>
                          <td className="border-r border-black px-1 py-1.5 text-center font-medium">
                            {mediaBim !== null ? mediaBim.toFixed(1) : ''}
                          </td>
                          <td className="border-r border-black px-1 py-1.5 text-center text-slate-500">
                            {faltasBim > 0 ? faltasBim : ''}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="border-r border-black px-1 py-1.5 text-center"></td>
                    <td className="border-r border-black px-1 py-1.5 text-center font-black">
                      {bimestresComNota > 0 ? (somaMedias / bimestresComNota).toFixed(1) : ''}
                    </td>
                    <td className="px-1 py-1.5 text-center text-[8px] font-bold">
                      {bimestresComNota >= 4 ? (somaMedias / 4 >= 6 ? 'APROVADO' : 'EXAME') : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rodapé do Boletim */}
        <div className="mt-12 grid grid-cols-2 gap-12">
          <div className="text-center pt-2 border-t border-black">
            <p className="text-[8px] font-bold uppercase">{alunoData.escola_diretor || 'DIRETOR(A)'}</p>
            <p className="text-[7px] text-slate-500">DIRETOR(A)</p>
          </div>
          <div className="text-center pt-2 border-t border-black">
            <p className="text-[8px] font-bold uppercase">SECRETÁRIO(A)</p>
            <p className="text-[7px] text-slate-500">SECRETÁRIO(A) ESCOLAR</p>
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
          .no-print { display: none !important; }
        }
      `}} />
    </div>
  );
}
