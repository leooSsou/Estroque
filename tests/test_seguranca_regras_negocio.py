import random

from fastapi.testclient import TestClient

from src.infrastructure.database.mixins import HasTenant
from src.infrastructure.database.models import ItemDevolucaoModel, ItemVendaModel, PagamentoVendaModel


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


def gerar_cpf() -> str:
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


def test_has_tenant_em_modelos_filhos():
    """
    SEC-03: Garante que os modelos dependentes itens_venda, pagamentos_venda e itens_devolucao
    herdam de HasTenant para receber isolamento multi-tenant automático pelo SQLAlchemy.
    """
    assert issubclass(PagamentoVendaModel, HasTenant)
    assert issubclass(ItemVendaModel, HasTenant)
    assert issubclass(ItemDevolucaoModel, HasTenant)


def test_fluxo_caixa_turno_no_servidor(client: TestClient):
    """
    SEC-01: Testa abertura de turno, sangria, suprimento e fechamento cego diretamente no servidor.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_caixa_{prefix}@varejo.com"
    senha = "senha_segura_123"

    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"Varejo Caixa {prefix}",
            "razao_social": f"Varejo Caixa S/A {prefix}",
            "cnpj": gerar_cnpj(),
            "dono_nome": "Carlos Caixa",
            "dono_email": email_dono,
            "dono_senha": senha,
        },
    )
    assert res_reg.status_code == 201
    token = client.post("/auth/login", json={"email": email_dono, "senha": senha}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res_lojas = client.get("/lojas/", headers=headers)
    assert res_lojas.status_code == 200
    lojas = res_lojas.json()
    if not lojas:
        res_loja_criada = client.post(
            "/lojas/",
            json={"nome": "Matriz Caixa", "cnpj": gerar_cnpj(), "endereco": "Rua 1, 10"},
            headers=headers,
        )
        assert res_loja_criada.status_code == 201
        loja_id = res_loja_criada.json()["id"]
    else:
        loja_id = lojas[0]["id"]

    # 1. Obter turno atual quando nenhum está aberto -> aberto=False
    res_turno = client.get(f"/caixa/turno-atual?loja_id={loja_id}", headers=headers)
    assert res_turno.status_code == 200
    assert res_turno.json()["aberto"] is False

    # 2. Abrir turno com fundo inicial de R$ 150.00
    res_abrir = client.post(
        "/caixa/abrir",
        json={"loja_id": loja_id, "fundo_inicial": 150.0},
        headers=headers,
    )
    assert res_abrir.status_code == 201
    turno_data = res_abrir.json()
    assert turno_data["aberto"] is True
    assert turno_data["fundo_inicial"] == 150.0
    assert len(turno_data["operacoes"]) == 1
    assert turno_data["operacoes"][0]["tipo"] == "ABERTURA"

    # 3. Tentar abrir segundo turno na mesma loja física -> 400 Bad Request
    res_abrir_duplicado = client.post(
        "/caixa/abrir",
        json={"loja_id": loja_id, "fundo_inicial": 200.0},
        headers=headers,
    )
    assert res_abrir_duplicado.status_code == 400
    assert "turno de caixa aberto" in res_abrir_duplicado.json()["detail"]

    # 4. Registrar Suprimento de R$ 50.00
    res_suprimento = client.post(
        "/caixa/operacoes",
        json={
            "tipo": "SUPRIMENTO",
            "valor": 50.0,
            "motivo": "Troco de moedas adicional",
            "loja_id": loja_id,
        },
        headers=headers,
    )
    assert res_suprimento.status_code == 201
    assert res_suprimento.json()["tipo"] == "SUPRIMENTO"
    assert res_suprimento.json()["valor"] == 50.0

    # 5. Registrar Sangria de R$ 80.00
    res_sangria = client.post(
        "/caixa/operacoes",
        json={
            "tipo": "SANGRIA",
            "valor": 80.0,
            "motivo": "Recolhimento para o cofre",
            "loja_id": loja_id,
        },
        headers=headers,
    )
    assert res_sangria.status_code == 201
    assert res_sangria.json()["tipo"] == "SANGRIA"
    assert res_sangria.json()["valor"] == 80.0

    # 6. Fechar caixa com contagem cega
    # Saldo esperado: 150.0 (fundo) + 50.0 (suprimento) - 80.0 (sangria) = 120.00
    # Operador informa R$ 125.00 (sobra de R$ 5.00)
    res_fechar = client.post(
        "/caixa/fechar",
        json={
            "loja_id": loja_id,
            "saldo_informado": 125.0,
            "observacao": "Sobra de R$ 5.00 apurada no fechamento",
        },
        headers=headers,
    )
    assert res_fechar.status_code == 200
    fechamento_data = res_fechar.json()
    assert fechamento_data["saldo_esperado"] == 120.0
    assert fechamento_data["saldo_informado"] == 125.0
    assert fechamento_data["diferenca"] == 5.0
    assert fechamento_data["resumo"]["aberto"] is False

    # 7. Listar histórico de turnos fechados
    res_hist = client.get(f"/caixa/historico?loja_id={loja_id}", headers=headers)
    assert res_hist.status_code == 200
    historico = res_hist.json()
    assert len(historico) >= 1
    assert historico[0]["diferenca"] == 5.0


def test_teto_desconto_pdv_gerente_vs_dono(client: TestClient):
    """
    SEC-04: Gerente não pode aplicar mais de 30% de desconto arbitrário no PDV.
    DONO pode conceder qualquer desconto até 100%.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_desc_{prefix}@varejo.com"
    senha = "senha_segura_123"

    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"Varejo Desconto {prefix}",
            "razao_social": f"Varejo Desconto S/A {prefix}",
            "cnpj": gerar_cnpj(),
            "dono_nome": "Carlos Dono",
            "dono_email": email_dono,
            "dono_senha": senha,
        },
    )
    assert res_reg.status_code == 201
    token_dono = client.post("/auth/login", json={"email": email_dono, "senha": senha}).json()["access_token"]
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    # Criar loja
    res_loja = client.post(
        "/lojas/",
        json={"nome": "Matriz Desconto", "cnpj": gerar_cnpj(), "endereco": "Rua 2, 20"},
        headers=headers_dono,
    )
    loja_id = res_loja.json()["id"]

    # Criar gerente vinculado à loja
    email_gerente = f"gerente_{prefix}@varejo.com"
    res_gerente = client.post(
        "/auth/usuarios",
        json={
            "nome": "Marcos Gerente",
            "email": email_gerente,
            "senha": senha,
            "role": "GERENTE",
            "loja_atribuida_id": loja_id,
        },
        headers=headers_dono,
    )
    assert res_gerente.status_code == 201
    token_gerente = client.post("/auth/login", json={"email": email_gerente, "senha": senha}).json()["access_token"]
    headers_gerente = {"Authorization": f"Bearer {token_gerente}"}

    # Cadastrar produto de R$ 100.00 com estoque 50
    res_prod = client.post(
        "/produtos/",
        json={
            "nome": "Camisa Polo",
            "sku": f"POLO-{prefix}",
            "preco_custo": 40.0,
            "preco_venda": 100.0,
            "markup": 150.0,
        },
        headers=headers_dono,
    )
    assert res_prod.status_code == 201
    prod_id = res_prod.json()["id"]

    # Abastecer estoque
    res_mov = client.post(
        "/estoque/movimentar",
        json={
            "loja_id": loja_id,
            "produto_id": prod_id,
            "tipo": "ENTRADA",
            "quantidade": 20,
            "motivo": "Carga inicial",
        },
        headers=headers_dono,
    )
    assert res_mov.status_code == 200

    # 1. Gerente tenta conceder R$ 50.00 de desconto em produto de R$ 100.00 (50% > 30%) -> 422
    res_venda_gerente_invalida = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "forma_pagamento": "DINHEIRO",
            "desconto": 50.0,
            "itens": [{"produto_id": prod_id, "quantidade": 1}],
        },
        headers=headers_gerente,
    )
    assert res_venda_gerente_invalida.status_code == 422
    assert "máximo de 30%" in res_venda_gerente_invalida.json()["detail"]

    # 2. Gerente concede R$ 20.00 de desconto (20% <= 30%) -> 201 Sucesso
    res_venda_gerente_valida = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "forma_pagamento": "DINHEIRO",
            "desconto": 20.0,
            "itens": [{"produto_id": prod_id, "quantidade": 1}],
        },
        headers=headers_gerente,
    )
    assert res_venda_gerente_valida.status_code == 201
    assert res_venda_gerente_valida.json()["valor_total"] == 80.0

    # 3. DONO concede R$ 60.00 de desconto (60%) -> 201 Sucesso (proprietário tem autorização)
    res_venda_dono = client.post(
        "/vendas",
        json={
            "loja_id": loja_id,
            "forma_pagamento": "DINHEIRO",
            "desconto": 60.0,
            "itens": [{"produto_id": prod_id, "quantidade": 1}],
        },
        headers=headers_dono,
    )
    assert res_venda_dono.status_code == 201
    assert res_venda_dono.json()["valor_total"] == 40.0


def test_gerente_bloqueado_alterar_limite_credito(client: TestClient):
    """
    SEC-05: Gerente não pode alterar o limite de crédito de clientes.
    Apenas DONO ou ADMIN_SAAS possuem essa permissão.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_cli_{prefix}@varejo.com"
    senha = "senha_segura_123"

    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"Varejo Credito {prefix}",
            "razao_social": f"Varejo Credito S/A {prefix}",
            "cnpj": gerar_cnpj(),
            "dono_nome": "Carlos Dono",
            "dono_email": email_dono,
            "dono_senha": senha,
        },
    )
    assert res_reg.status_code == 201
    token_dono = client.post("/auth/login", json={"email": email_dono, "senha": senha}).json()["access_token"]
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    res_loja = client.post(
        "/lojas/",
        json={"nome": "Matriz Credito", "cnpj": gerar_cnpj(), "endereco": "Rua 3, 30"},
        headers=headers_dono,
    )
    loja_id = res_loja.json()["id"]

    email_gerente = f"gerente_{prefix}@varejo.com"
    client.post(
        "/auth/usuarios",
        json={
            "nome": "Gerente Loja",
            "email": email_gerente,
            "senha": senha,
            "role": "GERENTE",
            "loja_atribuida_id": loja_id,
        },
        headers=headers_dono,
    )
    token_gerente = client.post("/auth/login", json={"email": email_gerente, "senha": senha}).json()["access_token"]
    headers_gerente = {"Authorization": f"Bearer {token_gerente}"}

    # DONO cadastra cliente com limite de R$ 500.00
    res_cli = client.post(
        "/clientes/",
        json={
            "nome": "Cliente Alvo",
            "email": f"cli_{prefix}@teste.com",
            "documento": gerar_cpf(),
            "limite_credito": 500.0,
        },
        headers=headers_dono,
    )
    assert res_cli.status_code == 201
    cli_id = res_cli.json()["id"]

    # 1. Gerente tenta aumentar limite para R$ 5.000,00 -> 403 Forbidden
    res_hack_gerente = client.put(
        f"/clientes/{cli_id}",
        json={
            "nome": "Cliente Alvo",
            "email": f"cli_{prefix}@teste.com",
            "ativo": True,
            "limite_credito": 5000.0,
        },
        headers=headers_gerente,
    )
    assert res_hack_gerente.status_code == 403
    assert "proprietário (DONO)" in res_hack_gerente.json()["detail"]

    # 2. Gerente atualiza apenas dados cadastrais (mantendo mesmo limite) -> 200 OK
    res_atualiza_gerente = client.put(
        f"/clientes/{cli_id}",
        json={
            "nome": "Cliente Alvo Atualizado",
            "email": f"cli_{prefix}@teste.com",
            "ativo": True,
            "limite_credito": 500.0,
        },
        headers=headers_gerente,
    )
    assert res_atualiza_gerente.status_code == 200
    assert res_atualiza_gerente.json()["nome"] == "Cliente Alvo Atualizado"

    # 3. DONO altera o limite para R$ 1.500,00 -> 200 OK
    res_dono_altera = client.put(
        f"/clientes/{cli_id}",
        json={
            "nome": "Cliente Alvo Atualizado",
            "email": f"cli_{prefix}@teste.com",
            "ativo": True,
            "limite_credito": 1500.0,
        },
        headers=headers_dono,
    )
    assert res_dono_altera.status_code == 200
    assert res_dono_altera.json()["limite_credito"] == 1500.0


def test_gerente_bloqueado_alterar_preco_produto(client: TestClient):
    """
    SEC-06: Gerente não pode alterar preços e margens de lucro de produtos.
    Apenas DONO ou ADMIN_SAAS possuem essa permissão.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_prod_{prefix}@varejo.com"
    senha = "senha_segura_123"

    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"Varejo Prod {prefix}",
            "razao_social": f"Varejo Prod S/A {prefix}",
            "cnpj": gerar_cnpj(),
            "dono_nome": "Carlos Dono",
            "dono_email": email_dono,
            "dono_senha": senha,
        },
    )
    assert res_reg.status_code == 201
    token_dono = client.post("/auth/login", json={"email": email_dono, "senha": senha}).json()["access_token"]
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    res_loja = client.post(
        "/lojas/",
        json={"nome": "Matriz Prod", "cnpj": gerar_cnpj(), "endereco": "Rua 4, 40"},
        headers=headers_dono,
    )
    loja_id = res_loja.json()["id"]

    email_gerente = f"gerente_{prefix}@varejo.com"
    client.post(
        "/auth/usuarios",
        json={
            "nome": "Gerente Loja",
            "email": email_gerente,
            "senha": senha,
            "role": "GERENTE",
            "loja_atribuida_id": loja_id,
        },
        headers=headers_dono,
    )
    token_gerente = client.post("/auth/login", json={"email": email_gerente, "senha": senha}).json()["access_token"]
    headers_gerente = {"Authorization": f"Bearer {token_gerente}"}

    # DONO cadastra produto de R$ 80.00
    res_prod = client.post(
        "/produtos/",
        json={
            "nome": "Tênis Esportivo",
            "sku": f"TENIS-{prefix}",
            "preco_custo": 40.0,
            "preco_venda": 80.0,
            "markup": 100.0,
        },
        headers=headers_dono,
    )
    prod_id = res_prod.json()["id"]

    # 1. Gerente tenta alterar o preço de venda para R$ 10.00 -> 403 Forbidden
    res_hack_preco = client.put(
        f"/produtos/{prod_id}",
        json={
            "nome": "Tênis Esportivo",
            "preco_custo": 40.0,
            "preco_venda": 10.0,
            "markup": 100.0,
            "ativo": True,
        },
        headers=headers_gerente,
    )
    assert res_hack_preco.status_code == 403
    assert "proprietário (DONO)" in res_hack_preco.json()["detail"]

    # 2. DONO altera o preço de venda com sucesso
    res_dono_ok = client.put(
        f"/produtos/{prod_id}",
        json={
            "nome": "Tênis Esportivo Pro",
            "preco_custo": 45.0,
            "preco_venda": 95.0,
            "markup": 111.11,
            "ativo": True,
        },
        headers=headers_dono,
    )
    assert res_dono_ok.status_code == 200
    assert res_dono_ok.json()["preco_venda"] == 95.0
