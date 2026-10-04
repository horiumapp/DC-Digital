// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import PortalAluno from '../pages/PortalAluno';
import { supabase } from '../lib/supabase';

vi.mock('../services/pagination', () => ({
  readAllRows: vi.fn().mockResolvedValue({ data: [] }),
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-aluno-1', email: '04063948226@aluno.dcdigital.local', role: 'ALUNO' },
    logout: vi.fn(),
  }),
}));

vi.mock('../components/common/Toast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
  }),
}));

vi.mock('react-router-dom', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
}));

describe('PortalAluno - Resolução de Gestor(a) e Secretário(a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('deve priorizar gestor e secretário alocados em usuarios e ignorar "Não localizado" de escolas', async () => {
    const mockAluno = {
      id: 'aluno-1',
      nome: 'ANTONY GABRIEL NASCIMENTO NERY',
      cpf: '040.639.482-26',
      data_nascimento: '2018-05-10',
      sexo: 'M',
      nome_responsavel: 'Maria Nery',
      endereco: 'Rua Central, 100',
      turma_id: 'turma-1',
      escola_id: 'escola-1',
      status: 'Ativo',
      matricula: '040.639.482-26',
      escolas: {
        id: 'escola-1',
        nome: 'Centro Esperança de Lábrea',
        logo_url: '',
        inep: '13028300',
        diretor: 'Não localizado', // Placeholder que deve ser ignorado
        distrito: 'Travessa Nazaré, Centro, Lábrea - AM',
        secretario: 'Não localizado', // Placeholder que deve ser ignorado
      },
      turmas: {
        id: 'turma-1',
        nome: '1º Ano A',
        turno: 'Manhã',
        escola_id: 'escola-1',
        ano_letivo: '2026',
      },
    };

    const mockEquipeUsuarios = [
      { nome_completo: 'MARIA DA SILVA GESTORA', cargo: 'GESTOR' },
      { nome_completo: 'JOAO PEREIRA SECRETARIO', cargo: 'SECRETARIO' },
    ];

    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      if (table === 'alunos') {
        return {
          select: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [mockAluno], error: null }),
            }),
          }),
        } as any;
      }
      if (table === 'usuarios') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: mockEquipeUsuarios, error: null }),
              }),
            }),
          }),
        } as any;
      }
      if (table === 'frequencias') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        } as any;
      }
      return {
        select: vi.fn().mockReturnThis(),
      } as any;
    });

    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: null });

    render(<PortalAluno />);

    // Mudar para a aba de boletim
    await waitFor(() => {
      expect(screen.getByText('ANTONY GABRIEL NASCIMENTO NERY')).toBeDefined();
    });

    const boletimTabBtn = screen.getByRole('button', { name: /boletim/i });
    boletimTabBtn.click();

    // Deve exibir o gestor e secretário alocados
    await waitFor(() => {
      expect(screen.getAllByText('MARIA DA SILVA GESTORA').length).toBeGreaterThan(0);
      expect(screen.getAllByText('JOAO PEREIRA SECRETARIO').length).toBeGreaterThan(0);
    });

    // "Não localizado" JAMAIS deve aparecer
    expect(screen.queryByText(/não localizado/i)).toBeNull();
  });
});
