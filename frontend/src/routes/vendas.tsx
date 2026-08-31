import { createFileRoute } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useVendasData, useDashboardData } from "@/hooks/useEstroqueApi";

export const Route = createFileRoute("/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — PDV e histórico | Estroque" },
      {
        name: "description",
        content:
          "Registre vendas, acompanhe faturamento diário, ticket médio, formas de pagamento e baixa automática de estoque no Estroque.",
      },
      { property: "og:title", content: "Vendas — PDV e histórico | Estroque" },
      {
        property: "og:description",
        content: "Faturamento diário, ticket médio, formas de pagamento e baixa automática de estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendasPage,
});

const days = [
  { d: "25", v: 62 },
  { d: "26", v: 74 },
  { d: "27", v: 58 },
  { d: "28", v: 88 },
  { d: "29", v: 79 },
  { d: "30", v: 94 },
  { d: "31", v: 100 },
];

function VendasPage() {
  const { vendas, isLoading, refetch } = useVendasData();
  const { data: dash } = useDashboardData();

  const faturamento = dash?.total_faturamento
    ? `R$ ${dash.total_faturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "R$ 82.300,00";

  const ticketMedio = dash?.ticket_medio
    ? `R$ ${dash.ticket_medio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
    : "R$ 310,50";

  return (
    <AppShell
      title="Vendas & Frente de Caixa"
      subtitle={`Agosto 2026 · ${faturamento} faturados`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-card p-2.5 shadow-bento"
            title="Recarregar vendas"
          >
            <RefreshCw className={`h-4 w-4 text-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PrimaryButton icon={Plus}>Nova venda</PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <section className="gradient-emerald rounded-card p-6 xl:col-span-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint/60">
            Faturamento do mês
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-mint">{faturamento}</p>
          <p className="mt-1 text-xs text-mint/70">
            +12,4% vs. mês anterior · {dash?.total_itens_vendidos || 265} itens vendidos
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { l: "Ticket médio", v: ticketMedio },
              { l: "Margem bruta", v: "43,8%" },
              { l: "CMV", v: "R$ 46.200" },
              { l: "Devoluções", v: "0%" },
            ].map((s) => (
              <div key={s.l} className="rounded-bento bg-mint/10 p-3">
                <p className="text-[11px] text-mint/70">{s.l}</p>
                <p className="mt-1 text-sm font-bold text-mint">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="xl:col-span-8">
          <CardTitle title="Vendas por dia" hint="últimos 7 dias" />
          <div className="flex h-48 items-end gap-4">
            {days.map((d) => (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-xl bg-forest"
                  style={{ height: `${d.v}%` }}
                  aria-label={`Dia ${d.d}`}
                />
                <span className="text-xs text-muted-foreground">{d.d}/08</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle title="Histórico de vendas" hint="registro em tempo real" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">Venda</th>
                <th className="pb-3 font-semibold">Cliente</th>
                <th className="pb-3 font-semibold">Itens</th>
                <th className="pb-3 font-semibold">Pagamento</th>
                <th className="pb-3 font-semibold">Total</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {vendas.map((s) => (
                <tr key={s.id} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                  <td className="py-3 font-mono font-bold text-forest">#{s.id.slice(0, 6)}</td>
                  <td className="py-3 font-medium text-foreground">{s.cliente_id || "Consumidor Final"}</td>
                  <td className="py-3 text-muted-foreground">{s.itens?.length || 1} itens</td>
                  <td className="py-3">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                      {s.tipo_pagamento}
                    </span>
                  </td>
                  <td className="py-3 font-bold text-foreground">
                    R$ {s.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3">
                    <Chip label="Concluída" tone="good" />
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
