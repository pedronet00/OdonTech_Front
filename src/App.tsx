import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './presentation/components/Layout';
import { Login } from './presentation/pages/Login';
import { AdminLogin } from './presentation/pages/AdminLogin';
import { RegistroClinica } from './presentation/pages/RegistroClinica';
import { CadastroIntegrado } from './presentation/pages/CadastroIntegrado';
import { Patients } from './presentation/pages/Patients';
import { Schedule } from './presentation/pages/Schedule';
import { Records } from './presentation/pages/Records';
import { Finance } from './presentation/pages/Finance';
import { Professionals } from './presentation/pages/Professionals';
import { Settings } from './presentation/pages/Settings';
import { AuthProvider, useAuth } from './application/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/entrar" replace />;
}

/** Telas que a secretária não acessa (a API responde 403). */
function ProfissionalRoute({ children }: { children: React.ReactNode }) {
  const { isSecretaria } = useAuth();
  return isSecretaria ? <Navigate to="/agenda" replace /> : children;
}

function HomeRedirect() {
  const { isSecretaria } = useAuth();
  return <Navigate to={isSecretaria ? '/agenda' : '/pacientes'} replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/entrar" element={<Login />} />
          <Route path="/entrar/admin" element={<AdminLogin />} />
          <Route path="/registro" element={<RegistroClinica />} />
          <Route path="/cadastro-integrado/:guid" element={<CadastroIntegrado />} />

          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<HomeRedirect />} />
            <Route path="pacientes" element={<Patients />} />
            <Route path="prontuarios/:id" element={<Records />} />
            <Route path="agenda" element={<Schedule />} />
            <Route path="financeiro" element={<ProfissionalRoute><Finance /></ProfissionalRoute>} />
            <Route path="profissionais" element={<Professionals />} />
            <Route path="configuracoes" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
