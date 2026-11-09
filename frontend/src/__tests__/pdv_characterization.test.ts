import assert from 'node:assert/strict';
import {
  calcularLimiteCrediarioDisponivel,
  calcularTotaisCarrinho,
  calcularTrocoEDinheiroInsuficiente,
  validarLimitesPagamentoSimples,
  calcularMetricasSplit,
  validarNovaParcelaSplit,
  calcularTotalDevolucao,
  construirEstadoInicialDevolucao,
  calcularEstoqueExibidoVitrine,
  filtrarCatalogoPDV,
  resolverSubmissaoBuscaOuCodigoBarras,
  validarCheckoutVenda,
  isBotaoFinalizarDesabilitado,
  construirDadosImpressaoTermica,
  filtrarHistoricoVendas,
  calcularDrawerStats,
} from '../components/pdv/pdvBusinessRules';
import { Cliente, Produto, Venda, CaixaTurno } from '../types';

async function runCharacterizationSuite() {
  console.log('===============================================================');
  console.log('  TESTES DE CARACTERIZAÇÃO DO PDVVendas.tsx (REGRAS PURAS)');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  [FAIL] ${name}`);
      console.error(`         ${err?.message || err}`);
      failed++;
    }
  }

  const dummyProd: Produto = {
    id: 'prod-1',
    nome: 'Camiseta Básica',
    sku: 'CAM-01',
    codigo_barras: '7890001',
    categoria: 'cat-1',
    preco_custo: 20,
    preco_venda: 50,
    markup: 150,
    estoque_minimo: 2,
    estoque_total: 10,
    estoque_por_loja: { 'loja-1': 5 },
    tenant_id: 'tenant-1',
    ativo: true,
  };

  const dummyCliente: Cliente = {
    id: 'cli-1',
    nome: 'Maria Silva',
    email: 'maria@exemplo.com',
    documento: '12345678900',
    telefone: '11999999999',
    limite_credito: 300,
    saldo_devedor_crediario: 100,
    credito_loja: 40,
    tenant_id: 'tenant-1',
    ativo: true,
  };

  await testCase('C.1: Calcula subtotal, desconto limitado a zero, troco e dinheiro insuficiente', () => {
    const { subtotal, valorTotal } = calcularTotaisCarrinho(
      [{ produto: dummyProd, quantidade: 2, preco_unitario: 50 }],
      15
    );
    assert.equal(subtotal, 100);
    assert.equal(valorTotal, 85);

    const { valorTotal: totalComDescontoMaior } = calcularTotaisCarrinho(
      [{ produto: dummyProd, quantidade: 1, preco_unitario: 50 }],
      80
    );
    assert.equal(totalComDescontoMaior, 0);

    const trocoCalc = calcularTrocoEDinheiroInsuficiente('DINHEIRO', 100, 85);
    assert.equal(trocoCalc.troco, 15);
    assert.equal(trocoCalc.dinheiroInsuficiente, false);

    const insufCalc = calcularTrocoEDinheiroInsuficiente('DINHEIRO', 50, 85);
    assert.equal(insufCalc.troco, 0);
    assert.equal(insufCalc.dinheiroInsuficiente, true);
  });

  await testCase('C.2: Valida limites de Crediário e Vale-Crédito no modo SIMPLES e SPLIT', () => {
    const limite = calcularLimiteCrediarioDisponivel(dummyCliente);
    assert.equal(limite, 200); // 300 - 100

    const simplesOk = validarLimitesPagamentoSimples('SIMPLES', 'CREDIARIO', dummyCliente, 150, limite);
    assert.equal(simplesOk.crediarioExcedido, false);

    const simplesExcedido = validarLimitesPagamentoSimples('SIMPLES', 'CREDIARIO', dummyCliente, 250, limite);
    assert.equal(simplesExcedido.crediarioExcedido, true);

    const splitMetrics = calcularMetricasSplit(
      'SPLIT',
      [
        { forma_pagamento: 'PIX', valor: 50 },
        { forma_pagamento: 'CREDITO_LOJA', valor: 45 },
      ],
      100,
      dummyCliente,
      limite,
      dummyCliente.credito_loja || 0
    );
    assert.equal(splitMetrics.totalSplitPago, 95);
    assert.equal(splitMetrics.restanteSplit, 5);
    assert.equal(splitMetrics.splitCreditoLojaExcedido, true); // 45 > 40

    const validacaoParcela = validarNovaParcelaSplit({
      novoSplitValor: 60,
      restanteSplit: 50,
      novoSplitForma: 'DINHEIRO',
      selectedCliente: dummyCliente,
      splitCrediarioTotal: 0,
      limiteDisponivel: limite,
      splitCreditoLojaTotal: 0,
      creditoLojaDisponivel: 40,
    });
    assert.equal(validacaoParcela.valido, false);
  });

  await testCase('C.3: Calcula devolução parcial e resolução padrão com/sem cliente', () => {
    const vendaComCliente: Venda = {
      id: 'v-1',
      loja_id: 'loja-1',
      cliente_id: 'cli-1',
      usuario_id: 'user-1',
      tenant_id: 'tenant-1',
      valor_total: 150,
      desconto: 0,
      forma_pagamento: 'PIX',
      status: 'CONCLUIDA',
      data_venda: new Date().toISOString(),
      itens: [
        { id: 'item-1', produto_id: 'prod-1', quantidade: 3, preco_unitario: 50, tenant_id: 'tenant-1' },
      ],
    };

    const { initialMap, tipoResolucaoInicial } = construirEstadoInicialDevolucao(vendaComCliente);
    assert.equal(tipoResolucaoInicial, 'CREDITO_LOJA');
    assert.equal(calcularTotalDevolucao(vendaComCliente, initialMap), 50); // 1 unidade inicial * 50

    const vendaSemCliente: Venda = { ...vendaComCliente, cliente_id: null };
    assert.equal(construirEstadoInicialDevolucao(vendaSemCliente).tipoResolucaoInicial, 'REEMBOLSO_CAIXA');
  });

  await testCase('C.4: Filtra vitrine, soma estoque de grade e resolve código de barras exato', () => {
    const pai: Produto = { ...dummyProd, id: 'pai-1', sku: 'PAI-01', codigo_barras: '111' };
    const filhaP: Produto = {
      ...dummyProd,
      id: 'filha-p',
      produto_pai_id: 'pai-1',
      sku: 'PAI-01-P',
      codigo_barras: '222',
      estoque_por_loja: { 'loja-1': 3 },
      variacoes: { Tamanho: 'P' },
    };
    const filhaM: Produto = {
      ...dummyProd,
      id: 'filha-m',
      produto_pai_id: 'pai-1',
      sku: 'PAI-01-M',
      codigo_barras: '333',
      estoque_por_loja: { 'loja-1': 4 },
      variacoes: { Tamanho: 'M' },
    };
    const todos = [pai, filhaP, filhaM];

    assert.equal(calcularEstoqueExibidoVitrine(pai, todos, 'loja-1'), 7); // 3 + 4

    const filtradosPorVariacao = filtrarCatalogoPDV([pai], todos, '222', 'DISPONIVEL', 'loja-1');
    assert.equal(filtradosPorVariacao.length, 1);

    const resPai = resolverSubmissaoBuscaOuCodigoBarras('111', todos, [pai]);
    assert.equal(resPai.acao, 'ABRIR_VARIACOES_EXATO');

    const resFilha = resolverSubmissaoBuscaOuCodigoBarras('222', todos, [pai]);
    assert.equal(resFilha.acao, 'ADICIONAR_DIRETO_EXATO');
    assert.equal(resFilha.produto?.id, 'filha-p');
  });

  await testCase('C.5: Valida correção dos 3 bugs em drawerStats (CONCLUIDA + PAGO), botão finalizar (creditoLojaExcedido) e CNPJ fallback', () => {
    // 1. Botão finalizar desabilita quando creditoLojaExcedido = true (SIMPLES e SPLIT)
    const disabledPorCreditoLoja = isBotaoFinalizarDesabilitado({
      isFinalizingSale: false,
      caixaAberto: true,
      cartLength: 1,
      modoPagamento: 'SIMPLES',
      crediarioExcedido: false,
      creditoLojaExcedido: true,
      dinheiroInsuficiente: false,
      restanteSplit: 0,
      splitPagamentosLength: 0,
      splitCrediarioExcedido: false,
      splitCreditoLojaExcedido: false,
    });
    assert.equal(disabledPorCreditoLoja, true);

    const checkVal = validarCheckoutVenda({
      caixaAberto: true,
      cartLength: 1,
      modoPagamento: 'SIMPLES',
      splitPagamentosLength: 0,
      restanteSplit: 0,
      splitCrediarioExcedido: false,
      splitCreditoLojaExcedido: false,
      formaPagamento: 'CREDITO_LOJA',
      selectedCliente: dummyCliente,
      crediarioExcedido: false,
      creditoLojaExcedido: true,
      valorRecebido: '',
      valorTotal: 100,
    });
    assert.equal(checkVal.valido, false);

    // 2. drawerStats e filtrarHistoricoVendas aceitam status 'CONCLUIDA' e 'PAGO'
    const turno: CaixaTurno = {
      aberto: true,
      fundo_inicial: 200,
      data_abertura: '2026-11-09T10:00:00.000Z',
      operador_nome: 'Admin',
      operacoes: [
        { id: 'op-1', tipo: 'SUPRIMENTO', valor: 50, motivo: 'Troco', data_hora: '2026-11-09T10:05:00.000Z', operador_nome: 'Admin' },
        { id: 'op-2', tipo: 'SANGRIA', valor: 30, motivo: 'Cofre', data_hora: '2026-11-09T10:10:00.000Z', operador_nome: 'Admin' },
      ],
    };

    const vendas: Venda[] = [
      {
        id: 'v-concluida',
        loja_id: 'loja-1',
        usuario_id: 'user-1',
        tenant_id: 'tenant-1',
        valor_total: 100,
        desconto: 0,
        forma_pagamento: 'MULTIPLO',
        pagamentos: [
          { forma_pagamento: 'DINHEIRO', valor: 40 },
          { forma_pagamento: 'PIX', valor: 60 },
        ],
        status: 'CONCLUIDA',
        data_venda: '2026-11-09T11:00:00.000Z',
        itens: [],
      },
      {
        id: 'v-pago',
        loja_id: 'loja-1',
        usuario_id: 'user-1',
        tenant_id: 'tenant-1',
        valor_total: 80,
        desconto: 0,
        forma_pagamento: 'DINHEIRO',
        status: 'PAGO',
        data_venda: '2026-11-09T11:05:00.000Z',
        itens: [],
      },
    ];

    const stats = calcularDrawerStats(turno, vendas);
    assert.equal(stats.vendasDinheiro, 120); // 40 (CONCLUIDA) + 80 (PAGO)
    assert.equal(stats.vendasOutras, 60);
    assert.equal(stats.saldoEsperadoGaveta, 200 + 120 + 50 - 30); // 340
    assert.equal(filtrarHistoricoVendas(vendas, '', 'CONCLUIDA').length, 2);

    // 3. Fallback de CNPJ no cupom térmico sem expor CNPJ fictício
    const receiptData = construirDadosImpressaoTermica({
      receiptSale: vendas[0],
      clientes: [dummyCliente],
      produtos: [dummyProd],
      activeLoja: null,
      user: { nome: 'Operador Teste' },
    });
    assert.equal(receiptData.lojaCnpj, 'CNPJ não informado');
  });

  console.log('\n===============================================================');
  console.log(`  RESULTADO: ${passed} PASSADOS / ${failed} FALHOS`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runCharacterizationSuite();
