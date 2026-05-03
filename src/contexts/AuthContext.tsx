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

      // Segurança: Prioriza app_metadata ou consulta a tabela 'usuarios'
      // app_metadata não pode ser alterado pelo cliente.
      let role: UserRole = (authUser.app_metadata?.role as UserRole);

      if (!role) {
        // Fallback: busca da tabela de usuários se não estiver no app_metadata
        const { data: userData } = await supabase
          .from('usuarios')
          .select('cargo')
          .eq('id', authUser.id)
          .single();
        
        role = (userData?.cargo as UserRole) || 'PROFESSOR';
      }

      setUser({
        id: authUser.id,
        name: metadata.full_name || 'Usuário Sem Nome',
        email: authUser.email || '',
        role: role,
        title: role,
      });
      setLoading(false);
    };

    // Busca a sessão assim que inicializa
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchUserData(session);
    });

    // Escuta mudanças de sessão (login real, logout real, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
