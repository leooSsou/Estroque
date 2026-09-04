import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Truck,
  PackageSearch,
  PackageCheck,
  ArrowRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Send,
  CheckCircle2,
} from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useTransferenciasData, useLojasData, useProdutosData } from "@/hooks/useEstroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/transferencias")({
  head: () => ({
    meta: [
      { title: "Transferências entre Lojas | Estroque" },
      {
        name: "description",
        content:
          "Romaneios de transferência, controle de trânsito entre filiais e conciliação de recebimento no Estroque.",
      },
      { property: "og:title", content: "Transferências entre Lojas | Estroque" },
      {
        property: "og:description",
        content: "Romaneios de transferência, controle de trânsito e conciliação entre filiais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransferenciasPage,
});

function statusTone(status: string) {
  if (status === "RECEBIDO") return "good" as const;
  if (status === "DESPACHADO") return "warn" as const;
  if (status === "DIVERGENTE") return "bad" as const;
  return "neutral" as const;
}

function TransferenciasPage() {
  const {
    transferencias,
    isFetching,
    refetch,
    criarTransferencia,
    isCreating,
    despachar,
    receber,
  } = useTransferenciasData();

  const { data: lojas } = useLojasData();
  const { data: produtos } = useProdutosData();

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Form State
  const [lojaOrigemId, setLojaOrigemId] = useState("");
  const [lojaDestinoId, setLojaDestinoId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [formError, setFormError] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  const handleSolicitarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const origem = lojaOrigemId || lojas?.[0]?.id;
    const destino = lojaDestinoId || lojas?.[1]?.id || lojas?.[0]?.id;
    const produto = produtoId || produtos?.[0]?.id;
    const qtdNum = parseInt(quantidade, 10) || 1;

    if (!origem || !destino) {
      setFormError("Selecione a loja de origem e a loja de destino.");
      return;
    }
    if (origem === destino) {
      setFormError("A loja de origem e destino devem ser diferentes.");
      return;
    }
    if (!produto) {
      setFormError("Selecione um produto para transferir.");
      return;
    }
    if (qtdNum <= 0) {
      setFormError("A quantidade deve ser maior que zero.");
      return;
    }

    try {
      await criarTransferencia({
        loja_origem_id: origem,
        loja_destino_id: destino,
        produto_id: produto,
        quantidade: qtdNum,
      });

      setQuantidade("1");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao solicitar transferência.");
    }
  };

  const handleDespachar = async (id: string) => {
    setActionLoadingId(id);
    try {
      await despachar(id);
    } catch (err: any) {
      alert(err.message || "Erro ao despachar transferência. Verifique se há saldo suficiente na loja de origem.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReceber = async (t: any) => {
    setActionLoadingId(t.id);
    try {
      await receber({
        id: t.id,
        data: {
          quantidade_recebida: t.quantidade,
        },
      });
    } catch (err: any) {
      alert(err.message || "Erro ao confirmar recebimento.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const emTransito = transferencias.filter((t) => t.status === "DESPACHADO").length;
  const solicitadas = transferencias.filter((t) => t.status === "SOLICITADO").length;
  const concluidas = transferencias.filter((t) => t.status === "RECEBIDO").length;

  const getNomeLoja = (id: string) => {
    return lojas?.find((l) => l.id === id)?.nome || id.slice(0, 8);
  };

  const getNomeProduto = (id: string) => {
    return produtos?.find((p) => p.id === id)?.nome || "Item";
  };

  return (
    <AppShell
      title="Transferências entre Lojas"
      subtitle={`${transferencias.length} transferências registradas`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar transferências"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${(isFetching || isManualRefreshing) ? "animate-spin text-emerald" : ""}`}
            />
          </button>
          <div onClick={() => setIsModalOpen(true)}>
            <PrimaryButton icon={Truck}>Nova transferência</PrimaryButton>
          </div>
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
            {transferencias.length === 0 ? (
              <li className="py-10 text-center text-xs text-muted-foreground">
                Nenhuma transferência solicitada ou em trânsito.
              </li>
            ) : (
              transferencias.map((t) => (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-bento bg-muted/60 p-4 transition-colors hover:bg-muted/90"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs font-bold text-forest">#{t.id.slice(0, 8)}</span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      {getNomeLoja(t.loja_origem_id)}
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                      {getNomeLoja(t.loja_destino_id)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t.quantidade} un. ({getNomeProduto(t.produto_id)}) ·{" "}
                      {t.data_solicitacao
                        ? new Date(t.data_solicitacao).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Recente"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    <Chip label={t.status} tone={statusTone(t.status)} />

                    {t.status === "SOLICITADO" && (
                      <button
                        type="button"
                        onClick={() => handleDespachar(t.id)}
                        disabled={actionLoadingId === t.id}
                        className="flex items-center gap-1.5 rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-mint shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {actionLoadingId === t.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Despachar
                      </button>
                    )}

                    {t.status === "DESPACHADO" && (
                      <button
                        type="button"
                        onClick={() => handleReceber(t)}
                        disabled={actionLoadingId === t.id}
                        className="flex items-center gap-1.5 rounded-full bg-emerald px-3 py-1.5 text-xs font-semibold text-mint shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                      >
                        {actionLoadingId === t.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        Confirmar Recebimento
                      </button>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Truck className="h-5 w-5 text-forest" />
              Solicitar Transferência entre Lojas
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSolicitarTransferencia} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Loja de Origem *
                </label>
                <select
                  value={lojaOrigemId || lojas?.[0]?.id || ""}
                  onChange={(e) => setLojaOrigemId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-forest"
                >
                  {lojas?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Loja de Destino *
                </label>
                <select
                  value={lojaDestinoId || lojas?.[1]?.id || lojas?.[0]?.id || ""}
                  onChange={(e) => setLojaDestinoId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-forest"
                >
                  {lojas?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Produto a Transferir *
              </label>
              <select
                value={produtoId || produtos?.[0]?.id || ""}
                onChange={(e) => setProdutoId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              >
                {produtos?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (SKU: {p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quantidade a Transferir *
              </label>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-forest"
              />
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Solicitando...
                  </>
                ) : (
                  "Solicitar Romaneio"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
