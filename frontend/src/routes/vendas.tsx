import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, RefreshCw, Loader2, AlertCircle, ShoppingCart } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useVendasData, useDashboardData, useProdutosData, useLojasData, useClientesData } from "@/hooks/useEstroqueApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — PDV e histórico | Estroque" },
      {
        name: "description",
        content:
          "Registre vendas, acompanhe faturamento diário, ticket médio, formas de pagamento e baixa automática de estoque no Estroque.",
      },
      { property: "og:title", content: "Vendas — PDV e histórico | Estroque" },
      {
        property: "og:description",
        content: "Faturamento diário, ticket médio, formas de pagamento e baixa automática de estoque.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: VendasPage,
});

const days = [
  { d: "25", v: 62 },
  { d: "26", v: 74 },
  { d: "27", v: 58 },
  { d: "28", v: 88 },
  { d: "29", v: 79 },
  { d: "30", v: 94 },
  { d: "31", v: 100 },
];

function VendasPage() {
  const { vendas, isFetching, refetch, criarVenda, isCreating } = useVendasData();
  const { data: dash } = useDashboardData();
  const { data: produtos } = useProdutosData();
  const { data: lojas } = useLojasData();
  const { clientes } = useClientesData();

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [lojaId, setLojaId] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [formaPagamento, setFormaPagamento] = useState("PIX");
  const [desconto, setDesconto] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  const selectedProduto = produtos?.find((p) => p.id === (produtoId || produtos[0]?.id));
  const selectedCliente = clientes?.find((c) => c.id === clienteId);
  const precoUnitario = selectedProduto?.preco_venda || 0;
  const qtdNum = Math.max(1, parseInt(quantidade, 10) || 1);
  const descontoNum = Math.max(0, parseFloat(desconto) || 0);
  const totalCalculado = Math.max(0, qtdNum * precoUnitario - descontoNum);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  const handleRegistrarVenda = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const activeLojaId = lojaId || lojas?.[0]?.id;
    const activeProdutoId = produtoId || produtos?.[0]?.id;

    if (!activeLojaId) {
      setFormError("Selecione uma loja física.");
      return;
    }
    if (!activeProdutoId) {
      setFormError("Selecione ao menos um produto para a venda.");
      return;
    }
    if (qtdNum <= 0) {
      setFormError("A quantidade deve ser pelo menos 1.");
      return;
    }

    if (formaPagamento === "CREDIARIO") {
      if (!clienteId) {
        setFormError("Vendas no crediário exigem a seleção de um cliente cadastrado.");
        return;
      }
      if (selectedCliente) {
        const disponivel = selectedCliente.limite_credito - selectedCliente.saldo_devedor_crediario;
        if (totalCalculado > disponivel) {
          setFormError(
            `Limite de crediário insuficiente. Limite disponível: R$ ${disponivel.toFixed(2)}.`
          );
          return;
        }
      }
    }

    try {
      await criarVenda({
        loja_id: activeLojaId,
        cliente_id: clienteId || null,
        forma_pagamento: formaPagamento,
        desconto: descontoNum,
        itens: [
          {
            produto_id: activeProdutoId,
            quantidade: qtdNum,
          },
        ],
      });

      // Limpar formulário e fechar modal
      setQuantidade("1");
      setDesconto("0");
      setClienteId("");
      setFormError(null);
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || "Erro ao registrar venda. Verifique o estoque disponível.");
    }
  };

  const faturamento = `R$ ${(dash?.total_faturamento ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const ticketMedio = `R$ ${(dash?.ticket_medio ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <AppShell
      title="Vendas & Frente de Caixa"
      subtitle={`${faturamento} faturados no período`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar vendas"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${(isFetching || isManualRefreshing) ? "animate-spin text-emerald" : ""}`}
            />
          </button>
          <div onClick={() => setIsModalOpen(true)}>
            <PrimaryButton icon={Plus}>Nova venda</PrimaryButton>
          </div>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <section className="gradient-emerald rounded-card p-6 xl:col-span-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint/60">
            Faturamento do mês
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-mint">{faturamento}</p>
          <p className="mt-1 text-xs text-mint/70">
            {dash?.total_itens_vendidos || 0} itens vendidos
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              { l: "Ticket médio", v: ticketMedio },
              { l: "Vendas", v: `${vendas.length} reg.` },
              { l: "Itens vendidos", v: `${dash?.total_itens_vendidos || 0}` },
              { l: "Devoluções", v: "0%" },
            ].map((s) => (
              <div key={s.l} className="rounded-bento bg-mint/10 p-3">
                <p className="text-[11px] text-mint/70">{s.l}</p>
                <p className="mt-1 text-sm font-bold text-mint">{s.v}</p>
              </div>
            ))}
          </div>
        </section>

        <Card className="xl:col-span-8">
          <CardTitle title="Vendas por dia" hint="últimos 7 dias" />
          <div className="flex h-48 items-end gap-4">
            {days.map((d) => (
              <div key={d.d} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-xl bg-forest"
                  style={{ height: `${d.v}%` }}
                  aria-label={`Dia ${d.d}`}
                />
                <span className="text-xs text-muted-foreground">{d.d}/08</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle title="Histórico de vendas" hint="registro em tempo real" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">Venda</th>
                <th className="pb-3 font-semibold">Cliente</th>
                <th className="pb-3 font-semibold">Itens</th>
                <th className="pb-3 font-semibold">Pagamento</th>
                <th className="pb-3 font-semibold">Total</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {vendas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                    Nenhuma venda registrada no sistema.
                  </td>
                </tr>
              ) : (
                vendas.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                    <td className="py-3 font-mono font-bold text-forest">#{s.id.slice(0, 6)}</td>
                    <td className="py-3 font-medium text-foreground">{s.cliente_id || "Consumidor Final"}</td>
                    <td className="py-3 text-muted-foreground">{s.itens?.length || 1} itens</td>
                    <td className="py-3">
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
                        {s.forma_pagamento || s.tipo_pagamento}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-foreground">
                      R$ {s.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3">
                      <Chip label={s.status || "Concluída"} tone="good" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Nova Venda (PDV) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <ShoppingCart className="h-5 w-5 text-forest" />
              Nova Venda (Frente de Caixa)
            </DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs font-semibold text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleRegistrarVenda} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Loja de Saída *
              </label>
              <select
                value={lojaId || lojas?.[0]?.id || ""}
                onChange={(e) => setLojaId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              >
                {(!lojas || lojas.length === 0) ? (
                  <option value="">Nenhuma loja cadastrada</option>
                ) : (
                  lojas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome} ({l.cnpj})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Produto *
              </label>
              <select
                value={produtoId || produtos?.[0]?.id || ""}
                onChange={(e) => setProdutoId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              >
                {(!produtos || produtos.length === 0) ? (
                  <option value="">Nenhum produto cadastrado</option>
                ) : (
                  produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — SKU: {p.sku} (R$ {p.preco_venda.toFixed(2)})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quantidade *
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Desconto (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                  placeholder="0,00"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Forma de Pagamento *
              </label>
              <select
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest"
              >
                <option value="PIX">PIX (Instantâneo)</option>
                <option value="DINHEIRO">Dinheiro (À vista)</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                <option value="CREDIARIO">Crediário da Loja</option>
              </select>
            </div>

            {/* Cliente */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente {formaPagamento === "CREDIARIO" ? "*" : "(Opcional)"}
                </label>
                {selectedCliente && (
                  <span className="text-[11px] font-medium text-forest">
                    Disponível: R${" "}
                    {(
                      selectedCliente.limite_credito - selectedCliente.saldo_devedor_crediario
                    ).toFixed(2)}
                  </span>
                )}
              </div>
              <select
                value={clienteId}
                onChange={(e) => setClienteId(e.target.value)}
                required={formaPagamento === "CREDIARIO"}
                className={`w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-forest ${
                  formaPagamento === "CREDIARIO" && !clienteId
                    ? "border-amber-500 bg-amber-500/5"
                    : "border-border"
                }`}
              >
                <option value="">
                  {formaPagamento === "CREDIARIO"
                    ? "Selecione o cliente (Obrigatório para crediário)"
                    : "Consumidor Final (Não identificado)"}
                </option>
                {clientes?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} — CPF/CNPJ: {c.documento} (Limite: R$ {c.limite_credito.toFixed(2)})
                  </option>
                ))}
              </select>
              {formaPagamento === "CREDIARIO" && (
                <p className="text-[10px] text-amber-700 dark:text-amber-400">
                  ⚠️ Vendas a prazo debitam diretamente do limite de crédito do cliente no sistema.
                </p>
              )}
            </div>

            {/* Resumo da Venda */}
            <div className="rounded-xl bg-muted/60 p-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Preço unitário:</span>
                <span>R$ {precoUnitario.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal ({qtdNum} un.):</span>
                <span>R$ {(qtdNum * precoUnitario).toFixed(2)}</span>
              </div>
              {descontoNum > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Desconto:</span>
                  <span>- R$ {descontoNum.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border/40 pt-2 text-sm font-bold text-foreground">
                <span>Total a Pagar:</span>
                <span className="text-forest">R$ {totalCalculado.toFixed(2)}</span>
              </div>
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
                    Registrando...
                  </>
                ) : (
                  "Concluir Venda"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
