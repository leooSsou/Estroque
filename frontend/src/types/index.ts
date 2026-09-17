export type UserRole = 'DONO' | 'GERENTE' | 'VENDEDOR' | 'ADMIN_SAAS';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  tenant_id: string;
  loja_atribuida_id?: string | null;
}

export interface Loja {
  id: string;
  nome: string;
  cnpj: string;
  endereco: string;
  tenant_id: string;
  ativo: boolean;
}

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  preco_custo: number;
  preco_venda: number;
  markup: number; // e.g. 65.0 means 65%
  codigo_barras?: string | null;
  categoria?: string;
  fornecedor_id?: string | null;
  tenant_id: string;
  ativo: boolean;
  estoque_por_loja?: Record<string, number>;
  estoque_total?: number;
  estoque_minimo?: number;
}

export interface EstoqueSaldo {
  id: string;
  loja_id: string;
  produto_id: string;
  quantidade: number;
  tenant_id: string;
}

export interface MovimentacaoEstoque {
  id: string;
  loja_id: string;
  produto_id: string;
  tipo: 'ENTRADA' | 'SAIDA';
  quantidade: number;
  motivo: string;
  tenant_id: string;
  data_movimentacao: string;
  responsavel?: string;
  saldo_anterior?: number;
  saldo_resultante?: number;
}

export interface Cliente {
  id: string;
  nome: string;
  email: string;
  documento: string; // CPF ou CNPJ
  telefone?: string;
  limite_credito: number;
  saldo_devedor_crediario: number;
  tenant_id: string;
  ativo: boolean;
}

export interface Fornecedor {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  email?: string;
  telefone?: string;
  tenant_id: string;
  ativo: boolean;
}

export type StatusTransferencia = 'SOLICITADO' | 'DESPACHADO' | 'RECEBIDO' | 'DIVERGENTE';

export interface TransferenciaEstoque {
  id: string;
  tenant_id: string;
  loja_origem_id: string;
  loja_destino_id: string;
  produto_id: string;
  quantidade: number;
  quantidade_recebida?: number;
  status: StatusTransferencia;
  solicitado_por_id: string;
  aprovado_por_id?: string | null;
  justificativa?: string | null;
  criado_em: string;
}

export interface ItemAuditoria {
  id: string;
  produto_id: string;
  quantidade_fisica: number;
  quantidade_sistema: number;
  divergencia?: number;
}

export interface AuditoriaFisica {
  id: string;
  loja_id: string;
  tenant_id: string;
  data_auditoria: string;
  status: 'EM_ANDAMENTO' | 'CONCLUIDA';
  itens: ItemAuditoria[];
}

export type FormaPagamento = 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'CREDIARIO';

export interface ItemVenda {
  id: string;
  produto_id: string;
  produto_nome?: string;
  sku?: string;
  quantidade: number;
  preco_unitario: number;
  tenant_id: string;
}

export interface Venda {
  id: string;
  loja_id: string;
  cliente_id?: string | null;
  cliente_nome?: string;
  usuario_id: string;
  status: 'CONCLUIDA' | 'CANCELADA';
  forma_pagamento: FormaPagamento;
  valor_total: number;
  desconto: number;
  data_venda: string;
  tenant_id: string;
  itens: ItemVenda[];
}

export interface FinanceiroLancamento {
  id: string;
  loja_id: string;
  tipo: 'RECEITA' | 'DESPESA';
  valor: number;
  categoria: string;
  status_pagamento: 'PENDENTE' | 'PAGO';
  data_lancamento: string;
  data_pagamento?: string | null;
  tenant_id: string;
  descricao?: string;
}

export interface DashboardAnalytics {
  ticket_medio: number;
  faturamento_bruto: number;
  faturamento_liquido: number;
  desconto_total: number;
  cmv: number;
  lucro_liquido: number;
  margem_lucro: number;
  estoque_critico_count: number;
  ruptura_count: number;
}

export interface CurvaABCItem {
  produto_id: string;
  nome: string;
  sku: string;
  faturamento: number;
  percentual: number;
  percentual_acumulado: number;
  classe: 'A' | 'B' | 'C';
  giro_dias?: number;
  estoque_atual?: number;
}

export interface CurvaABCResponse {
  itens: CurvaABCItem[];
}

export interface VendaEmEspera {
  id: string;
  codigo: string;
  cliente_id?: string | null;
  cliente_nome?: string;
  itens: {
    produto: Produto;
    quantidade: number;
    preco_unitario: number;
  }[];
  desconto: number;
  observacao?: string;
  forma_pagamento: FormaPagamento;
  valor_total: number;
  criado_em: string;
}

export type TipoOperacaoCaixa = 'ABERTURA' | 'SANGRIA' | 'SUPRIMENTO' | 'FECHAMENTO';

export interface OperacaoCaixa {
  id: string;
  tipo: TipoOperacaoCaixa;
  valor: number;
  motivo: string;
  data_hora: string;
  operador_nome: string;
}

export interface CaixaTurno {
  aberto: boolean;
  operador_nome: string;
  data_abertura: string;
  fundo_inicial: number;
  operacoes: OperacaoCaixa[];
}
