import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ClipboardList,
  AlertTriangle,
  Warehouse,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Download,
  Filter,
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  History,
  Zap,
  TrendingDown,
  Layers,
  Building2,
  Package,
  Boxes,
} from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useEstoqueData, useLojasData, useProdutosData } from "@/hooks/useEstroqueApi";
import { Produto } from "@/services/estroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque & Saldos — Gestão Completa | Estroque" },
      {
        name: "description",
        content:
          "Gestão física e contábil de estoque no estilo Bling ERP: saldos por filial, ledger imutável, balanço de inventário físico e ponto de pedido.",
      },
      { property: "og:title", content: "Estoque & Saldos — Gestão Completa | Estroque" },
      {
        property: "og:description",
        content:
          "Saldos em tempo real por loja, alertas de ruptura, ledger contábil e auditoria física às cegas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstoquePage,
});

type TabOption = "posicao" | "extrato" | "balanco" | "ruptura";

function EstoquePage() {
  const {
    saldos,
    movimentacoes,
    isFetching,
    refetch,
    auditarEstoque,
    isAuditing,
    movimentarEstoque,
    isMoving,
  } = useEstoqueData();

  const { data: lojas } = useLojasData();
  const { data: produtos } = useProdutosData();

  // Navegação por Abas no estilo Bling ERP
  const [activeTab, setActiveTab] = useState<TabOption>("posicao");

  // Filtros Globais
  const [selectedLojaFilter, setSelectedLojaFilter] = useState<string>("TODAS");
  const [searchTerm, setSearchTerm] = useState("");
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  // Filtro específico para o Extrato / Ledger
  const [filtroTipoMovimentacao, setFiltroTipoMovimentacao] = useState<string>("TODAS");

  // Modal State - Lançar Movimentação Avulsa (Bling Style)
  const [isMovimentacaoModalOpen, setIsMovimentacaoModalOpen] = useState(false);
  const [movProdutoId, setMovProdutoId] = useState("");
  const [movLojaId, setMovLojaId] = useState("");
  const [movTipo, setMovTipo] = useState<"ENTRADA" | "SAIDA">("ENTRADA");
  const [movQuantidade, setMovQuantidade] = useState("");
  const [movMotivoPreset, setMovMotivoPreset] = useState("Compra / NF de Entrada");
  const [movMotivoCustom, setMovMotivoCustom] = useState("");
  const [movError, setMovError] = useState<string | null>(null);

  // Modal State - Extrato de Produto Específico
  const [extratoProdutoModal, setExtratoProdutoModal] = useState<Produto | null>(null);

  // Form State - Auditoria / Balanço Físico
  const [auditLojaId, setAuditLojaId] = useState("");
  const [auditProdutoId, setAuditProdutoId] = useState("");
  const [auditQuantidadeFisica, setAuditQuantidadeFisica] = useState("");
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditSuccess, setAuditSuccess] = useState<string | null>(null);

  const activeAuditLojaId = auditLojaId || lojas?.[0]?.id || "";
  const activeAuditProdutoId = auditProdutoId || produtos?.[0]?.id || "";

  const saldoAtualAudit = useMemo(() => {
    return (
      saldos.find((s) => s.loja_id === activeAuditLojaId && s.produto_id === activeAuditProdutoId)
        ?.quantidade || 0
    );
  }, [saldos, activeAuditLojaId, activeAuditProdutoId]);

  const contagemNum = parseInt(auditQuantidadeFisica, 10);
  const temContagem = !isNaN(contagemNum) && auditQuantidadeFisica.trim() !== "";
  const divergenciaAudit = temContagem ? contagemNum - saldoAtualAudit : 0;

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // Helpers de Nomes
  const getNomeLoja = (id: string) => lojas?.find((l) => l.id === id)?.nome || "Loja";
  const getProdutoById = (id: string) => produtos?.find((p) => p.id === id);

  // Handlers para Lançamento de Movimentação Avulsa (Bling)
  const handleOpenMovimentacao = (preProdutoId?: string, preLojaId?: string) => {
    setMovProdutoId(preProdutoId || produtos?.[0]?.id || "");
    const defaultLoja = preLojaId || (selectedLojaFilter !== "TODAS" ? selectedLojaFilter : lojas?.[0]?.id || "");
    setMovLojaId(defaultLoja);
    setMovTipo("ENTRADA");
    setMovQuantidade("");
    setMovMotivoPreset("Compra / NF de Entrada");
    setMovMotivoCustom("");
    setMovError(null);
    setIsMovimentacaoModalOpen(true);
  };

  const handleSalvarMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setMovError(null);

    if (!movProdutoId) {
      setMovError("Selecione o produto.");
      return;
    }
    if (!movLojaId) {
      setMovError("Selecione a filial / loja.");
      return;
    }

    const qtd = parseInt(movQuantidade, 10);
    if (!qtd || qtd <= 0) {
      setMovError("Informe uma quantidade válida maior que zero.");
      return;
    }

    const motivoCompleto = movMotivoCustom.trim()
      ? `${movMotivoPreset}: ${movMotivoCustom.trim()}`
      : movMotivoPreset;

    try {
      await movimentarEstoque({
        loja_id: movLojaId,
        produto_id: movProdutoId,
        tipo: movTipo,
        quantidade: qtd,
        motivo: motivoCompleto,
      });

      setIsMovimentacaoModalOpen(false);
    } catch (err: any) {
      setMovError(err.message || "Erro ao salvar movimentação de estoque.");
    }
  };

  // Handler para Auditoria / Balanço
  const handleExecutarAuditoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuditError(null);
    setAuditSuccess(null);

    if (!activeAuditLojaId) {
      setAuditError("Selecione a loja física.");
      return;
    }
    if (!activeAuditProdutoId) {
      setAuditError("Selecione o produto.");
      return;
    }
    if (!temContagem || contagemNum < 0) {
      setAuditError("Informe uma contagem física válida (maior ou igual a zero).");
      return;
    }

    try {
      await auditarEstoque({
        loja_id: activeAuditLojaId,
        itens: [
          {
            produto_id: activeAuditProdutoId,
            quantidade_fisica: contagemNum,
          },
        ],
      });

      setAuditSuccess(
        `Inventário concluído com sucesso! Saldo atualizado para ${contagemNum} unidades na filial ${getNomeLoja(
          activeAuditLojaId
        )}.`
      );
      setAuditQuantidadeFisica("");
    } catch (err: any) {
      setAuditError(err.message || "Erro ao salvar contagem de inventário.");
    }
  };

  // Cálculos Consolidados e Indicadores Globais
  const totalUnidades = useMemo(() => {
    if (selectedLojaFilter === "TODAS") {
      return saldos.reduce((acc, s) => acc + s.quantidade, 0);
    }
    return saldos
      .filter((s) => s.loja_id === selectedLojaFilter)
      .reduce((acc, s) => acc + s.quantidade, 0);
  }, [saldos, selectedLojaFilter]);

  const valorTotalImobilizado = useMemo(() => {
    return saldos.reduce((acc, s) => {
      if (selectedLojaFilter !== "TODAS" && s.loja_id !== selectedLojaFilter) return acc;
      const prod = getProdutoById(s.produto_id);
      const custo = prod?.preco_custo || 0;
      return acc + (s.quantidade > 0 ? s.quantidade * custo : 0);
    }, 0);
  }, [saldos, produtos, selectedLojaFilter]);

  // Lista de Posição de Estoque Filtrada (Aba 1)
  const saldosFiltrados = useMemo(() => {
    return saldos.filter((s) => {
      if (selectedLojaFilter !== "TODAS" && s.loja_id !== selectedLojaFilter) return false;
      if (searchTerm.trim()) {
        const prod = getProdutoById(s.produto_id);
        const term = searchTerm.toLowerCase();
        const matchesName = prod?.nome.toLowerCase().includes(term);
        const matchesSku = prod?.sku.toLowerCase().includes(term);
        const matchesEan = prod?.codigo_barras?.toLowerCase().includes(term);
        if (!matchesName && !matchesSku && !matchesEan) return false;
      }
      return true;
    });
  }, [saldos, selectedLojaFilter, searchTerm, produtos]);

  // Movimentações Filtradas (Aba 2)
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter((m) => {
      if (selectedLojaFilter !== "TODAS" && m.loja_id !== selectedLojaFilter) return false;

      // Filtro de tipo
      const tipoReal = (m.tipo || m.tipo_movimentacao || "").toUpperCase();
      if (filtroTipoMovimentacao === "ENTRADA" && !tipoReal.includes("ENTRADA") && m.quantidade <= 0)
        return false;
      if (filtroTipoMovimentacao === "SAIDA" && !tipoReal.includes("SAIDA") && m.quantidade >= 0)
        return false;
      if (filtroTipoMovimentacao === "AJUSTE" && !tipoReal.includes("AJUSTE")) return false;

      // Filtro de busca textual
      if (searchTerm.trim()) {
        const prod = getProdutoById(m.produto_id);
        const term = searchTerm.toLowerCase();
        const matchesName = prod?.nome.toLowerCase().includes(term);
        const matchesSku = prod?.sku.toLowerCase().includes(term);
        const matchesMotivo = (m.motivo || m.observacao || "").toLowerCase().includes(term);
        if (!matchesName && !matchesSku && !matchesMotivo) return false;
      }

      return true;
    });
  }, [movimentacoes, selectedLojaFilter, filtroTipoMovimentacao, searchTerm, produtos]);

  // Alertas de Ruptura & Ponto de Reposição (Aba 4)
  const itensRuptura = useMemo(() => {
    if (!produtos) return [];

    const resultado: Array<{
      produto: Produto;
      lojaId: string;
      saldo: number;
      status: "ZERADO" | "CRITICO" | "BAIXO";
      sugestao: number;
    }> = [];

    const lojasAlvo =
      selectedLojaFilter === "TODAS" ? lojas || [] : (lojas || []).filter((l) => l.id === selectedLojaFilter);

    for (const prod of produtos) {
      for (const loja of lojasAlvo) {
        const s = saldos.find((item) => item.produto_id === prod.id && item.loja_id === loja.id);
        const qtd = s ? s.quantidade : 0;

        if (qtd <= 5) {
          resultado.push({
            produto: prod,
            lojaId: loja.id,
            saldo: qtd,
            status: qtd <= 0 ? "ZERADO" : qtd <= 2 ? "CRITICO" : "BAIXO",
            sugestao: Math.max(15, 20 - qtd),
          });
        }
      }
    }

    return resultado;
  }, [produtos, lojas, saldos, selectedLojaFilter]);

  // Exportação CSV das telas de estoque
  const exportarCsv = () => {
    if (activeTab === "posicao") {
      const cabecalho = [
        "Filial",
        "SKU",
        "Produto",
        "Saldo_Fisico",
        "Preco_Custo",
        "Valor_Total_Custo",
        "Preco_Venda",
        "Valor_Total_Venda",
      ];
      const linhas = saldosFiltrados.map((s) => {
        const prod = getProdutoById(s.produto_id);
        const custo = prod?.preco_custo || 0;
        const venda = prod?.preco_venda || 0;
        return [
          `"${getNomeLoja(s.loja_id)}"`,
          `"${prod?.sku || ""}"`,
          `"${(prod?.nome || "").replace(/"/g, '""')}"`,
          s.quantidade,
          custo.toFixed(2),
          (s.quantidade * custo).toFixed(2),
          venda.toFixed(2),
          (s.quantidade * venda).toFixed(2),
        ].join(";");
      });

      const csvContent = "\uFEFF" + [cabecalho.join(";"), ...linhas].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `posicao_estoque_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    } else if (activeTab === "extrato") {
      const cabecalho = ["Data_Hora", "Filial", "SKU", "Produto", "Tipo", "Quantidade", "Motivo_Documento"];
      const linhas = movimentacoesFiltradas.map((m) => {
        const prod = getProdutoById(m.produto_id);
        return [
          new Date(m.data_movimentacao).toISOString(),
          `"${getNomeLoja(m.loja_id)}"`,
          `"${prod?.sku || ""}"`,
          `"${(prod?.nome || "").replace(/"/g, '""')}"`,
          m.tipo || m.tipo_movimentacao || "AJUSTE",
          m.quantidade,
          `"${(m.motivo || m.observacao || "").replace(/"/g, '""')}"`,
        ].join(";");
      });

      const csvContent = "\uFEFF" + [cabecalho.join(";"), ...linhas].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `extrato_movimentacoes_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
    }
  };

  return (
    <AppShell
      title="Gestão de Estoque & Saldos"
      subtitle={`${totalUnidades} unidades físicas registradas · Ledger auditável`}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Buscar por produto, SKU, EAN ou documento…"
      actions={
        <div className="flex items-center gap-2">
          {/* Seletor Global de Loja */}
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

          {/* Botão Atualizar */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar saldos e extrato"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${
                isFetching || isManualRefreshing ? "animate-spin text-emerald" : ""
              }`}
            />
          </button>

          {/* Botão Exportar CSV */}
          <button
            type="button"
            onClick={exportarCsv}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Exportar dados em CSV compatível com Excel"
          >
            <Download className="h-3.5 w-3.5 text-forest" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {/* Botão Lançar Movimentação Avulsa (Bling) */}
          <button
            type="button"
            onClick={() => handleOpenMovimentacao()}
            className="flex items-center gap-1.5 rounded-full border border-forest/40 bg-mint/50 px-3.5 py-2 text-xs font-bold text-forest shadow-sm transition-all hover:bg-mint active:scale-95"
          >
            <Zap className="h-3.5 w-3.5 text-emerald" />
            <span>Lançar Movimentação</span>
          </button>

          {/* Botão Novo Inventário */}
          <div onClick={() => setActiveTab("balanco")}>
            <PrimaryButton icon={ClipboardList}>Balanço Físico</PrimaryButton>
          </div>
        </div>
      }
    >
      {/* Cards de Resumo Operacional de Estoque */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Unidades em Estoque
            </p>
            <Boxes className="h-4 w-4 text-emerald" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {totalUnidades.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Em {selectedLojaFilter === "TODAS" ? "todas as filiais" : getNomeLoja(selectedLojaFilter)}
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
            R$ {valorTotalImobilizado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Valor contábil em prateleira</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Alertas de Ruptura
            </p>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-amber-600 dark:text-amber-400">
            {itensRuptura.length} {itensRuptura.length === 1 ? "alerta" : "alertas"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Produtos zerados ou com estoque crítico</p>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Total de Lojas Ativas
            </p>
            <Building2 className="h-4 w-4 text-emerald" />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {lojas?.length || 0}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Filiais integradas ao estoque unificado</p>
        </Card>
      </div>

      {/* Navegação em Abas (Bling ERP Style) */}
      <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("posicao")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "posicao"
              ? "bg-forest text-mint shadow-md"
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Boxes className="h-4 w-4" />
          <span>Posição de Estoque Geral</span>
          <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px]">
            {saldosFiltrados.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("extrato")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "extrato"
              ? "bg-forest text-mint shadow-md"
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          <span>Extrato de Movimentações (Ledger)</span>
          <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px]">
            {movimentacoesFiltradas.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("balanco")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "balanco"
              ? "bg-forest text-mint shadow-md"
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Balanço / Inventário Físico</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ruptura")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === "ruptura"
              ? "bg-forest text-mint shadow-md"
              : "bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>Alertas de Ruptura & Reposição</span>
          {itensRuptura.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-500 font-bold">
              {itensRuptura.length}
            </span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* ABA 1: POSIÇÃO DE ESTOQUE GERAL (BLING ERP)                               */}
      {/* ========================================================================= */}
      {activeTab === "posicao" && (
        <Card className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <CardTitle
              title="Posição Consolidada de Estoque Físico"
              hint="Saldos por filial e capital imobilizado"
            />
            <span className="text-xs text-muted-foreground">
              Exibindo {saldosFiltrados.length} registros de saldo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="pb-3 font-semibold">SKU</th>
                  <th className="pb-3 font-semibold">Produto</th>
                  <th className="pb-3 font-semibold">Filial / Loja</th>
                  <th className="pb-3 font-semibold">Saldo Atual</th>
                  <th className="pb-3 font-semibold">Custo Unitário</th>
                  <th className="pb-3 font-semibold">Valor em Custo</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 text-right font-semibold">Ações Bling</th>
                </tr>
              </thead>
              <tbody>
                {saldosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-xs text-muted-foreground">
                      Nenhum registro de saldo encontrado para a filial selecionada.
                    </td>
                  </tr>
                ) : (
                  saldosFiltrados.map((s) => {
                    const prod = getProdutoById(s.produto_id);
                    const custo = prod?.preco_custo || 0;
                    const valorCusto = s.quantidade * custo;
                    const tone = s.quantidade > 5 ? "good" : s.quantidade > 0 ? "warn" : "bad";

                    return (
                      <tr
                        key={s.id}
                        className="border-b border-border/50 transition-colors hover:bg-muted/40"
                      >
                        <td className="py-3 font-mono text-xs font-semibold text-muted-foreground">
                          {prod?.sku || "—"}
                        </td>
                        <td className="py-3 font-semibold text-foreground">
                          {prod?.nome || `Produto ${s.produto_id.slice(0, 8)}`}
                        </td>
                        <td className="py-3 text-muted-foreground">{getNomeLoja(s.loja_id)}</td>
                        <td className="py-3 font-bold text-foreground">
                          <span
                            className={
                              tone === "good"
                                ? "text-emerald"
                                : tone === "warn"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-destructive"
                            }
                          >
                            {s.quantidade} un
                          </span>
                        </td>
                        <td className="py-3 text-muted-foreground">
                          R$ {custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 font-semibold text-foreground">
                          R$ {valorCusto.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3">
                          <Chip
                            label={
                              tone === "good" ? "Normal" : tone === "warn" ? "Baixo" : "Zerado"
                            }
                            tone={tone}
                          />
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenMovimentacao(s.produto_id, s.loja_id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-forest/30 bg-mint/30 px-2.5 py-1 text-xs font-semibold text-forest hover:bg-mint hover:text-emerald active:scale-95"
                              title="Lançar ajuste manual neste saldo"
                            >
                              <Zap className="h-3 w-3 text-emerald" />
                              <span>Ajustar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => prod && setExtratoProdutoModal(prod)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground active:scale-95"
                              title="Ver histórico de movimentações deste produto"
                            >
                              <History className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="bg-muted/60 font-bold text-foreground text-xs">
                  <td colSpan={3} className="py-3 px-2">
                    Totalização Geral
                  </td>
                  <td className="py-3 text-emerald font-display text-sm">{totalUnidades} un</td>
                  <td></td>
                  <td className="py-3 text-forest font-display text-sm">
                    R$ {valorTotalImobilizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ABA 2: EXTRATO GERAL / LEDGER CONTÁBIL (BLING ERP)                        */}
      {/* ========================================================================= */}
      {activeTab === "extrato" && (
        <Card className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <CardTitle
              title="Ledger de Movimentações"
              hint="Registro imutável e cronológico de entradas, saídas e balanços"
            />
            {/* Filtros de Tipo de Movimentação */}
            <div className="flex rounded-lg border border-border bg-background p-0.5 text-xs">
              {["TODAS", "ENTRADA", "SAIDA", "AJUSTE"].map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setFiltroTipoMovimentacao(tipo)}
                  className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                    filtroTipoMovimentacao === tipo
                      ? "bg-mint font-bold text-emerald"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tipo === "TODAS"
                    ? "Todas"
                    : tipo === "ENTRADA"
                      ? "Entradas"
                      : tipo === "SAIDA"
                        ? "Saídas"
                        : "Ajustes/Balanços"}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="pb-3 font-semibold">Data & Hora</th>
                  <th className="pb-3 font-semibold">Produto / Ref</th>
                  <th className="pb-3 font-semibold">Tipo</th>
                  <th className="pb-3 font-semibold">Quantidade</th>
                  <th className="pb-3 font-semibold">Motivo / Documento</th>
                  <th className="pb-3 font-semibold">Filial</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-muted-foreground">
                      Nenhuma movimentação encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  movimentacoesFiltradas.map((m) => {
                    const prod = getProdutoById(m.produto_id);
                    const isPositivo =
                      m.tipo === "ENTRADA" ||
                      m.tipo_movimentacao === "ENTRADA" ||
                      m.tipo_movimentacao === "AJUSTE_POSITIVO" ||
                      m.quantidade > 0;

                    return (
                      <tr
                        key={m.id}
                        className="border-b border-border/50 transition-colors hover:bg-muted/40"
                      >
                        <td className="py-3 text-xs text-muted-foreground font-mono">
                          {new Date(m.data_movimentacao).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3">
                          <p className="font-semibold text-foreground">
                            {prod?.nome || `Produto ${m.produto_id.slice(0, 8)}`}
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            SKU: {prod?.sku || "—"}
                          </p>
                        </td>
                        <td className="py-3">
                          <Chip
                            label={m.tipo || m.tipo_movimentacao || "AJUSTE"}
                            tone={isPositivo ? "good" : "bad"}
                          />
                        </td>
                        <td
                          className={`py-3 font-bold ${
                            isPositivo ? "text-emerald" : "text-destructive"
                          }`}
                        >
                          {isPositivo ? `+${Math.abs(m.quantidade)}` : `-${Math.abs(m.quantidade)}`}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {m.motivo || m.observacao || "Movimentação manual de estoque"}
                        </td>
                        <td className="py-3 text-muted-foreground">{getNomeLoja(m.loja_id)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* ABA 3: BALANÇO / INVENTÁRIO FÍSICO (BLING ERP)                            */}
      {/* ========================================================================= */}
      {activeTab === "balanco" && (
        <div className="mt-4 grid gap-5 lg:grid-cols-12">
          {/* Formulário de Auditoria Física */}
          <Card className="lg:col-span-7">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <ClipboardList className="h-5 w-5 text-forest" />
              <CardTitle
                title="Conferência de Inventário Físico"
                hint="Ajuste automático de divergências contábeis"
              />
            </div>

            {auditError && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{auditError}</span>
              </div>
            )}

            {auditSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-mint/60 p-3 text-xs font-semibold text-emerald">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{auditSuccess}</span>
              </div>
            )}

            <form onSubmit={handleExecutarAuditoria} className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Filial / Loja *
                </label>
                <select
                  value={activeAuditLojaId}
                  onChange={(e) => setAuditLojaId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                >
                  {lojas?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome} ({l.cnpj})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Produto a Conferir *
                </label>
                <select
                  value={activeAuditProdutoId}
                  onChange={(e) => setAuditProdutoId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                >
                  {produtos?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — SKU: {p.sku}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quantidade Física Contada na Prateleira *
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  placeholder="Ex: 25"
                  value={auditQuantidadeFisica}
                  onChange={(e) => setAuditQuantidadeFisica(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground outline-none focus:border-forest"
                />
              </div>

              {/* Apuração de Divergência em Tempo Real */}
              <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-xs border border-border/40">
                <div className="flex justify-between text-muted-foreground">
                  <span>Saldo registrado no sistema:</span>
                  <span className="font-bold text-foreground">{saldoAtualAudit} un</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Contagem física informada:</span>
                  <span className="font-bold text-foreground">
                    {temContagem ? `${contagemNum} un` : "—"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border/40 pt-2 font-semibold">
                  <span>Divergência apurada:</span>
                  <span
                    className={
                      divergenciaAudit > 0
                        ? "text-emerald font-bold"
                        : divergenciaAudit < 0
                          ? "text-destructive font-bold"
                          : "text-muted-foreground"
                    }
                  >
                    {!temContagem
                      ? "Aguardando contagem física"
                      : divergenciaAudit === 0
                        ? "0 un (Estoque conferido / 100% exato)"
                        : divergenciaAudit > 0
                          ? `+${divergenciaAudit} un (Sobra física / Ajuste positivo)`
                          : `${divergenciaAudit} un (Falta física / Ajuste negativo)`}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isAuditing}
                  className="flex items-center gap-2 rounded-full bg-forest px-6 py-2.5 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {isAuditing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Processando balanço...
                    </>
                  ) : (
                    "Processar Inventário e Atualizar Saldo"
                  )}
                </button>
              </div>
            </form>
          </Card>

          {/* Dicas e Instruções Operacionais de Balanço */}
          <Card className="lg:col-span-5">
            <CardTitle title="Como Funciona o Balanço no Bling?" hint="Boas práticas" />
            <div className="mt-4 space-y-3 text-xs text-muted-foreground">
              <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                <p className="font-semibold text-foreground">1. Contagem Cega de Prateleira</p>
                <p className="mt-1">
                  O operador conta as peças reais sem viés. Ao digitar o valor, o sistema compara
                  com o saldo contábil.
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                <p className="font-semibold text-foreground">2. Ajuste Automático</p>
                <p className="mt-1">
                  Se houver divergência, o sistema gera automaticamente uma movimentação de ajuste no
                  ledger imutável para equalizar os saldos.
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
                <p className="font-semibold text-foreground">3. Rastreabilidade Completa</p>
                <p className="mt-1">
                  Todas as alterações ficam registradas no extrato com data, hora, loja e motivo de
                  auditoria.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ABA 4: ALERTAS DE RUPTURA & REPOSIÇÃO (BLING ERP)                         */}
      {/* ========================================================================= */}
      {activeTab === "ruptura" && (
        <Card className="mt-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border/40 pb-3">
            <CardTitle
              title="Ponto de Reposição & Alertas de Ruptura"
              hint="Itens zerados ou com estoque crítico necessitando compra"
            />
            <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
              {itensRuptura.length} SKUs com alerta de reposição
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="pb-3 font-semibold">SKU</th>
                  <th className="pb-3 font-semibold">Produto</th>
                  <th className="pb-3 font-semibold">Filial</th>
                  <th className="pb-3 font-semibold">Saldo Atual</th>
                  <th className="pb-3 font-semibold">Situação</th>
                  <th className="pb-3 font-semibold">Sugestão de Reposição</th>
                  <th className="pb-3 text-right font-semibold">Ação Rápida</th>
                </tr>
              </thead>
              <tbody>
                {itensRuptura.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-emerald font-semibold">
                      🎉 Excelente! Nenhum produto com estoque crítico ou ruptura no momento.
                    </td>
                  </tr>
                ) : (
                  itensRuptura.map((item, idx) => (
                    <tr
                      key={`${item.produto.id}-${item.lojaId}-${idx}`}
                      className="border-b border-border/50 transition-colors hover:bg-muted/40"
                    >
                      <td className="py-3 font-mono text-xs font-semibold text-muted-foreground">
                        {item.produto.sku}
                      </td>
                      <td className="py-3 font-semibold text-foreground">{item.produto.nome}</td>
                      <td className="py-3 text-muted-foreground">{getNomeLoja(item.lojaId)}</td>
                      <td className="py-3 font-bold">
                        <span
                          className={
                            item.status === "ZERADO"
                              ? "text-destructive"
                              : "text-amber-600 dark:text-amber-400"
                          }
                        >
                          {item.saldo} un
                        </span>
                      </td>
                      <td className="py-3">
                        <Chip
                          label={
                            item.status === "ZERADO"
                              ? "Zerado / Ruptura"
                              : item.status === "CRITICO"
                                ? "Crítico (<=2 un)"
                                : "Baixo (<=5 un)"
                          }
                          tone={item.status === "ZERADO" ? "bad" : "warn"}
                        />
                      </td>
                      <td className="py-3 font-semibold text-foreground">
                        + {item.sugestao} un recomendadas
                      </td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenMovimentacao(item.produto.id, item.lojaId)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-forest/30 bg-mint/40 px-3 py-1 text-xs font-bold text-forest hover:bg-mint hover:text-emerald active:scale-95"
                        >
                          <Zap className="h-3 w-3 text-emerald" />
                          <span>Repor Estoque</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LANÇAR MOVIMENTAÇÃO AVULSA (BLING ERP)                             */}
      {/* ========================================================================= */}
      <Dialog open={isMovimentacaoModalOpen} onOpenChange={setIsMovimentacaoModalOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Lançar Movimentação de Estoque
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Entrada ou saída manual avulsa com registro contábil e auditoria no ledger.
            </DialogDescription>
          </DialogHeader>

          {movError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{movError}</span>
            </div>
          )}

          <form onSubmit={handleSalvarMovimentacao} className="space-y-4 pt-2">
            {/* Toggle Tipo: Entrada vs Saída */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tipo de Operação *
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMovTipo("ENTRADA");
                    setMovMotivoPreset("Compra / NF de Entrada");
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    movTipo === "ENTRADA"
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
                    setMovTipo("SAIDA");
                    setMovMotivoPreset("Perda / Avaria / Vencimento");
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                    movTipo === "SAIDA"
                      ? "bg-destructive text-destructive-foreground shadow-md"
                      : "border border-border bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <ArrowDownRight className="h-4 w-4" />
                  Saída (-)
                </button>
              </div>
            </div>

            {/* Seleção de Produto */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Produto *
              </label>
              <select
                value={movProdutoId}
                onChange={(e) => setMovProdutoId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              >
                {produtos?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} — SKU: {p.sku}
                  </option>
                ))}
              </select>
            </div>

            {/* Seleção de Filial */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Filial / Loja *
              </label>
              <select
                value={movLojaId}
                onChange={(e) => setMovLojaId(e.target.value)}
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
                value={movQuantidade}
                onChange={(e) => setMovQuantidade(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-bold text-foreground outline-none focus:border-forest"
              />
            </div>

            {/* Motivo Preset do Bling */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Motivo / Justificativa *
              </label>
              <select
                value={movMotivoPreset}
                onChange={(e) => setMovMotivoPreset(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              >
                {movTipo === "ENTRADA" ? (
                  <>
                    <option value="Compra / NF de Entrada">Compra / NF de Entrada</option>
                    <option value="Devolução de Cliente">Devolução de Cliente</option>
                    <option value="Sobra de Inventário">Sobra de Inventário</option>
                    <option value="Bonificação / Brinde">Bonificação / Brinde Fornecedor</option>
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
                Observação / Documento (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: NF-e 9812 ou Protocolo #491"
                value={movMotivoCustom}
                onChange={(e) => setMovMotivoCustom(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <DialogFooter className="mt-5 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMovimentacaoModalOpen(false)}
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
                  "Confirmar Movimentação"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: EXTRATO DO PRODUTO (HISTÓRICO INDIVIDUAL)                          */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(extratoProdutoModal)}
        onOpenChange={(open) => !open && setExtratoProdutoModal(null)}
      >
        <DialogContent className="max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-forest" />
              <DialogTitle className="text-lg font-bold text-foreground">
                Extrato do Produto: {extratoProdutoModal?.nome}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              SKU: {extratoProdutoModal?.sku} · Histórico completo de entradas, saídas e balanços.
            </DialogDescription>
          </DialogHeader>

          {extratoProdutoModal && (
            <div className="space-y-4 pt-2">
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
                    {movimentacoes.filter((m) => m.produto_id === extratoProdutoModal.id).length ===
                    0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          Nenhuma movimentação registrada para este produto.
                        </td>
                      </tr>
                    ) : (
                      movimentacoes
                        .filter((m) => m.produto_id === extratoProdutoModal.id)
                        .map((m) => {
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
                              <td className="p-2.5 text-muted-foreground">
                                {getNomeLoja(m.loja_id)}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              <DialogFooter className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setExtratoProdutoModal(null)}
                  className="rounded-full bg-muted px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  Fechar
                </button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
