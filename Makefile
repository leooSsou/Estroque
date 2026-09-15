.PHONY: up down restart logs test seed ps help

help:
	@echo "Comandos disponíveis:"
	@echo "  make up       - Inicia tudo (containers, migrações, seeds) em 1 comando"
	@echo "  make down     - Para todos os containers"
	@echo "  make restart  - Reinicia o ecossistema"
	@echo "  make logs     - Exibe logs de todos os containers"
	@echo "  make test     - Executa a suíte de testes com cobertura via pytest"
	@echo "  make seed     - Executa o seed de dados no banco"
	@echo "  make ps       - Lista o status dos containers"

up:
	@./start.sh

down:
	@docker compose down

restart:
	@docker compose down
	@./start.sh

logs:
	@docker compose logs -f

test:
	@docker compose exec backend pytest --cov=src --cov-fail-under=75

seed:
	@docker compose exec backend python -m src.infrastructure.database.seed

ps:
	@docker compose ps
