// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { act } from 'react';

// ---------- Mock Toast ----------
vi.mock('../components/common/Toast', () => ({
  useToast: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
  }),
}));

// ---------- Mock LoadingFallback ----------
vi.mock('../components/common/LoadingFallback', () => ({
  default: () => <div data-testid="loading-fallback">Carregando...</div>,
}));

// ---------- Mock offlineStorage ----------
const mockCacheUser = vi.fn(async () => {});
const mockGetCachedUser = vi.fn(async () => null);
const mockClearAllLocalData = vi.fn(async () => {});
let mockPendingCount = 0;

vi.mock('../services/offlineStorage', () => ({
  cacheUser: mockCacheUser,
  getCachedUser: mockGetCachedUser,
  clearAllLocalData: mockClearAllLocalData,
  getPendingCount: async () => mockPendingCount,
}));

// ---------- Mock crypto ----------
vi.mock('../lib/crypto', () => ({
  clearKeyCache: vi.fn(),
}));

// ---------- Mock db ----------
const mockClearSalts = vi.fn(async () => {});
vi.mock('../lib/db', () => ({
  db: {
    userSalts: {
      clear: mockClearSalts,
    },
  },
}));

// ---------- Mock Supabase ----------
let sessionMock: any = null;
let authStateChangeCallback: any = null;
const mockGetSession = vi.fn(async () => ({ data: { session: sessionMock } }));
const mockOnAuthStateChange = vi.fn((callback) => {
  authStateChangeCallback = callback;
  return {
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  };
});
const mockSignOut = vi.fn(async () => {
  sessionMock = null;
  if (authStateChangeCallback) {
    authStateChangeCallback('SIGNED_OUT', null);
  }
});
const mockMaybeSingle = vi.fn(async () => ({ data: { escola_id: 'escola-123' }, error: null }));
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  },
}));

// A test component that consumes the context
const TestConsumer = () => {
  const { user, loading, logout } = useAuth();
  if (loading) return <div>Carregando...</div>;
  if (!user) return <div>Não autenticado</div>;
  return (
    <div>
      <div data-testid="user-name">{user.name}</div>
      <div data-testid="user-role">{user.role}</div>
      <div data-testid="user-escola">{user.escola_id}</div>
      <button onClick={logout}>Deslogar</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionMock = null;
    authStateChangeCallback = null;
    mockPendingCount = 0;
    mockGetCachedUser.mockReset();
    mockMaybeSingle.mockReset();
    mockMaybeSingle.mockImplementation(async () => ({ data: { escola_id: 'escola-123' }, error: null }));
    mockGetCachedUser.mockImplementation(async () => null);
  });

  it('deve inicializar com estado loading e depois mostrar "Não autenticado" se não houver sessão', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Deve começar com loading fallback
    expect(screen.getByTestId('loading-fallback')).toBeDefined();

    // Aguarda finalizar o loading e renderizar o componente filho
    await waitFor(() => {
      expect(screen.queryByTestId('loading-fallback')).toBeNull();
    });

    expect(screen.getByText('Não autenticado')).toBeDefined();
  });

  it('deve autenticar com sucesso se houver sessão ativa com role no JWT', async () => {
    sessionMock = {
      user: {
        id: 'user-123',
        email: 'professor@escola.com',
        user_metadata: { full_name: 'Professor Teste' },
        app_metadata: { role: 'PROFESSOR' },
      },
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-fallback')).toBeNull();
    });

    expect(screen.getByTestId('user-name').textContent).toBe('Professor Teste');
    expect(screen.getByTestId('user-role').textContent).toBe('PROFESSOR');
    expect(screen.getByTestId('user-escola').textContent).toBe('escola-123'); // vindo do mock do Supabase.from('usuarios')
  });

  it('deve negar acesso e deslogar se a role não estiver definida', async () => {
    sessionMock = {
      user: {
        id: 'user-no-role',
        email: 'invalid@escola.com',
        user_metadata: { full_name: 'Sem Role' },
        app_metadata: {}, // Sem role
      },
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-fallback')).toBeNull();
    });

    // Se não há role, o provider chama o signOut e desloga
    expect(mockSignOut).toHaveBeenCalled();
    expect(screen.getByText('Não autenticado')).toBeDefined();
  });

  it('deve usar dados do cache offline para preenchimento rápido', async () => {
    sessionMock = {
      user: {
        id: 'user-cached',
        email: 'cached@escola.com',
        user_metadata: { full_name: 'Novo Nome Supabase' },
        app_metadata: { role: 'GESTOR' },
      },
    };

    // Cache retorna dados antigos
    mockGetCachedUser.mockResolvedValue({
      id: 'user-cached',
      name: 'Nome Antigo Cache',
      escola_id: 'escola-cached-id',
      role: 'GESTOR',
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-fallback')).toBeNull();
    });

    // Deve priorizar a role do JWT (GESTOR) mas pode obter escola_id do cache inicialmente
    expect(screen.getByTestId('user-role').textContent).toBe('GESTOR');
    expect(screen.getByTestId('user-name').textContent).toBe('Nome Antigo Cache');
  });

  it('deve deslogar limpando caches e IndexedDB', async () => {
    sessionMock = {
      user: {
        id: 'user-123',
        email: 'professor@escola.com',
        user_metadata: { full_name: 'Professor Teste' },
        app_metadata: { role: 'PROFESSOR' },
      },
    };

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-fallback')).toBeNull();
    });

    const logoutBtn = screen.getByText('Deslogar');
    
    // Mock window.confirm (caso precise de confirm devido a pendências)
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await act(async () => {
      logoutBtn.click();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockClearAllLocalData).toHaveBeenCalledWith(true);
    expect(mockClearSalts).toHaveBeenCalled();
    expect(screen.getByText('Não autenticado')).toBeDefined();

    confirmSpy.mockRestore();
  });
});
