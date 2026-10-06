import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Search, X, Package, ArrowRight } from 'lucide-react';
import { storage } from '../../services/storage';
import { Produto } from '../../types';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Produto[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  // Keyboard shortcut for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter products when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const prods = storage.getProdutos().filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.codigo_barras && p.codigo_barras.includes(q))
    );
    setSearchResults(prods.slice(0, 5));
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#000000] text-white flex">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Top glowing laser indicator on route change */}
      <div key={`progress-${location.pathname}`} className="route-progress" />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        <TopBar
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onOpenSearch={() => setSearchModalOpen(true)}
        />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 w-full">
          <div key={location.pathname} className="page-enter w-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Cmd+K Global Search Modal */}
      {searchModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[999] flex items-start justify-center pt-20 px-4">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
              onClick={() => setSearchModalOpen(false)}
            />
            <div className="relative w-full max-w-xl rounded-2xl bg-[#000000] border border-white/[0.16] shadow-2xl overflow-hidden z-10 animate-scale-in">
              <div className="flex items-center gap-3 p-4 border-b border-white/[0.16]">
                <Search className="w-5 h-5 text-emerald-400 animate-pulse" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nome, SKU ou leitor de código de barras (EAN)..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={() => setSearchModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] btn-press transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 max-h-80 overflow-y-auto">
                {searchQuery && searchResults.length === 0 && (
                  <div className="p-6 text-center text-sm text-slate-400">
                    Nenhum produto encontrado para "{searchQuery}".
                  </div>
                )}
                {searchResults.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setSearchModalOpen(false);
                      navigate('/produtos');
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.04] cursor-pointer group btn-press table-row-hover transition-all"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-medium text-white truncate">{prod.nome}</div>
                        <div className="text-xs text-slate-400">
                          SKU: {prod.sku} • EAN: {prod.codigo_barras || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-400">
                          R$ {prod.preco_venda.toFixed(2)}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {prod.estoque_total} un em estoque
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                    </div>
                  </div>
                ))}
                {!searchQuery && (
                  <div className="p-4 text-xs text-slate-500 flex items-center justify-between">
                    <span>Navegação Rápida: Digite para buscar qualquer item do catálogo.</span>
                    <kbd className="px-2 py-0.5 rounded bg-[#000000] text-slate-300 border border-white/[0.16]">ESC para fechar</kbd>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
