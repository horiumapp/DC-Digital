import { describe, it, expect } from 'vitest';
import { getBimestrePorData, getDayOfWeek, formatarDataParaISO, formatarDataParaExibicao, formatarDiaMes } from '../utils/dateUtils';
import { labelBimestreAtual, mesAtualRelatorio, escolherTurmaRelatorio, avaliacaoNoPeriodo } from '../utils/relatorioFiltro';
import { parentIdVinculado } from '../utils/parentId';
import { APP_CONFIG, getPeriodoPorData } from '../config/appConfig';

describe('Utilitários de Data (dateUtils.ts)', () => {
  it('deve formatar data para formato ISO YYYY-MM-DD', () => {
    expect(formatarDataParaISO('30/05/2026')).toBe('2026-05-30');
    expect(formatarDataParaISO('30-05-2026')).toBe('2026-05-30');
    expect(formatarDataParaISO('2026-05-30')).toBe('2026-05-30');
    expect(formatarDataParaISO('')).toBe('');
  });

  it('deve formatar data para formato exibição brasileiro DD/MM/YYYY', () => {
    expect(formatarDataParaExibicao('2026-05-30')).toBe('30/05/2026');
    expect(formatarDataParaExibicao('30/05/2026')).toBe('30/05/2026');
    expect(formatarDataParaExibicao('')).toBe('');
  });

  it('exibe os limites oficiais dos bimestres sem recuar um dia por fuso', () => {
    const bimestres = APP_CONFIG.PERIODOS.filter(p => p.id.includes('BIMESTRE'));
    const segundo = bimestres.find(p => p.id === '2. BIMESTRE')!;
    expect(formatarDataParaExibicao(segundo.dataInicio)).toBe('24/04/2026');
    expect(formatarDataParaExibicao(segundo.dataFim)).toBe('07/07/2026');
  });

  it('deve formatar data para formato dia/mês (DD/MM)', () => {
    expect(formatarDiaMes('2026-09-01')).toBe('01/09');
    expect(formatarDiaMes('2026-09-18')).toBe('18/09');
    expect(formatarDiaMes('01/09/2026')).toBe('01/09');
    expect(formatarDiaMes('5/3/2026')).toBe('05/03');
    expect(formatarDiaMes('')).toBe('');
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

describe('Vínculo de avaliação', () => {
  it('não transforma null do IndexedDB no texto null', () => {
    expect(parentIdVinculado(null)).toBeUndefined();
    expect(parentIdVinculado(undefined)).toBeUndefined();
    expect(parentIdVinculado('null')).toBeUndefined();
    expect(parentIdVinculado('')).toBeUndefined();
    expect(parentIdVinculado(42)).toBe('42');
    expect(parentIdVinculado('42')).toBe('42');
  });
});

describe('Filtro dos relatórios', () => {
  it('trata 4. BIMESTRE e 4º Bimestre como o mesmo período', () => {
    expect(avaliacaoNoPeriodo('4º Bimestre', '4. BIMESTRE')).toBe(true);
    expect(avaliacaoNoPeriodo('4. BIMESTRE', '4º Bimestre')).toBe(true);
    expect(avaliacaoNoPeriodo('1º Bimestre', '4. BIMESTRE')).toBe(false);
    expect(escolherTurmaRelatorio(
      [{ id: 'a', componente: 'Português' }, { id: 'b', componente: 'Matemática' }],
      { id: 'b||Matemática', componente: 'Matemática' },
    )).toBe('b|Matemática');
    expect(labelBimestreAtual()).toMatch(/BIMESTRE/);
    expect(['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']).toContain(mesAtualRelatorio());
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
