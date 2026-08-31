import { createFileRoute } from "@tanstack/react-router";
import { Truck, ArrowRight, PackageCheck, PackageSearch, RefreshCw } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useTransferenciasData } from "@/hooks/useEstroqueApi";

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

function statusTone(s: string) {
  if (s === "DESPACHADO" || s === "Em trânsito") return "warn" as const;
  if (s === "RECEBIDO" || s === "Recebida") return "good" as const;
  if (s === "DIVERGENTE") return "bad" as const;
  return "neutral" as const;
}

function TransferenciasPage() {
  const { transferencias, isLoading, refetch } = useTransferenciasData();

  const emTransito = transferencias.filter((t) => t.status === "DESPACHADO").length;
  const solicitadas = transferencias.filter((t) => t.status === "SOLICITADO").length;
  const concluidas = transferencias.filter((t) => t.status === "RECEBIDO").length;

  return (
    <AppShell
      title="Transferências entre Lojas"
      subtitle={`${transferencias.length} transferências registradas`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full bg-card p-2.5 shadow-bento"
            title="Recarregar transferências"
          >
            <RefreshCw className={`h-4 w-4 text-foreground ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <PrimaryButton icon={Truck}>Nova transferência</PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-3">
        {[
          { l: "Em trânsito", v: emTransito.toString(), i: Truck },
          { l: "Aguardando despacho", v: solicitadas.toString(), i: PackageSearch },
          { l: "Recebidas", v: concluidas.toString(), i: PackageCheck },
        ].map((k) => (
          <Card key={k.l}>
            <k.i className="h-8 w-8 rounded-xl bg-mint p-2 text-emerald" />
            <p className="mt-3 font-display text-2xl font-bold text-foreground">{k.v}</p>
            <p className="text-sm text-muted-foreground">{k.l}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-12">
          <CardTitle title="Romaneios de Transferência" hint="Fluxo logístico integrado" />
          <ul className="space-y-3">
            {transferencias.map((t) => (
              <li
                key={t.id}
                className="flex flex-wrap items-center gap-3 rounded-bento bg-muted/60 p-4 transition-colors hover:bg-muted/90"
              >
                <span className="font-mono text-xs font-bold text-forest">#{t.id.slice(0, 8)}</span>
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {t.loja_origem_id}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  {t.loja_destino_id}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.itens?.reduce((acc, i) => acc + (i.quantidade_solicitada || 0), 0) || 1} itens ·{" "}
                  {new Date(t.data_solicitacao).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="ml-auto">
                  <Chip label={t.status} tone={statusTone(t.status)} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
