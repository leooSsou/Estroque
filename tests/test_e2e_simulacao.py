import random
import re

from fastapi.testclient import TestClient


def gerar_cnpj() -> str:
    def calcular_digito(cnpj_base, pesos):
        soma = sum(int(d) * p for d, p in zip(cnpj_base, pesos))
        resto = soma % 11
        return 0 if resto < 2 else 11 - resto
    base = [random.randint(0, 9) for _ in range(8)] + [0, 0, 0, 1]
    d1 = calcular_digito(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    base.append(d1)
    d2 = calcular_digito(base, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    base.append(d2)
    return re.sub(r"(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})", r"\1.\2.\3/\4-\5", "".join(map(str, base)))


def test_simulacao_fluxo_completo_uso_real(client: TestClient):
    """
    Simulação ponta a ponta do uso real do sistema: registrar conta, criar loja,
    produto, estoque, cliente, venda em crediário e conferir o financeiro.
    """
    # 1. Registro de Tenant
    prefix = random.randint(100000, 999999)
    email = f"ceo_{prefix}@empresa.com"
    res = client.post("/auth/register", json={
        "nome_fantasia": "Supermercado E2E",
        "razao_social": "E2E LTDA",
        "cnpj": gerar_cnpj(),
        "dono_nome": "João Dono",
        "dono_email": email,
        "dono_senha": "senha_segura"
    })
    assert res.status_code in (200, 201), res.text

    # 2. Login
    res = client.post("/auth/login", json={"email": email, "senha": "senha_segura"})
    assert res.status_code == 200, res.text
    headers = {"Authorization": f"Bearer {res.json()['access_token']}"}

    # 3. Cadastrando uma Loja
    res = client.post("/lojas/", json={
        "nome": "Loja Matriz E2E",
        "cnpj": gerar_cnpj(),
        "endereco": "Av Principal, 1000",
        "gerente_id": None
    }, headers=headers)
    assert res.status_code in (200, 201), res.text
    loja_id = res.json()["id"]

    # 4. Cadastrando Produto
    res = client.post("/produtos/", json={
        "nome": "Televisão 4K 50 polegadas",
        "sku": f"TV50-{prefix}",
        "preco_custo": 1500.00,
        "preco_venda": 2500.00,
        "markup": 0.66
    }, headers=headers)
    assert res.status_code in (200, 201), res.text
    produto_id = res.json()["id"]

    # 5. Dando Entrada no Estoque
    res = client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Compra de fornecedor (NFe 1234)"
    }, headers=headers)
    assert res.status_code in (200, 201), res.text

    # 6. Cadastrando Cliente
    res = client.post("/clientes/", json={
        "nome": "Maria Silva",
        "documento": "52998224725",
        "email": f"maria_{prefix}@email.com",
        "limite_credito": 3000.00
    }, headers=headers)
    assert res.status_code in (200, 201), res.text
    cliente_id = res.json()["id"]

    # 7. Realizando a Venda em Crediário
    res = client.post("/vendas/", json={
        "loja_id": loja_id,
        "vendedor_id": None,
        "cliente_id": cliente_id,
        "forma_pagamento": "CREDIARIO",
        "itens": [{"produto_id": produto_id, "quantidade": 1}]
    }, headers=headers)
    assert res.status_code in (200, 201), res.text
    venda_data = res.json()
    assert venda_data["valor_total"] == 2500.00

    # 8. Estoque baixado automaticamente
    res = client.get(f"/estoque/saldos?loja_id={loja_id}&produto_id={produto_id}", headers=headers)
    assert res.status_code == 200, res.text
    saldo = next(s for s in res.json() if s["produto_id"] == produto_id)
    assert saldo["quantidade"] == 9  # 10 - 1 vendida

    # 9. Receita da venda no financeiro
    res = client.get("/financeiro/lancamentos?tipo=RECEITA", headers=headers)
    assert res.status_code == 200, res.text
    assert any(lancamento["valor"] == 2500.00 for lancamento in res.json())

    # 10. Lançando uma Despesa
    res = client.post("/financeiro/despesas", json={
        "loja_id": loja_id,
        "valor": 400.00,
        "categoria": "Conta de Luz",
        "status_pagamento": "PAGO",
        "data_pagamento": "2026-08-10T12:00:00Z"
    }, headers=headers)
    assert res.status_code in (200, 201), res.text

    # 11. Lucro líquido com a despesa
    res = client.get("/financeiro/lancamentos", headers=headers)
    assert res.status_code == 200, res.text
    todos = res.json()
    receitas = sum(lancamento["valor"] for lancamento in todos if lancamento["tipo"] == "RECEITA")
    despesas = sum(lancamento["valor"] for lancamento in todos if lancamento["tipo"] == "DESPESA")
    assert receitas - despesas == 2100.00