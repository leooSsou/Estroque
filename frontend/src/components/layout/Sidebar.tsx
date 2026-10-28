import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Boxes,
  ScrollText,
  FileSpreadsheet,
  ArrowLeftRight,
  ShoppingCart,
  Wallet,
  Users,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Building2,
  Sliders,
  Store,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Para o ADMIN_SAAS, armazena se a seção de testes de loja está expandida
  const [showStoreModules, setShowStoreModules] = useState<boolean>(() => {
    return localStorage.getItem('estroque_admin_show_store_modules') === 'true';
  });

  const toggleStoreModules = () => {
    setShowStoreModules((prev) => {
      const next = !prev;
      localStorage.setItem('estroque_admin_show_store_modules', String(next));
      return next;
    });
  };

  const isSuperAdmin = user?.role === 'ADMIN_SAAS';

  // Itens exclusivos do Super-Admin
  const superAdminNavItems = [
    { to: '/admin', tab: 'geral', label: 'Dashboard Global', icon: LayoutDashboard },
    { to: '/admin?tab=tenants', tab: 'tenants', label: 'Inquilinos (Tenants)', icon: Building2 },
    { to: '/admin?tab=planos', tab: 'planos', label: 'Planos & Limites', icon: Sliders },
  ];

  // Módulos operacionais de loja
  const storeNavItems = [
    { to: '/', label: 'Visão Geral da Loja', icon: LayoutDashboard },
    { to: '/produtos', label: 'Produtos', icon: Package },
    { to: '/estoque', label: 'Estoque', icon: Boxes },
    { to: '/pdv', label: 'Frente de Caixa (PDV)', icon: ShoppingCart },
    { to: '/financeiro', label: 'Financeiro', icon: Wallet },
    { to: '/transferencias', label: 'Transferências', icon: ArrowLeftRight },
    { to: '/nfe', label: 'Entrada NF-e', icon: FileSpreadsheet },
    { to: '/ledger', label: 'Auditoria & Ledger', icon: ScrollText },
    { to: '/contatos', label: 'Contatos', icon: Users },
    { to: '/analytics', label: 'Curva ABC', icon: BarChart3 },
  ];

  const isSuperAdminItemActive = (itemTab: string) => {
    if (location.pathname !== '/admin') return false;
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab') || 'geral';
    return currentTab === itemTab;
  };

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[#000000] border-r border-white/[0.10] transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div
        className={`h-20 flex items-center bg-[#000000] flex-shrink-0 ${
          collapsed
            ? 'flex-col justify-center gap-1.5 px-2'
            : 'justify-between px-4 sm:px-5'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 overflow-hidden'}`}>
          <img
            src="/favicon.png"
            alt="Estroque"
            width="36"
            height="36"
            className={`${collapsed ? 'w-8 h-8' : 'w-9 h-9'} object-contain flex-shrink-0`}
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-lg tracking-wide text-white leading-tight truncate">
                Estroque
              </span>
              {isSuperAdmin && (
                <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">
                  Console SaaS
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          className={`${collapsed ? 'p-1' : 'p-1.5'} rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors flex-shrink-0`}
          title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div
        className={`flex-1 overflow-y-auto py-4 space-y-1.5 bg-[#000000] ${
          collapsed ? 'px-2 flex flex-col items-center' : 'px-3'
        }`}
      >
        {/* ============================================================== */}
        {/* CASO 1: SUPER-ADMIN (ADMIN_SAAS)                                */}
        {/* ============================================================== */}
        {isSuperAdmin ? (
          <>
            {!collapsed && (
              <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-purple-400 flex items-center justify-between">
                <span>Administração SaaS</span>
                <Badge variant="purple">SUPER</Badge>
              </div>
            )}

            {/* Menu Principal de Super Admin */}
            {superAdminNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = isSuperAdminItemActive(item.tab);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center rounded-xl transition-all duration-200 relative btn-press ${
                    collapsed
                      ? 'w-11 h-11 justify-center'
                      : 'w-full gap-3 px-3.5 py-2.5 text-sm font-medium'
                  } ${
                    isActive
                      ? 'bg-purple-950/40 text-purple-200 font-bold border border-purple-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  {!collapsed && isActive && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-purple-500 rounded-r-full" />
                  )}
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-purple-400' : 'text-slate-400'
                    }`}
                  />
                  {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                </NavLink>
              );
            })}

            {/* ============================================================== */}
            {/* SEÇÃO RECOLHÍVEL: AMBIENTE DE TESTES DA LOJA                    */}
            {/* ============================================================== */}
            <div className="pt-4 mt-4 border-t border-white/[0.08] w-full">
              {!collapsed ? (
                <button
                  type="button"
                  onClick={toggleStoreModules}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                  title="Expandir ou recolher os módulos normais de loja para testes"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Store className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span className="truncate">Módulos da Loja</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      Testes
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                        showStoreModules ? 'rotate-180 text-white' : ''
                      }`}
                    />
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleStoreModules}
                  className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all ${
                    showStoreModules
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                  title={showStoreModules ? 'Recolher Módulos de Loja' : 'Abrir Módulos de Loja (Testes)'}
                >
                  <Store className="w-5 h-5 text-emerald-400" />
                </button>
              )}

              {/* Lista dos módulos de loja: só exibe se o Super-Admin tiver clicado para expandir */}
              {showStoreModules && (
                <div className={`mt-2 space-y-1 ${!collapsed ? 'pl-2 border-l border-white/[0.08] ml-2' : ''}`}>
                  {!collapsed && (
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                      Ambiente Operacional
                    </div>
                  )}
                  {storeNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                          `group flex items-center rounded-xl transition-all duration-200 relative btn-press ${
                            collapsed
                              ? 'w-11 h-11 justify-center'
                              : 'w-full gap-2.5 px-3 py-2 text-xs font-medium'
                          } ${
                            isActive
                              ? 'bg-white/[0.08] text-white font-bold border border-white/[0.16] shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                          }`
                        }
                        title={collapsed ? item.label : undefined}
                      >
                        {({ isActive }) => (
                          <>
                            {!collapsed && isActive && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-500 rounded-r-full" />
                            )}
                            <Icon
                              className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                                isActive ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            />
                            {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ============================================================== */
          /* CASO 2: CLIENTES NORMAIS (DONO / GERENTE / VENDEDOR)           */
          /* ============================================================== */
          <>
            {!collapsed && (
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Módulos Operacionais
              </div>
            )}
            {storeNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `group flex items-center rounded-xl transition-all duration-200 relative btn-press ${
                      collapsed
                        ? 'w-11 h-11 justify-center'
                        : 'w-full gap-3 px-3.5 py-2.5 text-sm font-medium'
                    } ${
                      isActive
                        ? 'bg-[#000000] text-white font-bold border border-white/[0.20] shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {!collapsed && isActive && (
                        <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-emerald-500 rounded-r-full" />
                      )}
                      <Icon
                        className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                          isActive ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                      {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                    </>
                  )}
                </NavLink>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
};
