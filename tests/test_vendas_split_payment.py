from fastapi.testclient import TestClient


def registrar_e_autenticar(client: TestClient, prefix: str, cnpj: str) -> str:
    client.post("/auth/register", json={
        "nome_fantasia": f"{prefix} Split",
        "razao_social": f"{prefix} Split Razao Social S/A",
        "cnpj": cnpj,
        "dono_nome": f"Dono {prefix}",
        "dono_email": f"{prefix.lower()}@split.com",
        "dono_senha": "senha_segura_123"
    })
    
    login = client.post("/auth/login", json={
        "email": f"{prefix.lower()}@split.com",
        "senha": "senha_segura_123"
    })
    return login.json()["access_token"]


def test_venda_split_payment_dinheiro_e_pix_sucesso(client: TestClient) -> None:
    """
    Testa venda com Split Payment (R$ 50 no DINHEIRO + R$ 100 no PIX)
    garantindo baixa no estoque físico e registro de pagamentos.
    """
    token = registrar_e_autenticar(client, "SplitDinheiroPix", "61.452.124/0001-00")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Split Matriz",
        "cnpj": "81.681.861/0001-84",
        "endereco": "Av Central, 100"
    }, headers=headers)
    assert res_loja.status_code == 201
    loja_id = res_loja.json()["id"]

    # 2. Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Camisa Polo",
        "sku": "POLO-001",
        "preco_custo": 20.0,
        "preco_venda": 50.0,
        "markup": 1.5
    }, headers=headers)
    assert res_prod.status_code == 201
    produto_id = res_prod.json()["id"]

    # 3. Adicionar Estoque
    res_mov = client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Entrada inicial"
    }, headers=headers)
    assert res_mov.status_code == 200

    # 4. Registrar venda de 3 camisas (R$ 150.0) com Split Payment (Dinheiro R$ 50 + PIX R$ 100)
    payload = {
        "loja_id": loja_id,
        "desconto": 0.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 3}
        ],
        "pagamentos": [
            {"forma_pagamento": "DINHEIRO", "valor": 50.0},
            {"forma_pagamento": "PIX", "valor": 100.0}
        ]
    }

    res_venda = client.post("/vendas", json=payload, headers=headers)
    assert res_venda.status_code == 201
    data = res_venda.json()

    assert data["status"] == "PAGO"
    assert data["forma_pagamento"] == "MULTIPLO"
    assert data["valor_total"] == 150.0
    assert len(data["pagamentos"]) == 2
    assert {p["forma_pagamento"] for p in data["pagamentos"]} == {"DINHEIRO", "PIX"}

    # 5. Verifica baixa no estoque (restam 7)
    res_saldos = client.get("/estoque/saldos", headers=headers)
    assert res_saldos.status_code == 200
    saldos = [s for s in res_saldos.json() if s["produto_id"] == produto_id and s["loja_id"] == loja_id]
    assert saldos[0]["quantidade"] == 7

    # 6. Verifica lançamentos financeiros gerados (devem haver 2 lançamentos de receita)
    res_fin = client.get("/financeiro/lancamentos", headers=headers)
    assert res_fin.status_code == 200
    lancamentos = [lanc for lanc in res_fin.json() if lanc["loja_id"] == loja_id]
    assert len(lancamentos) == 2
    valores = {lanc["valor"] for lanc in lancamentos}
    assert 50.0 in valores
    assert 100.0 in valores


def test_venda_split_payment_com_crediario_parcial(client: TestClient) -> None:
    """
    Testa venda com Split Payment onde parte é Cartão e parte é Crediário.
    O limite de crédito do cliente deve ser validado apenas sobre a parcela do crediário.
    """
    token = registrar_e_autenticar(client, "SplitCrediario", "34.453.367/0001-82")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Split Crediario",
        "cnpj": "09.218.022/0001-05",
        "endereco": "Rua do Comercio, 200"
    }, headers=headers)
    assert res_loja.status_code == 201
    loja_id = res_loja.json()["id"]

    # 2. Criar Cliente com limite de 60 reais
    res_cli = client.post("/clientes/", json={
        "nome": "Carlos Cliente",
        "email": "carlos@teste.com",
        "documento": "12345678909",
        "limite_credito": 60.0
    }, headers=headers)
    assert res_cli.status_code == 201
    cliente_id = res_cli.json()["id"]

    # 3. Criar Produto de 150 reais
    res_prod = client.post("/produtos/", json={
        "nome": "Jaqueta Couro",
        "sku": "JAQ-001",
        "preco_custo": 80.0,
        "preco_venda": 150.0,
        "markup": 0.875
    }, headers=headers)
    assert res_prod.status_code == 201
    produto_id = res_prod.json()["id"]

    # 4. Adicionar Estoque
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 5,
        "motivo": "Entrada Jaquetas"
    }, headers=headers)

    # 5. Venda total 150: Cartão Débito 100 + Crediário 50.
    # Como o limite do cliente é 60 e o crediário é 50, DEVE passar com sucesso!
    payload = {
        "loja_id": loja_id,
        "cliente_id": cliente_id,
        "desconto": 0.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 1}
        ],
        "pagamentos": [
            {"forma_pagamento": "CARTAO_DEBITO", "valor": 100.0},
            {"forma_pagamento": "CREDIARIO", "valor": 50.0}
        ]
    }

    res_venda = client.post("/vendas", json=payload, headers=headers)
    assert res_venda.status_code == 201
    data = res_venda.json()
    assert data["status"] == "PENDENTE"
    assert data["valor_total"] == 150.0

    # 6. Verifica saldo devedor do cliente: deve ser exatamente 50.0 (e não 150.0)
    res_clis = client.get("/clientes/", headers=headers)
    carlos = [c for c in res_clis.json() if c["id"] == cliente_id][0]
    assert carlos["saldo_devedor_crediario"] == 50.0


def test_venda_split_payment_soma_divergente_falha(client: TestClient) -> None:
    """
    Testa erro 422 quando a soma dos pagamentos não fecha o valor líquido da venda.
    """
    token = registrar_e_autenticar(client, "SplitDivergente", "45.723.174/0001-10")
    headers = {"Authorization": f"Bearer {token}"}

    res_loja = client.post("/lojas/", json={
        "nome": "Loja Div",
        "cnpj": "52.843.729/0001-23",
        "endereco": "Rua Div, 50"
    }, headers=headers)
    assert res_loja.status_code == 201
    loja_id = res_loja.json()["id"]

    res_prod = client.post("/produtos/", json={
        "nome": "Produto Div",
        "sku": "DIV-001",
        "preco_custo": 30.0,
        "preco_venda": 100.0,
        "markup": 2.33
    }, headers=headers)
    assert res_prod.status_code == 201
    produto_id = res_prod.json()["id"]

    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 5,
        "motivo": "Entrada"
    }, headers=headers)

    # Total é 100.0, mas os pagamentos somam 80.0
    payload = {
        "loja_id": loja_id,
        "desconto": 0.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 1}
        ],
        "pagamentos": [
            {"forma_pagamento": "DINHEIRO", "valor": 50.0},
            {"forma_pagamento": "PIX", "valor": 30.0}
        ]
    }

    res_venda = client.post("/vendas", json=payload, headers=headers)
    assert res_venda.status_code == 422
    assert "não coincide com o valor líquido" in res_venda.json()["detail"]


def test_estorno_venda_com_split_payment(client: TestClient) -> None:
    """
    Testa o estorno de venda com Split Payment recompondo o estoque
    e restaurando o saldo do cliente.
    """
    token = registrar_e_autenticar(client, "SplitEstorno", "70.230.856/0001-39")
    headers = {"Authorization": f"Bearer {token}"}

    res_loja = client.post("/lojas/", json={
        "nome": "Loja Estorno",
        "cnpj": "31.257.913/0001-11",
        "endereco": "Rua Estorno, 10"
    }, headers=headers)
    assert res_loja.status_code == 201
    loja_id = res_loja.json()["id"]

    res_cli = client.post("/clientes/", json={
        "nome": "Cliente Estorno",
        "email": "estorno@split.com",
        "documento": "11144477735",
        "limite_credito": 200.0
    }, headers=headers)
    assert res_cli.status_code == 201
    cliente_id = res_cli.json()["id"]

    res_prod = client.post("/produtos/", json={
        "nome": "Produto Estorno",
        "sku": "EST-001",
        "preco_custo": 20.0,
        "preco_venda": 80.0,
        "markup": 3.0
    }, headers=headers)
    assert res_prod.status_code == 201
    produto_id = res_prod.json()["id"]

    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Entrada"
    }, headers=headers)

    # Venda de 80.0: Dinheiro 30 + Crediário 50
    payload = {
        "loja_id": loja_id,
        "cliente_id": cliente_id,
        "desconto": 0.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 1}
        ],
        "pagamentos": [
            {"forma_pagamento": "DINHEIRO", "valor": 30.0},
            {"forma_pagamento": "CREDIARIO", "valor": 50.0}
        ]
    }

    res_venda = client.post("/vendas", json=payload, headers=headers)
    assert res_venda.status_code == 201
    venda_id = res_venda.json()["id"]

    # Saldo devedor deve ser 50
    res_clis = client.get("/clientes/", headers=headers)
    carlos = [c for c in res_clis.json() if c["id"] == cliente_id][0]
    assert carlos["saldo_devedor_crediario"] == 50.0

    # Estoque restante deve ser 9
    res_saldos = client.get("/estoque/saldos", headers=headers)
    saldo = [s for s in res_saldos.json() if s["produto_id"] == produto_id][0]
    assert saldo["quantidade"] == 9

    # Agora estorna
    res_estorno = client.post(f"/vendas/{venda_id}/estornar", headers=headers)
    assert res_estorno.status_code == 200

    # Verifica saldo devedor zerado
    res_clis2 = client.get("/clientes/", headers=headers)
    carlos2 = [c for c in res_clis2.json() if c["id"] == cliente_id][0]
    assert carlos2["saldo_devedor_crediario"] == 0.0

    # Verifica estoque restituído para 10
    res_saldos2 = client.get("/estoque/saldos", headers=headers)
    saldo2 = [s for s in res_saldos2.json() if s["produto_id"] == produto_id][0]
    assert saldo2["quantidade"] == 10
