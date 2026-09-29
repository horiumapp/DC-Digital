import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet, Link } from 'react-router-dom';
import Layout from './components/Layout';
// Importamos o Fallback e os Providers de forma direta, pois são a base
import LoadingFallback from './components/common/LoadingFallback';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { OfflineProvider } from './contexts/OfflineContext';
import { TurmaProvider } from './contexts/TurmaContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/common/Toast';
import { ADMIN_ROLES, STAFF_ROLES } from './constants/authConstants';
import ErrorBoundary from './components/common/ErrorBoundary';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';

// Lazy loading das páginas principais para dividir o peso do javascript
const Login = React.lazy(() => import('./pages/Login'));
const RecuperarSenha = React.lazy(() => import('./pages/RecuperarSenha'));
const RedefinirSenha = React.lazy(() => import('./pages/RedefinirSenha'));

const Turmas = React.lazy(() => import('./pages/Turmas'));
const Diario = React.lazy(() => import('./pages/Diario'));
const RelatorioNotas = React.lazy(() => import('./pages/RelatorioNotas'));
const RelatorioMedias = React.lazy(() => import('./pages/RelatorioMedias'));
const RelatorioConteudos = React.lazy(() => import('./pages/RelatorioConteudos'));
const RelatorioFrequencia = React.lazy(() => import('./pages/RelatorioFrequencia'));
const Frequencia = React.lazy(() => import('./pages/Frequencia'));
const Estatisticas = React.lazy(() => import('./pages/Estatisticas'));
const PendenciasLancamento = React.lazy(() => import('./pages/PendenciasLancamento'));
const PendenciasFrequencia = React.lazy(() => import('./pages/PendenciasFrequencia'));
const Administracao = React.lazy(() => import('./pages/Administracao'));
const Aparata = React.lazy(() => import('./pages/Aparata'));
const AparataDetalhes = React.lazy(() => import('./pages/AparataDetalhes'));
const PortalAluno = React.lazy(() => import('./pages/PortalAluno'));
const Curriculo = React.lazy(() => import('./pages/Curriculo'));

// Novas páginas LGPD
const PoliticaPrivacidade = React.lazy(() => import('./pages/PoliticaPrivacidade'));
const TermosUso = React.lazy(() => import('./pages/TermosUso'));
const SolicitacaoLgpd = React.lazy(() => import('./pages/SolicitacaoLgpd'));
const MinhaPrivacidade = React.lazy(() => import('./pages/MinhaPrivacidade'));

// FIX #10: CookieBanner convertido para lazy import para reduzir o bundle inicial.
// Só é necessário para visitantes não logados.
const CookieBanner = React.lazy(() => import('./components/CookieBanner'));


/** FIX #17: Página 404 com redirect por role para evitar loop ALUNO → /turmas → redirect */
function NotFoundPage() {
  const { user } = useAuth();
  const homeUrl = user?.role === 'ALUNO' ? '/portal-aluno' : '/turmas';
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
        <div className="text-6xl font-black text-slate-200 mb-4">404</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Página não encontrada</h2>
        <p className="text-slate-500 mb-6">A página que você procura não existe ou foi movida.</p>
        <Link to={homeUrl} className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#0f2851] text-white font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20">
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

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <Router>
            {/* Suspense isola e exibe a tela de carregamento para as páginas fatiadas serem importadas */}
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Rotas Públicas Apenas (Visitantes) */}
                <Route element={<ProtectedRoute publicOnly />}>
                  <Route path="/" element={<Login />} />
                  <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                </Route>
                
                {/* Rotas Legais Públicas (Acessíveis a qualquer visitante) */}
                <Route path="/politica-de-privacidade" element={<PoliticaPrivacidade />} />
                <Route path="/termos-de-uso" element={<TermosUso />} />
                <Route path="/solicitacao-lgpd" element={<SolicitacaoLgpd />} />

                {/* Rota Privada de Privacidade (Acessível a qualquer usuário logado) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/minha-privacidade" element={<RouteErrorBoundary><MinhaPrivacidade /></RouteErrorBoundary>} />
                </Route>

                {/* Rota exclusiva do Portal do Aluno (sem Layout/sidebar) */}
                <Route element={<ProtectedRoute allowedRoles={['ALUNO']} />}>
                  <Route path="/portal-aluno" element={<RouteErrorBoundary><PortalAluno /></RouteErrorBoundary>} />
                </Route>

                {/* Rotas Privadas (Servidores - qualquer logado exceto ALUNO) */}
                <Route element={<ProtectedRoute allowedRoles={STAFF_ROLES} />}>
                  <Route element={<StaffProvidersWrapper />}>
                    <Route element={<Layout />}>
                      <Route path="/turmas" element={<RouteErrorBoundary><Turmas /></RouteErrorBoundary>} />
                      <Route path="/diario" element={<RouteErrorBoundary><Diario /></RouteErrorBoundary>} />
                      <Route path="/relatorio-notas" element={<RouteErrorBoundary><RelatorioNotas /></RouteErrorBoundary>} />
                      <Route path="/relatorio-medias" element={<RouteErrorBoundary><RelatorioMedias /></RouteErrorBoundary>} />
                      <Route path="/relatorio-conteudos" element={<RouteErrorBoundary><RelatorioConteudos /></RouteErrorBoundary>} />
                      <Route path="/relatorio-frequencia" element={<RouteErrorBoundary><RelatorioFrequencia /></RouteErrorBoundary>} />
                      <Route path="/frequencia" element={<RouteErrorBoundary><Frequencia /></RouteErrorBoundary>} />
                      <Route path="/estatisticas" element={<RouteErrorBoundary><Estatisticas /></RouteErrorBoundary>} />
                      <Route path="/pendencias-lancamento" element={<RouteErrorBoundary><PendenciasLancamento /></RouteErrorBoundary>} />
                      <Route path="/pendencias-frequencia" element={<RouteErrorBoundary><PendenciasFrequencia /></RouteErrorBoundary>} />
                      <Route path="/aparata" element={<RouteErrorBoundary><Aparata /></RouteErrorBoundary>} />
                      <Route path="/aparata-detalhes" element={<RouteErrorBoundary><AparataDetalhes /></RouteErrorBoundary>} />
                      
                      {/* Rotas Restritas (Apenas Administrativo) */}
                      <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
                        <Route path="/administracao" element={<RouteErrorBoundary><Administracao /></RouteErrorBoundary>} />
                        <Route path="/curriculo" element={<RouteErrorBoundary><Curriculo /></RouteErrorBoundary>} />
                      </Route>
                    </Route>
                  </Route>
                </Route>

                {/* Rota 404 — Página não encontrada (FIX #17: redireciona por role) */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
              <CookieBanner />
            </Suspense>
          </Router>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
