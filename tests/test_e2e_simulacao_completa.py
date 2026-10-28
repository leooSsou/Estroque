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


def test_simulacao_e2e_completa_estroque(client: TestClient):
    """
    Simulação E2E completa de 16 passos cobrindo todo o ciclo operacional
    de uma rede de varejo multi-loja no Estroque.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_{prefix}@varejo.com"
    senha_padrao = "senha_segura_123"

    # =========================================================================
    # PASSO 1: Cadastro de Tenant & Dono (Onboarding)
    # =========================================================================
    res_reg = client.post("/auth/register", json={
        "nome_fantasia": f"Rede Varejo {prefix}",
        "razao_social": f"Rede Varejo S/A {prefix}",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Carlos Dono",
        "dono_email": email_dono,
        "dono_senha": senha_padrao
    })
    assert res_reg.status_code == 201, res_reg.text

    # Login do Dono
    res_login = client.post("/auth/login", json={"email": email_dono, "senha": senha_padrao})
    assert res_login.status_code == 200, res_login.text
    token_dono = res_login.json()["access_token"]
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    # =========================================================================
    # PASSO 2: Gestão Multi-Loja (Criação de Matriz e Filial)
    # =========================================================================
    res_matriz = client.post("/lojas/", json={
        "nome": "Loja Matriz Centro",
        "cnpj": gerar_cnpj(),
        "endereco": "Av Central, 1000"
    }, headers=headers_dono)
    assert res_matriz.status_code == 201, res_matriz.text
    matriz_id = res_matriz.json()["id"]

    res_filial = client.post("/lojas/", json={
        "nome": "Loja Filial Shopping",
        "cnpj": gerar_cnpj(),
        "endereco": "Shopping Plaza, Loja 45"
    }, headers=headers_dono)
    assert res_filial.status_code == 201, res_filial.text
    filial_id = res_filial.json()["id"]

    # =========================================================================
    # PASSO 3: Gestão de Equipe & Controle BOLA (Cadastro de Gerente)
    # =========================================================================
    email_gerente = f"gerente_{prefix}@varejo.com"
    res_gerente = client.post("/auth/usuarios", json={
        "nome": "Marcos Gerente",
        "email": email_gerente,
        "senha": senha_padrao,
        "role": "GERENTE",
        "loja_atribuida_id": filial_id
    }, headers=headers_dono)
    assert res_gerente.status_code == 201, res_gerente.text

    # Login do Gerente
    res_login_g = client.post("/auth/login", json={"email": email_gerente, "senha": senha_padrao})
    token_gerente = res_login_g.json()["access_token"]
    headers_gerente = {"Authorization": f"Bearer {token_gerente}"}

    # =========================================================================
    # PASSO 4: Teste de BOLA - Gerente tentando operar na Matriz (Deve bloquear 403)
    # =========================================================================
    res_bola = client.post("/vendas", json={
        "loja_id": matriz_id,  # Gerente é da filial, não da matriz!
        "forma_pagamento": "DINHEIRO",
        "desconto": 0.0,
        "itens": [{"produto_id": matriz_id, "quantidade": 1}]
    }, headers=headers_gerente)
    assert res_bola.status_code == 403, "Deveria bloquear acesso indevido à filial"

    # =========================================================================
    # PASSO 5: Cadastro de Produtos com Precificação por Markup
    # =========================================================================
    # Produto A: Custo R$ 100, Markup 1.0 (100%) -> Venda R$ 200
    res_p1 = client.post("/produtos/", json={
        "nome": "Headset Gamer Pro",
        "sku": f"HEAD-{prefix}",
        "preco_custo": 100.0,
        "preco_venda": 200.0,
        "markup": 1.0,
        "codigo_barras": "7891112223334"
    }, headers=headers_dono)
    assert res_p1.status_code == 201
    prod1_id = res_p1.json()["id"]

    # Produto B: Custo R$ 40, Markup 1.5 -> Venda R$ 100
    res_p2 = client.post("/produtos/", json={
        "nome": "Mousepad RGB Extra Grande",
        "sku": f"MPAD-{prefix}",
        "preco_custo": 40.0,
        "preco_venda": 100.0,
        "markup": 1.5,
        "codigo_barras": "7894445556667"
    }, headers=headers_dono)
    assert res_p2.status_code == 201
    prod2_id = res_p2.json()["id"]

    # =========================================================================
    # PASSO 6: Entrada Física de Estoque na Matriz
    # =========================================================================
    client.post("/estoque/movimentar", json={
        "loja_id": matriz_id,
        "produto_id": prod1_id,
        "tipo": "ENTRADA",
        "quantidade": 20,
        "motivo": "Compra de lote inicial"
    }, headers=headers_dono)

    client.post("/estoque/movimentar", json={
        "loja_id": matriz_id,
        "produto_id": prod2_id,
        "tipo": "ENTRADA",
        "quantidade": 30,
        "motivo": "Compra de lote inicial"
    }, headers=headers_dono)

    # =========================================================================
    # PASSO 7: Transferência de Estoque Interlojas (Matriz -> Filial)
    # =========================================================================
    # Dono solicita transferência de 5 Headsets da Matriz para a Filial
    res_tr = client.post("/estoque/transferencias", json={
        "loja_origem_id": matriz_id,
        "loja_destino_id": filial_id,
        "produto_id": prod1_id,
        "quantidade": 5
    }, headers=headers_dono)
    assert res_tr.status_code == 201
    transferencia_id = res_tr.json()["id"]
    assert res_tr.json()["status"] == "SOLICITADO"

    # Despacho da mercadoria na Matriz
    res_despacho = client.post(f"/estoque/transferencias/{transferencia_id}/despachar", headers=headers_dono)
    assert res_despacho.status_code == 200
    assert res_despacho.json()["status"] == "DESPACHADO"

    # Recebimento conferido na Filial pelo Gerente
    res_receber = client.post(
        f"/estoque/transferencias/{transferencia_id}/receber",
        json={"quantidade_recebida": 5},
        headers=headers_gerente
    )
    assert res_receber.status_code == 200
    assert res_receber.json()["status"] == "RECEBIDO"

    # Verifica saldos: Matriz ficou com 15, Filial ficou com 5
    res_saldos_f = client.get("/estoque/saldos", headers=headers_gerente)
    s_filial = next(s for s in res_saldos_f.json() if s["produto_id"] == prod1_id and s["loja_id"] == filial_id)
    assert s_filial["quantidade"] == 5

    # =========================================================================
    # PASSO 8: Auditoria Física / Inventário Cego na Filial
    # =========================================================================
    # Contagem física de 5 Headsets na filial -> sem divergência
    res_audit = client.post("/estoque/auditar", json={
        "loja_id": filial_id,
        "itens": [
            {"produto_id": prod1_id, "quantidade_fisica": 5}
        ]
    }, headers=headers_gerente)
    assert res_audit.status_code == 201
    assert len(res_audit.json()["auditoria"]["itens"]) == 1

    # =========================================================================
    # PASSO 9: Cadastro de Cliente com Limite de Fiado (Crediário)
    # =========================================================================
    res_cli = client.post("/clientes/", json={
        "nome": "Beatriz Cliente",
        "email": f"beatriz_{prefix}@cliente.com",
        "documento": "11144477735",
        "limite_credito": 500.0
    }, headers=headers_dono)
    assert res_cli.status_code == 201
    cliente_id = res_cli.json()["id"]

    # =========================================================================
    # PASSO 10: Venda Balcão no PDV com Split Payment (Dinheiro R$ 50 + PIX R$ 150)
    # =========================================================================
    # 1 Headset Gamer (R$ 200) vendido na Filial
    res_venda_split = client.post("/vendas", json={
        "loja_id": filial_id,
        "desconto": 0.0,
        "itens": [
            {"produto_id": prod1_id, "quantidade": 1}
        ],
        "pagamentos": [
            {"forma_pagamento": "DINHEIRO", "valor": 50.0},
            {"forma_pagamento": "PIX", "valor": 150.0}
        ]
    }, headers=headers_gerente)
    assert res_venda_split.status_code == 201
    data_split = res_venda_split.json()
    assert data_split["forma_pagamento"] == "MULTIPLO"
    assert data_split["status"] == "PAGO"
    assert len(data_split["pagamentos"]) == 2

    # Saldo filial de Headsets caiu de 5 para 4
    res_saldos_pos = client.get("/estoque/saldos", headers=headers_gerente)
    s_pos = next(s for s in res_saldos_pos.json() if s["produto_id"] == prod1_id and s["loja_id"] == filial_id)
    assert s_pos["quantidade"] == 4

    # =========================================================================
    # PASSO 11: Venda Mista com Crediário Parcial (Cartão R$ 100 + Crediário R$ 100)
    # =========================================================================
    res_venda_cred = client.post("/vendas", json={
        "loja_id": filial_id,
        "cliente_id": cliente_id,
        "desconto": 0.0,
        "itens": [
            {"produto_id": prod1_id, "quantidade": 1}
        ],
        "pagamentos": [
            {"forma_pagamento": "CARTAO_CREDITO", "valor": 100.0},
            {"forma_pagamento": "CREDIARIO", "valor": 100.0}
        ]
    }, headers=headers_gerente)
    assert res_venda_cred.status_code == 201
    assert res_venda_cred.json()["status"] == "PENDENTE"
    venda_cred_id = res_venda_cred.json()["id"]

    # Saldo devedor do cliente deve ser exatamente R$ 100.0
    res_cli_check = client.get("/clientes/", headers=headers_dono)
    beatriz = next(c for c in res_cli_check.json() if c["id"] == cliente_id)
    assert beatriz["saldo_devedor_crediario"] == 100.0

    # =========================================================================
    # PASSO 12: Quitação / Recebimento de Fiado (Crediário)
    # =========================================================================
    # Beatriz vem pagar R$ 60 do seu saldo devedor
    res_rec = client.post(f"/clientes/{cliente_id}/receber-crediario", json={
        "loja_id": filial_id,
        "valor": 60.0
    }, headers=headers_gerente)
    assert res_rec.status_code == 200
    assert res_rec.json()["saldo_devedor_crediario"] == 40.0  # 100 - 60 = 40

    # =========================================================================
    # PASSO 13: Operações de Caixa (Sangria & Despesa Operacional)
    # =========================================================================
    # Registro de despesa / sangria de caixa de R$ 50
    res_desp = client.post("/financeiro/despesas", json={
        "loja_id": filial_id,
        "valor": 50.0,
        "categoria": "Sangria de Caixa / Cofre",
        "status_pagamento": "PAGO"
    }, headers=headers_gerente)
    assert res_desp.status_code == 201

    # =========================================================================
    # PASSO 14: Estorno de Venda PDV (Reversão de Estoque e Ajuste no Fiado)
    # =========================================================================
    # Estorno da venda que tinha R$ 100 no crediário
    res_estorno = client.post(f"/vendas/{venda_cred_id}/estornar", headers=headers_gerente)
    assert res_estorno.status_code == 200
    assert res_estorno.json()["status"] == "CANCELADA"

    # Headsets na filial voltaram para 4 (3 + 1 devolvido)
    res_saldos_est = client.get("/estoque/saldos", headers=headers_gerente)
    s_est = next(s for s in res_saldos_est.json() if s["produto_id"] == prod1_id and s["loja_id"] == filial_id)
    assert s_est["quantidade"] == 4

    # Saldo devedor do cliente voltou a zero (era 40, deduz 100 -> min 0)
    res_cli_pos = client.get("/clientes/", headers=headers_dono)
    beatriz_pos = next(c for c in res_cli_pos.json() if c["id"] == cliente_id)
    assert beatriz_pos["saldo_devedor_crediario"] == 0.0

    # =========================================================================
    # PASSO 15: BI & Analytics (Dashboard e Curva ABC de Pareto)
    # =========================================================================
    res_dash = client.get(f"/analytics/dashboard?loja_id={filial_id}", headers=headers_gerente)
    assert res_dash.status_code == 200
    dash_data = res_dash.json()
    assert "faturamento_bruto" in dash_data
    assert "ticket_medio" in dash_data
    assert "estoque_critico_count" in dash_data

    res_abc = client.get(f"/analytics/curva-abc?loja_id={filial_id}", headers=headers_gerente)
    assert res_abc.status_code == 200
    abc_itens = res_abc.json()["itens"]
    assert len(abc_itens) >= 1
    assert abc_itens[0]["classe"] in ("A", "B", "C")

    # =========================================================================
    # PASSO 16: Teste de Vazamento Multi-Tenant (SaaS Leakage Isolation)
    # =========================================================================
    # Cria uma segunda empresa completamente independente (Tenant Concorrente)
    email_concorrente = f"concorrente_{prefix}@outro.com"
    client.post("/auth/register", json={
        "nome_fantasia": f"Loja Inimiga {prefix}",
        "razao_social": f"Loja Inimiga S/A {prefix}",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Inimigo",
        "dono_email": email_concorrente,
        "dono_senha": senha_padrao
    })
    res_login_c = client.post("/auth/login", json={"email": email_concorrente, "senha": senha_padrao})
    token_concorrente = res_login_c.json()["access_token"]
    headers_concorrente = {"Authorization": f"Bearer {token_concorrente}"}

    # O concorrente NUNCA pode ver os produtos da primeira empresa
    res_prod_c = client.get("/produtos/", headers=headers_concorrente)
    assert res_prod_c.status_code == 200
    assert len(res_prod_c.json()) == 0, "Vazamento de dados! Concorrente viu produtos de outro tenant."

    # O concorrente NUNCA pode ver o cliente da primeira empresa
    res_cli_c = client.get("/clientes/", headers=headers_concorrente)
    assert res_cli_c.status_code == 200
    assert len(res_cli_c.json()) == 0, "Vazamento de dados! Concorrente viu clientes de outro tenant."

    # O concorrente NUNCA pode ver as vendas da primeira empresa
    res_vendas_c = client.get("/vendas", headers=headers_concorrente)
    assert res_vendas_c.status_code == 200
    assert len(res_vendas_c.json()) == 0, "Vazamento de dados! Concorrente viu vendas de outro tenant."
