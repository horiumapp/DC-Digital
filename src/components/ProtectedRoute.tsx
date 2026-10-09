import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ADMIN_ROLES } from '../constants/authConstants';
import TrocaSenhaObrigatoria from './TrocaSenhaObrigatoria';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  publicOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, publicOnly }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500 animate-pulse font-medium">Verificando acesso...</div>
      </div>
    );
  }

  const defaultRedirect = user?.role === 'ALUNO'
    ? '/portal-aluno'
    : user?.role && ADMIN_ROLES.includes(user.role)
    ? '/administracao'
    : '/turmas';

  if (publicOnly) {
    if (user) {
      return <Navigate to={defaultRedirect} replace />;
    }
    return <Outlet />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (user.mustChangePassword) {
    return <TrocaSenhaObrigatoria />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={defaultRedirect} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
