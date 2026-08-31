import { createFileRoute } from "@tanstack/react-router";
import { Plus, Phone, Mail, Star, RefreshCw } from "lucide-react";
import { AppShell, Card, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useFornecedoresData } from "@/hooks/useEstroqueApi";

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

function FornecedoresPage() {
  const { data: fornecedores, isLoading, refetch } = useFornecedoresData();

  const totalAtivos = fornecedores?.filter((f) => f.ativo).length || 0;

  return (
    <AppShell
      title="Fornecedores"
      subtitle={`${fornecedores?.length || 0} parceiros cadastrados no sistema`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-card p-2.5 shadow-bento"
            title="Recarregar fornecedores"
          >
            <RefreshCw className={`h-4 w-4 text-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PrimaryButton icon={Plus}>Novo fornecedor</PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-4">
        {[
          { l: "Fornecedores ativos", v: totalAtivos.toString() },
          { l: "Compras no mês", v: "R$ 46.200" },
          { l: "Lead time médio", v: "9 dias" },
          { l: "Entregas em dia", v: "98%" },
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
        {fornecedores?.map((s) => (
          <Card key={s.id || s.cnpj}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold text-foreground">
                  {s.nome_fantasia || s.razao_social}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">{s.cnpj}</p>
              </div>
              <Chip label={s.ativo ? "Ativo" : "Inativo"} tone={s.ativo ? "good" : "neutral"} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-bento bg-muted/60 p-3">
                <p className="text-[11px] text-muted-foreground">Lead time estimado</p>
                <p className="mt-1 text-sm font-bold text-foreground">5 a 8 dias</p>
              </div>
              <div className="rounded-bento bg-muted/60 p-3">
                <p className="text-[11px] text-muted-foreground">Telefone</p>
                <p className="mt-1 text-sm font-bold text-foreground">{s.telefone || "—"}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
                <Star className="h-4 w-4 fill-forest" />
                4.8
              </span>
              <div className="flex gap-2">
                <a
                  href={`tel:${s.telefone}`}
                  aria-label="Ligar"
                  className="rounded-full bg-muted p-2 text-muted-foreground transition-colors hover:bg-mint/50"
                >
                  <Phone className="h-3.5 w-3.5" />
                </a>
                <a
                  href={`mailto:${s.email}`}
                  aria-label="E-mail"
                  className="rounded-full bg-muted p-2 text-muted-foreground transition-colors hover:bg-mint/50"
                >
                  <Mail className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
