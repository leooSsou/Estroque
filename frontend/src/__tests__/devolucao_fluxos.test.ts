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
  console.log('  TESTES UNITÁRIOS DE TROCAS E DEVOLUÇÕES PARCIAIS (PDV)');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => void | Promise<void>) {
    localStorage.clear();
    storage.seedDemoData();
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

  await testCase('1.1: Deve devolver produto parcialmente, recompor estoque e creditar Vale-Crédito para o cliente', () => {
    const lojaId = storage.getLojas()[0].id;
    const produto = storage.getProdutos()[0];
    const cliente = storage.getClientes()[0];
    const estoqueAntes = produto.estoque_por_loja?.[lojaId] || 0;

    // Realiza venda de 3 unidades
    const venda = storage.registrarVenda({
      loja_id: lojaId,
      cliente_id: cliente.id,
      forma_pagamento: 'PIX',
      desconto: 0,
      itens: [
        {
          produto_id: produto.id,
          quantidade: 3,
          preco_unitario: produto.preco_venda,
        },
      ],
    });

    assert.equal(venda.itens[0].quantidade, 3);
    const itemVenda = venda.itens[0];

    // Devolve 1 unidade gerando CREDITO_LOJA
    const devolucao = storage.devolverVenda(venda.id, {
      tipo: 'DEVOLUCAO',
      tipo_resolucao: 'CREDITO_LOJA',
      motivo: 'Tamanho incorreto',
      itens: [
        {
          item_venda_id: itemVenda.id,
          quantidade: 1,
          retornar_ao_estoque: true,
          condicao: 'PERFEITO',
        },
      ],
    });

    assert.equal(devolucao.valor_total, produto.preco_venda);
    assert.equal(devolucao.itens.length, 1);

    // Cliente deve ter saldo de crédito em loja
    const cliAtualizado = storage.getClientes().find((c) => c.id === cliente.id);
    assert.equal(cliAtualizado?.credito_loja, produto.preco_venda);

    // Estoque recomposto em 1 unidade
    const prodAtualizado = storage.getProdutos().find((p) => p.id === produto.id);
    const estoqueDepois = prodAtualizado?.estoque_por_loja?.[lojaId] || 0;
    assert.equal(estoqueDepois, estoqueAntes - 3 + 1);
  });

  await testCase('1.2: Deve utilizar saldo de Vale-Crédito em nova compra', () => {
    const lojaId = storage.getLojas()[0].id;
    const produto = storage.getProdutos()[0];
    const cliente = storage.getClientes()[0];

    // Concede R$ 100 de crédito em loja
    storage.updateCliente(cliente.id, { credito_loja: 100 });

    // Compra produto usando CREDITO_LOJA
    const venda = storage.registrarVenda({
      loja_id: lojaId,
      cliente_id: cliente.id,
      forma_pagamento: 'CREDITO_LOJA',
      desconto: 0,
      itens: [
        {
          produto_id: produto.id,
          quantidade: 1,
          preco_unitario: 60,
        },
      ],
    });

    assert.equal(venda.forma_pagamento, 'CREDITO_LOJA');
    const cliAtualizado = storage.getClientes().find((c) => c.id === cliente.id);
    assert.equal(cliAtualizado?.credito_loja, 40); // 100 - 60 = 40
  });

  await testCase('1.3: Deve abater dívida de crediário em devolução de compra a prazo', () => {
    const lojaId = storage.getLojas()[0].id;
    const produto = storage.getProdutos()[0];
    const cliente = storage.getClientes()[0];
    storage.updateCliente(cliente.id, {
      limite_credito: 1000,
      saldo_devedor_crediario: 0,
    });

    // Venda no CREDIARIO
    const venda = storage.registrarVenda({
      loja_id: lojaId,
      cliente_id: cliente.id,
      forma_pagamento: 'CREDIARIO',
      desconto: 0,
      itens: [
        {
          produto_id: produto.id,
          quantidade: 2,
          preco_unitario: 50,
        },
      ],
    });

    const cliDevedor = storage.getClientes().find((c) => c.id === cliente.id);
    assert.equal(cliDevedor?.saldo_devedor_crediario, 100);

    // Devolve 1 unidade abatendo crediário
    storage.devolverVenda(venda.id, {
      tipo: 'DEVOLUCAO',
      tipo_resolucao: 'ABATIMENTO_CREDIARIO',
      motivo: 'Devolução parcial de crediário',
      itens: [
        {
          item_venda_id: venda.itens[0].id,
          quantidade: 1,
          retornar_ao_estoque: true,
          condicao: 'PERFEITO',
        },
      ],
    });

    const cliAposAbatimento = storage.getClientes().find((c) => c.id === cliente.id);
    assert.equal(cliAposAbatimento?.saldo_devedor_crediario, 50); // 100 - 50 = 50
  });

  console.log('\n===============================================================');
  console.log(`  RESULTADO: ${passed} PASSADOS / ${failed} FALHOS`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
