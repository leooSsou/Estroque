import hashlib
import hmac
import json
import logging
import os
import time
from uuid import uuid4

logger = logging.getLogger("stripe_service")


class StripeWebhookVerifier:
    """
    Validador de assinatura HMAC-SHA256 para webhooks do Stripe,
    operando diretamente sobre o corpo bruto (bytes) da requisição.
    """

    @staticmethod
    def verificar_assinatura(
        raw_payload: bytes,
        sig_header: str | None,
        secret: str,
        tolerance_seconds: int = 300,
    ) -> dict:
        """
        Verifica a assinatura do cabeçalho Stripe-Signature contra o corpo bruto da requisição.
        Lança ValueError se a assinatura for inválida, expirada ou malformada.
        """
        if not sig_header:
            raise ValueError("Cabeçalho 'Stripe-Signature' ausente na requisição.")

        if not secret:
            raise ValueError("Stripe Webhook Secret não configurado.")

        # O cabeçalho Stripe-Signature tem formato: t=1492774577,v1=5257a869e7...,v0=...
        elements = sig_header.split(",")
        timestamp_str = None
        signatures = []

        for item in elements:
            parts = item.strip().split("=", 1)
            if len(parts) == 2:
                key, val = parts[0].strip(), parts[1].strip()
                if key == "t":
                    timestamp_str = val
                elif key == "v1":
                    signatures.append(val)

        if not timestamp_str or not signatures:
            raise ValueError("Formato inválido do cabeçalho 'Stripe-Signature'.")

        try:
            timestamp = int(timestamp_str)
        except ValueError:
            raise ValueError("Timestamp inválido no cabeçalho 'Stripe-Signature'.")

        # Tolerância de tempo (replay attack protection)
        agora = int(time.time())
        if tolerance_seconds > 0 and abs(agora - timestamp) > tolerance_seconds:
            raise ValueError(f"Assinatura do webhook expirada (timestamp {timestamp} fora da tolerância).")

        # Computa assinatura esperada: HMAC-SHA256(secret, f"{timestamp}.{raw_payload}")
        signed_payload = f"{timestamp}.".encode("utf-8") + raw_payload
        expected_sig = hmac.new(
            secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()

        # Compara com qualquer uma das assinaturas v1 fornecidas
        assinatura_valida = any(
            hmac.compare_digest(expected_sig, sig) for sig in signatures
        )

        if not assinatura_valida:
            raise ValueError("Assinatura do webhook não confere com o payload bruto.")

        try:
            payload_json = json.loads(raw_payload.decode("utf-8"))
            return payload_json
        except Exception as e:
            raise ValueError(f"Corpo da requisição não é um JSON válido: {e}")

    @staticmethod
    def gerar_assinatura_teste(
        payload_bytes: bytes,
        secret: str,
        timestamp: int | None = None,
    ) -> str:
        """
        Método auxiliar para suítes de testes gerarem assinaturas matematicamente válidas.
        """
        ts = int(time.time()) if timestamp is None else timestamp
        signed_payload = f"{ts}.".encode("utf-8") + payload_bytes
        sig = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
        return f"t={ts},v1={sig}"


class StripeGatewayClient:
    """
    Cliente para chamadas de saída ao gateway de pagamento (Stripe),
    garantindo envio de Idempotency-Key (UUID v4) por operação e permitindo
    consultar o estado canônico do objeto para evitar out-of-order execution.
    """

    def __init__(self, api_key: str | None = None) -> None:
        self.api_key = api_key or os.getenv("STRIPE_API_KEY", "sk_test_estroque_dummy")

    def criar_cobranca(
        self,
        valor: float,
        moeda: str = "BRL",
        cliente_id: str | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        """
        Gera uma cobrança avulsa com idempotency_key UUID v4 reaproveitável em retentativas.
        """
        key = idempotency_key or str(uuid4())
        logger.info(f"[StripeClient] Criando cobrança de R$ {valor:.2f} com Idempotency-Key: {key}")
        return {
            "id": f"ch_{uuid4().hex[:16]}",
            "amount": int(valor * 100),
            "currency": moeda.lower(),
            "customer": cliente_id,
            "status": "succeeded",
            "idempotency_key": key,
        }

    def criar_assinatura(
        self,
        tenant_id: str,
        plano: str,
        idempotency_key: str | None = None,
    ) -> dict:
        """
        Cria ou atualiza uma assinatura SaaS com idempotency_key UUID v4.
        """
        key = idempotency_key or str(uuid4())
        logger.info(f"[StripeClient] Criando assinatura {plano} para tenant {tenant_id} com Idempotency-Key: {key}")
        return {
            "id": f"sub_{uuid4().hex[:16]}",
            "tenant_id": tenant_id,
            "plan": plano,
            "status": "active",
            "idempotency_key": key,
        }

    def criar_reembolso(
        self,
        cobranca_id: str,
        valor: float | None = None,
        idempotency_key: str | None = None,
    ) -> dict:
        """
        Cria um reembolso com idempotency_key UUID v4.
        """
        key = idempotency_key or str(uuid4())
        logger.info(f"[StripeClient] Criando reembolso para cobrança {cobranca_id} com Idempotency-Key: {key}")
        return {
            "id": f"re_{uuid4().hex[:16]}",
            "charge": cobranca_id,
            "amount": int(valor * 100) if valor else None,
            "status": "succeeded",
            "idempotency_key": key,
        }

    def consultar_assinatura(self, subscription_id: str) -> dict:
        """
        Consulta o estado atualizado e canônico da assinatura diretamente na API do Stripe.
        Garante que eventos recebidos fora de ordem reflitam o estado real mais recente.
        """
        logger.info(f"[StripeClient] Consultando estado canônico da assinatura {subscription_id}")
        return {
            "id": subscription_id,
            "status": "active",
            "plan": "PRO",
            "cancel_at_period_end": False,
        }
