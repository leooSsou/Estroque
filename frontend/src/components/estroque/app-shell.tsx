import { Bell, ChevronDown, Search, Store } from "lucide-react";
import type { ReactNode } from "react";
import { EstroqueSidebar } from "./sidebar";

interface AppShellProps {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <EstroqueSidebar />
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
        <header className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-sm font-semibold text-foreground shadow-bento"
          >
            <Store className="h-4 w-4 text-forest" />
            Loja Matriz
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder={searchPlaceholder || "Buscar produto, SKU, NF-e…"}
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-56 rounded-xl border border-border bg-card py-2 pl-9 pr-16 text-sm text-foreground outline-none transition-colors focus:border-forest"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              ⌘K
            </span>
          </div>

          {actions}

          <button
            type="button"
            aria-label="Notificações"
            className="relative rounded-full bg-card p-2.5 shadow-bento"
          >
            <Bell className="h-4 w-4 text-foreground" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>

          <div className="flex items-center gap-2 rounded-full bg-card py-1.5 pl-1.5 pr-4 shadow-bento">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald text-xs font-bold text-mint">
              JG
            </span>
            <span className="hidden text-sm font-semibold text-foreground sm:inline">
              Jonathas G.
            </span>
          </div>
        </header>

        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}

export function PrimaryButton({
  children,
  icon: Icon,
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-full bg-emerald px-4 py-2.5 text-sm font-bold text-mint transition-opacity hover:opacity-90"
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`bento-card p-6 ${className}`}>{children}</section>;
}

export function CardTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function Chip({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones: Record<string, string> = {
    neutral: "bg-muted text-muted-foreground",
    good: "bg-mint text-emerald",
    warn: "bg-sage/25 text-forest",
    bad: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]}`}>
      {label}
    </span>
  );
}
