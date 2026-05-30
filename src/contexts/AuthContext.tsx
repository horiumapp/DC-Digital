import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import LoadingFallback from '../components/common/LoadingFallback';
import { cacheUser, getCachedUser, clearAllLocalData, getPendingCount } from '../services/offlineStorage';
import { clearKeyCache } from '../lib/crypto';

export type UserRole = 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR' | 'ALUNO';

export interface User {
  id: string;
  name: string;
  email: string; // Adicionado campo de e-mail real
  role: UserRole;
  title: string;
  escola_id?: string; // ID da escola vinculada (para GESTOR/SECRETARIO)
  alocacoes?: any[];
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
  // Ref para evitar closure stale no callback onAuthStateChange
  const userRef = useRef<User | null>(null);
  useEffect(() => { userRef.current = user; }, [user]);

  // Monitora a sessão real do Supabase
  useEffect(() => {
    const fetchUserData = async (session: any) => {
      // Se não há sessão e já não temos usuário, apenas paramos o loading inicial
      if (!session?.user) {
        if (userRef.current) setUser(null);
        setLoading(false);
        return;
      }

      const { user: authUser } = session;
      const metadata = authUser.user_metadata;

      // Segurança: Prioriza app_metadata (não alterável pelo cliente)
      let role: UserRole = (authUser.app_metadata?.role as UserRole);
      let escolaId: string | undefined;
      let name = metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário';

      // 1. Tentar ler do cache local primeiro para ter respostas rápidas/offline
      try {
        const cached = await getCachedUser();
        if (cached && cached.id === authUser.id) {
          if (!role) role = cached.role as UserRole;
          escolaId = cached.escola_id;
          name = cached.name;
        }
      } catch (err) {
        console.error('[AuthContext] Erro ao carregar usuário cacheado:', err);
      }

      // 2. Se estiver online, buscar dados atualizados do Supabase
      if (navigator.onLine) {
        try {
          const { data: userData, error } = await supabase
            .from('usuarios')
            .select('cargo, escola_id')
            .eq('id', authUser.id)
            .maybeSingle();
          
          if (!error && userData) {
            role = role || (userData.cargo as UserRole);
            escolaId = userData.escola_id || escolaId || undefined;
          }
        } catch (err: unknown) {
          console.error('[AuthContext] Falha ao buscar dados complementares do usuário no DB:', err);
        }
      }

      if (!role) {
        console.error('[AuthContext] Acesso não autorizado: Nível de acesso (role) não definido para este usuário.');
        await supabase.auth.signOut();
        setUser(null);
        setLoading(false);
        alert('Acesso não autorizado: Nível de acesso não definido. Entre em contato com o suporte.');
        return;
      }

      const userObj: User = {
        id: authUser.id,
        name: name,
        email: authUser.email || '',
        role: role,
        title: role,
        escola_id: escolaId,
      };

      setUser(userObj);

      // 3. Salvar/Atualizar no cache
      try {
        const cached = await getCachedUser();
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
