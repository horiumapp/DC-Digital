import { describe, it, expect } from 'vitest';
import { getBimestrePorData, getDayOfWeek, formatarDataParaISO, formatarDataParaExibicao } from '../utils/dateUtils';
import { getPeriodoPorData } from '../config/appConfig';

describe('Utilitários de Data (dateUtils.ts)', () => {
  it('deve formatar data para formato ISO YYYY-MM-DD', () => {
    expect(formatarDataParaISO('30/05/2026')).toBe('2026-05-30');
    expect(formatarDataParaISO('2026-05-30')).toBe('2026-05-30');
    expect(formatarDataParaISO('')).toBe('');
  });

  it('deve formatar data para formato exibição brasileiro DD/MM/YYYY', () => {
    expect(formatarDataParaExibicao('2026-05-30')).toBe('30/05/2026');
    expect(formatarDataParaExibicao('30/05/2026')).toBe('30/05/2026');
    expect(formatarDataParaExibicao('')).toBe('');
  });

  it('deve obter o bimestre correto a partir de datas no formato ISO ou brasileiro', () => {
    // 1º Bimestre: 2026-02-05 a 2026-04-23
    expect(getBimestrePorData('2026-03-10')).toBe('1º Bimestre');
    expect(getBimestrePorData('10/03/2026')).toBe('1º Bimestre');
    
    // 2º Bimestre: 2026-04-24 a 2026-07-07
    expect(getBimestrePorData('2026-05-15')).toBe('2º Bimestre');
    expect(getBimestrePorData('15/05/2026')).toBe('2º Bimestre');
  });

  it('deve retornar o dia da semana correto', () => {
    // 30/05/2026 é Sábado (6)
    expect(getDayOfWeek('30/05/2026')).toBe(6);
    expect(getDayOfWeek('2026-05-30')).toBe(6);
  });
});

describe('Configuração do Período Letivo (appConfig.ts)', () => {
  it('deve encontrar período por data sem bug de timezone (fuso horário local)', () => {
    // getPeriodoPorData com string deve interpretar a data no horário local brasileiro
    const periodo = getPeriodoPorData('2026-04-23'); // Fim do 1º Bimestre
    expect(periodo).toBeDefined();
    expect(periodo?.id).toBe('1. BIMESTRE');
    
    const periodo2 = getPeriodoPorData('2026-04-24'); // Início do 2º Bimestre
    expect(periodo2).toBeDefined();
    expect(periodo2?.id).toBe('2. BIMESTRE');
  });
});
