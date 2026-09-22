// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import AparataDetalhes from '../pages/AparataDetalhes';
import * as OfflineTurmaService from '../services/turmaServiceOffline';

const mockUseTurma = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../contexts/TurmaContext', () => ({
  useTurma: () => mockUseTurma(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../services/turmaServiceOffline', () => ({
  fetchAllFrequencias: vi.fn(),
}));

vi.mock('../components/common/TurmaHeaderInfo', () => ({
  default: () => <div data-testid="turma-header" />,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams('periodo=1. BIMESTRE')],
}));

const turmaAtiva = {
  id: 'turma-1',
  ensino: 'Fundamental',
  fase: '5º Ano A',
  componente: 'Matemática',
  professor: 'Professora Teste',
  escola: 'Escola Teste',
  turno: 'Matutino',
  metricas: { frequencia: 0, objetosMinistrados: 0, objetosPlanejados: 0, avaliacoesCadastradas: 0, avaliacoesPrevistas: 0, notasLancadas: 0, notasPrevistas: 0 },
  diasDeAula: [1],
  tempos: ['1'],
};

describe('AparataDetalhes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { role: 'PROFESSOR' } });
    mockUseTurma.mockReturnValue({
      turmaAtiva,
      alunos: [{ id: 'aluno-1', nome: 'Aluno Pendente', matricula: '123', freq: 'F', part: 'Presencial', notas: {} }],
      avaliacoes: [],
      lancamentos: [],
      fechamentos: {},
      salvarFechamento: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('inclui falta local pendente no total da Aparata, mesmo sem acesso ao Supabase', async () => {
    vi.mocked(OfflineTurmaService.fetchAllFrequencias).mockResolvedValue([
      {
        aluno_id: 'aluno-1',
        status: 'F',
        data: '2026-03-10',
        disciplina: 'Matemática',
        syncStatus: 'pending',
      } as Awaited<ReturnType<typeof OfflineTurmaService.fetchAllFrequencias>>[number],
      { aluno_id: 'aluno-fora', status: 'F', data: '2026-03-10', disciplina: 'Matemática' } as Awaited<ReturnType<typeof OfflineTurmaService.fetchAllFrequencias>>[number],
      { aluno_id: 'aluno-1', status: 'F', data: '2026-05-10', disciplina: 'Matemática' } as Awaited<ReturnType<typeof OfflineTurmaService.fetchAllFrequencias>>[number],
      { aluno_id: 'aluno-1', status: 'F', data: '2026-03-10', disciplina: 'Português' } as Awaited<ReturnType<typeof OfflineTurmaService.fetchAllFrequencias>>[number],
    ]);

    render(<AparataDetalhes />);

    await waitFor(() => {
      expect(OfflineTurmaService.fetchAllFrequencias).toHaveBeenCalledWith('turma-1', 'Matemática');
    });

    const row = screen.getByText('Aluno Pendente').closest('tr');
    expect(row?.textContent).toContain('1');
  });

  it('calcula corretamente somaParcial considerando nota de 2ª Chamada (2CH)', async () => {
    vi.mocked(OfflineTurmaService.fetchAllFrequencias).mockResolvedValue([]);

    mockUseTurma.mockReturnValue({
      turmaAtiva,
      alunos: [
        {
          id: 'aluno-1',
          nome: 'Bruna Teste',
          matricula: '12345',
          freq: 'P',
          part: 'Presencial',
          notas: {
            'av-1': '', // Faltou na AV1 (sem nota)
            'ch-1': '8,5', // Fez 2ª Chamada da AV1 e tirou 8,5
            'av-2': '7,0', // AV2 tirou 7,0
          },
        },
      ],
      avaliacoes: [
        { id: 'av-1', tipo: 'AV01', bimestre: '1º BIMESTRE', data: '2026-03-01' },
        { id: 'ch-1', tipo: '2ª CH (AV01)', bimestre: '1º BIMESTRE', data: '2026-03-05', parent_id: 'av-1' },
        { id: 'av-2', tipo: 'AV02', bimestre: '1º BIMESTRE', data: '2026-03-15' },
      ],
      lancamentos: [],
      fechamentos: {},
      salvarFechamento: vi.fn(),
    });

    render(<AparataDetalhes />);

    // AV1 considerou 2ª CH = 8.5, AV2 = 7.0 => Soma = 15.50
    const row = screen.getByText('Bruna Teste').closest('tr');
    expect(row?.textContent).toContain('15,50');
  });
});