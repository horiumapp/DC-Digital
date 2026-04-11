import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
// Importamos o Fallback e os Providers de forma direta, pois são a base
import LoadingFallback from './components/common/LoadingFallback';
import { AuthProvider } from './contexts/AuthContext';
import { TurmaProvider } from './contexts/TurmaContext';
import ProtectedRoute from './components/ProtectedRoute';

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
const Atividades = React.lazy(() => import('./pages/Atividades'));
const Estatisticas = React.lazy(() => import('./pages/Estatisticas'));
const PendenciasLancamento = React.lazy(() => import('./pages/PendenciasLancamento'));
const PendenciasFrequencia = React.lazy(() => import('./pages/PendenciasFrequencia'));
const Administracao = React.lazy(() => import('./pages/Administracao'));
const Aparata = React.lazy(() => import('./pages/Aparata'));
const AparataDetalhes = React.lazy(() => import('./pages/AparataDetalhes'));

export default function App() {
  return (
    <AuthProvider>
      <TurmaProvider>
        <Router>
          {/* Suspense isola e exibe a tela de carregamento para as páginas fatiadas serem importadas */}
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/recuperar-senha" element={<RecuperarSenha />} />
              <Route path="/redefinir-senha" element={<RedefinirSenha />} />
              
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
                  <Route path="/atividades" element={<Atividades />} />
                  <Route path="/estatisticas" element={<Estatisticas />} />
                  <Route path="/pendencias-lancamento" element={<PendenciasLancamento />} />
                  <Route path="/pendencias-frequencia" element={<PendenciasFrequencia />} />
                  <Route path="/aparata" element={<Aparata />} />
                  <Route path="/aparata-detalhes" element={<AparataDetalhes />} />
                  
                  {/* Rotas Restritas (Apenas Administrativo) */}
                  <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'GESTOR', 'SECRETARIO']} />}>
                    <Route path="/administracao" element={<Administracao />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </TurmaProvider>
    </AuthProvider>
  );
}
