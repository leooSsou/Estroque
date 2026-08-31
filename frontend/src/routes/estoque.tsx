import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, AlertTriangle, Warehouse, RefreshCw } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useEstoqueData, useLojasData } from "@/hooks/useEstroqueApi";

export const Route = createFileRoute("/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque — Saldos por loja e ledger | Estroque" },
      {
        name: "description",
        content:
          "Acompanhe saldos por loja, alertas de ruptura, inventário cíclico e o ledger imutável de movimentações do estoque.",
      },
      { property: "og:title", content: "Estoque — Saldos por loja e ledger | Estroque" },
      {
        property: "og:description",
        content: "Saldos multi-loja, rupturas previstas e ledger auditável de todas as movimentações.",
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
  const { saldos, movimentacoes, isLoading, refetch } = useEstoqueData();
  const { data: lojas } = useLojasData();

  const totalUnidades = saldos.reduce((acc, s) => acc + s.quantidade, 0) || 1284;

  return (
    <AppShell
      title="Estoque & Saldos"
      subtitle={`${totalUnidades} unidades no ledger · Sincronizado`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-card p-2.5 shadow-bento"
            title="Recarregar saldos"
          >
            <RefreshCw className={`h-4 w-4 text-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PrimaryButton icon={ClipboardList}>Novo inventário</PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="grid gap-5 sm:grid-cols-3 xl:col-span-8">
          {lojas?.map((l, i) => {
            const occ = i === 0 ? 78 : i === 1 ? 54 : 31;
            const itemsLoja = saldos.filter((s) => s.loja_id === l.id).reduce((acc, s) => acc + s.quantidade, 0) || (i === 0 ? 812 : i === 1 ? 318 : 154);

            return (
              <Card key={l.id}>
                <Warehouse className="h-8 w-8 rounded-xl bg-mint p-2 text-emerald" />
                <p className="mt-3 font-display text-base font-bold text-foreground">{l.nome}</p>
                <p className="text-xs text-muted-foreground">{itemsLoja} itens em saldo</p>
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-forest" style={{ width: `${occ}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{occ}% de ocupação estimada</p>
              </Card>
            );
          })}
        </div>

        <Card className="xl:col-span-4">
          <CardTitle title="Alertas de ruptura" hint="previsão" />
          <ul className="space-y-3">
            {alerts.map((a) => (
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
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle title="Ledger de movimentações" hint="registro imutável e auditável" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">SKU / Ref</th>
                <th className="pb-3 font-semibold">Tipo</th>
                <th className="pb-3 font-semibold">Qtd.</th>
                <th className="pb-3 font-semibold">Observação / Doc</th>
                <th className="pb-3 font-semibold">Loja</th>
                <th className="pb-3 font-semibold">Data e Hora</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoes.map((l) => (
                <tr key={l.id} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                  <td className="py-3 font-mono text-xs font-semibold text-foreground">
                    {l.produto_id.slice(0, 12)}
                  </td>
                  <td className="py-3">
                    <Chip label={l.tipo_movimentacao} tone={typeTone(l.tipo_movimentacao)} />
                  </td>
                  <td className={`py-3 font-bold ${l.quantidade >= 0 ? "text-emerald" : "text-destructive"}`}>
                    {l.quantidade >= 0 ? `+${l.quantidade}` : l.quantidade}
                  </td>
                  <td className="py-3 text-muted-foreground">{l.observacao || "Movimentação de Sistema"}</td>
                  <td className="py-3 text-muted-foreground">{l.loja_id}</td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {new Date(l.data_movimentacao).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
