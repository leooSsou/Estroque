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

const DEFAULT_LOJAS: Loja[] = [];
const DEFAULT_USER: User | null = null;
const DEFAULT_FORNECEDORES: Fornecedor[] = [];
const DEFAULT_CLIENTES: Cliente[] = [];
const DEFAULT_PRODUTOS: Produto[] = [];
const DEFAULT_LEDGER: MovimentacaoEstoque[] = [];
const DEFAULT_TRANSFERENCIAS: TransferenciaEstoque[] = [];
const DEFAULT_FINANCEIRO: FinanceiroLancamento[] = [];

// Fixtures para testes unitários automatizados
export const DEMO_LOJAS: Loja[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nome: 'Loja Matriz',
    cnpj: '12.345.678/0001-90',
    endereco: 'Av. Principal, 1000 - Centro',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    nome: 'Filial 01',
    cnpj: '12.345.678/0002-71',
    endereco: 'Rua das Flores, 500 - Bairro',
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
];

export const DEMO_USER: User = {
  id: '33333333-3333-3333-3333-333333333333',
  nome: 'Administrador',
  email: 'admin@estroque.app',
  role: 'DONO',
  tenant_id: '00000000-0000-0000-0000-000000000001',
};

export const DEMO_CLIENTES: Cliente[] = [
  {
    id: '55555555-5555-5555-5555-555555555551',
    nome: 'Cliente Demonstração',
    email: 'cliente@teste.com',
    documento: '284.918.472-88',
    telefone: '(11) 98765-4321',
    limite_credito: 2000.0,
    saldo_devedor_crediario: 0.0,
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
  },
];

export const DEMO_PRODUTOS: Produto[] = [
  {
    id: '66666666-6666-6666-6666-666666666661',
    nome: 'Produto Teste A',
    sku: 'PRD-TEST-01',
    codigo_barras: '7891234560012',
    categoria: 'Geral',
    preco_custo: 50.0,
    markup: 100.0,
    preco_venda: 100.0,
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
    estoque_por_loja: {
      '11111111-1111-1111-1111-111111111111': 50,
      '22222222-2222-2222-2222-222222222222': 20,
    },
    estoque_total: 70,
    estoque_minimo: 10,
  },
  {
    id: '66666666-6666-6666-6666-666666666662',
    nome: 'Produto Teste B',
    sku: 'PRD-TEST-02',
    codigo_barras: '7891234560029',
    categoria: 'Geral',
    preco_custo: 25.0,
    markup: 100.0,
    preco_venda: 50.0,
    tenant_id: '00000000-0000-0000-0000-000000000001',
    ativo: true,
    estoque_por_loja: {
      '11111111-1111-1111-1111-111111111111': 30,
      '22222222-2222-2222-2222-222222222222': 10,
    },
    estoque_total: 40,
    estoque_minimo: 5,
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

  // Método auxiliar para testes automatizados
  seedDemoData(): void {
    this.set('user', DEMO_USER);
    this.set('lojas', DEMO_LOJAS);
    this.set('clientes', DEMO_CLIENTES);
    this.set('produtos', DEMO_PRODUTOS);
    this.set('ledger', []);
    this.set('transferencias', []);
    this.set('financeiro', []);
    this.set('vendas', []);
    this.set('vendas_espera', []);
    this.set('caixa_turno', {
      aberto: true,
      operador_nome: DEMO_USER.nome,
      data_abertura: new Date(Date.now() - 3600000 * 4).toISOString(),
      fundo_inicial: 200.0,
      operacoes: [
        {
          id: 'op-init-1',
          tipo: 'ABERTURA',
          valor: 200.0,
          motivo: 'Fundo de troco inicial do turno',
          data_hora: new Date(Date.now() - 3600000 * 4).toISOString(),
          operador_nome: DEMO_USER.nome,
        },
      ],
    });
  }

  // Auth & Lojas
  getUser(): User | null {
    return this.get<User | null>('user', DEFAULT_USER);
  }

  setUser(user: User | null): void {
    if (user) {
      this.set('user', user);
    } else {
      localStorage.removeItem(STORAGE_PREFIX + 'user');
    }
  }

  clearUser(): void {
    localStorage.removeItem(STORAGE_PREFIX + 'user');
  }

  getLojas(): Loja[] {
    return this.get<Loja[]>('lojas', DEFAULT_LOJAS);
  }

  addLoja(loja: Omit<Loja, 'id' | 'tenant_id'>): Loja {
    const lojas = this.getLojas();
    const user = this.getUser();
    const newLoja: Loja = {
      ...loja,
      id: crypto.randomUUID ? crypto.randomUUID() : `loja-${Date.now()}`,
      tenant_id: user?.tenant_id || '',
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
    const user = this.getUser();
    const id = crypto.randomUUID ? crypto.randomUUID() : `prod-${Date.now()}`;
    const estoquePorLoja: Record<string, number> = {};
    if (prod.loja_id && prod.estoque_inicial) {
      estoquePorLoja[prod.loja_id] = prod.estoque_inicial;
    }

    const newProd: Produto = {
      ...prod,
      id,
      tenant_id: user?.tenant_id || '',
      estoque_por_loja: estoquePorLoja,
      estoque_total: prod.estoque_inicial || 0,
      estoque_minimo: prod.estoque_minimo || 5,
    };

    produtos.push(newProd);
    this.set('produtos', produtos);

    // Registra no ledger se houver estoque inicial
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
    const user = this.getUser();
    const newEntry: MovimentacaoEstoque = {
      id: crypto.randomUUID ? crypto.randomUUID() : `mov-${Date.now()}`,
      loja_id: mov.loja_id,
      produto_id: mov.produto_id,
      tipo: mov.tipo,
      quantidade: mov.quantidade,
      motivo: mov.motivo,
      tenant_id: user?.tenant_id || '',
      data_movimentacao: new Date().toISOString(),
      responsavel: user?.nome || 'Operador',
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
    const user = this.getUser();
    const newCliente: Cliente = {
      ...cliente,
      id: crypto.randomUUID ? crypto.randomUUID() : `cli-${Date.now()}`,
      saldo_devedor_crediario: 0,
      tenant_id: user?.tenant_id || '',
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
    const user = this.getUser();
    const newFornecedor: Fornecedor = {
      ...fornecedor,
      id: crypto.randomUUID ? crypto.randomUUID() : `forn-${Date.now()}`,
      tenant_id: user?.tenant_id || '',
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
    const user = this.getUser();
    const newTransfer: TransferenciaEstoque = {
      id: crypto.randomUUID ? crypto.randomUUID() : `trf-${Date.now()}`,
      tenant_id: user?.tenant_id || '',
      loja_origem_id: dados.loja_origem_id,
      loja_destino_id: dados.loja_destino_id,
      produto_id: dados.produto_id,
      quantidade: dados.quantidade,
      status: 'SOLICITADO',
      solicitado_por_id: user?.id || '',
      criado_em: new Date().toISOString(),
    };
    transferencias.unshift(newTransfer);
    this.set('transferencias', transferencias);
    return newTransfer;
  }

  despacharTransferencia(id: string): TransferenciaEstoque {
    const transferencias = this.getTransferencias();
    const index = transferencias.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Transferência não encontrada.');

    const t = transferencias[index];
    if (t.status !== 'SOLICITADO') throw new Error('Status inválido para despacho.');

    // Baixa do estoque de origem
    this.addMovimentacao({
      loja_id: t.loja_origem_id,
      produto_id: t.produto_id,
      tipo: 'SAIDA',
      quantidade: t.quantidade,
      motivo: `Despacho de Transferência #${t.id.slice(0, 8)}`,
    });

    t.status = 'DESPACHADO';
    transferencias[index] = t;
    this.set('transferencias', transferencias);
    return t;
  }

  receberTransferencia(id: string, quantidadeRecebida: number, justificativa?: string): TransferenciaEstoque {
    const transferencias = this.getTransferencias();
    const index = transferencias.findIndex((t) => t.id === id);
    if (index === -1) throw new Error('Transferência não encontrada.');

    const t = transferencias[index];
    if (t.status !== 'DESPACHADO') throw new Error('Transferência não está em trânsito.');

    this.addMovimentacao({
      loja_id: t.loja_destino_id,
      produto_id: t.produto_id,
      tipo: 'ENTRADA',
      quantidade: quantidadeRecebida,
      motivo: `Recebimento de Transferência #${t.id.slice(0, 8)}${justificativa ? ` (${justificativa})` : ''}`,
    });

    t.status = 'RECEBIDO';
    t.quantidade_recebida = quantidadeRecebida;
    t.justificativa = justificativa;

    transferencias[index] = t;
    this.set('transferencias', transferencias);
    return t;
  }

  // Vendas
  getVendas(lojaId?: string, dataInicio?: string, dataFim?: string): Venda[] {
    let vendas = this.get<Venda[]>('vendas', []);
    if (lojaId) {
      vendas = vendas.filter((v) => v.loja_id === lojaId);
    }
    if (dataInicio) {
      const dInicio = new Date(dataInicio).getTime();
      vendas = vendas.filter((v) => new Date(v.data_venda).getTime() >= dInicio);
    }
    if (dataFim) {
      const dFim = new Date(dataFim).getTime();
      vendas = vendas.filter((v) => new Date(v.data_venda).getTime() <= dFim);
    }
    return vendas;
  }

  registrarVenda(dados: {
    loja_id: string;
    cliente_id?: string | null;
    forma_pagamento: 'DINHEIRO' | 'PIX' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'CREDIARIO';
    desconto?: number;
    itens: {
      produto_id: string;
      produto_nome?: string;
      sku?: string;
      quantidade: number;
      preco_unitario: number;
    }[];
  }): Venda {
    const vendas = this.getVendas();
    const subtotal = dados.itens.reduce((acc, i) => acc + i.quantidade * i.preco_unitario, 0);
    const desconto = dados.desconto || 0;
    const valorTotal = Math.max(0, subtotal - desconto);

    // 1. Baixa no estoque
    for (const item of dados.itens) {
      this.addMovimentacao({
        loja_id: dados.loja_id,
        produto_id: item.produto_id,
        tipo: 'SAIDA',
        quantidade: item.quantidade,
        motivo: 'Venda Balcão PDV',
      });
    }

    // 2. Se for crediário, valida limite e atualiza saldo devedor do cliente
    let clienteObj: Cliente | null = null;
    if (dados.forma_pagamento === 'CREDIARIO') {
      if (!dados.cliente_id) {
        throw new Error('Venda no crediário exige identificação do cliente.');
      }
      const clientes = this.getClientes();
      const cliIndex = clientes.findIndex((c) => c.id === dados.cliente_id);
      if (cliIndex === -1) throw new Error('Cliente não encontrado.');

      clienteObj = clientes[cliIndex];
      const limiteDisponivel = clienteObj.limite_credito - clienteObj.saldo_devedor_crediario;
      if (valorTotal > limiteDisponivel) {
        throw new Error(
          `Limite de crediário insuficiente. Disponível: R$ ${limiteDisponivel.toFixed(2)}, Necessário: R$ ${valorTotal.toFixed(2)}`
        );
      }

      clientes[cliIndex].saldo_devedor_crediario += valorTotal;
      this.set('clientes', clientes);
    }

    const user = this.getUser();
    const novaVenda: Venda = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ven-${Date.now()}`,
      loja_id: dados.loja_id,
      cliente_id: dados.cliente_id,
      cliente_nome: clienteObj?.nome,
      usuario_id: user?.id || '',
      status: 'CONCLUIDA',
      forma_pagamento: dados.forma_pagamento,
      valor_total: valorTotal,
      desconto,
      data_venda: new Date().toISOString(),
      tenant_id: user?.tenant_id || '',
      itens: dados.itens.map((i) => ({
        id: crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`,
        produto_id: i.produto_id,
        produto_nome: i.produto_nome || '',
        sku: i.sku || '',
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
        tenant_id: user?.tenant_id || '',
      })),
    };

    vendas.unshift(novaVenda);
    this.set('vendas', vendas);

    // Registra lançamento financeiro de receita da venda
    this.addLancamentoFinanceiro({
      loja_id: dados.loja_id,
      tipo: 'RECEITA',
      valor: valorTotal,
      categoria: `Venda PDV #${novaVenda.id.slice(0, 8)} (${dados.forma_pagamento})`,
      status_pagamento: dados.forma_pagamento === 'CREDIARIO' ? 'PENDENTE' : 'PAGO',
      data_pagamento: dados.forma_pagamento === 'CREDIARIO' ? undefined : new Date().toISOString(),
      descricao: `Venda balcão - ${dados.itens.length} itens`,
    });

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

    // 3. Lança compensação financeira
    this.addLancamentoFinanceiro({
      loja_id: venda.loja_id,
      tipo: 'DESPESA',
      valor: venda.valor_total,
      categoria: 'Estorno de Venda PDV',
      status_pagamento: 'PAGO',
      descricao: `Devolução / Cancelamento de venda PDV`,
    });

    venda.status = 'CANCELADA';
    vendas[index] = venda;
    this.set('vendas', vendas);
    return venda;
  }

  // Vendas em Espera (Hold Queue)
  getVendasEspera(): VendaEmEspera[] {
    return this.get<VendaEmEspera[]>('vendas_espera', []);
  }

  salvarVendaEspera(dados: Omit<VendaEmEspera, 'id' | 'codigo' | 'criado_em'>): VendaEmEspera {
    const lista = this.getVendasEspera();
    const seq = String(lista.length + 1).padStart(3, '0');
    const hold: VendaEmEspera = {
      ...dados,
      id: crypto.randomUUID ? crypto.randomUUID() : `hold-${Date.now()}`,
      codigo: `ESP-${seq}`,
      criado_em: new Date().toISOString(),
    };
    lista.unshift(hold);
    this.set('vendas_espera', lista);
    return hold;
  }

  removerVendaEspera(id: string): void {
    let lista = this.getVendasEspera();
    lista = lista.filter((h) => h.id !== id);
    this.set('vendas_espera', lista);
  }

  // Operações de Caixa (Turno)
  getCaixaTurno(): CaixaTurno {
    const user = this.getUser();
    return this.get<CaixaTurno>('caixa_turno', {
      aberto: false,
      operador_nome: user?.nome || 'Operador',
      data_abertura: new Date().toISOString(),
      fundo_inicial: 0.0,
      operacoes: [],
    });
  }

  abrirCaixa(fundoInicial: number): CaixaTurno {
    const user = this.getUser();
    const novoTurno: CaixaTurno = {
      aberto: true,
      operador_nome: user?.nome || 'Operador',
      data_abertura: new Date().toISOString(),
      fundo_inicial: fundoInicial,
      operacoes: [
        {
          id: `op-${Date.now()}`,
          tipo: 'ABERTURA',
          valor: fundoInicial,
          motivo: 'Abertura de caixa e fundo de troco inicial',
          data_hora: new Date().toISOString(),
          operador_nome: user?.nome || 'Operador',
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

    const lojas = this.getLojas();
    if (lojas.length > 0) {
      this.addLancamentoFinanceiro({
        loja_id: lojas[0].id,
        tipo: 'DESPESA',
        valor,
        categoria: 'Sangria de Caixa (Cofre)',
        status_pagamento: 'PAGO',
        descricao: `Sangria de caixa: ${motivo}`,
      });
    }

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

    const lojas = this.getLojas();
    if (lojas.length > 0) {
      this.addLancamentoFinanceiro({
        loja_id: lojas[0].id,
        tipo: 'RECEITA',
        valor,
        categoria: 'Suprimento de Caixa (Troco)',
        status_pagamento: 'PAGO',
        descricao: `Reforço de troco: ${motivo}`,
      });
    }

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

    const saldoEsperado = caixa.fundo_inicial + vendasDinheiro + suprimentos - sangrias;
    const diferenca = valorContado - saldoEsperado;

    const opFechamento: OperacaoCaixa = {
      id: `op-fechamento-${Date.now()}`,
      tipo: 'FECHAMENTO',
      valor: valorContado,
      motivo: `Fechamento de caixa. Saldo esperado: R$ ${saldoEsperado.toFixed(2)}. Diferença: R$ ${diferenca.toFixed(2)}${
        observacao ? ` - ${observacao}` : ''
      }`,
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
    const user = this.getUser();
    const novo: FinanceiroLancamento = {
      ...lancamento,
      id: crypto.randomUUID ? crypto.randomUUID() : `fin-${Date.now()}`,
      data_lancamento: new Date().toISOString(),
      tenant_id: user?.tenant_id || '',
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
    const faturamentoBruto = vendasFiltradas.reduce((acc, v) => acc + v.valor_total + (v.desconto || 0), 0);
    const descontoTotal = vendasFiltradas.reduce((acc, v) => acc + (v.desconto || 0), 0);
    const faturamentoLiquido = faturamentoBruto - descontoTotal;
    const countVendas = vendasFiltradas.length;
    const ticketMedio = countVendas > 0 ? faturamentoLiquido / countVendas : 0;

    // CMV estimado (aprox. 56% das vendas)
    const cmv = faturamentoLiquido * 0.562;
    const despesas = financeiro.filter((f) => f.tipo === 'DESPESA').reduce((acc, f) => acc + f.valor, 0);
    const lucroLiquido = faturamentoLiquido - cmv - despesas;
    const margemLucro = faturamentoLiquido > 0 ? (lucroLiquido / faturamentoLiquido) * 100 : 0;

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
      estoque_critico_count: estoqueCritico,
      ruptura_count: rupturas,
    };
  }

  getCurvaABC(): CurvaABCItem[] {
    const produtos = this.getProdutos();
    if (produtos.length === 0) return [];

    const items: { p: Produto; faturamento: number }[] = produtos.map((p) => {
      return { p, faturamento: p.preco_venda * (p.estoque_total || 1) };
    });

    const faturamentoTotal = items.reduce((acc, i) => acc + i.faturamento, 0);
    if (faturamentoTotal <= 0) return [];

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
