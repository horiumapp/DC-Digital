import { PublicDocumentLayout } from './components/common/ModuleWorkspace';
import React, { Suspense, useState } from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import { getSavedConsent } from './utils/lgpdConsent';
import Layout from './components/Layout';
import UnsavedNavigationGuard from './components/UnsavedNavigationGuard';
import LoadingFallback from './components/common/LoadingFallback';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { TurmaProvider } from './contexts/TurmaContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/common/Toast';
import { ADMIN_ROLES, SEMEC_ROLE, STAFF_ROLES } from './constants/authConstants';
import ErrorBoundary from './components/common/ErrorBoundary';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';
import MissingEnvScreen from './components/common/MissingEnvScreen';
import { isSupabaseConfigured } from './lib/supabase';

const Login = React.lazy(() => import('./pages/Login'));
const RecuperarSenha = React.lazy(() => import('./pages/RecuperarSenha'));
const RedefinirSenha = React.lazy(() => import('./pages/RedefinirSenha'));

const Turmas = React.lazy(() => import('./pages/Turmas'));
const Diario = React.lazy(() => import('./pages/Diario'));
const RelatorioNotas = React.lazy(() => import('./pages/RelatorioNotas'));
const RelatorioMedias = React.lazy(() => import('./pages/RelatorioMedias'));
const RelatorioConteudos = React.lazy(() => import('./pages/RelatorioConteudos'));
const RelatorioFrequencia = React.lazy(() => import('./pages/RelatorioFrequencia'));
const RelatorioBoletins = React.lazy(() => import('./pages/RelatorioBoletins'));
const Frequencia = React.lazy(() => import('./pages/Frequencia'));
const Estatisticas = React.lazy(() => import('./pages/Estatisticas'));
const PendenciasLancamento = React.lazy(() => import('./pages/PendenciasLancamento'));
const PendenciasFrequencia = React.lazy(() => import('./pages/PendenciasFrequencia'));
const Administracao = React.lazy(() => import('./pages/Administracao'));
const Aparata = React.lazy(() => import('./pages/Aparata'));
const AparataDetalhes = React.lazy(() => import('./pages/AparataDetalhes'));
const PortalAluno = React.lazy(() => import('./pages/PortalAluno'));
const Curriculo = React.lazy(() => import('./pages/Curriculo'));

const PoliticaPrivacidade = React.lazy(() => import('./pages/PoliticaPrivacidade'));
const TermosUso = React.lazy(() => import('./pages/TermosUso'));
const SolicitacaoLgpd = React.lazy(() => import('./pages/SolicitacaoLgpd'));
const MinhaPrivacidade = React.lazy(() => import('./pages/MinhaPrivacidade'));

const CookieBanner = React.lazy(() => import('./components/CookieBanner'));

/** FIX #17: Página 404 com redirect por role para evitar loop ALUNO → /turmas → redirect */
function NotFoundPage() {
  const { user } = useAuth();
  const homeUrl = user?.role === 'ALUNO'
    ? '/portal-aluno'
    : user?.role === SEMEC_ROLE || (user?.role && ADMIN_ROLES.includes(user.role))
    ? '/administracao'
    : '/turmas';
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
        <div className="text-6xl font-black text-slate-200 mb-4">404</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Página não encontrada</h2>
        <p className="text-slate-500 mb-6">A página que você procura não existe ou foi movida.</p>
        <Link to={homeUrl} className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#14594f] text-white font-bold rounded-xl hover:bg-[#10483f] transition shadow-lg shadow-[#14594f]/20">
          Voltar ao Início
        </Link>
      </div>
    </div>
  );
}

function StaffProvidersWrapper() {
  return (
    <OfflineProvider>
      <TurmaProvider>
        <Outlet />
      </TurmaProvider>
    </OfflineProvider>
  );
}

function RootLayout() {
  const [showCookieBanner] = useState(() => !getSavedConsent());
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Outlet />
      {showCookieBanner && <CookieBanner />}
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        element: <ProtectedRoute publicOnly />,
        children: [
          { path: '/', element: <Login /> },
          { path: '/recuperar-senha', element: <RecuperarSenha /> },
          { path: '/redefinir-senha', element: <RedefinirSenha /> },
        ],
      },
      {
        path: '/politica-de-privacidade',
        element: <PublicDocumentLayout><PoliticaPrivacidade /></PublicDocumentLayout>,
      },
      {
        path: '/termos-de-uso',
        element: <PublicDocumentLayout><TermosUso /></PublicDocumentLayout>,
      },
      {
        path: '/solicitacao-lgpd',
        element: <PublicDocumentLayout><SolicitacaoLgpd /></PublicDocumentLayout>,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/minha-privacidade',
            element: (
              <RouteErrorBoundary>
                <PublicDocumentLayout><MinhaPrivacidade /></PublicDocumentLayout>
              </RouteErrorBoundary>
            ),
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={['ALUNO']} />,
        children: [
          {
            path: '/portal-aluno',
            element: <RouteErrorBoundary><PortalAluno /></RouteErrorBoundary>,
          },
        ],
      },
      {
        element: <ProtectedRoute allowedRoles={STAFF_ROLES} />,
        children: [
          {
            element: <StaffProvidersWrapper />,
            children: [
              {
                element: <UnsavedNavigationGuard />,
                children: [
                  {
                    element: <Layout />,
                    children: [
                      { path: '/turmas', element: <RouteErrorBoundary><Turmas /></RouteErrorBoundary> },
                      { path: '/diario', element: <RouteErrorBoundary><Diario /></RouteErrorBoundary> },
                      { path: '/relatorio-notas', element: <RouteErrorBoundary><RelatorioNotas /></RouteErrorBoundary> },
                      { path: '/relatorio-medias', element: <RouteErrorBoundary><RelatorioMedias /></RouteErrorBoundary> },
                      { path: '/relatorio-conteudos', element: <RouteErrorBoundary><RelatorioConteudos /></RouteErrorBoundary> },
                      { path: '/relatorio-frequencia', element: <RouteErrorBoundary><RelatorioFrequencia /></RouteErrorBoundary> },
                      { path: '/frequencia', element: <RouteErrorBoundary><Frequencia /></RouteErrorBoundary> },
                      { path: '/aparata', element: <RouteErrorBoundary><Aparata /></RouteErrorBoundary> },
                      { path: '/aparata-detalhes', element: <RouteErrorBoundary><AparataDetalhes /></RouteErrorBoundary> },
                      {
                        element: <ProtectedRoute allowedRoles={[...ADMIN_ROLES, SEMEC_ROLE]} />,
                        children: [
                          { path: '/administracao', element: <RouteErrorBoundary><Administracao /></RouteErrorBoundary> },
                        ],
                      },
                      {
                        element: <ProtectedRoute allowedRoles={ADMIN_ROLES} />,
                        children: [
                          { path: '/relatorio-boletins', element: <RouteErrorBoundary><RelatorioBoletins /></RouteErrorBoundary> },
                          { path: '/estatisticas', element: <RouteErrorBoundary><Estatisticas /></RouteErrorBoundary> },
                          { path: '/pendencias-lancamento', element: <RouteErrorBoundary><PendenciasLancamento /></RouteErrorBoundary> },
                          { path: '/pendencias-frequencia', element: <RouteErrorBoundary><PendenciasFrequencia /></RouteErrorBoundary> },
                        ],
                      },
                      {
                        element: <ProtectedRoute allowedRoles={['ADMIN']} />,
                        children: [
                          { path: '/curriculo', element: <RouteErrorBoundary><Curriculo /></RouteErrorBoundary> },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  if (!isSupabaseConfigured) {
    return <MissingEnvScreen />;
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
