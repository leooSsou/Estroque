import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Produtos } from './pages/Produtos';
import { Estoque } from './pages/Estoque';
import { LedgerAuditoria } from './pages/LedgerAuditoria';
import { NFeImport } from './pages/NFeImport';
import { Transferencias } from './pages/Transferencias';
import { Auditoria } from './pages/Auditoria';
import { PDVVendas } from './pages/PDVVendas';
import { Financeiro } from './pages/Financeiro';
import { Contatos } from './pages/Contatos';
import { Analytics } from './pages/Analytics';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070E0D] flex items-center justify-center text-[#10B981]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#10B981] border-t-transparent animate-spin" />
          <span className="text-xs text-[#94A89E] font-mono">Iniciando ESTROQUE...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="produtos" element={<Produtos />} />
              <Route path="estoque" element={<Estoque />} />
              <Route path="ledger" element={<LedgerAuditoria />} />
              <Route path="nfe" element={<NFeImport />} />
              <Route path="transferencias" element={<Transferencias />} />
              <Route path="auditoria" element={<Auditoria />} />
              <Route path="pdv" element={<PDVVendas />} />
              <Route path="financeiro" element={<Financeiro />} />
              <Route path="contatos" element={<Contatos />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
