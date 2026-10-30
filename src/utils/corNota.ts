export const COR_NOTA_AZUL = '#4361ee';
export const COR_NOTA_VERMELHO = '#c2463e';

export function maximoDaAvaliacao(avaliacao?: { valorMaximo?: number } | null) {
  const valor = Number(avaliacao?.valorMaximo);
  return Number.isFinite(valor) && valor > 0 ? valor : 10;
}

export function limitePontosBimestre(bimestre: number | string) {
  const texto = String(bimestre);
  const numero = parseInt(texto, 10);
  if (numero === 3 || numero === 4 || texto.includes('3') || texto.includes('4')) return 30;
  return 20;
}

export function notaAtingeMedia(valor: number, maximo: number) {
  return valor >= maximo / 2;
}

export function classeElipseNota(valor: number, maximo: number) {
  return notaAtingeMedia(valor, maximo)
    ? 'bg-[#4361ee] shadow-blue-200/50'
    : 'bg-[#c2463e] shadow-red-200/50';
}

export function classeTextoNota(valor: number, maximo: number) {
  if (!Number.isFinite(valor)) return 'text-slate-400';
  return notaAtingeMedia(valor, maximo) ? 'text-[#4361ee]' : 'text-[#c2463e]';
}

export function corNota(valor: number, maximo: number) {
  return notaAtingeMedia(valor, maximo) ? COR_NOTA_AZUL : COR_NOTA_VERMELHO;
}
