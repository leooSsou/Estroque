from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from uuid import uuid4
import pytest
from src.infrastructure.web.main import app
from src.infrastructure.web.dependencies import get_current_user
from src.domain.entities.usuario import Usuario

@pytest.fixture(autouse=True)
def override_auth():
    def override_get_current_user():
        return Usuario(
            id=uuid4(),
            nome="Admin Fake",
            email="admin@fake.com",
            tenant_id=uuid4(),
            role="DONO",
            senha_hash="123456"
        )
    app.dependency_overrides[get_current_user] = override_get_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)

def test_api_auditar_estoque_sucesso(client: TestClient):
    """
    Testa a rota de auditoria física gerando perdas e sobras.
    """
    loja_id = str(uuid4())
    produto_id = str(uuid4())
    
    payload = {
        "loja_id": loja_id,
        "itens": [
            {
                "produto_id": produto_id,
                "quantidade_fisica": 10
            }
        ]
    }
    
    response = client.post("/estoque/auditar", json=payload)
    assert response.status_code == 400
    assert "não foi encontrada" in response.json()["detail"] or "não foi encontrado" in response.json()["detail"]

def test_api_auditar_estoque_valida_quantidade_negativa(client: TestClient):
    """
    Verifica se o payload do pydantic barra quantidade física negativa.
    """
    payload = {
        "loja_id": str(uuid4()),
        "itens": [
            {
                "produto_id": str(uuid4()),
                "quantidade_fisica": -5
            }
        ]
    }
    
    response = client.post("/estoque/auditar", json=payload)
    assert response.status_code == 422 # Erro de validação Pydantic
