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
  FormaPagamento,
  PagamentoVenda,
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
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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
        cnpj: dados.cnpj,
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
        throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão ou se a API está online.');
      }
      throw new Error(res.error);
    }

    throw new Error('Credenciais inválidas.');
  }

  async getMe(): Promise<User> {
    const res = await this.request<User>('/auth/me');
    if (res.data) {
      storage.setUser(res.data);
      return res.data;
    }
    const localUser = storage.getUser();
    if (localUser && this.token) {
      return localUser;
    }
    throw new Error('Não autenticado');
  }

  logout() {
    this.setToken(null);
    storage.setUser(null);
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
  async getCaixaTurno(): Promise<CaixaTurno> {
    return storage.getCaixaTurno();
  }

  async abrirCaixa(fundoInicial: number): Promise<CaixaTurno> {
    return storage.abrirCaixa(fundoInicial);
  }

  async registrarSangria(valor: number, motivo: string, lojaId?: string): Promise<OperacaoCaixa> {
    const op = storage.registrarSangria(valor, motivo);
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-')) {
      await this.request('/financeiro/despesas', {
        method: 'POST',
        body: JSON.stringify({
          loja_id: activeId,
          valor,
          categoria: `Sangria de Caixa: ${motivo}`.slice(0, 50),
          status_pagamento: 'PAGO',
        }),
      });
    }
    return op;
  }

  async registrarSuprimento(valor: number, motivo: string, lojaId?: string): Promise<OperacaoCaixa> {
    const op = storage.registrarSuprimento(valor, motivo);
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-')) {
      await this.request('/financeiro/receitas', {
        method: 'POST',
        body: JSON.stringify({
          loja_id: activeId,
          valor,
          categoria: `Suprimento de Caixa: ${motivo}`.slice(0, 50),
          status_pagamento: 'PAGO',
        }),
      });
    }
    return op;
  }

  async fecharCaixa(
    saldoInformado: number,
    observacao?: string,
    lojaId?: string
  ): Promise<{ diferenca: number; resumo: CaixaTurno }> {
    const res = storage.fecharCaixa(saldoInformado, observacao);
    const activeId =
      lojaId ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('estroque_active_loja_id') : null);
    if (activeId && this.token && !this.token.startsWith('mock-jwt-token-') && res.diferenca !== 0) {
      if (res.diferenca < 0) {
        await this.request('/financeiro/despesas', {
          method: 'POST',
          body: JSON.stringify({
            loja_id: activeId,
            valor: Math.abs(res.diferenca),
            categoria: 'Quebra de Caixa (Fechamento)',
            status_pagamento: 'PAGO',
          }),
        });
      } else {
        await this.request('/financeiro/receitas', {
          method: 'POST',
          body: JSON.stringify({
            loja_id: activeId,
            valor: res.diferenca,
            categoria: 'Sobra de Caixa (Fechamento)',
            status_pagamento: 'PAGO',
          }),
        });
      }
    }
    return res;
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
}

export const api = new ApiClient();
