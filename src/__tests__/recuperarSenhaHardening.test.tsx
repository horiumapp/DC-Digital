import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RecuperarSenha from '../pages/RecuperarSenha';
import { supabase } from '../lib/supabase';

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

vi.mock('../components/Background', () => ({
  default: () => <div data-testid="background-mock" />,
}));

describe('RecuperarSenha Security Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('deve rejeitar submissão com e-mail inválido sem invocar o Supabase', async () => {
    render(
      <MemoryRouter>
        <RecuperarSenha />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/e-mail/i);
    const submitBtn = screen.getByRole('button', { name: /enviar link de recuperação/i });

    fireEvent.change(emailInput, { target: { value: 'emailinvalido' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });
  });

  it('deve realizar envio e ativar cooldown com mensagem neutra anti-enumeração', async () => {
    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: null,
    } as unknown as ReturnType<typeof supabase.auth.resetPasswordForEmail>);

    render(
      <MemoryRouter>
        <RecuperarSenha />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/e-mail/i);
    const submitBtn = screen.getByRole('button', { name: /enviar link de recuperação/i });

    fireEvent.change(emailInput, { target: { value: 'usuario@escola.gov.br' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        'usuario@escola.gov.br',
        expect.objectContaining({
          redirectTo: expect.stringContaining('/redefinir-senha'),
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Se o e-mail informado estiver cadastrado no sistema/i)).toBeInTheDocument();
      expect(screen.getByText(/Próximo reenvio disponível em/i)).toBeInTheDocument();
    });

    // Deve registrar a tentativa no localStorage
    expect(localStorage.getItem('dc_pwd_reset_attempts')).toBe('1');
    expect(localStorage.getItem('dc_pwd_reset_cooldown_until')).toBeTruthy();
  });

  it('deve ativar lockout de segurança após 3 tentativas consecutivas', async () => {
    // Simular que o usuário já efetuou 2 tentativas recentes
    localStorage.setItem('dc_pwd_reset_attempts', '2');
    localStorage.setItem('dc_pwd_reset_time', Date.now().toString());

    vi.mocked(supabase.auth.resetPasswordForEmail).mockResolvedValueOnce({
      data: {},
      error: null,
    } as unknown as ReturnType<typeof supabase.auth.resetPasswordForEmail>);

    render(
      <MemoryRouter>
        <RecuperarSenha />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/e-mail/i);
    const submitBtn = screen.getByRole('button', { name: /enviar link de recuperação/i });

    fireEvent.change(emailInput, { target: { value: 'terceira.tentativa@escola.gov.br' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(localStorage.getItem('dc_pwd_reset_attempts')).toBe('3');
      expect(localStorage.getItem('dc_pwd_reset_lockout_until')).toBeTruthy();
    });
  });

  it('deve bloquear formulário e desabilitar botão quando em lockout ativo', () => {
    const futureLockout = Date.now() + 180 * 1000; // 3 minutos no futuro
    localStorage.setItem('dc_pwd_reset_lockout_until', futureLockout.toString());

    render(
      <MemoryRouter>
        <RecuperarSenha />
      </MemoryRouter>
    );

    expect(screen.getByText(/Proteção contra tentativas repetidas/i)).toBeInTheDocument();
    const submitBtn = screen.getByRole('button');
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent(/Aguarde/i);
  });
});
