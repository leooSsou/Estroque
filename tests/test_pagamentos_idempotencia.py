import json
import os
import random
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.infrastructure.database.models import (
    Base,
    ClienteModel,
    EstoqueSaldoModel,
    LojaModel,
    ProdutoModel,
    TenantModel,
    UsuarioModel,
    VendaModel,
    WebhookEventModel,
)
from src.infrastructure.security.jwt_handler import criar_token_acesso
from src.infrastructure.services.stripe_service import (
    StripeGatewayClient,
    StripeWebhookVerifier,
)
from src.infrastructure.web.main import app

# Conexão com banco PostgreSQL ou fallback SQLite de testes
DATABASE_TEST_URL = os.getenv(
    "DATABASE_TEST_URL",
    os.getenv("DATABASE_URL", "sqlite:///./test.db"),
)
engine = create_engine(DATABASE_TEST_URL)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def gerar_cnpj_valido() -> str:
    base = [random.randint(0, 9) for _ in range(12)]
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s1 = sum(base[i] * pesos1[i] for i in range(12))
    r1 = s1 % 11
    d1 = 0 if r1 < 2 else 11 - r1
    base.append(d1)
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s2 = sum(base[i] * pesos2[i] for i in range(13))
    r2 = s2 % 11
    d2 = 0 if r2 < 2 else 11 - r2
    base.append(d2)
    return "".join(map(str, base))


def gerar_cpf_valido() -> str:
    n = [random.randint(0, 9) for _ in range(9)]
    soma1 = sum(n[i] * (10 - i) for i in range(9))
    d1 = (soma1 * 10) % 11
    if d1 == 10:
        d1 = 0
    soma2 = sum((n + [d1])[i] * (11 - i) for i in range(10))
    d2 = (soma2 * 10) % 11
    if d2 == 10:
        d2 = 0
    return "".join(map(str, n + [d1, d2]))


@pytest.fixture(scope="module", autouse=True)
def setup_tables():
    Base.metadata.create_all(bind=engine)


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_context():
    session = TestSessionLocal()
    session.info["ignore_tenant_filter"] = True

    tenant = TenantModel(
        nome_fantasia="Idempotencia Tenant",
        razao_social=f"Idempotencia Teste S/A {uuid4().hex[:6]}",
        cnpj=gerar_cnpj_valido(),
        plano="PRO",
        limite_usuarios=10,
        limite_lojas=5,
    )
    session.add(tenant)
    session.flush()

    usuario = UsuarioModel(
        tenant_id=tenant.id,
        nome="Dono Idempotencia",
        email=f"dono_{uuid4().hex[:6]}@idemp.com",
        senha_hash="dummyhash",
        role="DONO",
    )
    session.add(usuario)
    session.flush()

    loja = LojaModel(
        tenant_id=tenant.id,
        nome="Loja Idempotencia",
        endereco="Rua Teste, 100",
        cnpj=gerar_cnpj_valido(),
    )
    session.add(loja)
    session.flush()

    produto = ProdutoModel(
        tenant_id=tenant.id,
        nome="Produto Idempotente",
        sku=f"SKU-{uuid4().hex[:6]}",
        preco_custo=20.0,
        preco_venda=50.0,
        markup=150.0,
        ativo=True,
    )
    session.add(produto)
    session.flush()

    saldo = EstoqueSaldoModel(
        tenant_id=tenant.id,
        loja_id=loja.id,
        produto_id=produto.id,
        quantidade=10,
    )
    session.add(saldo)

    cliente = ClienteModel(
        tenant_id=tenant.id,
        nome="Cliente Idempotente",
        email=f"cli_{uuid4().hex[:6]}@teste.com",
        documento=gerar_cpf_valido(),
        limite_credito=200.0,
        saldo_devedor_crediario=100.0,
        credito_loja=50.0,
        ativo=True,
    )
    session.add(cliente)

    session.commit()

    token = criar_token_acesso(
        sub=str(usuario.id),
        tenant_id=str(tenant.id),
        role="DONO",
    )
    headers = {"Authorization": f"Bearer {token}"}

    ctx = {
        "tenant_id": tenant.id,
        "usuario_id": usuario.id,
        "loja_id": loja.id,
        "produto_id": produto.id,
        "cliente_id": cliente.id,
        "headers": headers,
    }
    session.close()

    yield ctx


# ==============================================================================
# TESTES DE WEBHOOK (STRIPE)
# ==============================================================================

def test_webhook_stripe_duplicata_serial(client, auth_context):
    """
    Envia o mesmo evento do webhook do Stripe 2 vezes em série.
    A 1ª requisição deve retornar 200 'received'.
    A 2ª requisição deve retornar 200 'ignored' (idempotente) sem reprocessar.
    """
    event_id = f"evt_serial_{uuid4().hex[:12]}"
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_estroque_webhook_secret_default")
    payload = {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "client_reference_id": str(auth_context["tenant_id"]),
                "metadata": {"plano": "ENTERPRISE", "tenant_id": str(auth_context["tenant_id"])},
            }
        },
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    sig = StripeWebhookVerifier.gerar_assinatura_teste(payload_bytes, secret)

    # 1. Primeira chamada: deve ser recebida e gravada
    res1 = client.post(
        "/webhooks/stripe",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "Stripe-Signature": sig},
    )
    assert res1.status_code == 200
    assert res1.json()["status"] == "received"
    assert res1.json()["event_id"] == event_id

    # 2. Segunda chamada idêntica: deve ser ignorada de forma idempotente
    res2 = client.post(
        "/webhooks/stripe",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "Stripe-Signature": sig},
    )
    assert res2.status_code == 200
    assert res2.json()["status"] == "ignored"
    assert res2.json()["idempotent"] is True

    # 3. Garante que apenas 1 registro foi criado no banco
    db = TestSessionLocal()
    db.info["ignore_tenant_filter"] = True
    eventos = db.query(WebhookEventModel).filter(WebhookEventModel.event_id == event_id).all()
    assert len(eventos) == 1
    db.close()


def test_webhook_stripe_duplicata_concorrente(auth_context):
    """
    Dispara 2 requisições simultâneas com o mesmo event_id de webhook.
    A constraint única no banco garante que apenas 1 grava e ambas respondem 200 OK.
    """
    event_id = f"evt_conc_{uuid4().hex[:12]}"
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_estroque_webhook_secret_default")
    payload = {
        "id": event_id,
        "type": "invoice.payment_succeeded",
        "data": {
            "object": {
                "id": "in_test_concorrente",
                "metadata": {"plano": "ENTERPRISE", "tenant_id": str(auth_context["tenant_id"])},
            }
        },
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    sig = StripeWebhookVerifier.gerar_assinatura_teste(payload_bytes, secret)

    def enviar():
        local_client = TestClient(app)
        return local_client.post(
            "/webhooks/stripe",
            content=payload_bytes,
            headers={"Content-Type": "application/json", "Stripe-Signature": sig},
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(enviar) for _ in range(2)]
        respostas = [f.result() for f in futs]

    assert all(r.status_code == 200 for r in respostas)
    statuses = [r.json()["status"] for r in respostas]
    assert "received" in statuses
    assert "ignored" in statuses or statuses.count("received") == 1

    # Confere unicidade no banco
    db = TestSessionLocal()
    db.info["ignore_tenant_filter"] = True
    count = db.query(WebhookEventModel).filter(WebhookEventModel.event_id == event_id).count()
    assert count == 1
    db.close()


def test_webhook_stripe_assinatura_invalida(client):
    """
    Garante que assinaturas adulteradas ou inválidas são rejeitadas com HTTP 400 antes de gravar.
    """
    payload = {"id": f"evt_fake_{uuid4().hex[:8]}", "type": "ping"}
    payload_bytes = json.dumps(payload).encode("utf-8")
    res = client.post(
        "/webhooks/stripe",
        content=payload_bytes,
        headers={"Content-Type": "application/json", "Stripe-Signature": "t=123456,v1=assinatura_falsa_invalida"},
    )
    assert res.status_code == 400
    assert "Assinatura do webhook inválida" in res.json()["detail"]


# ==============================================================================
# TESTES DE CHAMADAS DE SAÍDA AO GATEWAY (OUTBOUND IDEMPOTENCY)
# ==============================================================================

def test_outbound_gateway_idempotency_key_geracao_e_reaproveitamento():
    """
    Garante que o cliente do Stripe gera UUID v4 quando não informado,
    e reaproveita estritamente a mesma chave em caso de retentativa.
    """
    client = StripeGatewayClient()
    # 1. Gera chave automática
    cob1 = client.criar_cobranca(valor=100.0)
    assert cob1["idempotency_key"] is not None
    assert len(cob1["idempotency_key"]) == 36  # UUID v4 tem 36 chars

    # 2. Reaproveita chave explícita em retentativa
    chave_fixa = str(uuid4())
    cob2 = client.criar_cobranca(valor=100.0, idempotency_key=chave_fixa)
    cob2_retry = client.criar_cobranca(valor=100.0, idempotency_key=chave_fixa)
    assert cob2["idempotency_key"] == chave_fixa
    assert cob2_retry["idempotency_key"] == chave_fixa


# ==============================================================================
# TESTES DE ENDPOINTS INTERNOS COM HEADER IDEMPOTENCY-KEY
# ==============================================================================

def test_venda_endpoint_idempotencia_serial(client, auth_context):
    """
    Dispara 2 requisições com a mesma Idempotency-Key em POST /vendas.
    A 1ª deve criar a venda e deduzir estoque de 10 para 8.
    A 2ª deve devolver a mesma venda (mesmo ID) sem deduzir estoque novamente.
    """
    headers = auth_context["headers"].copy()
    idemp_key = str(uuid4())
    headers["Idempotency-Key"] = idemp_key

    payload = {
        "loja_id": str(auth_context["loja_id"]),
        "forma_pagamento": "DINHEIRO",
        "itens": [{"produto_id": str(auth_context["produto_id"]), "quantidade": 2}],
    }

    # 1. Primeira chamada: cria a venda
    res1 = client.post("/vendas", json=payload, headers=headers)
    assert res1.status_code == 201
    venda_id_1 = res1.json()["id"]

    # 2. Segunda chamada com mesma chave: retorna mesmo ID em cache
    res2 = client.post("/vendas", json=payload, headers=headers)
    assert res2.status_code == 201
    venda_id_2 = res2.json()["id"]
    assert venda_id_1 == venda_id_2

    # 3. Verifica no banco: apenas 1 venda persistida e estoque = 8 (não 6)
    db = TestSessionLocal()
    db.info["ignore_tenant_filter"] = True
    total_vendas = db.query(VendaModel).filter(VendaModel.id == venda_id_1).count()
    assert total_vendas == 1

    saldo = (
        db.query(EstoqueSaldoModel)
        .filter(
            EstoqueSaldoModel.loja_id == auth_context["loja_id"],
            EstoqueSaldoModel.produto_id == auth_context["produto_id"],
        )
        .first()
    )
    assert saldo.quantidade == 8
    db.close()


def test_venda_endpoint_idempotencia_concorrente(auth_context):
    """
    Dispara 2 requisições concorrentes com a mesma Idempotency-Key em POST /vendas.
    Ambas devem retornar sucesso com o mesmo ID, debitando estoque apenas uma vez.
    """
    idemp_key = str(uuid4())
    headers = auth_context["headers"].copy()
    headers["Idempotency-Key"] = idemp_key

    payload = {
        "loja_id": str(auth_context["loja_id"]),
        "forma_pagamento": "DINHEIRO",
        "itens": [{"produto_id": str(auth_context["produto_id"]), "quantidade": 1}],
    }

    def enviar():
        local_client = TestClient(app)
        return local_client.post("/vendas", json=payload, headers=headers)

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(enviar) for _ in range(2)]
        respostas = [f.result() for f in futs]

    assert all(r.status_code == 201 for r in respostas)
    vendas_ids = [r.json()["id"] for r in respostas]
    assert vendas_ids[0] == vendas_ids[1]


def test_venda_endpoint_idempotencia_payload_divergente(client, auth_context):
    """
    Garante que reenviar a mesma Idempotency-Key com payload diferente retorna 422.
    """
    headers = auth_context["headers"].copy()
    idemp_key = str(uuid4())
    headers["Idempotency-Key"] = idemp_key

    payload_a = {
        "loja_id": str(auth_context["loja_id"]),
        "forma_pagamento": "DINHEIRO",
        "itens": [{"produto_id": str(auth_context["produto_id"]), "quantidade": 1}],
    }
    payload_b = {
        "loja_id": str(auth_context["loja_id"]),
        "forma_pagamento": "PIX",  # Mudou forma de pagamento
        "itens": [{"produto_id": str(auth_context["produto_id"]), "quantidade": 1}],
    }

    res1 = client.post("/vendas", json=payload_a, headers=headers)
    assert res1.status_code == 201

    res2 = client.post("/vendas", json=payload_b, headers=headers)
    assert res2.status_code == 422
    assert "Idempotency-Key já utilizada com corpo de requisição diferente" in res2.json()["detail"]


def test_estorno_venda_idempotencia(client, auth_context):
    """
    Cria uma venda e estorna 2 vezes com a mesma Idempotency-Key.
    O estoque deve ser devolvido apenas uma vez e a resposta deve ser idempotente.
    """
    # 1. Cria a venda
    res_venda = client.post(
        "/vendas",
        json={
            "loja_id": str(auth_context["loja_id"]),
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": str(auth_context["produto_id"]), "quantidade": 2}],
        },
        headers=auth_context["headers"],
    )
    venda_id = res_venda.json()["id"]

    # 2. Estorna com Idempotency-Key
    headers = auth_context["headers"].copy()
    idemp_key = str(uuid4())
    headers["Idempotency-Key"] = idemp_key

    res_estorno1 = client.post(f"/vendas/{venda_id}/estornar", headers=headers)
    assert res_estorno1.status_code == 200

    # 3. Repetição do estorno com a mesma chave: retorna 200 em cache sem erro
    res_estorno2 = client.post(f"/vendas/{venda_id}/estornar", headers=headers)
    assert res_estorno2.status_code == 200
    assert res_estorno1.json()["id"] == res_estorno2.json()["id"]


def test_crediario_receber_idempotencia(client, auth_context):
    """
    Recebe crediário com Idempotency-Key 2 vezes.
    O saldo devedor deve ser abatido rigorosamente apenas uma vez.
    """
    headers = auth_context["headers"].copy()
    idemp_key = str(uuid4())
    headers["Idempotency-Key"] = idemp_key

    cliente_id = auth_context["cliente_id"]
    payload = {"loja_id": str(auth_context["loja_id"]), "valor": 30.0}

    # Saldo devedor inicial = 100.0
    res1 = client.post(f"/clientes/{cliente_id}/receber-crediario", json=payload, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["saldo_devedor_crediario"] == 70.0

    # Repetição com a mesma chave: devolve 70.0 em cache (não abate para 40.0)
    res2 = client.post(f"/clientes/{cliente_id}/receber-crediario", json=payload, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["saldo_devedor_crediario"] == 70.0
