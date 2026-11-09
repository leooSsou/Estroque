import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import {
  Produto,
  Cliente,
  FormaPagamento,
  Venda,
  VendaEmEspera,
  CaixaTurno,
  TurnoFechadoHistorico,
} from '../../types';
import { printThermalReceipt } from '../../services/receiptPrinter';
import {
  CartItem,
  CatalogFilter,
  PDVTab,
  ItensDevolucaoMap,
  PaymentMode,
  SplitPaymentEntry,
  StatusFilterHistorico,
  TipoDevolucao,
  TipoResolucaoDevolucao,
} from './types';
import {
  calcularLimiteCrediarioDisponivel,
  calcularTotaisCarrinho,
  calcularTrocoEDinheiroInsuficiente,
  validarLimitesPagamentoSimples,
  calcularMetricasSplit,
  validarNovaParcelaSplit,
  calcularTotalDevolucao,
  construirEstadoInicialDevolucao,
  extrairItensParaDevolver,
  obterEstoqueDiretoProduto,
  calcularEstoqueExibidoVitrine,
  filtrarProdutosVitrine,
  calcularContadoresVitrine,
  filtrarCatalogoPDV,
  resolverSubmissaoBuscaOuCodigoBarras,
  atualizarQuantidadeCarrinho,
  validarCheckoutVenda,
  resolverDetalhesItemCupom,
  construirDadosImpressaoTermica,
  filtrarHistoricoVendas,
  calcularDrawerStats,
} from './pdvBusinessRules';

export function usePDVController() {
  const { activeLoja, user } = useAuth();
  const { toast } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState<PDVTab>('CAIXA');

  // Core Data
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendasHistorico, setVendasHistorico] = useState<Venda[]>([]);
  const [vendasEspera, setVendasEspera] = useState<VendaEmEspera[]>([]);
  const [caixaTurno, setCaixaTurno] = useState<CaixaTurno | null>(null);
  const [turnosHistorico, setTurnosHistorico] = useState<TurnoFechadoHistorico[]>([]);

  // Tab 1 (Caixa Ativo) States
  const [search, setSearch] = useState('');
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('PIX');
  const [desconto, setDesconto] = useState(0);
  const [valorRecebido, setValorRecebido] = useState<number | ''>('');
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>('TODOS');

  // Split Payment (Múltiplas Formas de Pagamento)
  const [modoPagamento, setModoPagamento] = useState<PaymentMode>('SIMPLES');
  const [splitPagamentos, setSplitPagamentos] = useState<SplitPaymentEntry[]>([]);
  const [novoSplitForma, setNovoSplitForma] = useState<FormaPagamento>('DINHEIRO');
  const [novoSplitValor, setNovoSplitValor] = useState<number | ''>('');

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
  const [statusFilterHistorico, setStatusFilterHistorico] =
    useState<StatusFilterHistorico>('TODAS');

  // Devolucao / Troca Modal State (Tab 3)
  const [devolucaoModalOpen, setDevolucaoModalOpen] = useState(false);
  const [vendaParaDevolucao, setVendaParaDevolucao] = useState<Venda | null>(null);
  const [itensDevolucaoSelecionados, setItensDevolucaoSelecionados] =
    useState<ItensDevolucaoMap>({});
  const [tipoDevolucao, setTipoDevolucao] = useState<TipoDevolucao>('DEVOLUCAO');
  const [tipoResolucao, setTipoResolucao] =
    useState<TipoResolucaoDevolucao>('CREDITO_LOJA');
  const [motivoDevolucao, setMotivoDevolucao] = useState('');
  const [isSubmittingDevolucao, setIsSubmittingDevolucao] = useState(false);
  const [isFinalizingSale, setIsFinalizingSale] = useState(false);
  const [isSubmittingEstorno, setIsSubmittingEstorno] = useState(false);
  const [isSubmittingSangria, setIsSubmittingSangria] = useState(false);
  const [isSubmittingSuprimento, setIsSubmittingSuprimento] = useState(false);
  const [isSubmittingFechamento, setIsSubmittingFechamento] = useState(false);
  const [isSubmittingAbertura, setIsSubmittingAbertura] = useState(false);

  // Variations Picker Modal State (PDV)
  const [variacoesPickerOpen, setVariacoesPickerOpen] = useState(false);
  const [selectedPaiForPicker, setSelectedPaiForPicker] = useState<Produto | null>(null);

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

  const [relatorioPDFModalOpen, setRelatorioPDFModalOpen] = useState(false);
  const [relatorioPDFMode, setRelatorioPDFMode] = useState<'DIARIO' | 'MENSAL'>('DIARIO');

  // Load all initial data (Camada C)
  const loadInitialData = async () => {
    try {
      const [prods, clis, vends, esp, turno, histTurnos] = await Promise.all([
        api.getProdutos(activeLoja?.id),
        api.getClientes(),
        api.getVendas(activeLoja?.id),
        api.getVendasEspera(),
        api.getCaixaTurno(activeLoja?.id),
        api.getHistoricoTurnos(activeLoja?.id),
      ]);
      setProdutos(prods);
      setClientes(clis);
      setVendasHistorico(vends);
      setVendasEspera(esp);
      setCaixaTurno(turno);
      setTurnosHistorico(histTurnos);
    } catch {
      toast.error('Erro ao carregar dados do PDV.');
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [activeLoja]);

  // Selected customer & credit calculation (Camada B)
  const selectedCliente = clientes.find((c) => c.id === selectedClienteId);
  const limiteDisponivel = calcularLimiteCrediarioDisponivel(selectedCliente);

  // Cart calculations (Camada B)
  const { subtotal, valorTotal } = calcularTotaisCarrinho(cart, desconto);

  // Dinheiro Change calculations (Camada B)
  const { numValorRecebido, troco, dinheiroInsuficiente } =
    calcularTrocoEDinheiroInsuficiente(formaPagamento, valorRecebido, valorTotal);

  // Credit limit & Vale-Crédito validation checks (Camada B)
  const { crediarioExcedido, creditoLojaDisponivel, creditoLojaExcedido } =
    validarLimitesPagamentoSimples(
      modoPagamento,
      formaPagamento,
      selectedCliente,
      valorTotal,
      limiteDisponivel
    );

  // Split Payment calculations & helpers (Camada B)
  const {
    totalSplitPago,
    restanteSplit,
    splitCrediarioTotal,
    splitCreditoLojaTotal,
    splitCrediarioExcedido,
    splitCreditoLojaExcedido,
  } = useMemo(
    () =>
      calcularMetricasSplit(
        modoPagamento,
        splitPagamentos,
        valorTotal,
        selectedCliente,
        limiteDisponivel,
        creditoLojaDisponivel
      ),
    [
      modoPagamento,
      splitPagamentos,
      valorTotal,
      selectedCliente,
      limiteDisponivel,
      creditoLojaDisponivel,
    ]
  );

  const handleAddSplitPayment = () => {
    const validacao = validarNovaParcelaSplit({
      novoSplitValor,
      restanteSplit,
      novoSplitForma,
      selectedCliente,
      splitCrediarioTotal,
      limiteDisponivel,
      splitCreditoLojaTotal,
      creditoLojaDisponivel,
    });
    if (!validacao.valido) {
      if (validacao.erro) toast.error(validacao.erro);
      return;
    }
    setSplitPagamentos((prev) => [
      ...prev,
      { forma_pagamento: novoSplitForma, valor: validacao.valorFinal },
    ]);
    setNovoSplitValor('');
  };

  const handleRemoveSplitPayment = (index: number) => {
    setSplitPagamentos((prev) => prev.filter((_, i) => i !== index));
  };

  const totalDevolucaoCalculado = useMemo(
    () => calcularTotalDevolucao(vendaParaDevolucao, itensDevolucaoSelecionados),
    [vendaParaDevolucao, itensDevolucaoSelecionados]
  );

  const abrirModalDevolucao = (v: Venda) => {
    setVendaParaDevolucao(v);
    const { initialMap, tipoResolucaoInicial } = construirEstadoInicialDevolucao(v);
    setItensDevolucaoSelecionados(initialMap);
    setTipoDevolucao('DEVOLUCAO');
    setTipoResolucao(tipoResolucaoInicial);
    setMotivoDevolucao('');
    setDevolucaoModalOpen(true);
  };

  const handleConfirmarDevolucao = async () => {
    if (!vendaParaDevolucao) return;
    const itensParaDevolver = extrairItensParaDevolver(itensDevolucaoSelecionados);

    if (itensParaDevolver.length === 0) {
      toast.warning('Selecione ao menos um item para devolução com quantidade maior que zero.');
      return;
    }

    if (!motivoDevolucao.trim()) {
      toast.warning('Por favor, informe o motivo da devolução ou troca.');
      return;
    }

    setIsSubmittingDevolucao(true);
    try {
      await api.devolverVenda(vendaParaDevolucao.id, {
        tipo: tipoDevolucao,
        tipo_resolucao: tipoResolucao,
        motivo: motivoDevolucao.trim(),
        itens: itensParaDevolver,
      });

      toast.success('Troca/Devolução registrada com sucesso!');
      setDevolucaoModalOpen(false);
      await loadInitialData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao registrar devolução.');
    } finally {
      setIsSubmittingDevolucao(false);
    }
  };

  // Add item to cart
  const handleAddToCart = (prod: Produto) => {
    if (!caixaTurno?.aberto) {
      toast.warning('Caixa fechado! Abra o turno na aba "Operações de Caixa" para iniciar as vendas.');
      return;
    }

    const variacoes = produtos.filter((p) => p.produto_pai_id === prod.id && p.ativo);
    if (variacoes.length > 0) {
      setSelectedPaiForPicker(prod);
      setVariacoesPickerOpen(true);
      return;
    }

    addItemDirectlyToCart(prod);
  };

  const addItemDirectlyToCart = (prod: Produto) => {
    if (!caixaTurno?.aberto) {
      toast.warning('Caixa fechado! Abra o turno na aba "Operações de Caixa" para iniciar as vendas.');
      return;
    }
    const stock = obterEstoqueDiretoProduto(prod, activeLoja?.id);
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
    setCart((prev) => atualizarQuantidadeCarrinho(prev, id, delta));
  };

  // Finalize Sale (Camada C)
  const handleFinalizeSale = async () => {
    if (isFinalizingSale) return;
    const validacaoCheckout = validarCheckoutVenda({
      caixaAberto: Boolean(caixaTurno?.aberto),
      cartLength: cart.length,
      modoPagamento,
      splitPagamentosLength: splitPagamentos.length,
      restanteSplit,
      splitCrediarioExcedido,
      splitCreditoLojaExcedido,
      formaPagamento,
      selectedCliente,
      crediarioExcedido,
      creditoLojaExcedido,
      valorRecebido,
      valorTotal,
    });

    if (!validacaoCheckout.valido) {
      if (validacaoCheckout.erro) toast.error(validacaoCheckout.erro);
      if (validacaoCheckout.redirecionarParaOperacaoCaixa) {
        setActiveTab('OPERACAO_CAIXA');
      }
      return;
    }

    setIsFinalizingSale(true);
    try {
      let lojaId = activeLoja?.id;
      if (!lojaId) {
        const lojas = await api.getLojas();
        if (lojas.length > 0) lojaId = lojas[0].id;
      }
      if (!lojaId) {
        toast.error('Loja não encontrada para registrar a venda.');
        return;
      }

      const sale = await api.registrarVenda({
        loja_id: lojaId,
        cliente_id: selectedClienteId || null,
        forma_pagamento: modoPagamento === 'SPLIT' ? 'MULTIPLO' : formaPagamento,
        pagamentos: modoPagamento === 'SPLIT' ? splitPagamentos : undefined,
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
      setVendasHistorico((prev) => [sale, ...prev]);
      setCart([]);
      setDesconto(0);
      setValorRecebido('');
      setSplitPagamentos([]);
      setModoPagamento('SIMPLES');
      toast.success('Venda concluída com sucesso! Baixa no estoque efetuada.');

      loadInitialData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao registrar venda.';
      toast.error(msg);
    } finally {
      setIsFinalizingSale(false);
    }
  };

  // Hold / Pause Sale Flow (Camada C)
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

  // Resume Sale from Hold (Camada C)
  const handleRetomarVendaEspera = async (espera: VendaEmEspera) => {
    if (cart.length > 0) {
      const confirmar = window.confirm(
        'O carrinho atual contém itens. Deseja substituir pelo pedido em espera?'
      );
      if (!confirmar) return;
    }

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

    await api.removerVendaEspera(espera.id);
    const updated = await api.getVendasEspera();
    setVendasEspera(updated);

    setActiveTab('CAIXA');
    toast.success(`Venda [${espera.codigo}] retomada no caixa com sucesso!`);
  };

  // Discard Sale from Hold (Camada C)
  const handleDescartarVendaEspera = async (id: string, codigo: string) => {
    const confirmar = window.confirm(`Deseja realmente descartar a venda em espera [${codigo}]?`);
    if (!confirmar) return;

    await api.removerVendaEspera(id);
    const updated = await api.getVendasEspera();
    setVendasEspera(updated);
    toast.info(`Venda [${codigo}] descartada.`);
  };

  // Estornar Venda (Camada C)
  const handleConfirmarEstorno = async () => {
    if (!vendaParaEstorno || isSubmittingEstorno) return;

    setIsSubmittingEstorno(true);
    try {
      await api.estornarVenda(vendaParaEstorno.id);
      toast.success('Venda estornada com sucesso! Estoque devolvido e lançamentos compensados.');
      setEstornoModalOpen(false);
      setVendaParaEstorno(null);
      loadInitialData();
    } catch {
      toast.error('Erro ao estornar venda.');
    } finally {
      setIsSubmittingEstorno(false);
    }
  };

  // Operações de Caixa (Camada C)
  const handleRegistrarSangria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSangria) return;
    const val = typeof sangriaValor === 'number' ? sangriaValor : parseFloat(String(sangriaValor));
    if (!val || val <= 0) {
      toast.error('Informe um valor válido para a sangria.');
      return;
    }
    if (!sangriaMotivo.trim()) {
      toast.error('Informe a justificativa da sangria.');
      return;
    }

    setIsSubmittingSangria(true);
    try {
      await api.registrarSangria(val, sangriaMotivo, activeLoja?.id);
      toast.success(`Sangria de R$ ${val.toFixed(2)} registrada no turno.`);
      setSangriaModalOpen(false);
      setSangriaValor('');
      setSangriaMotivo('');
      loadInitialData();
    } catch {
      toast.error('Erro ao registrar sangria.');
    } finally {
      setIsSubmittingSangria(false);
    }
  };

  const handleRegistrarSuprimento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSuprimento) return;
    const val = typeof suprimentoValor === 'number' ? suprimentoValor : parseFloat(String(suprimentoValor));
    if (!val || val <= 0) {
      toast.error('Informe um valor válido para o suprimento.');
      return;
    }
    if (!suprimentoMotivo.trim()) {
      toast.error('Informe a justificativa do suprimento.');
      return;
    }

    setIsSubmittingSuprimento(true);
    try {
      await api.registrarSuprimento(val, suprimentoMotivo, activeLoja?.id);
      toast.success(`Suprimento de R$ ${val.toFixed(2)} registrado no turno.`);
      setSuprimentoModalOpen(false);
      setSuprimentoValor('');
      setSuprimentoMotivo('');
      loadInitialData();
    } catch {
      toast.error('Erro ao registrar suprimento.');
    } finally {
      setIsSubmittingSuprimento(false);
    }
  };

  const handleFecharTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingFechamento) return;
    const contado = typeof saldoContado === 'number' ? saldoContado : parseFloat(String(saldoContado));
    if (isNaN(contado) || contado < 0) {
      toast.error('Informe o valor físico contado na gaveta.');
      return;
    }

    setIsSubmittingFechamento(true);
    try {
      await api.fecharCaixa(contado, fechamentoObservacao, activeLoja?.id);
      toast.success('Turno de caixa encerrado com sucesso!');
      setFechamentoModalOpen(false);
      setSaldoContado('');
      setFechamentoObservacao('');
      loadInitialData();
    } catch {
      toast.error('Erro ao fechar o caixa.');
    } finally {
      setIsSubmittingFechamento(false);
    }
  };

  const handleAbrirTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingAbertura) return;
    const fundo = typeof aberturaFundo === 'number' ? aberturaFundo : parseFloat(String(aberturaFundo));
    if (isNaN(fundo) || fundo < 0) {
      toast.error('Informe o valor do fundo inicial de troco.');
      return;
    }

    setIsSubmittingAbertura(true);
    try {
      await api.abrirCaixa(fundo, activeLoja?.id);
      toast.success('Novo turno de caixa aberto com sucesso!');
      setAberturaModalOpen(false);
      loadInitialData();
    } catch {
      toast.error('Erro ao abrir turno.');
    } finally {
      setIsSubmittingAbertura(false);
    }
  };

  const getProductDisplayStock = (prod: Produto) =>
    calcularEstoqueExibidoVitrine(prod, produtos, activeLoja?.id);

  const produtosVitrine = useMemo(
    () => filtrarProdutosVitrine(produtos),
    [produtos]
  );

  const counts = useMemo(
    () => calcularContadoresVitrine(produtosVitrine, produtos, activeLoja?.id),
    [produtosVitrine, produtos, activeLoja]
  );

  const filteredProdutos = useMemo(
    () =>
      filtrarCatalogoPDV(
        produtosVitrine,
        produtos,
        search,
        catalogFilter,
        activeLoja?.id
      ),
    [produtosVitrine, produtos, search, catalogFilter, activeLoja]
  );

  const handleBarcodeOrSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const resultado = resolverSubmissaoBuscaOuCodigoBarras(
        search,
        produtos,
        filteredProdutos
      );

      if (resultado.acao === 'ABRIR_VARIACOES_EXATO' && resultado.produto) {
        setSelectedPaiForPicker(resultado.produto);
        setVariacoesPickerOpen(true);
        setSearch('');
        return;
      }

      if (resultado.acao === 'ADICIONAR_DIRETO_EXATO' && resultado.produto) {
        addItemDirectlyToCart(resultado.produto);
        toast.success(`Adicionado: ${resultado.produto.nome}`);
        setSearch('');
        return;
      }

      if (resultado.acao === 'ADICIONAR_UNICO_FILTRADO' && resultado.produto) {
        handleAddToCart(resultado.produto);
        setSearch('');
      }
    }
  };

  const getReceiptItemDetails = (it: {
    produto_id: string;
    produto_nome?: string;
    sku?: string;
  }) => resolverDetalhesItemCupom(it, produtos);

  const handlePrintReceipt = () => {
    if (!receiptSale) return;
    const receiptData = construirDadosImpressaoTermica({
      receiptSale,
      clientes,
      produtos,
      activeLoja,
      user,
    });
    printThermalReceipt(receiptData);
  };

  const filteredHistorico = useMemo(
    () =>
      filtrarHistoricoVendas(
        vendasHistorico,
        searchHistorico,
        statusFilterHistorico
      ),
    [vendasHistorico, searchHistorico, statusFilterHistorico]
  );

  const drawerStats = useMemo(
    () => calcularDrawerStats(caixaTurno, vendasHistorico),
    [caixaTurno, vendasHistorico]
  );

  return {
    activeLoja,
    user,
    toast,
    activeTab,
    setActiveTab,
    produtos,
    clientes,
    vendasHistorico,
    vendasEspera,
    caixaTurno,
    turnosHistorico,
    search,
    setSearch,
    selectedClienteId,
    setSelectedClienteId,
    cart,
    formaPagamento,
    setFormaPagamento,
    desconto,
    setDesconto,
    valorRecebido,
    setValorRecebido,
    catalogFilter,
    setCatalogFilter,
    modoPagamento,
    setModoPagamento,
    splitPagamentos,
    novoSplitForma,
    setNovoSplitForma,
    novoSplitValor,
    setNovoSplitValor,
    pauseModalOpen,
    setPauseModalOpen,
    pauseObservacao,
    setPauseObservacao,
    receiptModalOpen,
    setReceiptModalOpen,
    receiptSale,
    setReceiptSale,
    estornoModalOpen,
    setEstornoModalOpen,
    vendaParaEstorno,
    setVendaParaEstorno,
    searchHistorico,
    setSearchHistorico,
    statusFilterHistorico,
    setStatusFilterHistorico,
    devolucaoModalOpen,
    setDevolucaoModalOpen,
    vendaParaDevolucao,
    itensDevolucaoSelecionados,
    setItensDevolucaoSelecionados,
    tipoResolucao,
    setTipoResolucao,
    motivoDevolucao,
    setMotivoDevolucao,
    isSubmittingDevolucao,
    isFinalizingSale,
    isSubmittingEstorno,
    isSubmittingSangria,
    isSubmittingSuprimento,
    isSubmittingFechamento,
    isSubmittingAbertura,
    variacoesPickerOpen,
    setVariacoesPickerOpen,
    selectedPaiForPicker,
    sangriaModalOpen,
    setSangriaModalOpen,
    sangriaValor,
    setSangriaValor,
    sangriaMotivo,
    setSangriaMotivo,
    suprimentoModalOpen,
    setSuprimentoModalOpen,
    suprimentoValor,
    setSuprimentoValor,
    suprimentoMotivo,
    setSuprimentoMotivo,
    fechamentoModalOpen,
    setFechamentoModalOpen,
    saldoContado,
    setSaldoContado,
    fechamentoObservacao,
    setFechamentoObservacao,
    aberturaModalOpen,
    setAberturaModalOpen,
    aberturaFundo,
    setAberturaFundo,
    relatorioPDFModalOpen,
    setRelatorioPDFModalOpen,
    relatorioPDFMode,
    setRelatorioPDFMode,
    selectedCliente,
    limiteDisponivel,
    subtotal,
    valorTotal,
    numValorRecebido,
    troco,
    dinheiroInsuficiente,
    crediarioExcedido,
    creditoLojaExcedido,
    totalSplitPago,
    restanteSplit,
    splitCrediarioExcedido,
    splitCreditoLojaExcedido,
    totalDevolucaoCalculado,
    counts,
    filteredProdutos,
    filteredHistorico,
    drawerStats,
    handleAddSplitPayment,
    handleRemoveSplitPayment,
    abrirModalDevolucao,
    handleConfirmarDevolucao,
    handleAddToCart,
    addItemDirectlyToCart,
    updateQuantity,
    handleFinalizeSale,
    handleConfirmPauseSale,
    handleRetomarVendaEspera,
    handleDescartarVendaEspera,
    handleConfirmarEstorno,
    handleRegistrarSangria,
    handleRegistrarSuprimento,
    handleFecharTurno,
    handleAbrirTurno,
    getProductDisplayStock,
    handleBarcodeOrSearchSubmit,
    getReceiptItemDetails,
    handlePrintReceipt,
  };
}
