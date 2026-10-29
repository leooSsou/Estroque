import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { TenantAdmin, PlataformaDashboardMetrics, TenantDetalhesCompletos } from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import {
  ShieldAlert,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  Store,
  Search,
  RefreshCw,
  Power,
  Sliders,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  LayoutDashboard,
  Zap,
  Crown,
  Sparkles,
  Eye,
  LogIn,
  Package,
  MapPin,
  Mail,
  UserCheck,
} from 'lucide-react';

const PLANOS_INFO: Record<
  string,
  { label: string; badgeVariant: 'neutral' | 'emerald' | 'purple'; mrr: number; lojasMax: number; usuariosMax: number }
> = {
  STARTER: { label: 'Starter', badgeVariant: 'neutral', mrr: 99.0, lojasMax: 1, usuariosMax: 2 },
  PRO: { label: 'Pro', badgeVariant: 'purple', mrr: 249.0, lojasMax: 5, usuariosMax: 10 },
  ENTERPRISE: { label: 'Enterprise', badgeVariant: 'emerald', mrr: 799.0, lojasMax: 50, usuariosMax: 100 },
};

export const SuperAdmin: React.FC = () => {
  const { user, impersonateTenant } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = (searchParams.get('tab') as 'geral' | 'tenants' | 'planos') || 'geral';

  const [metrics, setMetrics] = useState<PlataformaDashboardMetrics | null>(null);
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ATIVOS' | 'SUSPENSOS'>('TODOS');

  // Estado do Modal de Plano
  const [modalTenant, setModalTenant] = useState<TenantAdmin | null>(null);
  const [modalPlano, setModalPlano] = useState<'STARTER' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [modalLimiteLojas, setModalLimiteLojas] = useState(5);
  const [modalLimiteUsuarios, setModalLimiteUsuarios] = useState(10);
  const [savingPlano, setSavingPlano] = useState(false);

  // Estado de alteração de status inline
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  // Estado do Modo Suporte / Impersonate
  const [impersonatingTenantId, setImpersonatingTenantId] = useState<string | null>(null);

  // Estado do Drawer de Detalhes 360°
  const [drawerTenantId, setDrawerTenantId] = useState<string | null>(null);
  const [detalhesTenant, setDetalhesTenant] = useState<TenantDetalhesCompletos | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      try {
        const [dash, tenantsList] = await Promise.all([
          api.getPlataformaDashboard(),
          api.getAdminTenants(),
        ]);
        setMetrics(dash);
        setTenants(tenantsList);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Falha ao carregar dados do painel super-admin';
        toast.error(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (tab: 'geral' | 'tenants' | 'planos') => {
    const nextParams = new URLSearchParams(searchParams);
    if (tab === 'geral') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', tab);
    }
    setSearchParams(nextParams);
  };

  const handleToggleStatus = async (tenant: TenantAdmin) => {
    const novoStatus = !tenant.ativo;
    const confirmMsg = novoStatus
      ? `Deseja reativar o inquilino "${tenant.nome_fantasia}"? Usuários deste tenant poderão fazer login novamente.`
      : `ATENÇÃO: Deseja suspender o inquilino "${tenant.nome_fantasia}"? Usuários deste tenant serão impedidos de efetuar login.`;

    if (!window.confirm(confirmMsg)) return;

    setTogglingStatusId(tenant.id);
    try {
      const updated = await api.alterarStatusTenant(tenant.id, novoStatus);
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(
        `Inquilino "${tenant.nome_fantasia}" foi ${novoStatus ? 'reativado' : 'suspenso'} com sucesso!`
      );
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status do tenant';
      toast.error(msg);
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleOpenModalPlano = (tenant: TenantAdmin) => {
    setModalTenant(tenant);
    setModalPlano(tenant.plano);
    setModalLimiteLojas(tenant.limite_lojas);
    setModalLimiteUsuarios(tenant.limite_usuarios);
  };

  const handleSelectPlanoPredefinido = (plano: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    setModalPlano(plano);
    const info = PLANOS_INFO[plano];
    if (info) {
      setModalLimiteLojas(info.lojasMax);
      setModalLimiteUsuarios(info.usuariosMax);
    }
  };

  const handleSavePlano = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTenant) return;

    setSavingPlano(true);
    try {
      const updated = await api.alterarPlanoTenant(modalTenant.id, {
        plano: modalPlano,
        limite_lojas: Number(modalLimiteLojas),
        limite_usuarios: Number(modalLimiteUsuarios),
      });
      setTenants((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      toast.success(`Plano de "${modalTenant.nome_fantasia}" alterado para ${modalPlano}!`);
      setModalTenant(null);
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar plano';
      toast.error(msg);
    } finally {
      setSavingPlano(false);
    }
  };

  const handleOpenDetalhes = async (tenantId: string) => {
    setDrawerTenantId(tenantId);
    setCarregandoDetalhes(true);
    try {
      const data = await api.getAdminTenantDetalhesCompletos(tenantId);
      setDetalhesTenant(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar visão 360° do inquilino';
      toast.error(msg);
      setDrawerTenantId(null);
    } finally {
      setCarregandoDetalhes(false);
    }
  };

  const handleImpersonate = async (tenant: { id: string; nome_fantasia: string }) => {
    const confirmMsg = `Deseja entrar na conta de "${tenant.nome_fantasia}" em MODO SUPORTE?\n\nVocê navegará na loja como operador autorizado. Um banner no topo permitirá retornar ao Super Admin a qualquer momento.`;
    if (!window.confirm(confirmMsg)) return;

    setImpersonatingTenantId(tenant.id);
    try {
      await impersonateTenant(tenant.id);
      toast.success(`Acessando conta de "${tenant.nome_fantasia}" em modo suporte!`);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao iniciar modo suporte';
      toast.error(msg);
    } finally {
      setImpersonatingTenantId(null);
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      if (statusFilter === 'ATIVOS' && !t.ativo) return false;
      if (statusFilter === 'SUSPENSOS' && t.ativo) return false;

      if (search.trim()) {
        const termo = search.toLowerCase();
        const matchNome = t.nome_fantasia?.toLowerCase().includes(termo);
        const matchRazao = t.razao_social?.toLowerCase().includes(termo);
        const matchCnpj = t.cnpj?.includes(termo);
        return matchNome || matchRazao || matchCnpj;
      }
      return true;
    });
  }, [tenants, statusFilter, search]);

  // Agrupamentos por Plano
  const tenantsPorPlano = useMemo(() => {
    const starter = tenants.filter((t) => t.plano === 'STARTER');
    const pro = tenants.filter((t) => t.plano === 'PRO');
    const enterprise = tenants.filter((t) => t.plano === 'ENTERPRISE');
    return { STARTER: starter, PRO: pro, ENTERPRISE: enterprise };
  }, [tenants]);

  // Top 5 Tenants em Faturamento
  const topTenantsFaturamento = useMemo(() => {
    return [...tenants]
      .sort((a, b) => b.total_vendas_valor - a.total_vendas_valor)
      .slice(0, 5);
  }, [tenants]);

  if (user?.role !== 'ADMIN_SAAS') {
    return (
      <div className="p-8 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito ao Super-Admin</h2>
        <p className="text-sm text-slate-400">
          Você não possui permissão para acessar esta área restrita da plataforma SaaS.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Painel Super-Admin</h1>
            <Badge variant="purple">ADMIN_SAAS</Badge>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Console de comando central do SaaS: controle de receita recorrente, planos e inquilinos.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      {/* Tabs de Navegação do Super-Admin */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        <button
          onClick={() => handleTabChange('geral')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            currentTab === 'geral'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Visão Geral & KPIs</span>
        </button>

        <button
          onClick={() => handleTabChange('tenants')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            currentTab === 'tenants'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Inquilinos (Tenants)</span>
          <span className="text-[10px] bg-white/[0.08] px-1.5 py-0.5 rounded-full font-mono">
            {tenants.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('planos')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            currentTab === 'planos'
              ? 'border-purple-500 text-purple-300 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Planos & Limites</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* ABA 1: VISÃO GERAL & KPIS DA PLATAFORMA                        */}
      {/* ============================================================== */}
      {currentTab === 'geral' && (
        <div className="space-y-6">
          {/* Bento Grid: Métricas da Plataforma */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <BentoCard className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  MRR Estimado
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white tracking-tight">
                  {metrics
                    ? `R$ ${metrics.mrr_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '...'}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400 font-medium">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Receita mensal de assinaturas</span>
                </div>
              </div>
            </BentoCard>

            <BentoCard className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  GMV Transacionado
                </span>
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white tracking-tight">
                  {metrics
                    ? `R$ ${metrics.gmv_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '...'}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                  <span>{metrics?.total_vendas ?? 0} vendas realizadas pelas lojas</span>
                </div>
              </div>
            </BentoCard>

            <BentoCard className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Clientes (Tenants)
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white tracking-tight">
                  {metrics?.total_tenants ?? 0}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-emerald-400 font-semibold">{metrics?.tenants_ativos ?? 0} ativos</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-rose-400 font-semibold">{metrics?.tenants_suspensos ?? 0} suspensos</span>
                </div>
              </div>
            </BentoCard>

            <BentoCard className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Infraestrutura
                </span>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-2xl font-bold text-white tracking-tight">
                  {metrics?.total_lojas ?? 0} <span className="text-sm font-normal text-slate-400">filiais</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>{metrics?.total_usuarios ?? 0} colaboradores ativos</span>
                </div>
              </div>
            </BentoCard>
          </div>

          {/* Grid Secundário: Distribuição de Planos & Top Faturamento */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BentoCard className="p-5">
              <h3 className="text-sm font-bold text-white mb-1">Distribuição por Plano Comercial</h3>
              <p className="text-xs text-slate-400 mb-4">Volume de clientes e MRR gerado por tier de assinatura.</p>

              <div className="space-y-3">
                {(['STARTER', 'PRO', 'ENTERPRISE'] as const).map((p) => {
                  const info = PLANOS_INFO[p];
                  const count = tenantsPorPlano[p].length;
                  const total = tenants.length || 1;
                  const pct = Math.round((count / total) * 100);
                  const receitaPlano = count * info.mrr;

                  return (
                    <div key={p} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Badge variant={info.badgeVariant}>{info.label}</Badge>
                          <span className="text-xs text-slate-400">
                            {count} {count === 1 ? 'cliente' : 'clientes'} ({pct}%)
                          </span>
                        </div>
                        <span className="text-xs font-bold text-white">
                          R$ {receitaPlano.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                        </span>
                      </div>
                      <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            p === 'ENTERPRISE'
                              ? 'bg-emerald-500'
                              : p === 'PRO'
                              ? 'bg-purple-500'
                              : 'bg-slate-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </BentoCard>

            <BentoCard className="p-5">
              <h3 className="text-sm font-bold text-white mb-1">Top Inquilinos por Volume de Vendas</h3>
              <p className="text-xs text-slate-400 mb-4">Empresas com maior faturamento transacionado no sistema.</p>

              <div className="space-y-2.5">
                {topTenantsFaturamento.map((t, idx) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-500 w-4 text-center">
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white truncate">{t.nome_fantasia}</div>
                        <div className="text-[11px] text-slate-500">
                          {t.total_vendas_qtd} vendas • Plano {t.plano}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-emerald-400">
                        R$ {t.total_vendas_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500">{t.total_lojas} filiais</div>
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: INQUILINOS (TENANTS)                                    */}
      {/* ============================================================== */}
      {currentTab === 'tenants' && (
        <BentoCard className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Gestão de Inquilinos</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulte métricas, filiais, colaboradores e controle status de acesso (suspender inadimplentes).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filtros de status */}
              <div className="flex items-center bg-white/[0.04] p-1 rounded-xl border border-white/[0.08]">
                <button
                  onClick={() => setStatusFilter('TODOS')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === 'TODOS'
                      ? 'bg-white/[0.12] text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos ({tenants.length})
                </button>
                <button
                  onClick={() => setStatusFilter('ATIVOS')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === 'ATIVOS'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Ativos ({tenants.filter((t) => t.ativo).length})
                </button>
                <button
                  onClick={() => setStatusFilter('SUSPENSOS')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === 'SUSPENSOS'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Suspensos ({tenants.filter((t) => !t.ativo).length})
                </button>
              </div>

              {/* Busca textual */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome, razão ou CNPJ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.1] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Tabela de Tenants */}
          <div className="overflow-x-auto table-scrollbar mt-4">
            <table className="w-full text-left text-xs min-w-[750px]">
              <thead>
                <tr className="border-b border-white/[0.08] text-slate-400 uppercase font-semibold">
                  <th className="py-3 px-3">Empresa / CNPJ</th>
                  <th className="py-3 px-3">Plano</th>
                  <th className="py-3 px-3 text-center">Lojas</th>
                  <th className="py-3 px-3 text-center">Usuários</th>
                  <th className="py-3 px-3">Faturamento Rede</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
                      Carregando inquilinos...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Nenhum inquilino encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const planoInfo = PLANOS_INFO[t.plano] || { label: t.plano, badgeVariant: 'neutral' };
                    const lojasOcupacao = `${t.total_lojas} / ${t.limite_lojas}`;
                    const usuariosOcupacao = `${t.total_usuarios} / ${t.limite_usuarios}`;
                    const isLojasCritico = t.total_lojas >= t.limite_lojas;
                    const isUsuariosCritico = t.total_usuarios >= t.limite_usuarios;

                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-3 cursor-pointer group" onClick={() => handleOpenDetalhes(t.id)}>
                          <div className="font-semibold text-white text-sm group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                            {t.nome_fantasia}
                            <Eye className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="text-slate-400 text-[11px] truncate max-w-[200px]">{t.razao_social}</div>
                          <div className="text-slate-500 text-[11px] font-mono mt-0.5">{t.cnpj}</div>
                        </td>

                        <td className="py-3.5 px-3">
                          <Badge variant={planoInfo.badgeVariant}>{planoInfo.label}</Badge>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`font-semibold ${
                              isLojasCritico ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          >
                            {lojasOcupacao}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`font-semibold ${
                              isUsuariosCritico ? 'text-amber-400' : 'text-slate-200'
                            }`}
                          >
                            {usuariosOcupacao}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-white">
                            R$ {t.total_vendas_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {t.total_vendas_qtd} {t.total_vendas_qtd === 1 ? 'venda' : 'vendas'}
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          {t.ativo ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              Suspenso
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Botão Visão 360° */}
                            <button
                              onClick={() => handleOpenDetalhes(t.id)}
                              className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                              title="Visão 360° (Detalhes, Lojas e Equipe)"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Botão Acessar Conta (Modo Suporte) */}
                            <button
                              onClick={() => handleImpersonate(t)}
                              disabled={impersonatingTenantId === t.id}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors border border-transparent hover:border-amber-500/20"
                              title="Acessar Conta (Modo Suporte)"
                            >
                              <LogIn className={`w-4 h-4 ${impersonatingTenantId === t.id ? 'animate-pulse text-amber-400' : ''}`} />
                            </button>

                            {/* Botão Alterar Plano */}
                            <button
                              onClick={() => handleOpenModalPlano(t)}
                              className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors border border-transparent hover:border-purple-500/20"
                              title="Alterar Plano e Limites"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>

                            {/* Botão Suspender / Ativar */}
                            <button
                              onClick={() => handleToggleStatus(t)}
                              disabled={togglingStatusId === t.id}
                              className={`p-1.5 rounded-lg transition-colors border ${
                                t.ativo
                                  ? 'text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border-transparent hover:border-rose-500/20'
                                  : 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20'
                              }`}
                              title={t.ativo ? 'Suspender Inquilino' : 'Reativar Inquilino'}
                            >
                              <Power className={`w-4 h-4 ${togglingStatusId === t.id ? 'animate-pulse' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </BentoCard>
      )}

      {/* ============================================================== */}
      {/* ABA 3: PLANOS COMERCIAIS & LIMITES                            */}
      {/* ============================================================== */}
      {currentTab === 'planos' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card Starter */}
            <BentoCard className="p-5 flex flex-col justify-between border-white/[0.12]">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="neutral">Starter</Badge>
                  <span className="text-xs text-slate-400">Pequenos comércios</span>
                </div>
                <div className="text-3xl font-extrabold text-white">
                  R$ 99 <span className="text-sm font-normal text-slate-400">/mês</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Até 1 filial (loja matriz)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Até 2 colaboradores</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PDV e Frente de Caixa</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-white/[0.08] text-xs text-slate-400">
                Inquilinos neste plano:{' '}
                <span className="font-bold text-white">{tenantsPorPlano.STARTER.length}</span>
              </div>
            </BentoCard>

            {/* Card Pro */}
            <BentoCard className="p-5 flex flex-col justify-between border-purple-500/30 bg-purple-950/10">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="purple">Pro (Mais Popular)</Badge>
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  R$ 249 <span className="text-sm font-normal text-slate-400">/mês</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Até 5 filiais integradas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Até 10 colaboradores</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Transferências de Estoque entre lojas</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Entrada e Importação de NF-e</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-purple-500/20 text-xs text-slate-400">
                Inquilinos neste plano:{' '}
                <span className="font-bold text-white">{tenantsPorPlano.PRO.length}</span>
              </div>
            </BentoCard>

            {/* Card Enterprise */}
            <BentoCard className="p-5 flex flex-col justify-between border-emerald-500/30 bg-emerald-950/10">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="emerald">Enterprise</Badge>
                  <Crown className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  R$ 799 <span className="text-sm font-normal text-slate-400">/mês</span>
                </div>
                <ul className="mt-4 space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Até 50 filiais</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Até 100 colaboradores</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Curva ABC e Inteligência de Estoque</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Auditorias físicas com Ledger em tempo real</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 pt-3 border-t border-emerald-500/20 text-xs text-slate-400">
                Inquilinos neste plano:{' '}
                <span className="font-bold text-white">{tenantsPorPlano.ENTERPRISE.length}</span>
              </div>
            </BentoCard>
          </div>

          {/* Atalho para alterar o plano dos clientes */}
          <BentoCard className="p-5">
            <h3 className="text-sm font-bold text-white mb-1">Ajuste de Planos dos Clientes</h3>
            <p className="text-xs text-slate-400 mb-4">
              Clique no botão de ajustes de qualquer empresa para fazer upgrade ou ajustar limites avulsos.
            </p>
            <div className="divide-y divide-white/[0.04]">
              {tenants.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <span className="font-semibold text-xs text-white">{t.nome_fantasia}</span>
                    <span className="text-slate-500 text-[11px] ml-2 font-mono">{t.cnpj}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={PLANOS_INFO[t.plano]?.badgeVariant || 'neutral'}>
                      {t.plano}
                    </Badge>
                    <button
                      onClick={() => handleOpenModalPlano(t)}
                      className="px-3 py-1.5 text-xs font-semibold text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Alterar Plano</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>
      )}

      {/* Modal: Alterar Plano e Limites */}
      {modalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-white/[0.12] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Alterar Plano Comercial</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[260px]">
                    {modalTenant.nome_fantasia}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalTenant(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlano} className="mt-5 space-y-4">
              {/* Seleção rápida de planos */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Escolha o Plano
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['STARTER', 'PRO', 'ENTERPRISE'] as const).map((p) => {
                    const isSelected = modalPlano === p;
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => handleSelectPlanoPredefinido(p)}
                        className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all text-center ${
                          isSelected
                            ? 'bg-purple-600/20 text-purple-300 border-purple-500 shadow-sm'
                            : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/[0.06]'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Limites Customizáveis */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Limite de Filiais
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={modalLimiteLojas}
                    onChange={(e) => setModalLimiteLojas(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Atuais cadastradas: {modalTenant.total_lojas}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Limite de Usuários
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={modalLimiteUsuarios}
                    onChange={(e) => setModalLimiteUsuarios(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Atuais cadastrados: {modalTenant.total_usuarios}
                  </span>
                </div>
              </div>

              {(modalLimiteLojas < modalTenant.total_lojas ||
                modalLimiteUsuarios < modalTenant.total_usuarios) && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Atenção: Os novos limites são inferiores ao número atual de registros do cliente. Novas criações serão bloqueadas.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalTenant(null)}
                  disabled={savingPlano}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPlano}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-colors shadow-lg shadow-purple-600/20 flex items-center gap-2 disabled:opacity-50"
                >
                  {savingPlano ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Slide-over Drawer: Visão 360° do Inquilino */}
      {drawerTenantId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in">
          <div
            className="fixed inset-0"
            onClick={() => {
              setDrawerTenantId(null);
              setDetalhesTenant(null);
            }}
          />
          <div className="relative w-full max-w-2xl bg-[#0e0e12] border-l border-white/[0.12] shadow-2xl h-full flex flex-col z-10">
            {/* Header */}
            <div className="p-6 border-b border-white/[0.08] flex items-start justify-between bg-white/[0.01]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white tracking-tight">
                      {detalhesTenant?.nome_fantasia || 'Detalhes do Inquilino'}
                    </h2>
                    {detalhesTenant && (
                      <Badge
                        variant={
                          PLANOS_INFO[detalhesTenant.plano]?.badgeVariant || 'neutral'
                        }
                      >
                        {PLANOS_INFO[detalhesTenant.plano]?.label || detalhesTenant.plano}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {detalhesTenant?.razao_social} • CNPJ: <span className="font-mono text-slate-300">{detalhesTenant?.cnpj}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setDrawerTenantId(null);
                  setDetalhesTenant(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {carregandoDetalhes ? (
                <div className="py-20 text-center text-slate-500">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-400" />
                  <p className="text-sm">Carregando visão 360° do cliente...</p>
                </div>
              ) : detalhesTenant ? (
                <>
                  {/* Barra de Ações Rápidas */}
                  <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                    <button
                      onClick={() => handleImpersonate(detalhesTenant)}
                      disabled={impersonatingTenantId === detalhesTenant.id}
                      className="flex-1 min-w-[170px] flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/10"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Acessar Modo Suporte</span>
                    </button>

                    <button
                      onClick={() => handleOpenModalPlano(detalhesTenant)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Plano & Cotas</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(detalhesTenant)}
                      disabled={togglingStatusId === detalhesTenant.id}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
                        detalhesTenant.ativo
                          ? 'text-rose-400 bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20'
                          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{detalhesTenant.ativo ? 'Suspender' : 'Reativar'}</span>
                    </button>
                  </div>

                  {/* Bento Grid de KPIs do Inquilino */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                      <div className="text-[11px] text-slate-400">Faturamento</div>
                      <div className="text-base font-bold text-emerald-400 mt-1">
                        R$ {detalhesTenant.total_vendas_valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {detalhesTenant.total_vendas_qtd} vendas
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                      <div className="text-[11px] text-slate-400">Produtos</div>
                      <div className="text-base font-bold text-white mt-1">
                        {detalhesTenant.total_produtos}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">no catálogo</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                      <div className="text-[11px] text-slate-400">Lojas (Filiais)</div>
                      <div className="text-base font-bold text-white mt-1">
                        {detalhesTenant.lojas.length} <span className="text-xs font-normal text-slate-500">/ {detalhesTenant.limite_lojas}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">limite do plano</div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08]">
                      <div className="text-[11px] text-slate-400">Equipe</div>
                      <div className="text-base font-bold text-white mt-1">
                        {detalhesTenant.usuarios.length} <span className="text-xs font-normal text-slate-500">/ {detalhesTenant.limite_usuarios}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">usuários ativos</div>
                    </div>
                  </div>

                  {/* Seção 1: Filiais Cadastradas */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-white">
                          Lojas & Filiais ({detalhesTenant.lojas.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Cota: {detalhesTenant.lojas.length} de {detalhesTenant.limite_lojas}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {detalhesTenant.lojas.map((loja, idx) => (
                        <div
                          key={loja.id}
                          className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div className="font-semibold text-white text-xs">{loja.nome}</div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">{loja.cnpj}</span>
                          </div>
                          {loja.endereco && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-1.5 pl-7">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{loja.endereco}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Seção 2: Equipe & Usuários */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-white">
                          Equipe & Usuários ({detalhesTenant.usuarios.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Cota: {detalhesTenant.usuarios.length} de {detalhesTenant.limite_usuarios}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {detalhesTenant.usuarios.map((u) => (
                        <div
                          key={u.id}
                          className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white text-xs">{u.nome}</span>
                              <Badge variant={u.role === 'DONO' ? 'purple' : 'neutral'}>
                                {u.role}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{u.email}</span>
                            </div>
                          </div>

                          {u.loja_nome && (
                            <div className="text-[10px] text-slate-400 text-right">
                              Filial: <strong className="text-slate-300">{u.loja_nome}</strong>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.08] flex items-center justify-end bg-white/[0.01]">
              <button
                onClick={() => {
                  setDrawerTenantId(null);
                  setDetalhesTenant(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
