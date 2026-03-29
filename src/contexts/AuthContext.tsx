import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type UserRole = 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  isSimulated?: boolean; // Flag para sabermos que é uma conta falsa (de botão)
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (role: UserRole) => void;         // Login Simulado
  logout: () => Promise<void>;             // Logout Real e Simulado
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
          role: (metadata.role as UserRole) || 'PROFESSOR',
          title: (metadata.role as UserRole) || 'Usuário Real',
          isSimulated: false,
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
          role: (metadata.role as UserRole) || 'PROFESSOR',
          title: (metadata.role as UserRole) || 'Usuário Real',
          isSimulated: false,
        });
      } else {
        // Se a mudança for de logout real e o usuário atual *não for* simulado
        // nós zeramos. (Se for simulado a gente mantém pra não quebrar a brincadeira)
        setUser((prev) => (prev?.isSimulated ? prev : null));
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // LOGIN MOCK/SIMULADO (Usado nos 4 botões de teste)
  const login = (role: UserRole) => {
    let mockUser: User;
    switch (role) {
      case 'ADMIN':
        mockUser = { id: 'mock-1', name: 'Simulação - Admin do Sistema', role: 'ADMIN', title: 'Administrador', isSimulated: true };
        break;
      case 'GESTOR':
        mockUser = { id: 'mock-2', name: 'Simulação - Gestor Escolar', role: 'GESTOR', title: 'Gestor(a)', isSimulated: true };
        break;
      case 'SECRETARIO':
        mockUser = { id: 'mock-3', name: 'Simulação - Secretário Acadêmico', role: 'SECRETARIO', title: 'Secretário(a)', isSimulated: true };
        break;
      case 'PROFESSOR':
      default:
        mockUser = { id: 'mock-4', name: 'Simulação - Francisco Hudson', role: 'PROFESSOR', title: 'Docente', isSimulated: true };
        break;
    }
    setUser(mockUser);
  };

  // LOGOUT
  const logout = async () => {
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {!loading && children}
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
