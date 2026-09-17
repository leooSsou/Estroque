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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggleCollapse }) => {

  const navItems = [
    { to: '/', label: 'Visão Geral', icon: LayoutDashboard },
    { to: '/produtos', label: 'Produtos', icon: Package },
    { to: '/estoque', label: 'Estoque', icon: Boxes },
    { to: '/ledger', label: 'Auditoria & Ledger', icon: ScrollText },
    { to: '/nfe', label: 'Entrada NF-e', icon: FileSpreadsheet },
    { to: '/transferencias', label: 'Transferências', icon: ArrowLeftRight },
    { to: '/pdv', label: 'Frente de Caixa', icon: ShoppingCart },
    { to: '/financeiro', label: 'Financeiro', icon: Wallet },
    { to: '/contatos', label: 'Contatos', icon: Users },
    { to: '/analytics', label: 'Curva ABC', icon: BarChart3 },
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
            <span className="font-extrabold text-lg tracking-wider text-[#F3FBF6] uppercase leading-tight font-mono truncate">
              ESTROQUE
            </span>
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
                `group flex items-center rounded-xl transition-all duration-200 relative btn-press ${
                  collapsed
                    ? 'w-11 h-11 justify-center'
                    : 'w-full gap-3 px-3.5 py-2.5 text-sm font-medium'
                } ${
                  isActive
                    ? 'bg-[#142522] text-[#10B981] shadow-sm border border-[#10B981]/30 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] font-semibold'
                    : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#0D1917]'
                }`
              }
              title={collapsed ? item.label : undefined}
            >
              {({ isActive }) => (
                <>
                  {!collapsed && isActive && (
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-[#10B981] rounded-r-full shadow-glow-emerald" />
                  )}
                  <Icon className="w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110" />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};
