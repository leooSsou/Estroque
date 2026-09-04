import { apiRequest } from "@/lib/api";

export interface DashboardResponse {
  ticket_medio: number;
  faturamento_bruto: number;
  faturamento_liquido: number;
  total_faturamento?: number;
  desconto_total: number;
  cmv: number;
  lucro_liquido: number;
  margem_lucro: number;
  estoque_critico_count: number;
  produtos_estoque_critico?: number;
  ruptura_count: number;
  produtos_ruptura?: number;
  total_itens_vendidos?: number;
}

export interface CurvaABCItem {
  produto_id: string;
  nome: string;
  nome_produto?: string;
  sku: string;
  faturamento: number;
  faturamento_total?: number;
  percentual: number;
  percentual_representatividade?: number;
  percentual_acumulado: number;
  classe: "A" | "B" | "C";
}

export interface CurvaABCResponse {
  itens: CurvaABCItem[];
  produtos?: CurvaABCItem[];
  total_faturamento_periodo?: number;
}

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco_custo: number;
  preco_venda: number;
  markup: number;
  codigo_barras?: string | null;
  fornecedor_id?: string | null;
  categoria?: string;
  ativo: boolean;
}

export interface EstoqueSaldo {
  id: string;
  loja_id: string;
  produto_id: string;
  quantidade: number;
}

export interface EstoqueMovimentacao {
  id: string;
  loja_id: string;
  produto_id: string;
  quantidade: number;
  tipo?: string;
  tipo_movimentacao?: string;
  data_movimentacao: string;
  motivo?: string | null;
  observacao?: string | null;
}

export interface Transferencia {
  id: string;
  tenant_id: string;
  loja_origem_id: string;
  loja_destino_id: string;
  produto_id: string;
  quantidade: number;
  status: "SOLICITADO" | "DESPACHADO" | "RECEBIDO" | "DIVERGENTE";
  data_solicitacao?: string;
  data_despacho?: string | null;
  data_recebimento?: string | null;
  quantidade_recebida?: number | null;
  justificativa?: string | null;
}

export interface Venda {
  id: string;
  loja_id: string;
  cliente_id?: string | null;
  usuario_id?: string;
  status: string;
  forma_pagamento: "DINHEIRO" | "PIX" | "CARTAO_DEBITO" | "CARTAO_CREDITO" | "CREDIARIO";
  tipo_pagamento?: "DINHEIRO" | "PIX" | "CARTAO_DEBITO" | "CARTAO_CREDITO" | "CREDIARIO";
  valor_total: number;
  desconto: number;
  data_venda?: string;
  itens?: Array<{
    id?: string;
    produto_id: string;
    quantidade: number;
    preco_unitario?: number;
  }>;
}

export interface Loja {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  ativo: boolean;
}

export interface Fornecedor {
  id: string;
  razao_social: string;
  nome_fantasia?: string | null;
  cnpj: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
}

export interface UsuarioMe {
  id: string;
  nome: string;
  email: string;
  role: string;
  tenant_id: string;
  loja_atribuida_id?: string | null;
}

export interface FinanceiroLancamento {
  id: string;
  loja_id: string;
  tipo: "RECEITA" | "DESPESA";
  valor: number;
  categoria: string;
  status_pagamento: "PENDENTE" | "PAGO";
  data_lancamento: string;
  data_pagamento?: string | null;
  tenant_id: string;
}

export interface NovaDespesaInput {
  loja_id: string;
  valor: number;
  categoria: string;
  status_pagamento: "PENDENTE" | "PAGO";
  data_pagamento?: string | null;
}

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  documento: string;
  tenant_id: string;
  ativo: boolean;
  limite_credito: number;
  saldo_devedor_crediario: number;
}

export interface ClienteCreateInput {
  nome: string;
  email: string;
  documento: string;
  limite_credito?: number;
}

export const estroqueApi = {
  // 👤 Usuário & Tenant
  getMe: () => apiRequest<UsuarioMe>("/auth/me"),
  login: (data: { email: string; senha: string }) =>
    apiRequest<{ access_token: string; token_type: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 📊 Analytics & Dashboard
  getDashboardKPIs: () => apiRequest<DashboardResponse>("/analytics/dashboard"),
  getCurvaABC: () => apiRequest<CurvaABCResponse>("/analytics/curva-abc"),

  // 📦 Produtos & Catálogo
  getProdutos: (busca?: string) =>
    apiRequest<Produto[]>(busca && busca.trim() ? `/produtos/?busca=${encodeURIComponent(busca.trim())}` : "/produtos/"),
  criarProduto: (data: Partial<Produto>) =>
    apiRequest<Produto>("/produtos/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 🔁 Estoque & Ledger
  getSaldos: (lojaId?: string) =>
    apiRequest<EstoqueSaldo[]>(lojaId ? `/estoque/saldos?loja_id=${lojaId}` : "/estoque/saldos"),
  getMovimentacoes: (lojaId?: string) =>
    apiRequest<EstoqueMovimentacao[]>(
      lojaId ? `/estoque/movimentacoes?loja_id=${lojaId}` : "/estoque/movimentacoes"
    ),
  movimentarEstoque: (data: {
    loja_id: string;
    produto_id: string;
    tipo: "ENTRADA" | "SAIDA";
    quantidade: number;
    motivo: string;
  }) =>
    apiRequest<{ saldo: EstoqueSaldo; movimentacao: EstoqueMovimentacao }>("/estoque/movimentar", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  auditarEstoque: (data: {
    loja_id: string;
    itens: Array<{ produto_id: string; quantidade_fisica: number }>;
  }) =>
    apiRequest<{
      auditoria: any;
      movimentacoes_geradas: EstoqueMovimentacao[];
    }>("/estoque/auditoria", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  importarXmlNfe: (xmlContent: string, lojaId?: string) => {
    const formData = new FormData();
    const blob = new Blob([xmlContent], { type: "application/xml" });
    formData.append("file", blob, "nfe.xml");
    const query = lojaId ? `?loja_id=${lojaId}` : "";
    return apiRequest<any>(`/estoque/importar-xml${query}`, {
      method: "POST",
      body: formData,
    });
  },

  // 🚚 Transferências
  getTransferencias: () => apiRequest<Transferencia[]>("/estoque/transferencias"),
  criarTransferencia: (data: {
    loja_origem_id: string;
    loja_destino_id: string;
    produto_id: string;
    quantidade: number;
  }) =>
    apiRequest<Transferencia>("/estoque/transferencias", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  despacharTransferencia: (id: string) =>
    apiRequest<Transferencia>(`/estoque/transferencias/${id}/despachar`, {
      method: "POST",
    }),
  receberTransferencia: (id: string, data: { quantidade_recebida: number; justificativa?: string | null }) =>
    apiRequest<Transferencia>(`/estoque/transferencias/${id}/receber`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 💵 Vendas
  getVendas: (lojaId?: string) =>
    apiRequest<Venda[]>(lojaId ? `/vendas?loja_id=${lojaId}` : "/vendas"),
  criarVenda: (data: {
    loja_id: string;
    cliente_id?: string | null;
    forma_pagamento: string;
    desconto?: number;
    itens: Array<{ produto_id: string; quantidade: number }>;
  }) =>
    apiRequest<Venda>("/vendas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 🏢 Lojas
  getLojas: () => apiRequest<Loja[]>("/lojas/"),
  criarLoja: (data: Partial<Loja>) =>
    apiRequest<Loja>("/lojas/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 🤝 Fornecedores
  getFornecedores: () => apiRequest<Fornecedor[]>("/fornecedores/"),
  criarFornecedor: (data: Partial<Fornecedor>) =>
    apiRequest<Fornecedor>("/fornecedores/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 👥 Clientes & Crediário
  getClientes: () => apiRequest<Cliente[]>("/clientes/"),
  criarCliente: (data: ClienteCreateInput) =>
    apiRequest<Cliente>("/clientes/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // 💰 Financeiro & Fluxo de Caixa
  getLancamentosFinanceiros: (params?: {
    loja_id?: string;
    tipo?: string;
    data_inicio?: string;
    data_fim?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.loja_id) searchParams.append("loja_id", params.loja_id);
    if (params?.tipo) searchParams.append("tipo", params.tipo);
    if (params?.data_inicio) searchParams.append("data_inicio", params.data_inicio);
    if (params?.data_fim) searchParams.append("data_fim", params.data_fim);
    const qs = searchParams.toString();
    return apiRequest<FinanceiroLancamento[]>(qs ? `/financeiro/lancamentos?${qs}` : "/financeiro/lancamentos");
  },
  registrarDespesa: (data: NovaDespesaInput) =>
    apiRequest<FinanceiroLancamento>("/financeiro/despesas", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
