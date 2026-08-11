# Regras de trabalho no repositório

Projeto SaaS multi-tenant (FastAPI + Clean Architecture). Antes de qualquer mudança, leia
`DOCUMENTO_CONTEXTO_IA.md` para entender domínio, ondas e decisões de arquitetura.

## Fluxo de integração (obrigatório)

1. Cada frente de trabalho tem sua própria branch a partir da `develop`
   (ex.: `feat/analytics-dashboard`, `feat/celery-fila-assincrona`).
2. Todas as mudanças entram na `develop` **via Pull Request** com base `develop`.
3. O PR só pode ser mergeado quando:
   - CI (workflow `ci.yml`) estiver **verde** na branch do PR; e
   - o colega tenha revisado/aprovado o PR (dono do repo revisa).
4. A `develop` nunca recebe push direto (sempre via PR).
5. A `main` só é atualizada a partir da `develop` quando a `develop` estiver com CI verde.
   Neste caminho (develop → main) o merge ocorre direto, **sem PR**.
6. Após qualquer push, **aguardar e conferir o resultado do CI** (`gh run watch`) antes de
   declarar o trabalho concluído; se falhar, corrigir antes de prosseguir.

## Camadas compartilhadas (evitar conflito)

Os arquivos abaixo são tocados por quase todas as frentes. Ao trabalhar em paralelo,
quem estiver integrando mantém o controle deles:

- `src/infrastructure/database/models.py`
- `src/infrastructure/database/repositorios_concrete.py`
- `src/infrastructure/database/session.py`
- `src/infrastructure/database/migrations/*` (Alembic)
- `src/infrastructure/web/main.py` (registro de rotas / injeção de dependência)

## Qualidade

- Lint obrigatório: `ruff check src/ tests/` (config em `pyproject.toml`).
- Testes são executados pelo CI contra **PostgreSQL real** (não SQLite). Cuidado com
  FKs: ao criar registros em testes, persistir antes as entidades referenciadas
  (Tenant, Loja etc.).
- Cobertura mínima exigida: 75% (`--cov-fail-under=75`).
- Suíte local: `docker compose exec backend pytest`.

## Comandos úteis

- Rodar um teste específico: `docker compose exec backend pytest tests/<arquivo>.py::<teste> -q`
- Rodar contra o PostgreSQL real (como no CI):
  `docker compose exec -e DATABASE_TEST_URL="postgresql://postgres:postgres_password@postgres:5432/gerenciador_saas_test" backend pytest`
- Ver CIs recentes: `gh run list`
- Ver uma run: `gh run view <id>` / `gh run watch <id>`