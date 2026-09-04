import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, AlertCircle, ArrowRight, Lock, Mail, Sparkle } from "lucide-react";
import logo from "@/assets/estroque-logo.png.asset.json";
import { estroqueApi } from "@/services/estroqueApi";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar no Estroque — Gestão de Estoque Inteligente" },
      {
        name: "description",
        content: "Acesse o painel do Estroque: controle multi-loja, ledger auditável e gestão financeira.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("admin@estroque.app");
  const [senha, setSenha] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await estroqueApi.login({
        email: email.trim().toLowerCase(),
        senha,
      });

      if (res.access_token && typeof window !== "undefined") {
        localStorage.setItem("access_token", res.access_token);
        window.location.href = "/";
      }
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas. Verifique seu e-mail e senha.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-4 selection:bg-mint selection:text-emerald">
      <div className="w-full max-w-md space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-card shadow-bento border border-border">
            <img src={logo.url} alt="Logotipo Estroque" className="h-9 w-9 object-contain" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            ESTROQUE
          </h1>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Gestão inteligente de estoque & caixa
          </p>
        </div>

        {/* Card Form */}
        <div className="bento-card p-6 sm:p-8 shadow-bento border border-border">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-foreground">Acesse sua conta</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Informe suas credenciais para entrar no painel do seu tenant
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                E-mail
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-forest"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Senha
              </label>
              <input
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-forest"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-bold text-mint shadow-md transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Autenticando...
                </>
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-border/60 text-center">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-mint/50 px-3 py-1 text-[11px] font-semibold text-emerald">
              <Sparkle className="h-3.5 w-3.5 text-forest" />
              <span>Multi-tenant com isolamento estrito</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Ambiente local: <code>admin@estroque.app</code> / <code>admin123</code>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 Estroque · Gestão de Estoque Inteligente
        </p>
      </div>
    </div>
  );
}
