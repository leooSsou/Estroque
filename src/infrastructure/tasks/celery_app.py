import os

from celery import Celery
from celery.schedules import crontab

REDIS_HOST = os.getenv("REDIS_HOST", "redis")
REDIS_PORT = os.getenv("REDIS_PORT", "6379")

redis_url = f"redis://{REDIS_HOST}:{REDIS_PORT}/0"

celery_app = Celery(
    "projeto_gerenciamento",
    broker=redis_url,
    backend=redis_url
)

celery_app.conf.update(
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
)

# Agenda Celery Beat: Fechamento diário às 23:59
celery_app.conf.beat_schedule = {
    "fechamento-diario-tenants": {
        "task": "src.infrastructure.tasks.fechamento_diario.enviar_fechamento_diario_todos_tenants",
        "schedule": crontab(minute=59, hour=23),
    }
}

celery_app.autodiscover_tasks(["src.infrastructure.tasks"])
