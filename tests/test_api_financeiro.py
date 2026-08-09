import pytest
import random
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from datetime import datetime
from src.infrastructure.database.models import TenantModel, LojaModel, UsuarioModel
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
        print(f"\nREGISTRATION FAILED: {res_reg.status_code} - {res_reg.text}")
        raise ValueError(f"Registration failed: {res_reg.text}")

    tenant_id = res_reg.json()["tenant_id"]
    
    login = client.post("/auth/login", json={
        "email": f"{prefix.lower()}@email.com",
        "senha": "senha_segura_123"
    })
    return login.json()["access_token"], tenant_id


def test_registrar_despesa_sucesso(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "FinA")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Matriz",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Av Paulista, 100"
    }, headers=headers)
    assert res_loja.status_code == 201
    loja_id = res_loja.json()["id"]

    # 2. Registrar Despesa
    res_despesa = client.post("/financeiro/despesas", json={
        "loja_id": loja_id,
        "valor": 450.00,
        "categoria": "Conta de Luz",
        "status_pagamento": "PAGO",
        "data_pagamento": datetime.utcnow().isoformat()
    }, headers=headers)

    assert res_despesa.status_code == 201
    despesa = res_despesa.json()
    assert despesa["tipo"] == "DESPESA"
    assert despesa["valor"] == 450.00
    assert despesa["categoria"] == "Conta de Luz"
    assert despesa["status_pagamento"] == "PAGO"


def test_listar_lancamentos_com_filtros(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "FinB")
    headers = {"Authorization": f"Bearer {token}"}

    res_loja = client.post("/lojas/", json={
        "nome": "Loja B1",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Rua das Flores, 50"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # Registrar despesas
    client.post("/financeiro/despesas", json={
        "loja_id": loja_id,
        "valor": 120.00,
        "categoria": "Internet",
        "status_pagamento": "PAGO"
    }, headers=headers)

    client.post("/financeiro/despesas", json={
        "loja_id": loja_id,
        "valor": 2000.00,
        "categoria": "Aluguel",
        "status_pagamento": "PENDENTE"
    }, headers=headers)

    # Listar sem filtros
    res_list = client.get("/financeiro/lancamentos", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 2

    # Filtrar por tipo
    res_tipo = client.get(f"/financeiro/lancamentos?tipo=DESPESA", headers=headers)
    assert len(res_tipo.json()) == 2

    # Filtrar por receita (deve estar vazia)
    res_receita = client.get(f"/financeiro/lancamentos?tipo=RECEITA", headers=headers)
    assert len(res_receita.json()) == 0


def test_integracao_caixa_vendas(client: TestClient) -> None:
    token, _ = registrar_e_autenticar(client, "FinC")
    headers = {"Authorization": f"Bearer {token}"}

    # Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja C1",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Av Brasil, 500"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Monitor Gamer",
        "sku": f"MON-{uuid4().hex[:4]}",
        "preco_custo": 800.0,
        "preco_venda": 1200.0,
        "markup": 0.5
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    # Dar entrada no estoque
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Compra inicial"
    }, headers=headers)

    # Criar Cliente com CPF Válido ("12345678909")
    res_cli = client.post("/clientes/", json={
        "nome": "Carlos Silva",
        "email": "carlos@teste.com",
        "documento": "12345678909",
        "limite_credito": 5000.0
    }, headers=headers)
    assert res_cli.status_code == 201
    cliente_id = res_cli.json()["id"]

    # 1. Registrar Venda Administrativa à vista (PIX)
    res_venda_pix = client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "desconto": 200.0,
        "itens": [{"produto_id": produto_id, "quantidade": 1}]
    }, headers=headers)
    assert res_venda_pix.status_code == 201

    # Verificar se gerou RECEITA com status PAGO de R$ 1000.00
    res_caixa_1 = client.get(f"/financeiro/lancamentos?loja_id={loja_id}&tipo=RECEITA", headers=headers)
    assert len(res_caixa_1.json()) == 1
    receita_pix = res_caixa_1.json()[0]
    assert receita_pix["valor"] == 1000.00
    assert receita_pix["status_pagamento"] == "PAGO"
    assert receita_pix["categoria"] == "Venda de Produtos"

    # 2. Registrar Venda Administrativa em Crediário (Status PENDENTE)
    res_venda_cred = client.post("/vendas", json={
        "loja_id": loja_id,
        "cliente_id": cliente_id,
        "forma_pagamento": "CREDIARIO",
        "desconto": 0.0,
        "itens": [{"produto_id": produto_id, "quantidade": 2}]
    }, headers=headers)
    assert res_venda_cred.status_code == 201

    # Verificar se gerou uma nova RECEITA com status PENDENTE de R$ 2400.00
    res_caixa_2 = client.get(f"/financeiro/lancamentos?loja_id={loja_id}&tipo=RECEITA", headers=headers)
    assert len(res_caixa_2.json()) == 2
    # Filtrando para pegar a venda do crediário (valor 2400.00)
    receita_cred = [r for r in res_caixa_2.json() if r["valor"] == 2400.00][0]
    assert receita_cred["status_pagamento"] == "PENDENTE"


def test_financeiro_bola_gerente_lojas_diferentes(client: TestClient, db_session: Session) -> None:
    token_dono, tenant_id = registrar_e_autenticar(client, "BolaTenant")
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    # Criar Loja A e Loja B
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

    # Inserir Gerente da Loja A diretamente no DB com IDs convertidos para objetos UUID
    gerente_a = UsuarioModel(
        nome="Gerente Loja A",
        email="gerentea@bolatest.com",
        senha_hash="hash",
        role="GERENTE",
        tenant_id=UUID(tenant_id),
        loja_atribuida_id=UUID(loja_a_id)
    )
    db_session.add(gerente_a)
    db_session.commit()

    # Gerar token para o Gerente A
    token_gerente = criar_token_acesso(
        sub=str(gerente_a.id),
        tenant_id=str(tenant_id),
        role="GERENTE"
    )
    headers_gerente = {"Authorization": f"Bearer {token_gerente}"}

    # 1. Gerente A tenta registrar despesa para Loja B -> deve falhar (403)
    res_err = client.post("/financeiro/despesas", json={
        "loja_id": loja_b_id,
        "valor": 100.00,
        "categoria": "Suprimentos",
        "status_pagamento": "PAGO"
    }, headers=headers_gerente)
    assert res_err.status_code == 403

    # 2. Gerente A tenta listar lançamentos especificando Loja B -> deve falhar (403)
    res_err_list = client.get(f"/financeiro/lancamentos?loja_id={loja_b_id}", headers=headers_gerente)
    assert res_err_list.status_code == 403

    # 3. Gerente A lista lançamentos sem especificar loja -> deve retornar apenas lançamentos da Loja A
    # Registrar uma despesa na Loja A usando dono
    client.post("/financeiro/despesas", json={
        "loja_id": loja_a_id,
        "valor": 150.00,
        "categoria": "Papelaria Loja A",
        "status_pagamento": "PAGO"
    }, headers=headers_dono)

    # Registrar uma despesa na Loja B usando dono
    client.post("/financeiro/despesas", json={
        "loja_id": loja_b_id,
        "valor": 200.00,
        "categoria": "Manutenção Loja B",
        "status_pagamento": "PAGO"
    }, headers=headers_dono)

    # Gerente A busca todos os lançamentos
    res_list_gerente = client.get("/financeiro/lancamentos", headers=headers_gerente)
    assert res_list_gerente.status_code == 200
    lancamentos_vistos = res_list_gerente.json()
    
    # Gerente A deve ver apenas 1 lançamento (da Loja A)
    assert len(lancamentos_vistos) == 1
    assert lancamentos_vistos[0]["categoria"] == "Papelaria Loja A"
    assert lancamentos_vistos[0]["loja_id"] == loja_a_id
