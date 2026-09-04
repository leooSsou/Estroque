import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, AlertTriangle, Warehouse, RefreshCw, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useEstoqueData, useLojasData, useProdutosData } from "@/hooks/useEstroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Saldos por loja e ledger | Estroque" },
      {
        name: "description",
        content:
          "Visão consolidada de estoque físico: saldos em tempo real por loja, alertas de ruptura e ledger imutável de movimentações.",
      },
      { property: "og:title", content: "Estoque — Saldos por loja e ledger | Estroque" },
      {
        property: "og:description",
        content: "Saldos em tempo real por loja, alertas de ruptura e ledger imutável de movimentações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EstoquePage,
});

const alerts = [
  { sku: "SKU-31877", name: "Hub USB-C 7 em 1", status: "Zerado", tone: "bad" as const, days: "—" },
  { sku: "SKU-77120", name: "Mouse Sem Fio 4000dpi", status: "Crítico", tone: "bad" as const, days: "2 dias" },
  { sku: "SKU-55901", name: "Teclado Mecânico 75%", status: "Baixo", tone: "warn" as const, days: "9 dias" },
  { sku: "SKU-90218", name: "Fone Bluetooth ANC", status: "Baixo", tone: "warn" as const, days: "12 dias" },
];

function typeTone(t: string) {
  if (t === "ENTRADA" || t === "AJUSTE_POSITIVO") return "good" as const;
  if (t === "SAIDA" || t === "SAÍDA" || t === "AJUSTE_NEGATIVO") return "bad" as const;
  return "neutral" as const;
}

function EstoquePage() {
  const { saldos, movimentacoes, isFetching, refetch, auditarEstoque, isAuditing } = useEstoqueData();
  const { data: lojas } = useLojasData();
  const { data: produtos } = useProdutosData();

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [lojaId, setLojaId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [quantidadeFisica, setQuantidadeFisica] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const activeLojaId = lojaId || lojas?.[0]?.id || "";
  const activeProdutoId = produtoId || produtos?.[0]?.id || "";

  const saldoAtual =
    saldos.find((s) => s.loja_id === activeLojaId && s.produto_id === activeProdutoId)?.quantidade || 0;
  const contagemNum = parseInt(quantidadeFisica, 10);
  const temContagem = !isNaN(contagemNum) && quantidadeFisica.trim() !== "";
  const divergencia = temContagem ? contagemNum - saldoAtual : 0;

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  const handleAuditoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!activeLojaId) {
      setFormError("Selecione uma loja física.");
      return;
    }
    if (!activeProdutoId) {
      setFormError("Selecione um produto.");
      return;
    }
    if (!temContagem || contagemNum < 0) {
      setFormError("Informe uma quantidade física válida (maior ou igual a zero).");
      return;
    }

    try {
      await auditarEstoque({
        loja_id: activeLojaId,
        itens: [
          {
            produto_id: activeProdutoId,
            quantidade_fisica: contagemNum,
          },
        ],
      });

      setQuantidadeFisica("");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao salvar contagem de inventário.");
    }
  };

  const totalUnidades = saldos.reduce((acc, s) => acc + s.quantidade, 0) || 0;

  const getNomeLoja = (id: string) => lojas?.find((l) => l.id === id)?.nome || id.slice(0, 8);
  const getNomeProduto = (id: string) => produtos?.find((p) => p.id === id)?.nome || id.slice(0, 8);

  return (
    <AppShell
      title="Estoque & Saldos"
      subtitle={`${totalUnidades} unidades no ledger · Sincronizado`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar saldos"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${(isFetching || isManualRefreshing) ? "animate-spin text-emerald" : ""}`}
            />
          </button>
          <div onClick={() => setIsModalOpen(true)}>
            <PrimaryButton icon={ClipboardList}>Novo inventário</PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="grid gap-5 sm:grid-cols-3 xl:col-span-8">
          {(!lojas || lojas.length === 0) ? (
            <div className="col-span-3 rounded-card border border-border/50 bg-card p-8 text-center text-xs text-muted-foreground">
              Nenhuma loja/filial cadastrada.
            </div>
          ) : (
            lojas.map((l) => {
              const itemsLoja = saldos.filter((s) => s.loja_id === l.id).reduce((acc, s) => acc + s.quantidade, 0);
              const occ = totalUnidades > 0 ? Math.min(100, Math.round((itemsLoja / totalUnidades) * 100)) : 0;

              return (
                <Card key={l.id}>
                  <Warehouse className="h-8 w-8 rounded-xl bg-mint p-2 text-emerald" />
                  <p className="mt-3 font-display text-base font-bold text-foreground">{l.nome}</p>
                  <p className="text-xs text-muted-foreground">{itemsLoja} itens em saldo</p>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-forest" style={{ width: `${occ}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{occ}% do estoque total</p>
                </Card>
              );
            })
          )}
        </div>

        <Card className="xl:col-span-4">
          <CardTitle title="Alertas de ruptura" hint="previsão" />
          <ul className="space-y-3">
            {totalUnidades === 0 ? (
              <li className="py-6 text-center text-xs text-muted-foreground">
                Nenhum alerta de ruptura no momento.
              </li>
            ) : (
              alerts.map((a) => (
                <li key={a.sku} className="flex items-center gap-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{a.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {a.sku} · cobertura {a.days}
                    </p>
                  </div>
                  <Chip label={a.status} tone={a.tone} />
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle title="Ledger de movimentações" hint="registro imutável e auditável" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">Produto / Ref</th>
                <th className="pb-3 font-semibold">Tipo</th>
                <th className="pb-3 font-semibold">Qtd.</th>
                <th className="pb-3 font-semibold">Observação / Doc</th>
                <th className="pb-3 font-semibold">Loja</th>
                <th className="pb-3 font-semibold">Data e Hora</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                    Nenhuma movimentação registrada no estoque.
                  </td>
                </tr>
              ) : (
                movimentacoes.map((l) => (
                  <tr key={l.id} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                    <td className="py-3 font-semibold text-foreground">
                      {getNomeProduto(l.produto_id)}
                    </td>
                    <td className="py-3">
                      <Chip label={l.tipo_movimentacao} tone={typeTone(l.tipo_movimentacao)} />
                    </td>
                    <td className={`py-3 font-bold ${l.quantidade >= 0 ? "text-emerald" : "text-destructive"}`}>
                      {l.quantidade >= 0 ? `+${l.quantidade}` : l.quantidade}
                    </td>
                    <td className="py-3 text-muted-foreground">{l.observacao || "Movimentação de Sistema"}</td>
                    <td className="py-3 text-muted-foreground">{getNomeLoja(l.loja_id)}</td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {new Date(l.data_movimentacao).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Novo Inventário / Auditoria Física */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ClipboardList className="h-5 w-5 text-forest" />
              Auditoria de Estoque (Inventário Físico)
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleAuditoria} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Loja / Filial *
              </label>
              <select
                value={activeLojaId}
                onChange={(e) => setLojaId(e.target.value)}
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
                Produto a Inventariar *
              </label>
              <select
                value={activeProdutoId}
                onChange={(e) => setProdutoId(e.target.value)}
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
                value={quantidadeFisica}
                onChange={(e) => setQuantidadeFisica(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-forest"
              />
            </div>

            {/* Painel de Divergência Calculada */}
            <div className="rounded-xl bg-muted/60 p-4 space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Saldo registrado no sistema:</span>
                <span className="font-bold">{saldoAtual} un.</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Contagem física informada:</span>
                <span className="font-bold">{temContagem ? `${contagemNum} un.` : "—"}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 font-semibold">
                <span>Divergência apurada:</span>
                <span
                  className={
                    divergencia > 0
                      ? "text-emerald font-bold"
                      : divergencia < 0
                      ? "text-destructive font-bold"
                      : "text-muted-foreground"
                  }
                >
                  {!temContagem
                    ? "Aguardando contagem"
                    : divergencia === 0
                    ? "0 un. (Estoque conferido / Sem ajuste)"
                    : divergencia > 0
                    ? `+${divergencia} un. (Sobra / Ajuste Positivo)`
                    : `${divergencia} un. (Falta / Ajuste Negativo)`}
                </span>
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
                disabled={isAuditing}
                className="flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {isAuditing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Concluir Inventário"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
