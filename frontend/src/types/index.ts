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
  produto_pai_id?: string | null;
  variacoes?: Record<string, string> | null;
  variacoes_count?: number;
  tenant_id: string;
  ativo: boolean;
  estoque_por_loja?: Record<string, number>;
  estoque_total?: number;
  estoque_minimo?: number;
}

export interface AtributoGrade {
  nome: string;
  valores: string[];
}

export interface CriarProdutoGradePayload {
  nome: string;
  sku_base: string;
  preco_custo: number;
  preco_venda: number;
  markup: number;
  atributos: AtributoGrade[];
  codigo_barras_base?: string | null;
  loja_id?: string;
  estoque_inicial_por_variacao?: number;
  categoria?: string;
}

export interface AdicionarVariacaoPayload {
  variacoes: Record<string, string>;
  sku?: string;
  codigo_barras?: string;
  preco_custo?: number;
  preco_venda?: number;
  markup?: number;
}

export interface ProdutoComGradeResponse {
  produto_pai: Produto;
  variacoes: Produto[];
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
  credito_loja?: number;
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

export type FormaPagamento = 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'CREDIARIO' | 'CREDITO_LOJA' | 'MULTIPLO';

export interface PagamentoVenda {
  id?: string;
  forma_pagamento: FormaPagamento;
  valor: number;
}

export type TipoDevolucao = 'DEVOLUCAO' | 'TROCA';
export type TipoResolucaoDevolucao = 'CREDITO_LOJA' | 'REEMBOLSO_CAIXA' | 'ABATIMENTO_CREDIARIO';

export interface ItemDevolucao {
  id: string;
  devolucao_id?: string;
  item_venda_id: string;
  produto_id: string;
  produto_nome?: string;
  quantidade: number;
  preco_unitario: number;
  valor_total: number;
  retornar_ao_estoque: boolean;
  condicao: 'PERFEITO' | 'AVARIADO';
  tenant_id: string;
}

export interface Devolucao {
  id: string;
  venda_id: string;
  loja_id: string;
  usuario_id: string;
  cliente_id?: string | null;
  tipo: TipoDevolucao;
  tipo_resolucao: TipoResolucaoDevolucao;
  valor_total: number;
  motivo: string;
  data_devolucao: string;
  tenant_id: string;
  itens: ItemDevolucao[];
}

export interface RegistrarDevolucaoPayload {
  tipo: TipoDevolucao;
  tipo_resolucao: TipoResolucaoDevolucao;
  motivo: string;
  itens: {
    item_venda_id: string;
    quantidade: number;
    retornar_ao_estoque: boolean;
    condicao: 'PERFEITO' | 'AVARIADO';
  }[];
}

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
  status: 'CONCLUIDA' | 'CANCELADA' | 'PAGO' | 'PENDENTE' | 'PARCIALMENTE_DEVOLVIDA' | 'DEVOLVIDA';
  forma_pagamento: FormaPagamento;
  valor_total: number;
  desconto: number;
  data_venda: string;
  tenant_id: string;
  itens: ItemVenda[];
  pagamentos?: PagamentoVenda[];
  devolucoes?: Devolucao[];
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

export interface ItemImportadoNFe {
  produto: Produto;
  quantidade_importada: number;
  valor_unitario_nfe: number;
  novo_produto_cadastrado: boolean;
}

export interface ImportarNFeResponse {
  fornecedor: Fornecedor;
  itens_processados: ItemImportadoNFe[];
}

export interface AuditarEstoqueResponse {
  auditoria: {
    id: string;
    loja_id: string;
    tenant_id: string;
    data_auditoria?: string | null;
    itens: {
      id: string;
      produto_id: string;
      quantidade_fisica: number;
      quantidade_sistema: number;
    }[];
  };
  movimentacoes_geradas: MovimentacaoEstoque[];
}

export interface RegisterTenantPayload {
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  endereco_loja?: string;
  dono_nome: string;
  dono_email: string;
  dono_senha: string;
}

export interface TenantAdmin {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  data_cadastro: string;
  ativo: boolean;
  plano: 'STARTER' | 'PRO' | 'ENTERPRISE';
  limite_lojas: number;
  limite_usuarios: number;
  total_lojas: number;
  total_usuarios: number;
  total_vendas_valor: number;
  total_vendas_qtd: number;
}

export interface PlataformaDashboardMetrics {
  total_tenants: number;
  tenants_ativos: number;
  tenants_suspensos: number;
  total_lojas: number;
  total_usuarios: number;
  mrr_estimado: number;
  gmv_total: number;
  total_vendas: number;
}

export interface AlterarPlanoPayload {
  plano: 'STARTER' | 'PRO' | 'ENTERPRISE';
  limite_lojas?: number;
  limite_usuarios?: number;
}

export interface TenantLojaResumo {
  id: string;
  nome: string;
  cnpj: string;
  endereco?: string | null;
}

export interface TenantUsuarioResumo {
  id: string;
  nome: string;
  email: string;
  role: string;
  loja_atribuida_id?: string | null;
  loja_nome?: string | null;
}

export interface TenantDetalhesCompletos extends TenantAdmin {
  total_produtos: number;
  lojas: TenantLojaResumo[];
  usuarios: TenantUsuarioResumo[];
}

export interface ImpersonateResult {
  access_token: string;
  token_type: string;
  tenant_id: string;
  tenant_nome: string;
  usuario_id: string;
  usuario_nome: string;
  usuario_email: string;
  usuario_role: string;
  loja_id?: string | null;
  loja_nome?: string | null;
  impersonated_by_id: string;
  impersonated_by_email: string;
}



