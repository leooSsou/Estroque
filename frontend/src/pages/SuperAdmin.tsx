import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { TenantAdmin, PlataformaDashboardMetrics } from '../types';
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
} from 'lucide-react';

const PLANOS_INFO: Record<string, { label: string; badgeVariant: 'neutral' | 'emerald' | 'purple' }> = {
  STARTER: { label: 'Starter', badgeVariant: 'neutral' },
  PRO: { label: 'Pro', badgeVariant: 'purple' },
  ENTERPRISE: { label: 'Enterprise', badgeVariant: 'emerald' },
};

export const SuperAdmin: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();

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

  const loadData = useCallback(async (isSilent = false) => {
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
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      // Atualiza métricas
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
    if (plano === 'STARTER') {
      setModalLimiteLojas(1);
      setModalLimiteUsuarios(2);
    } else if (plano === 'PRO') {
      setModalLimiteLojas(5);
      setModalLimiteUsuarios(10);
    } else if (plano === 'ENTERPRISE') {
      setModalLimiteLojas(50);
      setModalLimiteUsuarios(100);
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

  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      // Filtro de status
      if (statusFilter === 'ATIVOS' && !t.ativo) return false;
      if (statusFilter === 'SUSPENSOS' && t.ativo) return false;

      // Filtro de texto
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
            <Badge variant="purple">
              ADMIN_SAAS
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            Métricas globais da infraestrutura SaaS, gestão de tenants e controle de planos e limites.
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

      {/* Bento Grid: Métricas da Plataforma */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              {metrics ? `R$ ${metrics.mrr_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '...'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Receita mensal recorrente</span>
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
              {metrics ? `R$ ${metrics.gmv_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '...'}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <span>{metrics?.total_vendas ?? 0} pedidos faturados na rede</span>
            </div>
          </div>
        </BentoCard>

        <BentoCard className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Inquilinos (Tenants)
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
              {metrics?.total_lojas ?? 0} <span className="text-sm font-normal text-slate-400">lojas</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span>{metrics?.total_usuarios ?? 0} colaboradores ativos</span>
            </div>
          </div>
        </BentoCard>
      </div>

      {/* Seção de Gerenciamento de Tenants */}
      <BentoCard className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Inquilinos Cadastrados</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Consulte faturamento, filiais, colaboradores e gerencie o plano ou suspensão.
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
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-xs">
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
                  const planoInfo = PLANOS_INFO[t.plano] || { label: t.plano, badgeVariant: 'default' };
                  const lojasOcupacao = `${t.total_lojas} / ${t.limite_lojas}`;
                  const usuariosOcupacao = `${t.total_usuarios} / ${t.limite_usuarios}`;
                  const isLojasCritico = t.total_lojas >= t.limite_lojas;
                  const isUsuariosCritico = t.total_usuarios >= t.limite_usuarios;

                  return (
                    <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-white text-sm">{t.nome_fantasia}</div>
                        <div className="text-slate-400 text-[11px] truncate max-w-[200px]">{t.razao_social}</div>
                        <div className="text-slate-500 text-[11px] font-mono mt-0.5">{t.cnpj}</div>
                      </td>

                      <td className="py-3.5 px-3">
                        <Badge variant={planoInfo.badgeVariant}>
                          {planoInfo.label}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`font-semibold ${
                            isLojasCritico ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {lojasOcupacao}
                        </span>
                        {isLojasCritico && (
                          <span title="Limite atingido" className="inline-block ml-1 text-amber-400">
                            •
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`font-semibold ${
                            isUsuariosCritico ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {usuariosOcupacao}
                        </span>
                        {isUsuariosCritico && (
                          <span title="Limite atingido" className="inline-block ml-1 text-amber-400">
                            •
                          </span>
                        )}
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
                        <div className="inline-flex items-center gap-2">
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
    </div>
  );
};
