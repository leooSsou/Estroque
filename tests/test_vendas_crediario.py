from fastapi.testclient import TestClient

# CNPJs matematicamente válidos
CNPJ_A = "26.762.981/0001-06"
CNPJ_B = "96.453.427/0001-14"
CNPJ_LOJA_A = "02.188.445/0001-72"
CNPJ_LOJA_B = "44.997.002/0001-72"

def registrar_e_autenticar(client: TestClient, prefix: str, cnpj: str) -> str:
    client.post("/auth/register", json={
        "nome_fantasia": f"{prefix} Rede",
        "razao_social": f"{prefix} Razao Social S/A",
        "cnpj": cnpj,
        "dono_nome": f"Dono {prefix}",
        "dono_email": f"{prefix.lower()}@email.com",
        "dono_senha": "senha_segura_123"
    })
    
    login = client.post("/auth/login", json={
        "email": f"{prefix.lower()}@email.com",
        "senha": "senha_segura_123"
    })
    return login.json()["access_token"]


def test_fluxo_venda_sucesso(client: TestClient) -> None:
    token_a = registrar_e_autenticar(client, "VendaTenantA", CNPJ_A)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Centro",
        "cnpj": CNPJ_LOJA_A,
        "endereco": "Rua Central, 100"
    }, headers=headers_a)
    loja_id = res_loja.json()["id"]

    # 2. Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Teclado Mecanico",
        "sku": "TEC-001",
        "preco_custo": 200.0,
        "preco_venda": 350.0,
        "markup": 0.75
    }, headers=headers_a)
    produto_id = res_prod.json()["id"]

    # 3. Adicionar Estoque
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Compra inicial"
    }, headers=headers_a)

    # 4. Criar Cliente
    res_cli = client.post("/clientes/", json={
        "nome": "João da Silva",
        "email": "joao@silva.com",
        "documento": "12345678909",
        "limite_credito": 1000.0
    }, headers=headers_a)
    cliente_id = res_cli.json()["id"]

    # 5. Registrar Venda (PIX)
    res_venda = client.post("/vendas", json={
        "loja_id": loja_id,
        "cliente_id": cliente_id,
        "forma_pagamento": "PIX",
        "desconto": 50.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 2}
        ]
    }, headers=headers_a)

    assert res_venda.status_code == 201
    venda = res_venda.json()
    assert venda["status"] == "PAGO"
    assert venda["valor_total"] == 650.0  # (350 * 2) - 50.0

    # 6. Verifica saldo de estoque reduzido para 8
    res_saldos = client.get("/estoque/saldos", headers=headers_a)
    assert res_saldos.status_code == 200
    saldos = res_saldos.json()
    assert saldos[0]["quantidade"] == 8


def test_venda_estoque_insuficiente(client: TestClient) -> None:
    token_a = registrar_e_autenticar(client, "VendaTenantB", CNPJ_B)
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Norte",
        "cnpj": CNPJ_LOJA_B,
        "endereco": "Rua Norte, 200"
    }, headers=headers_a)
    loja_id = res_loja.json()["id"]

    # 2. Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Mouse Gamer",
        "sku": "MOU-001",
        "preco_custo": 80.0,
        "preco_venda": 150.0,
        "markup": 0.87
    }, headers=headers_a)
    produto_id = res_prod.json()["id"]

    # 3. Adicionar Estoque (apenas 3)
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 3,
        "motivo": "Compra mouse"
    }, headers=headers_a)

    # 4. Tenta registrar venda de 5 mouses -> Deve falhar
    res_venda = client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "DINHEIRO",
        "desconto": 0.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 5}
        ]
    }, headers=headers_a)

    assert res_venda.status_code == 400
    assert "insuficiente" in res_venda.json()["detail"].lower()


def test_venda_crediario_limite_excedido(client: TestClient) -> None:
    token = registrar_e_autenticar(client, "CrediarioTenant", "69.199.034/0001-53")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Crediario",
        "cnpj": "70.237.989/0001-37",
        "endereco": "Rua Crediario, 500"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # 2. Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Monitor 4K",
        "sku": "MON-001",
        "preco_custo": 1000.0,
        "preco_venda": 1800.0,
        "markup": 0.8
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    # 3. Adicionar Estoque
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 5,
        "motivo": "Estoque monitor"
    }, headers=headers)

    # 4. Criar Cliente com limite de 1000 reais
    res_cli = client.post("/clientes/", json={
        "nome": "Maria de Souza",
        "email": "maria@souza.com",
        "documento": "98765432100",
        "limite_credito": 1000.0
    }, headers=headers)
    cliente_id = res_cli.json()["id"]

    # 5. Tenta comprar monitor de 1800 no Crediário -> Deve falhar por limite excedido
    res_venda = client.post("/vendas", json={
        "loja_id": loja_id,
        "cliente_id": cliente_id,
        "forma_pagamento": "CREDIARIO",
        "desconto": 0.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 1}
        ]
    }, headers=headers)

    assert res_venda.status_code == 403
    assert "limite de crédito excedido" in res_venda.json()["detail"].lower()


def test_venda_crediario_sucesso_e_incremento_saldo(client: TestClient) -> None:
    token = registrar_e_autenticar(client, "CrediarioOkTenant", "45.997.418/0001-53")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Crediario Ok",
        "cnpj": "25.923.825/0001-09",
        "endereco": "Rua Crediario, 501"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # 2. Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Cadeira Gamer",
        "sku": "CAD-001",
        "preco_custo": 500.0,
        "preco_venda": 800.0,
        "markup": 0.6
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    # 3. Adicionar Estoque
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 5,
        "motivo": "Estoque cadeiras"
    }, headers=headers)

    # 4. Criar Cliente com limite de 2000 reais
    res_cli = client.post("/clientes/", json={
        "nome": "Pedro Santos",
        "email": "pedro@santos.com",
        "documento": "12345678909",
        "limite_credito": 2000.0
    }, headers=headers)
    cliente_id = res_cli.json()["id"]

    # 5. Compra cadeira de 800 no Crediário -> Deve passar
    res_venda = client.post("/vendas", json={
        "loja_id": loja_id,
        "cliente_id": cliente_id,
        "forma_pagamento": "CREDIARIO",
        "desconto": 0.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 1}
        ]
    }, headers=headers)

    assert res_venda.status_code == 201
    venda = res_venda.json()
    assert venda["status"] == "PENDENTE"
    assert venda["valor_total"] == 800.0

    # 6. Verifica saldo devedor do cliente atualizado para 800
    res_cli_obter = client.get(f"/clientes/{cliente_id}", headers=headers)
    assert res_cli_obter.status_code == 200
    cliente = res_cli_obter.json()
    assert cliente["saldo_devedor_crediario"] == 800.0

    # 7. Nova tentativa de compra no valor de 1600 -> Deve bloquear (800 + 1600 = 2400 > 2000)
    res_venda_2 = client.post("/vendas", json={
        "loja_id": loja_id,
        "cliente_id": cliente_id,
        "forma_pagamento": "CREDIARIO",
        "desconto": 0.0,
        "itens": [
            {"produto_id": produto_id, "quantidade": 2}
        ]
    }, headers=headers)
    assert res_venda_2.status_code == 403
