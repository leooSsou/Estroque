import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Phone, Mail, Star, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { AppShell, Card, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useFornecedoresData } from "@/hooks/useEstroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const { data: fornecedores, isLoading, isFetching, refetch, criarFornecedor, isCreating } = useFornecedoresData();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const totalAtivos = fornecedores?.filter((f) => f.ativo).length || 0;

  const handleSalvarFornecedor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!nomeFantasia.trim()) {
      setFormError("O nome fantasia é obrigatório.");
      return;
    }
    if (!razaoSocial.trim()) {
      setFormError("A razão social é obrigatória.");
      return;
    }
    if (!cnpj.trim()) {
      setFormError("O CNPJ é obrigatório.");
      return;
    }

    try {
      await criarFornecedor({
        nome_fantasia: nomeFantasia.trim(),
        razao_social: razaoSocial.trim(),
        cnpj: cnpj.trim(),
      });

      setNomeFantasia("");
      setRazaoSocial("");
      setCnpj("");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao cadastrar fornecedor.");
    }
  };

  return (
    <AppShell
      title="Fornecedores"
      subtitle={`${fornecedores?.length || 0} parceiros cadastrados no sistema`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar fornecedores"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${(isFetching || isManualRefreshing) ? "animate-spin text-emerald" : ""}`}
            />
          </button>
          <div onClick={() => setIsModalOpen(true)}>
            <PrimaryButton icon={Plus}>Novo fornecedor</PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 md:grid-cols-4">
        {[
          { l: "Fornecedores ativos", v: totalAtivos.toString() },
          { l: "Total cadastrados", v: (fornecedores?.length || 0).toString() },
          { l: "Lead time médio", v: "—" },
          { l: "Entregas em dia", v: "100%" },
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
        {(!fornecedores || fornecedores.length === 0) ? (
          <div className="col-span-3 rounded-card border border-border/50 bg-card p-12 text-center text-xs text-muted-foreground">
            Nenhum fornecedor cadastrado no sistema. Clique em "Novo fornecedor" acima para adicionar.
          </div>
        ) : (
          fornecedores.map((s) => (
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
                  <p className="text-[11px] text-muted-foreground">Razão Social</p>
                  <p className="mt-1 text-xs font-semibold text-foreground truncate">{s.razao_social}</p>
                </div>
                <div className="rounded-bento bg-muted/60 p-3">
                  <p className="text-[11px] text-muted-foreground">Telefone</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{s.telefone || "—"}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest">
                  <Star className="h-4 w-4 fill-forest" />
                  5.0
                </span>
                <div className="flex gap-2">
                  {s.telefone && (
                    <a
                      href={`tel:${s.telefone}`}
                      aria-label="Ligar"
                      className="rounded-full bg-muted p-2 text-muted-foreground transition-colors hover:bg-mint/50"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {s.email && (
                    <a
                      href={`mailto:${s.email}`}
                      aria-label="E-mail"
                      className="rounded-full bg-muted p-2 text-muted-foreground transition-colors hover:bg-mint/50"
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal / Dialog de Cadastro de Novo Fornecedor */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Novo Fornecedor</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um fornecedor parceiro para vincular a entradas de mercadoria e NF-e.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSalvarFornecedor} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome Fantasia *
              </label>
              <input
                required
                type="text"
                placeholder="Ex: TecDistribuidora"
                value={nomeFantasia}
                onChange={(e) => setNomeFantasia(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Razão Social *
              </label>
              <input
                required
                type="text"
                placeholder="Ex: TecDistribuidora Comércio e Importação LTDA"
                value={razaoSocial}
                onChange={(e) => setRazaoSocial(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CNPJ *
              </label>
              <input
                required
                type="text"
                placeholder="00.000.000/0001-00"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground outline-none focus:border-forest"
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
                    Salvando...
                  </>
                ) : (
                  "Cadastrar Fornecedor"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
