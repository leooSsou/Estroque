import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  CircleDollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { AppShell, Card, PrimaryButton } from "@/components/estroque/app-shell";
import {
  useFinanceiroData,
  useLojasData,
} from "@/hooks/useEstroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — Fluxo de Caixa e DRE | Estroque" },
      {
        name: "description",
        content:
          "Acompanhe o fluxo de caixa, receitas de vendas, despesas operacionais e controle de contas a pagar no Estroque.",
      },
      { property: "og:title", content: "Financeiro — Fluxo de Caixa e DRE | Estroque" },
      {
        property: "og:description",
        content: "Gestão financeira multi-loja, extrato de lançamentos, receitas e despesas operacionais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinanceiroPage,
});

const CATEGORIAS_DESPESA = [
  "ALUGUEL",
  "ENERGIA",
  "AGUA",
  "SALARIOS",
  "MARKETING",
  "FORNECEDOR",
  "MANUTENCAO",
  "IMPOSTOS",
  "OUTROS",
];

const CATEGORIA_LABELS: Record<string, string> = {
  VENDA_BALCAO: "Venda no Caixa (PDV)",
  ALUGUEL: "Aluguel Predial",
  ENERGIA: "Energia Elétrica",
  AGUA: "Água & Saneamento",
  SALARIOS: "Salários & Pró-labore",
  MARKETING: "Marketing & Anúncios",
  FORNECEDOR: "Fornecedores & Insumos",
  MANUTENCAO: "Manutenção & Reparos",
  IMPOSTOS: "Impostos & Tributos",
  OUTROS: "Despesas Operacionais",
};

function FinanceiroPage() {
  const { lancamentos, isFetching, refetch, registrarDespesa, isRegistering } = useFinanceiroData();
  const { data: lojas } = useLojasData();

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtros
  const [filtroLoja, setFiltroLoja] = useState("TODAS");
  const [filtroTipo, setFiltroTipo] = useState<"TODOS" | "RECEITA" | "DESPESA">("TODOS");
  const [filtroStatus, setFiltroStatus] = useState<"TODOS" | "PAGO" | "PENDENTE">("TODOS");
  const [busca, setBusca] = useState("");

  // Form State Nova Despesa
  const [formLojaId, setFormLojaId] = useState("");
  const [formCategoria, setFormCategoria] = useState(CATEGORIAS_DESPESA[0]);
  const [formValor, setFormValor] = useState("");
  const [formStatus, setFormStatus] = useState<"PAGO" | "PENDENTE">("PAGO");
  const [formDataPagamento, setFormDataPagamento] = useState(new Date().toISOString().split("T")[0]);
  const [formError, setFormError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  const getNomeLoja = (id: string) => lojas?.find((l) => l.id === id)?.nome || "Loja";

  // Lançamentos filtrados
  const filteredLancamentos = useMemo(() => {
    return lancamentos.filter((l) => {
      if (filtroLoja !== "TODAS" && l.loja_id !== filtroLoja) return false;
      if (filtroTipo !== "TODOS" && l.tipo !== filtroTipo) return false;
      if (filtroStatus !== "TODOS" && l.status_pagamento !== filtroStatus) return false;
      if (busca.trim()) {
        const query = busca.toLowerCase();
        const catLabel = (CATEGORIA_LABELS[l.categoria] || l.categoria).toLowerCase();
        const lojaNome = getNomeLoja(l.loja_id).toLowerCase();
        return catLabel.includes(query) || lojaNome.includes(query);
      }
      return true;
    });
  }, [lancamentos, filtroLoja, filtroTipo, filtroStatus, busca, lojas]);

  // Cálculos financeiros reais consolidados
  const totalReceitas = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "RECEITA" && l.status_pagamento === "PAGO")
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos]);

  const totalDespesasPagas = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "DESPESA" && l.status_pagamento === "PAGO")
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos]);

  const totalDespesasPendentes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "DESPESA" && l.status_pagamento === "PENDENTE")
      .reduce((acc, l) => acc + l.valor, 0);
  }, [lancamentos]);

  const saldoLiquido = totalReceitas - totalDespesasPagas;

  const countReceitas = lancamentos.filter((l) => l.tipo === "RECEITA").length;
  const countDespesas = lancamentos.filter((l) => l.tipo === "DESPESA").length;
  const countPendentes = lancamentos.filter((l) => l.status_pagamento === "PENDENTE").length;

  const handleCadastrarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const activeLojaId = formLojaId || lojas?.[0]?.id;
    const valorNum = parseFloat(formValor.replace(",", "."));

    if (!activeLojaId) {
      setFormError("Selecione uma loja física.");
      return;
    }
    if (isNaN(valorNum) || valorNum <= 0) {
      setFormError("Informe um valor válido maior que zero.");
      return;
    }

    try {
      await registrarDespesa({
        loja_id: activeLojaId,
        categoria: formCategoria,
        valor: valorNum,
        status_pagamento: formStatus,
        data_pagamento: formStatus === "PAGO" ? new Date(formDataPagamento).toISOString() : null,
      });

      // Reset form
      setFormValor("");
      setFormCategoria(CATEGORIAS_DESPESA[0]);
      setFormStatus("PAGO");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao registrar despesa.");
    }
  };

  return (
    <AppShell
      title="Gestão Financeira"
      subtitle="Fluxo de caixa, receitas e controle de despesas operacionais"
      searchValue={busca}
      onSearchChange={setBusca}
      searchPlaceholder="Buscar por categoria ou loja..."
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar lançamentos"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${
                isFetching || isManualRefreshing ? "animate-spin text-emerald" : ""
              }`}
            />
          </button>
          <PrimaryButton icon={Plus} onClick={() => setIsModalOpen(true)}>
            Nova despesa
          </PrimaryButton>
        </div>
      }
    >
      {/* Bento Grid de Indicadores Financeiros */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Card Saldo Líquido em Caixa */}
        <section className="gradient-emerald rounded-card p-6 xl:col-span-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint/60">
              Saldo Líquido em Caixa
            </p>
            <p className="mt-2 font-display text-4xl font-bold text-mint">
              R$ {saldoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
            <p className="mt-1 text-xs text-mint/70">
              Receitas apuradas menos despesas pagas
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-mint">
            <Wallet className="h-4 w-4 text-mint/80" />
            <span>Multi-loja consolidado em tempo real</span>
          </div>
        </section>

        {/* 3 Bento Cards de Detalhes */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 xl:col-span-8">
          {/* Receitas Totais */}
          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald">
                <TrendingUp className="h-3 w-3" />
                Receitas
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {countReceitas} {countReceitas === 1 ? "venda" : "vendas"}
              </span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">
                R$ {totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Entradas liquidadas no período</p>
            </div>
          </article>

          {/* Despesas Pagas */}
          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive">
                <TrendingDown className="h-3 w-3" />
                Despesas
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {countDespesas} {countDespesas === 1 ? "item" : "itens"}
              </span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">
                R$ {totalDespesasPagas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Custos e saídas operacionais</p>
            </div>
          </article>

          {/* Contas a Pagar / Pendentes */}
          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                <Clock className="h-3 w-3" />
                A Pagar
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">
                {countPendentes} pendentes
              </span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">
                R$ {totalDespesasPendentes.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Despesas pendentes de quitação</p>
            </div>
          </article>
        </div>
      </div>

      {/* Seção Principal: Extrato Financeiro & Filtros */}
      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Extrato Financeiro & Lançamentos
            </h2>
            <p className="text-xs text-muted-foreground">
              Histórico consolidado de transações, vendas no balcão e contas operacionais
            </p>
          </div>

          {/* Filtros em Linha */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Filtro Loja */}
            <select
              value={filtroLoja}
              onChange={(e) => setFiltroLoja(e.target.value)}
              className="rounded-full border border-border bg-card px-3 py-1.5 font-medium text-foreground outline-none hover:bg-muted"
            >
              <option value="TODAS">Todas as Lojas</option>
              {lojas?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>

            {/* Filtro Tipo */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="rounded-full border border-border bg-card px-3 py-1.5 font-medium text-foreground outline-none hover:bg-muted"
            >
              <option value="TODOS">Todos os Tipos</option>
              <option value="RECEITA">Receitas (+)</option>
              <option value="DESPESA">Despesas (-)</option>
            </select>

            {/* Filtro Status */}
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="rounded-full border border-border bg-card px-3 py-1.5 font-medium text-foreground outline-none hover:bg-muted"
            >
              <option value="TODOS">Todos os Status</option>
              <option value="PAGO">Pago</option>
              <option value="PENDENTE">Pendente</option>
            </select>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                <th className="pb-3 font-semibold">Categoria / Origem</th>
                <th className="pb-3 font-semibold">Loja</th>
                <th className="pb-3 font-semibold">Tipo</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Data</th>
                <th className="pb-3 text-right font-semibold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filteredLancamentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-center">
                      <CircleDollarSign className="h-10 w-10 text-muted-foreground/40" />
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        Nenhum lançamento financeiro registrado
                      </p>
                      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                        As vendas realizadas no PDV geram receitas automaticamente, e as despesas
                        operacionais manuais podem ser cadastradas através do botão abaixo.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="mt-4 rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-mint transition-opacity hover:opacity-90"
                      >
                        Cadastrar Despesa
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLancamentos.map((item) => {
                  const isReceita = item.tipo === "RECEITA";
                  const categoriaNome = CATEGORIA_LABELS[item.categoria] || item.categoria;

                  return (
                    <tr key={item.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                              isReceita ? "bg-mint text-emerald" : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {isReceita ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">{categoriaNome}</p>
                            <p className="text-[11px] text-muted-foreground">ID: #{item.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground">
                        {getNomeLoja(item.loja_id)}
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            isReceita ? "bg-mint text-emerald" : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          {item.tipo}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            item.status_pagamento === "PAGO"
                              ? "bg-mint text-emerald"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {item.status_pagamento}
                        </span>
                      </td>
                      <td className="py-3.5 text-right text-xs text-muted-foreground">
                        {new Date(item.data_lancamento).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </td>
                      <td
                        className={`py-3.5 text-right font-display text-sm font-bold ${
                          isReceita ? "text-emerald" : "text-destructive"
                        }`}
                      >
                        {isReceita ? "+ " : "- "}
                        R$ {item.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Cadastrar Nova Despesa */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Registrar Despesa Operacional</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCadastrarDespesa} className="space-y-4 py-2">
            {formError ? (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            {/* Loja */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Loja Física</label>
              <select
                value={formLojaId}
                onChange={(e) => setFormLojaId(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-forest"
              >
                {lojas?.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Categoria da Despesa</label>
              <select
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-forest"
              >
                {CATEGORIAS_DESPESA.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORIA_LABELS[cat] || cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Valor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={formValor}
                onChange={(e) => setFormValor(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            {/* Status do Pagamento */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Status do Pagamento</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormStatus("PAGO")}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    formStatus === "PAGO"
                      ? "border-emerald bg-mint text-emerald"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Pago (Liquidado)
                </button>
                <button
                  type="button"
                  onClick={() => setFormStatus("PENDENTE")}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                    formStatus === "PENDENTE"
                      ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "border-border bg-card text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Pendente (A Pagar)
                </button>
              </div>
            </div>

            {/* Data de Efetivação (se PAGO) */}
            {formStatus === "PAGO" ? (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Data do Pagamento</label>
                <input
                  type="date"
                  value={formDataPagamento}
                  onChange={(e) => setFormDataPagamento(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>
            ) : null}

            <DialogFooter className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isRegistering}
                className="flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-mint hover:opacity-90 disabled:opacity-50"
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Salvar Despesa"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
