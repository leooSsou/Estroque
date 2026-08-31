import { createFileRoute } from "@tanstack/react-router";
import { Plus, Filter, Download } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";

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

const products = [
  { sku: "SKU-10432", name: "Cabo HDMI 2.1 — 2m", cat: "Cabos", cost: "R$ 18,40", price: "R$ 39,90", margin: "53,9%", stock: 312, abc: "A" },
  { sku: "SKU-90218", name: "Fone Bluetooth ANC", cat: "Áudio", cost: "R$ 142,00", price: "R$ 329,00", margin: "56,8%", stock: 42, abc: "A" },
  { sku: "SKU-55901", name: "Teclado Mecânico 75%", cat: "Periféricos", cost: "R$ 218,00", price: "R$ 459,00", margin: "52,5%", stock: 27, abc: "B" },
  { sku: "SKU-77120", name: "Mouse Sem Fio 4000dpi", cat: "Periféricos", cost: "R$ 61,00", price: "R$ 129,90", margin: "53,0%", stock: 8, abc: "B" },
  { sku: "SKU-31877", name: "Hub USB-C 7 em 1", cat: "Acessórios", cost: "R$ 96,50", price: "R$ 219,00", margin: "55,9%", stock: 0, abc: "C" },
  { sku: "SKU-64200", name: "Webcam Full HD", cat: "Vídeo", cost: "R$ 128,00", price: "R$ 279,00", margin: "54,1%", stock: 61, abc: "B" },
  { sku: "SKU-88431", name: "Suporte Monitor Articulado", cat: "Acessórios", cost: "R$ 174,00", price: "R$ 389,00", margin: "55,3%", stock: 19, abc: "C" },
];

function ProdutosPage() {
  return (
    <AppShell
      title="Produtos"
      subtitle="1.284 SKUs cadastrados · 3 lojas sincronizadas"
      actions={<PrimaryButton icon={Plus}>Novo produto</PrimaryButton>}
    >
      <div className="grid gap-5 md:grid-cols-4">
        {[
          { l: "SKUs ativos", v: "1.284" },
          { l: "Valor em estoque", v: "R$ 148.500" },
          { l: "Abaixo do mínimo", v: "17 itens" },
          { l: "Zerados", v: "4 itens" },
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
          <CardTitle title="Catálogo" />
          <div className="ml-auto flex gap-2">
            {["Todos", "Classe A", "Classe B", "Classe C"].map((t, i) => (
              <button
                key={t}
                type="button"
                className={
                  i === 0
                    ? "rounded-full bg-mint px-3 py-1.5 text-xs font-bold text-emerald"
                    : "rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                }
              >
                {t}
              </button>
            ))}
            <button type="button" className="rounded-full bg-muted p-2 text-muted-foreground">
              <Filter className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="rounded-full bg-muted p-2 text-muted-foreground">
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
                <th className="pb-3 font-semibold">Saldo</th>
                <th className="pb-3 font-semibold">ABC</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.sku} className="border-b border-border/60 last:border-0">
                  <td className="py-3.5 font-mono text-xs text-muted-foreground">{p.sku}</td>
                  <td className="py-3.5 font-semibold text-foreground">{p.name}</td>
                  <td className="py-3.5 text-muted-foreground">{p.cat}</td>
                  <td className="py-3.5 text-muted-foreground">{p.cost}</td>
                  <td className="py-3.5 font-semibold text-foreground">{p.price}</td>
                  <td className="py-3.5 text-forest">{p.margin}</td>
                  <td className="py-3.5">
                    {p.stock === 0 ? (
                      <Chip label="Zerado" tone="bad" />
                    ) : p.stock < 10 ? (
                      <Chip label={`${p.stock} un.`} tone="warn" />
                    ) : (
                      <span className="font-semibold text-foreground">{p.stock} un.</span>
                    )}
                  </td>
                  <td className="py-3.5">
                    <Chip label={p.abc} tone={p.abc === "A" ? "good" : "neutral"} />
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
