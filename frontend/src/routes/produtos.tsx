import { useState, useEffect } from "react";
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
} from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useProdutosData, useLojasData } from "@/hooks/useEstroqueApi";
import { estroqueApi } from "@/services/estroqueApi";
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
          "Gerencie o catálogo de produtos do Estroque: SKUs, códigos de barras, NCM, preços de custo e venda, margem e curva ABC.",
      },
      { property: "og:title", content: "Produtos — Catálogo e SKUs | Estroque" },
      {
        property: "og:description",
        content: "Catálogo completo de SKUs com margem, curva ABC e saldo consolidado por loja.",
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
    isLoading,
    isFetching,
    refetch,
    criarProduto,
    isCreating,
    atualizarProduto,
    isUpdating,
  } = useProdutosData(debouncedSearch);
  const [filterABC, setFilterABC] = useState<string>("Todos");
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // Modal State - Novo Produto
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [precoCusto, setPrecoCusto] = useState("");
  const [precoVenda, setPrecoVenda] = useState("");
  const [codigoBarras, setCodigoBarras] = useState("");
  const [categoria, setCategoria] = useState("Geral");
  const [quantidadeInicial, setQuantidadeInicial] = useState("");
  const [lojaId, setLojaId] = useState("");
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

  const editCustoNum = parseFloat(editPrecoCusto) || 0;
  const editVendaNum = parseFloat(editPrecoVenda) || 0;
  const editMarkupCalculado =
    editCustoNum > 0 ? (((editVendaNum - editCustoNum) / editCustoNum) * 100).toFixed(1) : "0.0";

  const handleOpenEdit = (p: any) => {
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

  const custoNum = parseFloat(precoCusto) || 0;
  const vendaNum = parseFloat(precoVenda) || 0;
  const markupCalculado =
    custoNum > 0 ? (((vendaNum - custoNum) / custoNum) * 100).toFixed(1) : "0.0";

  const totalSkus = produtos?.length || 0;
  const valorTotalEstoque = produtos?.reduce((acc, p) => acc + p.preco_venda * 10, 0) || 0;

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

      // Se informou estoque inicial > 0, registra a movimentação de entrada física no ledger
      const qtdInicialNum = parseInt(quantidadeInicial, 10) || 0;
      const targetLojaId = lojaId || lojas?.[0]?.id;

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

      // Limpar formulário e fechar modal
      setNome("");
      setSku("");
      setPrecoCusto("");
      setPrecoVenda("");
      setCodigoBarras("");
      setCategoria("Geral");
      setQuantidadeInicial("");
      setLojaId("");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao cadastrar produto.");
    }
  };

  return (
    <AppShell
      title="Produtos"
      subtitle={`${totalSkus} SKUs cadastrados · Sincronizado com o Backend`}
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Buscar produto, SKU, EAN…"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar catálogo"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${isFetching || isManualRefreshing ? "animate-spin text-emerald" : ""}`}
            />
          </button>
          <div onClick={() => setIsModalOpen(true)}>
            <PrimaryButton icon={Plus}>Novo produto</PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-4">
        {[
          { l: "SKUs ativos", v: totalSkus.toString() },
          {
            l: "Valor estimado",
            v: `R$ ${valorTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
          },
          { l: "Abaixo do mínimo", v: "0 itens" },
          { l: "Zerados", v: "0 itens" },
        ].map((k) => (
          <Card key={k.l}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {k.l}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{k.v}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <CardTitle title="Catálogo de SKUs" />
          <div className="ml-auto flex gap-2">
            {["Todos", "Classe A", "Classe B", "Classe C"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilterABC(t)}
                className={
                  filterABC === t
                    ? "rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-emerald"
                    : "rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-mint/40"
                }
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-mint/40"
            >
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-mint/40"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">SKU</th>
                <th className="pb-3 font-semibold">Produto</th>
                <th className="pb-3 font-semibold">Categoria</th>
                <th className="pb-3 font-semibold">Custo</th>
                <th className="pb-3 font-semibold">Venda</th>
                <th className="pb-3 font-semibold">Margem</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">ABC</th>
                <th className="pb-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {!produtos || produtos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-xs text-muted-foreground">
                    Nenhum produto cadastrado no catálogo. Clique em "Novo produto" acima para
                    adicionar.
                  </td>
                </tr>
              ) : (
                produtos.map((p, idx) => {
                  const marginCalc =
                    p.preco_custo > 0
                      ? (((p.preco_venda - p.preco_custo) / p.preco_venda) * 100).toFixed(1) + "%"
                      : "—";
                  const abcClass = idx % 3 === 0 ? "A" : idx % 3 === 1 ? "B" : "C";

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
                        {p.codigo_barras && (
                          <p className="text-[11px] text-muted-foreground">
                            EAN: {p.codigo_barras}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 text-muted-foreground">{p.categoria || "Geral"}</td>
                      <td className="py-3.5 text-muted-foreground">
                        R$ {p.preco_custo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 font-bold text-foreground">
                        R$ {p.preco_venda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 font-semibold text-forest">{marginCalc}</td>
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
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(p)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition-all hover:border-forest/50 hover:bg-muted active:scale-95"
                          title="Editar dados do produto"
                        >
                          <Edit2 className="h-3 w-3 text-forest" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal / Dialog de Cadastro de Novo Produto */}
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
                  value={lojaId || lojas?.[0]?.id || ""}
                  onChange={(e) => setLojaId(e.target.value)}
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

      {/* Modal / Dialog de Edição de Produto */}
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
