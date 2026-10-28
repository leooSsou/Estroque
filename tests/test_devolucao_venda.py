import random

from fastapi.testclient import TestClient


def gerar_cnpj() -> str:
    n = [random.randint(0, 9) for _ in range(8)] + [0, 0, 0, 1]
    def calc_digito(fator_inicial, digitos):
        soma = 0
        fator = fator_inicial
        for d in digitos:
            soma += d * fator
            fator -= 1
            if fator < 2:
                fator = 9
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto
    d1 = calc_digito(5, n)
    d2 = calc_digito(6, n + [d1])
    return "".join(map(str, n + [d1, d2]))


def setup_cenario_venda(client: TestClient):
    """
    Helper para preparar Tenant, Loja, Gerente, Cliente, Produtos e Estoque.
    Retorna IDs e tokens para os testes.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_{prefix}@varejo.com"
    senha = "senha_segura_123"

    client.post("/auth/register", json={
        "nome_fantasia": f"Varejo Dev {prefix}",
        "razao_social": f"Varejo Dev S/A {prefix}",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Carlos Dono",
        "dono_email": email_dono,
        "dono_senha": senha
    })
    res_login = client.post("/auth/login", json={"email": email_dono, "senha": senha})
    headers_dono = {"Authorization": f"Bearer {res_login.json()['access_token']}"}

    # Loja Matriz
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Centro",
        "cnpj": gerar_cnpj(),
        "endereco": "Rua Central, 100"
    }, headers=headers_dono)
    loja_id = res_loja.json()["id"]

    # Gerente da Loja
    email_g = f"gerente_{prefix}@varejo.com"
    client.post("/auth/usuarios", json={
        "nome": "Marcos Gerente",
        "email": email_g,
        "senha": senha,
        "role": "GERENTE",
        "loja_atribuida_id": loja_id
    }, headers=headers_dono)
    res_login_g = client.post("/auth/login", json={"email": email_g, "senha": senha})
    headers_gerente = {"Authorization": f"Bearer {res_login_g.json()['access_token']}"}

    # Cliente
    res_cli = client.post("/clientes/", json={
        "nome": "Beatriz Silva",
        "email": f"beatriz_{prefix}@cliente.com",
        "documento": "11144477735",
        "limite_credito": 500.0
    }, headers=headers_dono)
    cliente_id = res_cli.json()["id"]

    # Produto 1 (Camiseta R$ 50)
    res_p1 = client.post("/produtos/", json={
        "nome": "Camiseta Algodao",
        "sku": f"CAM-{prefix}",
        "preco_custo": 25.0,
        "preco_venda": 50.0,
        "markup": 1.0
    }, headers=headers_dono)
    prod1_id = res_p1.json()["id"]

    # Produto 2 (Calça Jeans R$ 120)
    res_p2 = client.post("/produtos/", json={
        "nome": "Calca Jeans",
        "sku": f"CAL-{prefix}",
        "preco_custo": 60.0,
        "preco_venda": 120.0,
        "markup": 1.0
    }, headers=headers_dono)
    prod2_id = res_p2.json()["id"]

    # Entrada de estoque inicial (10 de cada)
    client.post("/estoque/movimentar", json={
        "produto_id": prod1_id,
        "loja_id": loja_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Estoque Inicial"
    }, headers=headers_dono)

    client.post("/estoque/movimentar", json={
        "produto_id": prod2_id,
        "loja_id": loja_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Estoque Inicial"
    }, headers=headers_dono)

    return {
        "headers_dono": headers_dono,
        "headers_gerente": headers_gerente,
        "loja_id": loja_id,
        "cliente_id": cliente_id,
        "prod1_id": prod1_id,
        "prod2_id": prod2_id,
        "prefix": prefix,
    }


def test_devolucao_parcial_com_credito_loja_e_recomposicao_estoque(client: TestClient):
    """
    Testa devolução parcial gerando Vale-Crédito (Crédito em Loja) e retornando item ao estoque.
    Em seguida, utiliza esse crédito em uma nova venda no PDV.
    """
    ctx = setup_cenario_venda(client)

    # 1. Realiza Venda: 3 Camisetas (3 x R$ 50 = R$ 150) + 1 Calça (R$ 120) = R$ 270
    res_venda = client.post("/vendas", json={
        "loja_id": ctx["loja_id"],
        "cliente_id": ctx["cliente_id"],
        "forma_pagamento": "PIX",
        "desconto": 0.0,
        "itens": [
            {"produto_id": ctx["prod1_id"], "quantidade": 3},
            {"produto_id": ctx["prod2_id"], "quantidade": 1}
        ]
    }, headers=ctx["headers_gerente"])
    assert res_venda.status_code == 201
    venda = res_venda.json()
    item_camiseta = next(i for i in venda["itens"] if i["produto_id"] == ctx["prod1_id"])

    # Saldo estoque de camisetas caiu de 10 para 7
    saldos = client.get("/estoque/saldos", headers=ctx["headers_gerente"]).json()
    s_cam = next(s for s in saldos if s["produto_id"] == ctx["prod1_id"])
    assert s_cam["quantidade"] == 7

    # 2. Devolve 1 Camiseta gerando CREDITO_LOJA (R$ 50 de crédito)
    res_dev = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "CREDITO_LOJA",
        "motivo": "Tamanho M ficou pequeno, cliente quer trocar depois",
        "itens": [
            {
                "item_venda_id": item_camiseta["id"],
                "quantidade": 1,
                "retornar_ao_estoque": True,
                "condicao": "PERFEITO"
            }
        ]
    }, headers=ctx["headers_gerente"])
    assert res_dev.status_code == 201
    dev_data = res_dev.json()
    assert dev_data["valor_total"] == 50.0
    assert dev_data["tipo_resolucao"] == "CREDITO_LOJA"
    assert len(dev_data["itens"]) == 1

    # 3. Verifica que a Venda original agora está "PARCIALMENTE_DEVOLVIDA"
    res_venda_check = client.get(f"/vendas/{venda['id']}", headers=ctx["headers_gerente"])
    assert res_venda_check.json()["status"] == "PARCIALMENTE_DEVOLVIDA"

    # 4. Verifica que o saldo de camisetas no estoque voltou de 7 para 8
    saldos_pos = client.get("/estoque/saldos", headers=ctx["headers_gerente"]).json()
    s_cam_pos = next(s for s in saldos_pos if s["produto_id"] == ctx["prod1_id"])
    assert s_cam_pos["quantidade"] == 8

    # 5. Verifica que o cliente agora possui R$ 50 de credito_loja
    res_cli = client.get(f"/clientes/{ctx['cliente_id']}", headers=ctx["headers_dono"])
    assert res_cli.json()["credito_loja"] == 50.0

    # 6. Cliente volta à loja e compra outra calça (R$ 120), pagando R$ 50 em CREDITO_LOJA + R$ 70 em DINHEIRO
    res_venda_com_credito = client.post("/vendas", json={
        "loja_id": ctx["loja_id"],
        "cliente_id": ctx["cliente_id"],
        "desconto": 0.0,
        "itens": [
            {"produto_id": ctx["prod2_id"], "quantidade": 1}
        ],
        "pagamentos": [
            {"forma_pagamento": "CREDITO_LOJA", "valor": 50.0},
            {"forma_pagamento": "DINHEIRO", "valor": 70.0}
        ]
    }, headers=ctx["headers_gerente"])
    assert res_venda_com_credito.status_code == 201
    assert res_venda_com_credito.json()["status"] == "PAGO"

    # 7. Saldo de crédito da loja do cliente voltou a 0.0
    res_cli_pos_venda = client.get(f"/clientes/{ctx['cliente_id']}", headers=ctx["headers_dono"])
    assert res_cli_pos_venda.json()["credito_loja"] == 0.0


def test_devolucao_com_reembolso_financeiro_caixa(client: TestClient):
    """
    Testa devolução com saída de caixa (REEMBOLSO_CAIXA). Deve lançar DESPESA no financeiro.
    """
    ctx = setup_cenario_venda(client)

    # Venda em DINHEIRO
    res_venda = client.post("/vendas", json={
        "loja_id": ctx["loja_id"],
        "forma_pagamento": "DINHEIRO",
        "desconto": 0.0,
        "itens": [{"produto_id": ctx["prod1_id"], "quantidade": 2}]
    }, headers=ctx["headers_gerente"])
    venda = res_venda.json()
    item_cam = venda["itens"][0]

    # Devolve 1 camiseta com REEMBOLSO_CAIXA (R$ 50)
    res_dev = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "REEMBOLSO_CAIXA",
        "motivo": "Arrependimento de compra",
        "itens": [
            {
                "item_venda_id": item_cam["id"],
                "quantidade": 1,
                "retornar_ao_estoque": True,
                "condicao": "PERFEITO"
            }
        ]
    }, headers=ctx["headers_gerente"])
    assert res_dev.status_code == 201

    # Verifica lançamento de despesa no financeiro da loja
    res_fin = client.get(f"/financeiro/lancamentos?loja_id={ctx['loja_id']}", headers=ctx["headers_gerente"])
    assert res_fin.status_code == 200
    lancamentos = res_fin.json()
    reembolso = next((lanc for lanc in lancamentos if lanc["tipo"] == "DESPESA" and "Reembolso" in lanc["categoria"]), None)
    assert reembolso is not None
    assert reembolso["valor"] == 50.0
    assert reembolso["status_pagamento"] == "PAGO"


def test_devolucao_com_abatimento_no_crediario(client: TestClient):
    """
    Testa devolução de venda realizada no crediário com abatimento da dívida pendente.
    """
    ctx = setup_cenario_venda(client)

    # Venda no CREDIARIO: 2 Calças (2 x R$ 120 = R$ 240)
    res_venda = client.post("/vendas", json={
        "loja_id": ctx["loja_id"],
        "cliente_id": ctx["cliente_id"],
        "forma_pagamento": "CREDIARIO",
        "desconto": 0.0,
        "itens": [{"produto_id": ctx["prod2_id"], "quantidade": 2}]
    }, headers=ctx["headers_gerente"])
    venda = res_venda.json()
    item_calca = venda["itens"][0]

    # Saldo devedor do cliente = R$ 240
    res_cli = client.get(f"/clientes/{ctx['cliente_id']}", headers=ctx["headers_dono"])
    assert res_cli.json()["saldo_devedor_crediario"] == 240.0

    # Devolve 1 calça com ABATIMENTO_CREDIARIO (abate R$ 120)
    res_dev = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "ABATIMENTO_CREDIARIO",
        "motivo": "Presente duplicado",
        "itens": [
            {
                "item_venda_id": item_calca["id"],
                "quantidade": 1,
                "retornar_ao_estoque": True,
                "condicao": "PERFEITO"
            }
        ]
    }, headers=ctx["headers_gerente"])
    assert res_dev.status_code == 201

    # Saldo devedor do cliente agora deve ser R$ 120 (240 - 120)
    res_cli_pos = client.get(f"/clientes/{ctx['cliente_id']}", headers=ctx["headers_dono"])
    assert res_cli_pos.json()["saldo_devedor_crediario"] == 120.0


def test_bloqueio_devolucao_em_excesso_e_venda_cancelada(client: TestClient):
    """
    Valida que não é possível devolver mais itens do que foram comprados
    nem realizar devoluções em vendas estornadas/canceladas.
    """
    ctx = setup_cenario_venda(client)

    # Venda de 1 Camiseta (R$ 50)
    res_venda = client.post("/vendas", json={
        "loja_id": ctx["loja_id"],
        "forma_pagamento": "PIX",
        "desconto": 0.0,
        "itens": [{"produto_id": ctx["prod1_id"], "quantidade": 1}]
    }, headers=ctx["headers_gerente"])
    venda = res_venda.json()
    item_id = venda["itens"][0]["id"]

    # Tentativa de devolver 2 (comprou apenas 1) -> BLOQUEADO 400
    res_excess = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "REEMBOLSO_CAIXA",
        "motivo": "Erro",
        "itens": [{"item_venda_id": item_id, "quantidade": 2, "retornar_ao_estoque": True}]
    }, headers=ctx["headers_gerente"])
    assert res_excess.status_code == 400
    assert "excede o saldo restante" in res_excess.json()["detail"]

    # Devolve a 1 camiseta comprada com sucesso -> Venda fica DEVOLVIDA
    res_dev1 = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "REEMBOLSO_CAIXA",
        "motivo": "Devolução total",
        "itens": [{"item_venda_id": item_id, "quantidade": 1, "retornar_ao_estoque": True}]
    }, headers=ctx["headers_gerente"])
    assert res_dev1.status_code == 201

    res_venda_status = client.get(f"/vendas/{venda['id']}", headers=ctx["headers_gerente"])
    assert res_venda_status.json()["status"] == "DEVOLVIDA"

    # Tentativa de devolver novamente o item já devolvido -> BLOQUEADO 400 (saldo disponível = 0)
    res_dev_again = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "REEMBOLSO_CAIXA",
        "motivo": "Tentativa duplicada",
        "itens": [{"item_venda_id": item_id, "quantidade": 1, "retornar_ao_estoque": True}]
    }, headers=ctx["headers_gerente"])
    assert res_dev_again.status_code == 400


def test_item_avariado_nao_recompoe_estoque_vendavel(client: TestClient):
    """
    Testa devolução com item avariado (retornar_ao_estoque=False, condicao="AVARIADO").
    O estoque vendável NÃO deve ser incrementado.
    """
    ctx = setup_cenario_venda(client)

    # Venda de 2 calças
    res_venda = client.post("/vendas", json={
        "loja_id": ctx["loja_id"],
        "forma_pagamento": "DINHEIRO",
        "desconto": 0.0,
        "itens": [{"produto_id": ctx["prod2_id"], "quantidade": 2}]
    }, headers=ctx["headers_gerente"])
    venda = res_venda.json()
    item_id = venda["itens"][0]["id"]

    # Saldo estoque de calças: 10 - 2 = 8
    saldos = client.get("/estoque/saldos", headers=ctx["headers_gerente"]).json()
    s_cal = next(s for s in saldos if s["produto_id"] == ctx["prod2_id"])
    assert s_cal["quantidade"] == 8

    # Devolve 1 calça com defeito/rasgada -> retornar_ao_estoque = False
    res_dev = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "REEMBOLSO_CAIXA",
        "motivo": "Calça com rasgo de fábrica",
        "itens": [
            {
                "item_venda_id": item_id,
                "quantidade": 1,
                "retornar_ao_estoque": False,
                "condicao": "AVARIADO"
            }
        ]
    }, headers=ctx["headers_gerente"])
    assert res_dev.status_code == 201

    # Saldo de calças continua sendo 8 (não foi reabastecido)
    saldos_pos = client.get("/estoque/saldos", headers=ctx["headers_gerente"]).json()
    s_cal_pos = next(s for s in saldos_pos if s["produto_id"] == ctx["prod2_id"])
    assert s_cal_pos["quantidade"] == 8
