import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import LoadingFallback from '../components/common/LoadingFallback';
import { cacheUser, getCachedUser, clearAllLocalData, getPendingCount } from '../services/offlineStorage';
import { clearKeyCache } from '../lib/crypto';
import { pingInternet } from '../utils/network';
import { useToast } from '../components/common/Toast';
import { db } from '../lib/db';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showError: showToastError } = useToast();
  // Ref para evitar closure stale no callback onAuthStateChange
  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);
  // Ref para Toast (evita dependência reativa no useEffect)
  const showToastErrorRef = useRef(showToastError);
  useEffect(() => { showToastErrorRef.current = showToastError; }, [showToastError]);

  // Monitora a sessão real do Supabase
  useEffect(() => {
    let currentRequestId = 0;

    const fetchUserData = async (session: Session | null) => {
      currentRequestId++;
      const myRequestId = currentRequestId;

      // Se não há sessão e já não temos usuário, apenas paramos o loading inicial
      if (!session?.user) {
        if (myRequestId !== currentRequestId) return;
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
        if (myRequestId !== currentRequestId) return;
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
      if (myRequestId !== currentRequestId) return;
      if (isReallyOnline) {
        try {
          const { data: userData, error } = await supabase
            .from('usuarios')
            .select('escola_id')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (myRequestId !== currentRequestId) return;
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
        if (myRequestId !== currentRequestId) return;
        console.error('[AuthContext] Acesso não autorizado: Nível de acesso (role) não definido para este usuário.');
        // FIX #5: signOut pode falhar se offline — garantir que setLoading(false) seja sempre chamado
        try {
          await supabase.auth.signOut();
        } catch (signOutErr) {
          console.warn('[AuthContext] signOut falhou (possivelmente offline):', signOutErr);
        }
        if (myRequestId !== currentRequestId) return;
        setUser(null);
        setLoading(false);
        showToastErrorRef.current(
          isReallyOnline
            ? 'Acesso não autorizado: Nível de acesso não definido. Entre em contato com o suporte.'
            : 'Sem conexão: não é possível verificar seu nível de acesso. Conecte-se à internet e tente novamente.'
        );
        return;
      }

      if (myRequestId !== currentRequestId) return;

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

      if (myRequestId !== currentRequestId) return;
      setLoading(false);
    };

    // Busca a sessão assim que inicializa
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserData(session);
    });

    // Escuta TODOS os eventos de sessão explicitamente para segurança
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Evento que encerra a sessão — limpar estado imediatamente
      if (event === 'SIGNED_OUT') {
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

    return () => subscription.unsubscribe();
  }, []);


  // LOGOUT — Revoga sessão no servidor ANTES de limpar o state da UI
  const logout = async () => {
    const currentUserId = userRef.current?.id;
    try {
      const pending = await getPendingCount();
      if (pending > 0) {
        const confirmLogout = window.confirm(
          `Você tem ${pending} alteração(ões) pendente(s) de sincronização. Se você sair agora, esses dados serão perdidos permanentemente. Deseja sair mesmo assim?`
        );
        if (!confirmLogout) return;
      }
      await supabase.auth.signOut();
    } catch (err) {
      console.error('[AuthContext] Erro ao deslogar:', err);
    } finally {
      // Limpa dados locais e cache de chaves
      clearKeyCache();
      await clearAllLocalData(true);
      // FIX #5: Limpar chaves cripto de TODOS os usuários para evitar herança/acúmulo
      // em dispositivos compartilhados. Mais agressivo que antes (limpava só "outros").
      try {
        await db.userSalts.clear();
      } catch (err) {
        console.warn('[AuthContext] Erro ao limpar salts de usuários:', err);
      }
      sessionStorage.removeItem('activeEscolaId');
      sessionStorage.removeItem('activeTurno');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {loading ? <LoadingFallback /> : children}
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
