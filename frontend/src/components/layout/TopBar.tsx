import React, { useState } from 'react';
import {
  Store,
  Search,
  Bell,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Building2,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Loja } from '../../types';

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenSearch?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onOpenSearch }) => {
  const { user, lojas, activeLoja, setActiveLoja, logout } = useAuth();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-20 bg-[#070E0D]/95 backdrop-blur-md border-b border-[rgba(142,182,155,0.12)] sticky top-0 z-30 px-6 lg:px-8 flex items-center justify-between flex-shrink-0">
      {/* Left: Mobile Toggle & Store Switcher */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Only visible on mobile/tablet screens */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden h-10 w-10 rounded-xl text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] transition-colors flex items-center justify-center border border-[rgba(142,182,155,0.14)]"
          title="Alternar Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Store Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setStoreDropdownOpen(!storeDropdownOpen)}
            className="h-10 flex items-center gap-2.5 px-3.5 sm:px-4 rounded-xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] hover:bg-[#142522] hover:border-[#10B981]/40 transition-all text-xs sm:text-sm font-semibold text-[#F3FBF6]"
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
            <Store className="w-4 h-4 text-[#8EB69B] flex-shrink-0" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              {activeLoja?.nome || 'Selecionar Loja'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A89E] flex-shrink-0" />
          </button>

          {storeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setStoreDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#1B332E] border border-[rgba(142,182,155,0.2)] shadow-bento-dark p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3 py-2 text-[11px] font-semibold text-[#8EB69B] uppercase tracking-wider border-b border-[rgba(142,182,155,0.12)] mb-1">
                  Filiais da Rede ({lojas.length})
                </div>
                {lojas.map((loja: Loja) => (
                  <button
                    key={loja.id}
                    onClick={() => {
                      setActiveLoja(loja);
                      setStoreDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-sm transition-all ${
                      activeLoja?.id === loja.id
                        ? 'bg-[#142522] text-[#10B981] font-semibold border border-[#10B981]/30'
                        : 'text-[#F3FBF6] hover:bg-[#142522]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className="w-4 h-4 text-[#8EB69B] flex-shrink-0" />
                      <div className="truncate">
                        <div className="truncate text-xs">{loja.nome}</div>
                        <div className="text-[10px] text-[#94A89E] font-mono">{loja.cnpj}</div>
                      </div>
                    </div>
                    {activeLoja?.id === loja.id && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] font-mono">
                        Ativa
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-6 lg:mx-8">
        <button
          onClick={onOpenSearch}
          className="h-10 w-full flex items-center justify-between px-4 rounded-xl bg-[#0D1917] border border-[rgba(142,182,155,0.14)] text-xs text-[#94A89E] hover:border-[rgba(142,182,155,0.3)] hover:text-[#F3FBF6] transition-all"
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 text-[#8EB69B] flex-shrink-0" />
            <span className="truncate">Buscar produtos, EAN, clientes, vendas...</span>
          </div>
          <kbd className="hidden lg:inline-block px-2 py-0.5 text-[10px] font-mono rounded bg-[#142522] text-[#8EB69B] border border-[rgba(142,182,155,0.18)] flex-shrink-0 ml-2">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Status Pill, Notifications & User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Ledger Status Pill */}
        <div className="hidden xl:flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#163832]/60 border border-[rgba(142,182,155,0.18)] text-[11px] font-medium text-[#DAF1DE]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Ledger Imutável</span>
        </div>

        {/* Notifications */}
        <button
          className="h-10 w-10 rounded-xl bg-[#0D1917] border border-[rgba(142,182,155,0.14)] text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] transition-colors flex items-center justify-center relative flex-shrink-0"
          title="Notificações do Sistema"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
        </button>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="h-10 flex items-center gap-2.5 pl-1.5 pr-3 sm:pr-3.5 rounded-xl bg-[#0D1917] border border-[rgba(142,182,155,0.14)] hover:bg-[#142522] transition-colors flex-shrink-0"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#10B981] to-[#0B2B26] flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm flex-shrink-0">
              {user?.nome ? user.nome.charAt(0) : 'U'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-[#F3FBF6] leading-tight">
                {user?.nome || 'Operador'}
              </span>
              <span className="text-[10px] text-[#10B981] font-mono leading-tight">
                {user?.role || 'DONO'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A89E] flex-shrink-0" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#1B332E] border border-[rgba(142,182,155,0.2)] shadow-bento-dark p-2 z-50 animate-in fade-in zoom-in-95">
                <div className="p-2.5 border-b border-[rgba(142,182,155,0.12)]">
                  <div className="text-xs font-semibold text-[#F3FBF6]">{user?.nome}</div>
                  <div className="text-[11px] text-[#94A89E] truncate">{user?.email}</div>
                </div>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 mt-1 rounded-xl text-left text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
