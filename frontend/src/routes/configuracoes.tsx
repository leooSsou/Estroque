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

const team = [
  { name: "Jonathas Girardi", role: "Administrador", email: "jonathas@estroque.app", tone: "good" as const },
  { name: "Camila Duarte", role: "Vendedora", email: "camila@estroque.app", tone: "neutral" as const },
  { name: "Rafael Lima", role: "Estoquista", email: "rafael@estroque.app", tone: "neutral" as const },
  { name: "Marina Alves", role: "Financeiro", email: "marina@estroque.app", tone: "neutral" as const },
];

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
              { l: "Razão social", v: "Estroque Comércio LTDA" },
              { l: "CNPJ", v: "10.482.771/0001-45" },
              { l: "Regime tributário", v: "Simples Nacional" },
              { l: "Cidade / UF", v: "Salvador / BA" },
            ].map((f) => (
              <label key={f.l} className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                  {f.l}
                </span>
                <input
                  defaultValue={f.v}
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
          <CardTitle title="Equipe e permissões" hint="4 usuários" />
          <Users className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <ul className="mt-4 divide-y divide-border">
            {team.map((u) => (
              <li key={u.email} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald text-xs font-bold text-mint">
                  {u.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Chip label={u.role} tone={u.tone} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-5">
          <CardTitle title="Integrações fiscais" />
          <ShieldCheck className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <ul className="mt-4 space-y-3">
            {[
              { l: "Certificado digital A1", v: "Válido até 04/2027", tone: "good" as const },
              { l: "SEFAZ — consulta NF-e", v: "Conectado", tone: "good" as const },
              { l: "Emissor de NFC-e", v: "Não configurado", tone: "warn" as const },
            ].map((i) => (
              <li key={i.l} className="flex items-center justify-between gap-3 rounded-bento bg-muted/60 p-3.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{i.l}</p>
                  <p className="text-xs text-muted-foreground">{i.v}</p>
                </div>
                <Chip label={i.tone === "good" ? "OK" : "Pendente"} tone={i.tone} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
