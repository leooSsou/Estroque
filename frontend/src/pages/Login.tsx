import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  ShieldCheck,
  Zap,
  Store,
  ArrowRight,
  Lock,
  Mail,
  Building2,
  User,
  FileText,
  MapPin,
} from 'lucide-react';

export const Login: React.FC = () => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login states
  const [email, setEmail] = useState('dono@estroque.com.br');
  const [password, setPassword] = useState('senha123');

  // Register states
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [enderecoLoja, setEnderecoLoja] = useState('');
  const [donoNome, setDonoNome] = useState('');
  const [donoEmail, setDonoEmail] = useState('');
  const [donoSenha, setDonoSenha] = useState('');

  const [loading, setLoading] = useState(false);
  const { login, registerTenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Autenticação realizada com sucesso!');
      navigate('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas. Tente novamente.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await registerTenant({
        nome_fantasia: nomeFantasia,
        razao_social: razaoSocial || nomeFantasia,
        cnpj,
        endereco_loja: enderecoLoja || 'Endereço Matriz Principal',
        dono_nome: donoNome,
        dono_email: donoEmail,
        dono_senha: donoSenha,
      });
      toast.success(`Empresa "${nomeFantasia}" e Loja Matriz criadas com sucesso!`);
      navigate('/');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Erro ao cadastrar empresa. Verifique se o CNPJ é válido.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await login('dono@estroque.com.br', 'senha123');
      toast.success('Bem-vindo ao Estroque (Sessão de Demonstração)');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row">
      {/* Left Column: Brand Hero Showcase */}
      <div className="lg:w-1/2 bg-[#000000] p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-white/[0.16]">
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
            className="w-12 h-12 object-contain drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]"
          />
          <span className="font-bold text-2xl tracking-wide text-white">
            Estroque
          </span>
        </div>

        {/* Center Hero Card */}
        <div className="my-12 lg:my-0 z-10 space-y-6 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#000000] border border-emerald-500/30 text-xs font-semibold text-emerald-400">
            <Zap className="w-3.5 h-3.5" />
            <span>Sistema Operacional de Varejo & Estoque</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
            Gestão precisa de ponta a ponta.
          </h1>

          <p className="text-sm lg:text-base text-slate-300 leading-relaxed">
            Catálogo completo com código de barras, formação de preço por Markup inteligente,
            controle de filiais, ledger de auditoria fiscal e ponto de venda com crediário.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
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

      {/* Right Column: Authentication / Registration Card */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-16">
        <div className="w-full max-w-md bg-[#000000] border border-white/[0.16] rounded-3xl p-8 shadow-2xl">
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

            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-[#000000] border border-white/[0.16] mb-6">
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  mode === 'LOGIN'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Entrar na Conta
              </button>
              <button
                type="button"
                onClick={() => setMode('REGISTER')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  mode === 'REGISTER'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Cadastrar Minha Loja
              </button>
            </div>

            <h2 className="text-2xl font-bold text-white">
              {mode === 'LOGIN' ? 'Acesso ao Sistema' : 'Criar Conta Empresarial'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'LOGIN'
                ? 'Entre com suas credenciais de inquilino para acessar sua rede.'
                : 'Cadastre sua empresa e crie automaticamente sua Loja Matriz no banco.'}
            </p>
          </div>

          {mode === 'LOGIN' ? (
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
          ) : (
            <form onSubmit={handleSubmitRegister} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome Fantasia da Loja
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={nomeFantasia}
                      onChange={(e) => setNomeFantasia(e.target.value)}
                      placeholder="Ex: MegaTech Store"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CNPJ (Válido)
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={cnpj}
                      onChange={(e) => setCnpj(e.target.value)}
                      placeholder="11.222.333/0001-81"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Razão Social
                </label>
                <input
                  type="text"
                  required
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  placeholder="Ex: MegaTech Comercio de Eletronicos Ltda"
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Endereço da Loja Matriz
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={enderecoLoja}
                    onChange={(e) => setEnderecoLoja(e.target.value)}
                    placeholder="Rua Principal, 100 - Centro"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Seu Nome (Proprietário / Dono)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={donoNome}
                    onChange={(e) => setDonoNome(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    E-mail de Acesso
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={donoEmail}
                      onChange={(e) => setDonoEmail(e.target.value)}
                      placeholder="dono@sualoja.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Senha (mín. 6 dígitos)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={donoSenha}
                      onChange={(e) => setDonoSenha(e.target.value)}
                      placeholder="••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#000000] border border-white/[0.16] text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-95"
                >
                  <span>{loading ? 'Criando Empresa e Loja...' : 'Criar Loja e Entrar'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </form>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.16]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#000000] px-3 text-slate-500">ou</span>
            </div>
          </div>

          {/* 1-Click Demo Login */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-full bg-[#000000] hover:bg-white/[0.08] border border-white/[0.16] text-xs font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Entrar com Conta de Demonstração (Dono)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
