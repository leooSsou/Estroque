import { createFileRoute } from "@tanstack/react-router";
import { Plus, Receipt } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";

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

const sales = [
  { id: "#4821", client: "Camila Duarte", items: 4, pay: "Pix", total: "R$ 1.240,00", status: "Concluída", tone: "good" as const },
  { id: "#4820", client: "Consumidor final", items: 1, pay: "Crédito 3x", total: "R$ 329,00", status: "Concluída", tone: "good" as const },
  { id: "#4819", client: "Estúdio Norte ME", items: 12, pay: "Boleto", total: "R$ 4.780,00", status: "Aguardando", tone: "warn" as const },
  { id: "#4818", client: "Rafael Lima", items: 2, pay: "Débito", total: "R$ 168,80", status: "Concluída", tone: "good" as const },
  { id: "#4817", client: "Consumidor final", items: 3, pay: "Dinheiro", total: "R$ 96,50", status: "Cancelada", tone: "bad" as const },
];

function VendasPage() {
  return (
    <AppShell
      title="Vendas"
      subtitle="Agosto 2026 · R$ 82.300,00 faturados"
      actions={<PrimaryButton icon={Plus}>Nova venda</PrimaryButton>}
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <section className="gradient-emerald rounded-card p-6 xl:col-span-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint/60">
            Faturamento do mês
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-mint">R$ 82.300,00</p>
          <p className="mt-1 text-xs text-mint/70">+12,4% vs. julho · 265 vendas</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { l: "Ticket médio", v: "R$ 310,50" },
              { l: "Margem bruta", v: "43,8%" },
              { l: "CMV", v: "R$ 46.200" },
              { l: "Devoluções", v: "1,2%" },
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
        <CardTitle title="Histórico de vendas" hint="tempo real" />
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
              {sales.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3.5 font-mono text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5" />
                      {s.id}
                    </span>
                  </td>
                  <td className="py-3.5 font-semibold text-foreground">{s.client}</td>
                  <td className="py-3.5 text-muted-foreground">{s.items}</td>
                  <td className="py-3.5 text-muted-foreground">{s.pay}</td>
                  <td className="py-3.5 font-semibold text-foreground">{s.total}</td>
                  <td className="py-3.5">
                    <Chip label={s.status} tone={s.tone} />
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
