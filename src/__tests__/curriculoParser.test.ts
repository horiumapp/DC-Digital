import { describe, it, expect } from 'vitest';
import {
  parseCurriculoText,
  normalizeDisciplina,
  normalizeAno,
  normalizeBimestre,
  getModalidadeForAno,
  cleanContentText
} from '../utils/curriculoParser';

describe('curriculoParser', () => {
  describe('Funções utilitárias de normalização', () => {
    it('deve normalizar nomes de disciplinas corretamente', () => {
      expect(normalizeDisciplina('PORTUGUÊS 6º ANO')).toBe('Português');
      expect(normalizeDisciplina('MATEMÁTICA')).toBe('Matemática');
      expect(normalizeDisciplina('HISTÓRIA')).toBe('História');
      expect(normalizeDisciplina('GEOGRAFIA º ANO')).toBe('Geografia');
      expect(normalizeDisciplina('CIÊNCIAS 7º ANO')).toBe('Ciências');
      expect(normalizeDisciplina('EDUCAÇÃO FÍSICA 6º ANO')).toBe('Educação Física');
      expect(normalizeDisciplina('ENSINO RELIGIOSO')).toBe('Ensino Religioso');
      expect(normalizeDisciplina('ESPANHOL 6º ANO')).toBe('Espanhol');
      expect(normalizeDisciplina('INGLÊS')).toBe('Inglês');
      expect(normalizeDisciplina('ARTES 6º ANO')).toBe('Artes');
    });

    it('deve normalizar anos e bimestres', () => {
      expect(normalizeAno('6')).toBe('6º Ano');
      expect(normalizeAno('1º ANO')).toBe('1º Ano');
      expect(normalizeBimestre('1')).toBe('1º Bimestre');
      expect(normalizeBimestre('2º BIMESTRE')).toBe('2º Bimestre');
    });

    it('deve identificar modalidades pelos anos', () => {
      expect(getModalidadeForAno('1º Ano')).toBe('Fundamental Anos Iniciais (1° ao 5° ANO)');
      expect(getModalidadeForAno('5º Ano')).toBe('Fundamental Anos Iniciais (1° ao 5° ANO)');
      expect(getModalidadeForAno('6º Ano')).toBe('Fundamental Anos Finais (6° ao 9° ANO)');
      expect(getModalidadeForAno('9º Ano')).toBe('Fundamental Anos Finais (6° ao 9° ANO)');
    });

    it('deve limpar textos de conteúdos', () => {
      expect(cleanContentText('- O que é Geografia?')).toBe('O que é Geografia?');
      expect(cleanContentText('  1. O que é Geografia?')).toBe('O que é Geografia?');
      expect(cleanContentText('• Paisagem e lugar')).toBe('Paisagem e lugar');
      expect(cleanContentText('– Minha história e minha identidade')).toBe('Minha história e minha identidade');
    });
  });

  describe('parseCurriculoText com formato linha a linha (CSV/TSV)', () => {
    it('deve processar CSV com cabeçalhos padrão', () => {
      const csv = `Ano;Disciplina;Bimestre;Conteúdo
6º Ano;Matemática;1º Bimestre;Sistema de numeração decimal
6º Ano;Matemática;1º Bimestre;Operações com números naturais
6º Ano;Português;1º Bimestre;Gêneros textuais
6º Ano;Português;2º Bimestre;Substantivos e adjetivos`;

      const result = parseCurriculoText(csv);
      expect(result.records.length).toBe(3);
      expect(result.totalObjetos).toBe(4);
      expect(result.anosEncontrados).toEqual(['6º Ano']);
      expect(result.disciplinasEncontradas).toContain('Matemática');
      expect(result.disciplinasEncontradas).toContain('Português');

      const mat1 = result.records.find(r => r.disciplina === 'Matemática' && r.bimestre === '1º Bimestre');
      expect(mat1).toBeDefined();
      expect(mat1?.objetos).toEqual([
        'Sistema de numeração decimal',
        'Operações com números naturais'
      ]);
    });
  });

  describe('parseCurriculoText com formato matriz tabulada', () => {
    it('deve processar formato matriz com cabeçalhos de disciplinas e bimestres', () => {
      const matrix = [
        'GEOGRAFIA 6º ANO\tHISTÓRIA 6º ANO\tMATEMÁTICA 6º ANO\tPORTUGUÊS 6º ANO',
        '1º BIMESTRE\t1º BIMESTRE\t1º BIMESTRE\t1º BIMESTRE',
        'O que é Geografia?\tO que é História?\tNúmeros naturais\tGêneros textuais',
        'Espaço e paisagem\tFontes históricas\tOperações fundamentais\tInterpretação de texto',
        '2º BIMESTRE\t2º BIMESTRE\t2º BIMESTRE\t2º BIMESTRE',
        'Clima e relevo\tIdade Antiga\tFrações\tClasses gramaticais'
      ].join('\n');

      const result = parseCurriculoText(matrix);
      expect(result.records.length).toBe(8); // 4 disciplinas x 2 bimestres
      expect(result.totalObjetos).toBe(12); // (2+1)*4 = 12
      expect(result.anosEncontrados).toEqual(['6º Ano']);
      expect(result.bimestresEncontrados).toEqual(['1º Bimestre', '2º Bimestre']);

      const geo1 = result.records.find(r => r.disciplina === 'Geografia' && r.bimestre === '1º Bimestre');
      expect(geo1?.objetos).toEqual(['O que é Geografia?', 'Espaço e paisagem']);
    });

    it('deve retornar vazio com aviso quando texto não contiver dados válidos', () => {
      const result = parseCurriculoText('');
      expect(result.records.length).toBe(0);
      expect(result.avisos.length).toBeGreaterThan(0);
    });
  });
});
