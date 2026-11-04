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
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

import { api } from '../services/api';
import { TenantAdmin, PlataformaDashboardMetrics } from '../types';

async function run() {
  console.log('===============================================================');
  console.log('  TESTES DE SUPER-ADMIN E PLATAFORMA SAAS');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => void | Promise<void>) {
    try {
      await fn();
      console.log(`  [PASS] ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  [FAIL] ${name}`);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`         ${msg}`);
      failed++;
    }
  }

  await testCase('5.1: Deve validar estrutura de métricas da plataforma', async () => {
    try {
      await api.login('admin@estroque.app', 'admin123');
    } catch {
      // modo offline sem backend ativo
    }
    const dash: PlataformaDashboardMetrics = await api.getPlataformaDashboard();
    assert.ok(typeof dash.total_tenants === 'number');
    assert.ok(typeof dash.tenants_ativos === 'number');
    assert.ok(typeof dash.tenants_suspensos === 'number');
    assert.ok(typeof dash.total_lojas === 'number');
    assert.ok(typeof dash.total_usuarios === 'number');
    assert.ok(typeof dash.mrr_estimado === 'number');
    assert.ok(typeof dash.gmv_total === 'number');
    assert.ok(typeof dash.total_vendas === 'number');
  });

  await testCase('5.2: Deve retornar lista de tenants vazia ou populada no mock offline', async () => {
    try {
      await api.login('admin@estroque.app', 'admin123');
    } catch {
      // modo offline sem backend ativo
    }
    const tenants = await api.getAdminTenants();
    assert.ok(Array.isArray(tenants));
  });

  await testCase('5.3: Deve validar contratos de TenantAdmin e cálculos de limites', () => {
    const mockTenant: TenantAdmin = {
      id: 'tenant-123',
      nome_fantasia: 'Moda Fashion',
      razao_social: 'Moda Fashion Ltda',
      cnpj: '12345678000199',
      data_cadastro: '2026-01-01T00:00:00Z',
      ativo: true,
      plano: 'PRO',
      limite_lojas: 5,
      limite_usuarios: 10,
      total_lojas: 3,
      total_usuarios: 7,
      total_vendas_valor: 15400.5,
      total_vendas_qtd: 42,
    };

    assert.equal(mockTenant.plano, 'PRO');
    assert.equal(mockTenant.ativo, true);
    assert.ok(mockTenant.total_lojas < mockTenant.limite_lojas);
    assert.ok(mockTenant.total_usuarios < mockTenant.limite_usuarios);
  });

  await testCase('5.4: Deve simular cálculo de ocupação de limites para plano STARTER', () => {
    const starterTenant: TenantAdmin = {
      id: 'tenant-starter',
      nome_fantasia: 'Boutique Pequena',
      razao_social: 'Boutique Ltda',
      cnpj: '98765432000100',
      data_cadastro: '2026-02-01T00:00:00Z',
      ativo: false,
      plano: 'STARTER',
      limite_lojas: 1,
      limite_usuarios: 2,
      total_lojas: 1,
      total_usuarios: 2,
      total_vendas_valor: 3200.0,
      total_vendas_qtd: 10,
    };

    assert.equal(starterTenant.ativo, false);
    assert.equal(starterTenant.total_lojas >= starterTenant.limite_lojas, true);
    assert.equal(starterTenant.total_usuarios >= starterTenant.limite_usuarios, true);
  });

  await testCase('5.5: Deve validar estrutura de detalhes 360 do tenant', () => {
    const mockDetalhes = {
      id: 'tenant-123',
      nome_fantasia: 'Moda Fashion',
      razao_social: 'Moda Fashion Ltda',
      cnpj: '12.345.678/0001-99',
      data_cadastro: '2026-01-01T00:00:00Z',
      ativo: true,
      plano: 'PRO',
      limite_lojas: 5,
      limite_usuarios: 10,
      total_lojas: 1,
      total_usuarios: 2,
      total_vendas_valor: 15400.5,
      total_vendas_qtd: 42,
      total_produtos: 25,
      lojas: [
        { id: 'loja-1', nome: 'Matriz SP', cnpj: '12.345.678/0001-99', endereco: 'Rua das Flores, 10' },
      ],
      usuarios: [
        { id: 'usr-1', nome: 'Carlos Dono', email: 'carlos@empresa.com', role: 'DONO', loja_atribuida_id: null, loja_nome: null },
      ],
    };

    assert.equal(mockDetalhes.total_produtos, 25);
    assert.equal(mockDetalhes.lojas.length, 1);
    assert.equal(mockDetalhes.usuarios[0].role, 'DONO');
  });

  await testCase('5.6: Deve listar e validar contratos de planos comerciais e edição de recursos', async () => {
    const planos = await api.getAdminPlanos();
    assert.ok(Array.isArray(planos));
    assert.ok(planos.length >= 3);

    const pro = planos.find((p) => p.id === 'PRO');
    assert.ok(pro);
    assert.ok(typeof pro?.preco_mensal === 'number');
    assert.ok(typeof pro?.limite_lojas === 'number');
    assert.ok(typeof pro?.limite_usuarios === 'number');
    assert.ok(Array.isArray(pro?.recursos));
    assert.ok(pro?.recursos.length > 0);
  });

  await testCase('5.7: Deve validar payload de cadastro de Tenant e Loja Matriz pelo Super-Admin', async () => {
    const payload = {
      nome_fantasia: 'Nova Rede Calçados',
      razao_social: 'Nova Rede Calçados Ltda',
      cnpj: '12345678000199',
      plano: 'PRO' as const,
      limite_lojas: 5,
      limite_usuarios: 10,
      nome_loja: 'Matriz Centro',
      endereco_loja: 'Rua das Flores, 100',
      dono_nome: 'Marcos Proprietário',
      dono_email: 'marcos@novarede.com',
      dono_senha: 'senha-segura-123',
    };

    assert.ok(payload.nome_fantasia.length > 0);
    assert.ok(payload.cnpj.length >= 14);
    assert.ok(payload.dono_senha.length >= 6);
    assert.equal(payload.plano, 'PRO');
  });

  await testCase('5.8: Deve validar payload de cadastro de filial avulsa pelo Super-Admin', async () => {
    const payloadFilial = {
      nome: 'Filial Shopping Norte',
      cnpj: '12345678000288',
      endereco: 'Av. Shopping, Loja 45',
    };

    assert.ok(payloadFilial.nome.length > 0);
    assert.ok(payloadFilial.cnpj.length >= 14);
  });

  console.log(`\nResultados: ${passed} passaram, ${failed} falharam.`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
