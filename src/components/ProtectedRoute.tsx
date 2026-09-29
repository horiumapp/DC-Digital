import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

  if (publicOnly) {
    if (user) {
      return <Navigate to={user.role === 'ALUNO' ? '/portal-aluno' : '/turmas'} replace />;
    }
    return <Outlet />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'ALUNO' ? '/portal-aluno' : '/turmas'} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
