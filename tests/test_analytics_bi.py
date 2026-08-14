import random
from datetime import datetime
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.domain.entities.analytics import DashboardIndicadores
from src.domain.services.curva_abc import CurvaABCService
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
        raise ValueError(f"Registration failed: {res_reg.status_code} - {res_reg.text}")

    tenant_id = res_reg.json()["tenant_id"]

    login = client.post("/auth/login", json={
        "email": f"{prefix.lower()}@email.com",
        "senha": "senha_segura_123"
    })
    return login.json()["access_token"], tenant_id


def montar_cenario_vendas(
    client: TestClient,
    headers: dict,
    prefix: str,
) -> tuple[str, str, str, str]:
    """
    Monta um cenário completo de vendas para o dashboard:
      - Produto A: preço custo 50, venda 100 (margem unitária 50%)
      - Produto B: preço custo 20, venda 40 (margem unitária 50%)
    Retorna (loja_id, produto_a_id, produto_b_id, cliente_id).
    """
    res_loja = client.post("/lojas/", json={
        "nome": f"Loja {prefix}",
        "cnpj": gerar_cnpj_valido(),
        "endereco": f"Av {prefix}, 100"
    }, headers=headers)
    assert res_loja.status_code == 201
    loja_id = res_loja.json()["id"]

    res_prod_a = client.post("/produtos/", json={
        "nome": "Produto A",
        "sku": f"SKU-A-{uuid4().hex[:4]}",
        "preco_custo": 50.0,
        "preco_venda": 100.0,
        "markup": 1.0
    }, headers=headers)
    assert res_prod_a.status_code == 201
    produto_a_id = res_prod_a.json()["id"]

    res_prod_b = client.post("/produtos/", json={
        "nome": "Produto B",
        "sku": f"SKU-B-{uuid4().hex[:4]}",
        "preco_custo": 20.0,
        "preco_venda": 40.0,
        "markup": 1.0
    }, headers=headers)
    assert res_prod_b.status_code == 201
    produto_b_id = res_prod_b.json()["id"]

    # Entradas de estoque
    for produto_id in (produto_a_id, produto_b_id):
        client.post("/estoque/movimentar", json={
            "loja_id": loja_id,
            "produto_id": produto_id,
            "tipo": "ENTRADA",
            "quantidade": 100,
            "motivo": "Compra inicial"
        }, headers=headers)

    # Cliente para venda crediário (CPF válido)
    res_cli = client.post("/clientes/", json={
        "nome": f"Cliente {prefix}",
        "email": f"cliente{prefix.lower()}@teste.com",
        "documento": "12345678909",
        "limite_credito": 10000.0
    }, headers=headers)
    assert res_cli.status_code == 201
    cliente_id = res_cli.json()["id"]

    # 2 vendas à vista (PIX): A (1x R$100) e B (2x R$40 = R$80)
    res_v1 = client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "desconto": 0.0,
        "itens": [{"produto_id": produto_a_id, "quantidade": 1}]
    }, headers=headers)
    assert res_v1.status_code == 201

    res_v2 = client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "desconto": 0.0,
        "itens": [{"produto_id": produto_b_id, "quantidade": 2}]
    }, headers=headers)
    assert res_v2.status_code == 201

    return loja_id, produto_a_id, produto_b_id, cliente_id


# ---------------------------------------------------------------------------
# Domínio puro: exatidão matemática da Curva ABC
# ---------------------------------------------------------------------------

def test_curva_abc_exatidao_matematica() -> None:
    produto_a = uuid4()
    produto_b = uuid4()
    produto_c = uuid4()
    produto_d = uuid4()

    # Faturamento total: 700
    faturamentos = [
        (produto_a, "Prod A", "SKU-A", 400.0),   # 57.14% acumulado
        (produto_b, "Prod B", "SKU-B", 200.0),   # 85.71% acumulado
        (produto_c, "Prod C", "SKU-C", 80.0),    # 97.14% acumulado
        (produto_d, "Prod D", "SKU-D", 20.0),    # 100% acumulado
    ]

    resultado = CurvaABCService.classificar_curva_abc(faturamentos)

    assert len(resultado) == 4
    # Ordenado do maior para o menor
    assert resultado[0].produto_id == produto_a
    assert resultado[1].produto_id == produto_b
    assert resultado[2].produto_id == produto_c
    assert resultado[3].produto_id == produto_d

    # Percentuais acumulados exatos
    assert resultado[0].percentual_acumulado == 57.14
    assert resultado[1].percentual_acumulado == 85.71
    assert resultado[2].percentual_acumulado == 97.14
    assert resultado[3].percentual_acumulado == 100.0

    # Classificação Pareto: A <= 80%, B <= 95%, C > 95%
    assert resultado[0].classe == "A"
    assert resultado[1].classe == "B"
    assert resultado[2].classe == "C"
    assert resultado[3].classe == "C"


def test_curva_abc_lista_vazia_e_sem_faturamento() -> None:
    assert CurvaABCService.classificar_curva_abc([]) == []

    # Todos com faturamento zero: nada acumula, tudo classe C
    resultado = CurvaABCService.classificar_curva_abc([
        (uuid4(), "X", "SX", 0.0),
        (uuid4(), "Y", "SY", 0.0),
    ])
    assert all(item.classe == "C" for item in resultado)


def test_dashboard_indicadores_validacoes() -> None:
    import pytest

    # Valor válido
    indicadores = DashboardIndicadores(
        faturamento_bruto=1000.0,
        numero_vendas=10,
        ticket_medio=100.0,
        cmv=500.0,
        margem_lucro=50.0,
        estoque_critico=2,
        rupturas=1,
    )
    assert indicadores.ticket_medio == 100.0

    # Valor inválido: faturamento negativo
    with pytest.raises(ValueError):
        DashboardIndicadores(
            faturamento_bruto=-1.0,
            numero_vendas=1,
            ticket_medio=0.0,
            cmv=0.0,
            margem_lucro=0.0,
            estoque_critico=0,
            rupturas=0,
        )


# ---------------------------------------------------------------------------
# API: Dashboard
# ---------------------------------------------------------------------------

def test_api_dashboard_kpis_exatos(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "DashA")
    headers = {"Authorization": f"Bearer {token}"}

    loja_id, produto_a_id, produto_b_id, _ = montar_cenario_vendas(client, headers, "DashA")

    res = client.get("/analytics/dashboard", headers=headers)
    assert res.status_code == 200
    dados = res.json()

    # Faturamento: 100 + 80 = 180
    assert dados["faturamento_bruto"] == 180.0
    assert dados["numero_vendas"] == 2
    # Ticket médio = 180 / 2
    assert dados["ticket_medio"] == 90.0
    # CMV = 1*50 + 2*20 = 90
    assert dados["cmv"] == 90.0
    # Margem = (180 - 90) / 180 = 50%
    assert dados["margem_lucro"] == 50.0
    # Estoque crítico e rupturas não devem conter itens zerados/críticos
    assert dados["estoque_critico"] == 0
    assert dados["rupturas"] == 0

    # Filtro por loja retorna os mesmos valores
    res_loja = client.get(f"/analytics/dashboard?loja_id={loja_id}", headers=headers)
    assert res_loja.status_code == 200
    assert res_loja.json()["faturamento_bruto"] == 180.0


def test_api_dashboard_filtro_periodo(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "DashB")
    headers = {"Authorization": f"Bearer {token}"}

    montar_cenario_vendas(client, headers, "DashB")

    # Período passado (ontem/anteontem) -> sem vendas no intervalo
    ontem = datetime.utcnow().replace(year=2020, month=1, day=1)
    res = client.get(
        f"/analytics/dashboard?data_inicio={ontem.isoformat()}&data_fim={ontem.isoformat()}",
        headers=headers
    )
    assert res.status_code == 200
    dados = res.json()
    assert dados["faturamento_bruto"] == 0.0
    assert dados["numero_vendas"] == 0
    assert dados["ticket_medio"] == 0.0
    assert dados["cmv"] == 0.0


def test_api_dashboard_estoque_critico_e_rupturas(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "DashC")
    headers = {"Authorization": f"Bearer {token}"}

    loja_id, produto_a_id, produto_b_id, _ = montar_cenario_vendas(client, headers, "DashC")

    # Define estoque mínimo alto para o Produto A (fica crítico)
    client.put(f"/produtos/{produto_a_id}", json={
        "nome": "Produto A",
        "preco_custo": 50.0,
        "preco_venda": 100.0,
        "markup": 1.0,
        "estoque_minimo": 100,
        "ativo": True
    }, headers=headers)

    # Zera o estoque do Produto B (ruptura)
    res_saldo = client.get("/estoque/saldos", headers=headers)
    saldo_b = [s for s in res_saldo.json() if s["produto_id"] == produto_b_id][0]

    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_b_id,
        "tipo": "SAIDA",
        "quantidade": saldo_b["quantidade"],
        "motivo": "Ajuste de auditoria"
    }, headers=headers)

    res = client.get("/analytics/dashboard", headers=headers)
    assert res.status_code == 200
    dados = res.json()
    # Produto A com saldo 99 <= estoque_minimo 100 -> crítico
    assert dados["estoque_critico"] == 1
    # Produto B com saldo zerado -> ruptura
    assert dados["rupturas"] == 1


# ---------------------------------------------------------------------------
# API: Curva ABC
# ---------------------------------------------------------------------------

def test_api_curva_abc_ordenacao_e_classes(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "CurvaA")
    headers = {"Authorization": f"Bearer {token}"}

    montar_cenario_vendas(client, headers, "CurvaA")

    res = client.get("/analytics/curva-abc", headers=headers)
    assert res.status_code == 200
    itens = res.json()

    # 2 produtos com faturamento: A = 100, B = 80. Total = 180.
    assert len(itens) == 2
    assert itens[0]["faturamento"] == 100.0
    assert itens[1]["faturamento"] == 80.0

    # Percentuais acumulados: 55.56% e 100%
    assert itens[0]["percentual_acumulado"] == 55.56
    assert itens[1]["percentual_acumulado"] == 100.0

    # A fica classe A, B fica classe C (ultrapassou 95%)
    assert itens[0]["classe"] == "A"
    assert itens[1]["classe"] == "C"


# ---------------------------------------------------------------------------
# Isolamento multi-tenant e BOLA
# ---------------------------------------------------------------------------

def test_analytics_isolamento_multi_tenant(client: TestClient) -> None:
    token_a, _ = registrar_e_autenticar(client, "IsoA")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    token_b, _ = registrar_e_autenticar(client, "IsoB")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    montar_cenario_vendas(client, headers_a, "IsoA")

    # Tenant B não deve ver nada
    res_b = client.get("/analytics/dashboard", headers=headers_b)
    assert res_b.status_code == 200
    assert res_b.json()["faturamento_bruto"] == 0.0
    assert res_b.json()["numero_vendas"] == 0

    res_curva_b = client.get("/analytics/curva-abc", headers=headers_b)
    assert res_curva_b.status_code == 200
    assert res_curva_b.json() == []


def test_analytics_bola_gerente_loja_diferente(client: TestClient, db_session: Session) -> None:
    token_dono, tenant_id = registrar_e_autenticar(client, "BolaAna")
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    loja_a_id = client.post("/lojas/", json={
        "nome": "Loja A",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Rua A, 1"
    }, headers=headers_dono).json()["id"]

    loja_b_id = client.post("/lojas/", json={
        "nome": "Loja B",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Rua B, 2"
    }, headers=headers_dono).json()["id"]

    # Gerente da Loja A
    gerente_a = UsuarioModel(
        nome="Gerente Loja A",
        email="gerenteana@bola.com",
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

    # Gerente tenta acessar dashboard da Loja B -> 403
    res_err = client.get(f"/analytics/dashboard?loja_id={loja_b_id}", headers=headers_gerente)
    assert res_err.status_code == 403

    res_err_curva = client.get(f"/analytics/curva-abc?loja_id={loja_b_id}", headers=headers_gerente)
    assert res_err_curva.status_code == 403

    # Sem especificar loja, o gerente é restrito à Loja A automaticamente
    res_ok = client.get("/analytics/dashboard", headers=headers_gerente)
    assert res_ok.status_code == 200
