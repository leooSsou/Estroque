import random
from uuid import uuid4

import pytest
from fastapi import status
from starlette.testclient import TestClient

from src.domain.entities.produto import Produto


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


@pytest.fixture
def auth_headers_grade(client: TestClient) -> dict[str, str]:
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_{prefix}@moderna.com"
    senha = "senha_segura_123"

    res_reg = client.post("/auth/register", json={
        "nome_fantasia": f"Moderna {prefix}",
        "razao_social": f"Moderna Calcados {prefix} Ltda",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Carlos Gerente",
        "dono_email": email_dono,
        "dono_senha": senha
    })
    assert res_reg.status_code == 201, res_reg.text

    login_res = client.post("/auth/login", json={"email": email_dono, "senha": senha})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_loja = client.post("/lojas/", json={
        "nome": "Loja Matriz",
        "cnpj": gerar_cnpj(),
        "endereco": "Rua da Moda, 100"
    }, headers=headers)
    assert res_loja.status_code == 201, res_loja.text
    loja_id = res_loja.json()["id"]

    return {
        "Authorization": f"Bearer {token}",
        "loja_id": loja_id
    }


def test_entidade_produto_validacoes_grade():
    tenant_id = uuid4()
    pai_id = uuid4()

    # Variação válida
    prod = Produto(
        nome="Camiseta Dry - Azul / M",
        sku="CAM-AZUL-M",
        preco_custo=20.0,
        preco_venda=50.0,
        markup=1.5,
        tenant_id=tenant_id,
        produto_pai_id=pai_id,
        variacoes={"cor": "Azul", "tamanho": "M"}
    )
    assert prod.is_variacao is True
    assert prod.produto_pai_id == pai_id
    assert prod.variacoes == {"cor": "Azul", "tamanho": "M"}

    # Produto pai
    pai = Produto(
        nome="Camiseta Dry",
        sku="CAM-DRY",
        preco_custo=20.0,
        preco_venda=50.0,
        markup=1.5,
        tenant_id=tenant_id
    )
    assert pai.is_variacao is False
    assert pai.produto_pai_id is None

    # Validação de tipos
    with pytest.raises(ValueError, match="produto_pai_id deve ser um UUID válido"):
        Produto(
            nome="Inv",
            sku="INV-1",
            preco_custo=10.0,
            preco_venda=20.0,
            markup=1.0,
            tenant_id=tenant_id,
            produto_pai_id="nao-uuid"  # type: ignore
        )

    with pytest.raises(ValueError, match="dicionário de atributos"):
        Produto(
            nome="Inv",
            sku="INV-2",
            preco_custo=10.0,
            preco_venda=20.0,
            markup=1.0,
            tenant_id=tenant_id,
            variacoes="invalido"  # type: ignore
        )

    with pytest.raises(ValueError, match="strings não vazias"):
        Produto(
            nome="Inv",
            sku="INV-3",
            preco_custo=10.0,
            preco_venda=20.0,
            markup=1.0,
            tenant_id=tenant_id,
            variacoes={"cor": ""}
        )


def test_criar_produto_com_grade_matricial_sucesso(client: TestClient, auth_headers_grade: dict[str, str]):
    headers = {"Authorization": auth_headers_grade["Authorization"]}
    loja_id = auth_headers_grade["loja_id"]

    sku_base = f"POLO-{uuid4().hex[:4].upper()}"

    payload = {
        "nome": "Camisa Polo Classic",
        "sku_base": sku_base,
        "preco_custo": 40.0,
        "preco_venda": 100.0,
        "markup": 1.5,
        "codigo_barras_base": "7891000",
        "loja_id": loja_id,
        "estoque_inicial_por_variacao": 15,
        "atributos": [
            {
                "nome": "Cor",
                "valores": ["Preto", "Branco"]
            },
            {
                "nome": "Tamanho",
                "valores": ["P", "M", "G"]
            }
        ]
    }

    # Deve gerar 2 x 3 = 6 variações
    res = client.post("/produtos/grade", json=payload, headers=headers)
    assert res.status_code == status.HTTP_201_CREATED, res.text
    data = res.json()

    pai = data["produto_pai"]
    variacoes = data["variacoes"]

    assert pai["nome"] == "Camisa Polo Classic"
    assert pai["sku"] == sku_base
    assert pai["produto_pai_id"] is None
    assert len(variacoes) == 6

    # Verifica os SKUs e variações geradas
    skus_gerados = [v["sku"] for v in variacoes]
    assert f"{sku_base}-PRETO-P" in skus_gerados
    assert f"{sku_base}-PRETO-M" in skus_gerados
    assert f"{sku_base}-PRETO-G" in skus_gerados
    assert f"{sku_base}-BRANCO-P" in skus_gerados
    assert f"{sku_base}-BRANCO-M" in skus_gerados
    assert f"{sku_base}-BRANCO-G" in skus_gerados

    for v in variacoes:
        assert v["produto_pai_id"] == pai["id"]
        assert "Cor" in v["variacoes"]
        assert "Tamanho" in v["variacoes"]
        assert v["preco_venda"] == 100.0
        assert v["preco_custo"] == 40.0

    # Consulta listagem de variações pelo endpoint dedicado
    res_vars = client.get(f"/produtos/{pai['id']}/variacoes", headers=headers)
    assert res_vars.status_code == status.HTTP_200_OK
    assert len(res_vars.json()) == 6

    # Consulta estoque inicial das variações
    res_estoque = client.get("/estoque/saldos", headers=headers)
    assert res_estoque.status_code == status.HTTP_200_OK
    saldos = res_estoque.json()
    saldos_produtos_ids = {s["produto_id"]: s["quantidade"] for s in saldos}

    for v in variacoes:
        assert v["id"] in saldos_produtos_ids
        assert saldos_produtos_ids[v["id"]] == 15


def test_listar_produtos_filtro_apenas_pais(client: TestClient, auth_headers_grade: dict[str, str]):
    headers = {"Authorization": auth_headers_grade["Authorization"]}
    sku_base = f"CALCA-{uuid4().hex[:4].upper()}"

    client.post("/produtos/grade", json={
        "nome": "Calça Jeans Slim",
        "sku_base": sku_base,
        "preco_custo": 60.0,
        "preco_venda": 150.0,
        "markup": 1.5,
        "atributos": [
            {"nome": "Tamanho", "valores": ["38", "40"]}
        ]
    }, headers=headers)

    # Listar com apenas_pais=True
    res_pais = client.get("/produtos/?apenas_pais=true", headers=headers)
    assert res_pais.status_code == status.HTTP_200_OK
    pais = res_pais.json()
    for p in pais:
        assert p["produto_pai_id"] is None

    # Listar todos (pais + variações)
    res_todos = client.get("/produtos/?apenas_pais=false", headers=headers)
    assert res_todos.status_code == status.HTTP_200_OK
    todos = res_todos.json()
    assert len(todos) > len(pais)


def test_adicionar_variacao_avulsa_ao_produto_pai(client: TestClient, auth_headers_grade: dict[str, str]):
    headers = {"Authorization": auth_headers_grade["Authorization"]}
    sku_base = f"TENIS-{uuid4().hex[:4].upper()}"

    res_pai = client.post("/produtos/grade", json={
        "nome": "Tênis Esportivo Pro",
        "sku_base": sku_base,
        "preco_custo": 120.0,
        "preco_venda": 280.0,
        "markup": 1.33,
        "atributos": [
            {"nome": "Tamanho", "valores": ["40", "41"]}
        ]
    }, headers=headers)
    pai_id = res_pai.json()["produto_pai"]["id"]

    # Adiciona tamanho 42 avulso com preço customizado
    res_nova = client.post(f"/produtos/{pai_id}/variacoes", json={
        "variacoes": {"Tamanho": "42"},
        "preco_venda": 300.0,
        "codigo_barras": "789123456789"
    }, headers=headers)
    assert res_nova.status_code == status.HTTP_201_CREATED, res_nova.text
    var_criada = res_nova.json()

    assert var_criada["produto_pai_id"] == pai_id
    assert var_criada["sku"] == f"{sku_base}-42"
    assert var_criada["preco_venda"] == 300.0
    assert var_criada["variacoes"] == {"Tamanho": "42"}
    assert var_criada["codigo_barras"] == "789123456789"

    # Confere que agora o pai possui 3 variações
    res_vars = client.get(f"/produtos/{pai_id}/variacoes", headers=headers)
    assert len(res_vars.json()) == 3


def test_bloqueio_validacoes_grade(client: TestClient, auth_headers_grade: dict[str, str]):
    headers = {"Authorization": auth_headers_grade["Authorization"]}
    sku_base = f"BLUSA-{uuid4().hex[:4].upper()}"

    # Sem atributos
    res_sem_attr = client.post("/produtos/grade", json={
        "nome": "Blusa Sem Atributo",
        "sku_base": f"{sku_base}-FAIL1",
        "preco_custo": 10.0,
        "preco_venda": 20.0,
        "markup": 1.0,
        "atributos": []
    }, headers=headers)
    assert res_sem_attr.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Atributo sem valores
    res_sem_val = client.post("/produtos/grade", json={
        "nome": "Blusa Sem Valores",
        "sku_base": f"{sku_base}-FAIL2",
        "preco_custo": 10.0,
        "preco_venda": 20.0,
        "markup": 1.0,
        "atributos": [{"nome": "Cor", "valores": []}]
    }, headers=headers)
    assert res_sem_val.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    # Mais de 100 variações (explosão combinatória)
    res_explosao = client.post("/produtos/grade", json={
        "nome": "Blusa Explosão",
        "sku_base": f"{sku_base}-FAIL3",
        "preco_custo": 10.0,
        "preco_venda": 20.0,
        "markup": 1.0,
        "atributos": [
            {"nome": "Attr1", "valores": [str(i) for i in range(11)]},
            {"nome": "Attr2", "valores": [str(i) for i in range(11)]}
        ]  # 11 x 11 = 121 variações > 100
    }, headers=headers)
    assert res_explosao.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert "não pode exceder 100" in res_explosao.text

    # Tentativa de adicionar variação a produto inexistente
    res_inex = client.post(f"/produtos/{uuid4()}/variacoes", json={
        "variacoes": {"Tamanho": "G"}
    }, headers=headers)
    assert res_inex.status_code == status.HTTP_404_NOT_FOUND


def test_venda_de_variacao_no_pdv_com_baixa_de_estoque(client: TestClient, auth_headers_grade: dict[str, str]):
    headers = {"Authorization": auth_headers_grade["Authorization"]}
    loja_id = auth_headers_grade["loja_id"]
    sku_base = f"VESTIDO-{uuid4().hex[:4].upper()}"

    res = client.post("/produtos/grade", json={
        "nome": "Vestido Floral",
        "sku_base": sku_base,
        "preco_custo": 50.0,
        "preco_venda": 120.0,
        "markup": 1.4,
        "loja_id": loja_id,
        "estoque_inicial_por_variacao": 10,
        "atributos": [
            {"nome": "Tamanho", "valores": ["M", "G"]}
        ]
    }, headers=headers)
    variacao_m = res.json()["variacoes"][0]

    # Realiza venda no PDV usando o ID da variação M
    venda_payload = {
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "desconto": 0.0,
        "itens": [
            {
                "produto_id": variacao_m["id"],
                "quantidade": 3,
                "preco_unitario": 120.0
            }
        ]
    }
    res_venda = client.post("/vendas/", json=venda_payload, headers=headers)
    assert res_venda.status_code == status.HTTP_201_CREATED, res_venda.text
    venda_data = res_venda.json()
    assert venda_data["status"] == "PAGO"
    assert venda_data["valor_total"] == 360.0

    # Verifica se o estoque da variação M foi debitado (10 - 3 = 7)
    res_estoque = client.get("/estoque/saldos", headers=headers)
    saldos = res_estoque.json()
    saldo_var_m = next(s for s in saldos if s["produto_id"] == variacao_m["id"])
    assert saldo_var_m["quantidade"] == 7
