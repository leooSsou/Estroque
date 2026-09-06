import { useState, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  CreditCard,
  CircleDollarSign,
  UserCheck,
  Search,
  Edit2,
} from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useClientesData } from "@/hooks/useEstroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes & Crediário | Estroque" },
      {
        name: "description",
        content:
          "Gerencie a base de clientes, limites de crédito para vendas a prazo (crediário) e saldos em aberto no Estroque.",
      },
      { property: "og:title", content: "Clientes & Crediário | Estroque" },
      {
        property: "og:description",
        content: "Controle de clientes, limites de crédito e saldos devedores de crediário.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientesPage,
});

function formatarDocumento(doc: string): string {
  const limpo = doc.replace(/\D/g, "");
  if (limpo.length === 11) {
    return limpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (limpo.length === 14) {
    return limpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return doc;
}

function ClientesPage() {
  const {
    clientes,
    isLoading,
    isFetching,
    refetch,
    criarCliente,
    isCreating,
    atualizarCliente,
    isUpdating,
  } = useClientesData();

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [busca, setBusca] = useState("");

  // Form State - Novo Cliente
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [documento, setDocumento] = useState("");
  const [limiteCredito, setLimiteCredito] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  // Form State - Editar Cliente & Crediário
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editDocumento, setEditDocumento] = useState("");
  const [editLimiteCredito, setEditLimiteCredito] = useState("0");
  const [editSaldoDevedor, setEditSaldoDevedor] = useState("0");
  const [editAtivo, setEditAtivo] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);

  const handleOpenEdit = (c: any) => {
    setEditId(c.id);
    setEditNome(c.nome);
    setEditEmail(c.email);
    setEditDocumento(c.documento);
    setEditLimiteCredito((c.limite_credito || 0).toString());
    setEditSaldoDevedor((c.saldo_devedor_crediario || 0).toString());
    setEditAtivo(Boolean(c.ativo));
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editNome.trim()) {
      setEditError("O nome do cliente é obrigatório.");
      return;
    }
    if (!editEmail.trim() || !editEmail.includes("@")) {
      setEditError("Informe um e-mail válido.");
      return;
    }
    const limiteNum = parseFloat(editLimiteCredito.replace(",", ".")) || 0;
    const saldoNum = parseFloat(editSaldoDevedor.replace(",", ".")) || 0;

    if (limiteNum < 0) {
      setEditError("O limite de crédito não pode ser negativo.");
      return;
    }
    if (saldoNum < 0) {
      setEditError("O saldo devedor não pode ser negativo.");
      return;
    }

    try {
      await atualizarCliente({
        id: editId,
        data: {
          nome: editNome.trim(),
          email: editEmail.trim().toLowerCase(),
          ativo: editAtivo,
          limite_credito: limiteNum,
          saldo_devedor_crediario: saldoNum,
        },
      });
      setIsEditModalOpen(false);
    } catch (err: any) {
      setEditError(err.message || "Erro ao atualizar dados do cliente.");
    }
  };

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // Filtro de busca
  const clientesFiltrados = useMemo(() => {
    if (!busca.trim()) return clientes;
    const q = busca.toLowerCase().trim();
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.documento.includes(q.replace(/\D/g, "")),
    );
  }, [clientes, busca]);

  // KPIs
  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter((c) => c.ativo).length;
  const totalLimiteConcedido = clientes.reduce((acc, c) => acc + (c.limite_credito || 0), 0);
  const totalSaldoDevedor = clientes.reduce((acc, c) => acc + (c.saldo_devedor_crediario || 0), 0);

  const handleSalvarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const docLimpo = documento.replace(/\D/g, "");
    if (docLimpo.length !== 11 && docLimpo.length !== 14) {
      setFormError("Informe um CPF válido (11 dígitos) ou CNPJ válido (14 dígitos).");
      return;
    }

    const limiteNum = parseFloat(limiteCredito.replace(",", ".")) || 0;
    if (limiteNum < 0) {
      setFormError("O limite de crédito não pode ser negativo.");
      return;
    }

    try {
      await criarCliente({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        documento: docLimpo,
        limite_credito: limiteNum,
      });

      // Reset form
      setNome("");
      setEmail("");
      setDocumento("");
      setLimiteCredito("0");
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(
        err.message || "Erro ao cadastrar cliente. Verifique se o CPF/CNPJ já está cadastrado.",
      );
    }
  };

  return (
    <AppShell
      title="Clientes & Crediário"
      subtitle={`${totalClientes} ${totalClientes === 1 ? "cliente cadastrado" : "clientes cadastrados"}`}
      searchValue={busca}
      onSearchChange={setBusca}
      searchPlaceholder="Buscar por nome, e-mail ou documento..."
      showLojaSelector={false}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar clientes"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${
                isFetching || isManualRefreshing ? "animate-spin text-emerald" : ""
              }`}
            />
          </button>
          <PrimaryButton icon={Plus} onClick={() => setIsModalOpen(true)}>
            Novo cliente
          </PrimaryButton>
        </div>
      }
    >
      {/* Bento Grid KPIs */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Card Total de Clientes */}
        <section className="gradient-emerald rounded-card p-6 xl:col-span-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint/60">
              Base de Clientes
            </p>
            <p className="mt-2 font-display text-4xl font-bold text-mint">{totalClientes}</p>
            <p className="mt-1 text-xs text-mint/70">
              {clientesAtivos} {clientesAtivos === 1 ? "cliente ativo" : "clientes ativos"}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2 text-xs text-mint">
            <UserCheck className="h-4 w-4 text-mint/80" />
            <span>Cadastro centralizado multi-tenant</span>
          </div>
        </section>

        {/* 2 Bento Cards de Crediário */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:col-span-8">
          {/* Limite Total Concedido */}
          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald">
                <CreditCard className="h-3 w-3" />
                Limite de Crédito
              </span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">
                R$ {totalLimiteConcedido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Crédito rotativo total concedido</p>
            </div>
          </article>

          {/* Saldo Devedor / A Receber */}
          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  totalSaldoDevedor > 0
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-mint text-emerald"
                }`}
              >
                <CircleDollarSign className="h-3 w-3" />
                {totalSaldoDevedor > 0 ? "A Receber" : "Em Dia"}
              </span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">
                R$ {totalSaldoDevedor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Saldo devedor total em crediário</p>
            </div>
          </article>
        </div>
      </div>

      {/* Tabela de Clientes */}
      <Card className="mt-6">
        <CardTitle
          title="Diretório de Clientes"
          hint="Consulte dados cadastrais, limite disponível e histórico de crediário"
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                <th className="pb-3 font-semibold">Cliente</th>
                <th className="pb-3 font-semibold">Documento</th>
                <th className="pb-3 text-right font-semibold">Limite de Crédito</th>
                <th className="pb-3 text-right font-semibold">Saldo Devedor</th>
                <th className="pb-3 text-right font-semibold">Disponível</th>
                <th className="pb-3 text-center font-semibold">Status</th>
                <th className="pb-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-center">
                      <Users className="h-10 w-10 text-muted-foreground/40" />
                      <p className="mt-3 text-sm font-semibold text-foreground">
                        {busca.trim() ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                      </p>
                      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                        {busca.trim()
                          ? "Tente ajustar os termos da busca para encontrar o cliente desejado."
                          : "Cadastre seus clientes para gerenciar vendas a prazo no crediário e histórico de consumo."}
                      </p>
                      {!busca.trim() && (
                        <button
                          type="button"
                          onClick={() => setIsModalOpen(true)}
                          className="mt-4 rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-mint transition-opacity hover:opacity-90"
                        >
                          Cadastrar Primeiro Cliente
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => {
                  const disponivel = Math.max(0, c.limite_credito - c.saldo_devedor_crediario);
                  const percUtilizado =
                    c.limite_credito > 0
                      ? Math.min(
                          100,
                          Math.round((c.saldo_devedor_crediario / c.limite_credito) * 100),
                        )
                      : 0;

                  const iniciais = c.nome
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase();

                  return (
                    <tr
                      key={c.id}
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-mint">
                            {iniciais}
                          </span>
                          <div>
                            <p className="font-semibold text-foreground">{c.nome}</p>
                            <p className="text-xs text-muted-foreground">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 font-mono text-xs text-muted-foreground">
                        {formatarDocumento(c.documento)}
                      </td>
                      <td className="py-3.5 text-right font-display text-sm font-semibold text-foreground">
                        R$ {c.limite_credito.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-right">
                        <span
                          className={`font-display text-sm font-semibold ${
                            c.saldo_devedor_crediario > 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          R${" "}
                          {c.saldo_devedor_crediario.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                        {c.limite_credito > 0 && c.saldo_devedor_crediario > 0 ? (
                          <div className="mt-1 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
                            <span>{percUtilizado}% usado</span>
                          </div>
                        ) : null}
                      </td>
                      <td className="py-3.5 text-right font-display text-sm font-bold text-emerald">
                        R$ {disponivel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 text-center">
                        <Chip
                          label={c.ativo ? "Ativo" : "Inativo"}
                          tone={c.ativo ? "good" : "neutral"}
                        />
                      </td>
                      <td className="py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground transition-all hover:border-forest/50 hover:bg-muted active:scale-95"
                          title="Editar dados e limites de crédito"
                        >
                          <Edit2 className="h-3 w-3 text-forest" />
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Novo Cliente */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarCliente} className="space-y-4 py-2">
            {formError ? (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Nome Completo</label>
              <input
                type="text"
                required
                placeholder="Ex: Maria Silva ou Razão Social"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            {/* Documento (CPF / CNPJ) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">CPF ou CNPJ</label>
              <input
                type="text"
                required
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-forest"
              />
              <p className="text-[10px] text-muted-foreground">
                Informe 11 dígitos para CPF ou 14 dígitos para CNPJ.
              </p>
            </div>

            {/* E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">E-mail</label>
              <input
                type="email"
                required
                placeholder="cliente@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            {/* Limite de Crédito (Crediário) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Limite de Crédito para Crediário (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={limiteCredito}
                onChange={(e) => setLimiteCredito(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-forest"
              />
              <p className="text-[10px] text-muted-foreground">
                Valor máximo permitido para compras a prazo sem pagamento imediato.
              </p>
            </div>

            <DialogFooter className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="flex items-center gap-1.5 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-mint hover:opacity-90 disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Cadastrar Cliente"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Cliente & Crediário */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Cliente & Crediário</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ajuste limites de crédito, abata saldo devedor de crediário ou altere dados de
              contato.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEdicao} className="space-y-4 py-2">
            {editError ? (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            ) : null}

            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nome Completo *
              </label>
              <input
                required
                type="text"
                value={editNome}
                onChange={(e) => setEditNome(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  E-mail *
                </label>
                <input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>

              {/* Documento (Imutável) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Documento (Imutável)
                </label>
                <input
                  disabled
                  type="text"
                  value={formatarDocumento(editDocumento)}
                  className="w-full rounded-xl border border-border/50 bg-muted/70 px-3.5 py-2.5 font-mono text-sm text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border/50 pt-2">
              {/* Limite de Crédito */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Limite de Crédito (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editLimiteCredito}
                  onChange={(e) => setEditLimiteCredito(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none focus:border-forest"
                />
              </div>

              {/* Saldo Devedor */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saldo Devedor Atual (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editSaldoDevedor}
                  onChange={(e) => setEditSaldoDevedor(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm font-semibold text-amber-600 outline-none focus:border-forest"
                />
                <p className="text-[10px] text-muted-foreground">
                  Altere para 0 após quitar débitos
                </p>
              </div>
            </div>

            {/* Status Ativo / Inativo */}
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Status do Cliente</p>
                <p className="text-xs text-muted-foreground">
                  Bloquear ou liberar vendas no crediário
                </p>
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

            <DialogFooter className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isUpdating}
                className="flex items-center gap-1.5 rounded-full bg-forest px-5 py-2 text-xs font-semibold text-mint hover:opacity-90 disabled:opacity-50"
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
