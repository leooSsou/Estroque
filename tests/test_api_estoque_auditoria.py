from uuid import uuid4

from fastapi.testclient import TestClient

# CNPJs matematicamente válidos
CNPJ_TENANT = "67.827.595/0001-24"
CNPJ_LOJA = "19.808.022/0001-00"

def registrar_e_autenticar(client: TestClient, prefix: str, cnpj: str) -> str:
    client.post("/auth/register", json={
        "nome_fantasia": f"{prefix} Rede",
        "razao_social": f"{prefix} Razao Social S/A",
        "cnpj": cnpj,
        "dono_nome": f"Dono {prefix}",
        "dono_email": f"{prefix.lower()}@email.com",
        "dono_senha": "senha_segura_123"
    })
    
    login = client.post("/auth/login", json={
        "email": f"{prefix.lower()}@email.com",
        "senha": "senha_segura_123"
    })
    return login.json()["access_token"]


def test_api_auditar_estoque_sucesso(client: TestClient):
    token = registrar_e_autenticar(client, "AuditTenant", CNPJ_TENANT)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Audit",
        "cnpj": CNPJ_LOJA,
        "endereco": "Rua Audit, 100"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # 2. Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Cerveja Artesanal",
        "sku": "CERV-01",
        "preco_custo": 10.0,
        "preco_venda": 18.0,
        "markup": 0.8
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    # 3. Adiciona estoque inicial (ex: 15 unidades)
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 15,
        "motivo": "Estoque inicial"
    }, headers=headers)

    # 4. Executa auditoria física informando que contou 10 unidades (perda de 5)
    payload = {
        "loja_id": loja_id,
        "itens": [
            {
                "produto_id": produto_id,
                "quantidade_fisica": 10
            }
        ]
    }
    response = client.post("/estoque/auditar", json=payload, headers=headers)
    assert response.status_code == 201
    
    data = response.json()
    assert "auditoria" in data
    assert "movimentacoes_geradas" in data
    assert len(data["movimentacoes_geradas"]) == 1
    assert data["movimentacoes_geradas"][0]["tipo"] == "SAIDA"
    assert data["movimentacoes_geradas"][0]["quantidade"] == 5

    # 5. Verifica se saldo de estoque foi corrigido para 10 no banco
    res_saldos = client.get("/estoque/saldos", headers=headers)
    assert res_saldos.status_code == 200
    saldos = res_saldos.json()
    assert len(saldos) == 1
    assert saldos[0]["quantidade"] == 10


def test_api_auditar_estoque_loja_ou_produto_inexistente(client: TestClient):
    token = registrar_e_autenticar(client, "AuditTenant2", "81.477.811/0001-80")
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "loja_id": str(uuid4()),
        "itens": [
            {
                "produto_id": str(uuid4()),
                "quantidade_fisica": 10
            }
        ]
    }
    
    response = client.post("/estoque/auditar", json=payload, headers=headers)
    assert response.status_code == 404
    assert "não foi encontrada" in response.json()["detail"] or "não foi encontrado" in response.json()["detail"]


def test_api_auditar_estoque_valida_quantidade_negativa(client: TestClient):
    token = registrar_e_autenticar(client, "AuditTenant3", "94.686.599/0001-02")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "loja_id": str(uuid4()),
        "itens": [
            {
                "produto_id": str(uuid4()),
                "quantidade_fisica": -5
            }
        ]
    }
    
    response = client.post("/estoque/auditar", json=payload, headers=headers)
    assert response.status_code == 422
