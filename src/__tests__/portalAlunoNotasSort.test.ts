import { describe, it, expect } from 'vitest';

interface NotaItem {
  disciplina: string;
  tipo: string;
  valor: number;
  valor_maximo: number;
  bimestre: string;
}

const getBimestreNum = (bimestreStr: string): number => {
  const match = String(bimestreStr || '').match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 99;
};

const getPesoTipo = (tipo: string): number => {
  const t = String(tipo || '').toUpperCase().trim();

  let avNum = 0;
  const avMatch = t.match(/AV\s*0*(\d+)/i);
  if (avMatch) {
    avNum = parseInt(avMatch[1], 10);
  } else {
    const isSecondCall = t.includes('2CH') || t.includes('CH') || t.includes('CHAMADA');
    if (!isSecondCall) {
      const numMatch = t.match(/(\d+)/);
      if (numMatch) avNum = parseInt(numMatch[1], 10);
    }
  }

  let subOrdem = 4;
  if (t.startsWith('AV')) {
    subOrdem = 1;
  } else if (t.includes('2CH') || t.includes('CH') || t.includes('CHAMADA')) {
    subOrdem = 2;
  } else if (t.startsWith('RP') || t.includes('RECUPERA')) {
    subOrdem = 3;
  }

  if (avNum > 0) {
    return avNum * 10 + subOrdem;
  }

  return 900 + subOrdem;
};

const ordenarNotas = (notas: NotaItem[]): NotaItem[] => {
  return [...notas].sort((a, b) => {
    const bimA = getBimestreNum(a.bimestre);
    const bimB = getBimestreNum(b.bimestre);
    if (bimA !== bimB) {
      return bimA - bimB;
    }
    return getPesoTipo(a.tipo) - getPesoTipo(b.tipo);
  });
};

describe('PortalAluno — Ordenação de Notas por Bimestre', () => {
  it('ordena notas por bimestre (1º, 2º, 3º, 4º) e depois por tipo de avaliação', () => {
    const notasDesordenadas: NotaItem[] = [
      { disciplina: 'Matemática', tipo: 'AV01', valor: 4.9, valor_maximo: 10, bimestre: '3º Bimestre' },
      { disciplina: 'Matemática', tipo: 'RP01', valor: 4.5, valor_maximo: 10, bimestre: '3º Bimestre' },
      { disciplina: 'Matemática', tipo: 'AV02', valor: 6.0, valor_maximo: 10, bimestre: '3º Bimestre' },
      { disciplina: 'Matemática', tipo: 'AV01', valor: 6.0, valor_maximo: 10, bimestre: '1º Bimestre' },
      { disciplina: 'Matemática', tipo: 'AV02', valor: 3.0, valor_maximo: 5, bimestre: '1º Bimestre' },
      { disciplina: 'Matemática', tipo: 'AV03', valor: 3.0, valor_maximo: 5, bimestre: '1º Bimestre' },
    ];

    const resultado = ordenarNotas(notasDesordenadas);

    expect(resultado.map(n => `${n.tipo} - ${n.bimestre}`)).toEqual([
      'AV01 - 1º Bimestre',
      'AV02 - 1º Bimestre',
      'AV03 - 1º Bimestre',
      'AV01 - 3º Bimestre',
      'RP01 - 3º Bimestre',
      'AV02 - 3º Bimestre',
    ]);
  });

  it('posiciona 2ª Chamada (2ª CH) e RP após a avaliação original dentro do mesmo bimestre', () => {
    const notas: NotaItem[] = [
      { disciplina: 'História', tipo: 'RP01', valor: 5.0, valor_maximo: 10, bimestre: '2º Bimestre' },
      { disciplina: 'História', tipo: 'AV01', valor: 4.0, valor_maximo: 10, bimestre: '2º Bimestre' },
      { disciplina: 'História', tipo: '2ª CH (AV01)', valor: 7.0, valor_maximo: 10, bimestre: '2º Bimestre' },
      { disciplina: 'História', tipo: 'AV02', valor: 8.0, valor_maximo: 10, bimestre: '2º Bimestre' },
      { disciplina: 'História', tipo: 'AV01', valor: 8.0, valor_maximo: 10, bimestre: '1º Bimestre' },
    ];

    const resultado = ordenarNotas(notas);

    expect(resultado.map(n => `${n.tipo} - ${n.bimestre}`)).toEqual([
      'AV01 - 1º Bimestre',
      'AV01 - 2º Bimestre',
      '2ª CH (AV01) - 2º Bimestre',
      'RP01 - 2º Bimestre',
      'AV02 - 2º Bimestre',
    ]);
  });
});
