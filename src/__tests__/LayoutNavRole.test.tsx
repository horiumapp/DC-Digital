// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import Turmas from '../pages/Turmas';

const mockUseAuth = vi.fn();
const mockUseTurma = vi.fn();
const mockUseOffline = vi.fn();
const mockUseToast = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../contexts/TurmaContext', () => ({
  useTurma: () => mockUseTurma(),
}));

vi.mock('../contexts/OfflineContext', () => ({
  useOffline: () => mockUseOffline(),
}));

vi.mock('../components/common/Toast', () => ({
  useToast: () => mockUseToast(),
}));

vi.mock('../components/ScheduleModal', () => ({
  default: () => <div data-testid="schedule-modal" />,
}));

vi.mock('../components/common/ConnectionStatus', () => ({
  default: () => <div data-testid="connection-status" />,
}));

vi.mock('../components/PrivacyLinksFooter', () => ({
  default: () => <div data-testid="privacy-footer" />,
}));

describe('Layout - Visibilidade por Perfil (Role)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseToast.mockReturnValue({
      showInfo: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      showSuccess: vi.fn(),
    });
    mockUseOffline.mockReturnValue({
      isOnline: true,
      connectionState: 'ONLINE',
      pendingCount: 0,
      deadLetterCount: 0,
      syncNow: vi.fn(),
    });
    mockUseTurma.mockReturnValue({
      turmaAtiva: null,
      horarioTurma: [],
      verificarPeriodoFechado: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('para perfil ADMIN: NÃO deve renderizar "Rotina Docente" e deve apontar o logo para /administracao', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'admin-1', name: 'Administrador Geral', role: 'ADMIN', title: 'ADMIN' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    // "Rotina Docente" não deve estar presente no menu
    expect(screen.queryByText('Rotina Docente')).toBeNull();
    expect(screen.queryByText('Minhas turmas')).toBeNull();
    expect(screen.queryByText('Diário de classe')).toBeNull();
    expect(screen.queryByText('Frequência e notas')).toBeNull();

    // "Gestão Pedagógica" e "Gestão escolar" devem estar visíveis
    expect(screen.getAllByText('Gestão escolar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Currículo BNCC').length).toBeGreaterThan(0);

    // O link da marca principal deve apontar para /administracao
    const brandLink = screen.getByLabelText('DC Digital, ir para visão geral');
    expect(brandLink.getAttribute('href')).toBe('/administracao');
  });

  it('para perfil PROFESSOR: DEVE renderizar "Rotina Docente" e apontar o logo para /turmas', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'prof-1', name: 'Professor Silva', role: 'PROFESSOR', title: 'PROFESSOR' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    // "Rotina Docente" deve estar visível com seus itens
    expect(screen.getAllByText('Rotina Docente').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Minhas turmas').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Diário de classe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Frequência e notas').length).toBeGreaterThan(0);

    // O link da marca principal deve apontar para /turmas
    const brandLink = screen.getByLabelText('DC Digital, ir para visão geral');
    expect(brandLink.getAttribute('href')).toBe('/turmas');
  });

  it('para perfil SECRETARIO: NÃO deve renderizar "Rotina Docente" e deve apontar o logo para /administracao', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'sec-1', name: 'Secretário Vinicius', role: 'SECRETARIO', title: 'SECRETARIO' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.queryByText('Rotina Docente')).toBeNull();
    expect(screen.queryByText('Minhas turmas')).toBeNull();
    expect(screen.queryByText('Diário de classe')).toBeNull();
    expect(screen.queryByText('Frequência e notas')).toBeNull();

    expect(screen.getAllByText('Gestão escolar').length).toBeGreaterThan(0);
    const brandLink = screen.getByLabelText('DC Digital, ir para visão geral');
    expect(brandLink.getAttribute('href')).toBe('/administracao');
  });

  it('para perfil GESTOR: NÃO deve renderizar "Rotina Docente" e deve apontar o logo para /administracao', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'gestor-1', name: 'Gestor Escolar', role: 'GESTOR', title: 'GESTOR' },
      logout: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );

    expect(screen.queryByText('Rotina Docente')).toBeNull();
    expect(screen.queryByText('Minhas turmas')).toBeNull();
    expect(screen.queryByText('Diário de classe')).toBeNull();
    expect(screen.queryByText('Frequência e notas')).toBeNull();

    expect(screen.getAllByText('Gestão escolar').length).toBeGreaterThan(0);
    const brandLink = screen.getByLabelText('DC Digital, ir para visão geral');
    expect(brandLink.getAttribute('href')).toBe('/administracao');
  });

  it('para perfil SECRETARIO: ao acessar a tela de Turmas, deve ser redirecionado para /administracao', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'sec-1', name: 'Secretário Vinicius', role: 'SECRETARIO', title: 'SECRETARIO' },
    });

    render(
      <MemoryRouter initialEntries={['/turmas']}>
        <Routes>
          <Route path="/turmas" element={<Turmas />} />
          <Route path="/administracao" element={<div data-testid="pagina-administracao">Gestão Escolar</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('pagina-administracao')).toBeDefined();
    expect(screen.queryByPlaceholderText('Buscar por nome da turma...')).toBeNull();
  });
});
