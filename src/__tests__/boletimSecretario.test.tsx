// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import BoletimTab from '../components/portal/BoletimTab';

const baseAlunoData = {
  id: 'aluno-1',
  nome: 'ANTONY GABRIEL NASCIMENTO NERY',
  escola_nome: 'E.M.FRANCISCA GOMES MENDES',
  escola_inep: '12345678',
  escola_diretor: 'FRANCISCO LOPES DE OLIVEIRA',
  escola_endereco: 'RUA IRMÃO JOSÉ MARTINEZ, SN',
  turma_nome: '1º ANO A',
  turma_turno: 'MANHÃ',
  turma_ano: '2026',
  matricula: '040.639.482-26',
  data_nascimento: '01/01/2018',
  nome_responsavel: 'Maria Nery',
  endereco: 'Rua Central, 100',
  sexo: 'M',
  numero_aluno: 1,
  ensino_modalidade: 'ENSINO FUNDAMENTAL I (EF1) 1º AO 5º ANO',
};

describe('BoletimTab - Exibição de Secretário(a) e Diretor(a)', () => {
  afterEach(() => {
    cleanup();
  });

  it('deve renderizar o nome do secretário na assinatura e no cabeçalho quando fornecido', () => {
    const alunoComSecretario = {
      ...baseAlunoData,
      escola_secretario: 'Vinicius',
    };

    render(
      <BoletimTab
        alunoData={alunoComSecretario}
        notas={[]}
        frequencias={[]}
      />
    );

    // No cabeçalho deve exibir o secretário
    expect(screen.getByText(/SECRETÁRIO\(A\):/i)).toBeTruthy();

    // No rodapé deve exibir o cargo do secretário e seu nome na assinatura
    expect(screen.getByText('SECRETÁRIO(A) ESCOLAR')).toBeTruthy();
    const secNameElements = screen.getAllByText('Vinicius');
    expect(secNameElements.length).toBe(2); // 1 no cabeçalho e 1 na assinatura

    // O diretor também deve estar visível no cabeçalho e na assinatura
    expect(screen.getAllByText('FRANCISCO LOPES DE OLIVEIRA').length).toBe(2);
    expect(screen.getByText('DIRETOR(A)')).toBeTruthy();
  });

  it('deve utilizar fallback SECRETÁRIO(A) na assinatura quando o secretário não for informado', () => {
    const alunoSemSecretario = {
      ...baseAlunoData,
      escola_secretario: '',
    };

    render(
      <BoletimTab
        alunoData={alunoSemSecretario}
        notas={[]}
        frequencias={[]}
      />
    );

    // Na assinatura do rodapé, quando não há nome, deve usar o fallback "SECRETÁRIO(A)"
    expect(screen.getByText('SECRETÁRIO(A) ESCOLAR')).toBeTruthy();
    expect(screen.getByText('SECRETÁRIO(A)')).toBeTruthy();

    // No cabeçalho, não deve exibir a linha SECRETÁRIO(A):
    expect(screen.queryByText(/SECRETÁRIO\(A\):/i)).toBeNull();
  });
});
