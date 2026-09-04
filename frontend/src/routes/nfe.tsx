
import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  UploadCloud,
  FileCode2,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  AlertCircle,
  Warehouse,
  Check,
} from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { estroqueApi } from "@/services/estroqueApi";
import { useLojasData } from "@/hooks/useEstroqueApi";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/nfe")({
  head: () => ({
    meta: [
      { title: "Importar NF-e — Entrada automática por XML | Estroque" },
      {
        name: "description",
        content:
          "Importe notas fiscais eletrônicas (NF-e v4.00), faça o de-para de SKUs, calcule o custo médio ponderado e dê entrada no estoque automaticamente.",
      },
      { property: "og:title", content: "Importar NF-e — Entrada automática por XML | Estroque" },
      {
        property: "og:description",
        content: "Importação de XML de NF-e v4.00 com de-para de SKUs e atualização de custo médio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NfePage,
});

interface ImportResult {
  fornecedor?: {
    razao_social: string;
    cnpj: string;
    nome_fantasia?: string;
  };
  itens_processados: Array<{
    produto: {
      id: string;
      nome: string;
      sku: string;
      preco_custo: number;
      preco_venda: number;
    };
    quantidade_importada: number;
    valor_unitario_nfe: number;
    novo_produto_cadastrado: boolean;
  }>;
}

function NfePage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: lojas } = useLojasData();

  const [lojaId, setLojaId] = useState("");
  const [uploadStatus, setUploadStatus] = useState<{ tipo: "sucesso" | "erro"; msg: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);

  const activeLojaId = lojaId || lojas?.[0]?.id;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);
    try {
      const xmlText = await file.text();
      const res = await estroqueApi.importarXmlNfe(xmlText, activeLojaId);
      
      setLastResult(res);
      setUploadStatus({
        tipo: "sucesso",
        msg: `NF-e processada com sucesso! ${res.itens_processados?.length || 0} produtos integrados ao estoque.`,
      });

      // Invalida dados de produtos, estoque e fornecedores
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      queryClient.invalidateQueries({ queryKey: ["estoque"] });
      queryClient.invalidateQueries({ queryKey: ["fornecedores"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch (err: any) {
      setUploadStatus({
        tipo: "erro",
        msg: err.message || "Erro ao processar arquivo XML da NF-e.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <AppShell
      title="Importar NF-e"
      subtitle="Entrada de estoque automatizada por XML v4.00"
      actions={
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs font-semibold shadow-bento">
            <Warehouse className="h-3.5 w-3.5 text-forest" />
            <select
              value={activeLojaId || ""}
              onChange={(e) => setLojaId(e.target.value)}
              className="bg-transparent text-foreground outline-none cursor-pointer"
            >
              {lojas?.map((l) => (
                <option key={l.id} value={l.id}>
                  Loja: {l.nome}
                </option>
              ))}
            </select>
          </div>

          <div onClick={() => fileInputRef.current?.click()}>
            <PrimaryButton icon={UploadCloud}>
              {isUploading ? "Enviando..." : "Enviar XML"}
            </PrimaryButton>
          </div>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardTitle title="Upload de arquivos" hint="XML padrão SEFAZ v4.00" />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-bento border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-forest hover:bg-mint/10"
          >
            {isUploading ? (
              <Loader2 className="h-12 w-12 animate-spin rounded-2xl bg-mint p-3 text-emerald" />
            ) : (
              <UploadCloud className="h-12 w-12 rounded-2xl bg-mint p-3 text-emerald" />
            )}
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              Arraste o XML de NF-e aqui ou clique para selecionar
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              O Estroque analisa o emitente (fornecedor), cadastra produtos novos, atualiza o custo médio e lança as entradas no ledger.
            </p>

            {uploadStatus && (
              <div
                className={`mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold ${
                  uploadStatus.tipo === "sucesso"
                    ? "bg-mint text-emerald"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {uploadStatus.tipo === "sucesso" ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{uploadStatus.msg}</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardTitle title="Itens importados" hint="fornecedor e conciliação" />
          {!lastResult ? (
            <div className="mt-4 flex flex-col items-center justify-center rounded-bento bg-muted/40 p-8 text-center">
              <FileCode2 className="h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-semibold text-foreground">Aguardando arquivo XML</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Faça o upload ao lado para processar os itens e fornecedor automaticamente.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-bento bg-mint/15 p-3 text-xs">
                <p className="font-semibold text-foreground">
                  Fornecedor: {lastResult.fornecedor?.razao_social || "Identificado no XML"}
                </p>
                <p className="font-mono text-muted-foreground">
                  CNPJ: {lastResult.fornecedor?.cnpj || "—"}
                </p>
              </div>

              <div className="max-h-56 space-y-2 overflow-y-auto">
                {lastResult.itens_processados?.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-2.5 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{item.produto.nome}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        SKU: {item.produto.sku} · Qtd: +{item.quantidade_importada}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-forest">
                        R$ {item.valor_unitario_nfe.toFixed(2)}
                      </p>
                      {item.novo_produto_cadastrado && (
                        <span className="rounded bg-mint px-1.5 py-0.5 text-[10px] font-bold text-emerald">
                          Novo SKU
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle title="Histórico da sessão" hint="produtos integrados via XML" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">Produto</th>
                <th className="pb-3 font-semibold">SKU</th>
                <th className="pb-3 font-semibold">Qtd. Importada</th>
                <th className="pb-3 font-semibold">Custo Unitário</th>
                <th className="pb-3 font-semibold">Status de Entrada</th>
              </tr>
            </thead>
            <tbody>
              {!lastResult || lastResult.itens_processados?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                    Nenhuma importação realizada na sessão atual. Selecione um arquivo XML para começar.
                  </td>
                </tr>
              ) : (
                lastResult.itens_processados.map((i, idx) => (
                  <tr key={idx} className="border-b border-border/50 transition-colors hover:bg-muted/40">
                    <td className="py-3 font-semibold text-foreground">{i.produto.nome}</td>
                    <td className="py-3 font-mono text-xs text-forest">{i.produto.sku}</td>
                    <td className="py-3 font-bold text-emerald">+{i.quantidade_importada} un.</td>
                    <td className="py-3 text-muted-foreground">R$ {i.valor_unitario_nfe.toFixed(2)}</td>
                    <td className="py-3">
                      <Chip label="Integrado no Estoque" tone="good" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
