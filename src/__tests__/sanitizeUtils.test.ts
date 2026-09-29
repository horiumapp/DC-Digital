import { describe, it, expect } from 'vitest';
import { sanitizeFormulaValue } from '../utils/sanitizeUtils';

describe('sanitizeFormulaValue — Prevenção de CSV / Formula Injection (SEC-05 / Issue 4)', () => {
  it('deve manter strings normais, números e booleanos inalterados', () => {
    expect(sanitizeFormulaValue('João da Silva')).toBe('João da Silva');
    expect(sanitizeFormulaValue('123.456.789-00')).toBe('123.456.789-00');
    expect(sanitizeFormulaValue(100)).toBe(100);
    expect(sanitizeFormulaValue(true)).toBe(true);
    expect(sanitizeFormulaValue(null)).toBe(null);
    expect(sanitizeFormulaValue(undefined)).toBe(undefined);
  });

  it('deve prefixar com apóstrofo strings que iniciam com caracteres de controle de fórmulas', () => {
    expect(sanitizeFormulaValue('=CMD("calc.exe")')).toBe('\'=CMD("calc.exe")');
    expect(sanitizeFormulaValue('+SUM(A1:A10)')).toBe('\'+SUM(A1:A10)');
    expect(sanitizeFormulaValue('-2+3+cmd|\' /C calc\'!A0')).toBe('\'-2+3+cmd|\' /C calc\'!A0');
    expect(sanitizeFormulaValue('@SUM(1,2)')).toBe('\'@SUM(1,2)');
    expect(sanitizeFormulaValue('\t=1+1')).toBe('\'\t=1+1');
    expect(sanitizeFormulaValue('\r=HYPERLINK("http://evil.com")')).toBe('\'\r=HYPERLINK("http://evil.com")');
  });

  it('deve sanitizar recursivamente elementos dentro de arrays', () => {
    const rawList = [
      'Normal text',
      '=1+1',
      '+100',
      'Outro texto',
      ['=ARRAY_FORMULA()', 'Safe inner text']
    ];

    const sanitized = sanitizeFormulaValue(rawList);
    expect(sanitized).toEqual([
      'Normal text',
      '\'=1+1',
      '\'+100',
      'Outro texto',
      ['\'=ARRAY_FORMULA()', 'Safe inner text']
    ]);
  });

  it('deve sanitizar recursivamente campos aninhados em objetos complexos', () => {
    const rawObject = {
      nome: '=DDE("server","topic","item")',
      email: 'usuario@escola.gov.br',
      detalhes: {
        observacao: '+Malicious observation',
        contatos: ['@admin_contact', 'normal_contact'],
      },
    };

    const sanitized = sanitizeFormulaValue(rawObject);
    expect(sanitized).toEqual({
      nome: '\'=DDE("server","topic","item")',
      email: 'usuario@escola.gov.br',
      detalhes: {
        observacao: '\'+Malicious observation',
        contatos: ['\'@admin_contact', 'normal_contact'],
      },
    });
  });

  it('deve proteger payload completo de exportação LGPD do Centro de Privacidade', () => {
    const rawLgpdExport = {
      sistema: 'Diário Digital',
      data_exportacao: '2026-08-28T16:00:00.000Z',
      versao_politica: '1.0',
      titular: {
        id: 'user-uuid-123',
        nome: '=cmd|\' /C notepad\'!A0',
        email: 'aluno@escola.local',
        perfil: 'Aluno',
        documento: '+12345678900',
        detalhes: {
          nome_responsavel: '@Responsavel Malicioso',
          endereco: 'Rua Principal, 100',
          disciplinas: ['-Matemática', 'Português'],
        },
      },
    };

    const sanitized = sanitizeFormulaValue(rawLgpdExport);

    expect(sanitized.titular.nome).toBe('\'=cmd|\' /C notepad\'!A0');
    expect(sanitized.titular.documento).toBe('\'+12345678900');
    expect(sanitized.titular.detalhes.nome_responsavel).toBe('\'@Responsavel Malicioso');
    expect(sanitized.titular.detalhes.endereco).toBe('Rua Principal, 100');
    expect(sanitized.titular.detalhes.disciplinas).toEqual(['\'-Matemática', 'Português']);
  });
});
