import { createFileRoute } from "@tanstack/react-router";
import { Save, Building2, Users, Bell, ShieldCheck } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Lojas, equipe e alertas | Estroque" },
      {
        name: "description",
        content:
          "Configure lojas, permissões da equipe, regras de estoque mínimo, alertas de ruptura e integrações fiscais no Estroque.",
      },
      { property: "og:title", content: "Configurações — Lojas, equipe e alertas | Estroque" },
      {
        property: "og:description",
        content: "Lojas, permissões, estoque mínimo, alertas de ruptura e integrações fiscais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConfiguracoesPage,
});

const toggles = [
  { l: "Alertar ruptura prevista", d: "Notifica quando a cobertura cai abaixo de 7 dias", on: true },
  { l: "Bloquear venda sem saldo", d: "Impede saída maior que o saldo disponível", on: true },
  { l: "Custo médio ponderado", d: "Recalcula o custo a cada entrada de NF-e", on: true },
  { l: "Resumo diário por e-mail", d: "Enviado às 19h para administradores", on: false },
];

function ConfiguracoesPage() {
  return (
    <AppShell
      title="Configurações"
      subtitle="Empresa, equipe e regras de operação"
      actions={<PrimaryButton icon={Save}>Salvar alterações</PrimaryButton>}
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <CardTitle title="Dados da empresa" />
          <Building2 className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { l: "Razão social", p: "Nome da empresa / Fantasia" },
              { l: "CNPJ", p: "00.000.000/0000-00" },
              { l: "Regime tributário", p: "Simples Nacional / Lucro Presumido" },
              { l: "Cidade / UF", p: "Cidade - UF" },
            ].map((f) => (
              <label key={f.l} className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {f.l}
                </span>
                <input
                  placeholder={f.p}
                  className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-forest"
                />
              </label>
            ))}
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <CardTitle title="Regras e alertas" hint="aplicadas a todas as lojas" />
          <Bell className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <ul className="mt-4 space-y-3">
            {toggles.map((t) => (
              <li
                key={t.l}
                className="flex items-center gap-4 rounded-bento bg-muted/60 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{t.l}</p>
                  <p className="text-xs text-muted-foreground">{t.d}</p>
                </div>
                <span
                  className={
                    t.on
                      ? "flex h-6 w-11 items-center rounded-full bg-forest px-1"
                      : "flex h-6 w-11 items-center rounded-full bg-border px-1"
                  }
                >
                  <span
                    className={
                      t.on
                        ? "ml-auto h-4 w-4 rounded-full bg-card"
                        : "h-4 w-4 rounded-full bg-card"
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-7">
          <CardTitle title="Equipe e permissões" hint="Usuários do tenant" />
          <Users className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <div className="mt-4 flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
            Acesse o gerenciamento de usuários para convidar novos membros para a equipe.
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardTitle title="Integrações fiscais" />
          <ShieldCheck className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <ul className="mt-4 space-y-3">
            {[
              { l: "Certificado digital A1", v: "Não configurado", tone: "neutral" as const },
              { l: "SEFAZ — consulta NF-e", v: "Pronto para XML manual", tone: "good" as const },
              { l: "Emissor de NFC-e", v: "Não configurado", tone: "neutral" as const },
            ].map((i) => (
              <li key={i.l} className="flex items-center justify-between gap-3 rounded-bento bg-muted/60 p-3.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{i.l}</p>
                  <p className="text-xs text-muted-foreground">{i.v}</p>
                </div>
                <Chip label={i.tone === "good" ? "Disponível" : "Pendente"} tone={i.tone} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
