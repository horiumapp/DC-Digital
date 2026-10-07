// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import ObjetoConhecimentoTab from '../components/frequencia/ObjetoConhecimentoTab';

const mockNavigate = vi.fn();
const mockSalvarConteudo = vi.fn();
const mockBuscarConteudo = vi.fn();
const mockRemoverConteudo = vi.fn();
const mockSetTempoAula = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock('../components/common/Toast', () => ({
  useToast: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showWarning: vi.fn(),
    showInfo: vi.fn(),
  }),
}));

vi.mock('../hooks/useCaptcha', () => ({
  useCaptcha: () => ({
    generatedCaptcha: '1234',
    captchaInput: '1234',
    setCaptchaInput: vi.fn(),
    captchaError: null,
    generateNewCaptcha: vi.fn(),
    validateCaptcha: () => true,
  }),
}));

vi.mock('../components/common/Captcha', () => ({
  default: () => <div data-testid="captcha-component" />,
}));

vi.mock('../services/offlineStorage', () => ({
  cacheCurriculo: vi.fn(),
  getCachedCurriculo: vi.fn().mockResolvedValue([]),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        ilike: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
      }),
    }),
  },
}));

let mockLancamentos: Array<{ turmaId?: string | number; data: string; tipo: string; tempo: string }> = [];

vi.mock('../contexts/TurmaContext', () => ({
  useTurma: () => ({
    registrarLancamento: vi.fn(),
    removerLancamento: vi.fn(),
    salvarConteudo: mockSalvarConteudo,
    buscarConteudo: mockBuscarConteudo,
    removerConteudo: mockRemoverConteudo,
    lancamentos: mockLancamentos,
  }),
}));

describe('ObjetoConhecimentoTab - Fluxo de tempos e navegação ao salvar', () => {
  const turmaMock = {
    id: 'turma-1',
    nome: '1º Ano A',
    ensino: 'Ensino Fundamental',
    fase: '1º Ano',
    componente: 'Matemática',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLancamentos = [];
    mockSalvarConteudo.mockResolvedValue(undefined);
    mockBuscarConteudo.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  it('quando há 2 tempos e o primeiro é salvo, deve avançar para o próximo tempo sem ir para o diário', async () => {
    render(
      <ObjetoConhecimentoTab
        turmaAtiva={turmaMock}
        selectedDate="2026-04-30"
        tempoAula="3º TEMPO"
        setTempoAula={mockSetTempoAula}
        disponiveisTempos={['3º TEMPO', '4º TEMPO']}
      />
    );

    // Clicar em + Adicionar Conteúdo
    const btnAdicionar = screen.getByText(/Adicionar Conteúdo/i);
    fireEvent.click(btnAdicionar);

    // Digitar conteúdo no modo texto livre
    const inputConteudo = screen.getByPlaceholderText(/Digite o conteúdo ministrado/i);
    fireEvent.change(inputConteudo, { target: { value: 'Frações e decimais' } });

    // Clicar em Confirmar e Gravar
    const btnSalvar = screen.getByText(/Confirmar e Gravar Conteúdo Ministrado/i);
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(mockSalvarConteudo).toHaveBeenCalledTimes(1);
    });

    // Deve avançar para o próximo tempo (4º TEMPO)
    expect(mockSetTempoAula).toHaveBeenCalledWith('4º TEMPO');

    // NÃO deve redirecionar para o diário porque ainda resta o 4º TEMPO pendente
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('quando o último tempo pendente é salvo, deve redirecionar para o diário', async () => {
    // 3º TEMPO já está registrado em lancamentos
    mockLancamentos = [
      { turmaId: 'turma-1', data: '2026-04-30', tipo: 'conteudo', tempo: '3º TEMPO' },
    ];

    render(
      <ObjetoConhecimentoTab
        turmaAtiva={turmaMock}
        selectedDate="2026-04-30"
        tempoAula="4º TEMPO"
        setTempoAula={mockSetTempoAula}
        disponiveisTempos={['3º TEMPO', '4º TEMPO']}
      />
    );

    // Clicar em + Adicionar Conteúdo
    const btnAdicionar = screen.getByText(/Adicionar Conteúdo/i);
    fireEvent.click(btnAdicionar);

    // Digitar conteúdo
    const inputConteudo = screen.getByPlaceholderText(/Digite o conteúdo ministrado/i);
    fireEvent.change(inputConteudo, { target: { value: 'Resolução de problemas' } });

    // Clicar em Confirmar e Gravar
    const btnSalvar = screen.getByText(/Confirmar e Gravar Conteúdo Ministrado/i);
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(mockSalvarConteudo).toHaveBeenCalledTimes(1);
    });

    // Como 3º TEMPO já foi lançado e 4º TEMPO está sendo salvo, não há mais pendências
    expect(mockNavigate).toHaveBeenCalledWith('/diario?date=2026-04-30&turmaId=turma-1');
  });

  it('quando há apenas 1 tempo no dia e é salvo, deve redirecionar para o diário', async () => {
    render(
      <ObjetoConhecimentoTab
        turmaAtiva={turmaMock}
        selectedDate="2026-04-30"
        tempoAula="1º TEMPO"
        setTempoAula={mockSetTempoAula}
        disponiveisTempos={['1º TEMPO']}
      />
    );

    // Clicar em + Adicionar Conteúdo
    const btnAdicionar = screen.getByText(/Adicionar Conteúdo/i);
    fireEvent.click(btnAdicionar);

    // Digitar conteúdo
    const inputConteudo = screen.getByPlaceholderText(/Digite o conteúdo ministrado/i);
    fireEvent.change(inputConteudo, { target: { value: 'Números naturais' } });

    // Clicar em Confirmar e Gravar
    const btnSalvar = screen.getByText(/Confirmar e Gravar Conteúdo Ministrado/i);
    fireEvent.click(btnSalvar);

    await waitFor(() => {
      expect(mockSalvarConteudo).toHaveBeenCalledTimes(1);
    });

    // Sem outros tempos pendentes, redireciona para o diário
    expect(mockNavigate).toHaveBeenCalledWith('/diario?date=2026-04-30&turmaId=turma-1');
  });
});
