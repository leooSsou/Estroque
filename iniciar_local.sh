#!/usr/bin/env bash
# ==============================================================================
# ESTROQUE SaaS - Script de Inicialização Local (Sem Docker)
# Backend (FastAPI / SQLite) + Frontend (React / Vite)
# ==============================================================================
set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Iniciando Estroque em modo Local (Sem Docker)..."

# Ativar ambiente virtual
if [ -d ".venv" ]; then
    PYTHON_BIN=".venv/bin/python"
    UVICORN_BIN=".venv/bin/uvicorn"
    ALEMBIC_BIN=".venv/bin/alembic"
else
    PYTHON_BIN="python3"
    UVICORN_BIN="uvicorn"
    ALEMBIC_BIN="alembic"
fi

# Migrações Alembic e sincronização de schema no SQLite local
echo "📦 Verificando migrações no banco local (SQLite)..."
$ALEMBIC_BIN upgrade head 2>/dev/null || true
$PYTHON_BIN -c "from src.infrastructure.database.models import Base; from sqlalchemy import create_engine; engine = create_engine('sqlite:///./gerenciador_saas.db'); Base.metadata.create_all(engine)" 2>/dev/null || true

# Garantir que processos antigos sejam encerrados ao fechar o script
cleanup() {
    echo ""
    echo "🛑 Encerrando servidores locais..."
    kill $(jobs -p) 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Iniciar Backend FastAPI na porta 8000
echo "⚙️  Iniciando Backend FastAPI (http://localhost:8000)..."
$UVICORN_BIN src.infrastructure.web.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Iniciar Frontend Vite na porta 5173
echo "🌐 Iniciando Frontend React (http://localhost:5173)..."
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

echo ""
echo "================================================================================"
echo "🎉 SISTEMA PRONTO E RODANDO LOCALMENTE!"
echo "================================================================================"
echo "🌐 Frontend (Interface):  http://localhost:5173"
echo "⚙️  Backend API:          http://localhost:8000"
echo "📚 Documentação Swagger:  http://localhost:8000/docs"
echo ""
echo "🔑 Usuários de Teste:"
echo "   - Super-Admin: admin@estroque.app / admin123"
echo "   - Dono da Loja: dono@estroque.com.br / senha123"
echo "================================================================================"
echo "Pressione Ctrl+C para encerrar ambos os servidores a qualquer momento."
echo ""

# Aguarda ambos os processos
wait
