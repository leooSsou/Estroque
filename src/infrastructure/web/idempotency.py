import hashlib
import json
import logging
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.infrastructure.database.models import IdempotencyKeyModel

logger = logging.getLogger("idempotency")


def processar_idempotencia_antes(
    db: Session,
    tenant_id: UUID,
    rota: str,
    chave: str | None,
    corpo_requisicao: dict,
) -> dict | None:
    """
    Verifica se a requisição já foi executada anteriormente para a chave de idempotência informada:
    - Se a chave não for enviada, retorna None (execução normal);
    - Se a chave já existir com o mesmo hash do corpo JSON, retorna a resposta original salva em cache;
    - Se a chave já existir com corpo JSON diferente, lança HTTPException 422 (conflito de idempotência).
    """
    if not chave or not chave.strip():
        return None

    chave_limpa = chave.strip()
    request_hash = hashlib.sha256(
        json.dumps(corpo_requisicao, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()

    registro = (
        db.query(IdempotencyKeyModel)
        .filter(
            IdempotencyKeyModel.tenant_id == tenant_id,
            IdempotencyKeyModel.rota == rota,
            IdempotencyKeyModel.chave == chave_limpa,
        )
        .first()
    )

    if registro:
        if registro.request_hash != request_hash:
            logger.warning(
                f"[Idempotency] Chave '{chave_limpa}' na rota '{rota}' foi reutilizada com payload divergente."
            )
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Idempotency-Key já utilizada com corpo de requisição diferente.",
            )
        logger.info(f"[Idempotency] Resposta em cache retornada para chave '{chave_limpa}' na rota '{rota}'.")
        return registro.response_body

    return None


def salvar_idempotencia_depois(
    db: Session,
    tenant_id: UUID,
    rota: str,
    chave: str | None,
    corpo_requisicao: dict,
    status_code: int,
    response_body: dict,
) -> dict:
    """
    Registra a resposta gerada associada à chave de idempotência de forma atômica no banco de dados.
    Em caso de colisão concorrente de chaves (duas requisições simultâneas chegarem no mesmo milissegundo),
    a chave única garante que apenas uma grava; a que colidir faz rollback e retorna a resposta vencedora.
    """
    if not chave or not chave.strip():
        return response_body

    chave_limpa = chave.strip()
    request_hash = hashlib.sha256(
        json.dumps(corpo_requisicao, sort_keys=True, default=str).encode("utf-8")
    ).hexdigest()

    try:
        novo_registro = IdempotencyKeyModel(
            tenant_id=tenant_id,
            chave=chave_limpa,
            rota=rota,
            request_hash=request_hash,
            status_code=status_code,
            response_body=response_body,
        )
        db.add(novo_registro)
        db.commit()
        return response_body
    except IntegrityError:
        db.rollback()
        # Colisão por concorrência simultânea: busca a resposta gravada pela transação vencedora
        existente = (
            db.query(IdempotencyKeyModel)
            .filter(
                IdempotencyKeyModel.tenant_id == tenant_id,
                IdempotencyKeyModel.rota == rota,
                IdempotencyKeyModel.chave == chave_limpa,
            )
            .first()
        )
        if existente:
            return existente.response_body
        return response_body
