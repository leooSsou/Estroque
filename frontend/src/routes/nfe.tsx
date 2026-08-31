import { useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { UploadCloud, FileCode2, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { estroqueApi } from "@/services/estroqueApi";

export const Route = createFileRoute("/nfe")({
  head: () => ({
    meta: [
      { title: "Importar NF-e — Entrada por XML | Estroque" },
      {
        name: "description",
        content:
          "Importe XMLs de NF-e no Estroque para dar entrada automática no estoque, vincular SKUs e atualizar custos médios.",
      },
      { property: "og:title", content: "Importar NF-e — Entrada por XML | Estroque" },
      {
        property: "og:description",
        content: "Leitura automática de XML, de-para de SKUs e entrada de estoque em segundos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NfePage,
});

const imports = [
  { nf: "000.148", sup: "TecDistribuidora LTDA", items: 32, value: "R$ 12.480,00", status: "Processada", icon: CheckCircle2, tone: "good" as const },
  { nf: "000.147", sup: "Global Cabos S/A", items: 18, value: "R$ 4.210,00", status: "Processada", icon: CheckCircle2, tone: "good" as const },
  { nf: "000.146", sup: "Áudio Prime Import", items: 9, value: "R$ 8.930,00", status: "Pendente de-para", icon: Clock, tone: "warn" as const },
  { nf: "000.145", sup: "Periféricos BR", items: 24, value: "R$ 6.115,00", status: "Rejeitada", icon: XCircle, tone: "bad" as const },
];

const mapping = [
  { desc: "FONE BT ANC PRO PRETO", sku: "SKU-90218", conf: "98%" },
  { desc: "CABO HDMI 2.1 2M 8K", sku: "SKU-10432", conf: "95%" },
  { desc: "HUB TIPO-C 7IN1 ALUM", sku: "— novo SKU", conf: "62%" },
];

function NfePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);
    try {
      const xmlText = await file.text();
      const res = await estroqueApi.importarXmlNfe(xmlText);
      setUploadStatus(`Sucesso: ${res.mensagem || "NF-e importada e processada no estoque!"}`);
    } catch (err: any) {
      setUploadStatus(`Aviso: ${err.message || "XML carregado no analisador."}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AppShell
      title="Importar NF-e"
      subtitle="Entrada de estoque automatizada por XML v4.00"
      actions={
        <div onClick={() => fileInputRef.current?.click()}>
          <PrimaryButton icon={UploadCloud}>
            {isUploading ? "Enviando..." : "Enviar XML"}
          </PrimaryButton>
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
          <CardTitle title="Upload de arquivos" hint="XML padrão SEFAZ" />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-bento border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-forest hover:bg-mint/10"
          >
            {isUploading ? (
              <Loader2 className="h-12 w-12 animate-spin rounded-2xl bg-mint p-3 text-emerald" />
            ) : (
              <UploadCloud className="h-12 w-12 rounded-2xl bg-mint p-3 text-emerald" />
            )}
            <p className="mt-4 font-display text-lg font-bold text-foreground">
              Arraste os XMLs de NF-e aqui ou clique para selecionar
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              O Estroque lê os itens, cadastra produtos novos, sugere o de-para de SKUs e atualiza o custo médio ponderado.
            </p>

            {uploadStatus && (
              <div className="mt-4 rounded-xl bg-mint/80 px-4 py-2 text-xs font-semibold text-emerald">
                {uploadStatus}
              </div>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardTitle title="De-para sugerido" hint="NF-e em conciliação" />
          <ul className="space-y-3">
            {mapping.map((m) => (
              <li key={m.desc} className="rounded-bento bg-muted/60 p-3.5">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  Descrição do fornecedor
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{m.desc}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-xs text-forest">{m.sku}</span>
                  <Chip label={`match ${m.conf}`} tone={m.conf.startsWith("6") ? "warn" : "good"} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <PrimaryButton icon={CheckCircle2}>Confirmar entrada</PrimaryButton>
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardTitle title="Histórico de importações" hint="últimos 30 dias" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-3 font-semibold">NF-e</th>
                <th className="pb-3 font-semibold">Fornecedor</th>
                <th className="pb-3 font-semibold">Itens</th>
                <th className="pb-3 font-semibold">Valor</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((im) => (
                <tr key={im.nf} className="border-b border-border/60 last:border-0">
                  <td className="py-3.5 font-mono text-xs text-muted-foreground">{im.nf}</td>
                  <td className="py-3.5 font-semibold text-foreground">{im.sup}</td>
                  <td className="py-3.5 text-muted-foreground">{im.items}</td>
                  <td className="py-3.5 font-semibold text-foreground">{im.value}</td>
                  <td className="py-3.5">
                    <Chip label={im.status} tone={im.tone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AppShell>
  );
}
