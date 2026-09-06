export function renderErrorPage(): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Erro na Aplicação - Estroque</title>
    <style>
      body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
      .container { text-align: center; max-width: 500px; padding: 2.5rem; border-radius: 0.75rem; background: #1e293b; border: 1px solid #334155; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3); }
      h1 { color: #f43f5e; margin-bottom: 0.75rem; font-size: 1.5rem; }
      p { color: #94a3b8; margin-bottom: 1.5rem; line-height: 1.5; }
      a { display: inline-block; background: #3b82f6; color: white; padding: 0.5rem 1.25rem; border-radius: 0.375rem; text-decoration: none; font-weight: 500; }
      a:hover { background: #2563eb; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Erro na Renderização</h1>
      <p>Ocorreu uma falha ao processar a página. Por favor, tente recarregar.</p>
      <a href="/">Recarregar Aplicação</a>
    </div>
  </body>
</html>`;
}
