import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
// Importamos o Fallback e os Providers de forma direta, pois são a base
import LoadingFallback from './components/common/LoadingFallback';
import { AuthProvider } from './contexts/AuthContext';
import { TurmaProvider } from './contexts/TurmaContext';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './components/common/Toast';
import { ADMIN_ROLES } from './constants/authConstants';

// Lazy loading das páginas principais para dividir o peso do javascript
const Login = React.lazy(() => import('./pages/Login'));
const Cadastro = React.lazy(() => import('./pages/Cadastro'));
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

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <TurmaProvider>
          <Router>
            {/* Suspense isola e exibe a tela de carregamento para as páginas fatiadas serem importadas */}
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* Rotas Públicas Apenas (Visitantes) */}
                <Route element={<ProtectedRoute publicOnly />}>
                  <Route path="/" element={<Login />} />
                  {/* Cadastro público desativado — contas são criadas exclusivamente pelo Admin */}
                  {/* <Route path="/cadastro" element={<Cadastro />} /> */}
                  <Route path="/recuperar-senha" element={<RecuperarSenha />} />
                  <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                </Route>
                
                {/* Rotas Privadas (Qualquer Usuário Logado) */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route path="/turmas" element={<Turmas />} />
                    <Route path="/diario" element={<Diario />} />
                    <Route path="/relatorio-notas" element={<RelatorioNotas />} />
                    <Route path="/relatorio-medias" element={<RelatorioMedias />} />
                    <Route path="/relatorio-conteudos" element={<RelatorioConteudos />} />
                    <Route path="/relatorio-frequencia" element={<RelatorioFrequencia />} />
                    <Route path="/frequencia" element={<Frequencia />} />
                    <Route path="/estatisticas" element={<Estatisticas />} />
                    <Route path="/pendencias-lancamento" element={<PendenciasLancamento />} />
                    <Route path="/pendencias-frequencia" element={<PendenciasFrequencia />} />
                    <Route path="/aparata" element={<Aparata />} />
                    <Route path="/aparata-detalhes" element={<AparataDetalhes />} />
                    
                    {/* Rotas Restritas (Apenas Administrativo) */}
                    <Route element={<ProtectedRoute allowedRoles={ADMIN_ROLES} />}>
                      <Route path="/administracao" element={<Administracao />} />
                    </Route>
                  </Route>
                </Route>

                {/* Rota 404 — Página não encontrada */}
                <Route path="*" element={
                  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200 text-center max-w-md w-full">
                      <div className="text-6xl font-black text-slate-200 mb-4">404</div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2">Página não encontrada</h2>
                      <p className="text-slate-500 mb-6">A página que você procura não existe ou foi movida.</p>
                      <a href="/turmas" className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-[#0f2851] text-white font-bold rounded-xl hover:bg-[#1a3a6d] transition shadow-lg shadow-[#0f2851]/20">
                        Voltar ao Início
                      </a>
                    </div>
                  </div>
                } />
              </Routes>
            </Suspense>
          </Router>
        </TurmaProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
