import { createFileRoute } from "@tanstack/react-router";
import { EstroqueSidebar } from "@/components/estroque/sidebar";
import { EstroqueDashboard } from "@/components/estroque/dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Estroque — Dashboard de Gestão de Estoque Inteligente" },
      {
        name: "description",
        content:
          "Painel executivo do Estroque: saldo consolidado, faturamento, rupturas, Curva ABC e ledger imutável de estoque multi-loja.",
      },
      { property: "og:title", content: "Estroque — Gestão de Estoque Inteligente" },
      {
        property: "og:description",
        content:
          "Dashboard multi-loja com KPIs, fluxo de vendas x CMV, Curva ABC e ledger auditável de movimentações.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen bg-background">
      <EstroqueSidebar />
      <main className="flex-1">
        <EstroqueDashboard />
      </main>
    </div>
  );
}
