import { Bell, ChevronDown, Search, Store, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";
import { EstroqueSidebar } from "./sidebar";
import { useUserData, useLojasData } from "@/hooks/useEstroqueApi";

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
  const { data: user } = useUserData();
  const { data: lojas } = useLojasData();
  const [selectedLojaIndex, setSelectedLojaIndex] = useState(0);

  const activeLoja = lojas?.[selectedLojaIndex] || lojas?.[0];
  const userName = user?.nome || "Jonathas G.";
  const userInitials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "JG";

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <EstroqueSidebar />
      <main className="min-w-0 flex-1 px-5 py-6 lg:px-8">
        <header className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {/* Seletor Dinâmico de Loja */}
          <div className="relative flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-bento">
            <Store className="h-4 w-4 text-forest" />
            <select
              value={selectedLojaIndex}
              onChange={(e) => setSelectedLojaIndex(Number(e.target.value))}
              className="bg-transparent text-sm font-semibold text-foreground outline-none cursor-pointer pr-1"
            >
              {(!lojas || lojas.length === 0) ? (
                <option value={0}>Loja Matriz</option>
              ) : (
                lojas.map((l, idx) => (
                  <option key={l.id} value={idx}>
                    {l.nome}
                  </option>
                ))
              )}
            </select>
            <ChevronDown className="pointer-events-none h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {searchValue !== undefined && onSearchChange && (
            <div className="relative hidden w-64 md:block">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder || "Buscar..."}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full rounded-full border border-border bg-card py-1.5 pl-9 pr-4 text-sm text-foreground outline-none shadow-bento transition-all focus:border-forest"
              />
            </div>
          )}

          {actions}

          <button
            type="button"
            aria-label="Notificações"
            className="relative rounded-full bg-card p-2.5 shadow-bento"
          >
            <Bell className="h-4 w-4 text-foreground" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
          </button>

          <div className="flex items-center gap-2 rounded-full bg-card py-1.5 pl-1.5 pr-2 shadow-bento">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald text-xs font-bold text-mint">
              {userInitials}
            </span>
            <span className="hidden text-sm font-semibold text-foreground sm:inline pr-1">
              {userName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              title="Sair da conta"
              className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
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
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 rounded-full bg-emerald px-4 py-2.5 text-sm font-bold text-mint transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
