import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import {
  ShieldCheck,
  Zap,
  Store,
  ArrowRight,
  Lock,
  Mail,
} from 'lucide-react';

export const Login: React.FC = () => {
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Autenticação realizada com sucesso!');
      try {
        const me = await api.getMe();
        if (me.role === 'ADMIN_SAAS') {
          navigate('/admin');
          return;
        }
      } catch {
        // fallback
      }
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas. Tente novamente.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background Ambient Glow Effects */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Left Column: Brand Hero Showcase (Exclusivo para Desktop / Telas Grandes) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#000000] p-8 lg:p-16 flex-col justify-between relative overflow-hidden border-r border-white/[0.16]">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand */}
        <div className="flex items-center gap-3.5 z-10">
          <img
            src="/favicon.png"
            alt="Estroque"
            width="48"
            height="48"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          />
          <span className="font-bold text-xl sm:text-2xl tracking-wide text-white">
            Estroque
          </span>
        </div>

        {/* Center Hero Card */}
        <div className="my-8 lg:my-0 z-10 space-y-4 sm:space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#000000] border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Sistema Operacional de Varejo & Estoque</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Gestão precisa de ponta a ponta.
          </h1>

          <p className="text-xs sm:text-sm lg:text-base text-slate-300 leading-relaxed">
            Catálogo completo com código de barras, formação de preço por Markup inteligente,
            controle de filiais, ledger de auditoria fiscal e ponto de venda com crediário.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 sm:pt-4">
            <div className="p-3.5 rounded-2xl bg-[#000000] border border-white/[0.16] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Ledger Imutável</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Rastreabilidade fiscal completa de todas as entradas e saídas.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#000000] border border-white/[0.16] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 mb-1">
                <Store className="w-4 h-4" />
                <span>Multi-Lojas Nativo</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Transferências entre filiais com conferência cega e blindagem de estoque.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 z-10">
          © {new Date().getFullYear()} Estroque. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-16 min-h-screen z-10">
        <div className="w-full max-w-md bg-[#000000] border border-white/[0.16] rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl my-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4 lg:hidden">
              <img
                src="/favicon.png"
                alt="Estroque"
                className="w-9 h-9 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]"
              />
              <span className="font-bold text-xl tracking-wide text-white">
                Estroque
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white">
              Acesso ao Sistema
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Entre com suas credenciais para acessar o painel de gerenciamento.
            </p>
          </div>

          <form onSubmit={handleSubmitLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@loja.com.br"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">Senha</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#000000] border border-white/[0.16] text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-95"
              >
                <span>{loading ? 'Validando...' : 'Acessar Plataforma'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-white/[0.08] text-center text-xs text-slate-500">
            Precisa de acesso ou deseja cadastrar sua empresa?
            <span className="block text-slate-400 mt-1">O cadastro é gerenciado exclusivamente pela equipe de administração.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
