import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import { TenantAdmin, PlataformaDashboardMetrics, TenantDetalhesCompletos, PlanoConfig, ModuloDetalhe, TenantUsuarioResumo } from '../types';
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
  Package,
  MapPin,
  Mail,
  UserCheck,
  Edit3,
  Plus,
  Trash2,
  FileSpreadsheet,
  ShoppingCart,
  Wallet,
  ArrowLeftRight,
  ScrollText,
  BarChart3,
  Boxes,
  Check,
  Key,
} from 'lucide-react';

const MODULO_ICONS: Record<string, React.ElementType> = {
  pdv: ShoppingCart,
  nfe: FileSpreadsheet,
  financeiro: Wallet,
  transferencias: ArrowLeftRight,
  auditoria: ScrollText,
  contatos: Users,
  analytics: BarChart3,
  grade: Boxes,
};

const PLANOS_INFO: Record<
  string,
  { label: string; badgeVariant: 'neutral' | 'emerald' | 'purple'; mrr: number; lojasMax: number; usuariosMax: number }
> = {
  STARTER: { label: 'Starter', badgeVariant: 'neutral', mrr: 99.0, lojasMax: 1, usuariosMax: 2 },
  PRO: { label: 'Pro', badgeVariant: 'purple', mrr: 249.0, lojasMax: 5, usuariosMax: 10 },
  ENTERPRISE: { label: 'Enterprise', badgeVariant: 'emerald', mrr: 799.0, lojasMax: 50, usuariosMax: 100 },
};

const SUGESTOES_RECURSOS = [
  'PDV e Frente de Caixa',
  'Entrada e Importação de NF-e',
  'Transferências de Estoque entre lojas',
  'Grade e Variações de Produtos',
  'Curva ABC e Inteligência de Estoque',
  'Auditorias físicas com Ledger em tempo real',
  'Gestão Financeira e Crediário de Clientes',
  'Trocas e Devoluções com Compensação',
  'Suporte Prioritário 24/7',
];

export const SuperAdmin: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = (searchParams.get('tab') as 'geral' | 'tenants' | 'planos') || 'geral';

  const [metrics, setMetrics] = useState<PlataformaDashboardMetrics | null>(null);
  const [tenants, setTenants] = useState<TenantAdmin[]>([]);
  const [planos, setPlanos] = useState<PlanoConfig[]>([
    {
      id: 'STARTER',
      nome: 'Starter',
      descricao: 'Pequenos comércios',
      preco_mensal: 99.0,
      limite_lojas: 1,
      limite_usuarios: 2,
      recursos: [
        'Até 1 filial (loja matriz)',
        'Até 2 colaboradores',
        'PDV e Frente de Caixa',
        'Gestão Básica de Produtos e Estoque',
      ],
      badge_variant: 'neutral',
      destaque: false,
    },
    {
      id: 'PRO',
      nome: 'Pro (Mais Popular)',
      descricao: 'Empresas em expansão',
      preco_mensal: 249.0,
      limite_lojas: 5,
      limite_usuarios: 10,
      recursos: [
        'Até 5 filiais integradas',
        'Até 10 colaboradores',
        'Transferências de Estoque entre lojas',
        'Entrada e Importação de NF-e',
        'Emissão de Vendas e PDV Avançado',
      ],
      badge_variant: 'purple',
      destaque: true,
    },
    {
      id: 'ENTERPRISE',
      nome: 'Enterprise',
      descricao: 'Grandes redes e franquias',
      preco_mensal: 799.0,
      limite_lojas: 50,
      limite_usuarios: 100,
      recursos: [
        'Até 50 filiais',
        'Até 100 colaboradores',
        'Curva ABC e Inteligência de Estoque',
        'Auditorias físicas com Ledger em tempo real',
        'Suporte prioritário e limites escaláveis',
      ],
      badge_variant: 'emerald',
      destaque: false,
    },
  ]);
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

  // Estado do Modal de Edição de Configuração do Plano
  const [editingPlano, setEditingPlano] = useState<PlanoConfig | null>(null);
  const [formPlanoNome, setFormPlanoNome] = useState('');
  const [formPlanoDescricao, setFormPlanoDescricao] = useState('');
  const [formPlanoPreco, setFormPlanoPreco] = useState<number>(0);
  const [formPlanoLojas, setFormPlanoLojas] = useState<number>(1);
  const [formPlanoUsuarios, setFormPlanoUsuarios] = useState<number>(2);
  const [formPlanoRecursos, setFormPlanoRecursos] = useState<string[]>([]);
  const [novoRecursoTexto, setNovoRecursoTexto] = useState('');
  const [savingConfigPlano, setSavingConfigPlano] = useState(false);

  // Estado de alteração de status inline
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);

  // Estado do Modal de Cadastrar Inquilino & Loja
  const [modalNovoTenantOpen, setModalNovoTenantOpen] = useState(false);
  const [novoTenantNomeFantasia, setNovoTenantNomeFantasia] = useState('');
  const [novoTenantRazaoSocial, setNovoTenantRazaoSocial] = useState('');
  const [novoTenantCnpj, setNovoTenantCnpj] = useState('');
  const [novoTenantPlano, setNovoTenantPlano] = useState<'STARTER' | 'PRO' | 'ENTERPRISE'>('PRO');
  const [novoTenantLimiteLojas, setNovoTenantLimiteLojas] = useState(5);
  const [novoTenantLimiteUsuarios, setNovoTenantLimiteUsuarios] = useState(10);
  const [novoLojaNome, setNovoLojaNome] = useState('');
  const [novoLojaEndereco, setNovoLojaEndereco] = useState('');
  const [novoDonoNome, setNovoDonoNome] = useState('');
  const [novoDonoEmail, setNovoDonoEmail] = useState('');
  const [novoDonoSenha, setNovoDonoSenha] = useState('');
  const [savingNovoTenant, setSavingNovoTenant] = useState(false);

  // Estado do Modal de Cadastrar Filial Adicional no Drawer
  const [modalNovaFilialOpen, setModalNovaFilialOpen] = useState(false);
  const [novaFilialNome, setNovaFilialNome] = useState('');
  const [novaFilialCnpj, setNovaFilialCnpj] = useState('');
  const [novaFilialEndereco, setNovaFilialEndereco] = useState('');
  const [savingNovaFilial, setSavingNovaFilial] = useState(false);

  // Estado do Modal de Módulos & Permissões Customizadas (Bônus / Bloqueio)
  const [modalModulosTenant, setModalModulosTenant] = useState<TenantAdmin | TenantDetalhesCompletos | null>(null);
  const [modulosLista, setModulosLista] = useState<ModuloDetalhe[]>([]);
  const [modulosState, setModulosState] = useState<Record<string, boolean>>({});
  const [loadingModulos, setLoadingModulos] = useState(false);
  const [savingModulos, setSavingModulos] = useState(false);

  // Estado do Drawer de Detalhes 360°
  const [drawerTenantId, setDrawerTenantId] = useState<string | null>(null);
  const [detalhesTenant, setDetalhesTenant] = useState<TenantDetalhesCompletos | null>(null);
  const [carregandoDetalhes, setCarregandoDetalhes] = useState(false);

  // Estado do Modal de Redefinição de Senha de Usuário pelo Super-Admin
  const [modalResetSenhaUser, setModalResetSenhaUser] = useState<TenantUsuarioResumo | null>(null);
  const [resetNovaSenha, setResetNovaSenha] = useState('');
  const [savingResetSenha, setSavingResetSenha] = useState(false);

  const loadData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);
      try {
        const [dash, tenantsList, planosList] = await Promise.all([
          api.getPlataformaDashboard(),
          api.getAdminTenants(),
          api.getAdminPlanos(),
        ]);
        setMetrics(dash);
        setTenants(tenantsList);
        if (planosList && planosList.length > 0) {
          setPlanos(planosList);
        }
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

  const planosMap = useMemo(() => {
    const map: Record<
      string,
      { label: string; badgeVariant: 'neutral' | 'emerald' | 'purple'; mrr: number; lojasMax: number; usuariosMax: number }
    > = {};
    planos.forEach((p) => {
      map[p.id] = {
        label: p.nome,
        badgeVariant: p.badge_variant,
        mrr: p.preco_mensal,
        lojasMax: p.limite_lojas,
        usuariosMax: p.limite_usuarios,
      };
    });
    return map;
  }, [planos]);

  const handleSelectPlanoPredefinido = (plano: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    setModalPlano(plano);
    const info = planosMap[plano] || PLANOS_INFO[plano];
    if (info) {
      setModalLimiteLojas(info.lojasMax);
      setModalLimiteUsuarios(info.usuariosMax);
    }
  };

  const handleOpenEditarPlano = (p: PlanoConfig) => {
    setEditingPlano(p);
    setFormPlanoNome(p.nome);
    setFormPlanoDescricao(p.descricao);
    setFormPlanoPreco(p.preco_mensal);
    setFormPlanoLojas(p.limite_lojas);
    setFormPlanoUsuarios(p.limite_usuarios);
    setFormPlanoRecursos([...p.recursos]);
    setNovoRecursoTexto('');
  };

  const handleAddRecurso = (texto?: string) => {
    const item = (texto || novoRecursoTexto).trim();
    if (!item) return;
    if (formPlanoRecursos.includes(item)) {
      toast.error('Este item já está na lista do plano.');
      return;
    }
    setFormPlanoRecursos((prev) => [...prev, item]);
    if (!texto) setNovoRecursoTexto('');
  };

  const handleRemoveRecurso = (idx: number) => {
    setFormPlanoRecursos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveConfigPlano = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlano) return;
    if (formPlanoPreco < 0) {
      toast.error('O valor mensal não pode ser negativo.');
      return;
    }
    if (formPlanoLojas < 1 || formPlanoUsuarios < 1) {
      toast.error('Os limites de filiais e usuários devem ser maiores que zero.');
      return;
    }

    setSavingConfigPlano(true);
    try {
      const updated = await api.atualizarAdminPlano(editingPlano.id, {
        nome: formPlanoNome,
        descricao: formPlanoDescricao,
        preco_mensal: Number(formPlanoPreco),
        limite_lojas: Number(formPlanoLojas),
        limite_usuarios: Number(formPlanoUsuarios),
        recursos: formPlanoRecursos,
      });

      setPlanos((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      toast.success(`Plano "${updated.nome}" atualizado com sucesso!`);
      setEditingPlano(null);
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar plano';
      toast.error(msg);
    } finally {
      setSavingConfigPlano(false);
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

  const handleOpenNovoTenant = () => {
    setNovoTenantNomeFantasia('');
    setNovoTenantRazaoSocial('');
    setNovoTenantCnpj('');
    setNovoTenantPlano('PRO');
    const proInfo = planosMap['PRO'] || PLANOS_INFO['PRO'];
    setNovoTenantLimiteLojas(proInfo?.lojasMax ?? 5);
    setNovoTenantLimiteUsuarios(proInfo?.usuariosMax ?? 10);
    setNovoLojaNome('');
    setNovoLojaEndereco('');
    setNovoDonoNome('');
    setNovoDonoEmail('');
    setNovoDonoSenha('');
    setModalNovoTenantOpen(true);
  };

  const handleSelectNovoPlano = (p: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    setNovoTenantPlano(p);
    const info = planosMap[p] || PLANOS_INFO[p];
    if (info) {
      setNovoTenantLimiteLojas(info.lojasMax);
      setNovoTenantLimiteUsuarios(info.usuariosMax);
    }
  };

  const handleSaveNovoTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTenantNomeFantasia.trim() || !novoTenantRazaoSocial.trim() || !novoTenantCnpj.trim()) {
      toast.error('Preencha os dados da empresa (nome, razão e CNPJ).');
      return;
    }
    if (!novoLojaNome.trim()) {
      toast.error('Informe o nome da Loja Matriz inicial.');
      return;
    }
    if (!novoDonoNome.trim() || !novoDonoEmail.trim() || !novoDonoSenha.trim()) {
      toast.error('Informe os dados de acesso do Titular/Dono.');
      return;
    }
    if (novoDonoSenha.length < 6) {
      toast.error('A senha inicial do Dono deve ter pelo menos 6 caracteres.');
      return;
    }

    setSavingNovoTenant(true);
    try {
      await api.cadastrarAdminTenant({
        nome_fantasia: novoTenantNomeFantasia.trim(),
        razao_social: novoTenantRazaoSocial.trim(),
        cnpj: novoTenantCnpj.replace(/\D/g, ''),
        plano: novoTenantPlano,
        limite_lojas: Number(novoTenantLimiteLojas),
        limite_usuarios: Number(novoTenantLimiteUsuarios),
        nome_loja: novoLojaNome.trim(),
        endereco_loja: novoLojaEndereco.trim() || undefined,
        dono_nome: novoDonoNome.trim(),
        dono_email: novoDonoEmail.trim(),
        dono_senha: novoDonoSenha,
      });

      toast.success(`Inquilino "${novoTenantNomeFantasia}" e Loja Matriz cadastrados com sucesso!`);
      setModalNovoTenantOpen(false);
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar inquilino';
      toast.error(msg);
    } finally {
      setSavingNovoTenant(false);
    }
  };

  const handleOpenNovaFilial = () => {
    setNovaFilialNome('');
    setNovaFilialCnpj('');
    setNovaFilialEndereco('');
    setModalNovaFilialOpen(true);
  };

  const handleSaveNovaFilial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detalhesTenant) return;
    if (!novaFilialNome.trim() || !novaFilialCnpj.trim()) {
      toast.error('Informe o nome e CNPJ da filial.');
      return;
    }

    setSavingNovaFilial(true);
    try {
      await api.cadastrarAdminLoja(detalhesTenant.id, {
        nome: novaFilialNome.trim(),
        cnpj: novaFilialCnpj.replace(/\D/g, ''),
        endereco: novaFilialEndereco.trim() || undefined,
      });

      toast.success(`Filial "${novaFilialNome}" cadastrada com sucesso!`);
      setModalNovaFilialOpen(false);
      const updatedDetalhes = await api.getAdminTenantDetalhesCompletos(detalhesTenant.id);
      setDetalhesTenant(updatedDetalhes);
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao cadastrar filial';
      toast.error(msg);
    } finally {
      setSavingNovaFilial(false);
    }
  };

  const handleOpenModalModulos = async (tenant: TenantAdmin | TenantDetalhesCompletos) => {
    setModalModulosTenant(tenant);
    setLoadingModulos(true);
    try {
      const resp = await api.getTenantModulos(tenant.id);
      setModulosLista(resp.modulos);
      const stateMap: Record<string, boolean> = {};
      resp.modulos.forEach((m) => {
        stateMap[m.chave] = m.ativo;
      });
      setModulosState(stateMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar módulos do cliente';
      toast.error(msg);
      setModalModulosTenant(null);
    } finally {
      setLoadingModulos(false);
    }
  };

  const handleToggleModulo = (chave: string) => {
    setModulosState((prev) => ({
      ...prev,
      [chave]: !prev[chave],
    }));
  };

  const handleRestaurarPadroesPlano = () => {
    if (!modulosLista.length) return;
    const stateMap: Record<string, boolean> = {};
    modulosLista.forEach((m) => {
      stateMap[m.chave] = m.incluso_no_plano;
    });
    setModulosState(stateMap);
    toast.info('Valores restaurados para o padrão do plano.');
  };

  const handleSalvarModulos = async () => {
    if (!modalModulosTenant) return;
    setSavingModulos(true);
    try {
      const modulos_customizados: Record<string, boolean> = {};
      modulosLista.forEach((m) => {
        const atual = !!modulosState[m.chave];
        if (atual !== m.incluso_no_plano) {
          modulos_customizados[m.chave] = atual;
        }
      });

      const updated = await api.updateTenantModulos(modalModulosTenant.id, modulos_customizados);
      toast.success(`Módulos de "${modalModulosTenant.nome_fantasia}" atualizados com sucesso!`);

      const modulosAtivosMap: Record<string, boolean> = {};
      updated.modulos.forEach((m) => {
        modulosAtivosMap[m.chave] = m.ativo;
      });

      setTenants((prev) =>
        prev.map((t) =>
          t.id === modalModulosTenant.id
            ? { ...t, modulos_customizados: updated.modulos_customizados, modulos_ativos: modulosAtivosMap }
            : t
        )
      );

      if (detalhesTenant && detalhesTenant.id === modalModulosTenant.id) {
        setDetalhesTenant({
          ...detalhesTenant,
          modulos_customizados: updated.modulos_customizados,
          modulos_ativos: modulosAtivosMap,
          modulos: updated.modulos,
        });
      }

      setModalModulosTenant(null);
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar permissões de módulos';
      toast.error(msg);
    } finally {
      setSavingModulos(false);
    }
  };

  const handleOpenResetPassword = (usuario: TenantUsuarioResumo) => {
    setModalResetSenhaUser(usuario);
    setResetNovaSenha('');
  };

  const handleSalvarResetSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalResetSenhaUser) return;
    if (resetNovaSenha.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (!/[A-Za-z]/.test(resetNovaSenha) || !/\d/.test(resetNovaSenha)) {
      toast.error('A nova senha deve conter pelo menos uma letra e um número.');
      return;
    }
    setSavingResetSenha(true);
    try {
      const res = await api.redefinirSenhaUsuarioAdmin(modalResetSenhaUser.id, resetNovaSenha);
      toast.success(res.mensagem || `Senha de ${modalResetSenhaUser.nome} redefinida com sucesso!`);
      setModalResetSenhaUser(null);
      setResetNovaSenha('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao redefinir senha do usuário';
      toast.error(msg);
    } finally {
      setSavingResetSenha(false);
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

  // Inquilinos Recentes (últimos cadastrados)
  const ultimosTenants = useMemo(() => {
    return [...tenants]
      .sort((a, b) => new Date(b.data_cadastro).getTime() - new Date(a.data_cadastro).getTime())
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

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenNovoTenant}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Cadastrar Inquilino / Loja</span>
          </button>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.04] border border-white/[0.1] hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Atualizar Dados</span>
          </button>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
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

          {/* Grid Secundário: Distribuição de Planos & Inquilinos Recentes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BentoCard className="p-5">
              <h3 className="text-sm font-bold text-white mb-1">Distribuição por Plano Comercial</h3>
              <p className="text-xs text-slate-400 mb-4">Volume de clientes e MRR gerado por tier de assinatura.</p>

              <div className="space-y-3">
                {(['STARTER', 'PRO', 'ENTERPRISE'] as const).map((p) => {
                  const info = planosMap[p] || PLANOS_INFO[p];
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
              <h3 className="text-sm font-bold text-white mb-1">Inquilinos Recentes</h3>
              <p className="text-xs text-slate-400 mb-4">Últimas empresas cadastradas na plataforma.</p>

              <div className="space-y-2.5">
                {ultimosTenants.map((t) => {
                  const planoInfo = planosMap[t.plano] || PLANOS_INFO[t.plano] || { label: t.plano, badgeVariant: 'neutral' };
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer"
                      onClick={() => handleOpenDetalhes(t.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-white truncate">{t.nome_fantasia}</div>
                          <div className="text-[11px] text-slate-500">
                            {t.total_lojas} {t.total_lojas === 1 ? 'filial' : 'filiais'} • {t.total_usuarios} {t.total_usuarios === 1 ? 'usuário' : 'usuários'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <Badge variant={planoInfo.badgeVariant}>{planoInfo.label}</Badge>
                        {t.ativo ? (
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" title="Ativo" />
                        ) : (
                          <span className="inline-block w-2 h-2 rounded-full bg-rose-400" title="Suspenso" />
                        )}
                      </div>
                    </div>
                  );
                })}
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

              <button
                onClick={handleOpenNovoTenant}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors shadow-sm shadow-purple-600/20"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Inquilino</span>
              </button>
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
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
                      Carregando inquilinos...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhum inquilino encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => {
                    const planoInfo = planosMap[t.plano] || PLANOS_INFO[t.plano] || { label: t.plano, badgeVariant: 'neutral' };
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
                              title="Visão 360° (Detalhes e Lojas)"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* Botão Alterar Plano */}
                            <button
                              onClick={() => handleOpenModalPlano(t)}
                              className="p-1.5 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors border border-transparent hover:border-purple-500/20"
                              title="Alterar Plano e Limites"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>

                            {/* Botão Módulos & Bônus */}
                            <button
                              onClick={() => handleOpenModalModulos(t)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-transparent hover:border-emerald-500/20"
                              title="Gerenciar Módulos e Bônus"
                            >
                              <Sparkles className="w-4 h-4" />
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
            {planos.map((p) => {
              const borderClass =
                p.id === 'ENTERPRISE'
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : p.id === 'PRO'
                  ? 'border-purple-500/30 bg-purple-950/10'
                  : 'border-white/[0.12]';

              const icon =
                p.id === 'ENTERPRISE' ? (
                  <Crown className="w-4 h-4 text-emerald-400" />
                ) : p.id === 'PRO' ? (
                  <Zap className="w-4 h-4 text-purple-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-slate-400" />
                );

              const inquilinosCount = tenantsPorPlano[p.id as keyof typeof tenantsPorPlano]?.length || 0;

              return (
                <BentoCard key={p.id} className={`p-5 flex flex-col justify-between ${borderClass}`}>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={p.badge_variant}>{p.nome}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400">{p.descricao}</span>
                        {icon}
                      </div>
                    </div>
                    <div className="text-3xl font-extrabold text-white">
                      R$ {p.preco_mensal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}{' '}
                      <span className="text-sm font-normal text-slate-400">/mês</span>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs font-medium text-slate-400 pb-3 border-b border-white/[0.06]">
                      <span>Até {p.limite_lojas} {p.limite_lojas === 1 ? 'filial' : 'filiais'}</span>
                      <span>•</span>
                      <span>Até {p.limite_usuarios} colaboradores</span>
                    </div>

                    <ul className="mt-3.5 space-y-2 text-xs text-slate-300">
                      {p.recursos.map((rec, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 pt-3 border-t border-white/[0.08] space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Inquilinos neste plano:</span>
                      <span className="font-bold text-white">{inquilinosCount}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenEditarPlano(p)}
                      className="w-full py-2 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all hover:border-purple-500/40 group"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
                      <span>Editar Plano & Recursos</span>
                    </button>
                  </div>
                </BentoCard>
              );
            })}
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
                    <Badge variant={planosMap[t.plano]?.badgeVariant || PLANOS_INFO[t.plano]?.badgeVariant || 'neutral'}>
                      {planosMap[t.plano]?.label || t.plano}
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

      {/* Modal: Editar Configuração do Plano Comercial & O que está liberado */}
      {editingPlano && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#121214] border border-white/[0.12] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Plano Comercial</h3>
                  <p className="text-xs text-slate-400">
                    Modifique valor, limites e recursos liberados deste tier
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlano(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfigPlano} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Nome do Plano
                  </label>
                  <input
                    type="text"
                    value={formPlanoNome}
                    onChange={(e) => setFormPlanoNome(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Subtítulo / Descrição
                  </label>
                  <input
                    type="text"
                    value={formPlanoDescricao}
                    onChange={(e) => setFormPlanoDescricao(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Valor da Assinatura Mensal (R$/mês)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-slate-500 font-bold">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPlanoPreco}
                    onChange={(e) => setFormPlanoPreco(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Limite Padrão de Filiais
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPlanoLojas}
                    onChange={(e) => setFormPlanoLojas(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Limite Padrão de Usuários
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPlanoUsuarios}
                    onChange={(e) => setFormPlanoUsuarios(parseInt(e.target.value) || 1)}
                    required
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* O que o plano tem liberado (Recursos & Módulos) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    O que este plano tem liberado (Recursos & Benefícios)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formPlanoRecursos.length} itens cadastrados
                  </span>
                </div>

                {/* Lista de itens atuais */}
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {formPlanoRecursos.map((rec, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/[0.08] rounded-xl text-xs text-slate-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate">{rec}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRecurso(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 transition-colors"
                        title="Remover este item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {formPlanoRecursos.length === 0 && (
                    <div className="text-center py-4 text-xs text-slate-500 border border-dashed border-white/[0.08] rounded-xl">
                      Nenhum recurso cadastrado para este plano.
                    </div>
                  )}
                </div>

                {/* Adicionar novo recurso manualmente */}
                <div className="flex gap-2 mt-2.5">
                  <input
                    type="text"
                    value={novoRecursoTexto}
                    onChange={(e) => setNovoRecursoTexto(e.target.value)}
                    placeholder="Adicionar recurso personalizado (ex: Suporte 24h)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecurso();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddRecurso()}
                    className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar</span>
                  </button>
                </div>

                {/* Sugestões rápidas de módulos */}
                <div className="mt-3">
                  <span className="text-[11px] text-slate-500 block mb-1.5 font-medium">
                    Sugestões rápidas para liberar:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGESTOES_RECURSOS.filter((sug) => !formPlanoRecursos.includes(sug)).map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => handleAddRecurso(sug)}
                        className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-purple-500/40 text-slate-400 hover:text-white transition-colors"
                      >
                        + {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setEditingPlano(null)}
                  disabled={savingConfigPlano}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingConfigPlano}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                >
                  {savingConfigPlano ? (
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

      {/* Modal: Cadastrar Novo Inquilino (Empresa + Loja Matriz + Usuário Dono) */}
      {modalNovoTenantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-[#121214] border border-white/[0.12] rounded-2xl w-full max-w-xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cadastrar Inquilino & Loja Matriz</h3>
                  <p className="text-xs text-slate-400">
                    Crie a empresa cliente, sua primeira filial e o login de acesso do dono
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovoTenantOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNovoTenant} className="mt-5 space-y-5">
              {/* Seção 1: Dados da Empresa / Inquilino */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>1. Dados da Empresa (Inquilino)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Nome Fantasia *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Confecções Estrela"
                      value={novoTenantNomeFantasia}
                      onChange={(e) => setNovoTenantNomeFantasia(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Razão Social *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Estrela Modas Ltda"
                      value={novoTenantRazaoSocial}
                      onChange={(e) => setNovoTenantRazaoSocial(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      CNPJ da Empresa *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 00.000.000/0001-91"
                      value={novoTenantCnpj}
                      onChange={(e) => setNovoTenantCnpj(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Plano Comercial Contratado
                    </label>
                    <select
                      value={novoTenantPlano}
                      onChange={(e) => handleSelectNovoPlano(e.target.value as 'STARTER' | 'PRO' | 'ENTERPRISE')}
                      className="w-full px-3 py-2 bg-[#18181c] border border-white/[0.12] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="STARTER">Starter (R$ {planosMap['STARTER']?.mrr ?? 99}/mês)</option>
                      <option value="PRO">Pro (R$ {planosMap['PRO']?.mrr ?? 249}/mês)</option>
                      <option value="ENTERPRISE">Enterprise (R$ {planosMap['ENTERPRISE']?.mrr ?? 799}/mês)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Cota de Filiais
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={novoTenantLimiteLojas}
                      onChange={(e) => setNovoTenantLimiteLojas(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Cota de Usuários
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={novoTenantLimiteUsuarios}
                      onChange={(e) => setNovoTenantLimiteUsuarios(Math.max(1, parseInt(e.target.value) || 1))}
                      required
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Loja Matriz Inicial */}
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                  <Store className="w-3.5 h-3.5" />
                  <span>2. Primeira Loja (Matriz)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Nome da Loja Matriz *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Matriz Centro"
                      value={novoLojaNome}
                      onChange={(e) => setNovoLojaNome(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Endereço da Loja (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Brasil, 1500 - Sala 1"
                      value={novoLojaEndereco}
                      onChange={(e) => setNovoLojaEndereco(e.target.value)}
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 3: Dono / Titular do Acesso */}
              <div className="space-y-3 pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>3. Login do Proprietário (Dono)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Nome do Titular *
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Carlos Silva"
                      value={novoDonoNome}
                      onChange={(e) => setNovoDonoNome(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      E-mail de Acesso *
                    </label>
                    <input
                      type="email"
                      placeholder="carlos@empresa.com"
                      value={novoDonoEmail}
                      onChange={(e) => setNovoDonoEmail(e.target.value)}
                      required
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Senha Inicial *
                    </label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 dígitos"
                      value={novoDonoSenha}
                      onChange={(e) => setNovoDonoSenha(e.target.value)}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalNovoTenantOpen(false)}
                  disabled={savingNovoTenant}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNovoTenant}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                >
                  {savingNovoTenant ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Cadastrar Inquilino</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Cadastrar Filial Adicional para Inquilino Existente */}
      {modalNovaFilialOpen && detalhesTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-white/[0.12] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nova Filial / Loja</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[260px]">
                    {detalhesTenant.nome_fantasia}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalNovaFilialOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNovaFilial} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nome da Filial / Loja *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Filial Shopping Sul"
                  value={novaFilialNome}
                  onChange={(e) => setNovaFilialNome(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  CNPJ da Filial *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 00.000.000/0002-72"
                  value={novaFilialCnpj}
                  onChange={(e) => setNovaFilialCnpj(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Endereço da Filial (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Shopping Sul, Loja 104"
                  value={novaFilialEndereco}
                  onChange={(e) => setNovaFilialEndereco(e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.12] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setModalNovaFilialOpen(false)}
                  disabled={savingNovaFilial}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNovaFilial}
                  className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-purple-600/20"
                >
                  {savingNovaFilial ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Filial</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Gerenciamento Granular de Módulos & Bônus */}
      {modalModulosTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#121214] border border-white/[0.12] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">
                      Controle de Módulos & Bônus
                    </h3>
                    <Badge variant={planosMap[modalModulosTenant.plano]?.badgeVariant || 'neutral'}>
                      {planosMap[modalModulosTenant.plano]?.label || modalModulosTenant.plano}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {modalModulosTenant.nome_fantasia} ({modalModulosTenant.cnpj})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalModulosTenant(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs text-slate-300">
                <p>
                  <strong className="text-emerald-400">Flexibilidade Total:</strong> Ative funcionalidades que não pertencem ao plano contratado como <strong>Bônus VIP</strong>, ou bloqueie abas específicas caso o cliente não queira utilizá-las.
                </p>
              </div>

              {loadingModulos ? (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-emerald-400" />
                  <p className="text-xs">Carregando catálogo de módulos...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {modulosLista.map((mod) => {
                    const Icon = MODULO_ICONS[mod.chave] || Package;
                    const isAtivo = !!modulosState[mod.chave];
                    const isPadrao = mod.incluso_no_plano;
                    const isBonus = isAtivo && !isPadrao;
                    const isBloqueado = !isAtivo && isPadrao;

                    return (
                      <div
                        key={mod.chave}
                        onClick={() => handleToggleModulo(mod.chave)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                          isBonus
                            ? 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50'
                            : isBloqueado
                            ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50'
                            : isAtivo
                            ? 'bg-white/[0.03] border-white/[0.1] hover:border-white/[0.2]'
                            : 'bg-black/25 border-white/[0.05] opacity-60 hover:opacity-80'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                              isBonus
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isBloqueado
                                ? 'bg-rose-500/20 text-rose-300'
                                : isAtivo
                                ? 'bg-purple-500/10 text-purple-300'
                                : 'bg-white/[0.04] text-slate-500'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-xs text-white">
                                {mod.nome}
                              </span>
                              {isBonus && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  ✨ Bônus
                                </span>
                              )}
                              {isBloqueado && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  🚫 Bloqueado
                                </span>
                              )}
                              {isAtivo && isPadrao && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                  Incluso no Plano
                                </span>
                              )}
                              {!isAtivo && !isPadrao && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-normal text-slate-500">
                                  Desativado
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                              {mod.descricao}
                            </p>
                          </div>
                        </div>

                        {/* Switch Switcher */}
                        <div className="flex-shrink-0 pt-0.5">
                          <div
                            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                              isAtivo ? 'bg-emerald-500' : 'bg-white/[0.12]'
                            }`}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                                isAtivo ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
              <button
                type="button"
                onClick={handleRestaurarPadroesPlano}
                disabled={loadingModulos || savingModulos}
                className="text-xs text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline"
              >
                Restaurar padrão do plano ({modalModulosTenant.plano})
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalModulosTenant(null)}
                  disabled={savingModulos}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvarModulos}
                  disabled={loadingModulos || savingModulos}
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-600/20"
                >
                  {savingModulos ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar Módulos</span>
                    </>
                  )}
                </button>
              </div>
            </div>
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
                          planosMap[detalhesTenant.plano]?.badgeVariant ||
                          PLANOS_INFO[detalhesTenant.plano]?.badgeVariant ||
                          'neutral'
                        }
                      >
                        {planosMap[detalhesTenant.plano]?.label || detalhesTenant.plano}
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
                      onClick={() => handleOpenModalPlano(detalhesTenant)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-purple-300 bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Plano & Cotas</span>
                    </button>

                    <button
                      onClick={() => handleOpenModalModulos(detalhesTenant)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Módulos & Bônus</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(detalhesTenant)}
                      disabled={togglingStatusId === detalhesTenant.id}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border ${
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                  {/* Seção 0: Módulos & Recursos Ativos */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white">
                          Funcionalidades & Módulos
                        </h3>
                      </div>
                      <button
                        onClick={() => handleOpenModalModulos(detalhesTenant)}
                        className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Gerenciar</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {detalhesTenant.modulos?.map((mod) => {
                        const Icon = MODULO_ICONS[mod.chave] || Package;
                        const isBonus = mod.origem === 'BONUS';
                        const isBloqueado = mod.origem === 'BLOQUEADO';
                        const isAtivo = mod.ativo;

                        return (
                          <div
                            key={mod.chave}
                            className={`p-2.5 rounded-xl border transition-all ${
                              isBonus
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : isBloqueado
                                ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                                : isAtivo
                                ? 'bg-white/[0.03] border-white/[0.08] text-white'
                                : 'bg-black/20 border-white/[0.04] text-slate-500 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="text-xs font-semibold truncate">{mod.nome}</span>
                              </div>
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  isAtivo ? 'bg-emerald-400' : 'bg-slate-600'
                                }`}
                              />
                            </div>
                            <div className="text-[10px]">
                              {isBonus && (
                                <span className="text-emerald-400 font-medium">✨ Bônus VIP</span>
                              )}
                              {isBloqueado && (
                                <span className="text-rose-400 font-medium">🚫 Bloqueado</span>
                              )}
                              {mod.origem === 'PLANO' && (
                                <span className="text-purple-300 font-medium">Incluso no plano</span>
                              )}
                              {mod.origem === 'DESATIVADO' && (
                                <span className="text-slate-500">Não incluso</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-slate-400">
                          Cota: {detalhesTenant.lojas.length} de {detalhesTenant.limite_lojas}
                        </span>
                        <button
                          onClick={handleOpenNovaFilial}
                          disabled={detalhesTenant.lojas.length >= detalhesTenant.limite_lojas}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title={
                            detalhesTenant.lojas.length >= detalhesTenant.limite_lojas
                              ? 'Limite de filiais do plano atingido. Aumente o plano ou cota.'
                              : 'Cadastrar nova filial'
                          }
                        >
                          <Plus className="w-3 h-3" />
                          <span>Nova Filial</span>
                        </button>
                      </div>
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

                  {/* Seção 2: Responsável Legal (LGPD Compliant) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-400" />
                        <h3 className="text-sm font-bold text-white">
                          Titular / Dono do Contrato
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Total da equipe: {detalhesTenant.total_usuarios} de {detalhesTenant.limite_usuarios} usuários
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
                              <Badge variant="purple">{u.role || 'DONO'}</Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{u.email}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenResetPassword(u)}
                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-amber-300 hover:text-amber-200 border border-amber-500/20 hover:border-amber-500/40 flex items-center gap-1.5 transition-all btn-press shadow-sm"
                            title={`Redefinir senha de ${u.nome}`}
                          >
                            <Key className="w-3.5 h-3.5" />
                            <span>Redefinir Senha</span>
                          </button>
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

      {/* Modal: Redefinir Senha do Usuário pelo Super-Admin */}
      {modalResetSenhaUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[#0B0F17] border border-white/[0.12] shadow-2xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Redefinir Senha do Usuário</h3>
                  <p className="text-xs text-slate-400">
                    Defina uma nova senha para {modalResetSenhaUser.nome}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalResetSenhaUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.04] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSalvarResetSenha} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{modalResetSenhaUser.nome}</span>
                  <Badge variant="purple">{modalResetSenhaUser.role || 'DONO'}</Badge>
                </div>
                <div className="text-[11px] text-slate-400">{modalResetSenhaUser.email}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Nova Senha (mín. 8 caracteres, letras e números) *
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetNovaSenha}
                  onChange={(e) => setResetNovaSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 rounded-xl bg-white/[0.04] border border-white/[0.12] text-sm text-white placeholder-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalResetSenhaUser(null)}
                  disabled={savingResetSenha}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingResetSenha}
                  className="px-5 py-2 text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-400/20"
                >
                  {savingResetSenha ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Redefinir Senha</span>
                    </>
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
