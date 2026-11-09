"""
Suíte de Testes de Integração no Estilo Request Spec (RSpec).

Esta suíte cobre os fluxos críticos de ponta a ponta do Estroque:
- Fluxos 1 e 2: Onboarding, Cadastro de Inquilino, Autenticação e Gestão de Colaboradores
- Fluxos 3 e 5: Checkout / Venda à Vista, Baixa de Estoque e Ciclo de Turnos de Caixa
- Fluxos 3 e 7: Venda a Prazo (Crediário), Limites de Crédito e Liquidação de Dívida
- Fluxo 4: Pós-Venda - Estorno de Venda e Devoluções/Trocas com Vale-Crédito
- Fluxos 3 e 8: Idempotência de Pagamentos, Repetição de Requisição e Webhooks de Gateway
- Fluxos 2, 3 e 11: Limites do Sistema (Estoque Zerado, Lojas do Plano, Validações)
- Fluxos 2, 3, 6 e 9: Isolamento Multi-Tenant e Controle de Acesso Estrito (BOLA / BFLA)
- Fluxo 6: Gestão Financeira - Contas a Pagar e Quitação de Lançamentos

Cada teste executa requisições HTTP reais via TestClient contra o banco de dados real com isolamento de transação.
"""

import hashlib
import hmac
import json
import os
import random
import time
from uuid import uuid4

from fastapi.testclient import TestClient


def gerar_cnpj_valido() -> str:
    """Gera um CNPJ matematicamente válido para satisfazer os validadores de domínio."""
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
    """Gera um CPF matematicamente válido para satisfazer os validadores de clientes."""
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


def cadastrar_e_autenticar_tenant(client: TestClient, prefix: str) -> dict:
    """Helper que registra um tenant e faz login, retornando tokens, headers e identificadores."""
    email = f"{prefix.lower()}_{uuid4().hex[:6]}@empresa.com"
    senha = "SenhaForte123@"
    cnpj = gerar_cnpj_valido()

    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"Rede {prefix}",
            "razao_social": f"Rede {prefix} Comercio Ltda",
            "cnpj": cnpj,
            "dono_nome": f"Dono {prefix}",
            "dono_email": email,
            "dono_senha": senha,
        },
    )
    assert res_reg.status_code == 201, f"Falha no cadastro de tenant: {res_reg.text}"
    tenant_id = res_reg.json()["tenant_id"]
    dono_id = res_reg.json()["dono_id"]

    res_login = client.post(
        "/auth/login",
        json={"email": email, "senha": senha},
    )
    assert res_login.status_code == 200, f"Falha no login: {res_login.text}"
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    return {
        "tenant_id": tenant_id,
        "dono_id": dono_id,
        "email": email,
        "senha": senha,
        "token": token,
        "headers": headers,
    }


def criar_loja_helper(client: TestClient, headers: dict, nome: str = "Loja Matriz") -> str:
    """Helper para cadastrar uma loja física."""
    res = client.post(
        "/lojas/",
        json={
            "nome": nome,
            "cnpj": gerar_cnpj_valido(),
            "endereco": "Av. Principal, 1000",
        },
        headers=headers,
    )
    assert res.status_code == 201, f"Falha ao criar loja: {res.text}"
    return res.json()["id"]


def criar_produto_helper(
    client: TestClient,
    headers: dict,
    nome: str = "Teclado Mecanico",
    sku: str = "TEC-001",
    preco_custo: float = 100.0,
    markup: float = 50.0,
) -> str:
    """Helper para cadastrar um produto com precificação inteligente por markup."""
    preco_venda = round(preco_custo * (1 + markup / 100), 2)
    res = client.post(
        "/produtos/",
        json={
            "nome": nome,
            "sku": sku,
            "preco_custo": preco_custo,
            "preco_venda": preco_venda,
            "markup": markup,
        },
        headers=headers,
    )
    assert res.status_code == 201, f"Falha ao criar produto: {res.text}"
    return res.json()["id"]


def adicionar_estoque_helper(
    client: TestClient,
    headers: dict,
    loja_id: str,
    produto_id: str,
    quantidade: int = 10,
) -> None:
    """Helper para creditar saldo físico no ledger de estoque."""
    res = client.post(
        "/estoque/movimentar",
        json={
            "loja_id": loja_id,
            "produto_id": produto_id,
            "tipo": "ENTRADA",
            "quantidade": quantidade,
            "motivo": "Estoque Inicial para Testes",
        },
        headers=headers,
    )
    assert res.status_code == 200, f"Falha ao movimentar estoque: {res.text}"


def criar_cliente_helper(
    client: TestClient,
    headers: dict,
    nome: str = "Cliente VIP",
    limite_credito: float = 500.0,
) -> str:
    """Helper para cadastrar um cliente com limite de crediário."""
    cpf = gerar_cpf_valido()
    email = f"cliente_{uuid4().hex[:6]}@email.com"
    res = client.post(
        "/clientes/",
        json={
            "nome": nome,
            "email": email,
            "documento": cpf,
            "limite_credito": limite_credito,
        },
        headers=headers,
    )
    assert res.status_code == 201, f"Falha ao criar cliente: {res.text}"
    return res.json()["id"]


# ==============================================================================
# ESPECIFICAÇÃO 1: Onboarding, Cadastro de Inquilino e Autenticação
# ==============================================================================


def test_spec_01_onboarding_e_autenticacao(client: TestClient):
    """
    describe: Fluxo 1 e 2 - Onboarding, Cadastro e Sessão de Usuário
    """
    prefix = f"Onboard{random.randint(1000, 9999)}"
    email = f"{prefix.lower()}@teste.com"
    senha = "SenhaSegura123!"
    cnpj = gerar_cnpj_valido()

    # it: quando submetido cadastro com dados válidos, então cria tenant PRO e usuário DONO com 201
    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"Tenant {prefix}",
            "razao_social": f"Razao {prefix} Ltda",
            "cnpj": cnpj,
            "dono_nome": "Proprietario Teste",
            "dono_email": email,
            "dono_senha": senha,
        },
    )
    assert res_reg.status_code == 201
    dados_reg = res_reg.json()
    assert "tenant_id" in dados_reg
    assert dados_reg["dono_email"] == email

    # it: quando submetido login com credenciais válidas, então emite JWT com status 200
    res_login = client.post("/auth/login", json={"email": email, "senha": senha})
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # it: quando consultado /auth/me com token válido, então retorna perfil DONO e plano PRO
    res_me = client.get("/auth/me", headers=headers)
    assert res_me.status_code == 200
    assert res_me.json()["role"] == "DONO"
    assert res_me.json()["plano"] == "PRO"

    # it: quando tenta cadastrar novamente o mesmo e-mail, então rejeita com 400 Bad Request
    res_dup = client.post(
        "/auth/register",
        json={
            "nome_fantasia": "Outra Empresa",
            "razao_social": "Outra Empresa Ltda",
            "cnpj": gerar_cnpj_valido(),
            "dono_nome": "Outro Dono",
            "dono_email": email,
            "dono_senha": "OutraSenha123!",
        },
    )
    assert res_dup.status_code == 400
    assert "já está em uso" in res_dup.json()["detail"]

    # it: quando tenta login com senha incorreta, então rejeita com 401 Unauthorized
    res_err_login = client.post("/auth/login", json={"email": email, "senha": "SenhaErradaTotal"})
    assert res_err_login.status_code == 401
    assert "E-mail ou senha incorretos" in res_err_login.json()["detail"]

    # it: quando formato do e-mail for inválido, então rejeita com 422 Unprocessable Entity
    res_invalido = client.post(
        "/auth/register",
        json={
            "nome_fantasia": "Formato Invalido",
            "razao_social": "Formato Invalido Ltda",
            "dono_nome": "Teste",
            "dono_email": "email-sem-arroba",
            "dono_senha": senha,
        },
    )
    assert res_invalido.status_code == 422


# ==============================================================================
# ESPECIFICAÇÃO 2: Checkout / Venda à Vista, Baixa de Estoque e Ciclo de Caixa
# ==============================================================================


def test_spec_02_pdv_venda_a_vista_e_ciclo_de_caixa(client: TestClient):
    """
    describe: Fluxo 3 e 5 - Checkout no PDV, Baixa no Estoque e Turnos de Caixa
    """
    ctx = cadastrar_e_autenticar_tenant(client, "PDVCaixa")
    headers = ctx["headers"]
    loja_id = criar_loja_helper(client, headers, "Filial PDV Centro")
    produto_id = criar_produto_helper(
        client, headers, "Fone Bluetooth Pro", "FON-001", preco_custo=100.0, markup=50.0
    )  # preco_venda = 150.0

    adicionar_estoque_helper(client, headers, loja_id, produto_id, quantidade=10)

    # it: quando operador abre turno de caixa com fundo inicial de R$ 100,00, então turno ativo é criado com 201
    res_abertura = client.post(
        "/caixa/abrir",
        json={"loja_id": loja_id, "fundo_inicial": 100.0},
        headers=headers,
    )
    assert res_abertura.status_code == 201
    assert res_abertura.json()["aberto"] is True
    assert res_abertura.json()["fundo_inicial"] == 100.0

    # it: quando tenta abrir um segundo turno na mesma loja com turno já aberto, então rejeita com 400
    res_abertura_dup = client.post(
        "/caixa/abrir",
        json={"loja_id": loja_id, "fundo_inicial": 50.0},
        headers=headers,
    )
    assert res_abertura_dup.status_code == 400
    assert "Já existe um turno de caixa aberto" in res_abertura_dup.json()["detail"]

    # it: quando venda à vista no dinheiro é realizada, então debita estoque e gera receita paga
    res_venda = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": produto_id, "quantidade": 2}],
        },
        headers=headers,
    )
    assert res_venda.status_code == 201
    venda_data = res_venda.json()
    assert venda_data["status"] == "PAGO"
    assert venda_data["valor_total"] == 300.0  # 2 un * 150.0

    # it: quando checa saldo físico do produto, então saldo restante deve ser 8
    res_saldo = client.get(
        f"/estoque/saldos?loja_id={loja_id}&produto_id={produto_id}",
        headers=headers,
    )
    assert res_saldo.status_code == 200
    assert res_saldo.json()[0]["quantidade"] == 8

    # it: quando registra suprimento de R$ 50,00 e sangria de R$ 30,00, então grava operações com 201
    res_sup = client.post(
        "/caixa/operacoes",
        json={"loja_id": loja_id, "tipo": "SUPRIMENTO", "valor": 50.0, "motivo": "Troco adicional"},
        headers=headers,
    )
    assert res_sup.status_code == 201

    res_san = client.post(
        "/caixa/operacoes",
        json={"loja_id": loja_id, "tipo": "SANGRIA", "valor": 30.0, "motivo": "Retirada para cofre"},
        headers=headers,
    )
    assert res_san.status_code == 201

    # it: quando fecha caixa informando saldo real (100 fundo + 300 venda + 50 suprimento - 30 sangria = 420),
    # então apura vendas em dinheiro, calcula diferença 0.0 e marca aberto=False
    res_fechar = client.post(
        "/caixa/fechar",
        json={"loja_id": loja_id, "saldo_informado": 420.0, "observacao": "Fechamento perfeito"},
        headers=headers,
    )
    assert res_fechar.status_code == 200
    fechamento_data = res_fechar.json()
    assert fechamento_data["saldo_esperado"] == 420.0
    assert fechamento_data["diferenca"] == 0.0
    assert fechamento_data["resumo"]["aberto"] is False

    # it: quando tenta fechar caixa novamente sem turno aberto, então rejeita com 400
    res_fechar_dup = client.post(
        "/caixa/fechar",
        json={"loja_id": loja_id, "saldo_informado": 0.0},
        headers=headers,
    )
    assert res_fechar_dup.status_code == 400


# ==============================================================================
# ESPECIFICAÇÃO 3: Venda no Crediário, Limites de Crédito e Liquidação de Dívida
# ==============================================================================


def test_spec_03_venda_crediario_limites_e_liquidacao(client: TestClient):
    """
    describe: Fluxos 3 e 7 - Venda a Prazo (Crediário), Limites e Quitação
    """
    ctx = cadastrar_e_autenticar_tenant(client, "Crediario")
    headers = ctx["headers"]
    loja_id = criar_loja_helper(client, headers, "Loja Crediario")
    produto_id = criar_produto_helper(
        client, headers, "Camisa Polo", "CAM-001", preco_custo=50.0, markup=100.0
    )  # preco_venda = 100.0
    adicionar_estoque_helper(client, headers, loja_id, produto_id, quantidade=10)

    # Cliente com limite de R$ 200,00
    cliente_id = criar_cliente_helper(client, headers, "Cliente Bom Pagador", limite_credito=200.0)

    # it: quando venda no crediário está dentro do limite (1 un = R$ 100 <= 200), então aprova com 201 e eleva saldo devedor
    res_venda1 = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "cliente_id": cliente_id,
            "forma_pagamento": "CREDIARIO",
            "itens": [{"produto_id": produto_id, "quantidade": 1}],
        },
        headers=headers,
    )
    assert res_venda1.status_code == 201

    res_cli = client.get(f"/clientes/{cliente_id}", headers=headers)
    assert res_cli.status_code == 200
    assert res_cli.json()["saldo_devedor_crediario"] == 100.0

    # it: quando nova venda no crediário excede o limite (100 atual + 150 nova = 250 > 200), então rejeita com 403 Forbidden
    # Produto de R$ 150: 1 un
    prod2_id = criar_produto_helper(
        client, headers, "Calca Jeans", "CAL-001", preco_custo=100.0, markup=50.0
    )  # preco_venda = 150.0
    adicionar_estoque_helper(client, headers, loja_id, prod2_id, quantidade=5)

    res_venda_excedida = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "cliente_id": cliente_id,
            "forma_pagamento": "CREDIARIO",
            "itens": [{"produto_id": prod2_id, "quantidade": 1}],
        },
        headers=headers,
    )
    assert res_venda_excedida.status_code == 403
    assert "Limite de crédito excedido" in res_venda_excedida.json()["detail"]

    # it: quando cliente quita parcialmente o crediário (R$ 40,00), então saldo devedor reduz para R$ 60,00
    res_receber = client.post(
        f"/clientes/{cliente_id}/receber-crediario",
        json={"loja_id": loja_id, "valor": 40.0},
        headers=headers,
    )
    assert res_receber.status_code == 200
    assert res_receber.json()["saldo_devedor_crediario"] == 60.0

    # it: quando tenta pagar valor superior à dívida restante (ex: R$ 80 > 60), então rejeita com 400 Bad Request
    res_receber_excesso = client.post(
        f"/clientes/{cliente_id}/receber-crediario",
        json={"loja_id": loja_id, "valor": 80.0},
        headers=headers,
    )
    assert res_receber_excesso.status_code == 400


# ==============================================================================
# ESPECIFICAÇÃO 4: Estorno e Devoluções/Trocas com Vale-Crédito
# ==============================================================================


def test_spec_04_estorno_e_devolucao_com_vale_credito(client: TestClient):
    """
    describe: Fluxo 4 - Pós-Venda: Estorno e Devoluções/Trocas de Vendas
    """
    ctx = cadastrar_e_autenticar_tenant(client, "PosVenda")
    headers = ctx["headers"]
    loja_id = criar_loja_helper(client, headers, "Loja Pos Venda")
    produto_id = criar_produto_helper(
        client, headers, "Mochila Executiva", "MOC-001", preco_custo=80.0, markup=50.0
    )  # preco_venda = 120.0
    adicionar_estoque_helper(client, headers, loja_id, produto_id, quantidade=10)
    cliente_id = criar_cliente_helper(client, headers, "Cliente Fiel")

    # Venda 1: 3 unidades
    res_venda1 = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": produto_id, "quantidade": 3}],
        },
        headers=headers,
    )
    assert res_venda1.status_code == 201
    venda1_id = res_venda1.json()["id"]

    # it: quando venda concluída é estornada via POST /vendas/{id}/estornar, então cancela e recompõe estoque
    res_estorno = client.post(
        f"/vendas/{venda1_id}/estornar",
        headers=headers,
    )
    assert res_estorno.status_code == 200
    assert res_estorno.json()["status"] == "CANCELADA"

    # Saldo voltou para 10
    res_saldo = client.get(f"/estoque/saldos?loja_id={loja_id}&produto_id={produto_id}", headers=headers)
    assert res_saldo.json()[0]["quantidade"] == 10

    # it: quando tenta estornar novamente a mesma venda cancelada, então rejeita com 400 Bad Request
    res_estorno_dup = client.post(f"/vendas/{venda1_id}/estornar", headers=headers)
    assert res_estorno_dup.status_code == 400

    # Venda 2 com cliente identificado: 2 unidades (total R$ 240,00)
    res_venda2 = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "cliente_id": cliente_id,
            "forma_pagamento": "PIX",
            "itens": [{"produto_id": produto_id, "quantidade": 2}],
        },
        headers=headers,
    )
    venda2_id = res_venda2.json()["id"]
    item_venda_id = res_venda2.json()["itens"][0]["id"]

    # it: quando cliente devolve 1 item com resolução CREDITO_LOJA, então credita saldo loja e recompõe estoque
    res_devolucao = client.post(
        f"/vendas/{venda2_id}/devolver",
        json={
            "tipo": "DEVOLUCAO",
            "tipo_resolucao": "CREDITO_LOJA",
            "motivo": "Cliente optou por trocar depois",
            "itens": [
                {
                    "item_venda_id": item_venda_id,
                    "quantidade": 1,
                    "retornar_ao_estoque": True,
                    "condicao": "PERFEITO",
                }
            ],
        },
        headers=headers,
    )
    assert res_devolucao.status_code == 201
    assert res_devolucao.json()["tipo"] == "DEVOLUCAO"
    assert res_devolucao.json()["tipo_resolucao"] == "CREDITO_LOJA"
    assert res_devolucao.json()["valor_total"] == 120.0

    # Verifica saldo loja do cliente creditado em R$ 120.0
    res_cli_atualizado = client.get(f"/clientes/{cliente_id}", headers=headers)
    assert res_cli_atualizado.json()["credito_loja"] == 120.0


# ==============================================================================
# ESPECIFICAÇÃO 5: Idempotência de Pagamentos e Webhooks de Gateway
# ==============================================================================


def test_spec_05_idempotencia_e_webhooks(client: TestClient):
    """
    describe: Fluxos 3 e 8 - Idempotência e Notificações de Pagamento (Webhooks)
    """
    ctx = cadastrar_e_autenticar_tenant(client, "IdempSpec")
    headers = ctx["headers"].copy()
    loja_id = criar_loja_helper(client, headers, "Loja Idempotente")
    produto_id = criar_produto_helper(client, headers, "Monitor Gamer", "MON-001", preco_custo=500.0, markup=50.0)
    adicionar_estoque_helper(client, headers, loja_id, produto_id, quantidade=10)

    # it: quando venda for reenviada com a mesma Idempotency-Key, então devolve cache 201 e não duplica baixa de estoque
    idemp_key = str(uuid4())
    headers["Idempotency-Key"] = idemp_key

    payload_venda = {
        "loja_id": loja_id,
        "forma_pagamento": "DINHEIRO",
        "itens": [{"produto_id": produto_id, "quantidade": 2}],
    }

    # 1ª Chamada
    res1 = client.post("/vendas", json=payload_venda, headers=headers)
    assert res1.status_code == 201
    venda_id = res1.json()["id"]

    # 2ª Chamada (Reenvio)
    res2 = client.post("/vendas", json=payload_venda, headers=headers)
    assert res2.status_code == 201
    assert res2.json()["id"] == venda_id

    # Saldo deve ser 8 (debitou apenas 2 un, não 4)
    res_saldo = client.get(f"/estoque/saldos?loja_id={loja_id}&produto_id={produto_id}", headers=headers)
    assert res_saldo.json()[0]["quantidade"] == 8

    # it: quando mesma Idempotency-Key é usada com payload adulterado, então rejeita com 422
    payload_adulterado = payload_venda.copy()
    payload_adulterado["forma_pagamento"] = "PIX"
    res_adulterada = client.post("/vendas", json=payload_adulterado, headers=headers)
    assert res_adulterada.status_code == 422

    # it: quando webhook da Stripe chega com HMAC válido, então processa e responde 200
    event_id = f"evt_spec_{uuid4().hex[:10]}"
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_estroque_webhook_secret_default")
    timestamp = int(time.time())
    payload_webhook = {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {"object": {"id": f"cs_{uuid4().hex[:8]}", "payment_status": "paid"}},
    }
    raw_payload = json.dumps(payload_webhook)
    signed_payload = f"{timestamp}.{raw_payload}"
    signature = hmac.new(secret.encode("utf-8"), signed_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    sig_header = f"t={timestamp},v1={signature}"

    # 1ª Entrega do webhook
    res_wh1 = client.post(
        "/webhooks/stripe",
        content=raw_payload,
        headers={"Content-Type": "application/json", "Stripe-Signature": sig_header},
    )
    assert res_wh1.status_code == 200
    assert res_wh1.json()["status"] == "received"

    # it: quando mesmo webhook é reenviado (duplicata), então detecta deduplicação e retorna 200 ignorado
    res_wh2 = client.post(
        "/webhooks/stripe",
        content=raw_payload,
        headers={"Content-Type": "application/json", "Stripe-Signature": sig_header},
    )
    assert res_wh2.status_code == 200
    assert res_wh2.json()["status"] == "ignored"
    assert res_wh2.json()["reason"] == "event_already_processed"


# ==============================================================================
# ESPECIFICAÇÃO 6: Limites do Sistema e Validações Estritas
# ==============================================================================


def test_spec_06_limites_e_validacoes(client: TestClient):
    """
    describe: Fluxos 2, 3 e 11 - Limites de Estoque, Plano e Validações
    """
    ctx = cadastrar_e_autenticar_tenant(client, "Limites")
    headers = ctx["headers"]
    loja_id = criar_loja_helper(client, headers, "Loja Limites")
    produto_id = criar_produto_helper(client, headers, "Webcam HD", "WEB-001", preco_custo=80.0, markup=50.0)
    adicionar_estoque_helper(client, headers, loja_id, produto_id, quantidade=3)

    # it: quando venda tenta comprar mais itens do que o saldo existente (5 > 3), então rejeita com 400 Bad Request
    res_sem_estoque = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": produto_id, "quantidade": 5}],
        },
        headers=headers,
    )
    assert res_sem_estoque.status_code == 400
    assert "insuficiente" in res_sem_estoque.json()["detail"].lower()

    # it: quando venda tenta enviar quantidade zero ou negativa, então rejeita com 422 Unprocessable Entity
    res_qtd_invalida = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": produto_id, "quantidade": -1}],
        },
        headers=headers,
    )
    assert res_qtd_invalida.status_code == 422

    # it: quando despesa tem valor zero ou negativo, então rejeita com 422
    res_desp_invalida = client.post(
        "/financeiro/despesas",
        json={"loja_id": loja_id, "valor": -50.0, "categoria": "LUZ"},
        headers=headers,
    )
    assert res_desp_invalida.status_code == 422

    # it: quando tenant atinge o limite_lojas do plano (ex: plano PRO = 5 lojas), a 6ª loja deve ser rejeitada com 400
    # O tenant já tem 1 loja criada acima. Criamos mais 4 até bater o teto de 5:
    for i in range(2, 6):
        criar_loja_helper(client, headers, f"Filial {i}")

    # 6ª Loja tenta ser criada além do limite:
    res_loja_limite = client.post(
        "/lojas/",
        json={"nome": "Filial Extrapolada", "cnpj": gerar_cnpj_valido(), "endereco": "Rua Excedente"},
        headers=headers,
    )
    assert res_loja_limite.status_code == 400
    assert "Limite de lojas do plano atingido" in res_loja_limite.json()["detail"]


# ==============================================================================
# ESPECIFICAÇÃO 7: Isolamento Multi-Tenant e Controle de Acesso (BOLA / BFLA)
# ==============================================================================


def test_spec_07_isolamento_multitenant_e_bola_bfla(client: TestClient):
    """
    describe: Fluxos 2, 3, 6 e 9 - Isolamento Multi-Tenant e Proteção Contra BOLA/BFLA
    """
    # Tenant A
    ctx_a = cadastrar_e_autenticar_tenant(client, "TenantA")
    headers_a = ctx_a["headers"]
    loja_a = criar_loja_helper(client, headers_a, "Matriz Tenant A")
    prod_a = criar_produto_helper(client, headers_a, "Produto A", "SKU-A", preco_custo=10.0, markup=50.0)
    adicionar_estoque_helper(client, headers_a, loja_a, prod_a, quantidade=5)

    res_venda_a = client.post(
        "/vendas",
        json={"loja_id": loja_a, "forma_pagamento": "DINHEIRO", "itens": [{"produto_id": prod_a, "quantidade": 1}]},
        headers=headers_a,
    )
    assert res_venda_a.status_code == 201
    venda_a_id = res_venda_a.json()["id"]

    # Tenant B
    ctx_b = cadastrar_e_autenticar_tenant(client, "TenantB")
    headers_b = ctx_b["headers"]

    # it: quando usuário do Tenant B tenta ler venda do Tenant A em GET /vendas/{id}, então recebe 404 Not Found
    res_bola_venda = client.get(f"/vendas/{venda_a_id}", headers=headers_b)
    assert res_bola_venda.status_code == 404

    # it: quando usuário do Tenant B tenta cadastrar despesa usando loja_id do Tenant A, então recebe 404 Not Found
    res_bola_despesa = client.post(
        "/financeiro/despesas",
        json={"loja_id": loja_a, "valor": 100.0, "categoria": "AGUA", "status_pagamento": "PAGO"},
        headers=headers_b,
    )
    assert res_bola_despesa.status_code == 404

    # it: quando usuário comum (DONO) tenta acessar /admin/tenants, então recebe 403 Forbidden
    res_bfla_admin = client.get("/admin/tenants", headers=headers_a)
    assert res_bfla_admin.status_code == 403

    # it: quando um GERENTE da Loja 1 tenta vender na Loja 2 do mesmo inquilino, então recebe 403 Forbidden
    loja_a_filial2 = criar_loja_helper(client, headers_a, "Filial 2 Tenant A")
    gerente_email = f"gerente_{uuid4().hex[:6]}@empresa.com"
    gerente_senha = "SenhaGerente123!"

    res_gerente = client.post(
        "/auth/usuarios",
        json={
            "nome": "Gerente Filial 1",
            "email": gerente_email,
            "senha": gerente_senha,
            "role": "GERENTE",
            "loja_atribuida_id": loja_a,  # Vinculado à Loja 1
        },
        headers=headers_a,
    )
    assert res_gerente.status_code == 201

    token_gerente = client.post(
        "/auth/login",
        json={"email": gerente_email, "senha": gerente_senha},
    ).json()["access_token"]
    headers_gerente = {"Authorization": f"Bearer {token_gerente}"}

    # Gerente tenta vender na Loja 2:
    res_venda_gerente_loja2 = client.post(
        "/vendas",
        json={
            "loja_id": loja_a_filial2,
            "forma_pagamento": "DINHEIRO",
            "itens": [{"produto_id": prod_a, "quantidade": 1}],
        },
        headers=headers_gerente,
    )
    assert res_venda_gerente_loja2.status_code == 403
    assert "Acesso negado: Gerente não possui permissão para acessar esta loja física." in res_venda_gerente_loja2.json()["detail"]


# ==============================================================================
# ESPECIFICAÇÃO 8: Gestão Financeira - Contas a Pagar e Quitação
# ==============================================================================


def test_spec_08_gestao_financeira_despesas_e_quitacao(client: TestClient):
    """
    describe: Fluxo 6 - Gestão Financeira: Lançamentos e Quitação
    """
    ctx = cadastrar_e_autenticar_tenant(client, "Financeiro")
    headers = ctx["headers"]
    loja_id = criar_loja_helper(client, headers, "Loja Financeira")

    # it: quando despesa é lançada com status PENDENTE, então grava lançamento a pagar com 201
    res_despesa = client.post(
        "/financeiro/despesas",
        json={
            "loja_id": loja_id,
            "valor": 250.0,
            "categoria": "ALUGUEL",
            "status_pagamento": "PENDENTE",
        },
        headers=headers,
    )
    assert res_despesa.status_code == 201
    lancamento_id = res_despesa.json()["id"]
    assert res_despesa.json()["status_pagamento"] == "PENDENTE"
    assert res_despesa.json()["valor"] == 250.0

    # it: quando despesa pendente é quitada via PATCH /financeiro/lancamentos/{id}/pagar, então status vai para PAGO
    res_pagar = client.patch(
        f"/financeiro/lancamentos/{lancamento_id}/pagar",
        headers=headers,
    )
    assert res_pagar.status_code == 200
    assert res_pagar.json()["status_pagamento"] == "PAGO"

    # it: quando tenta quitar lançamento inexistente, então rejeita com 404 Not Found
    res_pagar_404 = client.patch(
        f"/financeiro/lancamentos/{uuid4()}/pagar",
        headers=headers,
    )
    assert res_pagar_404.status_code == 404

    # it: quando quitação é repetida, então mantém o status PAGO de forma idempotente com 200 OK
    res_pagar_dup = client.patch(
        f"/financeiro/lancamentos/{lancamento_id}/pagar",
        headers=headers,
    )
    assert res_pagar_dup.status_code == 200
    assert res_pagar_dup.json()["status_pagamento"] == "PAGO"
