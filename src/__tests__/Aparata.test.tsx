// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import Aparata from '../pages/Aparata';
import { getBimestreAtual } from '../config/appConfig';
import * as OfflineTurmaService from '../services/turmaServiceOffline';

const mockUseTurma = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('../contexts/TurmaContext', () => ({
  useTurma: () => mockUseTurma(),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../components/common/Toast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
  }),
}));

vi.mock('../services/turmaServiceOffline', () => ({
  fetchDisciplinasDaTurma: vi.fn(),
  fetchFechamentosRaw: vi.fn(),
  salvarFechamento: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

const mockFechamentos = [
  {
    id: 'fech-1',
    bimestre: '1. BIMESTRE',
    status: 'FECHADO',
    disciplina: 'Educação Física',
    data_fechamento: '2026-10-03',
  },
  {
    id: 'fech-2',
    bimestre: '1. BIMESTRE',
    status: 'FECHADO',
    disciplina: 'Geografia',
    data_fechamento: '2026-10-03',
  },
  {
    id: 'fech-3',
    bimestre: '1. BIMESTRE',
    status: 'FECHADO',
    disciplina: 'Ensino Religioso',
    data_fechamento: '2026-10-03',
  },
  {
    id: 'fech-4',
    bimestre: '1. BIMESTRE',
    status: 'FECHADO',
    disciplina: 'Artes',
    data_fechamento: '2026-10-03',
  },
];

const mockDisciplinas = ['Artes', 'Educação Física', 'Ensino Religioso', 'Geografia'];

describe('Aparata - Filtragem por Disciplina do Professor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(OfflineTurmaService.fetchDisciplinasDaTurma).mockResolvedValue(mockDisciplinas);
    vi.mocked(OfflineTurmaService.fetchFechamentosRaw).mockResolvedValue(mockFechamentos);
  });

  afterEach(() => {
    cleanup();
  });

  it('professor de Geografia deve ver apenas a sua aparata e movimentação de Geografia, não de outras disciplinas', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'prof-geo-1',
        name: 'Elisa Rocha Teste',
        role: 'PROFESSOR',
      },
    });

    mockUseTurma.mockReturnValue({
      turmaAtiva: {
        id: 'turma-1||Geografia',
        fase: '1º Ano',
        escola: 'Centro Esperança de Lábrea',
        turno: 'Manhã',
        componente: 'Geografia',
        professor: 'Elisa Rocha Teste',
      },
      salvarFechamento: vi.fn(),
    });

    render(<Aparata />);

    const periodo = await screen.findByLabelText(/período/i) as HTMLSelectElement;
    expect(periodo.value).toBe(getBimestreAtual()?.id || '4. BIMESTRE');
    fireEvent.change(periodo, { target: { value: '1. BIMESTRE' } });

    // Aguardar carregamento dos dados
    await waitFor(() => {
      expect(screen.getByText('Movimentações da Aparata')).toBeDefined();
    });

    // Deve conter Geografia na tela (nos cards, na tabela de dados da aparata e nas movimentações)
    await waitFor(() => {
      expect(screen.getAllByText('Geografia').length).toBeGreaterThan(0);
    });

    // NÃO deve conter as outras disciplinas nas movimentações nem nos dados da aparata
    expect(screen.queryByText('Educação Física')).toBeNull();
    expect(screen.queryByText('Ensino Religioso')).toBeNull();
    expect(screen.queryByText('Artes')).toBeNull();

    // No seletor de Componente Curricular, o professor só deve ter a opção Geografia e o select deve estar desabilitado
    const selectDisciplina = screen.getByLabelText(/componente curricular/i) as HTMLSelectElement;
    expect(selectDisciplina.value).toBe('Geografia');
    expect(selectDisciplina.disabled).toBe(true);
    expect(screen.queryByText('TODAS AS DISCIPLINAS')).toBeNull();
  });

  it('administrador com TODAS selecionado deve ver todas as disciplinas fechadas nas movimentações', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'admin-1',
        name: 'Administrador',
        role: 'ADMIN',
      },
    });

    mockUseTurma.mockReturnValue({
      turmaAtiva: {
        id: 'turma-1',
        fase: '1º Ano',
        escola: 'Centro Esperança de Lábrea',
        turno: 'Manhã',
        componente: 'TODAS',
        professor: '',
      },
      salvarFechamento: vi.fn(),
    });

    render(<Aparata />);

    const periodo = await screen.findByLabelText(/período/i) as HTMLSelectElement;
    expect(periodo.value).toBe(getBimestreAtual()?.id || '4. BIMESTRE');
    fireEvent.change(periodo, { target: { value: '1. BIMESTRE' } });

    await waitFor(() => {
      expect(screen.getByText('Movimentações da Aparata')).toBeDefined();
    });

    // Com perfil admin e TODAS selecionado, aparecem todas as movimentações
    await waitFor(() => {
      expect(screen.getAllByText('Educação Física').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Geografia').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Ensino Religioso').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Artes').length).toBeGreaterThan(0);
    });

    // O select do administrador deve ter opção 'TODAS AS DISCIPLINAS' e não estar desabilitado
    const selectDisciplina = screen.getByLabelText(/componente curricular/i) as HTMLSelectElement;
    expect(selectDisciplina.disabled).toBe(false);
    expect(screen.getByText('TODAS AS DISCIPLINAS')).toBeDefined();
  });
});
