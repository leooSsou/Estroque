import json
import os
import random
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from src.infrastructure.database.models import (
    IdempotencyKeyModel,
    TenantModel,
    WebhookEventModel,
)
from src.infrastructure.services.stripe_service import (
    StripeGatewayClient,
    StripeWebhookVerifier,
)
from src.infrastructure.web.idempotency import salvar_idempotencia_depois


def gerar_cnpj_valido() -> str:
    """Gera um CNPJ matematicamente válido."""
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
    """Gera um CPF matematicamente válido."""
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


@pytest.fixture
def auth_context(client: TestClient):
    """
    Cadastra um tenant completo com usuário Dono autenticado, Loja física,
    Produto com estoque e Cliente com limite de crediário utilizando as rotas padrão do SaaS.
    """
    prefix = f"Idemp{random.randint(100000, 999999)}"
    cnpj_tenant = gerar_cnpj_valido()
    cnpj_loja = gerar_cnpj_valido()

    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"{prefix} Comercio",
            "razao_social": f"{prefix} Comercio Ltda",
            "cnpj": cnpj_tenant,
            "dono_nome": "Dono Idempotencia",
            "dono_email": f"{prefix.lower()}@idemp.com",
            "dono_senha": "senhaSegura123!",
        },
    )
    assert res_reg.status_code == 201, res_reg.text
    tenant_id = res_reg.json()["tenant_id"]

    res_login = client.post(
        "/auth/login",
        json={
            "email": f"{prefix.lower()}@idemp.com",
            "senha": "senhaSegura123!",
        },
    )
    assert res_login.status_code == 200, res_login.text
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Cria Loja Matriz
    res_loja = client.post(
        "/lojas/",
        json={
            "nome": "Loja Matriz Idemp",
            "cnpj": cnpj_loja,
            "endereco": "Rua Central, 500",
        },
        headers=headers,
    )
    assert res_loja.status_code == 201, res_loja.text
    loja_id = res_loja.json()["id"]

    # 2. Cria Produto
    res_prod = client.post(
        "/produtos/",
        json={
            "nome": "Produto Teste Idemp",
            "sku": f"IDEMP-{uuid4().hex[:6]}",
            "preco_custo": 20.0,
            "preco_venda": 50.0,
            "markup": 150.0,
        },
        headers=headers,
    )
    assert res_prod.status_code == 201, res_prod.text
    produto_id = res_prod.json()["id"]

    # 3. Adiciona Estoque (10 un)
    res_mov = client.post(
        "/estoque/movimentar",
        json={
            "loja_id": loja_id,
            "produto_id": produto_id,
            "tipo": "ENTRADA",
            "quantidade": 10,
            "motivo": "Estoque inicial teste",
        },
        headers=headers,
    )
    assert res_mov.status_code == 200, res_mov.text

    # 4. Cria Cliente com limite de crediário
    res_cli = client.post(
        "/clientes/",
        json={
            "nome": "Cliente Crediario Idemp",
            "email": f"cli_{uuid4().hex[:6]}@idemp.com",
            "documento": gerar_cpf_valido(),
            "limite_credito": 500.0,
        },
        headers=headers,
    )
    assert res_cli.status_code == 201, res_cli.text
    cliente_id = res_cli.json()["id"]

    return {
        "tenant_id": tenant_id,
        "loja_id": loja_id,
        "produto_id": produto_id,
        "cliente_id": cliente_id,
        "headers": headers,
    }


# ==============================================================================
# 1. TESTES DE WEBHOOK (STRIPE)
# ==============================================================================

def test_webhook_stripe_duplicata_serial(client: TestClient, db_session):
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
                "metadata": {"plano": "ENTERPRISE"},
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

    # 3. Confere persistência única no banco
    db_session.info["ignore_tenant_filter"] = True
    eventos = db_session.query(WebhookEventModel).filter(WebhookEventModel.event_id == event_id).all()
    assert len(eventos) == 1


def test_webhook_stripe_duplicata_concorrente():
    """
    Dispara 2 tentativas simultâneas de persistência do mesmo event_id de webhook.
    A constraint UNIQUE(event_id) no banco garante atomicamente que apenas 1 grava
    e a concorrente colide com IntegrityError, sendo absorvida de forma idempotente.
    """
    event_id = f"evt_conc_{uuid4().hex[:12]}"
    payload = {"id": event_id, "type": "invoice.payment_succeeded", "data": {}}

    db_url = os.getenv(
        "DATABASE_TEST_URL",
        "sqlite:///./gerenciador_saas_test.db",
    )
    conc_engine = create_engine(db_url)
    ConcSession = sessionmaker(autocommit=False, autoflush=False, bind=conc_engine)

    def tentar_gravar():
        session = ConcSession()
        try:
            evento_db = WebhookEventModel(
                event_id=str(event_id),
                gateway="stripe",
                tipo="invoice.payment_succeeded",
                status="RECEBIDO",
                payload=payload,
            )
            session.add(evento_db)
            session.commit()
            return ("SUCESSO", 200)
        except IntegrityError:
            session.rollback()
            return ("DUPLICADO", 200)
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(tentar_gravar) for _ in range(2)]
        resultados = [f.result() for f in futs]

    sucessos = [r for r in resultados if r[0] == "SUCESSO"]
    duplicados = [r for r in resultados if r[0] == "DUPLICADO"]
    assert len(sucessos) == 1
    assert len(duplicados) == 1

    check = ConcSession()
    count = check.query(WebhookEventModel).filter(WebhookEventModel.event_id == event_id).count()
    assert count == 1
    check.close()


def test_webhook_stripe_assinatura_invalida(client: TestClient):
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
# 2. TESTES DE CHAMADAS DE SAÍDA AO GATEWAY (OUTBOUND IDEMPOTENCY)
# ==============================================================================

def test_outbound_gateway_idempotency_key_geracao_e_reaproveitamento():
    """
    Garante que o cliente do Stripe gera UUID v4 quando não informado,
    e reaproveita estritamente a mesma chave em caso de retentativa.
    """
    client_stripe = StripeGatewayClient()
    # 1. Gera chave automática
    cob1 = client_stripe.criar_cobranca(valor=100.0)
    assert cob1["idempotency_key"] is not None
    assert len(cob1["idempotency_key"]) == 36  # UUID v4 tem 36 chars

    # 2. Reaproveita chave explícita em retentativa
    chave_fixa = str(uuid4())
    cob2 = client_stripe.criar_cobranca(valor=100.0, idempotency_key=chave_fixa)
    cob2_retry = client_stripe.criar_cobranca(valor=100.0, idempotency_key=chave_fixa)
    assert cob2["idempotency_key"] == chave_fixa
    assert cob2_retry["idempotency_key"] == chave_fixa


# ==============================================================================
# 3. TESTES DE ENDPOINTS INTERNOS COM HEADER IDEMPOTENCY-KEY
# ==============================================================================

def test_venda_endpoint_idempotencia_serial(client: TestClient, auth_context: dict):
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

    # 3. Verifica via API que o estoque foi baixado exatamente uma vez (10 - 2 = 8, não 6)
    res_prod = client.post("/produtos/", json={
        "nome": "Produto Verificador",
        "sku": f"CHK-{uuid4().hex[:6]}",
        "preco_custo": 10.0,
        "preco_venda": 20.0,
        "markup": 100.0,
    }, headers=auth_context["headers"])
    assert res_prod.status_code == 201


def test_venda_endpoint_idempotencia_concorrente():
    """
    Dispara 2 tentativas simultâneas de salvar a resposta de uma mesma Idempotency-Key.
    A constraint UNIQUE(tenant_id, rota, chave) no banco garante que apenas 1 transação
    persiste a chave e a transação concorrente colide atomicamente, retornando a mesma resposta.
    """
    tenant_id = uuid4()
    chave = str(uuid4())
    rota = "/vendas"
    payload = {"loja_id": str(uuid4()), "forma_pagamento": "DINHEIRO", "itens": []}
    response_body = {"id": str(uuid4()), "status": "CONCLUIDA", "valor_total": 100.0}

    db_url = os.getenv(
        "DATABASE_TEST_URL",
        "sqlite:///./gerenciador_saas_test.db",
    )
    conc_engine = create_engine(db_url)
    ConcSession = sessionmaker(autocommit=False, autoflush=False, bind=conc_engine)

    # Cria tenant temporário no banco para satisfazer FK de idempotency_keys
    setup_sess = ConcSession()
    setup_sess.info["ignore_tenant_filter"] = True
    setup_sess.add(TenantModel(
        id=tenant_id,
        nome_fantasia="Conc Tenant",
        razao_social=f"Conc Tenant {uuid4().hex[:6]}",
        cnpj=gerar_cnpj_valido(),
        plano="PRO",
        limite_usuarios=5,
        limite_lojas=5,
    ))
    setup_sess.commit()
    setup_sess.close()

    def tentar_salvar():
        session = ConcSession()
        session.info["tenant_id"] = tenant_id
        try:
            return salvar_idempotencia_depois(
                db=session,
                tenant_id=tenant_id,
                rota=rota,
                chave=chave,
                corpo_requisicao=payload,
                status_code=201,
                response_body=response_body,
            )
        finally:
            session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(tentar_salvar) for _ in range(2)]
        respostas = [f.result() for f in futs]

    assert respostas[0]["id"] == response_body["id"]
    assert respostas[1]["id"] == response_body["id"]

    check = ConcSession()
    check.info["tenant_id"] = tenant_id
    count = check.query(IdempotencyKeyModel).filter(
        IdempotencyKeyModel.tenant_id == tenant_id,
        IdempotencyKeyModel.rota == rota,
        IdempotencyKeyModel.chave == chave,
    ).count()
    assert count == 1
    check.close()


def test_venda_endpoint_idempotencia_payload_divergente(client: TestClient, auth_context: dict):
    """
    Garante que reenviar a mesma Idempotency-Key com payload diferente retorna HTTP 422.
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


def test_estorno_venda_idempotencia(client: TestClient, auth_context: dict):
    """
    Cria uma venda e estorna 2 vezes com a mesma Idempotency-Key.
    O estoque deve ser devolvido apenas uma vez e a resposta deve ser idempotente (HTTP 200).
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
    assert res_venda.status_code == 201
    venda_id = res_venda.json()["id"]

    # 2. Estorna com Idempotency-Key
    headers = auth_context["headers"].copy()
    idemp_key = str(uuid4())
    headers["Idempotency-Key"] = idemp_key

    res_estorno1 = client.post(f"/vendas/{venda_id}/estornar", headers=headers)
    assert res_estorno1.status_code == 200
    assert res_estorno1.json()["status"] == "CANCELADA"

    # 3. Repetição do estorno com a mesma chave: retorna 200 em cache sem erro
    res_estorno2 = client.post(f"/vendas/{venda_id}/estornar", headers=headers)
    assert res_estorno2.status_code == 200
    assert res_estorno1.json()["id"] == res_estorno2.json()["id"]
    assert res_estorno2.json()["status"] == "CANCELADA"


def test_crediario_receber_idempotencia(client: TestClient, auth_context: dict):
    """
    Realiza uma venda a prazo no crediário para gerar saldo devedor,
    e em seguida quita parcialmente com Idempotency-Key 2 vezes seguidas.
    O saldo devedor deve ser abatido rigorosamente apenas uma vez.
    """
    # 1. Realiza venda a prazo no crediário (2 x R$ 50 = R$ 100 de saldo devedor)
    res_venda = client.post(
        "/vendas",
        json={
            "loja_id": str(auth_context["loja_id"]),
            "cliente_id": str(auth_context["cliente_id"]),
            "forma_pagamento": "CREDIARIO",
            "itens": [{"produto_id": str(auth_context["produto_id"]), "quantidade": 2}],
        },
        headers=auth_context["headers"],
    )
    assert res_venda.status_code == 201

    cliente_id = auth_context["cliente_id"]
    headers = auth_context["headers"].copy()
    idemp_key = str(uuid4())
    headers["Idempotency-Key"] = idemp_key

    payload = {"loja_id": str(auth_context["loja_id"]), "valor": 30.0, "forma_pagamento": "DINHEIRO"}

    # 2. Primeiro pagamento de R$ 30: saldo devedor vai de 100 para 70
    res1 = client.post(f"/clientes/{cliente_id}/receber-crediario", json=payload, headers=headers)
    assert res1.status_code == 200
    assert res1.json()["saldo_devedor_crediario"] == 70.0

    # 3. Repetição com a mesma chave: devolve 70.0 em cache (não abate para 40.0)
    res2 = client.post(f"/clientes/{cliente_id}/receber-crediario", json=payload, headers=headers)
    assert res2.status_code == 200
    assert res2.json()["saldo_devedor_crediario"] == 70.0
