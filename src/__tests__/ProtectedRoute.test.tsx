// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import ProtectedRoute from '../components/ProtectedRoute';

// ---------- Mock useAuth ----------
const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// ---------- Mock react-router-dom ----------
vi.mock('react-router-dom', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to}>Redirect to {to}</div>,
  Outlet: () => <div data-testid="outlet">Protected Content</div>,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('deve exibir mensagem de verificação enquanto estiver em loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    render(<ProtectedRoute />);

    expect(screen.getByText('Verificando acesso...')).toBeDefined();
    expect(screen.queryByTestId('outlet')).toBeNull();
    expect(screen.queryByTestId('navigate')).toBeNull();
  });

  it('para publicOnly: deve exibir Outlet se o usuário NÃO estiver logado', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<ProtectedRoute publicOnly />);

    expect(screen.getByTestId('outlet')).toBeDefined();
    expect(screen.queryByTestId('navigate')).toBeNull();
  });

  it('para publicOnly: deve redirecionar aluno logado para portal-aluno', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', role: 'ALUNO' },
      loading: false,
    });

    render(<ProtectedRoute publicOnly />);

    expect(screen.queryByTestId('outlet')).toBeNull();
    const nav = screen.getByTestId('navigate');
    expect(nav).toBeDefined();
    expect(nav.getAttribute('data-to')).toBe('/portal-aluno');
  });

  it('para publicOnly: deve redirecionar professor logado para turmas', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '2', role: 'PROFESSOR' },
      loading: false,
    });

    render(<ProtectedRoute publicOnly />);

    expect(screen.queryByTestId('outlet')).toBeNull();
    const nav = screen.getByTestId('navigate');
    expect(nav).toBeDefined();
    expect(nav.getAttribute('data-to')).toBe('/turmas');
  });

  it('para rotas protegidas normais: deve redirecionar para a home "/" se não estiver logado', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(<ProtectedRoute />);

    expect(screen.queryByTestId('outlet')).toBeNull();
    const nav = screen.getByTestId('navigate');
    expect(nav).toBeDefined();
    expect(nav.getAttribute('data-to')).toBe('/');
  });

  it('para rotas protegidas normais: deve exibir Outlet se estiver logado', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '3', role: 'PROFESSOR' },
      loading: false,
    });

    render(<ProtectedRoute />);

    expect(screen.getByTestId('outlet')).toBeDefined();
    expect(screen.queryByTestId('navigate')).toBeNull();
  });

  it('para restrição por role: deve permitir acesso se a role do usuário constar em allowedRoles', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '4', role: 'ADMIN' },
      loading: false,
    });

    render(<ProtectedRoute allowedRoles={['ADMIN', 'GESTOR']} />);

    expect(screen.getByTestId('outlet')).toBeDefined();
    expect(screen.queryByTestId('navigate')).toBeNull();
  });

  it('para restrição por role: deve redirecionar para portal-aluno se o usuário logado for ALUNO e a rota for para staff', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '5', role: 'ALUNO' },
      loading: false,
    });

    render(<ProtectedRoute allowedRoles={['PROFESSOR', 'ADMIN']} />);

    expect(screen.queryByTestId('outlet')).toBeNull();
    const nav = screen.getByTestId('navigate');
    expect(nav).toBeDefined();
    expect(nav.getAttribute('data-to')).toBe('/portal-aluno');
  });

  it('para restrição por role: deve redirecionar professor para /turmas se tentar acessar rota de ADMIN', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '6', role: 'PROFESSOR' },
      loading: false,
    });

    render(<ProtectedRoute allowedRoles={['ADMIN']} />);

    expect(screen.queryByTestId('outlet')).toBeNull();
    const nav = screen.getByTestId('navigate');
    expect(nav).toBeDefined();
    expect(nav.getAttribute('data-to')).toBe('/turmas');
  });
});
