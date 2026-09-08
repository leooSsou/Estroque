<div align="center">

# Estroque

**Plataforma SaaS multi-tenant para gestão inteligente de estoque e retaguarda multiloja.**

[![CI Pipeline](https://github.com/leooSsou/Estroque/actions/workflows/ci.yml/badge.svg)](https://github.com/leooSsou/Estroque/actions/workflows/ci.yml)
[![Clean Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-0B2B26.svg)](#-arquitetura)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.12-235347.svg)](#-stack-tecnológica)
[![React](https://img.shields.io/badge/Frontend-React%20%7C%20TanStack-163832.svg)](#-stack-tecnológica)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015-051F20.svg)](#-stack-tecnológica)

</div>

---

## 📌 Visão Geral

O **Estroque** é um sistema ERP de alta performance projetado para redes varejistas e operações multiloja. Construído sob os princípios da **Clean Architecture**, combina isolamento lógico multi-tenant rigoroso, controle de concorrência com locks pessimistas e processamento assíncrono para garantir integridade contábil e alta disponibilidade.

---

## ⚡ Principais Módulos

- **Isolamento Multi-tenant**: Filtragem automática em tempo de execução (`tenant_id`) em todas as transações de banco de dados.
- **Ledger de Estoque Concorrente**: Registro imutável de movimentações com bloqueio pessimista (`SELECT FOR UPDATE`), prevenindo saldos negativos e divergências entre filiais.
- **Entrada Automatizada via NF-e**: Parser XML v4.00 com autocadastro de fornecedores, produtos e atualização contábil por Custo Médio Ponderado.
- **Transferências Interlojas**: Máquina de estados (`SOLICITADO` → `DESPACHADO` → `RECEBIDO` / `DIVERGENTE`) com validação BOLA (*Broken Object Level Authorization*).
- **Vendas & Gestão de Crediário**: Ponto de venda administrativo com validação transacional de limite de crédito e integração financeira em tempo real.
- **Analytics & BI**: Motor de Business Intelligence com Curva ABC (Princípio de Pareto), indicadores de Giro de Estoque, CMV, Ticket Médio e Rupturas.
- **Tarefas Assíncronas**: Fechamentos diários automatizados e relatórios via Celery Workers e Redis.

---

## 🏗️ Arquitetura

```plaintext
src/
├── domain/                  # Entidades de negócio puras, contratos abstratos e exceções
├── use_cases/               # Casos de uso (Catálogo, Estoque, Vendas, Financeiro, Analytics)
└── infrastructure/          # FastAPI, SQLAlchemy 2.0, Migrações Alembic, Celery, Redis e Segurança
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| **Frontend** | React, TanStack Router, TanStack Query, Tailwind CSS, Vite |
| **Banco de Dados** | PostgreSQL 15 |
| **Filas & Cache** | Redis 7, Celery, Celery Beat |
| **Segurança** | JWT (JSON Web Tokens), Bcrypt, SlowAPI Rate Limiter |
| **Infraestrutura** | Docker, Docker Compose |

---

## 🚀 Como Executar

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/) instalados.
- [Node.js](https://nodejs.org/) 20+ (para desenvolvimento local do frontend).

### 1. Inicializar Serviços (Backend, Banco e Cache)
```bash
docker compose up -d
```

### 2. Inicializar o Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. URLs de Acesso

| Serviço | URL |
| :--- | :--- |
| **Frontend Web** | [http://localhost:3000](http://localhost:3000) |
| **API REST** | [http://localhost:8000](http://localhost:8000) |
| **Documentação Interativa (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) |
| **Documentação Alternativa (Redoc)** | [http://localhost:8000/redoc](http://localhost:8000/redoc) |

---

## 🧪 Qualidade & Testes

Todos os testes de backend são executados contra instâncias reais de PostgreSQL:

```bash
# Executar suíte completa de testes
docker compose exec backend pytest

# Executar linter estático (Ruff)
docker compose exec backend ruff check src/ tests/

# Build e verificação de tipagem do frontend
cd frontend && npm run build
```
