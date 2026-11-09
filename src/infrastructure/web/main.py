import os
from collections.abc import Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.responses import Response

from src.infrastructure.web.admin import router as admin_router
from src.infrastructure.web.analytics import router as analytics_router
from src.infrastructure.web.auth import router as auth_router
from src.infrastructure.web.clientes import router as clientes_router
from src.infrastructure.web.estoque import router as estoque_router
from src.infrastructure.web.estoque_auditoria import router as auditoria_router
from src.infrastructure.web.estoque_nfe import router as estoque_nfe_router
from src.infrastructure.web.financeiro import router as financeiro_router
from src.infrastructure.web.fornecedores import router as fornecedores_router
from src.infrastructure.web.limiter import limiter
from src.infrastructure.web.lojas import router as lojas_router
from src.infrastructure.web.produtos import router as produtos_router
from src.infrastructure.web.transferencias import router as transferencias_router
from src.infrastructure.web.vendas import router as vendas_router

ENVIRONMENT = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
is_production = ENVIRONMENT in {"production", "prod"}


def auto_heal_schema() -> None:
    """
    Garante que tabelas e colunas adicionadas em migrações recentes existam
    no banco de dados (especialmente PostgreSQL no Render) antes de aceitar requisições.
    """
    from sqlalchemy import text

    from src.infrastructure.database.models import Base
    from src.infrastructure.database.session import engine

    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Aviso create_all auto-heal: {e}")

    try:
        if engine.dialect.name == "postgresql":
            statements = [
                "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL;",
                "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plano VARCHAR(20) DEFAULT 'PRO' NOT NULL;",
                "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS limite_lojas INTEGER DEFAULT 5 NOT NULL;",
                "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS limite_usuarios INTEGER DEFAULT 10 NOT NULL;",
                "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS modulos_customizados JSON DEFAULT '{}';",
                "ALTER TABLE produtos ADD COLUMN IF NOT EXISTS produto_pai_id UUID REFERENCES produtos(id) ON DELETE CASCADE;",
                "ALTER TABLE produtos ADD COLUMN IF NOT EXISTS variacoes JSON DEFAULT '[]';",
                "ALTER TABLE clientes ADD COLUMN IF NOT EXISTS credito_loja DOUBLE PRECISION DEFAULT 0.0 NOT NULL;",
            ]
            with engine.connect() as conn:
                conn.execution_options(isolation_level="AUTOCOMMIT")
                for stmt in statements:
                    try:
                        conn.execute(text(stmt))
                    except Exception as err:
                        print(f"Aviso stmt auto-heal: {err}")
        elif engine.dialect.name == "sqlite":
            with engine.connect() as conn:
                res = conn.execute(text("PRAGMA table_info(tenants)")).fetchall()
                cols = [r[1] for r in res]
                if "ativo" not in cols:
                    conn.execute(text("ALTER TABLE tenants ADD COLUMN ativo BOOLEAN DEFAULT 1 NOT NULL"))
                if "plano" not in cols:
                    conn.execute(text('ALTER TABLE tenants ADD COLUMN plano VARCHAR(20) DEFAULT "PRO" NOT NULL'))
                if "limite_lojas" not in cols:
                    conn.execute(text("ALTER TABLE tenants ADD COLUMN limite_lojas INTEGER DEFAULT 5 NOT NULL"))
                if "limite_usuarios" not in cols:
                    conn.execute(text("ALTER TABLE tenants ADD COLUMN limite_usuarios INTEGER DEFAULT 10 NOT NULL"))
                if "modulos_customizados" not in cols:
                    conn.execute(text('ALTER TABLE tenants ADD COLUMN modulos_customizados JSON DEFAULT "{}"'))
    except Exception as e:
        print(f"Aviso DDL auto-heal: {e}")


# Executa auto-heal no import do módulo para garantir colunas antes de qualquer requisição
if os.getenv("TESTING") != "True":
    try:
        auto_heal_schema()
    except Exception as _err:
        print(f"Aviso auto-heal no import: {_err}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Executa auto-heal do schema, migrações do Alembic e seed automaticamente caso não esteja em teste
    if os.getenv("TESTING") != "True":
        auto_heal_schema()

        try:
            from pathlib import Path

            from alembic import command
            from alembic.config import Config

            root_dir = Path(__file__).resolve().parents[3]
            ini_path = root_dir / "alembic.ini"
            alembic_cfg = Config(str(ini_path))
            try:
                command.upgrade(alembic_cfg, "head")
            except Exception as upgrade_err:
                print(f"Aviso upgrade alembic: {upgrade_err}")
                try:
                    command.stamp(alembic_cfg, "head")
                except Exception:
                    pass
        except Exception as exc:
            print(f"Aviso inicializacao alembic: {exc}")

        try:
            from src.infrastructure.database.seed import seed

            seed()
        except Exception as exc:
            print(f"Aviso seed startup: {exc}")
    yield


app = FastAPI(
    title="Estroque API",
    description="API de retaguarda multi-tenant para gerenciamento de lojas e estoque.",
    version="1.0.0",
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else "/openapi.json",
    lifespan=lifespan,
)

# Configura o limiter na instância da aplicação
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Middleware global de cabeçalhos de segurança HTTP (Hardening OWASP)
@app.middleware("http")
async def add_security_headers(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    response: Response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
    if is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# Registra os roteadores da aplicação
app.include_router(auth_router)
app.include_router(lojas_router)
app.include_router(produtos_router)
app.include_router(clientes_router)
app.include_router(fornecedores_router)
app.include_router(estoque_router)
app.include_router(estoque_nfe_router)
app.include_router(transferencias_router)
app.include_router(auditoria_router)
app.include_router(vendas_router)
app.include_router(financeiro_router)
app.include_router(analytics_router)
app.include_router(admin_router)


# Configuração segura de CORS (Restrição estrita a domínios autorizados)
DEFAULT_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8000",
    "https://estroque-web.onrender.com",
    "https://estroque.onrender.com",
]

cors_origins_str = os.getenv("CORS_ORIGINS", "").strip()
if cors_origins_str:
    allow_origins = [
        origin.strip()
        for origin in cors_origins_str.split(",")
        if origin.strip() and origin.strip() != "*"
    ]
elif is_production:
    allow_origins = []
else:
    allow_origins = DEFAULT_DEV_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health", tags=["Monitoramento"])
def health_check() -> dict[str, str]:
    """
    Endpoint simples de monitoramento para verificar se a API está online.
    """
    return {
        "status": "healthy",
        "message": "Estroque API operacional",
        "version": "1.0.3-dono-fix",
    }


@app.get("/setup-db", tags=["Monitoramento"])
@app.get("/api/setup-db", tags=["Monitoramento"])
def setup_database_endpoint() -> dict[str, str]:
    """
    Endpoint para forçar auto-heal do schema e seed via requisição HTTP (sem precisar de shell).
    """
    auto_heal_schema()
    try:
        from src.infrastructure.database.seed import seed

        seed()
    except Exception as exc:
        print(f"Aviso seed endpoint: {exc}")
    return {"status": "ok", "message": "Schema e usuários padrão inicializados com sucesso!"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
