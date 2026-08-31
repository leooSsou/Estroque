import { createFileRoute } from "@tanstack/react-router";
import { Plus, Phone, Mail, Star } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";

export const Route = createFileRoute("/fornecedores")({
  head: () => ({
    meta: [
      { title: "Fornecedores — Compras e prazos | Estroque" },
      {
        name: "description",
        content:
          "Cadastro de fornecedores no Estroque: CNPJ, contatos, lead time médio, volume comprado e desempenho de entrega.",
      },
      { property: "og:title", content: "Fornecedores — Compras e prazos | Estroque" },
      {
        property: "og:description",
        content: "Lead time, volume comprado e desempenho de entrega de cada fornecedor.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FornecedoresPage,
});

const suppliers = [
  { name: "TecDistribuidora LTDA", cnpj: "12.345.678/0001-90", lead: "5 dias", vol: "R$ 84.200", score: 4.8, status: "Ativo", tone: "good" as const },
  { name: "Global Cabos S/A", cnpj: "98.765.432/0001-11", lead: "8 dias", vol: "R$ 31.700", score: 4.4, status: "Ativo", tone: "good" as const },
  { name: "Áudio Prime Import", cnpj: "45.998.221/0001-05", lead: "14 dias", vol: "R$ 52.900", score: 3.9, status: "Atenção", tone: "warn" as const },
  { name: "Periféricos BR", cnpj: "31.004.556/0001-72", lead: "6 dias", vol: "R$ 18.350", score: 4.1, status: "Ativo", tone: "good" as const },
  { name: "NorteTech Suprimentos", cnpj: "77.221.884/0001-33", lead: "21 dias", vol: "R$ 7.480", score: 3.2, status: "Inativo", tone: "bad" as const },
];

function FornecedoresPage() {
  return (
    <AppShell
      title="Fornecedores"
      subtitle="24 parceiros cadastrados · lead time médio de 9 dias"
      actions={<PrimaryButton icon={Plus}>Novo fornecedor</PrimaryButton>}
    >
      <div className="grid gap-5 md:grid-cols-4">
        {[
          { l: "Fornecedores ativos", v: "21" },
          { l: "Compras no mês", v: "R$ 46.200" },
          { l: "Lead time médio", v: "9 dias" },
          { l: "Entregas em atraso", v: "3" },
        ].map((k) => (
          <Card key={k.l}>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {k.l}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-foreground">{k.v}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {suppliers.map((s) => (
          <Card key={s.cnpj}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold text-foreground">{s.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{s.cnpj}</p>
              </div>
              <Chip label={s.status} tone={s.tone} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-bento bg-muted/60 p-3">
                <p className="text-[11px] text-muted-foreground">Lead time</p>
                <p className="mt-1 text-sm font-bold text-foreground">{s.lead}</p>
              </div>
              <div className="rounded-bento bg-muted/60 p-3">
                <p className="text-[11px] text-muted-foreground">Volume 12m</p>
                <p className="mt-1 text-sm font-bold text-foreground">{s.vol}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
                <Star className="h-4 w-4 fill-forest" />
                {s.score.toFixed(1)}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label="Ligar"
                  className="rounded-full bg-muted p-2 text-muted-foreground"
                >
                  <Phone className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="E-mail"
                  className="rounded-full bg-muted p-2 text-muted-foreground"
                >
                  <Mail className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
