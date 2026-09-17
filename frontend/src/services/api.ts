import {
  User,
  Loja,
  Produto,
  MovimentacaoEstoque,
  Cliente,
  Fornecedor,
  TransferenciaEstoque,
  Venda,
  VendaEmEspera,
  CaixaTurno,
  OperacaoCaixa,
  FinanceiroLancamento,
  DashboardAnalytics,
  CurvaABCItem,
} from '../types';
import { storage } from './storage';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('estroque_access_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('estroque_access_token', token);
    } else {
      localStorage.removeItem('estroque_access_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ data: T | null; error: string | null; isBackend: boolean }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        return {
          data: null,
          error: errorData.detail || `Erro HTTP ${res.status}`,
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

  // --- AUTH ---
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

    // Local / Demo Login
    const demoToken = 'mock-jwt-token-donodemo';
    this.setToken(demoToken);
    const user = storage.getUser();
    return { user, token: demoToken };
  }

  async getMe(): Promise<User> {
    const res = await this.request<User>('/auth/me');
    if (res.data) {
      storage.setUser(res.data);
      return res.data;
    }
    return storage.getUser();
  }

  logout() {
    this.setToken(null);
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
    if (res.data) return res.data;
    return storage.addLoja(dados);
  }

  // --- PRODUTOS ---
  async getProdutos(lojaId?: string): Promise<Produto[]> {
    const endpoint = lojaId ? `/produtos/?loja_id=${lojaId}` : '/produtos/';
    const res = await this.request<Produto[]>(endpoint);
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getProdutos();
  }

  async createProduto(
    dados: Omit<Produto, 'id' | 'tenant_id' | 'estoque_total'> & {
      estoque_inicial?: number;
      loja_id?: string;
    }
  ): Promise<Produto> {
    const res = await this.request<Produto>('/produtos/', {
      method: 'POST',
      body: JSON.stringify({
        nome: dados.nome,
        sku: dados.sku,
        preco_custo: dados.preco_custo,
        preco_venda: dados.preco_venda,
        markup: dados.markup,
        codigo_barras: dados.codigo_barras || null,
        fornecedor_id: dados.fornecedor_id || null,
      }),
    });

    if (res.data) return res.data;
    return storage.addProduto(dados);
  }

  async updateProduto(id: string, updates: Partial<Produto>): Promise<Produto | null> {
    const res = await this.request<Produto>(`/produtos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (res.data) return res.data;
    return storage.updateProduto(id, updates);
  }

  // --- ESTOQUE & LEDGER ---
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
    if (res.data?.movimentacao) return res.data.movimentacao;
    return storage.addMovimentacao(dados);
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
    if (res.data) return res.data;
    return storage.addCliente(dados);
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
    if (res.data) return res.data;
    return storage.solicitarTransferencia(dados);
  }

  async despacharTransferencia(id: string): Promise<TransferenciaEstoque | null> {
    const res = await this.request<TransferenciaEstoque>(`/estoque/transferencias/${id}/despachar`, {
      method: 'POST',
    });
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
    if (res.data) return res.data;
    return storage.receberTransferencia(id, quantidadeRecebida, justificativa);
  }

  // --- VENDAS (PDV) ---
  async getVendas(): Promise<Venda[]> {
    const res = await this.request<Venda[]>('/vendas');
    if (res.data && Array.isArray(res.data)) {
      return res.data;
    }
    return storage.getVendas();
  }

  async registrarVenda(dados: {
    loja_id: string;
    cliente_id?: string | null;
    forma_pagamento: Venda['forma_pagamento'];
    desconto: number;
    itens: { produto_id: string; quantidade: number; preco_unitario: number; produto_nome?: string; sku?: string }[];
  }): Promise<Venda> {
    const res = await this.request<Venda>('/vendas', {
      method: 'POST',
      body: JSON.stringify({
        loja_id: dados.loja_id,
        cliente_id: dados.cliente_id || null,
        forma_pagamento: dados.forma_pagamento,
        desconto: dados.desconto,
        itens: dados.itens.map((i) => ({ produto_id: i.produto_id, quantidade: i.quantidade })),
      }),
    });
    if (res.data) return res.data;
    return storage.registrarVenda(dados);
  }

  async estornarVenda(id: string): Promise<Venda> {
    const res = await this.request<Venda>(`/vendas/${id}/estornar`, {
      method: 'POST',
    });
    if (res.data) return res.data;
    return storage.estornarVenda(id);
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

  // --- OPERAÇÕES DE CAIXA (TURNO) ---
  async getCaixaTurno(): Promise<CaixaTurno> {
    return storage.getCaixaTurno();
  }

  async abrirCaixa(fundoInicial: number): Promise<CaixaTurno> {
    return storage.abrirCaixa(fundoInicial);
  }

  async registrarSangria(valor: number, motivo: string): Promise<OperacaoCaixa> {
    return storage.registrarSangria(valor, motivo);
  }

  async registrarSuprimento(valor: number, motivo: string): Promise<OperacaoCaixa> {
    return storage.registrarSuprimento(valor, motivo);
  }

  async fecharCaixa(saldoInformado: number, observacao?: string): Promise<{ diferenca: number; resumo: CaixaTurno }> {
    return storage.fecharCaixa(saldoInformado, observacao);
  }

  // --- FINANCEIRO ---
  async getFinanceiro(): Promise<FinanceiroLancamento[]> {
    const res = await this.request<FinanceiroLancamento[]>('/financeiro/lancamentos');
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
    if (res.data) return res.data;
    return storage.addLancamentoFinanceiro({
      ...dados,
      tipo: 'DESPESA',
    });
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
}

export const api = new ApiClient();
