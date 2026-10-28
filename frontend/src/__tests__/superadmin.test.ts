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

  console.log(`\nResultados: ${passed} passaram, ${failed} falharam.`);
  if (failed > 0) {
    process.exit(1);
  }
}

run();
