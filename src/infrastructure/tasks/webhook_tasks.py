import logging
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from src.infrastructure.database.models import TenantModel, WebhookEventModel
from src.infrastructure.database.session import SessionLocal
from src.infrastructure.services.email_service import ConsoleEmailService
from src.infrastructure.services.stripe_service import StripeGatewayClient
from src.infrastructure.tasks.celery_app import celery_app

logger = logging.getLogger("webhook_tasks")


def processar_webhook_stripe_direto(
    db: Session,
    event_id: str,
    tipo: str,
    payload: dict,
) -> dict:
    """
    Processa o evento do Stripe de forma síncrona / canônica:
    - Busca o estado canônico do gateway para não depender da ordem de chegada (out-of-order).
    - Aplica o efeito no banco de dados (ex.: libera plano, ativa tenant).
    - Dispara e-mail transacional.
    - Marca o evento como PROCESSADO na tabela webhook_events.
    """
    evento = db.query(WebhookEventModel).filter(WebhookEventModel.event_id == event_id).first()
    if not evento:
        logger.warning(f"[WebhookWorker] Evento {event_id} não encontrado na base.")
        return {"status": "not_found", "event_id": event_id}

    if evento.status == "PROCESSADO":
        logger.info(f"[WebhookWorker] Evento {event_id} já foi processado anteriormente.")
        return {"status": "already_processed", "event_id": event_id}

    gateway_client = StripeGatewayClient()
    email_service = ConsoleEmailService()

    data_object = payload.get("data", {}).get("object", {})
    metadata = data_object.get("metadata", {})
    tenant_id_str = metadata.get("tenant_id") or data_object.get("client_reference_id")

    # 1. Trata eventos de faturamento / assinatura de tenant
    if tipo in {
        "checkout.session.completed",
        "invoice.payment_succeeded",
        "customer.subscription.updated",
        "customer.subscription.created",
    }:
        subscription_id = data_object.get("subscription") or data_object.get("id")
        # Busca estado atualizado e canônico no gateway para evitar out-of-order
        if subscription_id and str(subscription_id).startswith("sub_"):
            canonical_sub = gateway_client.consultar_assinatura(str(subscription_id))
            plano_gateway = canonical_sub.get("plan", "PRO")
        else:
            plano_gateway = metadata.get("plano", "PRO")

        if tenant_id_str:
            try:
                t_uuid = UUID(str(tenant_id_str))
                db.info["ignore_tenant_filter"] = True
                tenant = db.query(TenantModel).filter(TenantModel.id == t_uuid).first()
                if tenant:
                    tenant.ativo = True
                    tenant.plano = plano_gateway
                    db.commit()
                    logger.info(f"[WebhookWorker] Tenant {t_uuid} ativado com plano {plano_gateway}.")
                    email_service.enviar_email(
                        destinatario=f"financeiro_{t_uuid}@saas.com",
                        assunto="Pagamento Confirmado e Plano Ativado",
                        html_content=f"<p>Seu plano <strong>{plano_gateway}</strong> foi ativado com sucesso!</p>",
                    )
            except Exception as exc:
                logger.error(f"[WebhookWorker] Erro ao atualizar tenant no webhook: {exc}")

    elif tipo in {"customer.subscription.deleted", "invoice.payment_failed"}:
        if tenant_id_str:
            try:
                t_uuid = UUID(str(tenant_id_str))
                db.info["ignore_tenant_filter"] = True
                tenant = db.query(TenantModel).filter(TenantModel.id == t_uuid).first()
                if tenant:
                    tenant.ativo = False
                    db.commit()
                    logger.info(f"[WebhookWorker] Tenant {t_uuid} desativado por falha/cancelamento.")
                    email_service.enviar_email(
                        destinatario=f"financeiro_{t_uuid}@saas.com",
                        assunto="Aviso de Falha no Pagamento da Assinatura",
                        html_content="<p>Houve uma falha no processamento da sua assinatura SaaS.</p>",
                    )
            except Exception as exc:
                logger.error(f"[WebhookWorker] Erro ao suspender tenant no webhook: {exc}")

    # 2. Marca o evento como PROCESSADO na tabela de eventos
    evento.status = "PROCESSADO"
    evento.processed_at = datetime.now(timezone.utc)
    db.commit()

    return {"status": "success", "event_id": event_id}


@celery_app.task
def processar_webhook_stripe_task(event_id: str, tipo: str, payload: dict) -> dict:
    """
    Tarefa assíncrona Celery para absorver e processar webhooks do Stripe em segundo plano.
    """
    db = SessionLocal()
    try:
        return processar_webhook_stripe_direto(db, event_id, tipo, payload)
    finally:
        db.close()
