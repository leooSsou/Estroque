import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, TrendingUp, RefreshCw, CheckCircle2 } from "lucide-react";
import { AppShell, Card, CardTitle, PrimaryButton } from "@/components/estroque/app-shell";
import {
  useCurvaABCData,
  useDashboardData,
  useProdutosData,
  useEstoqueData,
  useVendasData,
  useFornecedoresData,
  useLojasData,
} from "@/hooks/useEstroqueApi";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Curva ABC, CMV e giro | Estroque" },
      {
        name: "description",
        content:
          "Relatórios analíticos do Estroque: curva ABC por faturamento e margem, giro de estoque, CMV consolidado e perdas operacionais.",
      },
      { property: "og:title", content: "Relatórios — Curva ABC, CMV e giro | Estroque" },
      {
        property: "og:description",
        content:
          "Curva ABC por faturamento e margem, giro de estoque, CMV consolidado e perdas operacionais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatoriosPage,
});

const reportsMeta = [
  { id: "curva_abc", name: "Curva ABC de produtos", desc: "Classificação por participação no faturamento" },
  { id: "giro", name: "Giro e cobertura de estoque", desc: "Dias de cobertura por SKU e por loja" },
  { id: "cmv", name: "CMV e margem bruta", desc: "Custo das mercadorias vendidas por período" },
  { id: "inventario", name: "Inventário e divergências", desc: "Contagens cíclicas e ajustes registrados" },
  { id: "fornecedores", name: "Compras por fornecedor", desc: "Volume, parceiros ativos e prazos" },
  { id: "ledger", name: "Ledger de movimentações", desc: "Exportação contábil completa e auditável" },
];

function RelatoriosPage() {
  const {
    data: curva,
    isLoading: isCurvaLoading,
    isFetching: isCurvaFetching,
    refetch: refetchCurva,
  } = useCurvaABCData();
  const {
    data: dash,
    isLoading: isDashLoading,
    isFetching: isDashFetching,
    refetch: refetchDash,
  } = useDashboardData();
  const { produtos } = useProdutosData();
  const { saldos, movimentacoes } = useEstoqueData();
  const { vendas } = useVendasData();
  const { fornecedores } = useFornecedoresData();
  const { data: lojas } = useLojasData();

  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const isFetching = isCurvaFetching || isDashFetching;

  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await Promise.all([refetchCurva(), refetchDash()]);
    } finally {
      setTimeout(() => setIsManualRefreshing(false), 600);
    }
  };

  const getNomeLoja = (id: string) => lojas?.find((l) => l.id === id)?.nome || "Filial";
  const getNomeProduto = (id: string) => produtos?.find((p) => p.id === id)?.nome || "Produto";

  const triggerCsvDownload = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent =
      "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccessMessage(`Relatório "${filename}.csv" gerado com sucesso!`);
    setTimeout(() => setDownloadSuccessMessage(null), 3500);
  };

  const handleExportarRelatorio = (reportId: string) => {
    switch (reportId) {
      case "curva_abc": {
        const produtosCurva = curva?.itens || curva?.produtos || [];
        const headers = ["Produto", "SKU", "Faturamento", "Participacao_Percentual", "Classe_ABC"];
        const rows = produtosCurva.map((p) => [
          `"${p.nome || p.nome_produto || ""}"`,
          `"${p.sku}"`,
          (p.faturamento || p.faturamento_total || 0).toFixed(2),
          (p.percentual || p.percentual_representatividade || 0).toFixed(2) + "%",
          p.classe,
        ]);
        triggerCsvDownload("relatorio_curva_abc", headers, rows);
        break;
      }
      case "giro": {
        const headers = ["SKU", "Produto", "Preco_Custo", "Preco_Venda", "Saldo_Total", "Status"];
        const rows = produtos.map((p) => {
          const saldo = saldos
            .filter((s) => s.produto_id === p.id)
            .reduce((acc, s) => acc + s.quantidade, 0);
          return [
            `"${p.sku}"`,
            `"${p.nome.replace(/"/g, '""')}"`,
            p.preco_custo.toFixed(2),
            p.preco_venda.toFixed(2),
            saldo.toString(),
            saldo > 5 ? "Normal" : saldo > 0 ? "Baixo" : "Zerado",
          ];
        });
        triggerCsvDownload("relatorio_giro_cobertura", headers, rows);
        break;
      }
      case "cmv": {
        const headers = ["Indicador", "Valor_R$"];
        const rows = [
          ["Faturamento Bruto", (dash?.faturamento_bruto || 0).toFixed(2)],
          ["Faturamento Liquido", (dash?.faturamento_liquido || 0).toFixed(2)],
          ["CMV (Custo Mercadorias Vendidas)", (dash?.cmv || 0).toFixed(2)],
          ["Lucro Liquido", (dash?.lucro_liquido || 0).toFixed(2)],
          ["Margem de Lucro (%)", (dash?.margem_lucro || 0).toFixed(1) + "%"],
        ];
        triggerCsvDownload("relatorio_cmv_margem", headers, rows);
        break;
      }
      case "inventario": {
        const headers = ["Filial", "SKU", "Produto", "Saldo_Fisico_Atual"];
        const rows = saldos.map((s) => {
          const prod = produtos.find((p) => p.id === s.produto_id);
          return [
            `"${getNomeLoja(s.loja_id)}"`,
            `"${prod?.sku || ""}"`,
            `"${(prod?.nome || "").replace(/"/g, '""')}"`,
            s.quantidade.toString(),
          ];
        });
        triggerCsvDownload("relatorio_inventario_saldos", headers, rows);
        break;
      }
      case "fornecedores": {
        const headers = ["Nome_Fantasia", "Razao_Social", "CNPJ", "Status"];
        const rows = fornecedores.map((f) => [
          `"${f.nome_fantasia || f.razao_social}"`,
          `"${f.razao_social}"`,
          `"${f.cnpj}"`,
          f.ativo ? "Ativo" : "Inativo",
        ]);
        triggerCsvDownload("relatorio_fornecedores", headers, rows);
        break;
      }
      case "ledger": {
        const headers = ["Data_Hora", "Filial", "Produto", "Tipo", "Quantidade", "Motivo_Documento"];
        const rows = movimentacoes.map((m) => [
          new Date(m.data_movimentacao).toISOString(),
          `"${getNomeLoja(m.loja_id)}"`,
          `"${getNomeProduto(m.produto_id)}"`,
          m.tipo || m.tipo_movimentacao || "AJUSTE",
          m.quantidade.toString(),
          `"${(m.motivo || m.observacao || "").replace(/"/g, '""')}"`,
        ]);
        triggerCsvDownload("relatorio_ledger_movimentacoes", headers, rows);
        break;
      }
      default:
        break;
    }
  };

  const handleExportarTudo = () => {
    // Exporta relatório geral executivo com métricas consolidadas
    const headers = ["Relatorio_Consolidado_Estroque", "Valor"];
    const rows = [
      ["Data de Extracao", new Date().toLocaleString("pt-BR")],
      ["Total SKUs Cadastrados", produtos.length.toString()],
      ["Total Unidades Físicas em Estoque", saldos.reduce((acc, s) => acc + s.quantidade, 0).toString()],
      ["Faturamento Líquido", `R$ ${(dash?.faturamento_liquido || 0).toFixed(2)}`],
      ["CMV Consolidado", `R$ ${(dash?.cmv || 0).toFixed(2)}`],
      ["Lucro Líquido", `R$ ${(dash?.lucro_liquido || 0).toFixed(2)}`],
      ["Total de Vendas Realizadas", vendas.length.toString()],
      ["Total de Fornecedores Cadastrados", fornecedores.length.toString()],
      ["Total de Lojas na Rede", (lojas?.length || 0).toString()],
    ];
    triggerCsvDownload("relatorio_gerencial_completo", headers, rows);
  };

  const totalFaturamento = dash?.faturamento_liquido ?? dash?.total_faturamento ?? 0;
  const produtosCurva = curva?.itens || curva?.produtos || [];
  const countA = produtosCurva.filter((p) => p.classe === "A").length;
  const countB = produtosCurva.filter((p) => p.classe === "B").length;
  const countC = produtosCurva.filter((p) => p.classe === "C").length;
  const totalProdutos = countA + countB + countC;

  return (
    <AppShell
      title="Relatórios"
      subtitle="Indicadores gerenciais e relatórios consolidados para exportação"
      showLojaSelector={false}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isFetching || isManualRefreshing}
            className="rounded-full bg-card p-2.5 shadow-bento transition-all hover:bg-muted active:scale-95"
            title="Recarregar relatórios"
          >
            <RefreshCw
              className={`h-4 w-4 text-foreground ${isFetching || isManualRefreshing ? "animate-spin text-emerald" : ""}`}
            />
          </button>
          <PrimaryButton icon={Download} onClick={handleExportarTudo}>
            Exportar tudo
          </PrimaryButton>
        </div>
      }
    >
      {downloadSuccessMessage && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-mint/60 p-3 text-xs font-semibold text-emerald">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{downloadSuccessMessage}</span>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardTitle title="Faturamento por categoria" hint="% do total" />
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
            {produtos.length > 0
              ? `${produtos.length} produtos cadastrados e monitorados pelo sistema.`
              : "Nenhuma movimentação ou categoria registrada no período."}
          </div>
        </Card>

        <div className="grid gap-5 xl:col-span-5">
          <section className="gradient-emerald rounded-card p-6">
            <TrendingUp className="h-8 w-8 rounded-xl bg-mint/15 p-2 text-mint" />
            <p className="mt-3 text-xs uppercase tracking-[0.14em] text-mint/60">Giro de estoque</p>
            <p className="mt-1 font-display text-4xl font-bold text-mint">
              {totalFaturamento > 0 ? "1,0x" : "0,0x"}
            </p>
            <p className="mt-1 text-xs text-mint/70">
              {totalFaturamento > 0 ? "em análise" : "sem vendas registradas"}
            </p>
          </section>
          <Card>
            <CardTitle title="Curva ABC" />
            <ul className="space-y-3 text-sm">
              {[
                { l: `Classe A (${countA} SKUs)`, v: totalProdutos > 0 ? "80% faturamento" : "0%" },
                { l: `Classe B (${countB} SKUs)`, v: totalProdutos > 0 ? "15% faturamento" : "0%" },
                { l: `Classe C (${countC} SKUs)`, v: totalProdutos > 0 ? "5% faturamento" : "0%" },
              ].map((r) => (
                <li key={r.l} className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{r.l}</span>
                  <span className="font-semibold text-foreground">{r.v}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="mt-5">
        <CardTitle title="Relatórios disponíveis para download" hint="Clique para baixar em Excel (CSV)" />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reportsMeta.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleExportarRelatorio(r.id)}
              className="flex items-start gap-3 rounded-bento bg-muted/60 p-4 text-left transition-all hover:bg-mint/60 hover:scale-[1.01] active:scale-95 group"
            >
              <FileSpreadsheet className="h-9 w-9 shrink-0 rounded-xl bg-card p-2 text-forest group-hover:text-emerald transition-colors" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="block text-sm font-semibold text-foreground">{r.name}</span>
                  <Download className="h-3.5 w-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-emerald" />
                </div>
                <span className="mt-0.5 block text-xs text-muted-foreground">{r.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}
