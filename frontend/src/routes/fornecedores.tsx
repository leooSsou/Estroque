import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Phone, Mail, Star, RefreshCw, Loader2, AlertCircle, Edit2 } from "lucide-react";
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
  const {
    data: fornecedores,
    isLoading,
    isFetching,
    refetch,
    criarFornecedor,
    isCreating,
    atualizarFornecedor,
    isUpdating,
  } = useFornecedoresData();
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // Modal State - Novo Fornecedor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Modal State - Editar Fornecedor
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editNomeFantasia, setEditNomeFantasia] = useState("");
  const [editRazaoSocial, setEditRazaoSocial] = useState("");
  const [editCnpj, setEditCnpj] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (s: any) => {
    setEditId(s.id);
    setEditNomeFantasia(s.nome_fantasia || "");
    setEditRazaoSocial(s.razao_social || "");
    setEditCnpj(s.cnpj || "");
    setEditAtivo(Boolean(s.ativo));
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editNomeFantasia.trim()) {
      setEditError("O nome fantasia é obrigatório.");
      return;
    }
    if (!editRazaoSocial.trim()) {
      setEditError("A razão social é obrigatória.");
      return;
    }

    try {
      await atualizarFornecedor({
        id: editId,
        data: {
          nome_fantasia: editNomeFantasia.trim(),
          razao_social: editRazaoSocial.trim(),
          ativo: editAtivo,
        },
      });
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Erro ao atualizar fornecedor.");
    }
  };

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
              className={`h-4 w-4 text-foreground ${isFetching || isManualRefreshing ? "animate-spin text-emerald" : ""}`}
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
        {!fornecedores || fornecedores.length === 0 ? (
          <div className="col-span-3 rounded-card border border-border/50 bg-card p-12 text-center text-xs text-muted-foreground">
            Nenhum fornecedor cadastrado no sistema. Clique em "Novo fornecedor" acima para
            adicionar.
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
                  <p className="mt-1 text-xs font-semibold text-foreground truncate">
                    {s.razao_social}
                  </p>
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
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(s)}
                    className="rounded-full bg-muted p-2 text-muted-foreground transition-colors hover:bg-mint/50 hover:text-forest"
                    title="Editar fornecedor"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
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

      {/* Modal / Dialog de Edição de Fornecedor */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Editar Fornecedor
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize as informações comerciais. O CNPJ e Tenant permanecem imutáveis.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <form onSubmit={handleSalvarEdicao} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome Fantasia *
              </label>
              <input
                required
                type="text"
                value={editNomeFantasia}
                onChange={(e) => setEditNomeFantasia(e.target.value)}
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
                value={editRazaoSocial}
                onChange={(e) => setEditRazaoSocial(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CNPJ (Imutável)
              </label>
              <input
                disabled
                type="text"
                value={editCnpj}
                className="w-full rounded-xl border border-border/50 bg-muted/70 px-3.5 py-2.5 font-mono text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* Status Ativo / Inativo */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Status do Fornecedor</p>
                <p className="text-xs text-muted-foreground">Parceiro ativo para compras e NF-e</p>
              </div>
              <button
                type="button"
                onClick={() => setEditAtivo(!editAtivo)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  editAtivo ? "bg-forest" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    editAtivo ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
