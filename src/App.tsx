/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Turmas from './pages/Turmas';
import Diario from './pages/Diario';
import RelatorioNotas from './pages/RelatorioNotas';
import RelatorioMedias from './pages/RelatorioMedias';
import Frequencia from './pages/Frequencia';
import Estatisticas from './pages/Estatisticas';
import PendenciasLancamento from './pages/PendenciasLancamento';
import PendenciasFrequencia from './pages/PendenciasFrequencia';
import Administracao from './pages/Administracao';
import Aparata from './pages/Aparata';
import AparataDetalhes from './pages/AparataDetalhes';
import { AuthProvider } from './contexts/AuthContext';
import { TurmaProvider } from './contexts/TurmaContext';

export default function App() {
  return (
    <AuthProvider>
      <TurmaProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />
          <Route element={<Layout />}>
            <Route path="/turmas" element={<Turmas />} />
            <Route path="/diario" element={<Diario />} />
            <Route path="/relatorio-notas" element={<RelatorioNotas />} />
            <Route path="/relatorio-medias" element={<RelatorioMedias />} />
            <Route path="/frequencia" element={<Frequencia />} />
            <Route path="/estatisticas" element={<Estatisticas />} />
            <Route path="/pendencias-lancamento" element={<PendenciasLancamento />} />
            <Route path="/pendencias-frequencia" element={<PendenciasFrequencia />} />
            <Route path="/administracao" element={<Administracao />} />
            <Route path="/aparata" element={<Aparata />} />
            <Route path="/aparata-detalhes" element={<AparataDetalhes />} />
          </Route>
        </Routes>
      </Router>
      </TurmaProvider>
    </AuthProvider>
  );
}
