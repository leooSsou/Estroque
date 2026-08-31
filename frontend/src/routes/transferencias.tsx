import { createFileRoute } from "@tanstack/react-router";
import { Truck, ArrowRight, PackageCheck, PackageSearch } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";

export const Route = createFileRoute("/transferencias")({
  head: () => ({
    meta: [
      { title: "Transferências entre lojas | Estroque" },
      {
        name: "description",
        content:
          "Controle transferências de estoque entre matriz e filiais no Estroque: romaneio, itens em trânsito e confirmação de recebimento.",
      },
      { property: "og:title", content: "Transferências entre lojas | Estroque" },
      {
        property: "og:description",
        content: "Romaneios, itens em trânsito e confirmação de recebimento entre matriz e filiais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransferenciasPage,
});

const transfers = [
  { id: "TR-0093", from: "Loja Matriz", to: "Filial 01", items: 20, status: "Em trânsito", tone: "warn" as const, when: "31/08 11:20" },
  { id: "TR-0092", from: "Filial 02", to: "Loja Matriz", items: 6, status: "Aguardando envio", tone: "neutral" as const, when: "31/08 09:04" },
  { id: "TR-0091", from: "Loja Matriz", to: "Filial 02", items: 34, status: "Recebida", tone: "good" as const, when: "30/08 16:30" },
  { id: "TR-0090", from: "Filial 01", to: "Filial 02", items: 12, status: "Recebida", tone: "good" as const, when: "29/08 14:12" },
];

const romaneio = [
  { sku: "SKU-55901", name: "Teclado Mecânico 75%", qty: 12 },
  { sku: "SKU-77120", name: "Mouse Sem Fio 4000dpi", qty: 6 },
  { sku: "SKU-10432", name: "Cabo HDMI 2.1 — 2m", qty: 2 },
];

function TransferenciasPage() {
  return (
    <AppShell
      title="Transferências"
      subtitle="3 romaneios em trânsito · 58 itens movimentados no mês"
      actions={<PrimaryButton icon={Truck}>Nova transferência</PrimaryButton>}
    >
      <div className="grid gap-5 md:grid-cols-3">
        {[
          { l: "Em trânsito", v: "3", i: Truck },
          { l: "Aguardando envio", v: "1", i: PackageSearch },
          { l: "Recebidas no mês", v: "18", i: PackageCheck },
        ].map((k) => (
          <Card key={k.l}>
            <k.i className="h-8 w-8 rounded-xl bg-mint p-2 text-emerald" />
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{k.v}</p>
            <p className="text-sm text-muted-foreground">{k.l}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardTitle title="Romaneios" hint="últimos lançamentos" />
          <ul className="space-y-3">
            {transfers.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-bento bg-muted/60 p-4"
              >
                <span className="font-mono text-xs font-bold text-forest">{t.id}</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {t.from}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.to}
                </span>
                <span className="text-xs text-muted-foreground">{t.items} itens · {t.when}</span>
                <span className="ml-auto">
                  <Chip label={t.status} tone={t.tone} />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-5">
          <CardTitle title="Romaneio TR-0093" hint="Matriz → Filial 01" />
          <ul className="divide-y divide-border">
            {romaneio.map((r) => (
              <li key={r.sku} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{r.name}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{r.sku}</p>
                </div>
                <span className="font-display text-base font-bold text-forest">{r.qty} un.</span>
              </li>
            ))}
          </ul>
          <PrimaryButton icon={PackageCheck}>Confirmar recebimento</PrimaryButton>
        </Card>
      </div>
    </AppShell>
  );
}
