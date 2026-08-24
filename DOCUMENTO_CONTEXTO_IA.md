# 🚀 Documento de Contexto Geral e Handoff do Projeto (Estroque)

> **Atenção para qualquer IA ou Desenvolvedor resumindo este projeto:**
> Este documento contém **todo o contexto arquitetural, estado atual do código, testes, governança Git e o plano da próxima etapa (Onda 6)**. Leia este documento com atenção antes de tomar qualquer ação no código.

---

## 📌 1. Visão Geral do Projeto & Tech Stack

O **Estroque** é uma plataforma web de retaguarda e controle financeiro/estoque multiloja com isolamento lógico multi-tenant (*Shared Database, Shared Schema*).

### 🛠️ Tecnologias Utilizadas:
* **Backend**: Python 3.12+ com **FastAPI**.
* **Banco de Dados**: **PostgreSQL 15** (em contêiner Docker na porta `5433` para desenvolvimento/testes local).
* **ORM / Query Builder**: **SQLAlchemy 2.0** (estilo imperativo/clássico com mixins).
* **Migrações**: **Alembic**.
* **Mensageria & Filas**: **Redis** (na porta `6380`) e **Celery** (planejado para Onda 6).
* **Segurança e Rate Limiting**: `bcrypt` (hash de senhas), `python-jose` (tokens JWT) e `slowapi` + Redis (Rate Limiting contra ataques DDoS).
* **Testes**: `pytest` com 100% das suítes rodando isoladamente em banco de dados de teste (PostgreSQL real, não SQLite).
* **Orquestração**: `docker-compose.yml`.

---

## 🏛️ 2. Arquitetura e Padrões de Design (Rigorosamente Seguidos)

O projeto segue rigorosamente os princípios da **Clean Architecture**:

```plaintext
src/
├── domain/                      # Camada 1: Núcleo do Domínio (Regras Puras de Negócio)
│   ├── entities/                # Dataclasses Python congeladas (frozen=True), POPOs sem SQLAlchemy
│   ├── exceptions/              # Exceções de negócio customizadas (DomainException)
│   └── repositories/            # Contratos e Interfaces Abstratas de persistência (ABC)
│
├── use_cases/                   # Camada 2: Casos de Uso da Aplicação
│   ├── autenticacao/            # CriarTenant, AutenticarUsuario
│   ├── catalogo/                # CRUDs de Lojas, Produtos, Clientes e Fornecedores
│   ├── estoque/                 # RegistrarMovimentacao, ImportarNFe, Transferências, Auditoria
│   ├── financeiro/              # Gestão financeira, despesas e integração de caixa de vendas
│   └── vendas/                  # Venda administrativa e controle de limite de crediário
│
└── infrastructure/              # Camada 3 e 4: Frameworks, Drivers e Persistência
    ├── database/                # Modelos SQLAlchemy, Migrations (Alembic) e Repositórios Concretos
    ├── security/                # Bcrypt, JWT handler, Password hashing
    └── web/                     # Rotas FastAPI, Middlewares, Schemas Pydantic, SlowAPI Rate Limiter
```

### 🔒 Isolamento Multi-tenant Absoluto:
* Todas as tabelas de inquilinos possuem a coluna `tenant_id` fornecida pelo mixin `HasTenant` em `src/infrastructure/database/mixins.py`.
* O isolamento lógico é forçado automaticamente no SQLAlchemy via evento `do_orm_execute` em `src/infrastructure/database/session.py`.
* **Regra**: Nenhuma consulta `SELECT`, `UPDATE` ou `DELETE` pode vazar dados de outro `tenant_id`. Se a sessão tiver um `tenant_id` ativo, a cláusula `WHERE tenant_id = current_tenant_id` é injetada de forma implícita.

---

## 📊 3. Estado Atual do Projeto & Progresso (Status Concluído)

Atualmente, **121 testes automatizados estão passando com 100% de sucesso** no CI (`gh run list` verde em `develop`) rodando contra **PostgreSQL real** dentro do Docker (`docker compose exec backend pytest`). CI exige linter `ruff` e cobertura mínima de **75%** (`--cov-fail-under=75`).

### ✅ Onda 1: Setup, Banco de Dados, Autenticação e Segurança (100% Concluído)
* Setup completo de Docker (PostgreSQL porta `5433`, Redis porta `6380`).
* Entidades de domínio puras `Tenant` e `Usuario`.
* Sistema de autenticação JWT injetando `tenant_id` e `role` (`ADMIN_SAAS`, `DONO`, `GERENTE`).
* Dependência FastAPI `get_current_user` injetando o contexto do tenant ativo na sessão do banco.
* Proteção de **Rate Limiting** com SlowAPI + Redis em rotas críticas de login/cadastro e testes de DDoS em `tests/test_rate_limit.py`.
* Testes de vazamento multi-tenant (*SaaS Leakage*) em `tests/test_vazamento_seguranca.py`.

### ✅ Onda 2: Catálogo Centralizado - Lojas, Produtos, Clientes e Fornecedores (100% Concluído)
* Entidades de domínio puras e repositórios para `Loja`, `Produto`, `Cliente` e `Fornecedor`.
* Regra de negócio de **Precificação Inteligente por Markup** (`calcular_preco_venda(preco_custo, markup)` em `produto.py`).
* Validações matemáticas estritas de CPF e CNPJ com limpeza de caracteres não numéricos em `loja.py`, `cliente.py` e `fornecedor.py`.
* Schemas Pydantic, modelos SQLAlchemy com constraints compostas (`sku + tenant_id`, `cnpj + tenant_id`, `documento + tenant_id`), migrações Alembic e rotas FastAPI CRUD completas.
* Testes de integração de API e testes de vulnerabilidade multi-tenant em `tests/test_vulnerabilidade_catalogo.py`.

### ✅ Onda 3: Ledger de Estoque, Concorrência e Importação de NF-e (100% Concluído)
* Entidades `EstoqueSaldo` e `EstoqueMovimentacao` (`frozen=True`, ledger imutável) e `EstoqueInsuficienteException`.
* Tabelas `estoque_saldos` e `estoque_movimentacoes` com migrações Alembic.
* Repositórios com **lock pessimista** (`SELECT FOR UPDATE` via `.with_for_update()`) em `obter_por_loja_e_produto_com_lock`.
* Caso de uso `RegistrarMovimentacaoEstoque` validando saldo em saídas e registrando o histórico imutável.
* Rotas `POST /estoque/movimentar`, `GET /estoque/saldos`, `GET /estoque/movimentacoes`.
* Importação de NF-e: parser de XML v4.00, auto-cadastro de fornecedores/produtos, custo médio ponderado, rota `POST /estoque/importar-xml`, proteção contra **XML Bomb**.
* Testes de concorrência em threads (`tests/test_concorrencia_estoque.py`) e testes do ledger (`tests/test_estoque_ledger.py`).

### ✅ Onda 4: Transferências Logísticas e Auditoria Física (100% Concluído)
* Máquina de estados de transferências `SOLICITADO -> DESPACHADO -> RECEBIDO / DIVERGENTE` com locks pessimistas no despacho/recebimento.
* Controle BOLA (Broken Object Level Authorization): loja de origem e destino protegidas por tenant.
* Auditoria física (contagem rotativa, sobras/perdas) com rotas e testes.
* Testes em `tests/test_estoque_transferencias.py`, `tests/test_estoque_auditoria.py` e `tests/test_api_estoque_auditoria.py`.

### ✅ Onda 5: Financeiro, Vendas e Crediário (100% Concluído)
* Gestão financeira: contas a pagar/receber, despesas e **integração automática de caixa de vendas**.
* Venda administrativa com controle de limite de crediário dos clientes.
* Testes em `tests/test_api_financeiro.py` e `tests/test_vendas_crediario.py`.

### 🌿 Governança Git / GitHub:
* Fluxo de integração **obrigatório** via Pull Request com base `develop` (ver `AGENTS.md`).
* CI (`ci.yml`) deve estar **verde** antes do merge; `develop` nunca recebe push direto.
* `main` só é atualizada a partir de `develop` com CI verde (merge direto, sem PR).
* Últimos entregáveis: renomeação do projeto para **Estroque** (#7), teste e2e de simulação de uso real (#6) e documentação do fluxo de integração (#5).
* Remoto: `leooSsou/projeto-gerenciamento-saas` (sincronizado com `main` e `develop`).

---

## 🎯 4. Próxima Etapa: Onda 6 - Analytics e Processamento Assíncrono

Estamos prontos para iniciar a **Onda 6**, planejada no `cronograma_desenvolvimento.md` e dividida em **duas frentes verticais**:

### 📐 Frente 1: Business Intelligence e Analytics (Faturamento & Estoque)
* **Objetivo**: Construir o motor analítico para consolidação de KPIs financeiros e diagnósticos de estoque.
* **Atividades**:
  1. **Consolidação de Margens**: lógica de Ticket Médio, Faturamento Bruto vs CMV para margem real.
  2. **KPIs do Dashboard**: endpoint `GET /analytics/dashboard` retornando faturamento, ticket médio, produtos em Estoque Crítico (abaixo do mínimo) e Rupturas (estoque zerado).
  3. **Algoritmo de Curva ABC**: endpoint `GET /analytics/curva-abc` calculando representatividade acumulada de faturamento e classificação A (80%), B (15%), C (5%) pelo Princípio de Pareto.
  4. **Testes de BI**: exatidão matemática das métricas e isolamento multi-tenant dos relatórios.

### 📐 Frente 2: Processamento Assíncrono e Relatórios (Celery & Redis)
* **Objetivo**: Implementar background tasks para fechamentos automatizados de caixa e notificações por e-mail.
* **Atividades**:
  1. **Infraestrutura de Workers**: Celery + Redis no ambiente Docker do backend.
  2. **Template de E-mail**: HTML moderno e responsivo para o relatório de fechamento diário.
  3. **Scheduler (Celery Beat)**: rotina noturna compilando receitas, despesas e vendas do dia de cada Tenant.
  4. **Envio SMTP**: integração para disparo ao `DONO` do tenant, com filas e re-tentativas.
  5. **Testes Assíncronos**: comportamento dos workers sem vazamentos.

---

## 🗺️ 5. Roadmap das Próximas Ondas (Visão de Futuro)

* **Onda 6**: Analytics, Dashboards (Curva ABC, Ticket Médio, Rupturas de Estoque) e Celery/Redis Workers para envio de relatórios por e-mail.
* **Onda 7**: Frontend React SPA (Vite + Tailwind CSS + TanStack Query).

---

## ⚡ 6. Comandos Essenciais para Iniciar no Novo Ambiente

Assim que você reinstalar o sistema operacional e clonar o repositório (`git clone`), execute os seguintes comandos no terminal:

### 1. Iniciar os Contêineres Docker:
```bash
docker compose up --build -d
```

### 2. Verificar Status dos Serviços:
```bash
docker compose ps
```

### 3. Rodar a Suíte Completa de Testes Automatizados:
```bash
docker compose exec backend pytest
```
*(Espera-se que todos os testes passem com 100% de sucesso).*

### 4. Executar Migrações do Alembic (se necessário):
```bash
docker compose exec backend alembic upgrade head
```

### 5. Lint e Cobertura (obrigatórios no CI):
```bash
ruff check src/ tests/
docker compose exec backend pytest --cov=src --cov-fail-under=75
```

---

## 📝 7. Instrução Final para a IA ao Retomar o Projeto

> **Para a IA que assumir o atendimento neste novo ambiente:**
> 1. Diga ao usuário que você leu este documento (`DOCUMENTO_CONTEXTO_IA.md`).
> 2. Confirme que entende o estado do projeto (Ondas 1 a 6 100% concluídas com testes passando e CI verde).
> 3. Siga rigorosamente a Clean Architecture e os padrões de teste descritos neste documento.
> 4. Siga o fluxo de integração do `AGENTS.md`: branch própria a partir de `develop`, PR com CI verde, nunca push direto.