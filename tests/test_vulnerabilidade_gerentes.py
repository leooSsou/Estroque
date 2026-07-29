import pytest
from fastapi.testclient import TestClient
from datetime import timedelta
from src.infrastructure.database.models import TenantModel, UsuarioModel, LojaModel, ProdutoModel, EstoqueSaldoModel
from src.infrastructure.security.jwt_handler import criar_token_acesso

def setup_dados_gerentes(db):
    db.info["ignore_tenant_filter"] = True
    
    # 1. Tenant
    tenant = TenantModel(nome_fantasia="Tenant G", razao_social="Tenant G Ltda", cnpj="12345678000195")
    db.add(tenant)
    db.commit()
    
    # 2. Lojas
    loja_a = LojaModel(nome="Loja A", cnpj="12345678000101", endereco="Endereco A", tenant_id=tenant.id)
    loja_b = LojaModel(nome="Loja B", cnpj="12345678000102", endereco="Endereco B", tenant_id=tenant.id)
    loja_c = LojaModel(nome="Loja C", cnpj="12345678000103", endereco="Endereco C", tenant_id=tenant.id)
    db.add_all([loja_a, loja_b, loja_c])
    db.commit()
    
    # 3. Gerente para Loja A
    gerente_a = UsuarioModel(
        nome="Gerente A",
        email="gerentea@test.com",
        senha_hash="$2b$12$K.F7P6Y92YFzB415t9.6.eP0t1pCpeo4rVj1/rXpLg.xLgH9N4tN2", # "senha123"
        role="GERENTE",
        tenant_id=tenant.id,
        loja_atribuida_id=loja_a.id
    )
    # Dono do tenant
    dono = UsuarioModel(
        nome="Dono",
        email="dono@test.com",
        senha_hash="$2b$12$K.F7P6Y92YFzB415t9.6.eP0t1pCpeo4rVj1/rXpLg.xLgH9N4tN2",
        role="DONO",
        tenant_id=tenant.id
    )
    db.add_all([gerente_a, dono])
    db.commit()
    
    # 4. Produto
    produto = ProdutoModel(
        nome="Produto G",
        sku="PROD-G",
        preco_custo=10.0,
        preco_venda=15.0,
        markup=0.5,
        tenant_id=tenant.id
    )
    db.add(produto)
    db.commit()

    # Salva os IDs puros antes de limpar o bypass
    tenant_id = tenant.id
    loja_a_id = loja_a.id
    loja_b_id = loja_b.id
    loja_c_id = loja_c.id
    gerente_a_id = gerente_a.id
    dono_id = dono.id
    produto_id = produto.id
    
    db.info["ignore_tenant_filter"] = False
    return tenant_id, loja_a_id, loja_b_id, loja_c_id, gerente_a_id, dono_id, produto_id


def test_gerente_movimentacao_bloqueada_loja_diferente(client: TestClient, db_session):
    """
    Garante que um gerente não consiga movimentar estoque de outra loja.
    """
    tenant_id, loja_a_id, loja_b_id, loja_c_id, gerente_a_id, dono_id, produto_id = setup_dados_gerentes(db_session)
    
    token = criar_token_acesso(sub=str(gerente_a_id), tenant_id=str(tenant_id), role="GERENTE")
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.post("/estoque/movimentar", json={
        "loja_id": str(loja_b_id),
        "produto_id": str(produto_id),
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Tentativa de movimentacao em loja alheia"
    }, headers=headers)
    
    assert res.status_code == 403
    assert "permissão" in res.json()["detail"].lower()


def test_gerente_saldos_filtrados(client: TestClient, db_session):
    """
    Garante que a listagem de saldos para gerente exiba apenas itens de sua filial atribuída.
    """
    tenant_id, loja_a_id, loja_b_id, loja_c_id, gerente_a_id, dono_id, produto_id = setup_dados_gerentes(db_session)
    
    db_session.info["ignore_tenant_filter"] = True
    saldo_a = EstoqueSaldoModel(loja_id=loja_a_id, produto_id=produto_id, quantidade=5, tenant_id=tenant_id)
    saldo_b = EstoqueSaldoModel(loja_id=loja_b_id, produto_id=produto_id, quantidade=8, tenant_id=tenant_id)
    db_session.add_all([saldo_a, saldo_b])
    db_session.commit()
    db_session.info["ignore_tenant_filter"] = False
    
    token = criar_token_acesso(sub=str(gerente_a_id), tenant_id=str(tenant_id), role="GERENTE")
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.get("/estoque/saldos", headers=headers)
    assert res.status_code == 200
    saldos = res.json()
    
    assert len(saldos) == 1
    assert saldos[0]["loja_id"] == str(loja_a_id)
    assert saldos[0]["quantidade"] == 5


def test_gerente_transferencias_bloqueadas_lojas_alheias(client: TestClient, db_session):
    """
    Garante que um gerente não consiga solicitar transferências que não envolvam sua loja.
    """
    tenant_id, loja_a_id, loja_b_id, loja_c_id, gerente_a_id, dono_id, produto_id = setup_dados_gerentes(db_session)
    
    token = criar_token_acesso(sub=str(gerente_a_id), tenant_id=str(tenant_id), role="GERENTE")
    headers = {"Authorization": f"Bearer {token}"}
    
    res = client.post("/estoque/transferencias", json={
        "loja_origem_id": str(loja_b_id),
        "loja_destino_id": str(loja_c_id),
        "produto_id": str(produto_id),
        "quantidade": 2
    }, headers=headers)
    
    assert res.status_code == 403
    assert "vinculadas à sua loja" in res.json()["detail"].lower()
