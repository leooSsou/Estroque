import {
  LayoutDashboard,
  Package,
  Warehouse,
  FileCode2,
  Truck,
  Receipt,
  CircleDollarSign,
  Users,
  Building2,
  BarChart3,
  Settings,
  Sparkle,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import logo from "@/assets/estroque-logo.png.asset.json";

import { useTransferenciasData } from "@/hooks/useEstroqueApi";

export function EstroqueSidebar() {
  const { transferencias } = useTransferenciasData();
  const pendingCount = transferencias.filter((t) => t.status === "SOLICITADO" || t.status === "DESPACHADO").length;

  const nav = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/" as const },
    { label: "Produtos", icon: Package, to: "/produtos" as const },
    { label: "Estoque", icon: Warehouse, to: "/estoque" as const },
    { label: "Importar NF-e", icon: FileCode2, to: "/nfe" as const },
    {
      label: "Transferências",
      icon: Truck,
      to: "/transferencias" as const,
      badge: pendingCount > 0 ? String(pendingCount) : undefined,
    },
    { label: "Vendas", icon: Receipt, to: "/vendas" as const },
    { label: "Financeiro", icon: CircleDollarSign, to: "/financeiro" as const },
    { label: "Clientes", icon: Users, to: "/clientes" as const },
    { label: "Fornecedores", icon: Building2, to: "/fornecedores" as const },
    { label: "Relatórios", icon: BarChart3, to: "/relatorios" as const },
    { label: "Configurações", icon: Settings, to: "/configuracoes" as const },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-border bg-card px-4 py-6 lg:flex">
      <div>
        <Link to="/" className="flex items-center gap-2 px-2">
          <img src={logo.url} alt="Logotipo Estroque" className="h-9 w-9 object-contain" />
          <div>
            <p className="font-display text-base font-bold tracking-tight text-foreground">
              ESTROQUE
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Gestão inteligente
            </p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-mint data-[status=active]:font-semibold data-[status=active]:text-emerald"
            >
              <item.icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-bold text-mint">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>

      <div className="gradient-emerald rounded-card p-4">
        <Sparkle className="h-7 w-7 rounded-full bg-mint/15 p-1.5 text-mint" />
        <p className="mt-3 text-sm font-semibold text-mint">Estroque Pro</p>
        <p className="mt-1 text-xs leading-relaxed text-mint/70">
          Analytics avançado, previsão de ruptura e Curva ABC automática.
        </p>
        <button
          type="button"
          className="mt-4 w-full rounded-full bg-mint px-3 py-2 text-xs font-bold text-emerald transition-opacity hover:opacity-90"
        >
          Ativar Pro
        </button>
      </div>
    </aside>
  );
}
