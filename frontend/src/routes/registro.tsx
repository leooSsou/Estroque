import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Loader2,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Building2,
  User,
  FileText,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import logo from "@/assets/estroque-logo.png.asset.json";
import { estroqueApi } from "@/services/estroqueApi";

export const Route = createFileRoute("/registro")({
  head: () => ({
    meta: [
      { title: "Cadastre sua Empresa — Estroque" },
      {
        name: "description",
        content:
          "Crie a conta da sua empresa no Estroque. Gestão de estoque multi-loja, auditoria e controle de caixa.",
      },
    ],
  }),
  component: RegistroPage,
});

function RegistroPage() {
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [donoNome, setDonoNome] = useState("");
  const [donoEmail, setDonoEmail] = useState("");
  const [donoSenha, setDonoSenha] = useState("");
  const [confirmaSenha, setConfirmaSenha] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCnpj = cnpj.replace(/\D/g, "");
    if (cleanCnpj.length !== 14) {
      setError("O CNPJ deve conter exatamente 14 dígitos.");
      return;
    }

    if (donoSenha.length < 6) {
      setError("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (donoSenha !== confirmaSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      await estroqueApi.register({
        nome_fantasia: nomeFantasia.trim(),
        razao_social: razaoSocial.trim(),
        cnpj: cleanCnpj,
        dono_nome: donoNome.trim(),
        dono_email: donoEmail.trim().toLowerCase(),
        dono_senha: donoSenha,
      });

      setSuccess(true);

      // Tenta logar automaticamente após o cadastro bem-sucedido
      try {
        const loginRes = await estroqueApi.login({
          email: donoEmail.trim().toLowerCase(),
          senha: donoSenha,
        });

        if (loginRes.access_token && typeof window !== "undefined") {
          localStorage.setItem("access_token", loginRes.access_token);
          setTimeout(() => {
            window.location.href = "/";
          }, 1500);
          return;
        }
      } catch {
        // Se auto-login falhar, redireciona para a página de login
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Erro ao registrar empresa. Verifique os dados informados.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background items-center justify-center p-4 selection:bg-mint selection:text-emerald">
      <div className="w-full max-w-xl space-y-6 my-8">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-card shadow-bento border border-border">
            <img src={logo.url} alt="Logotipo Estroque" className="h-9 w-9 object-contain" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            ESTROQUE
          </h1>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Cadastre sua empresa e modernize sua operação
          </p>
        </div>

        {/* Card Form */}
        <div className="bento-card p-6 sm:p-8 shadow-bento border border-border">
          {success ? (
            <div className="text-center py-8 space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-mint text-forest">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Empresa cadastrada com sucesso!</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sua rede e o usuário gestor foram provisionados. Entrando automaticamente no
                sistema...
              </p>
              <div className="flex items-center justify-center gap-2 pt-2 text-xs text-forest font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando painel principal...</span>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-foreground">Criar nova conta empresarial</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Provisionamento instantâneo de ambiente multi-tenant isolado
                </p>
              </div>

              {error && (
                <div className="mb-5 flex items-center gap-2 rounded-xl bg-destructive/10 p-3.5 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Seção Dados da Empresa */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    Dados da Empresa
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        Nome Fantasia *
                      </label>
                      <input
                        type="text"
                        required
                        value={nomeFantasia}
                        onChange={(e) => setNomeFantasia(e.target.value)}
                        placeholder="Ex: Supermercado Progresso"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-forest"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">
                        CNPJ (14 dígitos) *
                      </label>
                      <input
                        type="text"
                        required
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0000-00"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-forest"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      Razão Social *
                    </label>
                    <input
                      type="text"
                      required
                      value={razaoSocial}
                      onChange={(e) => setRazaoSocial(e.target.value)}
                      placeholder="Ex: Progresso Distribuidora e Alimentos Ltda"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-forest"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60" />

                {/* Seção Administrador */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    Usuário Administrador (Dono)
                  </h3>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={donoNome}
                      onChange={(e) => setDonoNome(e.target.value)}
                      placeholder="Ex: Carlos Alberto da Silva"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-forest"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3 text-muted-foreground" />
                      E-mail Corporativo *
                    </label>
                    <input
                      type="email"
                      required
                      value={donoEmail}
                      onChange={(e) => setDonoEmail(e.target.value)}
                      placeholder="carlos@supermercadoprogresso.com.br"
                      className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-forest"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        Senha *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={donoSenha}
                        onChange={(e) => setDonoSenha(e.target.value)}
                        placeholder="Mín. 6 caracteres"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-forest"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <Lock className="h-3 w-3 text-muted-foreground" />
                        Confirmar Senha *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={confirmaSenha}
                        onChange={(e) => setConfirmaSenha(e.target.value)}
                        placeholder="Repita a senha"
                        className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-sm text-foreground outline-none transition-colors focus:border-forest"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="mt-4 w-full flex items-center justify-center gap-2 rounded-full bg-forest px-4 py-3 text-sm font-bold text-mint shadow-md transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Provisionando ambiente...
                    </>
                  ) : (
                    <>
                      Finalizar Cadastro e Entrar
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-4 border-t border-border/60 text-center space-y-3">
                <p className="text-xs text-muted-foreground">
                  Já possui uma conta cadastrada?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-forest hover:underline underline-offset-2"
                  >
                    Fazer Login
                  </Link>
                </p>

                <div className="inline-flex items-center gap-1.5 rounded-full bg-mint/50 px-3 py-1 text-[11px] font-semibold text-emerald">
                  <Sparkles className="h-3.5 w-3.5 text-forest" />
                  <span>Multi-tenant com isolamento estrito por esquema de dados</span>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          © 2026 Estroque · Gestão de Estoque Inteligente
        </p>
      </div>
    </div>
  );
}
