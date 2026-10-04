// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import BoletimDocumento, { AlunoBoletimData } from '../components/boletim/BoletimDocumento';
import { isNomeValido, obterEquipeEscolar } from '../utils/escolaUtils';
import { STAFF_ROLES, ADMIN_ROLES } from '../constants/authConstants';

const alunoExemplo1: AlunoBoletimData = {
  id: 'aluno-1',
  nome: 'ANA CLARA SOUZA',
  escola_nome: 'E.M. FRANCISCA GOMES MENDES',
  escola_inep: '12345678',
  escola_diretor: 'FRANCISCO LOPES DE OLIVEIRA',
  escola_secretario: 'MARIA DA SILVA SECRETARIA',
  escola_endereco: 'CENTRO',
  turma_nome: '1º ANO A',
  turma_turno: 'MANHÃ',
  turma_ano: '2026',
  matricula: '123.456.789-01',
  data_nascimento: '15/03/2018',
  nome_responsavel: 'Fernanda Souza',
  endereco: 'Rua das Flores, 123',
  sexo: 'F',
  numero_aluno: 1,
  ensino_modalidade: 'ENSINO FUNDAMENTAL I (EF1) 1º AO 5º ANO',
};

const alunoExemplo2: AlunoBoletimData = {
  id: 'aluno-2',
  nome: 'BRUNO CARVALHO LIMA',
  escola_nome: 'E.M. FRANCISCA GOMES MENDES',
  escola_inep: '12345678',
  escola_diretor: 'FRANCISCO LOPES DE OLIVEIRA',
  escola_secretario: 'MARIA DA SILVA SECRETARIA',
  escola_endereco: 'CENTRO',
  turma_nome: '1º ANO A',
  turma_turno: 'MANHÃ',
  turma_ano: '2026',
  matricula: '987.654.321-02',
  data_nascimento: '20/07/2018',
  nome_responsavel: 'Carlos Lima',
  endereco: 'Av. Brasil, 456',
  sexo: 'M',
  numero_aluno: 2,
  ensino_modalidade: 'ENSINO FUNDAMENTAL I (EF1) 1º AO 5º ANO',
};

describe('BoletimDocumento e Impressão para Secretário Escolar', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('deve renderizar o boletim individual completo com SEMED, Diretor e Secretário', () => {
    render(
      <BoletimDocumento
        alunoData={alunoExemplo1}
        notas={[
          { disciplina: 'Matemática', tipo: 'AV1', valor: 8.5, valor_maximo: 10, bimestre: '1º' },
          { disciplina: 'Língua Portuguesa', tipo: 'AV1', valor: 9.0, valor_maximo: 10, bimestre: '1º' },
        ]}
        frequencias={[
          { data: '2026-03-10', disciplina: 'Matemática', status: 'P', participacao: 'Presencial' },
          { data: '2026-03-11', disciplina: 'Matemática', status: 'F', participacao: 'Presencial' },
        ]}
      />
    );

    // Identificação do aluno
    expect(screen.getByText('ANA CLARA SOUZA')).toBeTruthy();
    expect(screen.getByText('123.456.789-01')).toBeTruthy();
    expect(screen.getByText('E.M. FRANCISCA GOMES MENDES')).toBeTruthy();

    // SEMED
    expect(screen.getByText('SEMED')).toBeTruthy();
    expect(screen.getByText(/Secretaria Municipal de Educação/i)).toBeTruthy();

    // Equipe escolar
    expect(screen.getAllByText('FRANCISCO LOPES DE OLIVEIRA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('MARIA DA SILVA SECRETARIA').length).toBeGreaterThan(0);

    // Disciplinas
    expect(screen.getByText('Matemática')).toBeTruthy();
    expect(screen.getByText('Língua Portuguesa')).toBeTruthy();
  });

  it('deve aplicar a classe boletim-page quando pageBreak=true (impressão em lote)', () => {
    const { container } = render(
      <div>
        <BoletimDocumento alunoData={alunoExemplo1} notas={[]} frequencias={[]} pageBreak={true} />
        <BoletimDocumento alunoData={alunoExemplo2} notas={[]} frequencias={[]} pageBreak={true} />
      </div>
    );

    const pages = container.querySelectorAll('.boletim-page');
    expect(pages.length).toBe(2);
  });

  it('não deve aplicar a classe boletim-page quando pageBreak=false (impressão avulsa)', () => {
    const { container } = render(
      <BoletimDocumento alunoData={alunoExemplo1} notas={[]} frequencias={[]} pageBreak={false} />
    );

    const pages = container.querySelectorAll('.boletim-page');
    expect(pages.length).toBe(0);
  });

  it('isNomeValido deve rejeitar placeholders comuns e aceitar nomes reais', () => {
    expect(isNomeValido('')).toBe(false);
    expect(isNomeValido(null)).toBe(false);
    expect(isNomeValido('Não localizado')).toBe(false);
    expect(isNomeValido('nao informado')).toBe(false);
    expect(isNomeValido('n/d')).toBe(false);
    expect(isNomeValido('---')).toBe(false);
    expect(isNomeValido('secretario n/d')).toBe(false);
    expect(isNomeValido('MARIA DA SILVA')).toBe(true);
    expect(isNomeValido('João Pereira Secretário')).toBe(true);
  });

  it('obterEquipeEscolar deve priorizar usuários ativos cadastrados no Supabase', async () => {
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { nome_completo: 'PAULO DIRETOR ATIVO', cargo: 'GESTOR' },
            { nome_completo: 'LUCIA SECRETARIA ATIVA', cargo: 'SECRETARIO' },
          ],
          error: null,
        }),
      }),
      rpc: vi.fn(),
    };

    const equipe = await obterEquipeEscolar(
      mockSupabase,
      'escola-1',
      'Diretor Legado',
      'Secretario Legado'
    );

    expect(equipe.diretorNome).toBe('PAULO DIRETOR ATIVO');
    expect(equipe.secretarioNome).toBe('LUCIA SECRETARIA ATIVA');
  });

  it('SECRETARIO, GESTOR e ADMIN devem estar autorizados em STAFF_ROLES e ADMIN_ROLES', () => {
    expect(STAFF_ROLES.includes('SECRETARIO')).toBe(true);
    expect(STAFF_ROLES.includes('GESTOR')).toBe(true);
    expect(STAFF_ROLES.includes('ADMIN')).toBe(true);

    expect(ADMIN_ROLES.includes('SECRETARIO')).toBe(true);
    expect(ADMIN_ROLES.includes('GESTOR')).toBe(true);
    expect(ADMIN_ROLES.includes('ADMIN')).toBe(true);

    // Aluno não deve estar em nenhuma dessas roles
    expect(STAFF_ROLES.includes('ALUNO' as any)).toBe(false);
    expect(ADMIN_ROLES.includes('ALUNO' as any)).toBe(false);
  });
});
