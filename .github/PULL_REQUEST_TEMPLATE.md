<!-- Substitua os campos [ ] pelo conteúdo adequado antes de abrir o PR. -->

## O que este PR faz?

_Pequeno resumo da frente/entrega (ex.: "Adiciona endpoint de curva ABC de estoque")._

## Frente / Tarefa

- [ ] Frente 1 — Analytics/BI
- [ ] Frente 2 — Celery / tarefa assíncrona
- [ ] Infra / Config / Refatoração
- [ ] Documentação

## O que foi alterado?

- [ ] `src/domain/...`
- [ ] `src/use_cases/...`
- [ ] `src/infrastructure/...`
- [ ] Migração Alembic
- [ ] Testes
- [ ] CI / Config

## Testes

- [ ] `ruff check src/ tests/` passa localmente
- [ ] CI verde no PR (aguardado com `gh run watch`)
- [ ] Testes novos adicionados/atualizados
- [ ] Testes rodam contra PostgreSQL real (sem SQLite)

## Camadas compartilhadas

_Se mexeu em `models.py`, `repositorios_concrete.py`, `session.py`, migrações ou `web/main.py`, sinalize aqui para o integrador resolver conflitos._

- [ ] Não toquei em camada compartilhada
- [ ] Toquei em: _listar arquivos_

## Contexto / Observações

_Algum detalhe que o revisor precise saber? Dependências entre frentes? Decisão de arquitetura?_