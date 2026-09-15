import React, { useState } from 'react';
import {
  Store,
  Search,
  LogOut,
  ChevronDown,
  Building2,
  Menu,
  Check,
  ShieldCheck,
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
            className={`h-11 flex items-center gap-2.5 px-3.5 sm:px-4 rounded-xl border transition-all text-xs sm:text-sm font-semibold btn-press ${
              storeDropdownOpen
                ? 'bg-[#142522] border-[#10B981]/50 text-[#F3FBF6] shadow-glow-emerald'
                : 'bg-[#0D1917] border-[rgba(142,182,155,0.18)] hover:bg-[#142522] hover:border-[#10B981]/40 text-[#F3FBF6]'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse flex-shrink-0" />
            <Store className="w-4 h-4 text-[#8EB69B] flex-shrink-0" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              {activeLoja?.nome || 'Selecionar Loja'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#94A89E] flex-shrink-0 transition-transform duration-300 ${
                storeDropdownOpen ? 'rotate-180 text-[#10B981]' : ''
              }`}
            />
          </button>

          {storeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity"
                onClick={() => setStoreDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2.5 w-72 rounded-2xl bg-[#0D1917]/95 backdrop-blur-xl border border-[rgba(142,182,155,0.22)] shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(16,185,129,0.15)] p-2 z-50 dropdown-enter-left">
                <div className="px-3 py-2 text-[11px] font-semibold text-[#8EB69B] uppercase tracking-wider border-b border-[rgba(142,182,155,0.12)] mb-1 flex items-center justify-between">
                  <span>Filiais da Rede</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#142522] text-[#10B981]">
                    {lojas.length}
                  </span>
                </div>
                {lojas.map((loja: Loja) => (
                  <button
                    key={loja.id}
                    onClick={() => {
                      setActiveLoja(loja);
                      setStoreDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-sm transition-all btn-press ${
                      activeLoja?.id === loja.id
                        ? 'bg-[#142522] text-[#10B981] font-semibold border border-[#10B981]/30 shadow-sm'
                        : 'text-[#F3FBF6] hover:bg-[#142522]/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building2 className="w-4 h-4 text-[#8EB69B] flex-shrink-0" />
                      <div className="truncate">
                        <div className="truncate text-xs font-semibold">{loja.nome}</div>
                        <div className="text-[10px] text-[#94A89E] font-mono">{loja.cnpj}</div>
                      </div>
                    </div>
                    {activeLoja?.id === loja.id && (
                      <Check className="w-4 h-4 text-[#10B981] flex-shrink-0 ml-2" />
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
          className="h-10 w-full flex items-center justify-between px-4 rounded-xl bg-[#0D1917] border border-[rgba(142,182,155,0.14)] text-xs text-[#94A89E] hover:border-[rgba(142,182,155,0.3)] hover:text-[#F3FBF6] btn-press transition-all"
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

      {/* Right: User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`h-11 flex items-center gap-3 pl-2 pr-3.5 rounded-2xl border transition-all duration-200 btn-press flex-shrink-0 ${
              userMenuOpen
                ? 'bg-[#142522] border-[#10B981]/60 shadow-glow-emerald ring-2 ring-[#10B981]/20'
                : 'bg-[#0D1917] border-[rgba(142,182,155,0.18)] hover:bg-[#142522] hover:border-[#10B981]/40'
            }`}
          >
            {/* Avatar with subtle glow ring and status dot */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#10B981] via-[#059669] to-[#0B2B26] flex items-center justify-center font-bold text-xs text-white uppercase shadow-sm border border-[#10B981]/30 flex-shrink-0 relative">
              {user?.nome ? user.nome.charAt(0) : 'U'}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] ring-2 ring-[#0D1917]" />
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-[#F3FBF6] leading-tight tracking-wide">
                {user?.nome || 'Operador'}
              </span>
              <span className="text-[10px] text-[#10B981] font-mono font-semibold uppercase tracking-wider leading-tight">
                {user?.role || 'DONO'}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#94A89E] flex-shrink-0 transition-transform duration-300 ${
                userMenuOpen ? 'rotate-180 text-[#10B981]' : ''
              }`}
            />
          </button>

          {userMenuOpen && (
            <>
              {/* Subtle backdrop overlay */}
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] transition-opacity"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-[#0D1917]/95 backdrop-blur-xl border border-[rgba(142,182,155,0.22)] shadow-[0_12px_40px_rgba(0,0,0,0.7),0_0_20px_rgba(16,185,129,0.15)] p-2.5 z-50 dropdown-enter">
                {/* User Info Card inside dropdown */}
                <div className="p-3 rounded-xl bg-[#142522]/60 border border-[rgba(142,182,155,0.12)] mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10B981] to-[#0B2B26] flex items-center justify-center font-extrabold text-sm text-white uppercase shadow-sm border border-[#10B981]/30 flex-shrink-0">
                    {user?.nome ? user.nome.charAt(0) : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#F3FBF6] truncate">{user?.nome}</div>
                    <div className="text-[11px] text-[#94A89E] truncate font-mono">{user?.email}</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                      <ShieldCheck className="w-3 h-3" />
                      {user?.role || 'DONO'}
                    </div>
                  </div>
                </div>

                {/* Logout Action Button */}
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/15 border border-transparent hover:border-red-500/30 btn-press transition-all group"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
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
