#!/usr/bin/env bash
# ==============================================================================
# ESTROQUE SaaS - Script de Inicialização Completa em 1 Comando
# ==============================================================================
set -e

echo "🚀 Subindo todo o ecossistema ESTROQUE (Backend + Frontend + DB + Redis)..."
docker compose up -d "$@"

echo "⏳ Aguardando PostgreSQL ficar pronto..."
docker compose exec -T postgres sh -c "until pg_isready -h localhost -p 5432 -U postgres; do sleep 1; done"

echo "📦 Aplicando migrações do banco (Alembic)..."
docker compose exec -T backend alembic upgrade head

echo "🌱 Populando dados iniciais e usuários demo (Seed)..."
docker compose exec -T backend python -m src.infrastructure.database.seed

echo ""
echo "================================================================================"
echo "🎉 TUDO PRONTO EM 1 COMANDO!"
echo "================================================================================"
echo "🌐 Frontend:        http://localhost:3000"
echo "⚙️  Backend API:     http://localhost:8000"
echo "📚 Documentação:    http://localhost:8000/docs"
echo "🔑 Login Dono:      dono@estroque.com.br / senha123"
echo "🔑 Login Admin:     admin@estroque.app / admin123"
echo "================================================================================"
