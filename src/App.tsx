import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import RecuperarSenha from './pages/RecuperarSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Turmas from './pages/Turmas';
import Diario from './pages/Diario';
import RelatorioNotas from './pages/RelatorioNotas';
import RelatorioMedias from './pages/RelatorioMedias';
import RelatorioConteudos from './pages/RelatorioConteudos';
import Frequencia from './pages/Frequencia';
import Estatisticas from './pages/Estatisticas';
import PendenciasLancamento from './pages/PendenciasLancamento';
import PendenciasFrequencia from './pages/PendenciasFrequencia';
import Administracao from './pages/Administracao';
import Aparata from './pages/Aparata';
import AparataDetalhes from './pages/AparataDetalhes';
import { AuthProvider } from './contexts/AuthContext';
import { TurmaProvider } from './contexts/TurmaContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <TurmaProvider>
        <Router>
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
                <Route path="/frequencia" element={<Frequencia />} />
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
        </Router>
      </TurmaProvider>
    </AuthProvider>
  );
}
