import React from 'react';
import { NavLink } from 'react-router-dom';
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
  Store,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {
  const { activeLoja } = useAuth();

  const navItems = [
    { to: '/', label: 'Visão Geral', icon: LayoutDashboard, badge: null },
    { to: '/produtos', label: 'Produtos & Markup', icon: Package, badge: 'Bling' },
    { to: '/estoque', label: 'Estoque & Saldos', icon: Boxes, badge: null },
    { to: '/ledger', label: 'Ledger & Auditoria', icon: ScrollText, badge: 'Imutável' },
    { to: '/nfe', label: 'Importar NF-e XML', icon: FileSpreadsheet, badge: 'v4.00' },
    { to: '/transferencias', label: 'Transferências', icon: ArrowLeftRight, badge: null },
    { to: '/pdv', label: 'Balcão / PDV', icon: ShoppingCart, badge: 'Crediário' },
    { to: '/financeiro', label: 'Financeiro & Caixa', icon: Wallet, badge: null },
    { to: '/contatos', label: 'Clientes & Contatos', icon: Users, badge: null },
    { to: '/analytics', label: 'Curva ABC (Pareto)', icon: BarChart3, badge: 'BI' },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 bottom-0 z-40 bg-[#070E0D] border-r border-[rgba(142,182,155,0.12)] transition-all duration-300 flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header: Aligned h-20 with TopBar */}
      <div
        className={`h-20 flex items-center border-b border-[rgba(142,182,155,0.12)] flex-shrink-0 ${
          collapsed
            ? 'flex-col justify-center gap-1.5 px-2'
            : 'justify-between px-4 sm:px-5'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 overflow-hidden'}`}>
          <img
            src="/favicon.png"
            alt="ESTROQUE"
            className={`${collapsed ? 'w-8 h-8' : 'w-9 h-9'} object-contain drop-shadow-[0_0_12px_rgba(16,185,129,0.3)] flex-shrink-0`}
          />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-lg tracking-wider text-[#F3FBF6] uppercase leading-tight font-mono truncate">
                ESTROQUE
              </span>
              <span className="text-[10px] text-[#10B981] font-semibold tracking-widest uppercase truncate">
                ENTERPRISE ERP
              </span>
            </div>
          )}
        </div>

        {/* Collapse toggle button inside sidebar header */}
        <button
          onClick={onToggleCollapse}
          className={`${collapsed ? 'p-1' : 'p-1.5'} rounded-lg text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] transition-colors flex-shrink-0`}
          title={collapsed ? 'Expandir Menu' : 'Recolher Menu'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-3.5 h-3.5 text-[#8EB69B]" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-[#8EB69B]" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <div
        className={`flex-1 overflow-y-auto py-4 space-y-1.5 ${
          collapsed ? 'px-2 flex flex-col items-center' : 'px-3'
        }`}
      >
        {!collapsed && (
          <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#5E756B]">
            Módulos Operacionais
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group flex items-center rounded-xl transition-all duration-200 relative ${
                  collapsed
                    ? 'w-11 h-11 justify-center'
                    : 'w-full gap-3 px-3.5 py-2.5 text-sm font-medium'
                } ${
                  isActive
                    ? 'bg-[#142522] text-[#10B981] shadow-sm border border-[rgba(16,185,129,0.25)]'
                    : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#0D1917]'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
              {!collapsed && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#163832] text-[#8EB69B] border border-[rgba(142,182,155,0.15)] font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Active Store Indicator at Footer */}
      <div
        className={`p-3 border-t border-[rgba(142,182,155,0.12)] bg-[#0D1917]/70 flex-shrink-0 ${
          collapsed ? 'flex justify-center' : ''
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2.5'}`}>
          <div
            className="w-10 h-10 rounded-xl bg-[#142522] border border-[rgba(142,182,155,0.18)] flex items-center justify-center text-[#10B981] flex-shrink-0"
            title={collapsed ? (activeLoja?.nome || 'Loja Matriz') : undefined}
          >
            <Store className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-[11px] text-[#5E756B] uppercase font-semibold">Loja Ativa</div>
              <div className="text-xs font-semibold text-[#F3FBF6] truncate">
                {activeLoja?.nome || 'Loja Matriz'}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
