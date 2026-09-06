import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Save,
  Building2,
  Users,
  Bell,
  ShieldCheck,
  Check,
  Warehouse,
  Plus,
  Edit2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useUserData, useLojasData } from "@/hooks/useEstroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Lojas, equipe e alertas | Estroque" },
      {
        name: "description",
        content:
          "Configure lojas, permissões da equipe, regras de estoque mínimo, alertas de ruptura e integrações fiscais no Estroque.",
      },
      { property: "og:title", content: "Configurações — Lojas, equipe e alertas | Estroque" },
      {
        property: "og:description",
        content: "Lojas, permissões, estoque mínimo, alertas de ruptura e integrações fiscais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfiguracoesPage,
});

const defaultToggles = [
  {
    id: "ruptura",
    l: "Alertar ruptura prevista",
    d: "Notifica quando a cobertura cai abaixo de 7 dias",
    on: true,
  },
  {
    id: "bloqueio",
    l: "Bloquear venda sem saldo",
    d: "Impede saída física com saldo insuficiente",
    on: true,
  },
  {
    id: "custo_medio",
    l: "Custo médio ponderado",
    d: "Recalcula o custo a cada entrada de NF-e",
    on: true,
  },
  {
    id: "resumo",
    l: "Resumo diário por e-mail",
    d: "Enviado às 19h para administradores",
    on: false,
  },
];

function ConfiguracoesPage() {
  const { data: user } = useUserData();
  const {
    data: lojas,
    criarLoja,
    isCreating: isCreatingLoja,
    atualizarLoja,
    isUpdating: isUpdatingLoja,
  } = useLojasData();
  const [toggles, setToggles] = useState(defaultToggles);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Modal State - Nova Filial
  const [isNovaLojaOpen, setIsNovaLojaOpen] = useState(false);
  const [novaLojaNome, setNovaLojaNome] = useState("");
  const [novaLojaCnpj, setNovaLojaCnpj] = useState("");
  const [novaLojaEndereco, setNovaLojaEndereco] = useState("");
  const [novaLojaError, setNovaLojaError] = useState<string | null>(null);

  // Modal State - Editar Filial
  const [isEditLojaOpen, setIsEditLojaOpen] = useState(false);
  const [editLojaId, setEditLojaId] = useState("");
  const [editLojaNome, setEditLojaNome] = useState("");
  const [editLojaCnpj, setEditLojaCnpj] = useState("");
  const [editLojaEndereco, setEditLojaEndereco] = useState("");
  const [editLojaAtivo, setEditLojaAtivo] = useState(true);
  const [editLojaError, setEditLojaError] = useState<string | null>(null);

  const handleSalvarNovaLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    setNovaLojaError(null);

    const cnpjLimpo = novaLojaCnpj.replace(/\D/g, "");
    if (!novaLojaNome.trim()) {
      setNovaLojaError("O nome da filial é obrigatório.");
      return;
    }
    if (cnpjLimpo.length !== 14) {
      setNovaLojaError("O CNPJ da filial deve conter 14 dígitos válidos.");
      return;
    }
    if (!novaLojaEndereco.trim()) {
      setNovaLojaError("O endereço completo é obrigatório.");
      return;
    }

    try {
      await criarLoja({
        nome: novaLojaNome.trim(),
        cnpj: cnpjLimpo,
        endereco: novaLojaEndereco.trim(),
      });
      setNovaLojaNome("");
      setNovaLojaCnpj("");
      setNovaLojaEndereco("");
      setIsNovaLojaOpen(false);
    } catch (err: any) {
      setNovaLojaError(err.message || "Erro ao cadastrar filial.");
    }
  };

  const handleOpenEditLoja = (l: any) => {
    setEditLojaId(l.id);
    setEditLojaNome(l.nome);
    setEditLojaCnpj(l.cnpj);
    setEditLojaEndereco(l.endereco || "");
    setEditLojaAtivo(Boolean(l.ativo));
    setEditLojaError(null);
    setIsEditLojaOpen(true);
  };

  const handleSalvarEdicaoLoja = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLojaError(null);

    if (!editLojaNome.trim()) {
      setEditLojaError("O nome da filial é obrigatório.");
      return;
    }
    if (!editLojaEndereco.trim()) {
      setEditLojaError("O endereço completo é obrigatório.");
      return;
    }

    try {
      await atualizarLoja({
        id: editLojaId,
        data: {
          nome: editLojaNome.trim(),
          endereco: editLojaEndereco.trim(),
          ativo: editLojaAtivo,
        },
      });
      setIsEditLojaOpen(false);
    } catch (err: any) {
      setEditLojaError(err.message || "Erro ao atualizar filial.");
    }
  };

  const toggleItem = (id: string) => {
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, on: !t.on } : t)));
  };

  const handleSalvar = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <AppShell
      title="Configurações"
      subtitle="Empresa, equipe e regras de operação"
      showLojaSelector={false}
      actions={
        <PrimaryButton icon={savedSuccess ? Check : Save} onClick={handleSalvar}>
          {savedSuccess ? "Alterações Salvas!" : "Salvar alterações"}
        </PrimaryButton>
      }
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <CardTitle title="Dados do Tenant & Empresa" hint="Sincronizado com o Backend" />
          <Building2 className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Inquilino (Tenant ID)
              </span>
              <p className="mt-1 font-mono text-xs font-bold text-forest truncate">
                {user?.tenant_id || "Carregando..."}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Usuário Conectado
              </span>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {user?.nome || "Administrador"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                E-mail Administrativo
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.email || "admin@estroque.app"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Papel / Permissão
              </span>
              <div className="mt-1">
                <Chip label={user?.role || "DONO"} tone="good" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <CardTitle title="Regras e alertas" hint="aplicadas a todas as lojas" />
          <Bell className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <ul className="mt-4 space-y-3">
            {toggles.map((t) => (
              <li
                key={t.id}
                onClick={() => toggleItem(t.id)}
                className="flex cursor-pointer items-center gap-4 rounded-bento bg-muted/60 p-3.5 transition-colors hover:bg-muted/90"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.l}</p>
                  <p className="text-xs text-muted-foreground">{t.d}</p>
                </div>
                <span
                  className={
                    t.on
                      ? "flex h-6 w-11 items-center rounded-full bg-forest px-1"
                      : "flex h-6 w-11 items-center rounded-full bg-border px-1"
                  }
                >
                  <span
                    className={
                      t.on
                        ? "ml-auto h-4 w-4 rounded-full bg-card shadow-sm"
                        : "h-4 w-4 rounded-full bg-card shadow-sm"
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-7">
          <div className="flex items-center justify-between">
            <CardTitle title="Lojas e filiais cadastradas" hint="multi-loja integrado" />
            <button
              type="button"
              onClick={() => setIsNovaLojaOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-forest px-3.5 py-1.5 text-xs font-semibold text-mint transition-all hover:opacity-90 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              Nova Filial
            </button>
          </div>
          <Warehouse className="mt-2 h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <div className="mt-4 space-y-3">
            {!lojas || lojas.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma loja cadastrada.</p>
            ) : (
              lojas.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-3.5 text-xs transition-colors hover:bg-muted/40"
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">{l.nome}</p>
                    <p className="font-mono text-muted-foreground">CNPJ: {l.cnpj}</p>
                    <p className="text-muted-foreground">{l.endereco || "Endereço matriz"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip
                      label={l.ativo ? "Operacional" : "Inativa"}
                      tone={l.ativo ? "good" : "neutral"}
                    />
                    <button
                      type="button"
                      onClick={() => handleOpenEditLoja(l)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-muted"
                      title="Editar filial"
                    >
                      <Edit2 className="h-3 w-3 text-forest" />
                      Editar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardTitle title="Integrações fiscais" />
          <ShieldCheck className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <ul className="mt-4 space-y-3">
            {[
              { l: "Certificado digital A1", v: "Não configurado", tone: "neutral" as const },
              { l: "SEFAZ — importação de XML", v: "Pronto para XML v4.00", tone: "good" as const },
              { l: "Emissor de NFC-e", v: "Em homologação", tone: "warn" as const },
            ].map((i) => (
              <li
                key={i.l}
                className="flex items-center justify-between gap-3 rounded-bento bg-muted/60 p-3.5"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{i.l}</p>
                  <p className="text-xs text-muted-foreground">{i.v}</p>
                </div>
                <Chip
                  label={
                    i.tone === "good" ? "Disponível" : i.tone === "warn" ? "Em teste" : "Pendente"
                  }
                  tone={i.tone}
                />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Modal / Dialog de Nova Filial */}
      <Dialog open={isNovaLojaOpen} onOpenChange={setIsNovaLojaOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              Cadastrar Nova Filial
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre uma nova loja física no inquilino para gestão de estoque e frente de caixa
              (PDV).
            </DialogDescription>
          </DialogHeader>

          {novaLojaError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{novaLojaError}</span>
            </div>
          )}

          <form onSubmit={handleSalvarNovaLoja} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome da Filial / Loja *
              </label>
              <input
                required
                type="text"
                placeholder="Ex: Filial Centro"
                value={novaLojaNome}
                onChange={(e) => setNovaLojaNome(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                CNPJ da Filial *
              </label>
              <input
                required
                type="text"
                placeholder="00.000.000/0001-00"
                value={novaLojaCnpj}
                onChange={(e) => setNovaLojaCnpj(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 font-mono text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Endereço Completo *
              </label>
              <input
                required
                type="text"
                placeholder="Av. Paulista, 1000 - Bela Vista, São Paulo - SP"
                value={novaLojaEndereco}
                onChange={(e) => setNovaLojaEndereco(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNovaLojaOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreatingLoja}
                className="flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {isCreatingLoja ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Cadastrar Filial"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal / Dialog de Edição de Filial */}
      <Dialog open={isEditLojaOpen} onOpenChange={setIsEditLojaOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">Editar Filial</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize o nome e endereço da filial. O CNPJ e Tenant permanecem imutáveis.
            </DialogDescription>
          </DialogHeader>

          {editLojaError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-medium text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{editLojaError}</span>
            </div>
          )}

          <form onSubmit={handleSalvarEdicaoLoja} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome da Filial *
              </label>
              <input
                required
                type="text"
                value={editLojaNome}
                onChange={(e) => setEditLojaNome(e.target.value)}
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
                value={editLojaCnpj}
                className="w-full rounded-xl border border-border/50 bg-muted/70 px-3.5 py-2.5 font-mono text-sm text-muted-foreground cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Endereço Completo *
              </label>
              <input
                required
                type="text"
                value={editLojaEndereco}
                onChange={(e) => setEditLojaEndereco(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            {/* Status Operacional */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Status Operacional</p>
                <p className="text-xs text-muted-foreground">
                  Habilitar ou suspender operações da loja
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditLojaAtivo(!editLojaAtivo)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  editLojaAtivo ? "bg-forest" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    editLojaAtivo ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <DialogFooter className="mt-6 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditLojaOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdatingLoja}
                className="flex items-center gap-2 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint shadow-md transition-opacity hover:opacity-95 disabled:opacity-50"
              >
                {isUpdatingLoja ? (
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
