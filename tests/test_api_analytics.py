import random
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.infrastructure.database.models import UsuarioModel
from src.infrastructure.security.jwt_handler import criar_token_acesso


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


def registrar_e_autenticar(client: TestClient, prefix: str) -> tuple[str, str]:
    """Registra um tenant/dono e retorna o token de acesso e o ID do Tenant."""
    cnpj = gerar_cnpj_valido()
    res_reg = client.post("/auth/register", json={
        "nome_fantasia": f"{prefix} Rede",
        "razao_social": f"{prefix} Razao Social S/A",
        "cnpj": cnpj,
        "dono_nome": f"Dono {prefix}",
        "dono_email": f"{prefix.lower()}@email.com",
        "dono_senha": "senha_segura_123"
    })
    
    if res_reg.status_code != 201:
        raise ValueError(f"Registration failed: {res_reg.text}")

    tenant_id = res_reg.json()["tenant_id"]
    
    login = client.post("/auth/login", json={
        "email": f"{prefix.lower()}@email.com",
        "senha": "senha_segura_123"
    })
    return login.json()["access_token"], tenant_id


def test_dashboard_analytics_sucesso(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "AnalytA")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja A",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Av Paulista, 100"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # 2. Criar Produtos com preços e custos definidos
    res_p1 = client.post("/produtos/", json={
        "nome": "Produto 1",
        "sku": f"SKU-{uuid4().hex[:4]}",
        "preco_custo": 10.0,
        "preco_venda": 25.0,
        "markup": 1.5
    }, headers=headers)
    p1_id = res_p1.json()["id"]

    res_p2 = client.post("/produtos/", json={
        "nome": "Produto 2",
        "sku": f"SKU-{uuid4().hex[:4]}",
        "preco_custo": 100.0,
        "preco_venda": 250.0,
        "markup": 1.5
    }, headers=headers)
    p2_id = res_p2.json()["id"]

    # 3. Adicionar Estoque
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": p1_id,
        "tipo": "ENTRADA",
        "quantidade": 15,
        "motivo": "Compra"
    }, headers=headers)

    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": p2_id,
        "tipo": "ENTRADA",
        "quantidade": 5,  # Menos de 10 -> Estoque Crítico!
        "motivo": "Compra"
    }, headers=headers)

    # 4. Registrar Venda (Faturamento Bruto: 2 * 25.0 + 1 * 250.0 = 300.0)
    # Desconto: 20.0 -> Faturamento Líquido: 280.0
    # CMV: 2 * 10.0 + 1 * 100.0 = 120.0
    client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "desconto": 20.0,
        "itens": [
            {"produto_id": p1_id, "quantidade": 2},
            {"produto_id": p2_id, "quantidade": 1}
        ]
    }, headers=headers)

    # 5. Registrar Despesa Operacional (100.0)
    # Lucro Líquido: 280.0 (Faturamento Líquido) - 120.0 (CMV) - 100.0 (Despesa) = 60.0
    client.post("/financeiro/despesas", json={
        "loja_id": loja_id,
        "valor": 100.00,
        "categoria": "Insumos",
        "status_pagamento": "PAGO"
    }, headers=headers)

    # 6. Consultar Analytics
    res_analytics = client.get("/analytics/dashboard", headers=headers)
    assert res_analytics.status_code == 200
    data = res_analytics.json()

    assert data["faturamento_bruto"] == 300.0
    assert data["desconto_total"] == 20.0
    assert data["faturamento_liquido"] == 280.0
    assert data["cmv"] == 120.0
    assert data["lucro_liquido"] == 60.0
    assert data["margem_lucro"] == 21.43  # (60.0 / 280.0) * 100
    assert data["ticket_medio"] == 280.0
    # Estoque crítico de P1: 15 - 2 = 13 (ok)
    # Estoque crítico de P2: 5 - 1 = 4 (crítico!)
    assert data["estoque_critico_count"] == 1
    assert data["ruptura_count"] == 0


def test_curva_abc_sucesso(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "AnalytB")
    headers = {"Authorization": f"Bearer {token}"}

    res_loja = client.post("/lojas/", json={
        "nome": "Loja B",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Av Paulista, 200"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # 1. Criar 3 Produtos
    p1 = client.post("/produtos/", json={
        "nome": "Super A", "sku": f"SKU-{uuid4().hex[:4]}", "preco_custo": 100, "preco_venda": 800, "markup": 7
    }, headers=headers).json()
    p2 = client.post("/produtos/", json={
        "nome": "Médio B", "sku": f"SKU-{uuid4().hex[:4]}", "preco_custo": 50, "preco_venda": 150, "markup": 2
    }, headers=headers).json()
    p3 = client.post("/produtos/", json={
        "nome": "Fraco C", "sku": f"SKU-{uuid4().hex[:4]}", "preco_custo": 10, "preco_venda": 50, "markup": 4
    }, headers=headers).json()

    # Entrada de estoque
    for p in [p1, p2, p3]:
        client.post("/estoque/movimentar", json={
            "loja_id": loja_id, "produto_id": p["id"], "tipo": "ENTRADA", "quantidade": 50, "motivo": "Compra"
        }, headers=headers)

    # Vender
    # P1: faturamento de 800
    # P2: faturamento de 150
    # P3: faturamento de 50
    # Total faturamento = 1000
    # P1 representa 80% (Classe A)
    # P2 representa 15% (Classe B)
    # P3 representa 5% (Classe C)
    client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "itens": [
            {"produto_id": p1["id"], "quantidade": 1},
            {"produto_id": p2["id"], "quantidade": 1},
            {"produto_id": p3["id"], "quantidade": 1}
        ]
    }, headers=headers)

    res_abc = client.get("/analytics/curva-abc", headers=headers)
    assert res_abc.status_code == 200
    itens = res_abc.json()["itens"]

    assert len(itens) == 3
    # P1 deve ser Classe A
    assert itens[0]["nome"] == "Super A"
    assert itens[0]["classe"] == "A"
    assert itens[0]["percentual"] == 80.0

    # P2 deve ser Classe B
    assert itens[1]["nome"] == "Médio B"
    assert itens[1]["classe"] == "B"
    assert itens[1]["percentual"] == 15.0

    # P3 deve ser Classe C
    assert itens[2]["nome"] == "Fraco C"
    assert itens[2]["classe"] == "C"
    assert itens[2]["percentual"] == 5.0


def test_analytics_bola_gerente(client: TestClient, db_session: Session) -> None:
    token_dono, tenant_id = registrar_e_autenticar(client, "AnalytBola")
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    loja_a_id = client.post("/lojas/", json={
        "nome": "Loja A", "cnpj": gerar_cnpj_valido(), "endereco": "End A"
    }, headers=headers_dono).json()["id"]

    loja_b_id = client.post("/lojas/", json={
        "nome": "Loja B", "cnpj": gerar_cnpj_valido(), "endereco": "End B"
    }, headers=headers_dono).json()["id"]

    # Inserir Gerente da Loja A diretamente
    gerente_a = UsuarioModel(
        nome="Gerente Loja A",
        email="gerente_a@analyticsbola.com",
        senha_hash="hash",
        role="GERENTE",
        tenant_id=UUID(tenant_id),
        loja_atribuida_id=UUID(loja_a_id)
    )
    db_session.add(gerente_a)
    db_session.commit()

    token_gerente = criar_token_acesso(
        sub=str(gerente_a.id),
        tenant_id=str(tenant_id),
        role="GERENTE"
    )
    headers_gerente = {"Authorization": f"Bearer {token_gerente}"}

    # 1. Gerente tenta ver analytics da Loja B -> deve falhar (403)
    res_err1 = client.get(f"/analytics/dashboard?loja_id={loja_b_id}", headers=headers_gerente)
    assert res_err1.status_code == 403

    res_err2 = client.get(f"/analytics/curva-abc?loja_id={loja_b_id}", headers=headers_gerente)
    assert res_err2.status_code == 403


def test_dashboard_analytics_apos_devolucao_e_reembolso(client: TestClient) -> None:
    """
    Valida que ao realizar devolução/reembolso de uma venda (total ou parcial):
    1. O faturamento líquido no dashboard é deduzido corretamente.
    2. O total_devolucoes reflete o montante reembolsado.
    3. O CMV é reduzido proporcionalmente aos itens devolvidos ao estoque.
    4. O lançamento financeiro de reembolso no caixa não é deduzido em duplicidade do lucro líquido.
    5. A rota /vendas retorna as devoluções devidamente populadas na entidade.
    """
    token, _ = registrar_e_autenticar(client, "AnalytReembolso")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Reembolso",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Rua Teste, 100"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # 2. Criar Produtos:
    # P1: Custo 20, Venda 50
    # P2: Custo 40, Venda 100
    res_p1 = client.post("/produtos/", json={
        "nome": "Produto Alfa",
        "sku": f"ALF-{uuid4().hex[:4]}",
        "preco_custo": 20.0,
        "preco_venda": 50.0,
        "markup": 1.5
    }, headers=headers)
    p1_id = res_p1.json()["id"]

    res_p2 = client.post("/produtos/", json={
        "nome": "Produto Beta",
        "sku": f"BET-{uuid4().hex[:4]}",
        "preco_custo": 40.0,
        "preco_venda": 100.0,
        "markup": 1.5
    }, headers=headers)
    p2_id = res_p2.json()["id"]

    # 3. Adicionar Estoque
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": p1_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Estoque Inicial"
    }, headers=headers)

    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": p2_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Estoque Inicial"
    }, headers=headers)

    # 4. Registrar Venda:
    # 2 x P1 (2 x 50 = 100) + 1 x P2 (1 x 100 = 100) = R$ 200.00
    res_venda = client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "DINHEIRO",
        "desconto": 0.0,
        "itens": [
            {"produto_id": p1_id, "quantidade": 2},
            {"produto_id": p2_id, "quantidade": 1}
        ]
    }, headers=headers)
    assert res_venda.status_code == 201
    venda = res_venda.json()
    item_p1 = next(it for it in venda["itens"] if it["produto_id"] == p1_id)
    item_p2 = next(it for it in venda["itens"] if it["produto_id"] == p2_id)

    # 5. Dashboard antes da devolução
    # Bruto: 200, Líquido: 200, CMV: 2*20 + 1*40 = 80, Lucro: 120
    dash_antes = client.get("/analytics/dashboard", headers=headers).json()
    assert dash_antes["faturamento_bruto"] == 200.0
    assert dash_antes["faturamento_liquido"] == 200.0
    assert dash_antes["total_devolucoes"] == 0.0
    assert dash_antes["cmv"] == 80.0
    assert dash_antes["lucro_liquido"] == 120.0
    assert dash_antes["ticket_medio"] == 200.0

    # 6. Devolver 1 unidade de P1 com REEMBOLSO_CAIXA (R$ 50)
    res_dev = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "REEMBOLSO_CAIXA",
        "motivo": "Cliente desistiu de 1 unidade",
        "itens": [
            {
                "item_venda_id": item_p1["id"],
                "quantidade": 1,
                "retornar_ao_estoque": True,
                "condicao": "PERFEITO"
            }
        ]
    }, headers=headers)
    assert res_dev.status_code == 201

    # 7. Dashboard após devolução parcial com reembolso
    # Bruto: 200, Devoluções: 50, Líquido: 150
    # CMV: 80 - 20 (item devolvido) = 60
    # Lucro: 150 - 60 = 90
    # Ticket Médio: 150 / 1 venda ativa = 150
    dash_pos_parcial = client.get("/analytics/dashboard", headers=headers).json()
    assert dash_pos_parcial["faturamento_bruto"] == 200.0
    assert dash_pos_parcial["total_devolucoes"] == 50.0
    assert dash_pos_parcial["faturamento_liquido"] == 150.0
    assert dash_pos_parcial["cmv"] == 60.0
    assert dash_pos_parcial["lucro_liquido"] == 90.0
    assert dash_pos_parcial["ticket_medio"] == 150.0

    # 8. Verificar que a listagem de vendas agora carrega as devoluções
    res_vendas = client.get(f"/vendas/?loja_id={loja_id}", headers=headers)
    assert res_vendas.status_code == 200
    vendas_list = res_vendas.json()
    v_found = next(v for v in vendas_list if v["id"] == venda["id"])
    assert v_found["status"] == "PARCIALMENTE_DEVOLVIDA"
    assert len(v_found["devolucoes"]) == 1
    assert v_found["devolucoes"][0]["valor_total"] == 50.0

    # 9. Devolver o restante da venda (1 P1 restante + 1 P2) com CREDITO_LOJA
    res_dev_total = client.post(f"/vendas/{venda['id']}/devolver", json={
        "tipo": "DEVOLUCAO",
        "tipo_resolucao": "REEMBOLSO_CAIXA",
        "motivo": "Devolução do restante da compra",
        "itens": [
            {
                "item_venda_id": item_p1["id"],
                "quantidade": 1,
                "retornar_ao_estoque": True,
                "condicao": "PERFEITO"
            },
            {
                "item_venda_id": item_p2["id"],
                "quantidade": 1,
                "retornar_ao_estoque": True,
                "condicao": "PERFEITO"
            }
        ]
    }, headers=headers)
    assert res_dev_total.status_code == 201

    # 10. Dashboard após devolução total
    # Bruto: 200, Devoluções: 200, Líquido: 0.0, CMV: 0.0, Lucro: 0.0, Ticket Médio: 0.0
    dash_pos_total = client.get("/analytics/dashboard", headers=headers).json()
    assert dash_pos_total["faturamento_bruto"] == 200.0
    assert dash_pos_total["total_devolucoes"] == 200.0
    assert dash_pos_total["faturamento_liquido"] == 0.0
    assert dash_pos_total["cmv"] == 0.0
    assert dash_pos_total["lucro_liquido"] == 0.0
    assert dash_pos_total["ticket_medio"] == 0.0

    # Curva ABC após devolução total: sem faturamento retido
    curva_pos = client.get("/analytics/curva-abc", headers=headers).json()
    assert all(item["faturamento"] == 0.0 for item in curva_pos["itens"]) or len(curva_pos["itens"]) == 0
