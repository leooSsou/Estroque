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
} from "lucide-react";

const kpis = [
  {
    label: "Faturamento Mensal",
    value: "R$ 82.300,00",
    delta: "+12,4%",
    up: true,
  },
  { label: "Ticket Médio", value: "R$ 310,50", delta: "+5,2%", up: true },
  { label: "Rupturas de Estoque", value: "4 itens", delta: "zerados", up: false },
  { label: "Margem Bruta Média", value: "43,8%", delta: "+1,9%", up: true },
];

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

const abc = [
  { label: "Classe A", pct: 80, color: "var(--emerald-deep)" },
  { label: "Classe B", pct: 15, color: "var(--forest)" },
  { label: "Classe C", pct: 5, color: "var(--sage)" },
];

const activity = [
  {
    who: "Camila Duarte",
    what: "registrou venda #4821 — R$ 1.240,00",
    when: "há 12 min",
  },
  { who: "Rafael Lima", what: "importou NF-e 000.148 (32 itens)", when: "há 48 min" },
  { who: "Marina Alves", what: "despachou transferência para Filial 01", when: "há 2 h" },
  { who: "Bruno Teixeira", what: "ajustou inventário: avaria (-3 un.)", when: "há 4 h" },
];

const movements = [
  {
    sku: "SKU-10432",
    name: "Cabo HDMI 2.1 — 2m",
    store: "Loja Matriz",
    type: "ENTRADA",
    qty: "+120",
    balance: "312",
  },
  {
    sku: "SKU-90218",
    name: "Fone Bluetooth ANC",
    store: "Filial 01",
    type: "SAÍDA",
    qty: "-14",
    balance: "42",
  },
  {
    sku: "SKU-55901",
    name: "Teclado Mecânico 75%",
    store: "Loja Matriz",
    type: "TRANSFERÊNCIA",
    qty: "-30",
    balance: "88",
  },
  {
    sku: "SKU-30117",
    name: "Carregador USB-C 65W",
    store: "Filial 02",
    type: "AUDITORIA",
    qty: "-2",
    balance: "0",
  },
];

const typeStyles: Record<string, string> = {
  ENTRADA: "bg-mint text-emerald",
  SAÍDA: "bg-destructive/10 text-destructive",
  TRANSFERÊNCIA: "bg-sage/25 text-pine",
  AUDITORIA: "bg-muted text-muted-foreground",
};

function Donut() {
  const r = 56;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40">
      {abc.map((s) => {
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
        1.284
      </text>
    </svg>
  );
}

export function EstroqueDashboard() {
  return (
    <div className="min-h-screen flex-1 px-5 py-6 lg:px-8">
      <header className="flex flex-wrap items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão executiva consolidada · Agosto 2026
          </p>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-[0_4px_20px_-2px_rgb(11_43_38_/_0.05)]"
        >
          <Store className="h-4 w-4 text-forest" />
          Loja Matriz
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

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

        <button
          type="button"
          aria-label="Notificações"
          className="relative rounded-full bg-card p-2.5 shadow-[0_4px_20px_-2px_rgb(11_43_38_/_0.05)]"
        >
          <Bell className="h-4 w-4 text-foreground" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

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
            Saldo consolidado
          </p>
          <p className="mt-2 font-display text-4xl font-bold text-mint">R$ 148.500,00</p>
          <p className="mt-1 text-xs text-mint/70">3 lojas sincronizadas · atualizado agora</p>

          <div className="mt-6 grid grid-cols-2 gap-2.5">
            {[
              { label: "Nova Venda", icon: Plus },
              { label: "Importar XML", icon: FileDown },
              { label: "Transferência", icon: Truck },
              { label: "Auditoria", icon: ClipboardList },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                className="flex items-center gap-2 rounded-full bg-mint/12 px-3 py-2.5 text-xs font-semibold text-mint transition-colors hover:bg-mint/20"
              >
                <a.icon className="h-3.5 w-3.5" />
                {a.label}
              </button>
            ))}
          </div>
        </section>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-5 xl:col-span-8">
          {kpis.map((k) => (
            <article key={k.label} className="bento-card p-5">
              <div className="flex items-start justify-between">
                <span
                  className={
                    k.up
                      ? "flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-bold text-emerald"
                      : "flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive"
                  }
                >
                  {k.up ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {k.delta}
                </span>
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="mt-6 font-display text-2xl font-bold text-foreground">{k.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{k.label}</p>
            </article>
          ))}
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
              Automática
            </span>
          </div>
          <div className="my-4">
            <Donut />
          </div>
          <ul className="w-full space-y-2.5">
            {abc.map((s) => (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="flex-1 text-muted-foreground">{s.label}</span>
                <span className="font-semibold text-foreground">{s.pct}%</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Ledger */}
        <section className="bento-card p-6 xl:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground">Ledger de Movimentações</h2>
              <p className="text-xs text-muted-foreground">Extrato imutável e auditável</p>
            </div>
            <button
              type="button"
              className="rounded-full bg-emerald px-4 py-2 text-xs font-semibold text-mint"
            >
              Ver extrato
            </button>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="pb-3 font-semibold">Produto</th>
                  <th className="pb-3 font-semibold">Loja</th>
                  <th className="pb-3 font-semibold">Tipo</th>
                  <th className="pb-3 text-right font-semibold">Qtd.</th>
                  <th className="pb-3 text-right font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.sku} className="border-t border-border">
                    <td className="py-3">
                      <p className="font-medium text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.sku}</p>
                    </td>
                    <td className="py-3 text-muted-foreground">{m.store}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${typeStyles[m.type]}`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 text-right font-semibold text-foreground">{m.qty}</td>
                    <td className="py-3 text-right text-muted-foreground">{m.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Activity */}
        <section className="bento-card p-6 xl:col-span-4">
          <h2 className="text-base font-bold text-foreground">Atividades Recentes</h2>
          <ul className="mt-5 space-y-5">
            {activity.map((a) => (
              <li key={a.who} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mint text-[11px] font-bold text-emerald">
                  {a.who
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div>
                  <p className="text-sm leading-snug text-foreground">
                    <span className="font-semibold">{a.who}</span> {a.what}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{a.when}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>© 2026 Estroque · Gestão de Estoque Inteligente</p>
        <p>Multi-loja · Multi-tenant · Ledger imutável</p>
      </footer>
    </div>
  );
}
