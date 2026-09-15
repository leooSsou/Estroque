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

        {/* Center Hero Card: Authentic ERP System Console */}
        <div className="my-12 lg:my-0 z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0D1917]/90 border border-[rgba(142,182,155,0.22)] text-xs font-mono text-[#DAF1DE] shadow-inner">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="font-semibold text-[#10B981]">ESTROQUE ERP</span>
            <span className="text-[#5E756B]">|</span>
            <span className="text-[#8EB69B]">Ambiente de Produção v2.4</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-[#F3FBF6] leading-snug">
              Plataforma Central de Gestão & Frente de Caixa
            </h1>

            <p className="text-sm text-[#94A89E] leading-relaxed">
              Operação de inventário multi-filiais, conciliação fiscal em tempo real e controle financeiro integrado para redes de varejo e atacado.
            </p>
          </div>

          {/* Operational Services Monitor (Real ERP Feel) */}
          <div className="rounded-2xl bg-[#0D1917]/85 border border-[rgba(142,182,155,0.18)] p-4 backdrop-blur-md space-y-3 shadow-bento-dark">
            <div className="flex items-center justify-between text-xs pb-2.5 border-b border-[rgba(142,182,155,0.1)]">
              <span className="font-mono text-[#DAF1DE] font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10B981]" />
                Status dos Módulos Operacionais
              </span>
              <span className="text-[11px] font-mono text-[#10B981] font-bold flex items-center gap-1.5 bg-[#142522] px-2 py-0.5 rounded-md border border-[#10B981]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                100% Operacional
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070E0D]/70 border border-[rgba(142,182,155,0.1)]">
                <span className="text-[#94A89E] text-xs">SEFAZ / NF-e 4.0</span>
                <span className="text-[#10B981] font-bold text-xs">Conectado</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070E0D]/70 border border-[rgba(142,182,155,0.1)]">
                <span className="text-[#94A89E] text-xs">Frente de Caixa (PDV)</span>
                <span className="text-[#10B981] font-bold text-xs">Ativo</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070E0D]/70 border border-[rgba(142,182,155,0.1)]">
                <span className="text-[#94A89E] text-xs">Ledger de Auditoria</span>
                <span className="text-[#10B981] font-bold text-xs">SHA-256</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#070E0D]/70 border border-[rgba(142,182,155,0.1)]">
                <span className="text-[#94A89E] text-xs">Rede Multi-Lojas</span>
                <span className="text-[#10B981] font-bold text-xs">Sincronizada</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#070E0D]/40 border border-[rgba(142,182,155,0.1)] text-xs text-[#8EB69B]">
            <Store className="w-4 h-4 text-[#10B981] flex-shrink-0" />
            <span>Sessão corporativa autenticada com isolamento de dados por inquilino.</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-[#5E756B] z-10">
          © {new Date().getFullYear()} ESTROQUE Sistemas de Gestão. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Column: Authentication Card */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md bg-[#0D1917] border border-[rgba(142,182,155,0.18)] rounded-3xl p-8 shadow-bento-dark">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4 lg:hidden">
              <img
                src="/favicon.png"
                alt="ESTROQUE"
                className="w-9 h-9 object-contain drop-shadow-[0_0_15px_rgba(16,185,129,0.35)]"
              />
              <span className="font-extrabold text-xl tracking-widest text-[#F3FBF6] uppercase font-mono">
                ESTROQUE
              </span>
            </div>
            <h2 className="text-2xl font-bold text-[#F3FBF6]">Acesso ao Sistema</h2>
            <p className="text-xs text-[#94A89E] mt-1">
              Entre com suas credenciais de inquilino para acessar sua rede.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider mb-1.5">
                E-mail Corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#10B981] absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="usuario@loja.com.br"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-medium text-[#F3FBF6] placeholder-[#7A9988] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-[#A2B89B] uppercase tracking-wider">Senha</label>
                <span className="text-xs text-[#8EB69B] hover:text-[#10B981] transition-colors cursor-pointer font-medium">
                  Esqueceu a senha?
                </span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#10B981] absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.22)] text-sm font-medium text-[#F3FBF6] placeholder-[#7A9988] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-extrabold text-sm shadow-glow-emerald transition-all flex items-center justify-center gap-2 group disabled:opacity-50 btn-press cursor-pointer"
              >
                <span>{loading ? 'Validando credenciais...' : 'Acessar Plataforma'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[rgba(142,182,155,0.15)]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0D1917] px-3 text-[#7A9988] font-mono font-semibold">acesso rápido</span>
            </div>
          </div>

          {/* 1-Click Demo Login */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-[#142522] hover:bg-[#163832] border border-[rgba(142,182,155,0.25)] hover:border-[#10B981]/50 text-sm font-bold text-[#DAF1DE] transition-all flex items-center justify-center gap-2 btn-press cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            <span>Entrar em Modo Demonstração (Dono da Rede)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
