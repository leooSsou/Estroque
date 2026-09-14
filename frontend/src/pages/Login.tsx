import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ShieldCheck, Zap, Store, ArrowRight, Lock, Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('dono@estroque.com.br');
  const [password, setPassword] = useState('senha123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Autenticação realizada com sucesso!');
      navigate('/');
    } catch {
      toast.error('Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await login('dono@estroque.com.br', 'senha123');
      toast.success('Bem-vindo ao ESTROQUE (Sessão de Demonstração)');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070E0D] text-[#F3FBF6] flex flex-col lg:flex-row">
      {/* Left Column: Brand Hero Showcase */}
      <div className="lg:w-1/2 bg-gradient-to-br from-[#070E0D] via-[#0B2B26] to-[#163832] p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-[rgba(142,182,155,0.15)]">
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#10B981]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#0B2B26]/60 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand */}
        <div className="flex items-center gap-3.5 z-10">
          <img
            src="/favicon.png"
            alt="ESTROQUE"
            className="w-12 h-12 object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          />
          <span className="font-extrabold text-2xl tracking-widest text-[#F3FBF6] uppercase font-mono">
            ESTROQUE
          </span>
        </div>

        {/* Center Hero Card */}
        <div className="my-12 lg:my-0 z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#142522] border border-[#10B981]/30 text-xs font-semibold text-[#10B981]">
            <Zap className="w-3.5 h-3.5" />
            <span>Sistema Operacional de Varejo & Estoque</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-[#F3FBF6] leading-tight">
            Gestão precisa de ponta a ponta.
          </h1>

          <p className="text-sm lg:text-base text-[#94A89E] leading-relaxed">
            Catálogo completo com código de barras, formação de preço por Markup inteligente,
            controle de filiais, ledger de auditoria fiscal e ponto de venda com crediário.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <div className="p-3.5 rounded-2xl bg-[#0D1917]/70 border border-[rgba(142,182,155,0.14)] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#10B981] mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span>Ledger Imutável</span>
              </div>
              <p className="text-[11px] text-[#94A89E]">
                Rastreabilidade fiscal completa de todas as entradas e saídas.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#0D1917]/70 border border-[rgba(142,182,155,0.14)] backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#10B981] mb-1">
                <Store className="w-4 h-4" />
                <span>Multi-Lojas Nativo</span>
              </div>
              <p className="text-[11px] text-[#94A89E]">
                Transferências entre filiais com conferência cega e blindagem de estoque.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-[#5E756B] z-10">
          © {new Date().getFullYear()} ESTROQUE. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md bg-[#0D1917] border border-[rgba(142,182,155,0.18)] rounded-3xl p-8 shadow-bento-dark">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-[#F3FBF6]">Acesso ao Sistema</h2>
            <p className="text-xs text-[#94A89E] mt-1">
              Entre com suas credenciais de inquilino para acessar sua rede.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#94A89E] mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8EB69B] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@loja.com.br"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-sm text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#94A89E]">Senha</label>
                <span className="text-[11px] text-[#8EB69B] hover:underline cursor-pointer">
                  Esqueceu a senha?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8EB69B] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] text-sm text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-sm shadow-glow-emerald transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                <span>{loading ? 'Validando...' : 'Acessar Plataforma'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(142,182,155,0.1)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0D1917] px-3 text-[#5E756B] font-mono">ou</span>
            </div>
          </div>

          {/* 1-Click Demo Login */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-full bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] text-xs font-semibold text-[#DAF1DE] transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Entrar com Conta de Demonstração (Dono)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
