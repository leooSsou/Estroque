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

async function run() {
  console.log('===============================================================');
  console.log('  TESTES UNITÁRIOS DE GRADE DE PRODUTOS E VARIAÇÕES');
  console.log('===============================================================\n');

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

  // Setup seed
  localStorage.clear();
  storage.seedDemoData();

  await testCase('1.1: Deve gerar grade matricial com produto cartesiano e SKUs filhos', () => {
    const lojaId = storage.getLojas()[0].id;
    const res = storage.createProdutoGrade({
      nome: 'Camisa Linho Fino',
      sku_base: 'CAM-LINHO',
      preco_custo: 50,
      preco_venda: 120,
      markup: 140,
      loja_id: lojaId,
      estoque_inicial_por_variacao: 12,
      atributos: [
        { nome: 'Cor', valores: ['Bege', 'Branco'] },
        { nome: 'Tamanho', valores: ['P', 'M', 'G'] },
      ],
    });

    assert.equal(res.produto_pai.nome, 'Camisa Linho Fino');
    assert.equal(res.produto_pai.sku, 'CAM-LINHO');
    assert.equal(res.produto_pai.produto_pai_id, null);
    assert.equal(res.variacoes.length, 6); // 2 x 3 = 6 variações

    // Confere SKUs e atributos
    const skus = res.variacoes.map((v) => v.sku);
    assert.ok(skus.includes('CAM-LINHO-BEGE-P'));
    assert.ok(skus.includes('CAM-LINHO-BEGE-M'));
    assert.ok(skus.includes('CAM-LINHO-BEGE-G'));
    assert.ok(skus.includes('CAM-LINHO-BRANCO-P'));
    assert.ok(skus.includes('CAM-LINHO-BRANCO-M'));
    assert.ok(skus.includes('CAM-LINHO-BRANCO-G'));

    // Confere estoque inicial da variação
    for (const v of res.variacoes) {
      assert.equal(v.produto_pai_id, res.produto_pai.id);
      assert.equal(v.estoque_por_loja?.[lojaId], 12);
    }
  });

  await testCase('1.2: Deve listar variações de um produto pai específico', () => {
    const produtos = storage.getProdutos();
    const pai = produtos.find((p) => p.sku === 'CAM-LINHO');
    assert.ok(pai, 'Produto pai deve existir');

    const vars = storage.getVariacoesProduto(pai.id);
    assert.equal(vars.length, 6);
  });

  await testCase('1.3: Deve adicionar variação avulsa à grade existente', () => {
    const produtos = storage.getProdutos();
    const pai = produtos.find((p) => p.sku === 'CAM-LINHO');
    assert.ok(pai, 'Produto pai deve existir');

    const novaVar = storage.addVariacaoProduto(pai.id, {
      variacoes: { Cor: 'Azul', Tamanho: 'GG' },
      preco_venda: 130,
    });

    assert.equal(novaVar.produto_pai_id, pai.id);
    assert.equal(novaVar.sku, 'CAM-LINHO-AZUL-GG');
    assert.equal(novaVar.preco_venda, 130);

    const todasVars = storage.getVariacoesProduto(pai.id);
    assert.equal(todasVars.length, 7);
  });

  await testCase('1.4: Deve vender uma variação específica no PDV e baixar seu estoque individual', () => {
    const lojaId = storage.getLojas()[0].id;
    const produtos = storage.getProdutos();
    const variacao = produtos.find((p) => p.sku === 'CAM-LINHO-BEGE-M');
    assert.ok(variacao, 'Variação deve existir');

    const estoqueAntes = variacao.estoque_por_loja?.[lojaId] || 0;
    assert.equal(estoqueAntes, 12);

    const venda = storage.registrarVenda({
      loja_id: lojaId,
      forma_pagamento: 'PIX',
      desconto: 0,
      itens: [
        {
          produto_id: variacao.id,
          quantidade: 4,
          preco_unitario: variacao.preco_venda,
        },
      ],
    });

    assert.equal(venda.status, 'CONCLUIDA');
    assert.equal(venda.valor_total, 4 * 120);

    const variacaoAtualizada = storage.getProdutos().find((p) => p.id === variacao.id);
    assert.equal(variacaoAtualizada?.estoque_por_loja?.[lojaId], 8); // 12 - 4 = 8
  });

  console.log('\n===============================================================');
  console.log(`  RESULTADO: ${passed} PASSADOS / ${failed} FALHOS`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
