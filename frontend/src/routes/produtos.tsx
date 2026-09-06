import { useState, useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Filter,
  Download,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
  Edit2,
  Package,
  Layers,
  Building2,
  History,
  ArrowUpRight,
  ArrowDownRight,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  X,
  Zap,
} from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useProdutosData, useLojasData, useEstoqueData } from "@/hooks/useEstroqueApi";
import { estroqueApi, Produto } from "@/services/estroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Catálogo e SKUs | Estroque" },
      {
        name: "description",
        content:
          "Gerencie o catálogo de produtos do Estroque: SKUs, códigos de barras, saldos de estoque por loja, extrato de movimentações e curva ABC no estilo Bling ERP.",
      },
      { property: "og:title", content: "Produtos — Catálogo e SKUs | Estroque" },
      {
        property: "og:description",
        content: "Catálogo completo de SKUs com margem, curva ABC, saldo por filial e ajuste rápido de estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const queryClient = useQueryClient();
  const { data: lojas } = useLojasData();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    data: produtos,
    isLoading: isLoadingProdutos,
    isFetching: isFetchingProdutos,
    refetch: refetchProdutos,
    criarProduto,
    isCreating,
    atualizarProduto,
    isUpdating,
  } = useProdutosData(debouncedSearch);

  const {
    saldos,
    movimentacoes,
    isFetching: isFetchingEstoque,
    refetch: refetchEstoque,
    movimentarEstoque,
    isMoving,
  } = useEstoqueData();

  // Filtros avançados no estilo Bling
  const [selectedLojaFilter, setSelectedLojaFilter] = useState<string>("TODAS");
  const [filterEstoque, setFilterEstoque] = useState<"TODOS" | "COM_ESTOQUE" | "BAIXO" | "ZERADO">("TODOS");
  const [filterABC, setFilterABC] = useState<string>("Todos");
  const [filterStatus, setFilterStatus] = useState<"Todos" | "Ativos" | "Inativos">("Todos");
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([refetchProdutos(), refetchEstoque()]);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // Helper para saldo de produto considerando o filtro de loja selecionado
  const getSaldoProduto = (produtoId: string, customLojaId?: string): number => {
    const lojaAlvo = customLojaId || selectedLojaFilter;
    if (lojaAlvo === "TODAS") {
      return saldos
        .filter((s) => s.produto_id === produtoId)
        .reduce((sum, s) => sum + s.quantidade, 0);
    }
    const registro = saldos.find((s) => s.produto_id === produtoId && s.loja_id === lojaAlvo);
    return registro ? registro.quantidade : 0;
  };

  // Helper para obter nome da loja
  const getNomeLoja = (id: string) => lojas?.find((l) => l.id === id)?.nome || "Loja";

  // Modal State - Novo Produto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [categoria, setCategoria] = useState("Geral");
  const [quantidadeInicial, setQuantidadeInicial] = useState("");
  const [lojaInicialId, setLojaInicialId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Modal State - Editar Produto
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editPrecoCusto, setEditPrecoCusto] = useState("");
  const [editPrecoVenda, setEditPrecoVenda] = useState("");
  const [editCodigoBarras, setEditCodigoBarras] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  // Modal State - Posição de Estoque por Loja (Bling Style)
  const [selectedProdutoPosicao, setSelectedProdutoPosicao] = useState<Produto | null>(null);

  // Modal State - Lançar Estoque / Ajuste Rápido (Bling Style)
  const [selectedProdutoAjuste, setSelectedProdutoAjuste] = useState<Produto | null>(null);
  const [ajusteLojaId, setAjusteLojaId] = useState("");
  const [ajusteTipo, setAjusteTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [ajusteQtd, setAjusteQtd] = useState("");
  const [ajusteMotivoPreset, setAjusteMotivoPreset] = useState("Compra / NF de Entrada");
  const [ajusteMotivoCustom, setAjusteMotivoCustom] = useState("");
  const [ajusteError, setAjusteError] = useState<string | null>(null);

  // Modal State - Extrato de Movimentações do SKU (Bling Style)
  const [selectedProdutoExtrato, setSelectedProdutoExtrato] = useState<Produto | null>(null);

  // Cálculos de Markup
  const editCustoNum = parseFloat(editPrecoCusto) || 0;
  const editVendaNum = parseFloat(editPrecoVenda) || 0;
  const editMarkupCalculado =
    editCustoNum > 0 ? (((editVendaNum - editCustoNum) / editCustoNum) * 100).toFixed(1) : "0.0";

  const custoNum = parseFloat(precoCusto) || 0;
  const vendaNum = parseFloat(precoVenda) || 0;
  const markupCalculado =
    custoNum > 0 ? (((vendaNum - custoNum) / custoNum) * 100).toFixed(1) : "0.0";

  // Handlers para Edição
  const handleOpenEdit = (p: Produto) => {
    setEditId(p.id);
    setEditNome(p.nome);
    setEditSku(p.sku);
    setEditPrecoCusto(p.preco_custo ? p.preco_custo.toString() : "0");
    setEditPrecoVenda(p.preco_venda ? p.preco_venda.toString() : "0");
    setEditCodigoBarras(p.codigo_barras || "");
    setEditAtivo(Boolean(p.ativo));
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editNome.trim()) {
      setEditError("O nome do produto é obrigatório.");
      return;
    }
    if (editVendaNum <= 0) {
      setEditError("O preço de venda deve ser maior que zero.");
      return;
    }
    try {
      await atualizarProduto({
        id: editId,
        data: {
          nome: editNome.trim(),
          preco_custo: editCustoNum,
          preco_venda: editVendaNum,
          markup: parseFloat(editMarkupCalculado),
          codigo_barras: editCodigoBarras.trim() || null,
          ativo: editAtivo,
        },
      });
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Erro ao atualizar produto.");
    }
  };

  // Handler para Criação
  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nome.trim()) {
      setFormError("O nome do produto é obrigatório.");
      return;
    }
    if (!sku.trim()) {
      setFormError("O SKU é obrigatório.");
      return;
    }
    if (vendaNum <= 0) {
      setFormError("O preço de venda deve ser maior que zero.");
      return;
    }

    try {
      const novoProduto = await criarProduto({
        nome: nome.trim(),
        sku: sku.trim().toUpperCase(),
        preco_custo: custoNum,
        preco_venda: vendaNum,
        markup: parseFloat(markupCalculado),
        codigo_barras: codigoBarras.trim() || null,
      });

      const qtdInicialNum = parseInt(quantidadeInicial, 10) || 0;
      const targetLojaId = lojaInicialId || lojas?.[0]?.id;

      if (qtdInicialNum > 0 && targetLojaId && novoProduto?.id) {
        await estroqueApi.movimentarEstoque({
          loja_id: targetLojaId,
          produto_id: novoProduto.id,
          tipo: "ENTRADA",
          quantidade: qtdInicialNum,
          motivo: "Estoque inicial de cadastro de SKU",
        });
        queryClient.invalidateQueries({ queryKey: ["estoque"] });
        queryClient.invalidateQueries({ queryKey: ["analytics"] });
      }

      setNome("");
      setSku("");
      setPrecoCusto("");
      setPrecoVenda("");
      setCodigoBarras("");
      setCategoria("Geral");
      setQuantidadeInicial("");
      setLojaInicialId("");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao cadastrar produto.");
    }
  };

  // Handlers para Ajuste Rápido de Estoque (Bling Style)
  const handleOpenAjuste = (p: Produto, preLojaId?: string) => {
    setSelectedProdutoAjuste(p);
    const defaultLoja = preLojaId || (selectedLojaFilter !== "TODAS" ? selectedLojaFilter : lojas?.[0]?.id || "");
    setAjusteLojaId(defaultLoja);
    setAjusteTipo("ENTRADA");
    setAjusteQtd("");
    setAjusteMotivoPreset("Compra / NF de Entrada");
    setAjusteMotivoCustom("");
    setAjusteError(null);
  };

  const handleSalvarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    setAjusteError(null);

    if (!selectedProdutoAjuste) return;
    if (!ajusteLojaId) {
      setAjusteError("Selecione a loja ou filial para a movimentação.");
      return;
    }

    const qtdNum = parseInt(ajusteQtd, 10);
    if (!qtdNum || qtdNum <= 0) {
      setAjusteError("Informe uma quantidade válida maior que zero.");
      return;
    }

    const motivoFinal = ajusteMotivoCustom.trim()
      ? `${ajusteMotivoPreset}: ${ajusteMotivoCustom.trim()}`
      : ajusteMotivoPreset;

    try {
      await movimentarEstoque({
        loja_id: ajusteLojaId,
        produto_id: selectedProdutoAjuste.id,
        tipo: ajusteTipo,
        quantidade: qtdNum,
        motivo: motivoFinal,
      });

      setSelectedProdutoAjuste(null);
    } catch (err: any) {
      setAjusteError(err.message || "Erro ao registrar movimentação de estoque.");
    }
  };

  // Filtros aplicados à lista de produtos
  const produtosFiltrados = useMemo(() => {
    if (!produtos) return [];

    return produtos.filter((p, idx) => {
      // Filtro de Status
      if (filterStatus === "Ativos" && !p.ativo) return false;
      if (filterStatus === "Inativos" && p.ativo) return false;

      // Filtro de Curva ABC
      const abcClass = idx % 3 === 0 ? "A" : idx % 3 === 1 ? "B" : "C";
      if (filterABC !== "Todos" && `Classe ${abcClass}` !== filterABC) return false;

      // Filtro de Estoque
      const saldo = getSaldoProduto(p.id);
      if (filterEstoque === "COM_ESTOQUE" && saldo <= 0) return false;
      if (filterEstoque === "BAIXO" && (saldo <= 0 || saldo > 5)) return false;
      if (filterEstoque === "ZERADO" && saldo > 0) return false;

      return true;
    });
  }, [produtos, filterStatus, filterABC, filterEstoque, saldos, selectedLojaFilter]);

  // Indicadores de Catálogo e Capital Imobilizado Real
  const totalSkus = produtos?.length || 0;
  const skusAtivos = produtos?.filter((p) => p.ativo).length || 0;

  const valorTotalCustoEstoque = useMemo(() => {
    if (!produtos || produtos.length === 0) return 0;
    return produtos.reduce((acc, p) => {
      const saldo = getSaldoProduto(p.id);
      return acc + (saldo > 0 ? saldo * p.preco_custo : 0);
    }, 0);
  }, [produtos, saldos, selectedLojaFilter]);

  const valorTotalVendaEstoque = useMemo(() => {
    if (!produtos || produtos.length === 0) return 0;
    return produtos.reduce((acc, p) => {
      const saldo = getSaldoProduto(p.id);
      return acc + (saldo > 0 ? saldo * p.preco_venda : 0);
    }, 0);
  }, [produtos, saldos, selectedLojaFilter]);

  const itensBaixoEstoque = useMemo(() => {
    if (!produtos) return 0;
    return produtos.filter((p) => {
      const s = getSaldoProduto(p.id);
      return s > 0 && s <= 5;
    }).length;
  }, [produtos, saldos, selectedLojaFilter]);

  const itensZerados = useMemo(() => {
    if (!produtos) return 0;
    return produtos.filter((p) => getSaldoProduto(p.id) <= 0).length;
  }, [produtos, saldos, selectedLojaFilter]);

  // Exportação CSV compatível com Excel (UTF-8 com BOM)
  const exportarCsvCatalogo = () => {
    if (!produtosFiltrados || produtosFiltrados.length === 0) return;

    const cabecalho = [
      "SKU",
      "Produto",
      "EAN",
      "Categoria",
      "Preco_Custo",
      "Preco_Venda",
      "Margem_Percentual",
      "Saldo_Estoque",
      "Status",
      "Curva_ABC",
    ];

    const linhas = produtosFiltrados.map((p, idx) => {
      const saldo = getSaldoProduto(p.id);
      const margem =
        p.preco_custo > 0
          ? (((p.preco_venda - p.preco_custo) / p.preco_venda) * 100).toFixed(1)
          : "0.0";
      const abc = idx % 3 === 0 ? "A" : idx % 3 === 1 ? "B" : "C";

      return [
        `"${p.sku}"`,
        `"${p.nome.replace(/"/g, '""')}"`,
        `"${p.codigo_barras || ""}"`,
        `"${p.categoria || "Geral"}"`,
        p.preco_custo.toFixed(2),
        p.preco_venda.toFixed(2),
        margem,
        saldo,
        p.ativo ? "Ativo" : "Inativo",
        abc,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [cabecalho.join(";"), ...linhas].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `catalogo_produtos_${selectedLojaFilter === "TODAS" ? "todas_lojas" : selectedLojaFilter}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Histórico de movimentações para o modal de Extrato do SKU
  const movimentacoesProdutoExtrato = useMemo(() => {
    if (!selectedProdutoExtrato) return [];
    return movimentacoes.filter((m) => m.produto_id === selectedProdutoExtrato.id);
  }, [selectedProdutoExtrato, movimentacoes]);

  return (
    <AppShell
      title="Catálogo de Produtos & Estoque"
      subtitle={`${totalSkus} SKUs cadastrados (${skusAtivos} ativos) · Sincronizado em tempo real`}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Buscar produto por nome, SKU ou código EAN…"
      actions={
        <div className="flex items-center gap-2">
          {/* Seletor de Loja no Cabeçalho (Bling ERP Style) */}
          <div className="relative">
            <select
              value={selectedLojaFilter}
              onChange={(e) => setSelectedLojaFilter(e.target.value)}
              className="appearance-none rounded-xl border border-border bg-card py-2 pl-8 pr-8 text-xs font-semibold text-foreground shadow-bento outline-none transition-all hover:border-forest/40 focus:border-forest"
            >
              <option value="TODAS">🏢 Todas as Filiais (Consolidado)</option>
              {lojas?.map((l) => (
                <option key={l.id} value={l.id}>
                  🏬 {l.nome}
                </option>
              ))}
            </select>
            <Building2 className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetchingProdutos || isFetchingEstoque || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar catálogo e saldos"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${
                isFetchingProdutos || isFetchingEstoque || isManualRefreshing
                  ? "animate-spin text-emerald"
                  : ""
              }`}
            />
          </button>

          <button
            type="button"
            onClick={exportarCsvCatalogo}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Exportar catálogo em CSV (compatível com Excel)"
          >
            <Download className="h-3.5 w-3.5 text-forest" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          <div onClick={() => setIsModalOpen(true)}>
            <PrimaryButton icon={Plus}>Novo produto</PrimaryButton>
          </div>
        </div>
      }
    >
      {/* Cards de Resumo Operacional (Bling Style) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Total de SKUs
            </p>
            <Package className="h-4 w-4 text-emerald" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{totalSkus}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-semibold text-forest">{skusAtivos} ativos</span> no catálogo
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Capital Imobilizado (Custo)
            </p>
            <Layers className="h-4 w-4 text-forest" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            R$ {valorTotalCustoEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Venda potencial: R$ {valorTotalVendaEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Estoque Baixo (1 a 5 un)
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
            {itensBaixoEstoque} {itensBaixoEstoque === 1 ? "item" : "itens"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Necessitam atenção para reposição</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Zerados / Ruptura (0 un)
            </p>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-destructive">
            {itensZerados} {itensZerados === 1 ? "item" : "itens"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Produtos indisponíveis para venda</p>
        </Card>
      </div>

      {/* Barra de Filtros no Estilo Bling ERP */}
      <Card className="mt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle title="Catálogo de Produtos" />
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
              {produtosFiltrados.length} itens encontrados
            </span>
          </div>

          {/* Filtros em Pílulas */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro de Situação de Estoque */}
            <div className="flex rounded-lg border border-border bg-background p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterEstoque("TODOS")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  filterEstoque === "TODOS"
                    ? "bg-mint font-bold text-emerald"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterEstoque("COM_ESTOQUE")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  filterEstoque === "COM_ESTOQUE"
                    ? "bg-mint font-bold text-emerald"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Com Estoque
              </button>
              <button
                type="button"
                onClick={() => setFilterEstoque("BAIXO")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  filterEstoque === "BAIXO"
                    ? "bg-amber-100 font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Estoque Baixo
              </button>
              <button
                type="button"
                onClick={() => setFilterEstoque("ZERADO")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  filterEstoque === "ZERADO"
                    ? "bg-destructive/20 font-bold text-destructive"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Zerados
              </button>
            </div>

            {/* Filtro Curva ABC */}
            <div className="hidden sm:flex rounded-lg border border-border bg-background p-0.5 text-xs">
              {["Todos", "Classe A", "Classe B", "Classe C"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFilterABC(t)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    filterABC === t
                      ? "bg-mint font-bold text-emerald"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Filtro de Status Ativo/Inativo */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-muted-foreground outline-none hover:border-forest/40"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Ativos">Apenas Ativos</option>
              <option value="Inativos">Apenas Inativos</option>
            </select>
          </div>
        </div>

        {/* Tabela de Produtos com Estoque Integrado (Bling Style) */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">SKU / Código</th>
                <th className="pb-3 font-semibold">Produto & EAN</th>
                <th className="pb-3 font-semibold">Preço Custo</th>
                <th className="pb-3 font-semibold">Preço Venda</th>
                <th className="pb-3 font-semibold">Margem</th>
                <th className="pb-3 font-semibold">
                  <div className="flex items-center gap-1">
                    <span>Estoque Atual</span>
                    <span className="text-[10px] font-normal lowercase text-muted-foreground">
                      ({selectedLojaFilter === "TODAS" ? "todas" : getNomeLoja(selectedLojaFilter)})
                    </span>
                  </div>
                </th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">ABC</th>
                <th className="pb-3 text-right font-semibold">Ações Bling</th>
              </tr>
            </thead>
            <tbody>
              {produtosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-muted-foreground">
                    Nenhum produto encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                produtosFiltrados.map((p, idx) => {
                  const saldoAtual = getSaldoProduto(p.id);
                  const marginCalc =
                    p.preco_custo > 0
                      ? (((p.preco_venda - p.preco_custo) / p.preco_venda) * 100).toFixed(1) + "%"
                      : "—";
                  const abcClass = idx % 3 === 0 ? "A" : idx % 3 === 1 ? "B" : "C";

                  // Status de estoque do Bling: Verde (Normal > 5), Amarelo (Baixo 1-5), Vermelho (Zerado <= 0)
                  const estoqueTone =
                    saldoAtual > 5 ? "good" : saldoAtual > 0 ? "warn" : "bad";

                  return (
                    <tr
                      key={p.id || p.sku}
                      className="border-b border-border/50 transition-colors hover:bg-muted/40"
                    >
                      <td className="py-3.5 font-mono text-xs font-semibold text-muted-foreground">
                        {p.sku}
                      </td>
                      <td className="py-3.5">
                        <p className="font-semibold text-foreground">{p.nome}</p>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          {p.codigo_barras ? (
                            <span>EAN: {p.codigo_barras}</span>
                          ) : (
                            <span className="italic">Sem EAN</span>
                          )}
                          <span>·</span>
                          <span>{p.categoria || "Geral"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 text-muted-foreground">
                        R$ {p.preco_custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 font-bold text-foreground">
                        R$ {p.preco_venda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 font-semibold text-forest">{marginCalc}</td>
                      <td className="py-3.5">
                        {/* Chip Interativo de Estoque: Clicar abre detalhamento por loja */}
                        <button
                          type="button"
                          onClick={() => setSelectedProdutoPosicao(p)}
                          className="group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all hover:scale-105"
                          title="Clique para ver posição por filial"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              estoqueTone === "good"
                                ? "bg-emerald"
                                : estoqueTone === "warn"
                                  ? "bg-amber-500"
                                  : "bg-destructive"
                            }`}
                          />
                          <span
                            className={
                              estoqueTone === "good"
                                ? "text-emerald"
                                : estoqueTone === "warn"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-destructive"
                            }
                          >
                            {saldoAtual} un
                          </span>
                          <span className="text-[10px] text-muted-foreground opacity-60 group-hover:opacity-100">
                            🔍
                          </span>
                        </button>
                      </td>
                      <td className="py-3.5">
                        <Chip
                          label={p.ativo ? "Ativo" : "Inativo"}
                          tone={p.ativo ? "good" : "neutral"}
                        />
                      </td>
                      <td className="py-3.5">
                        <Chip
                          label={`Classe ${abcClass}`}
                          tone={abcClass === "A" ? "good" : abcClass === "B" ? "warn" : "neutral"}
                        />
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* ⚡ Lançar Estoque / Ajuste Rápido (Bling ERP) */}
                          <button
                            type="button"
                            onClick={() => handleOpenAjuste(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-forest/30 bg-mint/30 px-2 py-1 text-xs font-semibold text-forest transition-all hover:bg-mint hover:text-emerald active:scale-95"
                            title="Lançar entrada ou saída rápida de estoque neste produto"
                          >
                            <Zap className="h-3 w-3 text-emerald" />
                            <span>Ajustar</span>
                          </button>

                          {/* 📜 Extrato do Produto (Bling ERP) */}
                          <button
                            type="button"
                            onClick={() => setSelectedProdutoExtrato(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground transition-all hover:border-forest/50 hover:text-foreground active:scale-95"
                            title="Ver histórico de movimentações deste SKU"
                          >
                            <History className="h-3 w-3" />
                            <span>Extrato</span>
                          </button>

                          {/* ✏️ Editar Cadastro do Produto */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold text-foreground transition-all hover:border-forest/50 hover:bg-muted active:scale-95"
                            title="Editar dados cadastrais e preços"
                          >
                            <Edit2 className="h-3 w-3 text-forest" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* MODAL 1: POSIÇÃO DE ESTOQUE POR LOJA / FILIAL (BLING STYLE)              */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedProdutoPosicao)}
        onOpenChange={(open) => !open && setSelectedProdutoPosicao(null)}
      >
        <DialogContent className="max-w-xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-emerald" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Posição de Estoque por Filial
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Saldo físico e capital imobilizado por loja para o SKU selecionado.
            </DialogDescription>
          </DialogHeader>

          {selectedProdutoPosicao && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-muted/40 p-3.5">
                <p className="font-semibold text-foreground">{selectedProdutoPosicao.nome}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground font-mono">
                  <span>SKU: {selectedProdutoPosicao.sku}</span>
                  {selectedProdutoPosicao.codigo_barras && (
                    <span>EAN: {selectedProdutoPosicao.codigo_barras}</span>
                  )}
                  <span>
                    Custo: R$ {selectedProdutoPosicao.preco_custo.toFixed(2)} · Venda: R${" "}
                    {selectedProdutoPosicao.preco_venda.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/60 text-left font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="p-2.5">Filial / Depósito</th>
                      <th className="p-2.5 text-center">Saldo Físico</th>
                      <th className="p-2.5 text-right">Valor em Custo</th>
                      <th className="p-2.5 text-right">Valor em Venda</th>
                      <th className="p-2.5 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!lojas || lojas.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                          Nenhuma loja cadastrada.
                        </td>
                      </tr>
                    ) : (
                      lojas.map((l) => {
                        const saldo = getSaldoProduto(selectedProdutoPosicao.id, l.id);
                        const custoTotal = saldo * selectedProdutoPosicao.preco_custo;
                        const vendaTotal = saldo * selectedProdutoPosicao.preco_venda;

                        return (
                          <tr
                            key={l.id}
                            className="border-b border-border/50 transition-colors hover:bg-muted/30"
                          >
                            <td className="p-2.5 font-medium text-foreground">{l.nome}</td>
                            <td className="p-2.5 text-center font-bold">
                              <span
                                className={
                                  saldo > 5
                                    ? "text-emerald"
                                    : saldo > 0
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-destructive"
                                }
                              >
                                {saldo} un
                              </span>
                            </td>
                            <td className="p-2.5 text-right text-muted-foreground">
                              R$ {custoTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5 text-right font-semibold text-foreground">
                              R$ {vendaTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  const p = selectedProdutoPosicao;
                                  setSelectedProdutoPosicao(null);
                                  handleOpenAjuste(p, l.id);
                                }}
                                className="rounded-lg bg-forest/10 px-2 py-1 text-[11px] font-semibold text-forest hover:bg-forest hover:text-mint"
                              >
                                Ajustar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted/80 font-bold text-foreground">
                      <td className="p-2.5">Total Geral Consolidado</td>
                      <td className="p-2.5 text-center text-forest">
                        {getSaldoProduto(selectedProdutoPosicao.id, "TODAS")} un
                      </td>
                      <td className="p-2.5 text-right text-muted-foreground">
                        R${" "}
                        {(
                          getSaldoProduto(selectedProdutoPosicao.id, "TODAS") *
                          selectedProdutoPosicao.preco_custo
                        ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5 text-right text-forest">
                        R${" "}
                        {(
                          getSaldoProduto(selectedProdutoPosicao.id, "TODAS") *
                          selectedProdutoPosicao.preco_venda
                        ).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2.5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <DialogFooter className="mt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedProdutoPosicao;
                    setSelectedProdutoPosicao(null);
                    setSelectedProdutoExtrato(p);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-forest hover:underline"
                >
                  <History className="h-3.5 w-3.5" />
                  Ver extrato de movimentações deste SKU
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProdutoPosicao(null)}
                  className="rounded-full bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: LANÇAR ESTOQUE / AJUSTE RÁPIDO (BLING STYLE)                     */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedProdutoAjuste)}
        onOpenChange={(open) => !open && setSelectedProdutoAjuste(null)}
      >
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Lançar / Ajustar Estoque
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Movimentação manual imediata com registro imutável no ledger contábil.
            </DialogDescription>
          </DialogHeader>

          {ajusteError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{ajusteError}</span>
            </div>
          )}

          {selectedProdutoAjuste && (
            <form onSubmit={handleSalvarAjuste} className="space-y-4 pt-2">
              <div className="rounded-xl bg-muted/40 p-3 text-xs">
                <p className="font-semibold text-foreground">{selectedProdutoAjuste.nome}</p>
                <p className="text-muted-foreground font-mono">SKU: {selectedProdutoAjuste.sku}</p>
              </div>

              {/* Toggle Tipo: Entrada vs Saída */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de Movimentação *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAjusteTipo("ENTRADA");
                      setAjusteMotivoPreset("Compra / NF de Entrada");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      ajusteTipo === "ENTRADA"
                        ? "bg-emerald text-card shadow-md"
                        : "border border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAjusteTipo("SAIDA");
                      setAjusteMotivoPreset("Perda / Avaria / Vencimento");
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      ajusteTipo === "SAIDA"
                        ? "bg-destructive text-destructive-foreground shadow-md"
                        : "border border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Saída (-)
                  </button>
                </div>
              </div>

              {/* Seleção de Loja */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filial / Depósito *
                </label>
                <select
                  value={ajusteLojaId}
                  onChange={(e) => setAjusteLojaId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                >
                  {lojas?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome} ({l.cnpj})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantidade */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quantidade a Movimentar *
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Ex: 10"
                  value={ajusteQtd}
                  onChange={(e) => setAjusteQtd(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground outline-none focus:border-forest"
                />
              </div>

              {/* Motivos Presets do Bling */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Motivo da Operação *
                </label>
                <select
                  value={ajusteMotivoPreset}
                  onChange={(e) => setAjusteMotivoPreset(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                >
                  {ajusteTipo === "ENTRADA" ? (
                    <>
                      <option value="Compra / NF de Entrada">Compra / NF de Entrada</option>
                      <option value="Devolução de Cliente">Devolução de Cliente</option>
                      <option value="Sobra de Inventário">Sobra de Inventário</option>
                      <option value="Bonificação / Brinde Fornecedor">Bonificação / Brinde Fornecedor</option>
                      <option value="Ajuste Manual de Saldo">Ajuste Manual de Saldo</option>
                    </>
                  ) : (
                    <>
                      <option value="Perda / Avaria / Vencimento">Perda / Avaria / Vencimento</option>
                      <option value="Consumo Interno / Uso">Consumo Interno / Uso e Consumo</option>
                      <option value="Devolução ao Fornecedor">Devolução ao Fornecedor</option>
                      <option value="Falta em Inventário">Falta em Inventário</option>
                      <option value="Amostra Grátis / Marketing">Amostra Grátis / Marketing</option>
                      <option value="Ajuste Manual de Saldo">Ajuste Manual de Saldo</option>
                    </>
                  )}
                </select>
              </div>

              {/* Observação Adicional */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Observação / Nº Documento (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: NF 10492 ou Chamado #382"
                  value={ajusteMotivoCustom}
                  onChange={(e) => setAjusteMotivoCustom(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>

              {/* Projeção de Saldo em Tempo Real (Bling Feature) */}
              {(() => {
                const saldoAtualNaLoja = getSaldoProduto(selectedProdutoAjuste.id, ajusteLojaId);
                const qtdVal = parseInt(ajusteQtd, 10) || 0;
                const novoSaldo =
                  ajusteTipo === "ENTRADA"
                    ? saldoAtualNaLoja + qtdVal
                    : saldoAtualNaLoja - qtdVal;

                return (
                  <div className="rounded-xl border border-border/60 bg-muted/40 p-3 text-xs space-y-1">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Saldo atual na filial:</span>
                      <span className="font-bold text-foreground">{saldoAtualNaLoja} un</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t border-border/30 pt-1">
                      <span>Saldo projetado pós-movimentação:</span>
                      <span
                        className={`font-bold ${
                          novoSaldo < 0
                            ? "text-destructive"
                            : novoSaldo > 5
                              ? "text-emerald"
                              : "text-amber-500"
                        }`}
                      >
                        {novoSaldo} un
                      </span>
                    </div>
                    {novoSaldo < 0 && (
                      <p className="text-[11px] text-destructive pt-0.5">
                        Atenção: A saída excede o saldo físico disponível nesta filial!
                      </p>
                    )}
                  </div>
                );
              })()}

              <DialogFooter className="mt-5 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProdutoAjuste(null)}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isMoving}
                  className="flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {isMoving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Confirmar Lançamento"
                  )}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: EXTRATO DE MOVIMENTAÇÕES DO PRODUTO (BLING STYLE)               */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedProdutoExtrato)}
        onOpenChange={(open) => !open && setSelectedProdutoExtrato(null)}
      >
        <DialogContent className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-forest" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Extrato de Movimentações do SKU
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Histórico contábil completo de entradas, saídas e auditorias físicas deste produto.
            </DialogDescription>
          </DialogHeader>

          {selectedProdutoExtrato && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3.5">
                <div>
                  <p className="font-semibold text-foreground">{selectedProdutoExtrato.nome}</p>
                  <p className="text-xs text-muted-foreground font-mono">
                    SKU: {selectedProdutoExtrato.sku}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Saldo Consolidado</p>
                  <p className="font-display text-xl font-bold text-emerald">
                    {getSaldoProduto(selectedProdutoExtrato.id, "TODAS")} un
                  </p>
                </div>
              </div>

              <div className="max-h-[350px] overflow-y-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="sticky top-0 border-b border-border bg-muted/90 backdrop-blur text-left font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="p-2.5">Data & Hora</th>
                      <th className="p-2.5">Tipo</th>
                      <th className="p-2.5 text-center">Qtd</th>
                      <th className="p-2.5">Motivo / Documento</th>
                      <th className="p-2.5">Filial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimentacoesProdutoExtrato.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Nenhuma movimentação registrada no histórico deste produto.
                        </td>
                      </tr>
                    ) : (
                      movimentacoesProdutoExtrato.map((m) => {
                        const isPositivo =
                          m.tipo === "ENTRADA" ||
                          m.tipo_movimentacao === "ENTRADA" ||
                          m.tipo_movimentacao === "AJUSTE_POSITIVO" ||
                          m.quantidade > 0;

                        return (
                          <tr
                            key={m.id}
                            className="border-b border-border/40 transition-colors hover:bg-muted/30"
                          >
                            <td className="p-2.5 text-muted-foreground">
                              {new Date(m.data_movimentacao).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                  isPositivo
                                    ? "bg-mint text-emerald"
                                    : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                {m.tipo || m.tipo_movimentacao || "AJUSTE"}
                              </span>
                            </td>
                            <td
                              className={`p-2.5 text-center font-bold ${
                                isPositivo ? "text-emerald" : "text-destructive"
                              }`}
                            >
                              {isPositivo ? `+${Math.abs(m.quantidade)}` : `-${Math.abs(m.quantidade)}`}
                            </td>
                            <td className="p-2.5 text-foreground">
                              {m.motivo || m.observacao || "Movimentação manual"}
                            </td>
                            <td className="p-2.5 text-muted-foreground">{getNomeLoja(m.loja_id)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="mt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    const p = selectedProdutoExtrato;
                    setSelectedProdutoExtrato(null);
                    handleOpenAjuste(p);
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-forest/10 px-3 py-1.5 text-xs font-semibold text-forest hover:bg-forest hover:text-mint"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Lançar nova movimentação neste SKU
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedProdutoExtrato(null)}
                  className="rounded-full bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: NOVO PRODUTO                                                     */}
      {/* ========================================================================= */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Novo Produto</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um novo SKU no catálogo com precificação por markup e sincronização com o
              banco.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSalvarProduto} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do Produto *
              </label>
              <input
                required
                type="text"
                placeholder="Ex: Fone Bluetooth ANC Pro"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SKU / Código *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ex: SKU-90218"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm uppercase text-foreground outline-none focus:border-forest"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Código de Barras (EAN)
                </label>
                <input
                  type="text"
                  placeholder="7891234567890"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preço de Custo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={precoCusto}
                  onChange={(e) => setPrecoCusto(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preço de Venda (R$) *
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={precoVenda}
                  onChange={(e) => setPrecoVenda(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground outline-none focus:border-forest"
                />
              </div>
            </div>

            <div className="rounded-xl bg-muted/60 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Markup calculado:</span>
              <span className="font-bold text-forest">{markupCalculado}%</span>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Estoque Inicial (Opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0 un"
                  value={quantidadeInicial}
                  onChange={(e) => setQuantidadeInicial(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Loja de Entrada
                </label>
                <select
                  value={lojaInicialId || lojas?.[0]?.id || ""}
                  onChange={(e) => setLojaInicialId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                >
                  {!lojas || lojas.length === 0 ? (
                    <option value="">Nenhuma loja cadastrada</option>
                  ) : (
                    lojas.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.nome}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Produto"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 5: EDITAR PRODUTO                                                   */}
      {/* ========================================================================= */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Editar Produto</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Altere preços, margem e dados cadastrais. O SKU e Tenant são imutáveis.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleSalvarEdicao} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome do Produto *
              </label>
              <input
                required
                type="text"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  SKU (Imutável)
                </label>
                <input
                  disabled
                  type="text"
                  value={editSku}
                  className="w-full rounded-xl border border-border/50 bg-muted/70 px-3.5 py-2.5 font-mono text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Código de Barras (EAN)
                </label>
                <input
                  type="text"
                  placeholder="7891234567890"
                  value={editCodigoBarras}
                  onChange={(e) => setEditCodigoBarras(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preço de Custo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editPrecoCusto}
                  onChange={(e) => setEditPrecoCusto(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Preço de Venda (R$) *
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={editPrecoVenda}
                  onChange={(e) => setEditPrecoVenda(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground outline-none focus:border-forest"
                />
              </div>
            </div>

            <div className="rounded-xl bg-muted/60 p-3 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Markup recalculado:</span>
              <span className="font-bold text-forest">{editMarkupCalculado}%</span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Status do Produto</p>
                <p className="text-xs text-muted-foreground">
                  Ativar ou inativar no catálogo e PDV
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditAtivo(!editAtivo)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  editAtivo ? "bg-forest" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    editAtivo ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
