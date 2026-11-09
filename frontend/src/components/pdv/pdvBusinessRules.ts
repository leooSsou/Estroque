import {
  Produto,
  Cliente,
  FormaPagamento,
  Venda,
  CaixaTurno,
  Loja,
} from '../../types';
import { ThermalReceiptData } from '../../services/receiptPrinter';
import {
  CartItem,
  CatalogFilter,
  DrawerStats,
  ItensDevolucaoMap,
  PaymentMode,
  SplitPaymentEntry,
  StatusFilterHistorico,
  TipoResolucaoDevolucao,
} from './types';

export function calcularLimiteCrediarioDisponivel(selectedCliente?: Cliente): number {
  return selectedCliente
    ? Math.max(0, selectedCliente.limite_credito - selectedCliente.saldo_devedor_crediario)
    : 0;
}

export function calcularTotaisCarrinho(cart: CartItem[], desconto: number): {
  subtotal: number;
  valorTotal: number;
} {
  const subtotal = cart.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0);
  const valorTotal = Math.max(0, subtotal - desconto);
  return { subtotal, valorTotal };
}

export function calcularTrocoEDinheiroInsuficiente(
  formaPagamento: FormaPagamento,
  valorRecebido: number | '',
  valorTotal: number
): {
  numValorRecebido: number;
  troco: number;
  dinheiroInsuficiente: boolean;
} {
  const numValorRecebido = typeof valorRecebido === 'number' ? valorRecebido : 0;
  const troco =
    formaPagamento === 'DINHEIRO' && numValorRecebido > valorTotal
      ? numValorRecebido - valorTotal
      : 0;
  const dinheiroInsuficiente =
    formaPagamento === 'DINHEIRO' &&
    typeof valorRecebido === 'number' &&
    valorRecebido > 0 &&
    valorRecebido < valorTotal;

  return { numValorRecebido, troco, dinheiroInsuficiente };
}

export function validarLimitesPagamentoSimples(
  modoPagamento: PaymentMode,
  formaPagamento: FormaPagamento,
  selectedCliente: Cliente | undefined,
  valorTotal: number,
  limiteDisponivel: number
): {
  crediarioExcedido: boolean;
  creditoLojaDisponivel: number;
  creditoLojaExcedido: boolean;
} {
  const crediarioExcedido =
    modoPagamento === 'SIMPLES' &&
    formaPagamento === 'CREDIARIO' &&
    (!selectedCliente || valorTotal > limiteDisponivel);

  const creditoLojaDisponivel = selectedCliente?.credito_loja || 0;
  const creditoLojaExcedido =
    modoPagamento === 'SIMPLES' &&
    formaPagamento === 'CREDITO_LOJA' &&
    (!selectedCliente || valorTotal > creditoLojaDisponivel);

  return { crediarioExcedido, creditoLojaDisponivel, creditoLojaExcedido };
}

export function calcularMetricasSplit(
  modoPagamento: PaymentMode,
  splitPagamentos: SplitPaymentEntry[],
  valorTotal: number,
  selectedCliente: Cliente | undefined,
  limiteDisponivel: number,
  creditoLojaDisponivel: number
): {
  totalSplitPago: number;
  restanteSplit: number;
  splitCrediarioTotal: number;
  splitCreditoLojaTotal: number;
  splitCrediarioExcedido: boolean;
  splitCreditoLojaExcedido: boolean;
} {
  const totalSplitPago = Number(
    splitPagamentos.reduce((acc, p) => acc + p.valor, 0).toFixed(2)
  );
  const restanteSplit = Number(Math.max(0, valorTotal - totalSplitPago).toFixed(2));

  const splitCrediarioTotal = splitPagamentos
    .filter((p) => p.forma_pagamento === 'CREDIARIO')
    .reduce((acc, p) => acc + p.valor, 0);

  const splitCreditoLojaTotal = splitPagamentos
    .filter((p) => p.forma_pagamento === 'CREDITO_LOJA')
    .reduce((acc, p) => acc + p.valor, 0);

  const splitCrediarioExcedido =
    modoPagamento === 'SPLIT' &&
    splitCrediarioTotal > 0 &&
    (!selectedCliente || splitCrediarioTotal > limiteDisponivel);

  const splitCreditoLojaExcedido =
    modoPagamento === 'SPLIT' &&
    splitCreditoLojaTotal > 0 &&
    (!selectedCliente || splitCreditoLojaTotal > creditoLojaDisponivel);

  return {
    totalSplitPago,
    restanteSplit,
    splitCrediarioTotal,
    splitCreditoLojaTotal,
    splitCrediarioExcedido,
    splitCreditoLojaExcedido,
  };
}

export function validarNovaParcelaSplit(params: {
  novoSplitValor: number | '';
  restanteSplit: number;
  novoSplitForma: FormaPagamento;
  selectedCliente?: Cliente;
  splitCrediarioTotal: number;
  limiteDisponivel: number;
  splitCreditoLojaTotal: number;
  creditoLojaDisponivel: number;
}): { valido: boolean; erro?: string; valorFinal: number } {
  const {
    novoSplitValor,
    restanteSplit,
    novoSplitForma,
    selectedCliente,
    splitCrediarioTotal,
    limiteDisponivel,
    splitCreditoLojaTotal,
    creditoLojaDisponivel,
  } = params;

  const val = typeof novoSplitValor === 'number' ? novoSplitValor : restanteSplit;
  if (val <= 0) {
    return {
      valido: false,
      erro: 'Informe um valor maior que zero para o pagamento.',
      valorFinal: val,
    };
  }
  if (val > restanteSplit) {
    return {
      valido: false,
      erro: `O valor (R$ ${val.toFixed(2)}) ultrapassa o saldo restante (R$ ${restanteSplit.toFixed(2)}).`,
      valorFinal: val,
    };
  }
  if (novoSplitForma === 'CREDIARIO') {
    if (!selectedCliente) {
      return {
        valido: false,
        erro: 'Selecione um cliente antes de adicionar pagamento em Crediário.',
        valorFinal: val,
      };
    }
    if (splitCrediarioTotal + val > limiteDisponivel) {
      return {
        valido: false,
        erro: 'O valor no crediário ultrapassa o limite disponível do cliente.',
        valorFinal: val,
      };
    }
  }
  if (novoSplitForma === 'CREDITO_LOJA') {
    if (!selectedCliente) {
      return {
        valido: false,
        erro: 'Selecione um cliente para utilizar Vale-Crédito.',
        valorFinal: val,
      };
    }
    if (splitCreditoLojaTotal + val > creditoLojaDisponivel) {
      return {
        valido: false,
        erro: `Saldo de Vale-Crédito insuficiente. Disponível: R$ ${creditoLojaDisponivel.toFixed(2)}`,
        valorFinal: val,
      };
    }
  }

  return { valido: true, valorFinal: val };
}

export function calcularTotalDevolucao(
  vendaParaDevolucao: Venda | null,
  itensDevolucaoSelecionados: ItensDevolucaoMap
): number {
  if (!vendaParaDevolucao) return 0;
  let sum = 0;
  for (const item of vendaParaDevolucao.itens || []) {
    const cfg = itensDevolucaoSelecionados[item.id];
    if (cfg && cfg.selecionado && cfg.quantidade > 0) {
      sum += cfg.quantidade * item.preco_unitario;
    }
  }
  return Number(sum.toFixed(2));
}

export function construirEstadoInicialDevolucao(v: Venda): {
  initialMap: ItensDevolucaoMap;
  tipoResolucaoInicial: TipoResolucaoDevolucao;
} {
  const initialMap: ItensDevolucaoMap = {};
  for (const it of v.itens || []) {
    initialMap[it.id] = {
      quantidade: 1,
      retornar_ao_estoque: true,
      condicao: 'PERFEITO',
      selecionado: true,
    };
  }
  const tipoResolucaoInicial: TipoResolucaoDevolucao = v.cliente_id
    ? 'CREDITO_LOJA'
    : 'REEMBOLSO_CAIXA';
  return { initialMap, tipoResolucaoInicial };
}

export function extrairItensParaDevolver(itensDevolucaoSelecionados: ItensDevolucaoMap) {
  return Object.entries(itensDevolucaoSelecionados)
    .filter(([, config]) => config.selecionado && config.quantidade > 0)
    .map(([itemVendaId, config]) => ({
      item_venda_id: itemVendaId,
      quantidade: config.quantidade,
      retornar_ao_estoque: config.retornar_ao_estoque,
      condicao: config.condicao,
    }));
}

export function obterEstoqueDiretoProduto(prod: Produto, activeLojaId?: string): number {
  return activeLojaId
    ? prod.estoque_por_loja?.[activeLojaId] ?? 0
    : prod.estoque_total ?? 0;
}

export function calcularEstoqueExibidoVitrine(
  prod: Produto,
  todosProdutos: Produto[],
  activeLojaId?: string
): number {
  const variacoes = todosProdutos.filter((p) => p.produto_pai_id === prod.id && p.ativo);
  if (variacoes.length > 0) {
    return variacoes.reduce((acc, v) => {
      const s = obterEstoqueDiretoProduto(v, activeLojaId);
      return acc + s;
    }, 0);
  }
  return obterEstoqueDiretoProduto(prod, activeLojaId);
}

export function filtrarProdutosVitrine(todosProdutos: Produto[]): Produto[] {
  return todosProdutos.filter((p) => !p.produto_pai_id && p.ativo);
}

export function calcularContadoresVitrine(
  produtosVitrine: Produto[],
  todosProdutos: Produto[],
  activeLojaId?: string
): { todos: number; disponivel: number; esgotado: number } {
  let disponivel = 0;
  let esgotado = 0;
  for (const p of produtosVitrine) {
    const stock = calcularEstoqueExibidoVitrine(p, todosProdutos, activeLojaId);
    if (stock > 0) disponivel++;
    else esgotado++;
  }
  return {
    todos: produtosVitrine.length,
    disponivel,
    esgotado,
  };
}

export function filtrarCatalogoPDV(
  produtosVitrine: Produto[],
  todosProdutos: Produto[],
  search: string,
  catalogFilter: CatalogFilter,
  activeLojaId?: string
): Produto[] {
  const q = search.trim().toLowerCase();
  return produtosVitrine.filter((p) => {
    const matchParent =
      p.nome.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      (p.codigo_barras && p.codigo_barras.toLowerCase().includes(q));

    const variacoesFilhas = todosProdutos.filter(
      (child) => child.produto_pai_id === p.id && child.ativo
    );
    const matchChild = variacoesFilhas.some(
      (child) =>
        child.nome.toLowerCase().includes(q) ||
        child.sku.toLowerCase().includes(q) ||
        (child.codigo_barras && child.codigo_barras.toLowerCase().includes(q)) ||
        (child.variacoes &&
          Object.values(child.variacoes).some((v) =>
            String(v).toLowerCase().includes(q)
          ))
    );

    const matchSearch = !q || matchParent || matchChild;
    const stock = calcularEstoqueExibidoVitrine(p, todosProdutos, activeLojaId);

    if (catalogFilter === 'DISPONIVEL') return matchSearch && stock > 0;
    if (catalogFilter === 'ESGOTADO') return matchSearch && stock === 0;
    return matchSearch;
  });
}

export function resolverSubmissaoBuscaOuCodigoBarras(
  search: string,
  todosProdutos: Produto[],
  filteredProdutos: Produto[]
): {
  acao: 'NENHUMA' | 'ABRIR_VARIACOES_EXATO' | 'ADICIONAR_DIRETO_EXATO' | 'ADICIONAR_UNICO_FILTRADO';
  produto?: Produto;
} {
  const query = search.trim();
  if (!query) return { acao: 'NENHUMA' };

  const queryLower = query.toLowerCase();
  const exactMatch = todosProdutos.find(
    (p) =>
      p.ativo &&
      ((p.codigo_barras && p.codigo_barras.toLowerCase() === queryLower) ||
        p.sku.toLowerCase() === queryLower)
  );

  if (exactMatch) {
    const temFilhos = todosProdutos.some(
      (p) => p.produto_pai_id === exactMatch.id && p.ativo
    );
    if (temFilhos) {
      return { acao: 'ABRIR_VARIACOES_EXATO', produto: exactMatch };
    }
    return { acao: 'ADICIONAR_DIRETO_EXATO', produto: exactMatch };
  }

  if (filteredProdutos.length === 1) {
    return { acao: 'ADICIONAR_UNICO_FILTRADO', produto: filteredProdutos[0] };
  }

  return { acao: 'NENHUMA' };
}

export function atualizarQuantidadeCarrinho(
  cart: CartItem[],
  id: string,
  delta: number
): CartItem[] {
  return cart
    .map((item) => {
      if (item.produto.id === id) {
        const newQty = item.quantidade + delta;
        return newQty > 0 ? { ...item, quantidade: newQty } : null;
      }
      return item;
    })
    .filter(Boolean) as CartItem[];
}

export function validarCheckoutVenda(params: {
  caixaAberto: boolean;
  cartLength: number;
  modoPagamento: PaymentMode;
  splitPagamentosLength: number;
  restanteSplit: number;
  splitCrediarioExcedido: boolean;
  splitCreditoLojaExcedido: boolean;
  formaPagamento: FormaPagamento;
  selectedCliente?: Cliente;
  crediarioExcedido: boolean;
  creditoLojaExcedido: boolean;
  valorRecebido: number | '';
  valorTotal: number;
}): {
  valido: boolean;
  erro?: string;
  redirecionarParaOperacaoCaixa?: boolean;
} {
  const {
    caixaAberto,
    cartLength,
    modoPagamento,
    splitPagamentosLength,
    restanteSplit,
    splitCrediarioExcedido,
    splitCreditoLojaExcedido,
    formaPagamento,
    selectedCliente,
    crediarioExcedido,
    creditoLojaExcedido,
    valorRecebido,
    valorTotal,
  } = params;

  if (!caixaAberto) {
    return {
      valido: false,
      erro: 'Caixa fechado! É obrigatório abrir o turno na aba "Operações de Caixa" antes de realizar vendas.',
      redirecionarParaOperacaoCaixa: true,
    };
  }

  if (cartLength === 0) {
    return {
      valido: false,
      erro: 'O carrinho de compras está vazio.',
    };
  }

  if (modoPagamento === 'SPLIT') {
    if (splitPagamentosLength === 0) {
      return {
        valido: false,
        erro: 'Adicione as formas de pagamento para finalizar a venda dividida.',
      };
    }
    if (restanteSplit > 0) {
      return {
        valido: false,
        erro: `Faltam R$ ${restanteSplit.toFixed(2)} para cobrir o total da venda.`,
      };
    }
    if (splitCrediarioExcedido) {
      return {
        valido: false,
        erro: 'Limite de crediário do cliente excedido para a parcela solicitada.',
      };
    }
    if (splitCreditoLojaExcedido) {
      return {
        valido: false,
        erro: 'Saldo de Vale-Crédito do cliente insuficiente para a parcela solicitada.',
      };
    }
  } else {
    if (formaPagamento === 'CREDIARIO') {
      if (!selectedCliente) {
        return {
          valido: false,
          erro: 'Selecione um cliente para prosseguir com venda no Crediário.',
        };
      }
      if (crediarioExcedido) {
        return {
          valido: false,
          erro: 'Limite de crediário do cliente excedido! Venda bloqueada.',
        };
      }
    }

    if (formaPagamento === 'CREDITO_LOJA') {
      if (!selectedCliente) {
        return {
          valido: false,
          erro: 'Selecione um cliente para utilizar Vale-Crédito.',
        };
      }
      if (creditoLojaExcedido) {
        return {
          valido: false,
          erro: 'Saldo de Vale-Crédito do cliente insuficiente! Venda bloqueada.',
        };
      }
    }

    if (
      formaPagamento === 'DINHEIRO' &&
      typeof valorRecebido === 'number' &&
      valorRecebido < valorTotal
    ) {
      return {
        valido: false,
        erro: 'Valor recebido em dinheiro é inferior ao total da venda!',
      };
    }
  }

  return { valido: true };
}

export function isBotaoFinalizarDesabilitado(params: {
  isFinalizingSale: boolean;
  caixaAberto: boolean;
  cartLength: number;
  modoPagamento: PaymentMode;
  crediarioExcedido: boolean;
  creditoLojaExcedido?: boolean;
  dinheiroInsuficiente: boolean;
  restanteSplit: number;
  splitPagamentosLength: number;
  splitCrediarioExcedido: boolean;
  splitCreditoLojaExcedido?: boolean;
}): boolean {
  const {
    isFinalizingSale,
    caixaAberto,
    cartLength,
    modoPagamento,
    crediarioExcedido,
    creditoLojaExcedido,
    dinheiroInsuficiente,
    restanteSplit,
    splitPagamentosLength,
    splitCrediarioExcedido,
    splitCreditoLojaExcedido,
  } = params;

  return (
    isFinalizingSale ||
    !caixaAberto ||
    cartLength === 0 ||
    (modoPagamento === 'SIMPLES' &&
      (crediarioExcedido || Boolean(creditoLojaExcedido) || Boolean(dinheiroInsuficiente))) ||
    (modoPagamento === 'SPLIT' &&
      (restanteSplit > 0 ||
        splitPagamentosLength === 0 ||
        Boolean(splitCrediarioExcedido) ||
        Boolean(splitCreditoLojaExcedido)))
  );
}

export function resolverDetalhesItemCupom(
  it: { produto_id: string; produto_nome?: string; sku?: string },
  todosProdutos: Produto[]
): { nome: string; sku: string; variacaoDesc: string } {
  const prod = todosProdutos.find((p) => p.id === it.produto_id);
  const nome = it.produto_nome || prod?.nome || it.sku || prod?.sku || 'Item de Venda';
  const sku = it.sku || prod?.sku || '';
  let variacaoDesc = '';

  if (prod?.variacoes && Object.keys(prod.variacoes).length > 0) {
    variacaoDesc = Object.entries(prod.variacoes)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ');
  }
  return { nome, sku, variacaoDesc };
}

export function construirDadosImpressaoTermica(params: {
  receiptSale: Venda;
  clientes: Cliente[];
  produtos: Produto[];
  activeLoja?: Loja | null;
  user?: { nome?: string; email?: string } | null;
}): ThermalReceiptData {
  const { receiptSale, clientes, produtos, activeLoja, user } = params;
  const clienteVenda = clientes.find((c) => c.id === receiptSale.cliente_id);
  const clienteNome =
    receiptSale.cliente_nome || clienteVenda?.nome || 'Consumidor Final (Sem CPF)';

  const itensParaImprimir = (receiptSale.itens || []).map((it) => {
    const details = resolverDetalhesItemCupom(it, produtos);
    return {
      nome: details.nome,
      variacaoDesc: details.variacaoDesc,
      sku: details.sku,
      quantidade: it.quantidade,
      precoUnitario: it.preco_unitario,
      total: it.quantidade * it.preco_unitario,
    };
  });

  const pagamentosParaImprimir =
    receiptSale.pagamentos && receiptSale.pagamentos.length > 0
      ? receiptSale.pagamentos.map((p) => ({
          forma: p.forma_pagamento,
          valor: p.valor,
        }))
      : undefined;

  return {
    lojaNome: activeLoja?.nome || 'Estroque Enterprise',
    lojaEndereco: activeLoja?.endereco || 'Matriz Central',
    lojaCnpj: activeLoja?.cnpj ? `CNPJ: ${activeLoja.cnpj}` : 'CNPJ não informado',
    dataHora: receiptSale.data_venda
      ? new Date(receiptSale.data_venda).toLocaleString('pt-BR')
      : new Date().toLocaleString('pt-BR'),
    cupomId: receiptSale.id,
    operadorNome: user?.nome || user?.email?.split('@')[0] || 'Operador de Caixa',
    clienteNome,
    itens: itensParaImprimir,
    totalItens: receiptSale.itens?.reduce((acc, it) => acc + it.quantidade, 0) || 0,
    subtotal: (receiptSale.valor_total || 0) + (receiptSale.desconto || 0),
    desconto: receiptSale.desconto || 0,
    totalPagar: receiptSale.valor_total || 0,
    formaPagamento: receiptSale.forma_pagamento,
    pagamentos: pagamentosParaImprimir,
    status: receiptSale.status,
  };
}

export function filtrarHistoricoVendas(
  vendasHistorico: Venda[],
  searchHistorico: string,
  statusFilterHistorico: StatusFilterHistorico
): Venda[] {
  return vendasHistorico.filter((v) => {
    const q = searchHistorico.toLowerCase();
    const matchSearch =
      v.id.toLowerCase().includes(q) ||
      (v.cliente_nome && v.cliente_nome.toLowerCase().includes(q)) ||
      v.forma_pagamento.toLowerCase().includes(q);

    if (
      statusFilterHistorico === 'CONCLUIDA' &&
      v.status !== 'CONCLUIDA' &&
      v.status !== 'PAGO'
    )
      return false;
    if (statusFilterHistorico === 'CANCELADA' && v.status !== 'CANCELADA') return false;
    return matchSearch;
  });
}

export function calcularDrawerStats(
  caixaTurno: CaixaTurno | null,
  vendasHistorico: Venda[]
): DrawerStats {
  const fundo = caixaTurno?.fundo_inicial || 0;
  let vendasDinheiro = 0;
  let vendasOutras = 0;
  const dataAberturaTs = caixaTurno?.data_abertura
    ? new Date(caixaTurno.data_abertura).getTime()
    : 0;

  for (const v of vendasHistorico) {
    if (
      (v.status === 'CONCLUIDA' || v.status === 'PAGO') &&
      (!dataAberturaTs || new Date(v.data_venda).getTime() >= dataAberturaTs)
    ) {
      if (v.forma_pagamento === 'MULTIPLO' && v.pagamentos) {
        for (const p of v.pagamentos) {
          if (p.forma_pagamento === 'DINHEIRO') vendasDinheiro += p.valor;
          else vendasOutras += p.valor;
        }
      } else if (v.forma_pagamento === 'DINHEIRO') {
        vendasDinheiro += v.valor_total;
      } else {
        vendasOutras += v.valor_total;
      }
    }
  }

  let suprimentos = 0;
  let sangrias = 0;
  for (const op of caixaTurno?.operacoes || []) {
    if (op.tipo === 'SUPRIMENTO') suprimentos += op.valor;
    if (op.tipo === 'SANGRIA') sangrias += op.valor;
  }

  const saldoEsperadoGaveta = fundo + vendasDinheiro + suprimentos - sangrias;

  return {
    fundo,
    vendasDinheiro,
    vendasOutras,
    suprimentos,
    sangrias,
    saldoEsperadoGaveta,
  };
}
