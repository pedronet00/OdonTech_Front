import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './presentation/components/Layout';
import { Login } from './presentation/pages/Login';
import { Patients } from './presentation/pages/Patients';
import { Schedule } from './presentation/pages/Schedule';
import { Records } from './presentation/pages/Records';
import { Finance } from './presentation/pages/Finance';
import { Professionals } from './presentation/pages/Professionals';
import { AuthProvider, useAuth } from './application/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/entrar" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/entrar" element={<Login />} />

          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/pacientes" replace />} />
            <Route path="pacientes" element={<Patients />} />
            <Route path="prontuarios/:id" element={<Records />} />
            <Route path="agenda" element={<Schedule />} />
            <Route path="financeiro" element={<Finance />} />
            <Route path="profissionais" element={<Professionals />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
