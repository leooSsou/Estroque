from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.infrastructure.database.models import UsuarioModel
from src.infrastructure.security.jwt_handler import criar_token_acesso
from tests.test_api_analytics import gerar_cnpj_valido, registrar_e_autenticar

def test_vendas_e_financeiro_auth_bypass(client: TestClient) -> None:
    """Verifica que as novas rotas de Vendas, Financeiro e Analytics requerem autenticação."""
    endpoints = [
        ("POST", "/vendas", {"loja_id": str(uuid4()), "itens": []}),
        ("POST", "/financeiro/despesas", {"loja_id": str(uuid4()), "valor": 50.0, "categoria": "Teste", "status_pagamento": "PAGO"}),
        ("GET", "/financeiro/lancamentos", None),
        ("GET", "/analytics/dashboard", None),
        ("GET", "/analytics/curva-abc", None),
    ]

    for method, path, json_data in endpoints:
        if method == "POST":
            res = client.post(path, json=json_data)
        else:
            res = client.get(path)
        assert res.status_code == 401, f"Bypass de autenticação em {method} {path}"
        assert "Not authenticated" in res.json().get("detail", "")


def test_cross_tenant_bola_vendas(client: TestClient, db_session: Session) -> None:
    """Garante que um Tenant A não consegue injetar dados ou acessar entidades do Tenant B."""
    # Criar e autenticar Tenant A (Atacante)
    token_a, tenant_a_id = registrar_e_autenticar(client, "TenantAtacante")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Criar Tenant B (Vítima)
    token_b, tenant_b_id = registrar_e_autenticar(client, "TenantVitima")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Dono B cria uma loja e um produto legítimo no seu tenant
    res_loja_b = client.post("/lojas/", json={
        "nome": "Loja B", "cnpj": gerar_cnpj_valido(), "endereco": "Rua B"
    }, headers=headers_b)
    loja_b_id = res_loja_b.json()["id"]

    res_prod_b = client.post("/produtos/", json={
        "nome": "Produto B", "sku": f"SKU-{uuid4().hex[:4]}", "preco_custo": 10.0, "preco_venda": 20.0, "markup": 1.0
    }, headers=headers_b)
    p_b_id = res_prod_b.json()["id"]

    # 1. Atacante tenta realizar uma venda usando a Loja do Tenant B -> Deve falhar!
    res_venda_err = client.post("/vendas", json={
        "loja_id": loja_b_id,
        "forma_pagamento": "PIX",
        "itens": [{"produto_id": p_b_id, "quantidade": 1}]
    }, headers=headers_a)
    # Deve retornar 404 (Loja não existe no escopo do Tenant A) ou 403
    assert res_venda_err.status_code in [403, 404]

    # 2. Atacante tenta cadastrar despesa na loja do Tenant B
    res_desp_err = client.post("/financeiro/despesas", json={
        "loja_id": loja_b_id,
        "valor": 100.0,
        "categoria": "Despesa Secreta",
        "status_pagamento": "PAGO"
    }, headers=headers_a)
    assert res_desp_err.status_code in [403, 404]


def test_gerente_bola_vendas_e_financeiro(client: TestClient, db_session: Session) -> None:
    """Verifica BOLA de filial: Gerente da Loja A tenta alterar dados na Loja B."""
    token_dono, tenant_id = registrar_e_autenticar(client, "TenantBola")
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    loja_a_id = client.post("/lojas/", json={
        "nome": "Loja A", "cnpj": gerar_cnpj_valido(), "endereco": "End A"
    }, headers=headers_dono).json()["id"]

    loja_b_id = client.post("/lojas/", json={
        "nome": "Loja B", "cnpj": gerar_cnpj_valido(), "endereco": "End B"
    }, headers=headers_dono).json()["id"]

    # Cria gerente associado à Loja A
    gerente_a = UsuarioModel(
        nome="Gerente Loja A",
        email="gerente_loja_a@tenantbola.com",
        senha_hash="hash",
        role="GERENTE",
        tenant_id=UUID(tenant_id),
        loja_atribuida_id=UUID(loja_a_id)
    )
    db_session.add(gerente_a)
    db_session.commit()

    token_gerente = criar_token_acesso(sub=str(gerente_a.id), tenant_id=str(tenant_id), role="GERENTE")
    headers_gerente = {"Authorization": f"Bearer {token_gerente}"}

    # Criar um produto no tenant
    res_prod = client.post("/produtos/", json={
        "nome": "Produto Teste",
        "sku": f"SKU-{uuid4().hex[:4]}",
        "preco_custo": 10.0,
        "preco_venda": 20.0,
        "markup": 1.0
    }, headers=headers_dono)
    prod_id = res_prod.json()["id"]

    # 1. Gerente A tenta registrar venda na Loja B -> 403 Forbidden
    res_venda_err = client.post("/vendas", json={
        "loja_id": loja_b_id,
        "forma_pagamento": "PIX",
        "itens": [{"produto_id": prod_id, "quantidade": 1}]
    }, headers=headers_gerente)
    assert res_venda_err.status_code == 403

    # 2. Gerente A tenta registrar despesa na Loja B -> 403 Forbidden
    res_desp_err = client.post("/financeiro/despesas", json={
        "loja_id": loja_b_id,
        "valor": 10.0,
        "categoria": "Suplementos",
        "status_pagamento": "PAGO"
    }, headers=headers_gerente)
    assert res_desp_err.status_code == 403


def test_sql_injection_resilience(client: TestClient) -> None:
    """Verifica resiliência contra SQL Injection através de parâmetros manipulados."""
    token, _ = registrar_e_autenticar(client, "SqlInj")
    headers = {"Authorization": f"Bearer {token}"}

    payloads = [
        "1' OR '1'='1",
        "1; DROP TABLE vendas; --",
        "'; EXEC xp_cmdshell('ping') --",
        "\" or 1=1--"
    ]

    for injection in payloads:
        # Consulta com parâmetros de busca manipulados no Financeiro
        res_list = client.get(f"/financeiro/lancamentos?categoria={injection}", headers=headers)
        assert res_list.status_code in [200, 422, 400]
        # Se 200, a lista deve estar vazia (parâmetro tratado como string literal), sem estourar SQL no log/response
        if res_list.status_code == 200:
            assert len(res_list.json()) == 0


def test_no_traceback_leaks_in_responses(client: TestClient) -> None:
    """Certifica de que erros inesperados ou de validação não vazam logs/tracebacks Python."""
    token, _ = registrar_e_autenticar(client, "LeakProof")
    headers = {"Authorization": f"Bearer {token}"}

    # Passa UUID inválido/mal-formado de forma proposital
    res = client.post("/vendas", json={
        "loja_id": "isso-nao-e-um-uuid",
        "forma_pagamento": "PIX",
        "itens": []
    }, headers=headers)
    
    assert res.status_code == 422
    response_text = res.text
    # Assegura que palavras reservadas de erros de depuração interna do Python não vazam
    assert "Traceback" not in response_text
    assert "ValidationError" not in response_text
    assert "src/use_cases/" not in response_text
    assert "File \"" not in response_text
