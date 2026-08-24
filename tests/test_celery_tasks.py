from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from src.infrastructure.services.email_service import ConsoleEmailService
from src.infrastructure.tasks.fechamento_diario import enviar_fechamento_diario_todos_tenants
from tests.test_api_analytics import gerar_cnpj_valido, registrar_e_autenticar


def test_celery_task_fechamento_diario(client: TestClient, db_session: Session) -> None:
    # 1. Limpa os e-mails enviados
    ConsoleEmailService.emails_enviados.clear()

    # 2. Registrar um inquilino e dono
    token, tenant_id = registrar_e_autenticar(client, "CeleryTenant")
    headers = {"Authorization": f"Bearer {token}"}

    # Criar Loja
    res_loja = client.post("/lojas/", json={
        "nome": "Loja Centro",
        "cnpj": gerar_cnpj_valido(),
        "endereco": "Rua das Acacias, 12"
    }, headers=headers)
    loja_id = res_loja.json()["id"]

    # Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Notebook Pro",
        "sku": f"SKU-{uuid4().hex[:4]}",
        "preco_custo": 3000.00,
        "preco_venda": 5000.00,
        "markup": 0.67
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    # Aprovisionar Estoque
    client.post("/estoque/movimentar", json={
        "loja_id": loja_id,
        "produto_id": produto_id,
        "tipo": "ENTRADA",
        "quantidade": 10,
        "motivo": "Estoque Inicial"
    }, headers=headers)

    # Realizar Venda
    client.post("/vendas", json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "itens": [
            {"produto_id": produto_id, "quantidade": 1}
        ]
    }, headers=headers)

    # 3. Executa a tarefa Celery de fechamento diário
    resultado = enviar_fechamento_diario_todos_tenants(db=db_session)
    
    # 4. Assegura que o resultado indica processamento
    assert "Processado fechamento" in resultado

    # 5. Verifica se o e-mail foi disparado para o dono
    assert len(ConsoleEmailService.emails_enviados) >= 1
    
    email_do_dono = "celerytenant@email.com"
    emails_filtrados = [e for e in ConsoleEmailService.emails_enviados if e["destinatario"] == email_do_dono]
    
    assert len(emails_filtrados) == 1
    email = emails_filtrados[0]
    assert "Fechamento Diário" in email["assunto"]
    assert "Faturamento Líquido:" in email["html_content"]
    assert "R$ 5000.00" in email["html_content"]
