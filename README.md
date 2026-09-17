<div align="center">

# ESTROQUE

**Plataforma SaaS Multi-tenant Completa para Gestão de Estoque, Retaguarda e PDV Frente de Caixa Multiloja.**

[![CI Pipeline](https://github.com/leooSsou/Estroque/actions/workflows/ci.yml/badge.svg)](https://github.com/leooSsou/Estroque/actions/workflows/ci.yml)
[![Release](https://img.shields.io/badge/Release-v1.0.1--beta-10B981.svg)](https://github.com/leooSsou/Estroque/releases)
[![Clean Architecture](https://img.shields.io/badge/Architecture-Clean%20Architecture-0B2B26.svg)](#-arquitetura)
[![React 19](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20Tailwind-142522.svg)](#-stack-tecnológica)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.12-235347.svg)](#-stack-tecnológica)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%2015-051F20.svg)](#-stack-tecnológica)
[![Celery & Redis](https://img.shields.io/badge/Async%20Workers-Celery%20%7C%20Redis-163832.svg)](#-stack-tecnológica)

</div>

---

## 📌 Visão Geral

O **ESTROQUE** é um ERP e sistema de retaguarda multi-tenant de alta performance desenvolvido para redes varejistas e operações comerciais com múltiplas filiais. 

O sistema combina uma arquitetura desacoplada e robusta no backend (**Clean Architecture**, Python 3.12, FastAPI, PostgreSQL com lock pessimista) com uma interface moderna em **Dark Mode nativo** (React 19, TypeScript, Tailwind CSS), integrando catálogo de produtos, controle de saldos por loja, entrada automatizada por NF-e, crediário próprio, conciliação financeira, tarefas assíncronas e um **PDV Frente de Caixa completo com relatórios executivos em PDF**.

---

## ⚡ Principais Funcionalidades

### 🛒 1. PDV Frente de Caixa Completo (Padrão ERP Varejo)
- **Aba 1: Caixa Ativo (Vendas)**: Leitor óptico de código de barras / busca rápida por SKU, carrinho dinâmico, seletor de cliente com validação de limite de crediário em tempo real e calculadora de troco em espécie.
- **Aba 2: Vendas em Espera (Hold Queue)**: Retenção de atendimentos pausados com código sequencial (`ESP-XXX`) para liberação imediata da fila física do balcão, permitindo retomada no caixa com 1 clique.
- **Aba 3: Histórico & Estorno com Reversão Contábil**: Listagem de vendas do turno em linha única (`whitespace-nowrap`), reimpressão de cupom não-fiscal e estorno transacional com devolução física imediata ao estoque da loja, compensação contábil no livro financeiro e recomposição do limite de crediário.
- **Aba 4: Gestão de Turno & Gaveta Física**: Abertura de turno com fundo de troco inicial, registro auditado de sangrias (retiradas para o cofre) e suprimentos (reforço de moedas), conciliação em tempo real e fechamento cego de gaveta com apuração instantânea de quebra de caixa.

### 📄 2. Relatórios Executivos de Vendas em PDF
- **Fechamento Diário de Caixa**: Métricas consolidadas (faturamento bruto, descontos, receita líquida, ticket médio), distribuição percentual por meio de pagamento, conferência de gaveta e relação analítica de comprovantes.
- **Consolidado Mensal**: Visão executiva para gerência com curva de vendas do mês, ranking de produtos mais vendidos e volume financeiro.
- **Formatação A4 Portrait (`@media print`)**: Layout limpo, sem elementos de tela (sidebars e botões), pronto para salvar em PDF ou imprimir nativamente.

### 📦 3. Estoque Concorrente & Livro-Razão (Ledger)
- **Bloqueio Pessimista (`SELECT FOR UPDATE`)**: Prevenção rigorosa de concorrência e condições de corrida entre múltiplos caixas e filiais, impedindo saldos negativos.
- **Trilha de Auditoria Imutável**: Todas as movimentações geram registros de débito/crédito rastreáveis no ledger contábil.
- **Transferências Interlojas**: Workflow com máquina de estados (`SOLICITADO` → `DESPACHADO` → `RECEBIDO` / `DIVERGENTE`) com proteção BOLA (*Broken Object Level Authorization*).

### 📑 4. Entrada Automatizada via NF-e
- **Parser XML v4.00**: Importação de Notas Fiscais com validação contra XML Bomb (DefusedXML).
- **Cadastro Automático**: Criação automática de fornecedores e produtos não catalogados, com cálculo contábil de **Custo Médio Ponderado**.

### 💼 5. Gestão Financeira & Crediário
- **Contas a Pagar e Receber**: Lançamentos automáticos integrados às vendas, compras, sangrias e suprimentos.
- **Crediário Próprio**: Concessão e controle de limites de crédito para clientes com validação transacional e bloqueio automático por inadimplência.

### 📊 6. Analytics & Business Intelligence
- **Curva ABC (Princípio de Pareto 80/20)**: Classificação automática dos produtos com maior impacto no faturamento.
- **Indicadores Executivos**: Margem de contribuição, Giro de Estoque, Custo das Mercadorias Vendidas (CMV), Ticket Médio e monitor de rupturas.

### ⚙️ 7. Tarefas Assíncronas & Fechamento Automático
- **Celery & Redis**: Processamento em segundo plano para fechamento contábil diário e consolidação de métricas sem onerar as requisições HTTP da API.

---

## 🏗️ Arquitetura

O sistema adota estritamente os princípios da **Clean Architecture**, mantendo as regras de negócio puras e totalmente isoladas de frameworks e detalhes de infraestrutura:

```plaintext
Estroque/
├── frontend/                   # Interface SPA em React 19, Vite, Tailwind CSS
│   ├── src/
│   │   ├── components/         # Design System (Bento Cards, Modais, TopBar, Sidebar, PDV)
│   │   ├── pages/              # Telas (Dashboard, Produtos, Estoque, PDV, Financeiro, etc.)
│   │   ├── context/            # Autenticação JWT e Notificações (Toast)
│   │   └── services/           # Comunicação com a API REST (Axios/Fetch)
├── src/
│   ├── domain/                 # Entidades puras (Tenant, Produto, Venda, Estoque) e Contratos
│   ├── use_cases/              # Casos de uso de negócio (Estoque, Vendas, Catálogo, Analytics)
│   └── infrastructure/         # Frameworks e Drivers
│       ├── web/                # Endpoints FastAPI, Schemas Pydantic v2 e Injeção de Dependências
│       ├── database/           # Modelos SQLAlchemy 2.0, Sessões e Migrações Alembic
│       └── tasks/              # Celery Workers, Beat e Agendamentos
└── tests/                      # 164 testes automatizados integrados contra PostgreSQL real
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologias |
| :--- | :--- |
| **Frontend Web** | React 19, TypeScript, Vite 8, Tailwind CSS v3, Lucide React |
| **Backend API** | Python 3.12, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2 |
| **Banco de Dados** | PostgreSQL 15 |
| **Filas & Tarefas Assíncronas** | Redis 7, Celery, Celery Beat |
| **Segurança & Autenticação** | JWT (JSON Web Tokens), Bcrypt, RBAC (Role-Based Access Control), SlowAPI |
| **Qualidade & Linting** | Pytest, Pytest-Cov (100% de cobertura), Ruff, Jiti |
| **Contêineres & Orquestração** | Docker, Docker Compose |

---

## 🚀 Como Executar

### Pré-requisitos
- [Docker](https://docs.docker.com/get-docker/) e [Docker Compose](https://docs.docker.com/compose/) instalados.

### 1. Inicialização Completa em 1 Comando
O script de bootstrapping sobe todos os contêineres, aguarda a inicialização do banco, aplica as migrações do Alembic e popula os dados e usuários de demonstração:

```bash
./start.sh
```

*(Ou utilize os atalhos do `Makefile`: `make up`)*

---

### 2. URLs de Acesso

| Serviço | URL | Descrição |
| :--- | :--- | :--- |
| **Frontend ERP & PDV** | [http://localhost:3000](http://localhost:3000) | Painel visual em Dark Mode de alta definição |
| **API Backend (FastAPI)** | [http://localhost:8000](http://localhost:8000) | Endpoints REST da retaguarda |
| **Documentação Interativa (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Teste interativo de rotas da API |
| **Documentação Alternativa (Redoc)** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | Especificação OpenAPI formatada |

---

### 🔑 3. Credenciais de Acesso de Demonstração (Seed)

Após a execução do `./start.sh` (ou `make seed`), utilize os usuários pré-configurados para login:

| Perfil | E-mail | Senha | Nível de Acesso |
| :--- | :--- | :--- | :--- |
| **Dono / Administrador Geral** | `dono@estroque.com.br` | `senha123` | Acesso total a todas as lojas, relatórios e finanças |
| **Gerente de Loja** | `admin@estroque.app` | `admin123` | Gestão operacional de catálogo, estoque e PDV |

---

## 🧪 Qualidade & Testes Automatizados

O projeto mantém uma política rigorosa de qualidade com **100% de aprovação no CI**:

```bash
# Executar a suíte de testes do Backend (PostgreSQL real)
docker compose exec backend pytest

# Executar o linter de código Python (Ruff)
docker compose exec backend ruff check src/ tests/

# Executar a suíte de testes unitários do Frontend (Fluxos do PDV)
docker compose exec frontend npm test

# Validar o build de produção do Frontend
docker compose exec frontend npm run build
```

---

## ⌨️ Comandos Úteis (`Makefile`)

| Comando | Descrição |
| :--- | :--- |
| `make up` | Constrói e inicializa todos os contêineres em segundo plano |
| `make down` | Desliga todos os contêineres |
| `make test` | Executa a suíte completa de testes no backend com relatório de cobertura |
| `make seed` | Popula o banco com lojas, produtos, clientes e vendas de exemplo |
| `make ps` | Exibe o status em tempo real dos contêineres Docker |

---

## 📚 Documentação Técnica

Para detalhes aprofundados sobre arquitetura, fluxos e decisões técnicas, consulte a pasta [`docs/`](docs/):

- [Contexto Arquitetural & Handoff para IA](docs/contexto_ia.md)
- [Regras de Integração & Contribuição](AGENTS.md)
- [Especificação Técnica & Funcional](docs/especificacao_tecnica.md)
- [Guia de UI/UX & Design System](docs/ui_ux_prompt_guide.md)
- [Cronograma de Desenvolvimento](docs/cronograma_desenvolvimento.md)
- [Coleção Postman API](docs/postman_collection.json)
