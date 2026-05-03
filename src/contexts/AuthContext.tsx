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
    // Busca a sessão assim que inicializa
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const metadata = session.user.user_metadata;
        setUser({
          id: session.user.id,
          name: metadata.full_name || 'Usuário Sem Nome',
          email: session.user.email || '',
          role: (metadata.role as UserRole) || 'PROFESSOR',
          title: (metadata.role as UserRole) || 'Usuário Real',
        });
      }
      setLoading(false);
    });

    // Escuta mudanças de sessão (login real, logout real, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const metadata = session.user.user_metadata;
        setUser({
          id: session.user.id,
          name: metadata.full_name || 'Usuário Sem Nome',
          email: session.user.email || '',
          role: (metadata.role as UserRole) || 'PROFESSOR',
          title: (metadata.role as UserRole) || 'Usuário Real',
        });
      } else {
        setUser(null);
      }
      setLoading(false);
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
