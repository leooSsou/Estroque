import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, TrendingUp } from "lucide-react";
import { AppShell, Card, CardTitle, PrimaryButton } from "@/components/estroque/app-shell";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Curva ABC, CMV e giro | Estroque" },
      {
        name: "description",
        content:
          "Relatórios gerenciais do Estroque: Curva ABC, giro de estoque, CMV, margem por categoria e exportação em Excel e PDF.",
      },
      { property: "og:title", content: "Relatórios — Curva ABC, CMV e giro | Estroque" },
      {
        property: "og:description",
        content: "Curva ABC, giro de estoque, CMV e margem por categoria com exportação em Excel e PDF.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatoriosPage,
});

const categories = [
  { name: "Periféricos", rev: 32, margin: "52,5%" },
  { name: "Áudio", rev: 26, margin: "56,8%" },
  { name: "Cabos", rev: 18, margin: "53,9%" },
  { name: "Acessórios", rev: 14, margin: "55,3%" },
  { name: "Vídeo", rev: 10, margin: "54,1%" },
];

const reports = [
  { name: "Curva ABC de produtos", desc: "Classificação por participação no faturamento" },
  { name: "Giro e cobertura de estoque", desc: "Dias de cobertura por SKU e por loja" },
  { name: "CMV e margem bruta", desc: "Custo das mercadorias vendidas por período" },
  { name: "Inventário e divergências", desc: "Contagens cíclicas e ajustes registrados" },
  { name: "Compras por fornecedor", desc: "Volume, prazos e desempenho de entrega" },
  { name: "Ledger de movimentações", desc: "Exportação completa e auditável" },
];

function RelatoriosPage() {
  return (
    <AppShell
      title="Relatórios"
      subtitle="Indicadores gerenciais · agosto 2026"
      actions={<PrimaryButton icon={Download}>Exportar tudo</PrimaryButton>}
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardTitle title="Faturamento por categoria" hint="% do total" />
          <ul className="space-y-4">
            {categories.map((c) => (
              <li key={c.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-foreground">{c.name}</span>
                  <span className="text-muted-foreground">
                    {c.rev}% · margem {c.margin}
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-forest"
                    style={{ width: `${(c.rev / 32) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-5 xl:col-span-5">
          <section className="gradient-emerald rounded-card p-6">
            <TrendingUp className="h-8 w-8 rounded-xl bg-mint/15 p-2 text-mint" />
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-mint/60">Giro de estoque</p>
            <p className="mt-1 font-display text-4xl font-bold text-mint">5,8x</p>
            <p className="mt-1 text-xs text-mint/70">ao ano · cobertura média de 63 dias</p>
          </section>
          <Card>
            <CardTitle title="Curva ABC" />
            <ul className="space-y-3 text-sm">
              {[
                { l: "Classe A — 20% dos SKUs", v: "80% do faturamento" },
                { l: "Classe B — 30% dos SKUs", v: "15% do faturamento" },
                { l: "Classe C — 50% dos SKUs", v: "5% do faturamento" },
              ].map((r) => (
                <li key={r.l} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="font-semibold text-foreground">{r.v}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardTitle title="Relatórios disponíveis" hint="Excel · PDF · CSV" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((r) => (
            <button
              key={r.name}
              type="button"
              className="flex items-start gap-3 rounded-bento bg-muted/60 p-4 text-left transition-colors hover:bg-mint/60"
            >
              <FileSpreadsheet className="h-9 w-9 shrink-0 rounded-xl bg-card p-2 text-forest" />
              <span>
                <span className="block text-sm font-semibold text-foreground">{r.name}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
