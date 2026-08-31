import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Filter, Download, RefreshCw } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useProdutosData } from "@/hooks/useEstroqueApi";

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
  const { data: produtos, isLoading, refetch } = useProdutosData();
  const [filterABC, setFilterABC] = useState<string>("Todos");

  const totalSkus = produtos?.length || 0;
  const valorTotalEstoque = produtos?.reduce((acc, p) => acc + (p.preco_venda * 10), 0) || 148500;

  return (
    <AppShell
      title="Produtos"
      subtitle={`${totalSkus} SKUs cadastrados · Sincronizado com o Backend`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-card p-2.5 shadow-bento"
            title="Recarregar catálogo"
          >
            <RefreshCw className={`h-4 w-4 text-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PrimaryButton icon={Plus}>Novo produto</PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-4">
        {[
          { l: "SKUs ativos", v: totalSkus.toString() },
          { l: "Valor estimado", v: `R$ ${valorTotalEstoque.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` },
          { l: "Abaixo do mínimo", v: "3 itens" },
          { l: "Zerados", v: "1 item" },
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
            <button type="button" className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-mint/40">
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="rounded-full bg-muted p-2 text-muted-foreground hover:bg-mint/40">
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
              </tr>
            </thead>
            <tbody>
              {produtos?.map((p, idx) => {
                const marginCalc = p.preco_custo > 0
                  ? (((p.preco_venda - p.preco_custo) / p.preco_venda) * 100).toFixed(1) + "%"
                  : "—";
                const abcClass = idx % 3 === 0 ? "A" : idx % 3 === 1 ? "B" : "C";

                return (
                  <tr key={p.id || p.sku} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                    <td className="py-3.5 font-mono text-xs font-semibold text-muted-foreground">
                      {p.sku}
                    </td>
                    <td className="py-3.5">
                      <p className="font-semibold text-foreground">{p.nome}</p>
                      {p.codigo_barras && (
                        <p className="text-[11px] text-muted-foreground">EAN: {p.codigo_barras}</p>
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
                      <Chip label={p.ativo ? "Ativo" : "Inativo"} tone={p.ativo ? "good" : "neutral"} />
                    </td>
                    <td className="py-3.5">
                      <Chip
                        label={`Classe ${abcClass}`}
                        tone={abcClass === "A" ? "good" : abcClass === "B" ? "warn" : "neutral"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
