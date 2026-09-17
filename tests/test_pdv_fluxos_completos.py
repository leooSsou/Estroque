from fastapi.testclient import TestClient

CNPJ_TENANT = "61.452.124/0001-00"
CNPJ_LOJA = "81.681.861/0001-84"

def registrar_e_autenticar(client: TestClient, prefix: str, cnpj: str) -> str:
    res_reg = client.post("/auth/register", json={
        "nome_fantasia": f"{prefix} Rede",
        "razao_social": f"{prefix} Razao Social S/A",
        "cnpj": cnpj,
        "dono_nome": f"Dono {prefix}",
        "dono_email": f"{prefix.lower()}@email.com",
        "dono_senha": "senha_segura_123"
    })
    assert res_reg.status_code == 201, f"Falha no registro: {res_reg.text}"

    login = client.post("/auth/login", json={
        "email": f"{prefix.lower()}@email.com",
        "senha": "senha_segura_123"
    })
    assert login.status_code == 200, f"Falha no login: {login.text}"
    return login.json()["access_token"]


def test_fluxo_venda_e_estorno_com_devolucao_estoque(client: TestClient) -> None:
    token = registrar_e_autenticar(client, "PDVEstorno", CNPJ_TENANT)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Centro PDV",
        "cnpj": CNPJ_LOJA,
        "endereco": "Rua das Flores, 123"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # 2. Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Mouse Gamer Pro",
        "sku": "MOU-PRO-01",
        "preco_custo": 80.0,
        "preco_venda": 150.0,
        "markup": 87.5
    }, headers=headers)
    prod_id = res_prod.json()["id"]

    # 3. Adicionar Estoque (10 un)
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": prod_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Estoque Inicial"
    }, headers=headers)

    # 4. Realizar Venda de 4 unidades
    res_venda = client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "desconto": 20.0,
        "itens": [{"produto_id": prod_id, "quantidade": 4}]
    }, headers=headers)
    assert res_venda.status_code == 201
    venda = res_venda.json()
    assert venda["status"] == "PAGO"
    assert venda["valor_total"] == 580.0  # (4 * 150) - 20 = 580
    venda_id = venda["id"]

    # 5. Verifica estoque debitado (10 - 4 = 6)
    res_saldos = client.get(f"/estoque/saldos?loja_id={loja_id}", headers=headers)
    saldo_atual = next(s["quantidade"] for s in res_saldos.json() if s["produto_id"] == prod_id)
    assert saldo_atual == 6

    # 6. Realizar Estorno da Venda
    res_estorno = client.post(f"/vendas/{venda_id}/estornar?motivo=Cliente+desistiu", headers=headers)
    assert res_estorno.status_code == 200
    venda_cancelada = res_estorno.json()
    assert venda_cancelada["status"] == "CANCELADA"

    # 7. Verifica que o estoque foi restituído (6 + 4 = 10)
    res_saldos_pos = client.get(f"/estoque/saldos?loja_id={loja_id}", headers=headers)
    saldo_restituido = next(s["quantidade"] for s in res_saldos_pos.json() if s["produto_id"] == prod_id)
    assert saldo_restituido == 10

    # 8. Tentar estornar novamente deve falhar (400)
    res_duplicado = client.post(f"/vendas/{venda_id}/estornar", headers=headers)
    assert res_duplicado.status_code == 400


def test_fluxo_crediario_e_estorno_recompoem_limite(client: TestClient) -> None:
    token = registrar_e_autenticar(client, "CrediarioEstorno", "34.453.367/0001-82")
    headers = {"Authorization": f"Bearer {token}"}

    # Loja e Produto
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Filial Sul",
        "cnpj": "09.218.022/0001-05",
        "endereco": "Av Central, 500"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    res_prod = client.post("/produtos/", json={
        "nome": "Cadeira Ergonomica",
        "sku": "CAD-ERGO-01",
        "preco_custo": 400.0,
        "preco_venda": 700.0,
        "markup": 75.0
    }, headers=headers)
    prod_id = res_prod.json()["id"]

    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": prod_id,
        "tipo": "ENTRADA",
        "quantidade": 5,
        "motivo": "Estoque Inicial"
    }, headers=headers)

    # Cliente com Limite de R$ 1.500
    res_cli = client.post("/clientes/", json={
        "nome": "Marcos Silveira",
        "email": "marcos@teste.com",
        "documento": "52998224725",
        "limite_credito": 1500.0
    }, headers=headers)
    cli_id = res_cli.json()["id"]

    # Venda no Crediário: R$ 700
    res_venda = client.post("/vendas", json={
        "loja_id": loja_id,
        "cliente_id": cli_id,
        "forma_pagamento": "CREDIARIO",
        "desconto": 0.0,
        "itens": [{"produto_id": prod_id, "quantidade": 1}]
    }, headers=headers)
    assert res_venda.status_code == 201
    venda_id = res_venda.json()["id"]

    # Saldo devedor deve ser 700
    res_cli_after = client.get("/clientes/", headers=headers)
    cli_data = next(c for c in res_cli_after.json() if c["id"] == cli_id)
    assert cli_data["saldo_devedor_crediario"] == 700.0

    # Estorno da Venda
    res_estorno = client.post(f"/vendas/{venda_id}/estornar", headers=headers)
    assert res_estorno.status_code == 200

    # Saldo devedor deve voltar a 0
    res_cli_revert = client.get("/clientes/", headers=headers)
    cli_revert = next(c for c in res_cli_revert.json() if c["id"] == cli_id)
    assert cli_revert["saldo_devedor_crediario"] == 0.0
