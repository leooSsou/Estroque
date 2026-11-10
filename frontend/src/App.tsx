import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AppShell } from './components/layout/AppShell';

import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

// Lazy loading sob demanda para otimizar carregamento inicial (code splitting)
const Produtos = lazy(() => import('./pages/Produtos').then(m => ({ default: m.Produtos })));
const Estoque = lazy(() => import('./pages/Estoque').then(m => ({ default: m.Estoque })));
const LedgerAuditoria = lazy(() => import('./pages/LedgerAuditoria').then(m => ({ default: m.LedgerAuditoria })));
const NFeImport = lazy(() => import('./pages/NFeImport').then(m => ({ default: m.NFeImport })));
const Transferencias = lazy(() => import('./pages/Transferencias').then(m => ({ default: m.Transferencias })));
const Auditoria = lazy(() => import('./pages/Auditoria').then(m => ({ default: m.Auditoria })));
const PDVVendas = lazy(() => import('./pages/PDVVendas').then(m => ({ default: m.PDVVendas })));
const Financeiro = lazy(() => import('./pages/Financeiro').then(m => ({ default: m.Financeiro })));
const Contatos = lazy(() => import('./pages/Contatos').then(m => ({ default: m.Contatos })));
const Analytics = lazy(() => import('./pages/Analytics').then(m => ({ default: m.Analytics })));
const SuperAdmin = lazy(() => import('./pages/SuperAdmin').then(m => ({ default: m.SuperAdmin })));

const PageLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-emerald-500">
    <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
    <span className="text-xs text-slate-400">Carregando tela...</span>
  </div>
);

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Visão Geral',
  '/produtos': 'Produtos',
  '/estoque': 'Estoque',
  '/ledger': 'Auditoria & Ledger',
  '/nfe': 'Entrada NF-e',
  '/transferencias': 'Transferências',
  '/auditoria': 'Auditoria',
  '/pdv': 'Frente de Caixa',
  '/financeiro': 'Financeiro',
  '/contatos': 'Contatos',
  '/analytics': 'Curva ABC',
  '/admin': 'Painel Super-Admin',
  '/login': 'Login',
};

const PageTitleUpdater: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const pageName = ROUTE_TITLES[location.pathname] || 'Visão Geral';
    document.title = `${pageName} | Estroque`;
  }, [location.pathname]);

  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-emerald-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400">Iniciando Estroque...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'ADMIN_SAAS' && location.pathname === '/') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

const ModuloRouteGuard: React.FC<{ modulo: string; moduloNome: string; children: React.ReactNode }> = ({
  modulo,
  moduloNome,
  children,
}) => {
  const { hasModulo, user } = useAuth();
  if (user?.role === 'ADMIN_SAAS') return <>{children}</>;

  if (!hasModulo(modulo)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Módulo Não Habilitado</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          O módulo <strong className="text-white">{moduloNome}</strong> não está incluso no plano da sua empresa ou foi temporariamente desativado pelo administrador.
        </p>
        <Link
          to="/"
          className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.14] text-xs font-semibold text-white transition-all"
        >
          Voltar ao Início
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <PageTitleUpdater />
      <AuthProvider>
        <ToastProvider>
          <Suspense fallback={<PageLoader />}>
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
              <Route
                path="ledger"
                element={
                  <ModuloRouteGuard modulo="auditoria" moduloNome="Auditoria & Ledger">
                    <LedgerAuditoria />
                  </ModuloRouteGuard>
                }
              />
              <Route
                path="nfe"
                element={
                  <ModuloRouteGuard modulo="nfe" moduloNome="Entrada NF-e">
                    <NFeImport />
                  </ModuloRouteGuard>
                }
              />
              <Route
                path="transferencias"
                element={
                  <ModuloRouteGuard modulo="transferencias" moduloNome="Transferências">
                    <Transferencias />
                  </ModuloRouteGuard>
                }
              />
              <Route
                path="auditoria"
                element={
                  <ModuloRouteGuard modulo="auditoria" moduloNome="Auditoria Física">
                    <Auditoria />
                  </ModuloRouteGuard>
                }
              />
              <Route
                path="pdv"
                element={
                  <ModuloRouteGuard modulo="pdv" moduloNome="Frente de Caixa (PDV)">
                    <PDVVendas />
                  </ModuloRouteGuard>
                }
              />
              <Route
                path="financeiro"
                element={
                  <ModuloRouteGuard modulo="financeiro" moduloNome="Financeiro">
                    <Financeiro />
                  </ModuloRouteGuard>
                }
              />
              <Route
                path="contatos"
                element={
                  <ModuloRouteGuard modulo="contatos" moduloNome="Contatos & Crediário">
                    <Contatos />
                  </ModuloRouteGuard>
                }
              />
              <Route
                path="analytics"
                element={
                  <ModuloRouteGuard modulo="analytics" moduloNome="Curva ABC & Analytics">
                    <Analytics />
                  </ModuloRouteGuard>
                }
              />
              <Route path="admin" element={<SuperAdmin />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
