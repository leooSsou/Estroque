import {
  User,
  Loja,
  Produto,
  EstoqueSaldo,
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
  ImportarNFeResponse,
  AuditarEstoqueResponse,
  RegisterTenantPayload,
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
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
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

    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }

    if (res.data) {
      const auth = await this.login(dados.dono_email, dados.dono_senha);
      // Cria automaticamente a Loja Matriz inicial usando o CNPJ cadastrado
      await this.createLoja({
        nome: `Matriz - ${dados.nome_fantasia}`,
        cnpj: dados.cnpj,
        endereco: dados.endereco_loja || 'Endereço Matriz Principal',
        ativo: true,
      }).catch(() => null);
      return auth;
    }

    // Fallback offline
    const demoToken = 'mock-jwt-token-donodemo';
    this.setToken(demoToken);
    const newUser: User = {
      id: crypto.randomUUID ? crypto.randomUUID() : `usr-${Date.now()}`,
      nome: dados.dono_nome,
      email: dados.dono_email,
      role: 'DONO',
      tenant_id: '00000000-0000-0000-0000-000000000001',
    };
    storage.setUser(newUser);
    storage.addLoja({
      nome: `Matriz - ${dados.nome_fantasia}`,
      cnpj: dados.cnpj,
      endereco: dados.endereco_loja || 'Endereço Matriz Principal',
      ativo: true,
    });
    return { user: newUser, token: demoToken };
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

    // Se o backend está online e o usuário clicou na conta demo num banco recém-criado,
    // provisionamos automaticamente o tenant de demonstração no PostgreSQL real
    if (res.isBackend && email === 'dono@estroque.com.br') {
      try {
        return await this.registerTenant({
          nome_fantasia: 'Estroque Varejo Matriz',
          razao_social: 'Estroque Comercio Varejista Ltda',
          cnpj: '11.222.333/0001-81',
          endereco_loja: 'Av. Paulista, 1000 - São Paulo, SP',
          dono_nome: 'Jonathas Silva',
          dono_email: 'dono@estroque.com.br',
          dono_senha: senha || 'senha123',
        });
      } catch {
        // Caso já exista com outra senha ou erro, segue para fallback
      }
    }

    if (res.isBackend && res.error && email !== 'dono@estroque.com.br') {
      throw new Error(res.error);
    }

    // Local / Demo Login fallback
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

    const formData = new FormData();
    formData.append('file', file);

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
    if (res.isBackend && res.error) {
      throw new Error(res.error);
    }
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
