import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import LoadingFallback from '../components/common/LoadingFallback';

export type UserRole = 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR';

export interface User {
  id: string;
  name: string;
  email: string; // Adicionado campo de e-mail real
  role: UserRole;
  title: string;
  escola_id?: string; // ID da escola vinculada (para GESTOR/SECRETARIO)
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

  // Monitora a sessão real do Supabase
  useEffect(() => {
    const fetchUserData = async (session: any) => {
      if (!session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const { user: authUser } = session;
      const metadata = authUser.user_metadata;

      // Segurança: Prioriza app_metadata (não alterável pelo cliente)
      let role: UserRole = (authUser.app_metadata?.role as UserRole);

      // Sempre buscar dados complementares da tabela usuarios (escola_id, cargo fallback)
      let escolaId: string | undefined;
      try {
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('cargo, escola_id')
          .eq('id', authUser.id)
          .maybeSingle();
        
        if (!error && userData) {
          if (!role) {
            role = (userData.cargo as UserRole) || 'PROFESSOR';
          }
          escolaId = userData.escola_id || undefined;
        } else if (!role) {
          role = 'PROFESSOR';
        }
      } catch {
        if (!role) role = 'PROFESSOR';
      }

      setUser({
        id: authUser.id,
        name: metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
        email: authUser.email || '',
        role: role,
        title: role,
        escola_id: escolaId,
      });
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
      await supabase.auth.signOut();
    } finally {
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
