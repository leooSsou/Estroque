import logging
import os

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.infrastructure.database.models import WebhookEventModel
from src.infrastructure.database.session import get_db
from src.infrastructure.services.stripe_service import StripeWebhookVerifier
from src.infrastructure.tasks.webhook_tasks import (
    processar_webhook_stripe_direto,
    processar_webhook_stripe_task,
)

logger = logging.getLogger("webhooks_router")

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/stripe", status_code=status.HTTP_200_OK)
async def receber_webhook_stripe(
    request: Request,
    db: Session = Depends(get_db),
    stripe_signature: str | None = Header(None, alias="Stripe-Signature"),
) -> dict:
    """
    Recebe notificações de webhooks do Stripe com garantia estrita de idempotência:
    1. Verifica a assinatura HMAC com o corpo bruto (raw body) da requisição antes de qualquer parsing;
    2. Tenta registrar o ID do evento na tabela webhook_events com constraint única;
    3. Se o ID já existir, responde HTTP 200 imediatamente com 'ignored' e não executa nenhum efeito colateral;
    4. Responde HTTP 200 rápido e encaminha o processamento pesado de forma assíncrona ao Celery.
    """
    # 1. Captura corpo bruto da requisição
    raw_body = await request.body()
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_estroque_webhook_secret_default")

    # 2. Valida assinatura HMAC com corpo bruto
    try:
        payload = StripeWebhookVerifier.verificar_assinatura(
            raw_payload=raw_body,
            sig_header=stripe_signature,
            secret=secret,
        )
    except ValueError as exc:
        logger.warning(f"[WebhookStripe] Falha na validação da assinatura: {exc}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Assinatura do webhook inválida: {exc}",
        )

    event_id = payload.get("id")
    event_type = payload.get("type", "unknown")

    if not event_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payload do webhook não contém o identificador 'id' do evento.",
        )

    # 3. Tenta registrar o ID do evento atomicamente com chave única
    try:
        evento_db = WebhookEventModel(
            event_id=str(event_id),
            gateway="stripe",
            tipo=str(event_type),
            status="RECEBIDO",
            payload=payload,
        )
        db.add(evento_db)
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.info(f"[WebhookStripe] Evento duplicado detectado ({event_id}). Respondendo 200 de forma idempotente.")
        return {
            "status": "ignored",
            "reason": "event_already_processed",
            "event_id": event_id,
            "idempotent": True,
        }

    # 4. Despacha o processamento de forma assíncrona (Celery)
    try:
        processar_webhook_stripe_task.delay(
            event_id=str(event_id),
            tipo=str(event_type),
            payload=payload,
        )
    except Exception as exc:
        logger.warning(f"[WebhookStripe] Falha ao enfileirar no Celery, executando fallback síncrono: {exc}")
        processar_webhook_stripe_direto(
            db=db,
            event_id=str(event_id),
            tipo=str(event_type),
            payload=payload,
        )

    return {
        "status": "received",
        "event_id": event_id,
        "type": event_type,
    }
