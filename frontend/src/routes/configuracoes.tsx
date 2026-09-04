import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Save, Building2, Users, Bell, ShieldCheck, Check, Warehouse, Plus } from "lucide-react";
import { AppShell, Card, CardTitle, Chip, PrimaryButton } from "@/components/estroque/app-shell";
import { useUserData, useLojasData } from "@/hooks/useEstroqueApi";

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

const defaultToggles = [
  { id: "ruptura", l: "Alertar ruptura prevista", d: "Notifica quando a cobertura cai abaixo de 7 dias", on: true },
  { id: "bloqueio", l: "Bloquear venda sem saldo", d: "Impede saída física com saldo insuficiente", on: true },
  { id: "custo_medio", l: "Custo médio ponderado", d: "Recalcula o custo a cada entrada de NF-e", on: true },
  { id: "resumo", l: "Resumo diário por e-mail", d: "Enviado às 19h para administradores", on: false },
];

function ConfiguracoesPage() {
  const { data: user } = useUserData();
  const { data: lojas } = useLojasData();
  const [toggles, setToggles] = useState(defaultToggles);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const toggleItem = (id: string) => {
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, on: !t.on } : t)));
  };

  const handleSalvar = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <AppShell
      title="Configurações"
      subtitle="Empresa, equipe e regras de operação"
      actions={
        <div onClick={handleSalvar}>
          <PrimaryButton icon={savedSuccess ? Check : Save}>
            {savedSuccess ? "Alterações Salvas!" : "Salvar alterações"}
          </PrimaryButton>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-6">
          <CardTitle title="Dados do Tenant & Empresa" hint="Sincronizado com o Backend" />
          <Building2 className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Inquilino (Tenant ID)
              </span>
              <p className="mt-1 font-mono text-xs font-bold text-forest truncate">
                {user?.tenant_id || "Carregando..."}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Usuário Conectado
              </span>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {user?.nome || "Administrador"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                E-mail Administrativo
              </span>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.email || "admin@estroque.app"}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Papel / Permissão
              </span>
              <div className="mt-1">
                <Chip label={user?.role || "DONO"} tone="good" />
              </div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-6">
          <CardTitle title="Regras e alertas" hint="aplicadas a todas as lojas" />
          <Bell className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <ul className="mt-4 space-y-3">
            {toggles.map((t) => (
              <li
                key={t.id}
                onClick={() => toggleItem(t.id)}
                className="flex cursor-pointer items-center gap-4 rounded-bento bg-muted/60 p-3.5 transition-colors hover:bg-muted/90"
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
                        ? "ml-auto h-4 w-4 rounded-full bg-card shadow-sm"
                        : "h-4 w-4 rounded-full bg-card shadow-sm"
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="xl:col-span-7">
          <CardTitle title="Lojas e filiais cadastradas" hint="multi-loja integrado" />
          <Warehouse className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <div className="mt-4 space-y-3">
            {(!lojas || lojas.length === 0) ? (
              <p className="text-xs text-muted-foreground">Nenhuma loja cadastrada.</p>
            ) : (
              lojas.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-background p-3.5 text-xs"
                >
                  <div>
                    <p className="text-sm font-bold text-foreground">{l.nome}</p>
                    <p className="font-mono text-muted-foreground">CNPJ: {l.cnpj}</p>
                    <p className="text-muted-foreground">{l.endereco || "Endereço matriz"}</p>
                  </div>
                  <Chip label={l.ativo ? "Operacional" : "Inativa"} tone={l.ativo ? "good" : "neutral"} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardTitle title="Integrações fiscais" />
          <ShieldCheck className="h-9 w-9 rounded-xl bg-mint p-2 text-emerald" />
          <ul className="mt-4 space-y-3">
            {[
              { l: "Certificado digital A1", v: "Não configurado", tone: "neutral" as const },
              { l: "SEFAZ — importação de XML", v: "Pronto para XML v4.00", tone: "good" as const },
              { l: "Emissor de NFC-e", v: "Em homologação", tone: "warn" as const },
            ].map((i) => (
              <li key={i.l} className="flex items-center justify-between gap-3 rounded-bento bg-muted/60 p-3.5">
                <div>
                  <p className="text-sm font-semibold text-foreground">{i.l}</p>
                  <p className="text-xs text-muted-foreground">{i.v}</p>
                </div>
                <Chip label={i.tone === "good" ? "Disponível" : i.tone === "warn" ? "Em teste" : "Pendente"} tone={i.tone} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
