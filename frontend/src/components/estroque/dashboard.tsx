import { useState } from "react";
import {
  ClipboardList,
  FileDown,
  Truck,
  Plus,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  BarChart3,
  Layers,
  ShoppingBag,
} from "lucide-react";
import { AppShell } from "./app-shell";
import {
  useDashboardData,
  useCurvaABCData,
  useEstoqueData,
  useLojasData,
  useProdutosData,
  useVendasData,
} from "@/hooks/useEstroqueApi";

const typeStyles: Record<string, string> = {
  ENTRADA: "bg-mint text-emerald",
  SAIDA: "bg-destructive/10 text-destructive",
  SAÍDA: "bg-destructive/10 text-destructive",
  TRANSFERENCIA_ENTRADA: "bg-sage/25 text-pine",
  TRANSFERENCIA_SAIDA: "bg-sage/25 text-pine",
  TRANSFERÊNCIA: "bg-sage/25 text-pine",
  AJUSTE_POSITIVO: "bg-mint text-emerald",
  AJUSTE_NEGATIVO: "bg-destructive/10 text-destructive",
  AUDITORIA: "bg-muted text-muted-foreground",
};

function Donut({
  aPct = 0,
  bPct = 0,
  cPct = 0,
  totalItens = 0,
  hasData = false,
}: {
  aPct?: number;
  bPct?: number;
  cPct?: number;
  totalItens?: number;
  hasData?: boolean;
}) {
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;

  if (!hasData) {
    return (
      <svg viewBox="0 0 160 160" className="h-40 w-40">
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="14"
          strokeDasharray="4 4"
        />
        <text
          x="80"
          y="76"
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] uppercase font-semibold"
        >
          Pareto
        </text>
        <text
          x="80"
          y="92"
          textAnchor="middle"
          className="fill-muted-foreground font-display text-[13px] font-bold"
        >
          Sem dados
        </text>
      </svg>
    );
  }

  const slices = [
    { label: "Classe A", pct: aPct, color: "var(--emerald-deep)" },
    { label: "Classe B", pct: bPct, color: "var(--forest)" },
    { label: "Classe C", pct: cPct, color: "var(--sage)" },
  ];

  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40">
      {slices.map((s) => {
        const len = (s.pct / 100) * c;
        const el = (
          <circle
            key={s.label}
            cx="80"
            cy="80"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="18"
            strokeLinecap="round"
            strokeDasharray={`${len - 4} ${c - len + 4}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 80 80)"
          />
        );
        offset += len;
        return el;
      })}
      <text
        x="80"
        y="76"
        textAnchor="middle"
        className="fill-muted-foreground text-[9px] uppercase font-semibold tracking-wider"
      >
        Pareto
      </text>
      <text
        x="80"
        y="94"
        textAnchor="middle"
        className="fill-foreground font-display text-[15px] font-bold"
      >
        {totalItens} {totalItens === 1 ? "item" : "itens"}
      </text>
    </svg>
  );
}

export function EstroqueDashboard() {
  const { data: dash, isFetching: isDashFetching, refetch: refetchDash } = useDashboardData();
  const { data: curva, isLoading: isCurvaLoading } = useCurvaABCData();
  const { saldos, movimentacoes } = useEstoqueData();
  const { data: lojas } = useLojasData();
  const { data: produtos } = useProdutosData();
  const { vendas } = useVendasData();

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetchDash();
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  // Valores reais dos KPIs retornados pelo Backend
  const faturamentoLiquido = dash?.faturamento_liquido ?? dash?.total_faturamento ?? 0;
  const ticketMedio = dash?.ticket_medio ?? 0;
  const cmv = dash?.cmv ?? 0;
  const lucroLiquido = dash?.lucro_liquido ?? 0;
  const margemLucro = dash?.margem_lucro ?? 0;
  const rupturas = dash?.ruptura_count ?? dash?.produtos_ruptura ?? 0;
  const criticos = dash?.estoque_critico_count ?? dash?.produtos_estoque_critico ?? 0;

  const faturamentoFormatado = `R$ ${faturamentoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const ticketMedioFormatado = `R$ ${ticketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const cmvFormatado = `R$ ${cmv.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const lucroFormatado = `R$ ${lucroLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Curva ABC real
  const produtosCurva = curva?.itens || curva?.produtos || [];
  const countA = produtosCurva.filter((p) => p.classe === "A").length;
  const countB = produtosCurva.filter((p) => p.classe === "B").length;
  const countC = produtosCurva.filter((p) => p.classe === "C").length;
  const totalProdutosCurva = countA + countB + countC;

  const pctA = totalProdutosCurva > 0 ? Math.round((countA / totalProdutosCurva) * 100) : 0;
  const pctB = totalProdutosCurva > 0 ? Math.round((countB / totalProdutosCurva) * 100) : 0;
  const pctC = totalProdutosCurva > 0 ? Math.max(0, 100 - pctA - pctB) : 0;
  const temDadosCurva = totalProdutosCurva > 0;

  // Helpers de nomes
  const getNomeLoja = (id: string) => lojas?.find((l) => l.id === id)?.nome || id.slice(0, 8);
  const getNomeProduto = (id: string) => produtos?.find((p) => p.id === id)?.nome || "Produto";

  return (
    <AppShell
      title="Dashboard"
      subtitle="Visão executiva consolidada em tempo real"
      actions={
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isDashFetching || isManualRefreshing}
          className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
          title="Recarregar Indicadores"
        >
          <RefreshCw
            className={`h-4 w-4 text-foreground ${(isDashFetching || isManualRefreshing) ? "animate-spin text-emerald" : ""}`}
          />
        </button>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Card de Faturamento Consolidado */}
        <section className="gradient-emerald rounded-card p-6 xl:col-span-4 flex flex-col justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint/60">
              Faturamento Consolidado
            </p>
            <p className="mt-2 font-display text-4xl font-bold text-mint">{faturamentoFormatado}</p>
            <p className="mt-1 text-xs text-mint/70">
              {lojas?.length ?? 0} {lojas?.length === 1 ? "loja ativa" : "lojas ativas"} · {vendas?.length ?? 0} vendas realizadas
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {[
              { label: "Nova Venda", icon: Plus, href: "/vendas" },
              { label: "Importar XML", icon: FileDown, href: "/nfe" },
              { label: "Transferência", icon: Truck, href: "/transferencias" },
              { label: "Auditoria", icon: ClipboardList, href: "/estoque" },
            ].map((a) => (
              <a
                key={a.label}
                href={a.href}
                className="flex items-center gap-2 rounded-full bg-mint/12 px-3 py-2.5 text-xs font-semibold text-mint transition-colors hover:bg-mint/20"
              >
                <a.icon className="h-3.5 w-3.5" />
                {a.label}
              </a>
            ))}
          </div>
        </section>

        {/* 4 Bento KPIs Reais */}
        <div className="grid grid-cols-2 gap-5 xl:col-span-8">
          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald">
                <TrendingUp className="h-3 w-3" />
                Líquido
              </span>
              <span className="text-[11px] text-muted-foreground">Lucro: {lucroFormatado}</span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">{faturamentoFormatado}</p>
              <p className="mt-1 text-xs text-muted-foreground">Faturamento Mensal</p>
            </div>
          </article>

          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald">
                <ShoppingBag className="h-3 w-3" />
                {vendas.length} {vendas.length === 1 ? "venda" : "vendas"}
              </span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">{ticketMedioFormatado}</p>
              <p className="mt-1 text-xs text-muted-foreground">Ticket Médio por Venda</p>
            </div>
          </article>

          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                rupturas > 0 || criticos > 0 ? "bg-destructive/10 text-destructive" : "bg-mint text-emerald"
              }`}>
                {rupturas > 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                {criticos} críticos
              </span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">{rupturas} itens</p>
              <p className="mt-1 text-xs text-muted-foreground">Rupturas de Estoque (Zerados)</p>
            </div>
          </article>

          <article className="bento-card p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald">
                CMV: {cmvFormatado}
              </span>
            </div>
            <div>
              <p className="mt-4 font-display text-2xl font-bold text-foreground">
                {margemLucro.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Margem de Lucro Operacional</p>
            </div>
          </article>
        </div>

        {/* Gráfico de Vendas & CMV */}
        <section className="bento-card p-6 xl:col-span-8 flex flex-col justify-between">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Fluxo de Vendas & CMV</h2>
              <p className="text-xs text-muted-foreground">
                Consolidação financeira de saídas e custo de mercadoria
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald" /> Faturamento
              </span>
              <span className="flex items-center gap-1 ml-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sage" /> Custo (CMV)
              </span>
            </div>
          </div>

          {vendas.length === 0 ? (
            <div className="my-10 flex flex-col items-center justify-center text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-semibold text-foreground">Sem vendas registradas no período</p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Conforme as vendas forem efetuadas no PDV, o volume de receita e o CMV correspondente serão desenhados aqui em tempo real.
              </p>
              <a
                href="/vendas"
                className="mt-4 rounded-full bg-forest px-4 py-1.5 text-xs font-semibold text-mint transition-opacity hover:opacity-90"
              >
                Abrir Frente de Caixa
              </a>
            </div>
          ) : (
            <div className="mt-8 flex h-52 items-end gap-3">
              {vendas.slice(-7).map((v) => {
                const maxVal = Math.max(...vendas.map((x) => x.valor_total), 1);
                const heightPct = Math.min(100, Math.max(15, Math.round((v.valor_total / maxVal) * 100)));
                const labelData = v.data_venda
                  ? new Date(v.data_venda).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  : `#${v.id.slice(0, 4)}`;
                return (
                  <div key={v.id} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-[10px] font-semibold text-foreground/80">
                      R$ {Math.round(v.valor_total)}
                    </span>
                    <div className="flex h-36 w-full items-end justify-center">
                      <div
                        className="w-full max-w-[44px] rounded-t-md bg-emerald hover:bg-forest transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`Venda: R$ ${v.valor_total.toFixed(2)}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
                      {labelData}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Curva ABC (Pareto) */}
        <section className="bento-card flex flex-col items-center p-6 xl:col-span-4">
          <div className="flex w-full items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Curva ABC</h2>
            <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-emerald">
              {isCurvaLoading ? "Calculando..." : "Pareto 80/15/5"}
            </span>
          </div>

          <div className="my-4">
            <Donut aPct={pctA} bPct={pctB} cPct={pctC} totalItens={totalProdutosCurva} hasData={temDadosCurva} />
          </div>

          {!temDadosCurva ? (
            <p className="text-center text-xs text-muted-foreground">
              Nenhum produto faturado no momento para cálculo da Curva ABC.
            </p>
          ) : (
            <ul className="w-full space-y-2.5">
              <li className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--emerald-deep)" }} />
                <span className="flex-1 text-xs text-muted-foreground">Classe A ({countA} itens - 80% Receita)</span>
                <span className="text-xs font-semibold text-foreground">{pctA}%</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--forest)" }} />
                <span className="flex-1 text-xs text-muted-foreground">Classe B ({countB} itens - 15% Receita)</span>
                <span className="text-xs font-semibold text-foreground">{pctB}%</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--sage)" }} />
                <span className="flex-1 text-xs text-muted-foreground">Classe C ({countC} itens - 5% Receita)</span>
                <span className="text-xs font-semibold text-foreground">{pctC}%</span>
              </li>
            </ul>
          )}
        </section>

        {/* Ledger de Movimentações Recentes */}
        <section className="bento-card p-6 xl:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Ledger de Movimentações</h2>
              <p className="text-xs text-muted-foreground">Extrato imutável e auditável em tempo real</p>
            </div>
            <a
              href="/estoque"
              className="rounded-full bg-emerald px-4 py-2 text-xs font-semibold text-mint transition-opacity hover:opacity-90"
            >
              Ver estoque completo
            </a>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-border pb-2">
                  <th className="pb-3 font-semibold">Produto / Ref</th>
                  <th className="pb-3 font-semibold">Loja</th>
                  <th className="pb-3 font-semibold">Tipo</th>
                  <th className="pb-3 text-right font-semibold">Qtd.</th>
                  <th className="pb-3 text-right font-semibold">Data</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-xs text-muted-foreground">
                      Nenhuma movimentação registrada no ledger de estoque.
                    </td>
                  </tr>
                ) : (
                  movimentacoes.slice(0, 5).map((m) => {
                    const tipo = m.tipo || m.tipo_movimentacao || "MOVIMENTAÇÃO";
                    const isPositive = tipo.includes("ENTRADA") || tipo.includes("POSITIVO");
                    const badgeClass = typeStyles[tipo] || "bg-muted text-muted-foreground";
                    const qtdText = isPositive ? `+${Math.abs(m.quantidade)}` : `-${Math.abs(m.quantidade)}`;
                    const qtdColor = isPositive ? "text-emerald" : "text-destructive";

                    return (
                      <tr key={m.id} className="border-t border-border">
                        <td className="py-3">
                          <p className="font-semibold text-foreground">{getNomeProduto(m.produto_id)}</p>
                          <p className="text-xs text-muted-foreground">{m.motivo || m.observacao || "Movimentação"}</p>
                        </td>
                        <td className="py-3 text-muted-foreground">{getNomeLoja(m.loja_id)}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeClass}`}>
                            {tipo}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-semibold ${qtdColor}`}>
                          {qtdText}
                        </td>
                        <td className="py-3 text-right text-xs text-muted-foreground">
                          {new Date(m.data_movimentacao).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Atividades Recentes */}
        <section className="bento-card p-6 xl:col-span-4">
          <h2 className="text-base font-bold text-foreground">Atividades do Sistema</h2>
          <p className="text-xs text-muted-foreground mb-4">Eventos operacionais recentes</p>
          {movimentacoes.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
              <Layers className="h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-xs text-muted-foreground">Nenhuma atividade recente registrada.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {movimentacoes.slice(0, 5).map((m) => {
                const tipo = m.tipo || m.tipo_movimentacao || "MOV";
                const isPositive = tipo.includes("ENTRADA") || tipo.includes("POSITIVO");
                const badgeColor = isPositive ? "bg-mint text-emerald" : "bg-destructive/10 text-destructive";
                const qtdText = isPositive ? `+${Math.abs(m.quantidade)}` : `-${Math.abs(m.quantidade)}`;

                return (
                  <li key={m.id} className="flex gap-3 text-xs">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-[10px] ${badgeColor}`}>
                      {tipo.slice(0, 2)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground truncate">
                        {getNomeProduto(m.produto_id)}
                      </p>
                      <p className="text-muted-foreground">
                        {qtdText} un. · {getNomeLoja(m.loja_id)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        {new Date(m.data_movimentacao).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© 2026 Estroque · Gestão de Estoque Inteligente</p>
        <p>Multi-loja · Multi-tenant · Ledger imutável auditável</p>
      </footer>
    </AppShell>
  );
}
