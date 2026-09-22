import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TurmaService } from '../services/turmaService';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('Relatórios: fetchTurmasRelatorio e fetchAvaliacoes para SECRETARIO/GESTOR/ADMIN', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve filtrar pela escola do secretário e mapear componentes reais de horários e avaliações', async () => {
    const mockUser = {
      id: 'sec-123',
      role: 'SECRETARIO',
      email: 'vinicius@escola.gov.br',
      escola_id: 'escola-uuid-1',
    };

    const mockTurmas = [
      {
        id: 'turma-1',
        nome: '1º ANO A',
        turno: 'MANHÃ',
        ensino: 'Fundamental Anos Iniciais (1° ao 5° ANO)',
        turma_codigo: '01',
        escola_id: 'escola-uuid-1',
        escolas: { nome: 'Escola Municipal Francisca Mendes' },
      },
    ];

    const mockHorarios = [
      { turma_id: 'turma-1', componente: 'Matemática' },
      { turma_id: 'turma-1', componente: 'Língua Portuguesa' },
    ];

    const mockAvaliacoes = [
      { turma_id: 'turma-1', disciplina: 'Ciências' },
      { turma_id: 'turma-1', disciplina: 'GERAL' }, // Deve ser ignorado
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'turmas') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            expect(col).toBe('escola_id');
            expect(val).toBe('escola-uuid-1');
            return Promise.resolve({ data: mockTurmas, error: null });
          }),
        };
      }
      if (table === 'professor_horarios') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockHorarios, error: null }),
        };
      }
      if (table === 'avaliacoes') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: mockAvaliacoes, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
      };
    });

    const result = await TurmaService.fetchTurmasRelatorio(mockUser);

    expect(result.length).toBe(3); // Matemática, Língua Portuguesa, Ciências
    const componentes = result.map(r => r.componente);
    expect(componentes).toContain('Matemática');
    expect(componentes).toContain('Língua Portuguesa');
    expect(componentes).toContain('Ciências');
    expect(componentes).not.toContain('GERAL');
    expect(result[0].escolaNome).toBe('Escola Municipal Francisca Mendes');
    expect(result[0].id).toBe('turma-1'); // ID limpo
  });

  it('deve usar POLIVALENTE como fallback se a turma não tiver horários nem avaliações', async () => {
    const mockUser = {
      id: 'sec-123',
      role: 'SECRETARIO',
      email: 'vinicius@escola.gov.br',
      escola_id: 'escola-uuid-1',
    };

    const mockTurmas = [
      {
        id: 'turma-nova',
        nome: '2º ANO B',
        turno: 'TARDE',
        ensino: 'Fundamental Anos Iniciais (1° ao 5° ANO)',
        turma_codigo: '02',
        escola_id: 'escola-uuid-1',
        escolas: { nome: 'Escola Municipal Francisca Mendes' },
      },
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'turmas') {
        return {
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: mockTurmas, error: null }),
        };
      }
      if (table === 'professor_horarios') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === 'avaliacoes') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    const result = await TurmaService.fetchTurmasRelatorio(mockUser);

    expect(result.length).toBe(1);
    expect(result[0].componente).toBe('POLIVALENTE');
  });

  it('fetchAvaliacoes não deve aplicar filtro ilike quando disciplina for GERAL', async () => {
    let ilikeCalled = false;

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'avaliacoes') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockImplementation(() => {
            ilikeCalled = true;
            return Promise.resolve({ data: [], error: null });
          }),
          then: (resolve: any) => resolve({ data: [], error: null }),
        };
      }
      return { select: vi.fn().mockReturnThis() };
    });

    await TurmaService.fetchAvaliacoes('turma-1', 'GERAL');

    expect(ilikeCalled).toBe(false);
  });
});
