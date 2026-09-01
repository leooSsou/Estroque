import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  FileDown,
  Search,
  Store,
  Truck,
  Plus,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import {
  useDashboardData,
  useCurvaABCData,
  useEstoqueData,
  useLojasData,
} from "@/hooks/useEstroqueApi";

const flow = [
  { m: "Jan", v: 58, d: 34 },
  { m: "Fev", v: 62, d: 38 },
  { m: "Mar", v: 71, d: 41 },
  { m: "Abr", v: 66, d: 36 },
  { m: "Mai", v: 78, d: 44 },
  { m: "Jun", v: 74, d: 39 },
  { m: "Jul", v: 85, d: 47 },
  { m: "Ago", v: 82, d: 43 },
  { m: "Set", v: 90, d: 50 },
  { m: "Out", v: 87, d: 46 },
  { m: "Nov", v: 96, d: 52 },
  { m: "Dez", v: 100, d: 55 },
];

const activity = [
  { who: "Camila Duarte", what: "registrou venda #4821 — R$ 1.240,00", when: "há 12 min" },
  { who: "Rafael Lima", what: "importou NF-e 000.148 (32 itens)", when: "há 48 min" },
  { who: "Marina Alves", what: "despachou transferência para Filial 01", when: "há 2 h" },
  { who: "Bruno Teixeira", what: "ajustou inventário: avaria (-3 un.)", when: "há 4 h" },
];

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

function Donut({ aPct = 80, bPct = 15, cPct = 5 }: { aPct?: number; bPct?: number; cPct?: number }) {
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;

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
        className="fill-muted-foreground text-[9px] uppercase"
      >
        Itens
      </text>
      <text
        x="80"
        y="94"
        textAnchor="middle"
        className="fill-foreground font-display text-[19px] font-bold"
      >
        100%
      </text>
    </svg>
  );
}

export function EstroqueDashboard() {
  const { data: dash, isLoading: isDashLoading, refetch: refetchDash } = useDashboardData();
  const { data: curva, isLoading: isCurvaLoading } = useCurvaABCData();
  const { saldos, movimentacoes } = useEstoqueData();
  const { data: lojas } = useLojasData();

  const [selectedLoja, setSelectedLoja] = useState<string>("Todas as Lojas");
  const [showLojaDropdown, setShowLojaDropdown] = useState(false);

  // Calcula totais dos KPIs
  const faturamentoFormatado = `R$ ${(dash?.total_faturamento ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const ticketMedioFormatado = `R$ ${(dash?.ticket_medio ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const rupturas = dash?.produtos_ruptura ?? 0;
  const criticos = dash?.produtos_estoque_critico ?? 0;

  // Curva ABC percentuais
  const produtosCurva = curva?.produtos || [];
  const countA = produtosCurva.filter((p) => p.classe === "A").length;
  const countB = produtosCurva.filter((p) => p.classe === "B").length;
  const countC = produtosCurva.filter((p) => p.classe === "C").length;
  const totalProdutos = countA + countB + countC;
  const pctA = totalProdutos > 0 ? Math.round((countA / totalProdutos) * 100) : 0;
  const pctB = totalProdutos > 0 ? Math.round((countB / totalProdutos) * 100) : 0;
  const pctC = totalProdutos > 0 ? Math.max(0, 100 - pctA - pctB) : 0;

  return (
    <div className="min-h-screen flex-1 px-5 py-6 lg:px-8">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão executiva consolidada · Agosto 2026
          </p>
        </div>

        {/* Store Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLojaDropdown(!showLojaDropdown)}
            className="flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-[0_4px_20px_-2px_rgb(11_43_38_/_0.05)] transition-all hover:bg-muted"
          >
            <Store className="h-4 w-4 text-forest" />
            {selectedLoja}
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {showLojaDropdown && (
            <div className="absolute right-0 top-12 z-20 w-48 rounded-2xl border border-border bg-card p-1.5 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedLoja("Todas as Lojas");
                  setShowLojaDropdown(false);
                }}
                className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-foreground hover:bg-mint hover:text-emerald"
              >
                Todas as Lojas (Consolidado)
              </button>
              {lojas?.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setSelectedLoja(l.nome);
                    setShowLojaDropdown(false);
                  }}
                  className="w-full rounded-xl px-3 py-2 text-left text-xs font-medium text-foreground hover:bg-mint hover:text-emerald"
                >
                  {l.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Global Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar produto, SKU, NF-e…"
            className="w-64 rounded-xl border border-border bg-card py-2 pl-9 pr-16 text-sm outline-none focus:border-forest"
          />
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ⌘K
          </span>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => refetchDash()}
          title="Recarregar Dados da API"
          className="rounded-full bg-card p-2.5 shadow-[0_4px_20px_-2px_rgb(11_43_38_/_0.05)] transition-transform hover:rotate-180"
        >
          <RefreshCw className={`h-4 w-4 text-foreground ${isDashLoading ? "animate-spin" : ""}`} />
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notificações"
          className="relative rounded-full bg-card p-2.5 shadow-[0_4px_20px_-2px_rgb(11_43_38_/_0.05)]"
        >
          <Bell className="h-4 w-4 text-foreground" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

        {/* User profile */}
        <div className="flex items-center gap-2 rounded-full bg-card py-1.5 pl-1.5 pr-4 shadow-[0_4px_20px_-2px_rgb(11_43_38_/_0.05)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald text-xs font-bold text-mint">
            JG
          </span>
          <span className="text-sm font-semibold text-foreground">Jonathas G.</span>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Featured action card */}
        <section className="gradient-emerald rounded-card p-6 xl:col-span-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint/60">
            Faturamento consolidado
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-mint">{faturamentoFormatado}</p>
          <p className="mt-1 text-xs text-mint/70">
            {lojas?.length ?? 0} {lojas?.length === 1 ? "loja cadastrada" : "lojas cadastradas"} · {dash ? "API online" : "carregando..."}
          </p>

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

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-5 xl:col-span-8">
          <article className="bento-card p-5">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald">
                <TrendingUp className="h-3 w-3" />
                +12,4%
              </span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-6 font-display text-2xl font-bold text-foreground">{faturamentoFormatado}</p>
            <p className="mt-1 text-xs text-muted-foreground">Faturamento Mensal</p>
          </article>

          <article className="bento-card p-5">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald">
                <TrendingUp className="h-3 w-3" />
                +5,2%
              </span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-6 font-display text-2xl font-bold text-foreground">{ticketMedioFormatado}</p>
            <p className="mt-1 text-xs text-muted-foreground">Ticket Médio</p>
          </article>

          <article className="bento-card p-5">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive">
                <TrendingDown className="h-3 w-3" />
                {criticos} críticos
              </span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-6 font-display text-2xl font-bold text-foreground">{rupturas} itens</p>
            <p className="mt-1 text-xs text-muted-foreground">Rupturas de Estoque</p>
          </article>

          <article className="bento-card p-5">
            <div className="flex items-start justify-between">
              <span className="flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald">
                <TrendingUp className="h-3 w-3" />
                +1,9%
              </span>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-6 font-display text-2xl font-bold text-foreground">43,8%</p>
            <p className="mt-1 text-xs text-muted-foreground">Margem Bruta Média</p>
          </article>
        </div>

        {/* Chart */}
        <section className="bento-card p-6 xl:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Fluxo de Vendas & CMV</h2>
              <p className="text-xs text-muted-foreground">
                Entradas em Deep Emerald · Custos em Sage
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-muted p-1">
              {["Mês", "Trimestre", "Ano"].map((p, i) => (
                <button
                  key={p}
                  type="button"
                  className={
                    i === 2
                      ? "rounded-full bg-emerald px-3 py-1.5 text-xs font-semibold text-mint"
                      : "rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 flex h-56 items-end gap-2.5">
            {flow.map((f) => (
              <div key={f.m} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-48 w-full items-end justify-center gap-1">
                  <div
                    className="w-1/2 rounded-t-md bg-emerald"
                    style={{ height: `${f.v}%` }}
                    title={`Vendas ${f.m}`}
                  />
                  <div
                    className="w-1/2 rounded-t-md bg-sage"
                    style={{ height: `${f.d}%` }}
                    title={`CMV ${f.m}`}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{f.m}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ABC */}
        <section className="bento-card flex flex-col items-center p-6 xl:col-span-4">
          <div className="flex w-full items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Curva ABC</h2>
            <span className="rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-emerald">
              {isCurvaLoading ? "Calculando..." : "Pareto 80/15/5"}
            </span>
          </div>
          <div className="my-4">
            <Donut aPct={pctA} bPct={pctB} cPct={pctC} />
          </div>
          <ul className="w-full space-y-2.5">
            <li className="flex items-center gap-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--emerald-deep)" }} />
              <span className="flex-1 text-muted-foreground">Classe A (80% Faturamento)</span>
              <span className="font-semibold text-foreground">{pctA}%</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--forest)" }} />
              <span className="flex-1 text-muted-foreground">Classe B (15% Faturamento)</span>
              <span className="font-semibold text-foreground">{pctB}%</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "var(--sage)" }} />
              <span className="flex-1 text-muted-foreground">Classe C (5% Faturamento)</span>
              <span className="font-semibold text-foreground">{pctC}%</span>
            </li>
          </ul>
        </section>

        {/* Ledger */}
        <section className="bento-card p-6 xl:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Ledger de Movimentações</h2>
              <p className="text-xs text-muted-foreground">Extrato imutável e auditável</p>
            </div>
            <a
              href="/estoque"
              className="rounded-full bg-emerald px-4 py-2 text-xs font-semibold text-mint transition-opacity hover:opacity-90"
            >
              Ver estoque
            </a>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
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
                      Nenhuma movimentação registrada no estoque.
                    </td>
                  </tr>
                ) : (
                  movimentacoes.slice(0, 5).map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-3">
                        <p className="font-medium text-foreground">{m.observacao || "Movimentação"}</p>
                        <p className="text-xs text-muted-foreground">Ref: {m.produto_id.slice(0, 8)}</p>
                      </td>
                      <td className="py-3 text-muted-foreground">{m.loja_id}</td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${typeStyles[m.tipo_movimentacao] || "bg-muted text-muted-foreground"}`}
                        >
                          {m.tipo_movimentacao}
                        </span>
                      </td>
                      <td className={`py-3 text-right font-semibold ${m.quantidade >= 0 ? "text-emerald" : "text-destructive"}`}>
                        {m.quantidade >= 0 ? `+${m.quantidade}` : m.quantidade}
                      </td>
                      <td className="py-3 text-right text-xs text-muted-foreground">
                        {new Date(m.data_movimentacao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Activity */}
        <section className="bento-card p-6 xl:col-span-4">
          <h2 className="text-base font-bold text-foreground">Atividades Recentes</h2>
          {movimentacoes.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center py-6 text-center">
              <p className="text-xs text-muted-foreground">Nenhuma atividade recente registrada.</p>
            </div>
          ) : (
            <ul className="mt-5 space-y-5">
              {movimentacoes.slice(0, 4).map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-[11px] font-bold text-emerald">
                    {m.tipo_movimentacao.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm leading-snug text-foreground">
                      <span className="font-semibold">{m.tipo_movimentacao}</span> · {m.observacao || "Movimentação"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(m.data_movimentacao).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© 2026 Estroque · Gestão de Estoque Inteligente</p>
        <p>Multi-loja · Multi-tenant · Ledger imutável</p>
      </footer>
    </div>
  );
}
