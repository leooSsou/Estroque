import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../services/api';
import {
  Produto,
  Cliente,
  FormaPagamento,
  Venda,
  VendaEmEspera,
  CaixaTurno,
} from '../types';
import { BentoCard } from '../components/common/BentoCard';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  ShoppingCart,
  Search,
  Barcode,
  CreditCard,
  Banknote,
  QrCode,
  CalendarClock,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Plus,
  Minus,
  Printer,
  X,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Clock,
  Lock,
  Unlock,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
  FileText,
} from 'lucide-react';

interface CartItem {
  produto: Produto;
  quantidade: number;
  preco_unitario: number;
}

type PDVTab = 'CAIXA' | 'ESPERA' | 'HISTORICO' | 'OPERACAO_CAIXA';

export const PDVVendas: React.FC = () => {
  const { activeLoja } = useAuth();
  const { toast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState<PDVTab>('CAIXA');

  // Core Data
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendasHistorico, setVendasHistorico] = useState<Venda[]>([]);
  const [vendasEspera, setVendasEspera] = useState<VendaEmEspera[]>([]);
  const [caixaTurno, setCaixaTurno] = useState<CaixaTurno | null>(null);

  // Tab 1 (Caixa Ativo) States
  const [search, setSearch] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [desconto, setDesconto] = useState(0);
  const [valorRecebido, setValorRecebido] = useState<number | ''>('');
  const [catalogFilter, setCatalogFilter] = useState<'TODOS' | 'DISPONIVEL' | 'ESGOTADO'>('TODOS');

  // Pause / Hold Sale Modal State
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseObservacao, setPauseObservacao] = useState('');

  // Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Venda | null>(null);

  // Estorno Modal State (Tab 3)
  const [estornoModalOpen, setEstornoModalOpen] = useState(false);
  const [vendaParaEstorno, setVendaParaEstorno] = useState<Venda | null>(null);
  const [searchHistorico, setSearchHistorico] = useState('');
  const [statusFilterHistorico, setStatusFilterHistorico] = useState<'TODAS' | 'CONCLUIDA' | 'CANCELADA'>('TODAS');

  // Cash Operations Modals (Tab 4)
  const [sangriaModalOpen, setSangriaModalOpen] = useState(false);
  const [sangriaValor, setSangriaValor] = useState<number | ''>('');
  const [sangriaMotivo, setSangriaMotivo] = useState('');

  const [suprimentoModalOpen, setSuprimentoModalOpen] = useState(false);
  const [suprimentoValor, setSuprimentoValor] = useState<number | ''>('');
  const [suprimentoMotivo, setSuprimentoMotivo] = useState('');

  const [fechamentoModalOpen, setFechamentoModalOpen] = useState(false);
  const [saldoContado, setSaldoContado] = useState<number | ''>('');
  const [fechamentoObservacao, setFechamentoObservacao] = useState('');

  const [aberturaModalOpen, setAberturaModalOpen] = useState(false);
  const [aberturaFundo, setAberturaFundo] = useState<number | ''>(200);

  // Load all initial data
  const loadInitialData = async () => {
    try {
      const [prods, clis, vends, esp, turno] = await Promise.all([
        api.getProdutos(activeLoja?.id),
        api.getClientes(),
        api.getVendas(),
        api.getVendasEspera(),
        api.getCaixaTurno(),
      ]);
      setProdutos(prods);
      setClientes(clis);
      setVendasHistorico(vends);
      setVendasEspera(esp);
      setCaixaTurno(turno);
    } catch {
      toast.error('Erro ao carregar dados do PDV.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [activeLoja]);

  // Selected customer & credit calculation
  const selectedCliente = clientes.find((c) => c.id === selectedClienteId);
  const limiteDisponivel = selectedCliente
    ? Math.max(0, selectedCliente.limite_credito - selectedCliente.saldo_devedor_crediario)
    : 0;

  // Cart calculations
  const subtotal = cart.reduce((acc, item) => acc + item.quantidade * item.preco_unitario, 0);
  const valorTotal = Math.max(0, subtotal - desconto);

  // Dinheiro Change calculations
  const numValorRecebido = typeof valorRecebido === 'number' ? valorRecebido : 0;
  const troco = formaPagamento === 'DINHEIRO' && numValorRecebido > valorTotal ? numValorRecebido - valorTotal : 0;
  const dinheiroInsuficiente =
    formaPagamento === 'DINHEIRO' && typeof valorRecebido === 'number' && valorRecebido > 0 && valorRecebido < valorTotal;

  // Credit limit validation check
  const crediarioExcedido =
    formaPagamento === 'CREDIARIO' && (!selectedCliente || valorTotal > limiteDisponivel);

  // Add item to cart
  const handleAddToCart = (prod: Produto) => {
    const stock = activeLoja?.id ? prod.estoque_por_loja?.[activeLoja.id] ?? 0 : prod.estoque_total ?? 0;
    if (stock <= 0) {
      toast.error(`Produto "${prod.nome}" sem estoque disponível na loja!`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.produto.id === prod.id);
      if (existing) {
        if (existing.quantidade + 1 > stock) {
          toast.warning(`Limite de estoque atingido (${stock} un).`);
          return prev;
        }
        return prev.map((item) =>
          item.produto.id === prod.id
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }
      return [...prev, { produto: prod, quantidade: 1, preco_unitario: prod.preco_venda }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.produto.id === id) {
            const newQty = item.quantidade + delta;
            return newQty > 0 ? { ...item, quantidade: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Finalize Sale
  const handleFinalizeSale = async () => {
    if (cart.length === 0) {
      toast.error('O carrinho de compras está vazio.');
      return;
    }

    if (formaPagamento === 'CREDIARIO') {
      if (!selectedCliente) {
        toast.error('Selecione um cliente para prosseguir com venda no Crediário.');
        return;
      }
      if (crediarioExcedido) {
        toast.error('Limite de crediário do cliente excedido! Venda bloqueada.');
        return;
      }
    }

    if (formaPagamento === 'DINHEIRO' && typeof valorRecebido === 'number' && valorRecebido < valorTotal) {
      toast.error('Valor recebido em dinheiro é inferior ao total da venda!');
      return;
    }

    try {
      const sale = await api.registrarVenda({
        loja_id: activeLoja?.id || '11111111-1111-1111-1111-111111111111',
        cliente_id: selectedClienteId || null,
        forma_pagamento: formaPagamento,
        desconto,
        itens: cart.map((c) => ({
          produto_id: c.produto.id,
          produto_nome: c.produto.nome,
          sku: c.produto.sku,
          quantidade: c.quantidade,
          preco_unitario: c.preco_unitario,
        })),
      });

      setReceiptSale(sale);
      setReceiptModalOpen(true);
      setCart([]);
      setDesconto(0);
      setValorRecebido('');
      toast.success('Venda concluída com sucesso! Baixa no estoque efetuada.');

      // Refresh data
      loadInitialData();
    } catch {
      toast.error('Erro ao registrar venda.');
    }
  };

  // Hold / Pause Sale Flow
  const handleConfirmPauseSale = async () => {
    if (cart.length === 0) {
      toast.error('Não há itens no carrinho para pausar.');
      return;
    }

    try {
      const paused = await api.salvarVendaEspera({
        cliente_id: selectedClienteId || null,
        cliente_nome: selectedCliente?.nome || 'Consumidor Final',
        itens: cart.map((c) => ({
          produto: c.produto,
          quantidade: c.quantidade,
          preco_unitario: c.preco_unitario,
        })),
        desconto,
        forma_pagamento: formaPagamento,
        valor_total: valorTotal,
        observacao: pauseObservacao || undefined,
      });

      setCart([]);
      setDesconto(0);
      setValorRecebido('');
      setSelectedClienteId('');
      setPauseObservacao('');
      setPauseModalOpen(false);

      const updated = await api.getVendasEspera();
      setVendasEspera(updated);
      toast.success(`Venda colocada em espera [${paused.codigo}]!`);
    } catch {
      toast.error('Erro ao colocar venda em espera.');
    }
  };

  // Resume Sale from Hold (Tab 2 -> Tab 1)
  const handleRetomarVendaEspera = async (espera: VendaEmEspera) => {
    if (cart.length > 0) {
      const confirmar = window.confirm(
        'O carrinho atual contém itens. Deseja substituir pelo pedido em espera?'
      );
      if (!confirmar) return;
    }

    // Load into cart
    setCart(
      espera.itens.map((i) => ({
        produto: i.produto,
        quantidade: i.quantidade,
        preco_unitario: i.preco_unitario,
      }))
    );
    setSelectedClienteId(espera.cliente_id || '');
    setFormaPagamento(espera.forma_pagamento || 'PIX');
    setDesconto(espera.desconto || 0);

    // Remove from hold
    await api.removerVendaEspera(espera.id);
    const updated = await api.getVendasEspera();
    setVendasEspera(updated);

    setActiveTab('CAIXA');
    toast.success(`Venda [${espera.codigo}] retomada no caixa com sucesso!`);
  };

  // Discard Sale from Hold
  const handleDescartarVendaEspera = async (id: string, codigo: string) => {
    const confirmar = window.confirm(`Deseja realmente descartar a venda em espera [${codigo}]?`);
    if (!confirmar) return;

    await api.removerVendaEspera(id);
    const updated = await api.getVendasEspera();
    setVendasEspera(updated);
    toast.info(`Venda [${codigo}] descartada.`);
  };

  // Estornar Venda (Tab 3)
  const handleConfirmarEstorno = async () => {
    if (!vendaParaEstorno) return;

    try {
      await api.estornarVenda(vendaParaEstorno.id);
      toast.success('Venda estornada com sucesso! Estoque devolvido e lançamentos compensados.');
      setEstornoModalOpen(false);
      setVendaParaEstorno(null);
      loadInitialData();
    } catch {
      toast.error('Erro ao estornar venda.');
    }
  };

  // Operações de Caixa (Tab 4)
  const handleRegistrarSangria = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = typeof sangriaValor === 'number' ? sangriaValor : parseFloat(String(sangriaValor));
    if (!val || val <= 0) {
      toast.error('Informe um valor válido para a sangria.');
      return;
    }
    if (!sangriaMotivo.trim()) {
      toast.error('Informe a justificativa da sangria.');
      return;
    }

    try {
      await api.registrarSangria(val, sangriaMotivo);
      toast.success(`Sangria de R$ ${val.toFixed(2)} registrada no turno.`);
      setSangriaModalOpen(false);
      setSangriaValor('');
      setSangriaMotivo('');
      loadInitialData();
    } catch {
      toast.error('Erro ao registrar sangria.');
    }
  };

  const handleRegistrarSuprimento = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = typeof suprimentoValor === 'number' ? suprimentoValor : parseFloat(String(suprimentoValor));
    if (!val || val <= 0) {
      toast.error('Informe um valor válido para o suprimento.');
      return;
    }
    if (!suprimentoMotivo.trim()) {
      toast.error('Informe a justificativa do suprimento.');
      return;
    }

    try {
      await api.registrarSuprimento(val, suprimentoMotivo);
      toast.success(`Suprimento de R$ ${val.toFixed(2)} registrado no turno.`);
      setSuprimentoModalOpen(false);
      setSuprimentoValor('');
      setSuprimentoMotivo('');
      loadInitialData();
    } catch {
      toast.error('Erro ao registrar suprimento.');
    }
  };

  const handleFecharTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    const contado = typeof saldoContado === 'number' ? saldoContado : parseFloat(String(saldoContado));
    if (isNaN(contado) || contado < 0) {
      toast.error('Informe o valor físico contado na gaveta.');
      return;
    }

    try {
      await api.fecharCaixa(contado, fechamentoObservacao);
      toast.success('Turno de caixa encerrado com sucesso!');
      setFechamentoModalOpen(false);
      setSaldoContado('');
      setFechamentoObservacao('');
      loadInitialData();
    } catch {
      toast.error('Erro ao fechar o caixa.');
    }
  };

  const handleAbrirTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    const fundo = typeof aberturaFundo === 'number' ? aberturaFundo : parseFloat(String(aberturaFundo));
    if (isNaN(fundo) || fundo < 0) {
      toast.error('Informe o valor do fundo inicial de troco.');
      return;
    }

    try {
      await api.abrirCaixa(fundo);
      toast.success('Novo turno de caixa aberto com sucesso!');
      setAberturaModalOpen(false);
      loadInitialData();
    } catch {
      toast.error('Erro ao abrir turno.');
    }
  };

  // Filter Catalog
  const counts = useMemo(() => {
    let disponivel = 0;
    let esgotado = 0;
    for (const p of produtos) {
      const stock = activeLoja?.id
        ? p.estoque_por_loja?.[activeLoja.id] ?? 0
        : p.estoque_total ?? 0;
      if (stock > 0) disponivel++;
      else esgotado++;
    }
    return {
      todos: produtos.length,
      disponivel,
      esgotado,
    };
  }, [produtos, activeLoja]);

  const filteredProdutos = useMemo(() => {
    return produtos.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        p.nome.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.codigo_barras && p.codigo_barras.includes(q));

      const stock = activeLoja?.id
        ? p.estoque_por_loja?.[activeLoja.id] ?? 0
        : p.estoque_total ?? 0;

      if (catalogFilter === 'DISPONIVEL') return matchSearch && stock > 0;
      if (catalogFilter === 'ESGOTADO') return matchSearch && stock === 0;
      return matchSearch;
    });
  }, [produtos, search, catalogFilter, activeLoja]);

  // Filter Sales History (Tab 3)
  const filteredHistorico = useMemo(() => {
    return vendasHistorico.filter((v) => {
      const q = searchHistorico.toLowerCase();
      const matchSearch =
        v.id.toLowerCase().includes(q) ||
        (v.cliente_nome && v.cliente_nome.toLowerCase().includes(q)) ||
        v.forma_pagamento.toLowerCase().includes(q);

      if (statusFilterHistorico === 'CONCLUIDA' && v.status !== 'CONCLUIDA') return false;
      if (statusFilterHistorico === 'CANCELADA' && v.status !== 'CANCELADA') return false;
      return matchSearch;
    });
  }, [vendasHistorico, searchHistorico, statusFilterHistorico]);

  // Drawer calculations for Tab 4
  const drawerStats = useMemo(() => {
    const fundo = caixaTurno?.fundo_inicial || 0;
    let vendasDinheiro = 0;
    let vendasOutras = 0;

    for (const v of vendasHistorico) {
      if (v.status === 'CONCLUIDA') {
        if (v.forma_pagamento === 'DINHEIRO') {
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
  }, [caixaTurno, vendasHistorico]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#F3FBF6] tracking-tight">
            Ponto de Venda (PDV)
          </h1>
          <p className="text-xs text-[#8EB69B] mt-0.5">
            Loja: <strong className="text-[#DAF1DE]">{activeLoja?.nome || 'Matriz'}</strong> • Operador: <strong className="text-[#DAF1DE]">{caixaTurno?.operador_nome || 'Operador'}</strong>
          </p>
        </div>

        {/* Status Pill of Cash Shift */}
        <div className="flex items-center gap-2">
          {caixaTurno?.aberto ? (
            <Badge variant="mint">
              <Unlock className="w-3.5 h-3.5 mr-1 inline" /> Caixa Aberto
            </Badge>
          ) : (
            <Badge variant="danger">
              <Lock className="w-3.5 h-3.5 mr-1 inline" /> Caixa Fechado
            </Badge>
          )}
        </div>
      </div>

      {/* 4-Tab Segmented Control Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark overflow-x-auto table-scrollbar">
        {[
          { id: 'CAIXA', label: 'Frente de Caixa', icon: ShoppingCart, count: cart.reduce((a, b) => a + b.quantidade, 0) },
          { id: 'ESPERA', label: 'Vendas em Espera', icon: PauseCircle, count: vendasEspera.length },
          { id: 'HISTORICO', label: 'Histórico do Turno', icon: FileText, count: vendasHistorico.length },
          { id: 'OPERACAO_CAIXA', label: 'Operações de Caixa', icon: Wallet, count: caixaTurno?.operacoes?.length || 0 },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PDVTab)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2.5 whitespace-nowrap active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-[#070E0D] font-bold shadow-glow-emerald scale-[1.02]'
                  : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] border border-transparent hover:border-[rgba(142,182,155,0.18)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && tab.count > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold transition-all ${
                    isActive
                      ? 'bg-[#070E0D]/30 text-[#070E0D]'
                      : 'bg-[#142522] text-[#8EB69B] border border-[rgba(142,182,155,0.12)]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FRENTE DE CAIXA (ACTIVE POS)                                       */}
      {/* ========================================================================= */}
      {activeTab === 'CAIXA' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 65%: Product Selection & Scanner */}
          <div className="lg:col-span-7 space-y-4">
            {/* Barcode Scanner & Search Bar */}
            <div className="p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark space-y-3">
              <div className="relative group">
                <Barcode className="w-5 h-5 text-[#8EB69B] group-focus-within:text-[#10B981] absolute left-4 top-3.5 transition-colors duration-200 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Bipar leitor de código de barras ou pesquisar item..."
                  className="w-full pl-12 pr-10 py-3 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-sm font-medium text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25 focus:outline-none transition-all duration-200 shadow-inner"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3.5 top-3.5 text-[#8EB69B] hover:text-[#F3FBF6] p-0.5 rounded-full hover:bg-[rgba(142,182,155,0.15)] transition-all active:scale-90"
                    title="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Filter Pills */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] overflow-x-auto table-scrollbar shadow-inner">
                {[
                  { id: 'TODOS', label: 'Todos os Itens', count: counts.todos },
                  { id: 'DISPONIVEL', label: 'Em Estoque', count: counts.disponivel },
                  { id: 'ESGOTADO', label: 'Esgotados', count: counts.esgotado },
                ].map((pill) => {
                  const isActive = catalogFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      onClick={() => setCatalogFilter(pill.id as any)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap active:scale-95 ${
                        isActive
                          ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-[#070E0D] shadow-glow-emerald font-bold scale-[1.02]'
                          : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522] border border-transparent hover:border-[rgba(142,182,155,0.18)]'
                      }`}
                    >
                      <span>{pill.label}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[11px] font-mono font-bold transition-all ${
                          isActive
                            ? 'bg-[#070E0D]/30 text-[#070E0D]'
                            : 'bg-[#142522] text-[#8EB69B]'
                        }`}
                      >
                        {pill.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProdutos.map((prod) => {
                const stock = activeLoja?.id
                  ? prod.estoque_por_loja?.[activeLoja.id] ?? 0
                  : prod.estoque_total ?? 0;

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleAddToCart(prod)}
                    className={`bg-[#0D1917] border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-250 hover:border-[#10B981]/50 group btn-press hover-lift ${
                      stock === 0
                        ? 'opacity-40 border-red-500/20 pointer-events-none'
                        : 'border-[rgba(142,182,155,0.18)] hover:bg-[#142522]/50 hover:shadow-glow-emerald'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#A2B89B] mb-1.5 font-mono">
                        <span>{prod.sku}</span>
                        <span className={stock === 0 ? 'text-red-400 font-extrabold' : 'text-[#DAF1DE] font-semibold'}>
                          {stock} un
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-[#F3FBF6] line-clamp-2 mb-2.5 group-hover:text-[#10B981] transition-colors">
                        {prod.nome}
                      </h4>
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-[rgba(142,182,155,0.1)]">
                      <span className="text-base font-extrabold text-[#10B981] font-mono">
                        R$ {prod.preco_venda.toFixed(2)}
                      </span>
                      <button className="w-8 h-8 rounded-xl bg-[#142522] group-hover:bg-[#10B981] group-hover:text-[#070E0D] flex items-center justify-center text-[#DAF1DE] transition-transform group-hover:scale-110">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 35%: Active Cart & Checkout */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#0D1917] border border-[rgba(142,182,155,0.18)] rounded-3xl p-5 shadow-bento-dark space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-[rgba(142,182,155,0.12)]">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#10B981]" />
                  <h3 className="text-base font-bold text-[#F3FBF6]">Carrinho de Venda</h3>
                </div>
                <div className="flex items-center gap-2">
                  {cart.length > 0 && (
                    <button
                      onClick={() => setPauseModalOpen(true)}
                      className="px-3 py-1 rounded-xl bg-[#142522] hover:bg-[#1B332E] text-amber-400 hover:text-amber-300 text-xs font-bold border border-amber-400/30 flex items-center gap-1.5 transition-all active:scale-95"
                      title="Pausar esta venda e liberar o caixa"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Pausar Venda</span>
                    </button>
                  )}
                  <span className="text-xs text-[#DAF1DE] font-mono font-bold bg-[#142522] px-2.5 py-1 rounded-full border border-[rgba(142,182,155,0.2)]">
                    {cart.reduce((a, b) => a + b.quantidade, 0)} itens
                  </span>
                </div>
              </div>

              {/* Customer Selector & Credit Limit Widget */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.14)]">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#DAF1DE]">
                  <UserCheck className="w-4 h-4 text-[#10B981]" />
                  <span>Cliente / Titular do Crediário</span>
                </label>
                <select
                  value={selectedClienteId}
                  onChange={(e) => setSelectedClienteId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0D1917] border border-[rgba(142,182,155,0.2)] text-sm text-[#F3FBF6] focus:border-[#10B981] focus:outline-none font-medium"
                >
                  <option value="">Consumidor Final (Sem Crediário)</option>
                  {clientes.map((cli) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.nome} ({cli.documento})
                    </option>
                  ))}
                </select>

                {selectedCliente && (
                  <div className="pt-2 border-t border-[rgba(142,182,155,0.1)] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[#A2B89B] font-medium">Limite Disponível:</span>
                      <div
                        className={`font-mono font-extrabold text-sm ${
                          limiteDisponivel <= 0 ? 'text-red-400' : 'text-[#10B981]'
                        }`}
                      >
                        R$ {limiteDisponivel.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[#A2B89B] font-medium">Limite Total:</span>
                      <div className="font-mono text-sm font-bold text-[#DAF1DE]">
                        R$ {selectedCliente.limite_credito.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Items List */}
              <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1 divide-y divide-[rgba(142,182,155,0.08)] table-scrollbar">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-sm text-[#5E756B]">
                    Nenhum item adicionado ao carrinho ainda.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.produto.id} className="pt-2.5 flex items-center justify-between gap-3">
                      <div className="truncate flex-1">
                        <div className="text-sm font-bold text-[#F3FBF6] truncate">
                          {item.produto.nome}
                        </div>
                        <div className="text-xs text-[#A2B89B] font-mono mt-0.5">
                          R$ {item.preco_unitario.toFixed(2)} un
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(item.produto.id, -1)}
                          className="w-8 h-8 rounded-xl bg-[#142522] hover:bg-[#163832] flex items-center justify-center text-[#F3FBF6] border border-[rgba(142,182,155,0.2)] btn-press"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm font-mono font-extrabold text-[#F3FBF6]">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.produto.id, 1)}
                          className="w-8 h-8 rounded-xl bg-[#142522] hover:bg-[#163832] flex items-center justify-center text-[#10B981] border border-[rgba(142,182,155,0.2)] btn-press"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <span className="w-20 text-right font-mono font-extrabold text-sm md:text-base text-[#10B981]">
                          R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Payment Methods Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-[#DAF1DE]">Forma de Pagamento</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-bold">
                  {[
                    { id: 'PIX', label: 'PIX', icon: QrCode },
                    { id: 'CARTAO_CREDITO', label: 'Crédito', icon: CreditCard },
                    { id: 'CARTAO_DEBITO', label: 'Débito', icon: CreditCard },
                    { id: 'DINHEIRO', label: 'Dinheiro', icon: Banknote },
                    { id: 'CREDIARIO', label: 'Crediário', icon: CalendarClock },
                  ].map((pm) => {
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setFormaPagamento(pm.id as FormaPagamento)}
                        className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs font-bold btn-press ${
                          formaPagamento === pm.id
                            ? 'bg-[#10B981] text-[#070E0D] shadow-glow-emerald'
                            : 'bg-[#070E0D] text-[#DAF1DE] border border-[rgba(142,182,155,0.18)] hover:bg-[#142522]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dinheiro Change Calculator */}
              {formaPagamento === 'DINHEIRO' && (
                <div className="p-3.5 rounded-2xl bg-[#070E0D] border border-amber-400/25 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-amber-400" />
                      <span>Valor Recebido em Espécie</span>
                    </label>
                    <div className="flex items-center gap-1 text-[11px] font-mono font-bold">
                      <span className="text-[#8EB69B]">R$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={valorRecebido}
                        onChange={(e) => setValorRecebido(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        placeholder={valorTotal.toFixed(2)}
                        className="w-24 px-2 py-1 rounded-lg bg-[#0D1917] border border-[rgba(142,182,155,0.25)] text-right text-sm text-[#F3FBF6] font-bold focus:border-[#10B981] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Suggestions */}
                  <div className="flex items-center gap-1.5 overflow-x-auto table-scrollbar">
                    {[valorTotal, 20, 50, 100, 200].map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setValorRecebido(sug)}
                        className="px-2.5 py-1 rounded-lg bg-[#142522] hover:bg-[#163832] text-[11px] font-mono font-semibold text-[#DAF1DE] border border-[rgba(142,182,155,0.15)] active:scale-95"
                      >
                        {idx === 0 ? 'Exato' : `R$ ${sug}`}
                      </button>
                    ))}
                  </div>

                  {/* Troco Result */}
                  <div className="pt-2 border-t border-[rgba(142,182,155,0.12)] flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#A2B89B]">Troco a Devolver:</span>
                    <span className="text-base font-mono font-extrabold text-[#10B981]">
                      R$ {troco.toFixed(2)}
                    </span>
                  </div>

                  {dinheiroInsuficiente && (
                    <div className="text-[11px] text-red-400 font-medium">
                      ⚠️ Faltam R$ {(valorTotal - (numValorRecebido || 0)).toFixed(2)} para cobrir o total.
                    </div>
                  )}
                </div>
              )}

              {/* Credit Limit Alert if Exceeded */}
              {crediarioExcedido && (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
                  <span>
                    {selectedCliente
                      ? `Valor total (R$ ${valorTotal.toFixed(2)}) ultrapassa o limite disponível do cliente (R$ ${limiteDisponivel.toFixed(2)})!`
                      : 'Para vender no crediário é obrigatório selecionar um cliente cadastrado.'}
                  </span>
                </div>
              )}

              {/* Totals & Final Action Button */}
              <div className="pt-3 border-t border-[rgba(142,182,155,0.12)] space-y-2.5">
                <div className="flex items-center justify-between text-sm text-[#A2B89B]">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-[#DAF1DE]">R$ {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-[#A2B89B]">
                  <span>Desconto Aplicado:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-[#8EB69B]">R$</span>
                    <input
                      type="number"
                      min="0"
                      value={desconto}
                      onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2.5 py-1 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] font-mono text-right text-sm text-[#F3FBF6] font-bold focus:border-[#10B981] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between text-base font-bold text-[#F3FBF6] pt-1">
                  <span>Total a Pagar:</span>
                  <span className="text-3xl font-mono font-extrabold text-[#10B981]">
                    R$ {valorTotal.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleFinalizeSale}
                  disabled={cart.length === 0 || crediarioExcedido || Boolean(dinheiroInsuficiente)}
                  className="w-full py-3.5 px-4 rounded-full bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-sm md:text-base font-bold shadow-glow-emerald transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none mt-2 btn-press hover-lift"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Finalizar Venda & Emitir Cupom</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: VENDAS EM ESPERA (HOLD QUEUE)                                      */}
      {/* ========================================================================= */}
      {activeTab === 'ESPERA' && (
        <div className="space-y-4">
          <div className="p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#142522] border border-[rgba(142,182,155,0.2)] flex items-center justify-center text-amber-400">
                <PauseCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F3FBF6]">Fila de Vendas em Espera (Hold)</h3>
                <p className="text-xs text-[#8EB69B]">
                  Atendimentos pausados para liberar o caixa. Retome a qualquer instante.
                </p>
              </div>
            </div>

            <Badge variant="warning">
              {vendasEspera.length} {vendasEspera.length === 1 ? 'venda retida' : 'vendas retidas'}
            </Badge>
          </div>

          {vendasEspera.length === 0 ? (
            <BentoCard>
              <div className="text-center py-12 space-y-3">
                <Clock className="w-10 h-10 text-[#5E756B] mx-auto" />
                <h4 className="text-base font-bold text-[#F3FBF6]">Nenhuma venda em espera no momento</h4>
                <p className="text-xs text-[#8EB69B] max-w-md mx-auto">
                  Para pausar um atendimento em andamento e liberar o caixa para outro cliente, clique no botão <strong>"Pausar Venda"</strong> no carrinho.
                </p>
              </div>
            </BentoCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vendasEspera.map((esp) => (
                <div
                  key={esp.id}
                  className="bg-[#0D1917] border border-[rgba(142,182,155,0.18)] rounded-3xl p-5 shadow-bento-dark space-y-4 flex flex-col justify-between hover:border-[rgba(142,182,155,0.3)] transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/30">
                        {esp.codigo}
                      </span>
                      <span className="text-xs font-mono text-[#8EB69B]">
                        {new Date(esp.criado_em).toLocaleTimeString('pt-BR')}
                      </span>
                    </div>

                    <div>
                      <div className="text-xs text-[#A2B89B]">Cliente:</div>
                      <div className="text-sm font-bold text-[#F3FBF6]">
                        {esp.cliente_nome || 'Consumidor Final'}
                      </div>
                    </div>

                    {esp.observacao && (
                      <div className="p-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.1)] text-xs text-[#DAF1DE] italic">
                        "{esp.observacao}"
                      </div>
                    )}

                    {/* Items preview */}
                    <div className="space-y-1 pt-2 border-t border-[rgba(142,182,155,0.08)]">
                      <div className="text-xs font-semibold text-[#8EB69B]">Itens no Pedido:</div>
                      <div className="text-xs text-[#DAF1DE] space-y-0.5 max-h-24 overflow-y-auto table-scrollbar">
                        {esp.itens.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span className="truncate pr-2">
                              {it.quantidade}x {it.produto.nome}
                            </span>
                            <span className="font-mono text-[#8EB69B]">
                              R$ {(it.quantidade * it.preco_unitario).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[rgba(142,182,155,0.12)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#A2B89B]">Valor Total:</span>
                      <span className="text-xl font-mono font-extrabold text-[#10B981]">
                        R$ {esp.valor_total.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDescartarVendaEspera(esp.id, esp.codigo)}
                        className="px-3 py-2.5 rounded-xl bg-[#142522] hover:bg-red-500/20 text-[#8EB69B] hover:text-red-400 border border-[rgba(142,182,155,0.18)] hover:border-red-400/40 text-xs font-bold transition-all active:scale-95"
                        title="Descartar venda"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleRetomarVendaEspera(esp)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#070E0D] font-bold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <PlayCircle className="w-4 h-4" />
                        <span>Retomar no Caixa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTÓRICO DE VENDAS & ESTORNO                                      */}
      {/* ========================================================================= */}
      {activeTab === 'HISTORICO' && (
        <div className="space-y-4">
          {/* Filter and Search */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-[#8EB69B] absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchHistorico}
                onChange={(e) => setSearchHistorico(e.target.value)}
                placeholder="Buscar venda por código, cliente ou forma de pagamento..."
                className="w-full pl-12 pr-10 py-3 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-sm font-medium text-[#F3FBF6] placeholder-[#5E756B] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/25 focus:outline-none transition-all duration-200 shadow-inner"
              />
              {searchHistorico && (
                <button
                  onClick={() => setSearchHistorico('')}
                  className="absolute right-3.5 top-3.5 text-[#8EB69B] hover:text-[#F3FBF6]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Status Filter */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.18)] shadow-inner">
              {(['TODAS', 'CONCLUIDA', 'CANCELADA'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilterHistorico(st)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 ${
                    statusFilterHistorico === st
                      ? 'bg-gradient-to-r from-[#10B981] to-[#059669] text-[#070E0D] font-bold shadow-glow-emerald'
                      : 'text-[#94A89E] hover:text-[#F3FBF6] hover:bg-[#142522]'
                  }`}
                >
                  {st === 'TODAS' ? 'Todas' : st === 'CONCLUIDA' ? 'Concluídas' : 'Estornadas'}
                </button>
              ))}
            </div>
          </div>

          {/* Single-Line ERP Table */}
          <BentoCard>
            <div className="overflow-x-auto table-scrollbar pb-2">
              <table className="w-full text-left min-w-[1100px]">
                <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
                  <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B] whitespace-nowrap">
                    <th className="py-3.5 px-4 whitespace-nowrap">Código / Cupom</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Data / Hora</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Cliente</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Pagamento</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">Itens</th>
                    <th className="py-3.5 px-4 whitespace-nowrap">Total</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-center">Status</th>
                    <th className="py-3.5 px-4 whitespace-nowrap text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
                  {filteredHistorico.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-sm text-[#5E756B] whitespace-nowrap">
                        Nenhuma venda encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredHistorico.map((v) => (
                      <tr key={v.id} className="hover:bg-[#142522]/50 transition-colors group whitespace-nowrap">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#F3FBF6] group-hover:text-[#10B981] whitespace-nowrap">
                          #{v.id.slice(0, 8)}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-mono text-[#A2B89B] whitespace-nowrap">
                          {new Date(v.data_venda).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 text-sm font-semibold text-[#DAF1DE] whitespace-nowrap">
                          {v.cliente_nome || 'Consumidor Final'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-[#142522] border border-[rgba(142,182,155,0.15)] text-xs font-mono text-[#DAF1DE]">
                            {v.forma_pagamento}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#F3FBF6] text-center whitespace-nowrap">
                          {v.itens?.reduce((acc, it) => acc + it.quantidade, 0) || 0} un
                        </td>
                        <td className="py-3.5 px-4 font-mono text-sm font-extrabold text-[#10B981] whitespace-nowrap">
                          R$ {v.valor_total.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {v.status === 'CONCLUIDA' ? (
                            <Badge variant="mint">Concluída</Badge>
                          ) : (
                            <Badge variant="danger">Cancelada / Estornada</Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setReceiptSale(v);
                                setReceiptModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-[#142522] hover:bg-[#1B332E] text-xs font-semibold text-[#DAF1DE] flex items-center gap-1 border border-[rgba(142,182,155,0.18)] active:scale-95"
                              title="Reimprimir Comprovante"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Cupom</span>
                            </button>

                            {v.status === 'CONCLUIDA' && (
                              <button
                                onClick={() => {
                                  setVendaParaEstorno(v);
                                  setEstornoModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-400 flex items-center gap-1 border border-red-500/30 active:scale-95"
                                title="Estornar Venda e Devolver Itens ao Estoque"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Estornar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </BentoCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: OPERAÇÕES DE CAIXA (CASH SHIFT MANAGEMENT)                         */}
      {/* ========================================================================= */}
      {activeTab === 'OPERACAO_CAIXA' && (
        <div className="space-y-6">
          {/* Shift Status Banner & Action Buttons */}
          <div className="p-5 rounded-3xl bg-[#0D1917] border border-[rgba(142,182,155,0.18)] shadow-bento-dark flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-[#F3FBF6]">Turno Atual de Caixa</span>
                {caixaTurno?.aberto ? (
                  <Badge variant="mint">Aberto</Badge>
                ) : (
                  <Badge variant="danger">Fechado</Badge>
                )}
              </div>
              <p className="text-xs text-[#8EB69B]">
                Aberto em: {caixaTurno?.data_abertura ? new Date(caixaTurno.data_abertura).toLocaleString('pt-BR') : '—'} • Responsável: <strong className="text-[#DAF1DE]">{caixaTurno?.operador_nome || 'Operador'}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {caixaTurno?.aberto ? (
                <>
                  <button
                    onClick={() => setSuprimentoModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#142522] hover:bg-[#1B332E] text-[#10B981] font-bold text-xs border border-[#10B981]/30 flex items-center gap-1.5 active:scale-95"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>Suprimento (+)</span>
                  </button>

                  <button
                    onClick={() => setSangriaModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#142522] hover:bg-[#1B332E] text-amber-400 font-bold text-xs border border-amber-400/30 flex items-center gap-1.5 active:scale-95"
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    <span>Sangria (-)</span>
                  </button>

                  <button
                    onClick={() => setFechamentoModalOpen(true)}
                    className="px-5 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-xs border border-red-500/40 flex items-center gap-1.5 active:scale-95"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Fechar Caixa (Turno)</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setAberturaModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] font-bold text-xs shadow-glow-emerald flex items-center gap-2 active:scale-95"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Abrir Novo Turno</span>
                </button>
              )}
            </div>
          </div>

          {/* StatCards of Drawer Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="p-4 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.15)] space-y-1">
              <span className="text-[11px] font-semibold text-[#8EB69B]">Fundo Inicial</span>
              <div className="font-mono text-lg font-bold text-[#F3FBF6]">
                R$ {drawerStats.fundo.toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.15)] space-y-1">
              <span className="text-[11px] font-semibold text-[#8EB69B]">Vendas em Dinheiro</span>
              <div className="font-mono text-lg font-bold text-[#10B981]">
                R$ {drawerStats.vendasDinheiro.toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.15)] space-y-1">
              <span className="text-[11px] font-semibold text-[#8EB69B]">Cartão / PIX / Cred.</span>
              <div className="font-mono text-lg font-bold text-[#DAF1DE]">
                R$ {drawerStats.vendasOutras.toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.15)] space-y-1">
              <span className="text-[11px] font-semibold text-[#8EB69B]">Suprimentos (+)</span>
              <div className="font-mono text-lg font-bold text-emerald-400">
                R$ {drawerStats.suprimentos.toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1917] border border-[rgba(142,182,155,0.15)] space-y-1">
              <span className="text-[11px] font-semibold text-[#8EB69B]">Sangrias (-)</span>
              <div className="font-mono text-lg font-bold text-amber-400">
                R$ {drawerStats.sangrias.toFixed(2)}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#070E0D] border border-[#10B981]/40 shadow-glow-emerald space-y-1">
              <span className="text-[11px] font-bold text-[#10B981]">Esperado na Gaveta</span>
              <div className="font-mono text-xl font-extrabold text-[#10B981]">
                R$ {drawerStats.saldoEsperadoGaveta.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Drawer Operations Table */}
          <BentoCard>
            <div className="p-2 border-b border-[rgba(142,182,155,0.12)] mb-3">
              <h4 className="text-sm font-bold text-[#F3FBF6]">Movimentações da Gaveta de Dinheiro</h4>
            </div>
            <div className="overflow-x-auto table-scrollbar pb-2">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-[#0A1614] border-b border-[rgba(142,182,155,0.18)]">
                  <tr className="text-xs font-bold uppercase tracking-wider text-[#A2B89B] whitespace-nowrap">
                    <th className="py-3 px-4 whitespace-nowrap">Data / Horário</th>
                    <th className="py-3 px-4 whitespace-nowrap">Tipo de Operação</th>
                    <th className="py-3 px-4 whitespace-nowrap">Valor</th>
                    <th className="py-3 px-4 whitespace-nowrap">Operador</th>
                    <th className="py-3 px-4 whitespace-nowrap">Motivo / Justificativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(142,182,155,0.08)]">
                  {(caixaTurno?.operacoes || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#5E756B] whitespace-nowrap">
                        Nenhuma operação de caixa registrada neste turno.
                      </td>
                    </tr>
                  ) : (
                    caixaTurno?.operacoes.map((op) => (
                      <tr key={op.id} className="hover:bg-[#142522]/50 transition-colors whitespace-nowrap">
                        <td className="py-3.5 px-4 font-mono text-xs text-[#A2B89B] whitespace-nowrap">
                          {new Date(op.data_hora).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {op.tipo === 'ABERTURA' && <Badge variant="blue">Abertura</Badge>}
                          {op.tipo === 'SUPRIMENTO' && <Badge variant="mint">Suprimento (+)</Badge>}
                          {op.tipo === 'SANGRIA' && <Badge variant="warning">Sangria (-)</Badge>}
                          {op.tipo === 'FECHAMENTO' && <Badge variant="neutral">Fechamento</Badge>}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-sm font-extrabold text-[#F3FBF6] whitespace-nowrap">
                          R$ {op.valor.toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-xs font-semibold text-[#DAF1DE] whitespace-nowrap">
                          {op.operador_nome}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#DAF1DE] whitespace-nowrap">
                          {op.motivo}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </BentoCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

      {/* 1. Pause / Hold Sale Modal */}
      <Modal
        isOpen={pauseModalOpen}
        onClose={() => setPauseModalOpen(false)}
        title="Pausar Atendimento (Hold)"
        subtitle="Reter venda temporariamente para atender outro cliente"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#DAF1DE]">
            Os itens e o cliente atual serão salvos na aba <strong>"Vendas em Espera"</strong>. O caixa ficará imediatamente limpo e disponível para novas vendas.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A2B89B]">Observação ou Referência do Cliente (Opcional):</label>
            <input
              type="text"
              value={pauseObservacao}
              onChange={(e) => setPauseObservacao(e.target.value)}
              placeholder="Ex: Foi buscar o cartão no carro, aguardando aprovação..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-sm text-[#F3FBF6] focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(142,182,155,0.12)]">
            <button
              type="button"
              onClick={() => setPauseModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#142522] text-xs font-semibold text-[#94A89E] hover:text-[#F3FBF6]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmPauseSale}
              className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#070E0D] text-xs font-bold shadow-glow-emerald flex items-center gap-1.5 active:scale-95"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Confirmar e Pausar</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Estorno Confirmation Modal */}
      <Modal
        isOpen={estornoModalOpen}
        onClose={() => setEstornoModalOpen(false)}
        title="Confirmar Estorno de Venda"
        subtitle={vendaParaEstorno ? `Cupom #${vendaParaEstorno.id.slice(0, 8)}` : ''}
      >
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2 text-xs text-red-300">
            <div className="flex items-center gap-2 font-bold text-red-400 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Atenção: Ação com impacto em estoque e financeiro!</span>
            </div>
            <p>
              Ao confirmar o estorno desta venda:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Todos os itens vendidos serão automaticamente devolvidos ao estoque da loja.</li>
              <li>O valor da venda (<strong>R$ {vendaParaEstorno?.valor_total.toFixed(2)}</strong>) será compensado no financeiro.</li>
              {vendaParaEstorno?.forma_pagamento === 'CREDIARIO' && (
                <li>O saldo devedor do cliente será recomposto, liberando seu limite de crédito.</li>
              )}
            </ul>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(142,182,155,0.12)]">
            <button
              onClick={() => setEstornoModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#142522] text-xs font-semibold text-[#94A89E] hover:text-[#F3FBF6]"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirmarEstorno}
              className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-glow-emerald flex items-center gap-1.5 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Confirmar Estorno</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. Modal Sangria */}
      <Modal
        isOpen={sangriaModalOpen}
        onClose={() => setSangriaModalOpen(false)}
        title="Sangria de Caixa (Retirada)"
        subtitle="Retirada física de dinheiro da gaveta para o cofre ou despesa"
      >
        <form onSubmit={handleRegistrarSangria} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A2B89B]">Valor da Retirada (R$):</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={sangriaValor}
              onChange={(e) => setSangriaValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-base font-mono font-bold text-[#F3FBF6] focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A2B89B]">Motivo / Destino:</label>
            <input
              type="text"
              required
              value={sangriaMotivo}
              onChange={(e) => setSangriaMotivo(e.target.value)}
              placeholder="Ex: Recolhimento para cofre central"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-sm text-[#F3FBF6] focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(142,182,155,0.12)]">
            <button
              type="button"
              onClick={() => setSangriaModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#142522] text-xs font-semibold text-[#94A89E] hover:text-[#F3FBF6]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-[#070E0D] text-xs font-bold shadow-glow-emerald flex items-center gap-1.5 active:scale-95"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>Registrar Sangria</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Modal Suprimento */}
      <Modal
        isOpen={suprimentoModalOpen}
        onClose={() => setSuprimentoModalOpen(false)}
        title="Suprimento de Caixa (Aporte)"
        subtitle="Entrada de dinheiro para troco na gaveta"
      >
        <form onSubmit={handleRegistrarSuprimento} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A2B89B]">Valor do Aporte (R$):</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={suprimentoValor}
              onChange={(e) => setSuprimentoValor(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="0,00"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-base font-mono font-bold text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A2B89B]">Motivo / Origem:</label>
            <input
              type="text"
              required
              value={suprimentoMotivo}
              onChange={(e) => setSuprimentoMotivo(e.target.value)}
              placeholder="Ex: Troco inicial extra em moedas e notas"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-sm text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(142,182,155,0.12)]">
            <button
              type="button"
              onClick={() => setSuprimentoModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#142522] text-xs font-semibold text-[#94A89E] hover:text-[#F3FBF6]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald flex items-center gap-1.5 active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Registrar Suprimento</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. Modal Fechamento de Caixa (Contagem Cega) */}
      <Modal
        isOpen={fechamentoModalOpen}
        onClose={() => setFechamentoModalOpen(false)}
        title="Fechamento de Caixa • Contagem Cega"
        subtitle="Auditoria e encerramento do turno de trabalho"
      >
        <form onSubmit={handleFecharTurno} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.14)] space-y-2 text-xs">
            <div className="flex justify-between text-[#A2B89B]">
              <span>Saldo Calculado pelo Sistema:</span>
              <span className="font-mono font-bold text-[#F3FBF6]">
                R$ {drawerStats.saldoEsperadoGaveta.toFixed(2)}
              </span>
            </div>
            {typeof saldoContado === 'number' && (
              <div className="flex justify-between border-t border-[rgba(142,182,155,0.1)] pt-2 font-bold">
                <span>Diferença / Quebra de Caixa:</span>
                <span
                  className={`font-mono text-sm ${
                    saldoContado - drawerStats.saldoEsperadoGaveta === 0
                      ? 'text-[#10B981]'
                      : saldoContado - drawerStats.saldoEsperadoGaveta < 0
                      ? 'text-red-400'
                      : 'text-blue-400'
                  }`}
                >
                  {saldoContado - drawerStats.saldoEsperadoGaveta >= 0 ? '+' : ''}
                  R$ {(saldoContado - drawerStats.saldoEsperadoGaveta).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A2B89B]">
              Saldo Físico em Gaveta (Contagem Cega):
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={saldoContado}
              onChange={(e) => setSaldoContado(e.target.value === '' ? '' : parseFloat(e.target.value))}
              placeholder="Informe o total apurado em dinheiro"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-base font-mono font-bold text-[#F3FBF6] focus:border-red-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A2B89B]">Observações do Fechamento:</label>
            <textarea
              rows={2}
              value={fechamentoObservacao}
              onChange={(e) => setFechamentoObservacao(e.target.value)}
              placeholder="Justificativa para divergência ou recados para o próximo turno..."
              className="w-full px-3.5 py-2 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-xs text-[#F3FBF6] focus:border-red-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(142,182,155,0.12)]">
            <button
              type="button"
              onClick={() => setFechamentoModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#142522] text-xs font-semibold text-[#94A89E] hover:text-[#F3FBF6]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-glow-emerald flex items-center gap-1.5 active:scale-95"
            >
              <Lock className="w-4 h-4" />
              <span>Confirmar Fechamento</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 6. Modal Abertura de Turno */}
      <Modal
        isOpen={aberturaModalOpen}
        onClose={() => setAberturaModalOpen(false)}
        title="Abrir Novo Turno de Caixa"
        subtitle="Informe o valor inicial disponibilizado para troco"
      >
        <form onSubmit={handleAbrirTurno} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#A2B89B]">Fundo Inicial de Troco (R$):</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={aberturaFundo}
              onChange={(e) => setAberturaFundo(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070E0D] border border-[rgba(142,182,155,0.2)] text-base font-mono font-bold text-[#F3FBF6] focus:border-[#10B981] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(142,182,155,0.12)]">
            <button
              type="button"
              onClick={() => setAberturaModalOpen(false)}
              className="h-10 px-4 rounded-xl bg-[#142522] text-xs font-semibold text-[#94A89E] hover:text-[#F3FBF6]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-xl bg-[#10B981] hover:bg-[#059669] text-[#070E0D] text-xs font-bold shadow-glow-emerald flex items-center gap-1.5 active:scale-95"
            >
              <Unlock className="w-4 h-4" />
              <span>Abrir Caixa</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 7. Printable Receipt Modal (Cupom Não-Fiscal) */}
      <Modal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        title="Comprovante de Venda • Cupom Não-Fiscal"
        subtitle={`Transação #${receiptSale?.id.slice(0, 8)}`}
      >
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#070E0D] border border-[rgba(142,182,155,0.15)] font-mono text-xs space-y-3">
            <div className="text-center border-b border-[rgba(142,182,155,0.1)] pb-3">
              <div className="text-sm font-extrabold text-[#F3FBF6]">ESTROQUE ENTERPRISE</div>
              <div className="text-[11px] text-[#94A89E]">{activeLoja?.nome || 'Loja Matriz'}</div>
              <div className="text-[10px] text-[#5E756B]">{activeLoja?.cnpj || '12.345.678/0001-90'}</div>
              <div className="text-[10px] text-[#8EB69B] mt-1">
                {receiptSale?.data_venda ? new Date(receiptSale.data_venda).toLocaleString('pt-BR') : ''}
              </div>
            </div>

            <div className="space-y-1 divide-y divide-[rgba(142,182,155,0.06)]">
              {receiptSale?.itens?.map((it) => (
                <div key={it.id} className="pt-1.5 flex justify-between">
                  <span>
                    {it.quantidade}x {it.produto_nome || it.sku}
                  </span>
                  <span className="text-[#10B981]">
                    R$ {(it.quantidade * it.preco_unitario).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-[rgba(142,182,155,0.1)] pt-2 space-y-1">
              {receiptSale?.desconto ? (
                <div className="flex justify-between text-amber-400">
                  <span>Desconto:</span>
                  <span>- R$ {receiptSale.desconto.toFixed(2)}</span>
                </div>
              ) : null}

              <div className="flex justify-between">
                <span>Forma de Pagamento:</span>
                <span className="font-bold text-[#DAF1DE]">{receiptSale?.forma_pagamento}</span>
              </div>

              <div className="flex justify-between text-sm font-bold text-[#F3FBF6] pt-1">
                <span>TOTAL:</span>
                <span className="text-[#10B981]">
                  R$ {receiptSale?.valor_total.toFixed(2)}
                </span>
              </div>
            </div>

            {receiptSale?.forma_pagamento === 'CREDIARIO' && (
              <div className="p-2 rounded bg-[#142522] text-[10px] text-[#DAF1DE] text-center">
                Venda registrada no crediário da loja. Saldo devedor do cliente atualizado.
              </div>
            )}

            {receiptSale?.status === 'CANCELADA' && (
              <div className="p-2 rounded bg-red-500/15 text-[10px] text-red-400 text-center font-bold">
                ⚠️ VENDA CANCELADA / ESTORNADA NO SISTEMA
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(142,182,155,0.12)]">
            <button
              onClick={() => setReceiptModalOpen(false)}
              className="h-11 px-5 rounded-xl bg-[#142522] hover:bg-[#1B332E] text-sm font-semibold text-[#94A89E] hover:text-[#F3FBF6] active:scale-95 transition-all"
            >
              Fechar
            </button>
            <button
              onClick={() => {
                window.print();
              }}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-[#070E0D] text-sm font-bold shadow-glow-emerald active:scale-95 transition-all flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Comprovante</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
