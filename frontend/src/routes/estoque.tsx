import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, AlertTriangle, Warehouse } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";

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

const stores = [
  { name: "Loja Matriz", items: 812, value: "R$ 96.400", occ: 78 },
  { name: "Filial 01", items: 318, value: "R$ 34.200", occ: 54 },
  { name: "Filial 02", items: 154, value: "R$ 17.900", occ: 31 },
];

const alerts = [
  { sku: "SKU-31877", name: "Hub USB-C 7 em 1", status: "Zerado", tone: "bad" as const, days: "—" },
  { sku: "SKU-77120", name: "Mouse Sem Fio 4000dpi", status: "Crítico", tone: "bad" as const, days: "2 dias" },
  { sku: "SKU-55901", name: "Teclado Mecânico 75%", status: "Baixo", tone: "warn" as const, days: "9 dias" },
  { sku: "SKU-90218", name: "Fone Bluetooth ANC", status: "Baixo", tone: "warn" as const, days: "12 dias" },
];

const ledger = [
  { sku: "SKU-10432", type: "ENTRADA", qty: "+120", doc: "NF-e 000.148", store: "Matriz", when: "31/08 14:02", bal: "312" },
  { sku: "SKU-90218", type: "SAÍDA", qty: "-14", doc: "Venda #4821", store: "Filial 01", when: "31/08 13:41", bal: "42" },
  { sku: "SKU-55901", type: "TRANSFERÊNCIA", qty: "-20", doc: "TR-0093", store: "Matriz → F01", when: "31/08 11:20", bal: "27" },
  { sku: "SKU-64200", type: "AJUSTE", qty: "-3", doc: "Avaria", store: "Matriz", when: "31/08 09:58", bal: "61" },
  { sku: "SKU-88431", type: "ENTRADA", qty: "+40", doc: "NF-e 000.147", store: "Filial 02", when: "30/08 17:11", bal: "19" },
];

function typeTone(t: string) {
  if (t === "ENTRADA") return "good" as const;
  if (t === "SAÍDA") return "bad" as const;
  return "neutral" as const;
}

function EstoquePage() {
  return (
    <AppShell
      title="Estoque"
      subtitle="Saldos consolidados · atualizado agora"
      actions={<PrimaryButton icon={ClipboardList}>Novo inventário</PrimaryButton>}
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <div className="grid gap-5 sm:grid-cols-3 xl:col-span-8">
          {stores.map((s) => (
            <Card key={s.name}>
              <Warehouse className="h-8 w-8 rounded-xl bg-mint p-2 text-emerald" />
              <p className="mt-3 font-display text-base font-bold text-foreground">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.items} SKUs · {s.value}</p>
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-forest" style={{ width: `${s.occ}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{s.occ}% de ocupação</p>
            </Card>
          ))}
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
        <CardTitle title="Ledger de movimentações" hint="registro imutável" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">SKU</th>
                <th className="pb-3 font-semibold">Tipo</th>
                <th className="pb-3 font-semibold">Qtd.</th>
                <th className="pb-3 font-semibold">Documento</th>
                <th className="pb-3 font-semibold">Local</th>
                <th className="pb-3 font-semibold">Data</th>
                <th className="pb-3 font-semibold">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((m, i) => (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <td className="py-3.5 font-mono text-xs text-muted-foreground">{m.sku}</td>
                  <td className="py-3.5">
                    <Chip label={m.type} tone={typeTone(m.type)} />
                  </td>
                  <td className="py-3.5 font-semibold text-foreground">{m.qty}</td>
                  <td className="py-3.5 text-muted-foreground">{m.doc}</td>
                  <td className="py-3.5 text-muted-foreground">{m.store}</td>
                  <td className="py-3.5 text-muted-foreground">{m.when}</td>
                  <td className="py-3.5 font-semibold text-foreground">{m.bal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
