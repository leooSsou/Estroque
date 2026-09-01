import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, TrendingUp, RefreshCw } from "lucide-react";
import { AppShell, Card, CardTitle, PrimaryButton } from "@/components/estroque/app-shell";
import { useCurvaABCData, useDashboardData } from "@/hooks/useEstroqueApi";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Curva ABC, CMV e giro | Estroque" },
      {
        name: "description",
        content:
          "Relatórios analíticos do Estroque: curva ABC por faturamento e margem, giro de estoque, CMV consolidado e perdas operacionais.",
      },
      { property: "og:title", content: "Relatórios — Curva ABC, CMV e giro | Estroque" },
      {
        property: "og:description",
        content: "Curva ABC por faturamento e margem, giro de estoque, CMV consolidado e perdas operacionais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatoriosPage,
});

const reports = [
  { name: "Curva ABC de produtos", desc: "Classificação por participação no faturamento" },
  { name: "Giro e cobertura de estoque", desc: "Dias de cobertura por SKU e por loja" },
  { name: "CMV e margem bruta", desc: "Custo das mercadorias vendidas por período" },
  { name: "Inventário e divergências", desc: "Contagens cíclicas e ajustes registrados" },
  { name: "Compras por fornecedor", desc: "Volume, prazos e desempenho de entrega" },
  { name: "Ledger de movimentações", desc: "Exportação completa e auditável" },
];

function RelatoriosPage() {
  const { data: curva, isLoading: isCurvaLoading, isFetching: isCurvaFetching, refetch: refetchCurva } = useCurvaABCData();
  const { data: dash, isLoading: isDashLoading, isFetching: isDashFetching, refetch: refetchDash } = useDashboardData();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const isFetching = isCurvaFetching || isDashFetching;

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([refetchCurva(), refetchDash()]);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  const totalFaturamento = dash?.total_faturamento || 0;
  const produtosCurva = curva?.produtos || [];
  const countA = produtosCurva.filter((p) => p.classe === "A").length;
  const countB = produtosCurva.filter((p) => p.classe === "B").length;
  const countC = produtosCurva.filter((p) => p.classe === "C").length;
  const totalProdutos = countA + countB + countC;

  return (
    <AppShell
      title="Relatórios"
      subtitle="Indicadores gerenciais consolidados"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar relatórios"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${(isFetching || isManualRefreshing) ? "animate-spin text-emerald" : ""}`}
            />
          </button>
          <PrimaryButton icon={Download}>Exportar tudo</PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardTitle title="Faturamento por categoria" hint="% do total" />
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
            Nenhuma movimentação ou categoria registrada no período.
          </div>
        </Card>

        <div className="grid gap-5 xl:col-span-5">
          <section className="gradient-emerald rounded-card p-6">
            <TrendingUp className="h-8 w-8 rounded-xl bg-mint/15 p-2 text-mint" />
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-mint/60">Giro de estoque</p>
            <p className="mt-1 font-display text-4xl font-bold text-mint">
              {totalFaturamento > 0 ? "1,0x" : "0,0x"}
            </p>
            <p className="mt-1 text-xs text-mint/70">
              {totalFaturamento > 0 ? "em análise" : "sem vendas registradas"}
            </p>
          </section>
          <Card>
            <CardTitle title="Curva ABC" />
            <ul className="space-y-3 text-sm">
              {[
                { l: `Classe A (${countA} SKUs)`, v: totalProdutos > 0 ? "80% faturamento" : "0%" },
                { l: `Classe B (${countB} SKUs)`, v: totalProdutos > 0 ? "15% faturamento" : "0%" },
                { l: `Classe C (${countC} SKUs)`, v: totalProdutos > 0 ? "5% faturamento" : "0%" },
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
