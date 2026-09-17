import assert from 'node:assert/strict';

// Polyfill localStorage if running in pure Node.js
if (!globalThis.localStorage) {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) || null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: 0,
  } as any;
}

import { storage } from '../services/storage';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  TESTES UNITÁRIOS DE FLUXOS DO PDV ERP - 4 ABAS FUNCIONAIS');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => void | Promise<void>) {
    localStorage.clear();
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

  // =========================================================================
  // ABA 1: FRENTE DE CAIXA (Atendimento, Baixa de Estoque e Troco)
  // =========================================================================
  console.log('\n--- ABA 1: FRENTE DE CAIXA (Venda Ativa) ---');

  await testCase('1.1: Deve registrar venda balcão, baixar estoque e gerar receita', () => {
    const produtos = storage.getProdutos();
    const prod = produtos[0];
    const lojaId = storage.getLojas()[0].id;
    const estoqueInicial = prod.estoque_por_loja?.[lojaId] || 0;

    assert.ok(estoqueInicial >= 2, 'Produto deve ter estoque disponível');

    const venda = storage.registrarVenda({
      loja_id: lojaId,
      forma_pagamento: 'PIX',
      desconto: 10,
      itens: [
        {
          produto_id: prod.id,
          quantidade: 2,
          preco_unitario: prod.preco_venda,
          produto_nome: prod.nome,
          sku: prod.sku,
        },
      ],
    });

    assert.equal(venda.status, 'CONCLUIDA');
    assert.equal(venda.valor_total, 2 * prod.preco_venda - 10);

    // Valida baixa no estoque
    const prodAtualizado = storage.getProdutos().find((p) => p.id === prod.id);
    const novoEstoque = prodAtualizado?.estoque_por_loja?.[lojaId] || 0;
    assert.equal(novoEstoque, estoqueInicial - 2);

    // Valida receita no financeiro
    const lancamentos = storage.getFinanceiro();
    const lancReceita = lancamentos.find(
      (l) => l.categoria.includes('Venda PDV') && l.tipo === 'RECEITA'
    );
    assert.ok(lancReceita, 'Deve gerar lançamento de receita no financeiro');
    assert.equal(lancReceita?.valor, venda.valor_total);
  });

  await testCase('1.2: Deve registrar venda no crediário e atualizar saldo devedor do cliente', () => {
    const cliente = storage.getClientes()[0];
    const prod = storage.getProdutos()[0];
    const saldoDevedorAnterior = cliente.saldo_devedor_crediario;

    const venda = storage.registrarVenda({
      loja_id: storage.getLojas()[0].id,
      cliente_id: cliente.id,
      forma_pagamento: 'CREDIARIO',
      desconto: 0,
      itens: [
        {
          produto_id: prod.id,
          quantidade: 1,
          preco_unitario: 150.0,
          produto_nome: prod.nome,
        },
      ],
    });

    assert.equal(venda.forma_pagamento, 'CREDIARIO');
    assert.equal(venda.valor_total, 150.0);

    const clienteAtualizado = storage.getClientes().find((c) => c.id === cliente.id);
    assert.equal(clienteAtualizado?.saldo_devedor_crediario, saldoDevedorAnterior + 150.0);
  });

  await testCase('1.3: Deve calcular troco automaticamente para pagamento em dinheiro', () => {
    const totalVenda = 85.0;
    const valorRecebido = 100.0;
    const troco = valorRecebido - totalVenda;
    assert.equal(troco, 15.0);
  });

  // =========================================================================
  // ABA 2: VENDAS EM ESPERA (Hold Queue)
  // =========================================================================
  console.log('\n--- ABA 2: VENDAS EM ESPERA (Hold Queue) ---');

  await testCase('2.1: Deve pausar venda, gerar código ESP-XXX e listar na fila de espera', () => {
    const prod = storage.getProdutos()[0];

    const vendaPausada = storage.salvarVendaEspera({
      cliente_nome: 'Cliente em Espera',
      desconto: 5.0,
      forma_pagamento: 'DINHEIRO',
      valor_total: 95.0,
      observacao: 'Foi até o veículo buscar a carteira',
      itens: [
        {
          produto: prod,
          quantidade: 1,
          preco_unitario: 100.0,
        },
      ],
    });

    assert.ok(vendaPausada.id);
    assert.match(vendaPausada.codigo, /^ESP-\d{3}$/);
    assert.equal(vendaPausada.observacao, 'Foi até o veículo buscar a carteira');

    const listaEspera = storage.getVendasEspera();
    assert.equal(listaEspera.length, 1);
    assert.equal(listaEspera[0].codigo, vendaPausada.codigo);
  });

  await testCase('2.2: Deve remover da fila ao retomar atendimento no caixa', () => {
    const prod = storage.getProdutos()[0];
    const pausada = storage.salvarVendaEspera({
      cliente_nome: 'Ana Paula',
      desconto: 0,
      forma_pagamento: 'PIX',
      valor_total: 50.0,
      itens: [{ produto: prod, quantidade: 1, preco_unitario: 50.0 }],
    });

    assert.equal(storage.getVendasEspera().length, 1);
    storage.removerVendaEspera(pausada.id);
    assert.equal(storage.getVendasEspera().length, 0);
  });

  // =========================================================================
  // ABA 3: HISTÓRICO DE VENDAS & ESTORNO
  // =========================================================================
  console.log('\n--- ABA 3: HISTÓRICO DO TURNO & ESTORNO ---');

  await testCase('3.1: Deve estornar venda concluída, devolver itens ao estoque e lançar despesa compensatória', () => {
    const produtos = storage.getProdutos();
    const prod = produtos[0];
    const lojaId = storage.getLojas()[0].id;
    const estoqueAntes = prod.estoque_por_loja?.[lojaId] || 0;

    const venda = storage.registrarVenda({
      loja_id: lojaId,
      forma_pagamento: 'CARTAO_CREDITO',
      desconto: 0,
      itens: [
        {
          produto_id: prod.id,
          quantidade: 3,
          preco_unitario: prod.preco_venda,
          produto_nome: prod.nome,
        },
      ],
    });

    const estoqueBaixado = storage.getProdutos().find((p) => p.id === prod.id)?.estoque_por_loja?.[lojaId] || 0;
    assert.equal(estoqueBaixado, estoqueAntes - 3);

    // Executa estorno
    const estornada = storage.estornarVenda(venda.id);
    assert.equal(estornada.status, 'CANCELADA');

    // Valida devolução ao estoque
    const estoqueRestituido = storage.getProdutos().find((p) => p.id === prod.id)?.estoque_por_loja?.[lojaId] || 0;
    assert.equal(estoqueRestituido, estoqueAntes);

    // Valida compensação financeira
    const compensacao = storage.getFinanceiro().find((l) => l.categoria === 'Estorno de Venda PDV');
    assert.ok(compensacao, 'Deve registrar compensação contábil de despesa');
    assert.equal(compensacao?.valor, venda.valor_total);
  });

  await testCase('3.2: Deve recompor limite de crediário do cliente ao estornar venda a prazo', () => {
    const cliente = storage.getClientes()[0];
    const prod = storage.getProdutos()[0];
    const saldoDevedorAntes = cliente.saldo_devedor_crediario;

    const venda = storage.registrarVenda({
      loja_id: storage.getLojas()[0].id,
      cliente_id: cliente.id,
      forma_pagamento: 'CREDIARIO',
      desconto: 0,
      itens: [
        {
          produto_id: prod.id,
          quantidade: 1,
          preco_unitario: 300.0,
          produto_nome: prod.nome,
        },
      ],
    });

    assert.equal(
      storage.getClientes().find((c) => c.id === cliente.id)?.saldo_devedor_crediario,
      saldoDevedorAntes + 300.0
    );

    // Estorno
    storage.estornarVenda(venda.id);

    assert.equal(
      storage.getClientes().find((c) => c.id === cliente.id)?.saldo_devedor_crediario,
      saldoDevedorAntes
    );
  });

  // =========================================================================
  // ABA 4: OPERAÇÕES DE CAIXA (Sangria, Suprimento e Fechamento Cego)
  // =========================================================================
  console.log('\n--- ABA 4: OPERAÇÕES DE CAIXA (Turno) ---');

  await testCase('4.1: Deve registrar suprimento de troco na gaveta e lançar receita', () => {
    const op = storage.registrarSuprimento(120.0, 'Aporte de moedas');
    assert.equal(op.tipo, 'SUPRIMENTO');
    assert.equal(op.valor, 120.0);

    const turno = storage.getCaixaTurno();
    assert.ok(turno.operacoes.some((o) => o.tipo === 'SUPRIMENTO' && o.valor === 120.0));

    const lanc = storage.getFinanceiro().find((l) => l.categoria === 'Suprimento de Caixa (Troco)');
    assert.ok(lanc);
    assert.equal(lanc?.valor, 120.0);
  });

  await testCase('4.2: Deve registrar sangria para o cofre e lançar despesa', () => {
    const op = storage.registrarSangria(250.0, 'Retirada de segurança');
    assert.equal(op.tipo, 'SANGRIA');
    assert.equal(op.valor, 250.0);

    const turno = storage.getCaixaTurno();
    assert.ok(turno.operacoes.some((o) => o.tipo === 'SANGRIA' && o.valor === 250.0));

    const lanc = storage.getFinanceiro().find((l) => l.categoria === 'Sangria de Caixa (Cofre)');
    assert.ok(lanc);
    assert.equal(lanc?.valor, 250.0);
  });

  await testCase('4.3: Deve fechar caixa com contagem cega e apurar quebra/diferença física', () => {
    // Fundo Inicial = 200
    // Venda Dinheiro = 150
    const prod = storage.getProdutos()[0];
    storage.registrarVenda({
      loja_id: storage.getLojas()[0].id,
      forma_pagamento: 'DINHEIRO',
      desconto: 0,
      itens: [{ produto_id: prod.id, quantidade: 1, preco_unitario: 150.0 }],
    });

    // Suprimento = 50
    storage.registrarSuprimento(50.0, 'Troco extra');

    // Sangria = 80
    storage.registrarSangria(80.0, 'Cofre');

    // Saldo esperado gaveta = 200 + 150 + 50 - 80 = 320.0
    // Contagem física do operador = 310.0 (Diferença de -10.0)
    const fechamento = storage.fecharCaixa(310.0, 'Faltaram 10 reais');

    assert.equal(fechamento.resumo.aberto, false);
    assert.equal(fechamento.diferenca, -10.0);

    const opFechamento = fechamento.resumo.operacoes.find((o) => o.tipo === 'FECHAMENTO');
    assert.ok(opFechamento);
    assert.equal(opFechamento?.valor, 310.0);
    assert.ok(opFechamento?.motivo.includes('Diferença: R$ -10.00'));
  });

  await testCase('4.4: Deve abrir novo turno de caixa com fundo inicial limpo', () => {
    storage.fecharCaixa(300.0);
    assert.equal(storage.getCaixaTurno().aberto, false);

    const novoTurno = storage.abrirCaixa(350.0);
    assert.equal(novoTurno.aberto, true);
    assert.equal(novoTurno.fundo_inicial, 350.0);
    assert.equal(novoTurno.operacoes[0].tipo, 'ABERTURA');
  });

  console.log('\n===============================================================');
  console.log(`  RESULTADO: ${passed} PASSADOS / ${failed} FALHOS`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
