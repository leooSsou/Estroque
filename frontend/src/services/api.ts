import {
  User,
  Loja,
  Produto,
  CriarProdutoGradePayload,
  AdicionarVariacaoPayload,
  ProdutoComGradeResponse,
  EstoqueSaldo,
  MovimentacaoEstoque,
  Cliente,
  Fornecedor,
  TransferenciaEstoque,
  Venda,
  FormaPagamento,
  PagamentoVenda,
  Devolucao,
  RegistrarDevolucaoPayload,
  VendaEmEspera,
  CaixaTurno,
  TurnoFechadoHistorico,
  OperacaoCaixa,
  FinanceiroLancamento,
  DashboardAnalytics,
  CurvaABCItem,
  ImportarNFeResponse,
  AuditarEstoqueResponse,
  RegisterTenantPayload,
  TenantAdmin,
  TenantModulosResponse,
  PlataformaDashboardMetrics,
  AlterarPlanoPayload,
  TenantDetalhesCompletos,
  PlanoConfig,
  AtualizarPlanoConfigPayload,
  CadastrarTenantPayload,
  CadastrarLojaPayload,
  TenantLojaResumo,
} from '../types';
import { storage } from './storage';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname;
    if (host !== 'localhost' && host !== '127.0.0.1') {
      return `${window.location.protocol}//${host}:8000`;
    }
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

// Tempo máximo de validade contínua da sessão antes de exigir reautenticação (10 horas)
const MAX_SESSION_DURATION_MS = 10 * 60 * 60 * 1000;

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000;
  } catch {
    return false;
  }
}

class ApiClient {
  private token: string | null = null;
  private onUnauthorizedCallback?: () => void;

  constructor() {
    // 1. Limpa resquícios legados de tokens persistentes do localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('estroque_access_token');
    }

    // 2. Lê a sessão ativa a partir do sessionStorage (destruída automaticamente ao fechar o navegador)
    if (typeof sessionStorage !== 'undefined') {
      const storedToken = sessionStorage.getItem('estroque_access_token');
      const sessionCreatedAt = Number(sessionStorage.getItem('estroque_session_created_at') || '0');

      if (storedToken) {
        const isTimeExpired = sessionCreatedAt > 0 && Date.now() - sessionCreatedAt > MAX_SESSION_DURATION_MS;
        const isExpired = storedToken !== 'mock-demo-token-preview-estroque' && (isJwtExpired(storedToken) || isTimeExpired);

        if (isExpired) {
          sessionStorage.removeItem('estroque_access_token');
          sessionStorage.removeItem('estroque_session_created_at');
          this.token = null;
        } else {
          this.token = storedToken;
        }
      }
    }
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorizedCallback = callback;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof sessionStorage !== 'undefined') {
      if (token) {
        sessionStorage.setItem('estroque_access_token', token);
        sessionStorage.setItem('estroque_session_created_at', String(Date.now()));
      } else {
        sessionStorage.removeItem('estroque_access_token');
        sessionStorage.removeItem('estroque_session_created_at');
      }
    }
    // Garante que o localStorage nunca mais mantenha token de acesso
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('estroque_access_token');
    }
  }

  getToken(): string | null {
    if (this.token && this.token !== 'mock-demo-token-preview-estroque' && isJwtExpired(this.token)) {
      this.logout();
      return null;
    }
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: string | null; isBackend: boolean }> {
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status === 401) {
          // Token expirado ou rejeitado pelo backend: encerra sessão imediatamente
          this.logout();
          storage.clearUser();
          if (this.onUnauthorizedCallback) {
            this.onUnauthorizedCallback();
          }
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }

        const errorData = await res.json().catch(() => ({}));
        const detail =
          typeof errorData.detail === 'string'
            ? errorData.detail
            : Array.isArray(errorData.detail)
            ? errorData.detail.map((e: { msg?: string }) => e.msg).join(', ')
            : `Erro HTTP ${res.status}`;
        return {
          data: null,
          error: detail,
          isBackend: true,
        };
      }

      const data = await res.json();
      return { data, error: null, isBackend: true };
    } catch {
      // Network error or timeout -> fallback gracefully
      return { data: null, error: 'BACKEND_OFFLINE', isBackend: false };
    }
  }

  // --- AUTH & ONBOARDING ---
  async registerTenant(dados: RegisterTenantPayload): Promise<{ user: User; token: string }> {
    const res = await this.request<{
      tenant_id: string;
      nome_fantasia: string;
      dono_id: string;
      dono_email: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        nome_fantasia: dados.nome_fantasia,
        razao_social: dados.razao_social,
        cnpj: dados.cnpj,
        dono_nome: dados.dono_nome,
        dono_email: dados.dono_email,
        dono_senha: dados.dono_senha,
      }),
    });

    if (res.error) {
      if (res.error === 'BACKEND_OFFLINE') {
        throw new Error('Não foi possível conectar ao servidor. Verifique se a API está online.');
      }
      throw new Error(res.error);
    }

    if (res.data) {
      const auth = await this.login(dados.dono_email, dados.dono_senha);
      // Cria automaticamente a Loja Matriz inicial usando o CNPJ cadastrado
      await this.createLoja({
        nome: `Matriz - ${dados.nome_fantasia}`,
        cnpj: dados.cnpj || null,
        endereco: dados.endereco_loja || 'Endereço Matriz Principal',
        ativo: true,
      }).catch(() => null);
      return auth;
    }

    throw new Error('Falha no cadastro da empresa.');
  }

  async login(email: string, senha: string): Promise<{ user: User; token: string }> {
    const res = await this.request<{ access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });

    if (res.data?.access_token) {
      this.setToken(res.data.access_token);
      const userRes = await this.getMe();
      return { user: userRes, token: res.data.access_token };
    }

    if (res.error) {
      if (res.error === 'BACKEND_OFFLINE') {
        // Fallback para demonstração e testes visuais de UI quando o backend local não estiver iniciado
        const cleanEmail = email.trim().toLowerCase();
        if (
          (cleanEmail === 'dono@estroque.com.br' && senha === 'senha123') ||
          (cleanEmail === 'admin@estroque.app' && senha === 'admin123')
        ) {
          const isSuperAdmin = cleanEmail === 'admin@estroque.app';
          const mockUser: User = {
            id: isSuperAdmin ? '44444444-4444-4444-4444-444444444444' : '33333333-3333-3333-3333-333333333333',
            nome: isSuperAdmin ? 'Administrador Demo' : 'Dono Demo',
            email: cleanEmail,
            role: isSuperAdmin ? 'ADMIN_SAAS' : 'DONO',
            tenant_id: '00000000-0000-0000-0000-000000000001',
          };
          const mockToken = 'mock-demo-token-preview-estroque';
          this.setToken(mockToken);
          storage.setUser(mockUser);
          if (storage.getLojas().length === 0) {
            storage.seedDemoData();
          }
          return { user: mockUser, token: mockToken };
        }
        throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está online.');
      }
      throw new Error(res.error);
    }

    throw new Error('Credenciais inválidas.');
  }

  async getMe(): Promise<User> {
    if (this.token && this.token !== 'mock-demo-token-preview-estroque' && isJwtExpired(this.token)) {
      this.logout();
      if (this.onUnauthorizedCallback) this.onUnauthorizedCallback();
      throw new Error('Sessão expirada. Faça login novamente.');
    }

    const res = await this.request<User>('/auth/me');
    if (res.data) {
      storage.setUser(res.data);
      return res.data;
    }

    // Se a requisição ao backend falhou (ex.: 401 ou erro), NUNCA manter autenticado com dados zumbis
    if (res.isBackend && res.error) {
      this.logout();
      if (this.onUnauthorizedCallback) this.onUnauthorizedCallback();
      throw new Error(res.error || 'Sessão expirada.');
    }

    // Apenas em modo offline preview quando mock ativo dentro da sessão corrente
    if (this.token === 'mock-demo-token-preview-estroque') {
      const localUser = storage.getUser();
      if (localUser) return localUser;
    }

    this.logout();
    throw new Error('Não autenticado');
  }

  logout() {
    this.setToken(null);
    storage.setUser(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('estroque_access_token');
      sessionStorage.removeItem('estroque_session_created_at');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('estroque_access_token');
      localStorage.removeItem('estroque_impersonator_backup');
      localStorage.removeItem('estroque_impersonation_data');
    }
  }

  // --- LOJAS ---
  async getLojas(): Promise<Loja[]> {
    const res = await this.request<Loja[]>('/lojas/');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getLojas();
  }

  async createLoja(dados: Omit<Loja, 'id' | 'tenant_id'>): Promise<Loja> {
    const res = await this.request<Loja>('/lojas/', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.addLoja(dados);
  }

  // --- PRODUTOS & SALDOS REAIS ---
  async getSaldos(): Promise<EstoqueSaldo[]> {
    const res = await this.request<EstoqueSaldo[]>('/estoque/saldos');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return [];
  }

  async getProdutos(lojaId?: string): Promise<Produto[]> {
    const endpoint = lojaId ? `/produtos/?loja_id=${lojaId}` : '/produtos/';
    const [resProdutos, resSaldos] = await Promise.all([
      this.request<Produto[]>(endpoint),
      this.request<EstoqueSaldo[]>('/estoque/saldos'),
    ]);

    if (resProdutos.data && Array.isArray(resProdutos.data)) {
      const saldos = resSaldos.data && Array.isArray(resSaldos.data) ? resSaldos.data : [];

      return resProdutos.data.map((p) => {
        const estoquePorLoja: Record<string, number> = {};
        let estoqueTotal = 0;

        for (const s of saldos) {
          if (s.produto_id === p.id) {
            estoquePorLoja[s.loja_id] = (estoquePorLoja[s.loja_id] || 0) + s.quantidade;
            estoqueTotal += s.quantidade;
          }
        }

        // Converte markup decimal do backend (ex: 0.5 -> 50%) para exibição percentual na UI
        const normalizedMarkup =
          p.markup > 0 && p.markup <= 5 ? Math.round(p.markup * 1000) / 10 : p.markup;

        return {
          ...p,
          markup: normalizedMarkup,
          estoque_por_loja: estoquePorLoja,
          estoque_total: estoqueTotal,
          estoque_minimo: p.estoque_minimo ?? 5,
        };
      });
    }
    return storage.getProdutos();
  }

  async createProduto(
    dados: Omit<Produto, 'id' | 'tenant_id' | 'estoque_total'> & {
      estoque_inicial?: number;
      loja_id?: string;
    }
  ): Promise<Produto> {
    // Envia markup em formato decimal (ex: 60% -> 0.6) para compatibilidade com Produto.calcular_preco_venda no backend
    const markupBackend = dados.markup > 5 ? dados.markup / 100 : dados.markup;

    const res = await this.request<Produto>('/produtos/', {
      method: 'POST',
      body: JSON.stringify({
        nome: dados.nome,
        sku: dados.sku,
        preco_custo: dados.preco_custo,
        preco_venda: dados.preco_venda,
        markup: markupBackend,
        codigo_barras: dados.codigo_barras || null,
        imagem_url: dados.imagem_url || null,
        fornecedor_id: dados.fornecedor_id || null,
      }),
    });

    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }

    if (res.data) {
      const estoquePorLoja: Record<string, number> = {};
      let estoqueTotal = 0;

      if (dados.loja_id && dados.estoque_inicial && dados.estoque_inicial > 0) {
        await this.movimentarEstoque({
          loja_id: dados.loja_id,
          produto_id: res.data.id,
          tipo: 'ENTRADA',
          quantidade: dados.estoque_inicial,
          motivo: 'Estoque inicial de cadastro de produto',
        });
        estoquePorLoja[dados.loja_id] = dados.estoque_inicial;
        estoqueTotal = dados.estoque_inicial;
      }

      return {
        ...res.data,
        markup: dados.markup,
        estoque_por_loja: estoquePorLoja,
        estoque_total: estoqueTotal,
        estoque_minimo: dados.estoque_minimo ?? 5,
      };
    }
    return storage.addProduto(dados);
  }

  async createProdutoGrade(dados: CriarProdutoGradePayload): Promise<ProdutoComGradeResponse> {
    const markupBackend = dados.markup > 5 ? dados.markup / 100 : dados.markup;

    const res = await this.request<ProdutoComGradeResponse>('/produtos/grade', {
      method: 'POST',
      body: JSON.stringify({
        nome: dados.nome,
        sku_base: dados.sku_base,
        preco_custo: dados.preco_custo,
        preco_venda: dados.preco_venda,
        markup: markupBackend,
        atributos: dados.atributos,
        codigo_barras_base: dados.codigo_barras_base || null,
        imagem_url: dados.imagem_url || null,
        loja_id: dados.loja_id || null,
        estoque_inicial_por_variacao: dados.estoque_inicial_por_variacao || 0,
      }),
    });

    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }

    if (res.data) {
      return res.data;
    }

    return storage.createProdutoGrade(dados);
  }

  async getVariacoesProduto(produtoId: string): Promise<Produto[]> {
    const res = await this.request<Produto[]>(`/produtos/${produtoId}/variacoes`);
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) {
      return res.data;
    }
    return storage.getVariacoesProduto(produtoId);
  }

  async addVariacaoProduto(produtoId: string, dados: AdicionarVariacaoPayload): Promise<Produto> {
    const rawMarkup = dados.markup;
    const markupBackend = rawMarkup && rawMarkup > 5 ? rawMarkup / 100 : rawMarkup;

    const res = await this.request<Produto>(`/produtos/${produtoId}/variacoes`, {
      method: 'POST',
      body: JSON.stringify({
        variacoes: dados.variacoes,
        sku: dados.sku || null,
        codigo_barras: dados.codigo_barras || null,
        preco_custo: dados.preco_custo,
        preco_venda: dados.preco_venda,
        markup: markupBackend,
      }),
    });

    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }

    if (res.data) {
      return res.data;
    }

    return storage.addVariacaoProduto(produtoId, dados);
  }

  async updateProduto(id: string, updates: Partial<Produto>): Promise<Produto | null> {
    // Garante que campos obrigatórios do ProdutoUpdateRequest (nome, ativo, etc.) estejam presentes
    let baseProd: Produto | null = null;
    if (updates.nome === undefined || updates.ativo === undefined) {
      const currentRes = await this.request<Produto>(`/produtos/${id}`);
      baseProd = currentRes.data;
    }

    const mergedNome = updates.nome ?? baseProd?.nome ?? 'Produto';
    const mergedCusto = updates.preco_custo ?? baseProd?.preco_custo ?? 0;
    const mergedVenda = updates.preco_venda ?? baseProd?.preco_venda ?? 0;
    const rawMarkup = updates.markup ?? baseProd?.markup ?? 0;
    const markupBackend = rawMarkup > 5 ? rawMarkup / 100 : rawMarkup;
    const mergedAtivo = updates.ativo ?? baseProd?.ativo ?? true;
    const mergedBarcode =
      updates.codigo_barras !== undefined ? updates.codigo_barras : baseProd?.codigo_barras ?? null;
    const mergedImage =
      updates.imagem_url !== undefined ? updates.imagem_url : baseProd?.imagem_url ?? null;
    const mergedFornecedor =
      updates.fornecedor_id !== undefined ? updates.fornecedor_id : baseProd?.fornecedor_id ?? null;

    const res = await this.request<Produto>(`/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nome: mergedNome,
        preco_custo: mergedCusto,
        preco_venda: mergedVenda,
        markup: markupBackend,
        codigo_barras: mergedBarcode,
        imagem_url: mergedImage,
        fornecedor_id: mergedFornecedor,
        ativo: mergedAtivo,
      }),
    });

    if (res.data) {
      return {
        ...res.data,
        markup: rawMarkup > 0 && rawMarkup <= 5 ? Math.round(rawMarkup * 1000) / 10 : rawMarkup,
      };
    }
    return storage.updateProduto(id, updates);
  }

  // --- ESTOQUE, NF-E, AUDITORIA & LEDGER ---
  async getLedger(): Promise<MovimentacaoEstoque[]> {
    const res = await this.request<MovimentacaoEstoque[]>('/estoque/movimentacoes');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getLedger();
  }

  async movimentarEstoque(dados: {
    loja_id: string;
    produto_id: string;
    tipo: 'ENTRADA' | 'SAIDA';
    quantidade: number;
    motivo: string;
  }): Promise<MovimentacaoEstoque> {
    const res = await this.request<{ movimentacao: MovimentacaoEstoque }>('/estoque/movimentar', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data?.movimentacao) return res.data.movimentacao;
    return storage.addMovimentacao(dados);
  }

  async importarXmlNfe(
    file: File,
    lojaId?: string,
    markupPadraoPercent: number = 50
  ): Promise<ImportarNFeResponse> {
    const markupDecimal = markupPadraoPercent > 5 ? markupPadraoPercent / 100 : markupPadraoPercent;
    const params = new URLSearchParams();
    params.append('markup_padrao', String(markupDecimal));
    if (lojaId) {
      params.append('loja_id', lojaId);
    }

    const normalizedFile = file.name.toLowerCase().endsWith('.xml')
      ? file
      : new File([file], `${file.name.replace(/\.[^/.]+$/, '') || 'nfe_importada'}.xml`, {
          type: 'text/xml',
        });

    const formData = new FormData();
    formData.append('file', normalizedFile);

    const res = await this.request<ImportarNFeResponse>(
      `/estoque/importar-xml?${params.toString()}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }

    if (res.data) {
      return res.data;
    }

    // Fallback offline se o backend estiver desligado
    throw new Error('Servidor indisponível para processamento fiscal XML.');
  }

  async auditarEstoque(
    lojaId: string,
    itens: { produto_id: string; quantidade_fisica: number }[]
  ): Promise<AuditarEstoqueResponse> {
    const res = await this.request<AuditarEstoqueResponse>('/estoque/auditar', {
      method: 'POST',
      body: JSON.stringify({
        loja_id: lojaId,
        itens,
      }),
    });

    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }

    if (res.data) {
      return res.data;
    }

    // Fallback offline: aplica os ajustes no storage local
    const prods = storage.getProdutos();
    const movs: MovimentacaoEstoque[] = [];
    const auditItens = itens.map((it, i) => {
      const p = prods.find((pr) => pr.id === it.produto_id);
      const sis = p?.estoque_por_loja?.[lojaId] ?? 0;
      const diff = it.quantidade_fisica - sis;
      if (diff !== 0) {
        const m = storage.addMovimentacao({
          loja_id: lojaId,
          produto_id: it.produto_id,
          tipo: diff > 0 ? 'ENTRADA' : 'SAIDA',
          quantidade: Math.abs(diff),
          motivo: 'Ajuste de Auditoria Física Cega',
        });
        movs.push(m);
      }
      return {
        id: `aud-item-${i}`,
        produto_id: it.produto_id,
        quantidade_fisica: it.quantidade_fisica,
        quantidade_sistema: sis,
      };
    });

    return {
      auditoria: {
        id: `aud-${Date.now()}`,
        loja_id: lojaId,
        tenant_id: '00000000-0000-0000-0000-000000000001',
        data_auditoria: new Date().toISOString(),
        itens: auditItens,
      },
      movimentacoes_geradas: movs,
    };
  }

  // --- CLIENTES ---
  async getClientes(): Promise<Cliente[]> {
    const res = await this.request<Cliente[]>('/clientes/');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getClientes();
  }

  async createCliente(dados: Omit<Cliente, 'id' | 'tenant_id' | 'saldo_devedor_crediario'>): Promise<Cliente> {
    const res = await this.request<Cliente>('/clientes/', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.addCliente(dados);
  }

  async receberCrediario(clienteId: string, lojaId: string, valor: number): Promise<Cliente> {
    const res = await this.request<Cliente>(`/clientes/${clienteId}/receber-crediario`, {
      method: 'POST',
      body: JSON.stringify({ loja_id: lojaId, valor }),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;

    // Fallback offline
    const clientes = storage.getClientes();
    const idx = clientes.findIndex((c) => c.id === clienteId);
    if (idx === -1) throw new Error('Cliente não encontrado.');
    clientes[idx].saldo_devedor_crediario = Math.max(0, Number((clientes[idx].saldo_devedor_crediario - valor).toFixed(2)));
    localStorage.setItem('estroque_clientes', JSON.stringify(clientes));
    storage.addLancamentoFinanceiro({
      loja_id: lojaId,
      tipo: 'RECEITA',
      valor,
      categoria: 'Recebimento de Crediário',
      status_pagamento: 'PAGO',
      descricao: `Recebimento Crediário - ${clientes[idx].nome}`,
    });
    return clientes[idx];
  }

  // --- FORNECEDORES ---
  async getFornecedores(): Promise<Fornecedor[]> {
    const res = await this.request<Fornecedor[]>('/fornecedores/');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getFornecedores();
  }

  async createFornecedor(dados: Omit<Fornecedor, 'id' | 'tenant_id'>): Promise<Fornecedor> {
    const res = await this.request<Fornecedor>('/fornecedores/', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.addFornecedor(dados);
  }

  // --- TRANSFERENCIAS ---
  async getTransferencias(): Promise<TransferenciaEstoque[]> {
    const res = await this.request<TransferenciaEstoque[]>('/estoque/transferencias');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getTransferencias();
  }

  async solicitarTransferencia(dados: {
    loja_origem_id: string;
    loja_destino_id: string;
    produto_id: string;
    quantidade: number;
  }): Promise<TransferenciaEstoque> {
    const res = await this.request<TransferenciaEstoque>('/estoque/transferencias', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.solicitarTransferencia(dados);
  }

  async despacharTransferencia(id: string): Promise<TransferenciaEstoque | null> {
    const res = await this.request<TransferenciaEstoque>(`/estoque/transferencias/${id}/despachar`, {
      method: 'POST',
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.despacharTransferencia(id);
  }

  async receberTransferencia(
    id: string,
    quantidadeRecebida: number,
    justificativa?: string
  ): Promise<TransferenciaEstoque | null> {
    const res = await this.request<TransferenciaEstoque>(`/estoque/transferencias/${id}/receber`, {
      method: 'POST',
      body: JSON.stringify({ quantidade_recebida: quantidadeRecebida, justificativa }),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.receberTransferencia(id, quantidadeRecebida, justificativa);
  }

  // --- VENDAS (PDV) ---
  async getVendas(lojaId?: string, dataInicio?: string, dataFim?: string): Promise<Venda[]> {
    const params = new URLSearchParams();
    if (lojaId) params.append('loja_id', lojaId);
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim) params.append('data_fim', dataFim);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await this.request<Venda[]>(`/vendas${query}`);
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getVendas(lojaId, dataInicio, dataFim);
  }

  async registrarVenda(dados: {
    loja_id: string;
    cliente_id?: string | null;
    forma_pagamento?: Venda['forma_pagamento'];
    desconto: number;
    itens: { produto_id: string; quantidade: number; preco_unitario: number; produto_nome?: string; sku?: string }[];
    pagamentos?: { forma_pagamento: FormaPagamento; valor: number }[];
  }): Promise<Venda> {
    const res = await this.request<Venda>('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        loja_id: dados.loja_id,
        cliente_id: dados.cliente_id || null,
        forma_pagamento: dados.forma_pagamento || (dados.pagamentos && dados.pagamentos.length > 0 ? dados.pagamentos[0].forma_pagamento : 'DINHEIRO'),
        desconto: dados.desconto,
        itens: dados.itens.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
        pagamentos: dados.pagamentos,
      }),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.registrarVenda(dados);
  }

  async estornarVenda(id: string): Promise<Venda> {
    const res = await this.request<Venda>(`/vendas/${id}/estornar`, {
      method: 'POST',
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.estornarVenda(id);
  }

  async devolverVenda(id: string, payload: RegistrarDevolucaoPayload): Promise<Devolucao> {
    const res = await this.request<Devolucao>(`/vendas/${id}/devolver`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.devolverVenda(id, payload);
  }

  async obterDevolucoesVenda(id: string): Promise<Devolucao[]> {
    const res = await this.request<Devolucao[]>(`/vendas/${id}/devolucoes`);
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.obterDevolucoesVenda(id);
  }

  // --- VENDAS EM ESPERA (HOLD) ---
  async getVendasEspera(): Promise<VendaEmEspera[]> {
    return storage.getVendasEspera();
  }

  async salvarVendaEspera(dados: Omit<VendaEmEspera, 'id' | 'codigo' | 'criado_em'>): Promise<VendaEmEspera> {
    return storage.salvarVendaEspera(dados);
  }

  async removerVendaEspera(id: string): Promise<void> {
    storage.removerVendaEspera(id);
  }

  // --- EQUIPE & USUÁRIOS ---
  async getUsuarios(): Promise<User[]> {
    const res = await this.request<User[]>('/auth/usuarios');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    const current = storage.getUser();
    return current ? [current] : [];
  }

  async createUsuario(dados: {
    nome: string;
    email: string;
    senha: string;
    role: 'DONO' | 'GERENTE';
    loja_atribuida_id?: string | null;
  }): Promise<User> {
    const res = await this.request<User>('/auth/usuarios', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    throw new Error('Servidor indisponível para cadastro de usuário.');
  }

  // --- OPERAÇÕES DE CAIXA (TURNO) ---
  async getCaixaTurno(lojaId?: string): Promise<CaixaTurno> {
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-')) {
      const res = await this.request<CaixaTurno>(`/caixa/turno-atual?loja_id=${activeId}`);
      if (res.data) {
        storage.setCaixaTurno(res.data);
        return res.data;
      }
    }
    return storage.getCaixaTurno();
  }

  async getHistoricoTurnos(lojaId?: string): Promise<TurnoFechadoHistorico[]> {
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-')) {
      const res = await this.request<TurnoFechadoHistorico[]>(`/caixa/historico?loja_id=${activeId}`);
      if (res.data && Array.isArray(res.data)) {
        storage.setHistoricoTurnos(res.data);
        return res.data;
      }
    }
    return storage.getHistoricoTurnos();
  }

  async abrirCaixa(fundoInicial: number, lojaId?: string): Promise<CaixaTurno> {
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-')) {
      const res = await this.request<CaixaTurno>('/caixa/abrir', {
        method: 'POST',
        body: JSON.stringify({ loja_id: activeId, fundo_inicial: fundoInicial }),
      });
      if (res.data) {
        storage.setCaixaTurno(res.data);
        return res.data;
      }
    }
    return storage.abrirCaixa(fundoInicial);
  }

  async registrarSangria(valor: number, motivo: string, lojaId?: string): Promise<OperacaoCaixa> {
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-')) {
      const res = await this.request<OperacaoCaixa>('/caixa/operacoes', {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'SANGRIA',
          valor,
          motivo,
          loja_id: activeId,
        }),
      });
      if (res.data) {
        storage.registrarSangria(valor, motivo);
        return res.data;
      }
    }
    return storage.registrarSangria(valor, motivo);
  }

  async registrarSuprimento(valor: number, motivo: string, lojaId?: string): Promise<OperacaoCaixa> {
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-')) {
      const res = await this.request<OperacaoCaixa>('/caixa/operacoes', {
        method: 'POST',
        body: JSON.stringify({
          tipo: 'SUPRIMENTO',
          valor,
          motivo,
          loja_id: activeId,
        }),
      });
      if (res.data) {
        storage.registrarSuprimento(valor, motivo);
        return res.data;
      }
    }
    return storage.registrarSuprimento(valor, motivo);
  }

  async fecharCaixa(
    saldoInformado: number,
    observacao?: string,
    lojaId?: string
  ): Promise<{ diferenca: number; resumo: CaixaTurno }> {
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-')) {
      const res = await this.request<{ diferenca: number; resumo: CaixaTurno }>('/caixa/fechar', {
        method: 'POST',
        body: JSON.stringify({
          loja_id: activeId,
          saldo_informado: saldoInformado,
          observacao,
        }),
      });
      if (res.data) {
        storage.fecharCaixa(saldoInformado, observacao);
        return res.data;
      }
    }
    return storage.fecharCaixa(saldoInformado, observacao);
  }


  // --- FINANCEIRO ---
  async getFinanceiro(lojaId?: string): Promise<FinanceiroLancamento[]> {
    const endpoint = lojaId ? `/financeiro/lancamentos?loja_id=${lojaId}` : '/financeiro/lancamentos';
    const res = await this.request<FinanceiroLancamento[]>(endpoint);
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getFinanceiro();
  }

  async registrarDespesa(dados: {
    loja_id: string;
    valor: number;
    categoria: string;
    status_pagamento: 'PENDENTE' | 'PAGO';
    descricao?: string;
  }): Promise<FinanceiroLancamento> {
    const res = await this.request<FinanceiroLancamento>('/financeiro/despesas', {
      method: 'POST',
      body: JSON.stringify(dados),
    });
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;
    return storage.addLancamentoFinanceiro({
      ...dados,
      tipo: 'DESPESA',
    });
  }

  async quitarLancamento(lancamentoId: string): Promise<FinanceiroLancamento> {
    const res = await this.request<FinanceiroLancamento>(
      `/financeiro/lancamentos/${lancamentoId}/pagar`,
      {
        method: 'PATCH',
      }
    );
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
    if (res.data) return res.data;

    // Fallback offline
    const list = storage.getFinanceiro();
    const idx = list.findIndex((l) => l.id === lancamentoId);
    if (idx === -1) throw new Error('Lançamento não encontrado.');
    list[idx].status_pagamento = 'PAGO';
    list[idx].data_pagamento = new Date().toISOString();
    localStorage.setItem('estroque_financeiro', JSON.stringify(list));
    return list[idx];
  }


  // --- ANALYTICS ---
  async getDashboardAnalytics(lojaId?: string): Promise<DashboardAnalytics> {
    const endpoint = lojaId ? `/analytics/dashboard?loja_id=${lojaId}` : '/analytics/dashboard';
    const res = await this.request<DashboardAnalytics>(endpoint);
    if (res.data) return res.data;
    return storage.getDashboardAnalytics(lojaId);
  }

  async getCurvaABC(lojaId?: string): Promise<CurvaABCItem[]> {
    const endpoint = lojaId ? `/analytics/curva-abc?loja_id=${lojaId}` : '/analytics/curva-abc';
    const res = await this.request<{ itens: CurvaABCItem[] }>(endpoint);
    if (res.data?.itens) return res.data.itens;
    return storage.getCurvaABC();
  }

  // --- SUPER-ADMIN PLATAFORMA ---
  async getPlataformaDashboard(): Promise<PlataformaDashboardMetrics> {
    const res = await this.request<PlataformaDashboardMetrics>('/admin/dashboard');
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    return {
      total_tenants: 1,
      tenants_ativos: 1,
      tenants_suspensos: 0,
      total_lojas: 1,
      total_usuarios: 1,
      mrr_estimado: 249.0,
      gmv_total: 0.0,
      total_vendas: 0,
    };
  }

  async getAdminTenants(busca?: string, apenasAtivos?: boolean): Promise<TenantAdmin[]> {
    const params = new URLSearchParams();
    if (busca) params.append('busca', busca);
    if (apenasAtivos !== undefined) params.append('apenas_ativos', String(apenasAtivos));
    const qs = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<TenantAdmin[]>(`/admin/tenants${qs}`);
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    return [];
  }

  async getAdminTenantDetalhe(tenantId: string): Promise<TenantAdmin> {
    const res = await this.request<TenantAdmin>(`/admin/tenants/${tenantId}`);
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    throw new Error('Tenant não encontrado');
  }

  async alterarStatusTenant(tenantId: string, ativo: boolean): Promise<TenantAdmin> {
    const res = await this.request<TenantAdmin>(`/admin/tenants/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ ativo }),
    });
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    throw new Error('Falha ao alterar status do tenant');
  }

  async alterarPlanoTenant(tenantId: string, payload: AlterarPlanoPayload): Promise<TenantAdmin> {
    const res = await this.request<TenantAdmin>(`/admin/tenants/${tenantId}/plano`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    throw new Error('Falha ao alterar plano do tenant');
  }

  async getTenantModulos(tenantId: string): Promise<TenantModulosResponse> {
    const res = await this.request<TenantModulosResponse>(`/admin/tenants/${tenantId}/modulos`);
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    return storage.getTenantModulos(tenantId);
  }

  async updateTenantModulos(tenantId: string, modulos: Record<string, boolean>): Promise<TenantModulosResponse> {
    const res = await this.request<TenantModulosResponse>(`/admin/tenants/${tenantId}/modulos`, {
      method: 'PATCH',
      body: JSON.stringify({ modulos }),
    });
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    return storage.updateTenantModulos(tenantId, modulos);
  }

  async getModulosCatalogo(): Promise<{ modulos: Record<string, any>; planos_padrao: Record<string, string[]> }> {
    const res = await this.request<{ modulos: Record<string, any>; planos_padrao: Record<string, string[]> }>('/admin/modulos/catalogo');
    if (res.data) return res.data;
    return storage.getModulosCatalogo();
  }

  async getAdminTenantDetalhesCompletos(tenantId: string): Promise<TenantDetalhesCompletos> {
    const res = await this.request<TenantDetalhesCompletos>(`/admin/tenants/${tenantId}/detalhes`);
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    throw new Error('Falha ao carregar detalhes completos do tenant');
  }

  async getAdminPlanos(): Promise<PlanoConfig[]> {
    const res = await this.request<PlanoConfig[]>('/admin/planos');
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    return [
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
    ];
  }

  async atualizarAdminPlano(planoId: string, payload: AtualizarPlanoConfigPayload): Promise<PlanoConfig> {
    const res = await this.request<PlanoConfig>(`/admin/planos/${planoId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    throw new Error('Falha ao atualizar plano');
  }

  async cadastrarAdminTenant(payload: CadastrarTenantPayload): Promise<TenantAdmin> {
    const res = await this.request<TenantAdmin>('/admin/tenants', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    throw new Error('Falha ao cadastrar inquilino');
  }

  async cadastrarAdminLoja(tenantId: string, payload: CadastrarLojaPayload): Promise<TenantLojaResumo> {
    const res = await this.request<TenantLojaResumo>(`/admin/tenants/${tenantId}/lojas`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    throw new Error('Falha ao cadastrar filial');
  }

  async redefinirSenhaUsuarioAdmin(usuarioId: string, novaSenha: string): Promise<{ mensagem: string }> {
    const res = await this.request<{ mensagem: string }>(`/admin/usuarios/${usuarioId}/redefinir-senha`, {
      method: 'POST',
      body: JSON.stringify({ nova_senha: novaSenha }),
    });
    if (res.data) return res.data;
    if (res.isBackend && res.error) throw new Error(res.error);
    return { mensagem: 'Senha redefinida com sucesso (modo demonstração).' };
  }
}

export const api = new ApiClient();
