import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import LoadingFallback from '../components/common/LoadingFallback';
import { cacheUser, getCachedUser, clearAllLocalData, getPendingCount } from '../services/offlineStorage';
import { clearKeyCache } from '../lib/crypto';
import { pingInternet } from '../utils/network';
import { useToast } from '../components/common/Toast';
import { db } from '../lib/db';
import ConfirmActionModal from '../components/ConfirmActionModal';
import { AlertTriangle, WifiOff } from 'lucide-react';

export type UserRole = 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR' | 'ALUNO';

// FIX #10: Interface tipada para alocações (substituindo any[])
export interface Alocacao {
  id: string;
  escola_id: string;
  turno: string;
  escolas?: {
    nome: string;
  };
  turma_id?: string;
  disciplina?: string;
}

export interface User {
  id: string;
  name: string;
  email: string; // Adicionado campo de e-mail real
  role: UserRole;
  title: string;
  escola_id?: string; // ID da escola vinculada (para GESTOR/SECRETARIO)
  alocacoes?: Alocacao[];
  professorDisciplinas?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;             // Logout Real
}

// ============================================================
// Estado do modal de confirmação de logout
// ============================================================
interface LogoutModalState {
  open: boolean;
  /** 'pending' = tem dados pendentes | 'offline' = signOut falhou por falta de internet */
  reason: 'pending' | 'offline';
  pendingCount: number;
  resolve: ((confirmed: boolean) => void) | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError: showToastError } = useToast();

  // FIX: Modal de logout no lugar de window.confirm() bloqueante
  const [logoutModal, setLogoutModal] = useState<LogoutModalState>({
    open: false,
    reason: 'pending',
    pendingCount: 0,
    resolve: null,
  });

  // Ref para evitar closure stale no callback onAuthStateChange
  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);
  // Ref para Toast (evita dependência reativa no useEffect)
  const showToastErrorRef = useRef(showToastError);
  useEffect(() => { showToastErrorRef.current = showToastError; }, [showToastError]);

  // ============================================================
  // Helper: abre modal de confirmação e aguarda resposta via Promise
  // ============================================================
  const askConfirmation = useCallback((reason: 'pending' | 'offline', pendingCount: number): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setLogoutModal({ open: true, reason, pendingCount, resolve });
    });
  }, []);

  const handleModalClose = useCallback(() => {
    setLogoutModal(prev => {
      prev.resolve?.(false);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  const handleModalConfirm = useCallback(() => {
    setLogoutModal(prev => {
      prev.resolve?.(true);
      return { ...prev, open: false, resolve: null };
    });
  }, []);

  // Monitora a sessão real do Supabase
  useEffect(() => {
    // FIX Race Condition: AbortController por requisição para cancelar
    // operações assíncronas longas (como pingInternet de 3s) se uma nova
    // requisição chegar antes da primeira completar.
    let activeAbortController: AbortController | null = null;

    const fetchUserData = async (session: Session | null) => {
      // Cancelar requisição anterior, se existir
      activeAbortController?.abort();
      const controller = new AbortController();
      activeAbortController = controller;

      const isCancelled = () => controller.signal.aborted;

      // Se não há sessão e já não temos usuário, apenas paramos o loading inicial
      if (!session?.user) {
        if (isCancelled()) return;
        if (userRef.current) setUser(null);
        setLoading(false);
        return;
      }

      const { user: authUser } = session;
      const metadata = authUser.user_metadata;

      // FIX #1: Segurança: Prioriza app_metadata (assinado pelo JWT, não alterável pelo cliente)
      // NUNCA usar role do cache IndexedDB — ele pode ser manipulado via DevTools.
      const role: UserRole = (authUser.app_metadata?.role as UserRole);
      let escolaId: string | undefined;
      let name = metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário';

      // 1. Tentar ler APENAS dados não-sensíveis do cache (nome, escola_id) para UX rápida
      let cached: Awaited<ReturnType<typeof getCachedUser>> | undefined;
      try {
        cached = await getCachedUser(authUser.id);
        if (isCancelled()) return;
        if (cached && cached.id === authUser.id) {
          // FIX #1: NÃO copiar role do cache. Apenas dados de apresentação.
          escolaId = cached.escola_id;
          name = cached.name;
        }
      } catch (err) {
        console.error('[AuthContext] Erro ao carregar usuário cacheado:', err);
      }

      // 2. Se estiver online, buscar dados complementares do Supabase
      // SEGURANÇA: O servidor complementa APENAS dados não-sensíveis (escola_id, nome).
      // A role NUNCA é sobrescrita pelo servidor — app_metadata (JWT) é a fonte definitiva,
      // pois é assinada pelo backend e não pode ser manipulada pelo cliente.
      // FIX #10: Usar ping real em vez de navigator.onLine (pode reportar 'true' sem internet)
      const isReallyOnline = await pingInternet(3000);
      if (isCancelled()) return;
      if (isReallyOnline) {
        try {
          const { data: userData, error } = await supabase
            .from('usuarios')
            .select('escola_id')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (isCancelled()) return;
          if (!error && userData) {
            if (userData.escola_id) {
              escolaId = userData.escola_id;
            }
          }
        } catch (err: unknown) {
          console.error('[AuthContext] Falha ao buscar dados complementares do usuário no DB:', err);
        }
      }

      // FIX #1: Se não temos role (nem do JWT, nem do servidor), negar acesso
      // Isso impede escalação via cache IndexedDB manipulado
      if (!role) {
        if (isCancelled()) return;
        console.error('[AuthContext] Acesso não autorizado: Nível de acesso (role) não definido para este usuário.');
        // FIX #5: signOut pode falhar se offline — garantir que setLoading(false) seja sempre chamado
        try {
          await supabase.auth.signOut();
        } catch (signOutErr) {
          console.warn('[AuthContext] signOut falhou (possivelmente offline):', signOutErr);
        }
        if (isCancelled()) return;
        setUser(null);
        setLoading(false);
        showToastErrorRef.current(
          isReallyOnline
            ? 'Acesso não autorizado: Nível de acesso não definido. Entre em contato com o suporte.'
            : 'Sem conexão: não é possível verificar seu nível de acesso. Conecte-se à internet e tente novamente.'
        );
        return;
      }

      if (isCancelled()) return;

      const userObj: User = {
        id: authUser.id,
        name: name,
        email: authUser.email || '',
        role: role,
        title: role,
        escola_id: escolaId,
      };

      setUser(userObj);

      // 3. Salvar/Atualizar no cache (reutiliza resultado do passo 1)
      try {
        const alocacoes = (cached && cached.id === authUser.id) ? cached.alocacoes : undefined;
        const professorDisciplinas = (cached && cached.id === authUser.id) ? cached.professorDisciplinas : undefined;

        await cacheUser({
          id: userObj.id,
          name: userObj.name,
          email: userObj.email,
          role: userObj.role,
          title: userObj.title,
          escola_id: userObj.escola_id,
          cachedAt: new Date().toISOString(),
          alocacoes,
          professorDisciplinas,
        });
      } catch (err) {
        console.error('[AuthContext] Erro ao salvar usuário no cache:', err);
      }
    } finally {
      // FIX #9: setLoading(false) sempre executado em finally para evitar
      // tela de carregamento travada caso um abort ocorra entre setUser e setLoading.
      // A verificação isCancelled() impede o set em componentes desmontados,
      // mas o loading DEVE ser liberado mesmo com abort para não travar a UI.
      if (!isCancelled()) {
        setLoading(false);
      }
    }
  };

    // Busca a sessão assim que inicializa
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserData(session);
    });

    // Escuta TODOS os eventos de sessão explicitamente para segurança
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Evento que encerra a sessão — limpar estado imediatamente
      if (event === 'SIGNED_OUT') {
        activeAbortController?.abort();
        setUser(null);
        setLoading(false);
        return;
      }

      // Se for apenas uma atualização de foco/token e já temos o usuário, evitar reprocessar tudo
      // a menos que seja um login novo ou mudança explícita
      // Usa userRef (sempre atualizado) para evitar closure stale
      if (userRef.current && session?.user?.id === userRef.current.id) {
        if (event !== 'PASSWORD_RECOVERY') {
          return;
        }
      }

      // Recuperação de senha — não redirecionar, manter sessão parcial
      if (event === 'PASSWORD_RECOVERY') {
        setLoading(false);
        return;
      }
      // Login, token refresh e outros — recarregar dados do usuário
      fetchUserData(session);
    });

    return () => {
      activeAbortController?.abort();
      subscription.unsubscribe();
    };
  }, []);


  // LOGOUT — Revoga sessão no servidor ANTES de limpar o state da UI
  const logout = async () => {
    try {
      const pending = await getPendingCount();
      if (pending > 0) {
        // FIX: Substituir window.confirm() bloqueante por modal React
        const confirmed = await askConfirmation('pending', pending);
        if (!confirmed) return;
      }

      // FIX #14: Tentar signOut e rastrear se foi bem-sucedido.
      // Só limpar dados locais se signOut funcionou, para evitar perda de dados pendentes offline.
      let signOutSuccess = false;
      try {
        await supabase.auth.signOut();
        signOutSuccess = true;
      } catch (err) {
        console.error('[AuthContext] Erro ao deslogar (possivelmente offline):', err);
        // FIX: Substituir window.confirm() por modal React
        const forceClean = await askConfirmation('offline', 0);
        signOutSuccess = forceClean;
      }

      if (signOutSuccess) {
        // Limpa dados locais e cache de chaves
        clearKeyCache();
        await clearAllLocalData(true);
        // Limpar chaves cripto de TODOS os usuários para evitar herança/acúmulo
        // em dispositivos compartilhados.
        try {
          await db.userSalts.clear();
        } catch (err) {
          console.warn('[AuthContext] Erro ao limpar salts de usuários:', err);
        }
        sessionStorage.removeItem('activeEscolaId');
        sessionStorage.removeItem('activeTurno');
      }

      setUser(null);
    } catch (err) {
      console.error('[AuthContext] Erro inesperado no logout:', err);
      setUser(null);
    }
  };

  // ============================================================
  // Conteúdo dos modais de confirmação de logout
  // ============================================================
  const logoutModalContent = logoutModal.reason === 'pending' ? {
    title: 'Dados não sincronizados',
    message: (
      <span>
        Você tem <strong>{logoutModal.pendingCount}</strong> alteração(ões) pendente(s) de sincronização.
        Se você sair agora, esses dados serão <strong>perdidos permanentemente</strong>.
        Deseja sair mesmo assim?
      </span>
    ),
    confirmLabel: 'Sair mesmo assim',
    icon: <AlertTriangle className="w-6 h-6" />,
  } : {
    title: 'Sem conexão com a internet',
    message: 'Não foi possível desconectar do servidor. Deseja limpar os dados locais mesmo assim?',
    confirmLabel: 'Limpar e sair',
    icon: <WifiOff className="w-6 h-6" />,
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {loading ? <LoadingFallback /> : children}

      {/* Modal de confirmação de logout — renderizado fora do fluxo principal */}
      <ConfirmActionModal
        isOpen={logoutModal.open}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        title={logoutModalContent.title}
        message={logoutModalContent.message}
        confirmLabel={logoutModalContent.confirmLabel}
        icon={logoutModalContent.icon}
        variant="warning"
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
