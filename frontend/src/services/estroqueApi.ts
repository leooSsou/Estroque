import { apiRequest } from "@/lib/api";

export interface DashboardResponse {
  total_faturamento: number;
  ticket_medio: number;
  produtos_estoque_critico: number;
  produtos_ruptura: number;
  total_itens_vendidos: number;
}

export interface CurvaABCItem {
  produto_id: string;
  nome_produto: string;
  sku: string;
  faturamento_total: number;
  faturamento_acumulado: number;
  percentual_representatividade: number;
  percentual_acumulado: number;
  classe: "A" | "B" | "C";
}

export interface CurvaABCResponse {
  total_faturamento_periodo: number;
  produtos: CurvaABCItem[];
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
  tipo_movimentacao: "ENTRADA" | "SAIDA" | "AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO" | "TRANSFERENCIA_ENTRADA" | "TRANSFERENCIA_SAIDA";
  data_movimentacao: string;
  observacao?: string | null;
}

export interface Transferencia {
  id: string;
  loja_origem_id: string;
  loja_destino_id: string;
  status: "SOLICITADO" | "DESPACHADO" | "RECEBIDO" | "DIVERGENTE";
  itens: Array<{
    produto_id: string;
    quantidade_solicitada: number;
    quantidade_enviada?: number;
    quantidade_recebida?: number;
  }>;
  data_solicitacao: string;
  data_despacho?: string | null;
  data_recebimento?: string | null;
}

export interface Venda {
  id: string;
  loja_id: string;
  cliente_id?: string | null;
  valor_total: number;
  tipo_pagamento: "DINHEIRO" | "PIX" | "CARTAO_DEBITO" | "CARTAO_CREDITO" | "CREDIARIO";
  itens: Array<{
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
  }>;
  data_venda: string;
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
  email: string;
  telefone: string;
  ativo: boolean;
}

export const estroqueApi = {
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
  importarXmlNfe: (xmlContent: string) => {
    const formData = new FormData();
    const blob = new Blob([xmlContent], { type: "application/xml" });
    formData.append("arquivo_xml", blob, "nfe.xml");
    return apiRequest<{ mensagem: string; produtos_importados: number }>("/estoque/importar-xml", {
      method: "POST",
      body: formData,
    });
  },

  // 🚚 Transferências
  getTransferencias: () => apiRequest<Transferencia[]>("/transferencias/"),
  criarTransferencia: (data: Partial<Transferencia>) =>
    apiRequest<Transferencia>("/transferencias/", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  despacharTransferencia: (id: string) =>
    apiRequest<Transferencia>(`/transferencias/${id}/despachar`, {
      method: "POST",
    }),
  receberTransferencia: (id: string, itensRecebidos: Array<{ produto_id: string; quantidade: number }>) =>
    apiRequest<Transferencia>(`/transferencias/${id}/receber`, {
      method: "POST",
      body: JSON.stringify({ itens: itensRecebidos }),
    }),

  // 💵 Vendas
  getVendas: () => apiRequest<Venda[]>("/vendas/"),
  criarVenda: (data: Partial<Venda>) =>
    apiRequest<Venda>("/vendas/", {
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
};
