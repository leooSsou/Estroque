import {
  User,
  Loja,
  Produto,
  EstoqueSaldo,
  MovimentacaoEstoque,
  Cliente,
  Fornecedor,
  TransferenciaEstoque,
  Venda,
  FinanceiroLancamento,
  DashboardAnalytics,
  CurvaABCItem,
  VendaEmEspera,
  OperacaoCaixa,
  CaixaTurno,
} from '../types';

const STORAGE_PREFIX = 'estroque_saas_';

const DEFAULT_LOJAS: Loja[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nome: 'Loja Matriz - São Paulo',
    cnpj: '12.345.678/0001-90',
    endereco: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nome: 'Filial 01 - Campinas',
    cnpj: '12.345.678/0002-71',
    endereco: 'Rua Barão de Jaguara, 550 - Centro, Campinas - SP',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
];

const DEFAULT_USER: User = {
  id: '33333333-3333-3333-3333-333333333333',
  nome: 'Jonathas Silva',
  email: 'dono@estroque.com.br',
  role: 'DONO',
  tenant_id: '00000000-0000-0000-0000-000000000001',
};

const DEFAULT_FORNECEDORES: Fornecedor[] = [
  {
    id: '44444444-4444-4444-4444-444444444441',
    nome_fantasia: 'TechDistribuidora Brasil',
    razao_social: 'TechDistribuidora de Eletrônicos Ltda',
    cnpj: '45.123.890/0001-12',
    email: 'comercial@techdistribuidora.com.br',
    telefone: '(11) 3456-7890',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
  {
    id: '44444444-4444-4444-4444-444444444442',
    nome_fantasia: 'Alpha Suprimentos & Moda',
    razao_social: 'Alpha Suprimentos Comerciais S.A.',
    cnpj: '33.987.654/0001-55',
    email: 'contato@alphasuprimentos.com',
    telefone: '(19) 3210-9876',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
];

const DEFAULT_CLIENTES: Cliente[] = [
  {
    id: '55555555-5555-5555-5555-555555555551',
    nome: 'Carlos Eduardo Mendes',
    email: 'carlos.mendes@email.com',
    documento: '284.918.472-88',
    telefone: '(11) 98765-4321',
    limite_credito: 1500.0,
    saldo_devedor_crediario: 320.0,
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
  {
    id: '55555555-5555-5555-5555-555555555552',
    nome: 'Mariana Lima Rocha',
    email: 'mariana.rocha@empresa.com.br',
    documento: '49.123.876/0001-09',
    telefone: '(19) 99123-4567',
    limite_credito: 4500.0,
    saldo_devedor_crediario: 0.0,
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
  {
    id: '55555555-5555-5555-5555-555555555553',
    nome: 'Roberto Viana Filho',
    email: 'roberto.viana@gmail.com',
    documento: '192.834.765-10',
    telefone: '(11) 97654-1234',
    limite_credito: 800.0,
    saldo_devedor_crediario: 750.0,
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
];

const DEFAULT_PRODUTOS: Produto[] = [
  {
    id: '66666666-6666-6666-6666-666666666661',
    nome: 'Teclado Mecânico RGB Pro Wireless',
    sku: 'TEC-MEC-01',
    codigo_barras: '7891234560012',
    categoria: 'Periféricos',
    preco_custo: 140.0,
    markup: 71.4, // Preço = 140 * (1 + 0.714) = 240
    preco_venda: 239.9,
    fornecedor_id: '44444444-4444-4444-4444-444444444441',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
    estoque_por_loja: {
      '11111111-1111-1111-1111-111111111111': 42,
      '22222222-2222-2222-2222-222222222222': 18,
    },
    estoque_total: 60,
    estoque_minimo: 15,
  },
  {
    id: '66666666-6666-6666-6666-666666666662',
    nome: 'Mouse Gamer Óptico 16000 DPI Sensor PixArt',
    sku: 'MOU-GAM-02',
    codigo_barras: '7891234560029',
    categoria: 'Periféricos',
    preco_custo: 75.0,
    markup: 86.6,
    preco_venda: 139.9,
    fornecedor_id: '44444444-4444-4444-4444-444444444441',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
    estoque_por_loja: {
      '11111111-1111-1111-1111-111111111111': 25,
      '22222222-2222-2222-2222-222222222222': 9,
    },
    estoque_total: 34,
    estoque_minimo: 10,
  },
  {
    id: '66666666-6666-6666-6666-666666666663',
    nome: 'Headset Gamer Surround 7.1 Cancelamento Ruído',
    sku: 'HEA-SUR-03',
    codigo_barras: '7891234560036',
    categoria: 'Áudio',
    preco_custo: 110.0,
    markup: 81.8,
    preco_venda: 199.9,
    fornecedor_id: '44444444-4444-4444-4444-444444444441',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
    estoque_por_loja: {
      '11111111-1111-1111-1111-111111111111': 4,
      '22222222-2222-2222-2222-222222222222': 0, // Ruptura na filial!
    },
    estoque_total: 4,
    estoque_minimo: 8,
  },
  {
    id: '66666666-6666-6666-6666-666666666664',
    nome: 'Monitor UltraWide 29" IPS 75Hz FreeSync',
    sku: 'MON-ULT-04',
    codigo_barras: '7891234560043',
    categoria: 'Monitores',
    preco_custo: 680.0,
    markup: 54.4,
    preco_venda: 1049.9,
    fornecedor_id: '44444444-4444-4444-4444-444444444441',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
    estoque_por_loja: {
      '11111111-1111-1111-1111-111111111111': 12,
      '22222222-2222-2222-2222-222222222222': 5,
    },
    estoque_total: 17,
    estoque_minimo: 6,
  },
  {
    id: '66666666-6666-6666-6666-666666666665',
    nome: 'Webcam 4K UltraHD com Microfone Estéreo',
    sku: 'WEB-4K-05',
    codigo_barras: '7891234560050',
    categoria: 'Streaming',
    preco_custo: 160.0,
    markup: 81.2,
    preco_venda: 289.9,
    fornecedor_id: '44444444-4444-4444-4444-444444444441',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
    estoque_por_loja: {
      '11111111-1111-1111-1111-111111111111': 0, // Ruptura total
      '22222222-2222-2222-2222-222222222222': 0,
    },
    estoque_total: 0,
    estoque_minimo: 5,
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    nome: 'Cadeira Ergonômica Mesh Ajuste 3D',
    sku: 'CAD-ERG-06',
    codigo_barras: '7891234560067',
    categoria: 'Móveis',
    preco_custo: 450.0,
    markup: 66.6,
    preco_venda: 749.9,
    fornecedor_id: '44444444-4444-4444-4444-444444444442',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
    estoque_por_loja: {
      '11111111-1111-1111-1111-111111111111': 8,
      '22222222-2222-2222-2222-222222222222': 3,
    },
    estoque_total: 11,
    estoque_minimo: 4,
  },
];

const DEFAULT_LEDGER: MovimentacaoEstoque[] = [
  {
    id: '77777777-7777-7777-7777-777777777771',
    loja_id: '11111111-1111-1111-1111-111111111111',
    produto_id: '66666666-6666-6666-6666-666666666661',
    tipo: 'ENTRADA',
    quantidade: 50,
    motivo: 'Recebimento de NF-e 004.891 TechDistribuidora',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    data_movimentacao: new Date(Date.now() - 86400000 * 2).toISOString(),
    responsavel: 'Jonathas Silva',
    saldo_anterior: 0,
    saldo_resultante: 50,
  },
  {
    id: '77777777-7777-7777-7777-777777777772',
    loja_id: '11111111-1111-1111-1111-111111111111',
    produto_id: '66666666-6666-6666-6666-666666666661',
    tipo: 'SAIDA',
    quantidade: 8,
    motivo: 'Venda Balcão PDV #00129',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    data_movimentacao: new Date(Date.now() - 86400000).toISOString(),
    responsavel: 'Operador Caixa 01',
    saldo_anterior: 50,
    saldo_resultante: 42,
  },
  {
    id: '77777777-7777-7777-7777-777777777773',
    loja_id: '22222222-2222-2222-2222-222222222222',
    produto_id: '66666666-6666-6666-6666-666666666662',
    tipo: 'ENTRADA',
    quantidade: 10,
    motivo: 'Transferência recebida da Matriz #TRF-902',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    data_movimentacao: new Date(Date.now() - 3600000 * 5).toISOString(),
    responsavel: 'Gerente Campinas',
    saldo_anterior: 0,
    saldo_resultante: 10,
  },
];

const DEFAULT_TRANSFERENCIAS: TransferenciaEstoque[] = [
  {
    id: '88888888-8888-8888-8888-888888888881',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    loja_origem_id: '11111111-1111-1111-1111-111111111111',
    loja_destino_id: '22222222-2222-2222-2222-222222222222',
    produto_id: '66666666-6666-6666-6666-666666666661',
    quantidade: 10,
    status: 'DESPACHADO',
    solicitado_por_id: '33333333-3333-3333-3333-333333333333',
    aprovado_por_id: '33333333-3333-3333-3333-333333333333',
    criado_em: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: '88888888-8888-8888-8888-888888888882',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    loja_origem_id: '11111111-1111-1111-1111-111111111111',
    loja_destino_id: '22222222-2222-2222-2222-222222222222',
    produto_id: '66666666-6666-6666-6666-666666666663',
    quantidade: 4,
    status: 'SOLICITADO',
    solicitado_por_id: '33333333-3333-3333-3333-333333333333',
    criado_em: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const DEFAULT_FINANCEIRO: FinanceiroLancamento[] = [
  {
    id: '99999999-9999-9999-9999-999999999991',
    loja_id: '11111111-1111-1111-1111-111111111111',
    tipo: 'RECEITA',
    valor: 4890.5,
    categoria: 'Vendas Balcão',
    status_pagamento: 'PAGO',
    data_lancamento: new Date().toISOString(),
    data_pagamento: new Date().toISOString(),
    tenant_id: '00000000-0000-0000-0000-000000000001',
    descricao: 'Recebimentos PDV do dia',
  },
  {
    id: '99999999-9999-9999-9999-999999999992',
    loja_id: '11111111-1111-1111-1111-111111111111',
    tipo: 'DESPESA',
    valor: 1250.0,
    categoria: 'Aluguel & Condomínio',
    status_pagamento: 'PAGO',
    data_lancamento: new Date(Date.now() - 86400000 * 3).toISOString(),
    data_pagamento: new Date(Date.now() - 86400000 * 3).toISOString(),
    tenant_id: '00000000-0000-0000-0000-000000000001',
    descricao: 'Aluguel Loja Matriz',
  },
  {
    id: '99999999-9999-9999-9999-999999999993',
    loja_id: '11111111-1111-1111-1111-111111111111',
    tipo: 'DESPESA',
    valor: 380.0,
    categoria: 'Energia Elétrica & Internet',
    status_pagamento: 'PENDENTE',
    data_lancamento: new Date().toISOString(),
    tenant_id: '00000000-0000-0000-0000-000000000001',
    descricao: 'Conta de Energia CPFL',
  },
];

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const stored = localStorage.getItem(STORAGE_PREFIX + key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return defaultValue;
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch {
      // Ignore
    }
  }

  // Auth & Lojas
  getUser(): User {
    return this.get<User>('user', DEFAULT_USER);
  }

  setUser(user: User): void {
    this.set('user', user);
  }

  getLojas(): Loja[] {
    return this.get<Loja[]>('lojas', DEFAULT_LOJAS);
  }

  addLoja(loja: Omit<Loja, 'id' | 'tenant_id'>): Loja {
    const lojas = this.getLojas();
    const newLoja: Loja = {
      ...loja,
      id: crypto.randomUUID ? crypto.randomUUID() : `loja-${Date.now()}`,
      tenant_id: DEFAULT_USER.tenant_id,
    };
    lojas.push(newLoja);
    this.set('lojas', lojas);
    return newLoja;
  }

  // Produtos
  getProdutos(): Produto[] {
    return this.get<Produto[]>('produtos', DEFAULT_PRODUTOS);
  }

  addProduto(prod: Omit<Produto, 'id' | 'tenant_id' | 'estoque_total'> & { estoque_inicial?: number; loja_id?: string }): Produto {
    const produtos = this.getProdutos();
    const id = crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}`;
    const estoquePorLoja: Record<string, number> = {};
    if (prod.loja_id && prod.estoque_inicial) {
      estoquePorLoja[prod.loja_id] = prod.estoque_inicial;
    }

    const newProd: Produto = {
      ...prod,
      id,
      tenant_id: DEFAULT_USER.tenant_id,
      estoque_por_loja: estoquePorLoja,
      estoque_total: prod.estoque_inicial || 0,
      estoque_minimo: prod.estoque_minimo || 5,
    };

    produtos.push(newProd);
    this.set('produtos', produtos);

    // If initial stock provided, record in ledger
    if (prod.loja_id && prod.estoque_inicial && prod.estoque_inicial > 0) {
      this.addMovimentacao({
        loja_id: prod.loja_id,
        produto_id: id,
        tipo: 'ENTRADA',
        quantidade: prod.estoque_inicial,
        motivo: 'Estoque inicial de cadastro de produto',
      });
    }

    return newProd;
  }

  updateProduto(id: string, updates: Partial<Produto>): Produto | null {
    const produtos = this.getProdutos();
    const index = produtos.findIndex((p) => p.id === id);
    if (index === -1) return null;

    produtos[index] = { ...produtos[index], ...updates };
    this.set('produtos', produtos);
    return produtos[index];
  }

  // Estoque & Ledger
  getLedger(): MovimentacaoEstoque[] {
    return this.get<MovimentacaoEstoque[]>('ledger', DEFAULT_LEDGER);
  }

  addMovimentacao(mov: {
    loja_id: string;
    produto_id: string;
    tipo: 'ENTRADA' | 'SAIDA';
    quantidade: number;
    motivo: string;
  }): MovimentacaoEstoque {
    const produtos = this.getProdutos();
    const prod = produtos.find((p) => p.id === mov.produto_id);
    const prevStock = prod?.estoque_por_loja?.[mov.loja_id] || 0;
    const delta = mov.tipo === 'ENTRADA' ? mov.quantidade : -mov.quantidade;
    const newStock = Math.max(0, prevStock + delta);

    if (prod) {
      if (!prod.estoque_por_loja) prod.estoque_por_loja = {};
      prod.estoque_por_loja[mov.loja_id] = newStock;
      prod.estoque_total = Object.values(prod.estoque_por_loja).reduce((a, b) => a + b, 0);
      this.set('produtos', produtos);
    }

    const ledger = this.getLedger();
    const newEntry: MovimentacaoEstoque = {
      id: crypto.randomUUID ? crypto.randomUUID() : `mov-${Date.now()}`,
      loja_id: mov.loja_id,
      produto_id: mov.produto_id,
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      motivo: mov.motivo,
      tenant_id: DEFAULT_USER.tenant_id,
      data_movimentacao: new Date().toISOString(),
      responsavel: this.getUser().nome,
      saldo_anterior: prevStock,
      saldo_resultante: newStock,
    };

    ledger.unshift(newEntry);
    this.set('ledger', ledger);
    return newEntry;
  }

  // Clientes
  getClientes(): Cliente[] {
    return this.get<Cliente[]>('clientes', DEFAULT_CLIENTES);
  }

  addCliente(cliente: Omit<Cliente, 'id' | 'tenant_id' | 'saldo_devedor_crediario'>): Cliente {
    const clientes = this.getClientes();
    const newCliente: Cliente = {
      ...cliente,
      id: crypto.randomUUID ? crypto.randomUUID() : `cli-${Date.now()}`,
      saldo_devedor_crediario: 0,
      tenant_id: DEFAULT_USER.tenant_id,
    };
    clientes.push(newCliente);
    this.set('clientes', clientes);
    return newCliente;
  }

  updateCliente(id: string, updates: Partial<Cliente>): Cliente | null {
    const clientes = this.getClientes();
    const index = clientes.findIndex((c) => c.id === id);
    if (index === -1) return null;
    clientes[index] = { ...clientes[index], ...updates };
    this.set('clientes', clientes);
    return clientes[index];
  }

  // Fornecedores
  getFornecedores(): Fornecedor[] {
    return this.get<Fornecedor[]>('fornecedores', DEFAULT_FORNECEDORES);
  }

  addFornecedor(fornecedor: Omit<Fornecedor, 'id' | 'tenant_id'>): Fornecedor {
    const fornecedores = this.getFornecedores();
    const newFornecedor: Fornecedor = {
      ...fornecedor,
      id: crypto.randomUUID ? crypto.randomUUID() : `forn-${Date.now()}`,
      tenant_id: DEFAULT_USER.tenant_id,
    };
    fornecedores.push(newFornecedor);
    this.set('fornecedores', fornecedores);
    return newFornecedor;
  }

  // Transferências
  getTransferencias(): TransferenciaEstoque[] {
    return this.get<TransferenciaEstoque[]>('transferencias', DEFAULT_TRANSFERENCIAS);
  }

  solicitarTransferencia(dados: {
    loja_origem_id: string;
    loja_destino_id: string;
    produto_id: string;
    quantidade: number;
  }): TransferenciaEstoque {
    const transferencias = this.getTransferencias();
    const newTransfer: TransferenciaEstoque = {
      id: crypto.randomUUID ? crypto.randomUUID() : `trf-${Date.now()}`,
      tenant_id: DEFAULT_USER.tenant_id,
      loja_origem_id: dados.loja_origem_id,
      loja_destino_id: dados.loja_destino_id,
      produto_id: dados.produto_id,
      quantidade: dados.quantidade,
      status: 'SOLICITADO',
      solicitado_por_id: this.getUser().id,
      criado_em: new Date().toISOString(),
    };
    transferencias.unshift(newTransfer);
    this.set('transferencias', transferencias);
    return newTransfer;
  }

  despacharTransferencia(id: string): TransferenciaEstoque | null {
    const transferencias = this.getTransferencias();
    const trf = transferencias.find((t) => t.id === id);
    if (!trf) return null;

    trf.status = 'DESPACHADO';
    trf.aprovado_por_id = this.getUser().id;

    // Saída na origem
    this.addMovimentacao({
      loja_id: trf.loja_origem_id,
      produto_id: trf.produto_id,
      tipo: 'SAIDA',
      quantidade: trf.quantidade,
      motivo: `Despacho de transferência interlojas #${trf.id.slice(0, 8)}`,
    });

    this.set('transferencias', transferencias);
    return trf;
  }

  receberTransferencia(id: string, quantidadeRecebida: number, justificativa?: string): TransferenciaEstoque | null {
    const transferencias = this.getTransferencias();
    const trf = transferencias.find((t) => t.id === id);
    if (!trf) return null;

    trf.quantidade_recebida = quantidadeRecebida;
    trf.justificativa = justificativa;
    trf.status = quantidadeRecebida === trf.quantidade ? 'RECEBIDO' : 'DIVERGENTE';

    // Entrada no destino com a quantidade física recebida
    this.addMovimentacao({
      loja_id: trf.loja_destino_id,
      produto_id: trf.produto_id,
      tipo: 'ENTRADA',
      quantidade: quantidadeRecebida,
      motivo: `Recebimento de transferência #${trf.id.slice(0, 8)}${justificativa ? ` (${justificativa})` : ''}`,
    });

    this.set('transferencias', transferencias);
    return trf;
  }

  // Vendas (PDV)
  getVendas(lojaId?: string, dataInicio?: string, dataFim?: string): Venda[] {
    let vendas = this.get<Venda[]>('vendas', []);
    if (lojaId) {
      vendas = vendas.filter((v) => v.loja_id === lojaId);
    }
    if (dataInicio) {
      const inicio = new Date(dataInicio).getTime();
      vendas = vendas.filter((v) => new Date(v.data_venda).getTime() >= inicio);
    }
    if (dataFim) {
      const fim = new Date(dataFim).getTime();
      vendas = vendas.filter((v) => new Date(v.data_venda).getTime() <= fim);
    }
    return vendas;
  }

  registrarVenda(dados: {
    loja_id: string;
    cliente_id?: string | null;
    forma_pagamento: Venda['forma_pagamento'];
    desconto: number;
    itens: { produto_id: string; quantidade: number; preco_unitario: number; produto_nome?: string; sku?: string }[];
  }): Venda {
    const produtos = this.getProdutos();
    const vendas = this.getVendas();

    let subtotal = 0;
    for (const item of dados.itens) {
      subtotal += item.quantidade * item.preco_unitario;

      // Movimenta o estoque para cada produto vendido
      this.addMovimentacao({
        loja_id: dados.loja_id,
        produto_id: item.produto_id,
        tipo: 'SAIDA',
        quantidade: item.quantidade,
        motivo: `Venda PDV balcão #${vendas.length + 1}`,
      });
    }

    const valorTotal = Math.max(0, subtotal - dados.desconto);

    // Se for CREDIARIO, lança saldo devedor no cliente
    if (dados.forma_pagamento === 'CREDIARIO' && dados.cliente_id) {
      const clientes = this.getClientes();
      const cli = clientes.find((c) => c.id === dados.cliente_id);
      if (cli) {
        cli.saldo_devedor_crediario += valorTotal;
        this.set('clientes', clientes);
      }
    }

    // Registra no financeiro como receita
    this.addLancamentoFinanceiro({
      loja_id: dados.loja_id,
      tipo: 'RECEITA',
      valor: valorTotal,
      categoria: `Venda PDV (${dados.forma_pagamento})`,
      status_pagamento: dados.forma_pagamento === 'CREDIARIO' ? 'PENDENTE' : 'PAGO',
      descricao: `Venda PDV balcão com ${dados.itens.length} itens`,
    });

    const clienteObj = dados.cliente_id ? this.getClientes().find((c) => c.id === dados.cliente_id) : undefined;

    const novaVenda: Venda = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ven-${Date.now()}`,
      loja_id: dados.loja_id,
      cliente_id: dados.cliente_id,
      cliente_nome: clienteObj?.nome,
      usuario_id: this.getUser().id,
      status: 'CONCLUIDA',
      forma_pagamento: dados.forma_pagamento,
      valor_total: valorTotal,
      desconto: dados.desconto,
      data_venda: new Date().toISOString(),
      tenant_id: DEFAULT_USER.tenant_id,
      itens: dados.itens.map((i) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`,
        produto_id: i.produto_id,
        produto_nome: i.produto_nome,
        sku: i.sku,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        tenant_id: DEFAULT_USER.tenant_id,
      })),
    };

    vendas.unshift(novaVenda);
    this.set('vendas', vendas);
    return novaVenda;
  }

  estornarVenda(vendaId: string): Venda {
    const vendas = this.getVendas();
    const index = vendas.findIndex((v) => v.id === vendaId);
    if (index === -1) throw new Error('Venda não encontrada.');

    const venda = vendas[index];
    if (venda.status === 'CANCELADA') return venda;

    // 1. Devolve os produtos ao estoque
    for (const item of venda.itens) {
      this.addMovimentacao({
        loja_id: venda.loja_id,
        produto_id: item.produto_id,
        tipo: 'ENTRADA',
        quantidade: item.quantidade,
        motivo: `Estorno de venda #${venda.id.slice(0, 8)}`,
      });
    }

    // 2. Se foi crediário, recompõe o saldo devedor do cliente
    if (venda.forma_pagamento === 'CREDIARIO' && venda.cliente_id) {
      const clientes = this.getClientes();
      const cli = clientes.find((c) => c.id === venda.cliente_id);
      if (cli) {
        cli.saldo_devedor_crediario = Math.max(0, cli.saldo_devedor_crediario - venda.valor_total);
        this.set('clientes', clientes);
      }
    }

    // 3. Registra estorno no financeiro
    this.addLancamentoFinanceiro({
      loja_id: venda.loja_id,
      tipo: 'DESPESA',
      valor: venda.valor_total,
      categoria: 'Estorno de Venda PDV',
      status_pagamento: 'PAGO',
      descricao: `Estorno da venda #${venda.id.slice(0, 8)}`,
    });

    const vendaAtualizada: Venda = {
      ...venda,
      status: 'CANCELADA',
    };
    vendas[index] = vendaAtualizada;
    this.set('vendas', vendas);
    return vendaAtualizada;
  }

  // Vendas em Espera (Hold)
  getVendasEspera(): VendaEmEspera[] {
    return this.get<VendaEmEspera[]>('vendas_espera', []);
  }

  salvarVendaEspera(dados: Omit<VendaEmEspera, 'id' | 'codigo' | 'criado_em'>): VendaEmEspera {
    const lista = this.getVendasEspera();
    const count = lista.length + 1;
    const nova: VendaEmEspera = {
      ...dados,
      id: crypto.randomUUID ? crypto.randomUUID() : `esp-${Date.now()}`,
      codigo: `ESP-${String(count).padStart(3, '0')}`,
      criado_em: new Date().toISOString(),
    };
    lista.unshift(nova);
    this.set('vendas_espera', lista);
    return nova;
  }

  removerVendaEspera(id: string): void {
    const lista = this.getVendasEspera().filter((v) => v.id !== id);
    this.set('vendas_espera', lista);
  }

  // Operações de Caixa (Turno)
  getCaixaTurno(): CaixaTurno {
    return this.get<CaixaTurno>('caixa_turno', {
      aberto: true,
      operador_nome: this.getUser().nome || 'Operador Padrão',
      data_abertura: new Date(Date.now() - 3600000 * 4).toISOString(),
      fundo_inicial: 200.0,
      operacoes: [
        {
          id: 'op-init-1',
          tipo: 'ABERTURA',
          valor: 200.0,
          motivo: 'Fundo de troco inicial do turno',
          data_hora: new Date(Date.now() - 3600000 * 4).toISOString(),
          operador_nome: this.getUser().nome || 'Operador Padrão',
        },
      ],
    });
  }

  abrirCaixa(fundoInicial: number): CaixaTurno {
    const novoTurno: CaixaTurno = {
      aberto: true,
      operador_nome: this.getUser().nome || 'Operador Padrão',
      data_abertura: new Date().toISOString(),
      fundo_inicial: fundoInicial,
      operacoes: [
        {
          id: `op-${Date.now()}`,
          tipo: 'ABERTURA',
          valor: fundoInicial,
          motivo: 'Abertura de caixa e fundo de troco inicial',
          data_hora: new Date().toISOString(),
          operador_nome: this.getUser().nome || 'Operador Padrão',
        },
      ],
    };
    this.set('caixa_turno', novoTurno);
    return novoTurno;
  }

  registrarSangria(valor: number, motivo: string): OperacaoCaixa {
    const caixa = this.getCaixaTurno();
    const op: OperacaoCaixa = {
      id: `op-sangria-${Date.now()}`,
      tipo: 'SANGRIA',
      valor,
      motivo,
      data_hora: new Date().toISOString(),
      operador_nome: caixa.operador_nome,
    };
    caixa.operacoes.unshift(op);
    this.set('caixa_turno', caixa);

    // Lança no financeiro como despesa
    this.addLancamentoFinanceiro({
      loja_id: this.getLojas()[0]?.id || '11111111-1111-1111-1111-111111111111',
      tipo: 'DESPESA',
      valor,
      categoria: 'Sangria de Caixa (Cofre)',
      status_pagamento: 'PAGO',
      descricao: `Sangria de caixa: ${motivo}`,
    });

    return op;
  }

  registrarSuprimento(valor: number, motivo: string): OperacaoCaixa {
    const caixa = this.getCaixaTurno();
    const op: OperacaoCaixa = {
      id: `op-suprimento-${Date.now()}`,
      tipo: 'SUPRIMENTO',
      valor,
      motivo,
      data_hora: new Date().toISOString(),
      operador_nome: caixa.operador_nome,
    };
    caixa.operacoes.unshift(op);
    this.set('caixa_turno', caixa);

    // Lança no financeiro como receita/aporte
    this.addLancamentoFinanceiro({
      loja_id: this.getLojas()[0]?.id || '11111111-1111-1111-1111-111111111111',
      tipo: 'RECEITA',
      valor,
      categoria: 'Suprimento de Caixa (Troco)',
      status_pagamento: 'PAGO',
      descricao: `Reforço de troco: ${motivo}`,
    });

    return op;
  }

  fecharCaixa(valorContado: number, observacao?: string): { diferenca: number; resumo: CaixaTurno } {
    const caixa = this.getCaixaTurno();
    const vendas = this.getVendas();
    const vendasDinheiro = vendas
      .filter((v) => v.status === 'CONCLUIDA' && v.forma_pagamento === 'DINHEIRO')
      .reduce((acc, v) => acc + v.valor_total, 0);

    const suprimentos = caixa.operacoes
      .filter((o) => o.tipo === 'SUPRIMENTO')
      .reduce((acc, o) => acc + o.valor, 0);

    const sangrias = caixa.operacoes
      .filter((o) => o.tipo === 'SANGRIA')
      .reduce((acc, o) => acc + o.valor, 0);

    const esperadoGaveta = caixa.fundo_inicial + vendasDinheiro + suprimentos - sangrias;
    const diferenca = valorContado - esperadoGaveta;

    const obsText = observacao ? ` • Obs: ${observacao}` : '';
    const opFechamento: OperacaoCaixa = {
      id: `op-fechamento-${Date.now()}`,
      tipo: 'FECHAMENTO',
      valor: valorContado,
      motivo: `Fechamento de turno. Esperado: R$ ${esperadoGaveta.toFixed(2)}. Diferença: R$ ${diferenca.toFixed(2)}${obsText}`,
      data_hora: new Date().toISOString(),
      operador_nome: caixa.operador_nome,
    };

    caixa.operacoes.unshift(opFechamento);
    caixa.aberto = false;
    this.set('caixa_turno', caixa);

    return { diferenca, resumo: caixa };
  }

  // Financeiro
  getFinanceiro(): FinanceiroLancamento[] {
    return this.get<FinanceiroLancamento[]>('financeiro', DEFAULT_FINANCEIRO);
  }

  addLancamentoFinanceiro(lancamento: Omit<FinanceiroLancamento, 'id' | 'tenant_id' | 'data_lancamento'>): FinanceiroLancamento {
    const lista = this.getFinanceiro();
    const novo: FinanceiroLancamento = {
      ...lancamento,
      id: crypto.randomUUID ? crypto.randomUUID() : `fin-${Date.now()}`,
      data_lancamento: new Date().toISOString(),
      tenant_id: DEFAULT_USER.tenant_id,
    };
    lista.unshift(novo);
    this.set('financeiro', lista);
    return novo;
  }

  // Analytics & Dashboard KPIs
  getDashboardAnalytics(lojaId?: string): DashboardAnalytics {
    const produtos = this.getProdutos();
    const vendas = this.getVendas();
    const financeiro = this.getFinanceiro();

    // Filtra vendas por loja se especificada
    const vendasFiltradas = lojaId ? vendas.filter((v) => v.loja_id === lojaId) : vendas;
    const faturamentoBruto = vendasFiltradas.reduce((acc, v) => acc + v.valor_total + v.desconto, 0) || 82300.0;
    const descontoTotal = vendasFiltradas.reduce((acc, v) => acc + v.desconto, 0) || 1240.0;
    const faturamentoLiquido = faturamentoBruto - descontoTotal;
    const countVendas = vendasFiltradas.length || 265;
    const ticketMedio = faturamentoLiquido / countVendas;

    // CMV estimado (aprox. 56% das vendas)
    const cmv = faturamentoLiquido * 0.562;
    const despesas = financeiro.filter((f) => f.tipo === 'DESPESA').reduce((acc, f) => acc + f.valor, 0);
    const lucroLiquido = faturamentoLiquido - cmv - despesas;
    const margemLucro = (lucroLiquido / faturamentoLiquido) * 100;

    let estoqueCritico = 0;
    let rupturas = 0;

    for (const p of produtos) {
      const stock = lojaId ? p.estoque_por_loja?.[lojaId] || 0 : p.estoque_total || 0;
      if (stock === 0) rupturas++;
      else if (p.estoque_minimo && stock <= p.estoque_minimo) estoqueCritico++;
    }

    return {
      ticket_medio: Math.round(ticketMedio * 100) / 100,
      faturamento_bruto: Math.round(faturamentoBruto * 100) / 100,
      faturamento_liquido: Math.round(faturamentoLiquido * 100) / 100,
      desconto_total: Math.round(descontoTotal * 100) / 100,
      cmv: Math.round(cmv * 100) / 100,
      lucro_liquido: Math.round(lucroLiquido * 100) / 100,
      margem_lucro: Math.round(margemLucro * 10) / 10,
      estoque_critico_count: estoqueCritico || 2,
      ruptura_count: rupturas || 1,
    };
  }

  getCurvaABC(): CurvaABCItem[] {
    const produtos = this.getProdutos();
    // Simula curva Pareto com base nos produtos
    const items: { p: Produto; faturamento: number }[] = produtos.map((p, idx) => {
      // Cria faturamentos ponderados
      const base = idx === 0 ? 35000 : idx === 1 ? 24000 : idx === 2 ? 12000 : idx === 3 ? 6000 : idx === 4 ? 2500 : 1200;
      return { p, faturamento: base };
    });

    const faturamentoTotal = items.reduce((acc, i) => acc + i.faturamento, 0);
    let acumulado = 0;

    return items.map(({ p, faturamento }) => {
      const percentual = (faturamento / faturamentoTotal) * 100;
      acumulado += percentual;
      let classe: 'A' | 'B' | 'C' = 'C';
      if (acumulado <= 80) classe = 'A';
      else if (acumulado <= 95) classe = 'B';

      return {
        produto_id: p.id,
        nome: p.nome,
        sku: p.sku,
        faturamento,
        percentual: Math.round(percentual * 10) / 10,
        percentual_acumulado: Math.min(100, Math.round(acumulado * 10) / 10),
        classe,
        giro_dias: classe === 'A' ? 12 : classe === 'B' ? 38 : 95,
        estoque_atual: p.estoque_total,
      };
    });
  }
}

export const storage = new StorageService();
