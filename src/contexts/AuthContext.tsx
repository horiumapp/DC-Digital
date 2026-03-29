import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'ADMIN' | 'GESTOR' | 'SECRETARIO' | 'PROFESSOR';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  title: string;
}

interface AuthContextType {
  user: User | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = (role: UserRole) => {
    let mockUser: User;
    switch (role) {
      case 'ADMIN':
        mockUser = { id: '1', name: 'Admin do Sistema', role: 'ADMIN', title: 'Administrador' };
        break;
      case 'GESTOR':
        mockUser = { id: '2', name: 'Gestor Escolar', role: 'GESTOR', title: 'Gestor(a)' };
        break;
      case 'SECRETARIO':
        mockUser = { id: '3', name: 'Secretário(a) Acadêmico', role: 'SECRETARIO', title: 'Secretário(a)' };
        break;
      case 'PROFESSOR':
      default:
        mockUser = { id: '4', name: 'Francisco Hudson Galvao Maia', role: 'PROFESSOR', title: 'Docente' };
        break;
    }
    setUser(mockUser);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
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
