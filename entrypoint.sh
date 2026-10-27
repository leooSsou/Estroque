#!/usr/bin/env bash
set -e

# Em ambientes em nuvem de container único (ex.: Render) sem Redis dedicado, usar fallback em memória para rate limiting
if [ -z "$REDIS_URL" ] && [ -z "$REDIS_HOST" ]; then
    export REDIS_HOST="memory"
fi

echo "📦 Executando migrações do banco de dados (Alembic)..."
alembic upgrade head || echo "Aviso: Falha ao executar migrações, continuando..."

echo "🌱 Populando dados padrão e usuários demo (Seed)..."
python -m src.infrastructure.database.seed || echo "Aviso: Falha ao executar seed, continuando..."

PORT_APP="${PORT:-8000}"
echo "🚀 Iniciando servidor FastAPI na porta ${PORT_APP}..."
exec uvicorn src.infrastructure.web.main:app --host 0.0.0.0 --port "${PORT_APP}"
