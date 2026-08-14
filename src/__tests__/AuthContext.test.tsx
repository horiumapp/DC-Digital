// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { act } from 'react';

// ---------- Hoisted Mocks Setup ----------
const {
  mockCacheUser,
  mockGetCachedUser,
  mockClearAllLocalData,
  mockClearSalts,
  mockGetSession,
  mockOnAuthStateChange,
  mockSignOut,
  mockMaybeSingle,
  mockFrom,
  setSessionVal
} = vi.hoisted(() => {
  let sessionVal: unknown = null;
  let authStateCallback: ((event: string, session: unknown) => void) | null = null;

  const getSession = vi.fn(async () => ({ data: { session: sessionVal } }));
  const onAuthStateChange = vi.fn((callback) => {
    authStateCallback = callback;
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    };
  });
  const signOut = vi.fn(async () => {
    sessionVal = null;
    if (authStateCallback) {
      authStateCallback('SIGNED_OUT', null);
    }
  });

  const maybeSingle = vi.fn(async () => ({ data: { escola_id: 'escola-123' }, error: null }));
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return {
    mockCacheUser: vi.fn(async () => { }),
    mockGetCachedUser: vi.fn(async (): Promise<Record<string, unknown> | null | undefined> => null),
    mockClearAllLocalData: vi.fn(async () => { }),
    mockClearSalts: vi.fn(async () => { }),
    mockGetSession: getSession,
    mockOnAuthStateChange: onAuthStateChange,
    mockSignOut: signOut,
    mockMaybeSingle: maybeSingle,
    mockFrom: from,
    setSessionVal: (val: unknown) => { sessionVal = val; }
  };
});

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

// ---------- Mock network & syncEngine ----------
vi.mock('../utils/network', () => ({
  pingInternet: vi.fn(async () => true),
  pingSupabase: vi.fn(async () => true),
}));

vi.mock('../services/syncEngine', () => ({
  syncAll: vi.fn(async () => ({ synced: 0, failed: 0, total: 0, remaining: 0, errors: [] })),
}));

// ---------- Mock offlineStorage ----------
vi.mock('../services/offlineStorage', () => ({
  cacheUser: mockCacheUser,
  getCachedUser: mockGetCachedUser,
  clearAllLocalData: mockClearAllLocalData,
  getPendingCount: async () => 0,
}));

// ---------- Mock crypto ----------
vi.mock('../lib/crypto', () => ({
  clearKeyCache: vi.fn(),
}));

// ---------- Mock db ----------
vi.mock('../lib/db', () => ({
  db: {
    userSalts: {
      clear: mockClearSalts,
    },
  },
}));

// ---------- Mock Supabase ----------
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
      signOut: mockSignOut,
    },
    from: mockFrom,
  },
}));

// Import context AFTER mocks are configured
import { AuthProvider, useAuth } from '../contexts/AuthContext';

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
    setSessionVal(null);
    mockGetCachedUser.mockReset();
    mockMaybeSingle.mockReset();
    mockMaybeSingle.mockImplementation(async () => ({ data: { escola_id: 'escola-123' }, error: null }));
    mockGetCachedUser.mockImplementation(async () => null);
    vi.stubGlobal('fetch', vi.fn(async () => ({ status: 200, ok: true })));
  });

  afterEach(() => {
    cleanup();
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
    setSessionVal({
      user: {
        id: 'user-123',
        email: 'professor@escola.com',
        user_metadata: { full_name: 'Professor Teste' },
        app_metadata: { role: 'PROFESSOR' },
      },
    });

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
    expect(screen.getByTestId('user-escola').textContent).toBe('escola-123');
  });

  it('deve negar acesso e deslogar se a role não estiver definida', async () => {
    setSessionVal({
      user: {
        id: 'user-no-role',
        email: 'invalid@escola.com',
        user_metadata: { full_name: 'Sem Role' },
        app_metadata: {},
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-fallback')).toBeNull();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(screen.getByText('Não autenticado')).toBeDefined();
  });

  it('deve usar dados do cache offline para preenchimento rápido', async () => {
    setSessionVal({
      user: {
        id: 'user-cached',
        email: 'cached@escola.com',
        user_metadata: { full_name: 'Novo Nome Supabase' },
        app_metadata: { role: 'GESTOR' },
      },
    });

    mockGetCachedUser.mockResolvedValue({
      id: 'user-cached',
      name: 'Nome Antigo Cache',
      email: 'cached@escola.com',
      role: 'GESTOR',
      title: 'GESTOR',
      escola_id: 'escola-cached-id',
      cachedAt: new Date().toISOString(),
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-fallback')).toBeNull();
    });

    expect(screen.getByTestId('user-role').textContent).toBe('GESTOR');
    expect(screen.getByTestId('user-name').textContent).toBe('Nome Antigo Cache');
  });

  it('deve deslogar limpando caches e IndexedDB', async () => {
    setSessionVal({
      user: {
        id: 'user-123',
        email: 'professor@escola.com',
        user_metadata: { full_name: 'Professor Teste' },
        app_metadata: { role: 'PROFESSOR' },
      },
    });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-fallback')).toBeNull();
    });

    const logoutBtn = screen.getByText('Deslogar');
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);

    await act(async () => {
      logoutBtn.click();
    });

    expect(mockSignOut).toHaveBeenCalled();
    // FIX C2: clearAllLocalData agora recebe clearCrypto=true para limpar chaves cripto
    expect(mockClearAllLocalData).toHaveBeenCalledWith(true, true);
    expect(screen.getByText('Não autenticado')).toBeDefined();

    window.confirm = originalConfirm;
  });
});
