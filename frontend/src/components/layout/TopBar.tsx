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
  User as UserIcon,
  Plus,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Loja, User } from '../../types';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';

interface TopBarProps {
  onToggleSidebar: () => void;
  onOpenSearch?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, onOpenSearch }) => {
  const { user, lojas, activeLoja, setActiveLoja, refreshLojas, logout } = useAuth();
  const { toast } = useToast();
  const [storeDropdownOpen, setStoreDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Nova Filial Modal
  const [newStoreModalOpen, setNewStoreModalOpen] = useState(false);
  const [lojaNome, setLojaNome] = useState('');
  const [lojaCnpj, setLojaCnpj] = useState('');
  const [lojaEndereco, setLojaEndereco] = useState('');
  const [submittingStore, setSubmittingStore] = useState(false);

  // Equipe & Acessos Modal
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [equipe, setEquipe] = useState<User[]>([]);
  const [userNome, setUserNome] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userSenha, setUserSenha] = useState('');
  const [userRole, setUserRole] = useState<'GERENTE' | 'DONO'>('GERENTE');
  const [userLojaId, setUserLojaId] = useState('');
  const [submittingUser, setSubmittingUser] = useState(false);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  const handleOpenTeamModal = async () => {
    setUserMenuOpen(false);
    setTeamModalOpen(true);
    if (!userLojaId && lojas.length > 0) {
      setUserLojaId(activeLoja?.id || lojas[0].id);
    }
    try {
      const list = await api.getUsuarios();
      setEquipe(list);
    } catch {
      if (user) setEquipe([user]);
    }
  };

  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    try {
      const novo = await api.createUsuario({
        nome: userNome,
        email: userEmail,
        senha: userSenha,
        role: userRole,
        loja_atribuida_id: userRole === 'GERENTE' ? userLojaId || activeLoja?.id || null : null,
      });
      toast.success(`Colaborador "${novo.nome}" (${novo.role}) cadastrado com sucesso!`);
      setUserNome('');
      setUserEmail('');
      setUserSenha('');
      const list = await api.getUsuarios();
      setEquipe(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar colaborador.';
      toast.error(msg);
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleCreateLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingStore(true);
    try {
      const nova = await api.createLoja({
        nome: lojaNome,
        cnpj: lojaCnpj,
        endereco: lojaEndereco,
        ativo: true,
      });
      await refreshLojas();
      setActiveLoja(nova);
      toast.success(`Filial "${nova.nome}" cadastrada e selecionada com sucesso!`);
      setNewStoreModalOpen(false);
      setLojaNome('');
      setLojaCnpj('');
      setLojaEndereco('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao cadastrar nova filial.';
      toast.error(msg);
    } finally {
      setSubmittingStore(false);
    }
  };

  return (
    <header className="relative h-20 bg-[#000000] sticky top-0 z-30 px-6 lg:px-8 flex items-center justify-between flex-shrink-0">
      {/* Left: Mobile Toggle & Store Switcher */}
      <div className="flex items-center gap-3 sm:gap-4 z-10">
        {/* Only visible on mobile/tablet screens */}
        <button
          onClick={onToggleSidebar}
          className="md:hidden h-10 w-10 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors flex items-center justify-center border border-white/[0.16]"
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
                ? 'bg-[#000000] border-white/[0.30] text-white shadow-sm'
                : 'bg-[#000000] border-white/[0.16] hover:bg-white/[0.06] hover:border-white/[0.25] text-slate-200'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
            <Store className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="max-w-[140px] sm:max-w-[200px] truncate">
              {activeLoja?.nome || 'Selecionar Loja'}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                storeDropdownOpen ? 'rotate-180 text-white' : ''
              }`}
            />
          </button>

          {storeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
                onClick={() => setStoreDropdownOpen(false)}
              />
              <div className="absolute left-0 mt-2.5 w-72 rounded-2xl bg-[#000000] backdrop-blur-xl border border-white/[0.16] shadow-2xl p-2 z-50 dropdown-enter-left">
                <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/[0.16] mb-1 flex items-center justify-between">
                  <span>Filiais da Rede</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#000000] text-emerald-400 border border-emerald-500/20">
                    {lojas.length}
                  </span>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {lojas.map((loja: Loja) => (
                    <button
                      key={loja.id}
                      onClick={() => {
                        setActiveLoja(loja);
                        setStoreDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-sm transition-all btn-press ${
                        activeLoja?.id === loja.id
                          ? 'bg-[#000000] text-emerald-400 font-semibold border border-emerald-500/40 shadow-sm'
                          : 'text-slate-200 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <div className="truncate">
                          <div className="truncate text-xs font-semibold">{loja.nome}</div>
                          <div className="text-[10px] text-slate-400">{loja.cnpj}</div>
                        </div>
                      </div>
                      {activeLoja?.id === loja.id && (
                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>

                {user?.role !== 'GERENTE' && (
                  <div className="pt-2 mt-1.5 border-t border-white/[0.16]">
                    <button
                      onClick={() => {
                        setStoreDropdownOpen(false);
                        setNewStoreModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Nova Filial</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Global Search Bar - Mathematically Centered in TopBar */}
      <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 w-full max-w-md lg:max-w-lg pointer-events-none px-4">
        <button
          onClick={onOpenSearch}
          className="h-11 w-full pointer-events-auto flex items-center justify-between px-4 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-slate-400 hover:border-white/[0.30] hover:bg-white/[0.04] hover:text-white btn-press transition-all duration-300 group shadow-sm"
          title={`Buscar em todo o sistema (${isMac ? '⌘K' : 'Ctrl+K'})`}
        >
          <div className="flex items-center gap-2.5 truncate">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-white group-hover:scale-110 transition-all duration-200 flex-shrink-0" />
            <span className="truncate">Buscar produtos, EAN, clientes, vendas...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#000000] text-slate-400 group-hover:text-white border border-white/[0.16] transition-all duration-200 flex-shrink-0 ml-2 shadow-sm">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        </button>
      </div>

      {/* Right: User Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 z-10">

        {/* User Profile Button */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-95 flex-shrink-0 group cursor-pointer ${
              userMenuOpen
                ? 'bg-[#000000] border-white/[0.40] text-white shadow-sm'
                : 'bg-[#000000] border-white/[0.16] hover:border-white/[0.3] hover:bg-white/[0.06] text-slate-300 hover:text-white'
            }`}
            title={`Perfil de ${user?.nome || 'Usuário'}`}
            aria-label="Menu do Usuário"
          >
            <UserIcon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
          </button>

          {userMenuOpen && (
            <>
              {/* Subtle backdrop overlay */}
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2.5 w-64 rounded-2xl bg-[#000000] backdrop-blur-xl border border-white/[0.16] shadow-2xl p-2.5 z-50 dropdown-enter">
                {/* User Info Card inside dropdown */}
                <div className="p-3 rounded-xl bg-[#000000] border border-white/[0.16] mb-2 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#000000] border border-white/[0.15] flex items-center justify-center text-emerald-400 shadow-sm flex-shrink-0">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">{user?.nome || 'Operador'}</div>
                    <div className="text-[11px] text-slate-400 truncate">{user?.email || 'operador@estroque.com.br'}</div>
                    <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#000000] text-emerald-400 border border-emerald-500/30">
                      <ShieldCheck className="w-3 h-3" />
                      {user?.role || 'DONO'}
                    </div>
                  </div>
                </div>

                {user?.role !== 'GERENTE' && (
                  <button
                    onClick={handleOpenTeamModal}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 mb-1 rounded-xl text-left text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.16] btn-press transition-all"
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Equipe & Acessos</span>
                  </button>
                )}

                {/* Logout Action Button */}
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-transparent hover:border-rose-500/30 btn-press transition-all group"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal: Cadastrar Nova Filial */}
      <Modal
        isOpen={newStoreModalOpen}
        onClose={() => setNewStoreModalOpen(false)}
        title="Cadastrar Nova Loja / Filial"
      >
        <form onSubmit={handleCreateLoja} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nome da Filial
            </label>
            <input
              type="text"
              required
              value={lojaNome}
              onChange={(e) => setLojaNome(e.target.value)}
              placeholder="Ex: Filial Shopping Norte"
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              CNPJ da Filial (14 dígitos válidos)
            </label>
            <input
              type="text"
              required
              value={lojaCnpj}
              onChange={(e) => setLojaCnpj(e.target.value)}
              placeholder="00.000.000/0002-00"
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Endereço Completo
            </label>
            <input
              type="text"
              required
              value={lojaEndereco}
              onChange={(e) => setLojaEndereco(e.target.value)}
              placeholder="Av. Central, 500 - Loja 12"
              className="w-full h-11 px-3.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.16]">
            <button
              type="button"
              onClick={() => setNewStoreModalOpen(false)}
              className="h-11 px-5 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-sm font-semibold text-slate-300 hover:text-white border border-white/[0.16] active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submittingStore}
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            >
              {submittingStore ? 'Cadastrando...' : 'Salvar Filial'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Equipe & Acessos */}
      <Modal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        title="Gestão de Equipe & Acessos"
      >
        <div className="space-y-5">
          {/* Lista de Colaboradores Cadastrados */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Usuários Ativos na Empresa ({equipe.length})
            </div>
            <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
              {equipe.map((u) => {
                const lojaVinculada = lojas.find((l) => l.id === u.loja_atribuida_id);
                return (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-[#000000] border border-white/[0.16] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{u.nome}</div>
                      <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                      {lojaVinculada && (
                        <div className="text-[10px] text-emerald-400 mt-0.5 truncate">
                          Filial: {lojaVinculada.nome}
                        </div>
                      )}
                    </div>
                    <Badge variant={u.role === 'DONO' ? 'emerald' : 'blue'}>{u.role}</Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formulário de Novo Colaborador */}
          <form onSubmit={handleCreateUsuario} className="space-y-3.5 pt-4 border-t border-white/[0.16]">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              + Cadastrar Novo Gerente / Operador
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={userNome}
                  onChange={(e) => setUserNome(e.target.value)}
                  placeholder="Ex: Lucas Operador"
                  className="w-full h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  E-mail de Login
                </label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="lucas@loja.com.br"
                  className="w-full h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Senha Inicial (mín. 6)
                </label>
                <input
                  type="password"
                  minLength={6}
                  required
                  value={userSenha}
                  onChange={(e) => setUserSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as 'GERENTE' | 'DONO')}
                  className="w-full h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="GERENTE">GERENTE (Restrito à Filial)</option>
                  <option value="DONO">DONO (Acesso Total à Rede)</option>
                </select>
              </div>
            </div>

            {userRole === 'GERENTE' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Filial Atribuída ao Gerente
                </label>
                <select
                  required
                  value={userLojaId}
                  onChange={(e) => setUserLojaId(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  {lojas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome} ({l.cnpj})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.16]">
              <button
                type="button"
                onClick={() => setTeamModalOpen(false)}
                className="h-10 px-4 rounded-xl bg-[#000000] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white border border-white/[0.16] transition-all"
              >
                Fechar
              </button>
              <button
                type="submit"
                disabled={submittingUser}
                className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all"
              >
                {submittingUser ? 'Salvando...' : 'Criar Acesso'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </header>
  );
};


