import assert from 'node:assert/strict';

// Polyfill localStorage & sessionStorage for pure Node.js execution
if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0,
  } as unknown as Storage;
}

if (!globalThis.sessionStorage) {
  const sessionStore = new Map<string, string>();
  globalThis.sessionStorage = {
    getItem: (k: string) => sessionStore.get(k) || null,
    setItem: (k: string, v: string) => sessionStore.set(k, String(v)),
    removeItem: (k: string) => sessionStore.delete(k),
    clear: () => sessionStore.clear(),
    key: (i: number) => Array.from(sessionStore.keys())[i] || null,
    length: 0,
  } as unknown as Storage;
}

import { storage } from '../services/storage';
import {
  calcularDrawerStats,
  calcularTotaisCarrinho,
  calcularTrocoEDinheiroInsuficiente,
  construirDadosImpressaoTermica,
  isBotaoFinalizarDesabilitado,
  resolverSubmissaoBuscaOuCodigoBarras,
  atualizarQuantidadeCarrinho,
  validarCheckoutVenda,
} from '../components/pdv/pdvBusinessRules';
import { CartItem } from '../components/pdv/types';

async function runE2ESmokeSuite() {
  console.log('===============================================================');
  console.log('  TESTE E2E DE FUMAÇA: CADASTRO (ONBOARDING) ATÉ CHECKOUT PDV');
  console.log('===============================================================');

  localStorage.clear();
  sessionStorage.clear();

  // 1. ONBOARDING & AUTENTICAÇÃO (Tenant + Dono + Loja Matriz)
  const novoUser = {
    id: 'usr-e2e-001',
    nome: 'Dono E2E Smoke',
    email: 'dono.e2e@estroque.app',
    role: 'DONO' as const,
    tenant_id: 'ten-e2e-001',
  };
  storage.setUser(novoUser);
  assert.equal(storage.getUser()?.email, 'dono.e2e@estroque.app');

  const lojaMatriz = storage.addLoja({
    nome: 'Matriz E2E Smoke',
    cnpj: '45.723.174/0001-10',
    endereco: 'Av. Paulista, 1500',
    ativo: true,
  });
  assert.ok(lojaMatriz.id);
  assert.equal(lojaMatriz.tenant_id, 'ten-e2e-001');

  // 2. CADASTRO DE CLIENTE & PRODUTO COM ESTOQUE INICIAL
  const cliente = storage.addCliente({
    nome: 'Maria E2E',
    email: 'maria@e2e.com',
    documento: '529.982.247-25',
    telefone: '(11) 99999-0000',
    limite_credito: 1000,
    ativo: true,
  });

  const produto = storage.addProduto({
    nome: 'Jaqueta Jeans Premium E2E',
    sku: 'JAQ-E2E-01',
    codigo_barras: '7899999000015',
    categoria: 'Vestuário',
    preco_custo: 90,
    preco_venda: 180,
    markup: 100,
    ativo: true,
    loja_id: lojaMatriz.id,
    estoque_inicial: 10,
  });
  assert.equal(produto.estoque_por_loja?.[lojaMatriz.id], 10);

  // 3. BLOQUEIO DE CHECKOUT COM CAIXA FECHADO E ABERTURA DE TURNO
  const checkCaixaFechado = validarCheckoutVenda({
    caixaAberto: false,
    cartLength: 1,
    modoPagamento: 'SIMPLES',
    splitPagamentosLength: 0,
    restanteSplit: 0,
    splitCrediarioExcedido: false,
    splitCreditoLojaExcedido: false,
    formaPagamento: 'DINHEIRO',
    selectedCliente: cliente,
    crediarioExcedido: false,
    creditoLojaExcedido: false,
    valorRecebido: 200,
    valorTotal: 180,
  });
  assert.equal(checkCaixaFechado.valido, false);
  assert.equal(checkCaixaFechado.redirecionarParaOperacaoCaixa, true);

  const turnoAberto = storage.abrirCaixa(250);
  assert.equal(turnoAberto.aberto, true);
  assert.equal(turnoAberto.fundo_inicial, 250);

  // 4. BIPAGEM DE CÓDIGO DE BARRAS E MONTAGEM DO CARRINHO NO PDV
  const todosProdutos = storage.getProdutos();
  const resolucaoScanner = resolverSubmissaoBuscaOuCodigoBarras(
    '7899999000015',
    todosProdutos,
    todosProdutos
  );
  assert.equal(resolucaoScanner.acao, 'ADICIONAR_DIRETO_EXATO');
  assert.equal(resolucaoScanner.produto?.id, produto.id);

  let cart: CartItem[] = [
    {
      produto,
      quantidade: 1,
      preco_unitario: produto.preco_venda,
    },
  ];
  cart = atualizarQuantidadeCarrinho(cart, produto.id, 1);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantidade, 2);

  // 5. CÁLCULO DE TOTAIS, DESCONTO, TROCO E VALIDAÇÃO DE CHECKOUT
  const desconto = 20; // Subtotal 360 - 20 = 340
  const { subtotal, valorTotal } = calcularTotaisCarrinho(cart, desconto);
  assert.equal(subtotal, 360);
  assert.equal(valorTotal, 340);

  const { troco, dinheiroInsuficiente } = calcularTrocoEDinheiroInsuficiente(
    'DINHEIRO',
    400,
    valorTotal
  );
  assert.equal(troco, 60);
  assert.equal(dinheiroInsuficiente, false);

  const btnDisabled = isBotaoFinalizarDesabilitado({
    isFinalizingSale: false,
    caixaAberto: turnoAberto.aberto,
    cartLength: cart.length,
    modoPagamento: 'SIMPLES',
    crediarioExcedido: false,
    creditoLojaExcedido: false,
    dinheiroInsuficiente,
    restanteSplit: 0,
    splitPagamentosLength: 0,
    splitCrediarioExcedido: false,
    splitCreditoLojaExcedido: false,
  });
  assert.equal(btnDisabled, false);

  // 6. REGISTRO DA VENDA, BAIXA DE ESTOQUE, FINANCEIRO E CUPOM TÉRMICO
  const estoqueAntes =
    storage.getProdutos().find((p) => p.id === produto.id)?.estoque_por_loja?.[
      lojaMatriz.id
    ] || 0;

  const vendaConcluida = storage.registrarVenda({
    loja_id: lojaMatriz.id,
    cliente_id: cliente.id,
    forma_pagamento: 'DINHEIRO',
    desconto,
    itens: cart.map((c) => ({
      produto_id: c.produto.id,
      quantidade: c.quantidade,
      preco_unitario: c.preco_unitario,
    })),
  });
  assert.equal(vendaConcluida.valor_total, 340);
  assert.equal(vendaConcluida.status, 'CONCLUIDA');

  const prodAtualizado = storage.getProdutos().find((p) => p.id === produto.id);
  assert.equal(prodAtualizado?.estoque_por_loja?.[lojaMatriz.id], estoqueAntes - 2);

  const statsGaveta = calcularDrawerStats(storage.getCaixaTurno(), storage.getVendas());
  assert.equal(statsGaveta.fundo, 250);
  assert.equal(statsGaveta.vendasDinheiro, 340);
  assert.equal(statsGaveta.saldoEsperadoGaveta, 590);

  const cupom = construirDadosImpressaoTermica({
    receiptSale: vendaConcluida,
    clientes: storage.getClientes(),
    produtos: storage.getProdutos(),
    activeLoja: lojaMatriz,
    user: novoUser,
  });
  assert.equal(cupom.lojaCnpj, 'CNPJ: 45.723.174/0001-10');
  assert.equal(cupom.totalPagar, 340);

  // 7. FECHAMENTO CEGO DO CAIXA COM CONFERÊNCIA EXATA
  const fechamento = storage.fecharCaixa(590, 'Fechamento E2E sem divergência');
  assert.equal(fechamento.diferenca, 0);
  assert.equal(storage.getCaixaTurno().aberto, false);

  console.log('  [PASS] E2E.1: Fluxo completo Cadastro -> Abertura de Caixa -> Bipagem -> Checkout -> Cupom -> Fechamento');
  console.log('\n===============================================================');
  console.log('  RESULTADO: 1 PASSADO / 0 FALHOS');
  console.log('===============================================================');
}

runE2ESmokeSuite();
