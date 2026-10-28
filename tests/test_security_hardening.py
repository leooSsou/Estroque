import io
import os
import random
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


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


def test_brecha_1_escalacao_privilegios_bloqueada(client: TestClient):
    """
    Dono de tenant NÃO pode criar usuário com perfil ADMIN_SAAS.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_{prefix}@varejo.com"
    senha = "senha_segura_123"

    res_reg = client.post("/auth/register", json={
        "nome_fantasia": f"Varejo {prefix}",
        "razao_social": f"Varejo S/A {prefix}",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Carlos Dono",
        "dono_email": email_dono,
        "dono_senha": senha
    })
    assert res_reg.status_code == 201

    res_login = client.post("/auth/login", json={"email": email_dono, "senha": senha})
    token_dono = res_login.json()["access_token"]
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    # Tentativa maliciosa: Dono tenta criar um ADMIN_SAAS
    res_hack = client.post("/auth/usuarios", json={
        "nome": "Hacker Admin",
        "email": f"hacker_{prefix}@varejo.com",
        "senha": senha,
        "role": "ADMIN_SAAS"
    }, headers=headers_dono)

    assert res_hack.status_code == 403
    assert "super-administradores" in res_hack.json()["detail"]


def test_brecha_2_gerente_nao_pode_criar_nem_editar_lojas(client: TestClient):
    """
    Gerente de filial não tem permissão para cadastrar novas lojas nem editar lojas existentes.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_{prefix}@varejo.com"
    senha = "senha_segura_123"

    client.post("/auth/register", json={
        "nome_fantasia": f"Varejo {prefix}",
        "razao_social": f"Varejo S/A {prefix}",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Carlos Dono",
        "dono_email": email_dono,
        "dono_senha": senha
    })
    res_login = client.post("/auth/login", json={"email": email_dono, "senha": senha})
    token_dono = res_login.json()["access_token"]
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    # Dono cria Matriz
    res_m = client.post("/lojas/", json={
        "nome": "Loja Matriz",
        "cnpj": gerar_cnpj(),
        "endereco": "Rua 1"
    }, headers=headers_dono)
    matriz_id = res_m.json()["id"]

    # Dono cria Gerente alocado na Matriz
    email_g = f"gerente_{prefix}@varejo.com"
    client.post("/auth/usuarios", json={
        "nome": "Gerente Silva",
        "email": email_g,
        "senha": senha,
        "role": "GERENTE",
        "loja_atribuida_id": matriz_id
    }, headers=headers_dono)

    res_login_g = client.post("/auth/login", json={"email": email_g, "senha": senha})
    headers_g = {"Authorization": f"Bearer {res_login_g.json()['access_token']}"}

    # Gerente tenta criar nova loja -> BLOQUEADO 403
    res_hack_create = client.post("/lojas/", json={
        "nome": "Filial Fraudulenta",
        "cnpj": gerar_cnpj(),
        "endereco": "Rua 2"
    }, headers=headers_g)
    assert res_hack_create.status_code == 403

    # Gerente tenta editar a matriz -> BLOQUEADO 403
    res_hack_update = client.put(f"/lojas/{matriz_id}", json={
        "nome": "Loja Matriz Hackeada",
        "endereco": "Novo Endereço",
        "ativo": True
    }, headers=headers_g)
    assert res_hack_update.status_code == 403


def test_brecha_3_inversao_de_papeis_transferencia_bloqueada(client: TestClient):
    """
    Gerente da loja de destino NÃO pode despachar pela loja de origem.
    Gerente da loja de origem NÃO pode confirmar recebimento pela loja de destino.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_{prefix}@varejo.com"
    senha = "senha_segura_123"

    client.post("/auth/register", json={
        "nome_fantasia": f"Varejo {prefix}",
        "razao_social": f"Varejo S/A {prefix}",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Carlos Dono",
        "dono_email": email_dono,
        "dono_senha": senha
    })
    res_login = client.post("/auth/login", json={"email": email_dono, "senha": senha})
    token_dono = res_login.json()["access_token"]
    headers_dono = {"Authorization": f"Bearer {token_dono}"}

    # Cria Matriz e Filial
    res_m = client.post("/lojas/", json={"nome": "Matriz", "cnpj": gerar_cnpj(), "endereco": "E1"}, headers=headers_dono)
    matriz_id = res_m.json()["id"]

    res_f = client.post("/lojas/", json={"nome": "Filial", "cnpj": gerar_cnpj(), "endereco": "E2"}, headers=headers_dono)
    filial_id = res_f.json()["id"]

    # Cria Gerente da Filial (Destino)
    email_dest = f"gerente_dest_{prefix}@varejo.com"
    client.post("/auth/usuarios", json={
        "nome": "Gerente Destino",
        "email": email_dest,
        "senha": senha,
        "role": "GERENTE",
        "loja_atribuida_id": filial_id
    }, headers=headers_dono)
    res_login_dest = client.post("/auth/login", json={"email": email_dest, "senha": senha})
    headers_dest = {"Authorization": f"Bearer {res_login_dest.json()['access_token']}"}

    # Cria Gerente da Matriz (Origem)
    email_orig = f"gerente_orig_{prefix}@varejo.com"
    client.post("/auth/usuarios", json={
        "nome": "Gerente Origem",
        "email": email_orig,
        "senha": senha,
        "role": "GERENTE",
        "loja_atribuida_id": matriz_id
    }, headers=headers_dono)
    res_login_orig = client.post("/auth/login", json={"email": email_orig, "senha": senha})
    headers_orig = {"Authorization": f"Bearer {res_login_orig.json()['access_token']}"}

    # Cria Produto e abastece Matriz
    res_p = client.post("/produtos/", json={
        "nome": f"Item {prefix}",
        "sku": f"SKU-{prefix}",
        "preco_custo": 50.0,
        "preco_venda": 100.0,
        "markup": 1.0
    }, headers=headers_dono)
    assert res_p.status_code == 201
    prod_id = res_p.json()["id"]

    client.post("/estoque/movimentar", json={
        "produto_id": prod_id,
        "loja_id": matriz_id,
        "tipo": "ENTRADA",
        "quantidade": 20,
        "motivo": "Abastecimento Matriz"
    }, headers=headers_dono)

    # Solicita Transferência (Matriz -> Filial)
    res_solic = client.post("/estoque/transferencias", json={
        "loja_origem_id": matriz_id,
        "loja_destino_id": filial_id,
        "produto_id": prod_id,
        "quantidade": 5
    }, headers=headers_dest)
    assert res_solic.status_code == 201
    transf_id = res_solic.json()["id"]

    # Gerente da FILIAL (destino) tenta despachar pela MATRIZ (origem) -> BLOQUEADO 403!
    res_hack_desp = client.post(f"/estoque/transferencias/{transf_id}/despachar", headers=headers_dest)
    assert res_hack_desp.status_code == 403

    # Gerente da MATRIZ despacha com sucesso
    res_ok_desp = client.post(f"/estoque/transferencias/{transf_id}/despachar", headers=headers_orig)
    assert res_ok_desp.status_code == 200

    # Gerente da MATRIZ (origem) tenta confirmar recebimento pela FILIAL (destino) -> BLOQUEADO 403!
    res_hack_rec = client.post(f"/estoque/transferencias/{transf_id}/receber", json={
        "quantidade_recebida": 5
    }, headers=headers_orig)
    assert res_hack_rec.status_code == 403

    # Gerente da FILIAL recebe com sucesso
    res_ok_rec = client.post(f"/estoque/transferencias/{transf_id}/receber", json={
        "quantidade_recebida": 5
    }, headers=headers_dest)
    assert res_ok_rec.status_code == 200


def test_brecha_4_jwt_secret_obrigatorio_em_producao():
    """
    Em ambiente de produção, chave ausente ou chave default de dev lança exceção.
    """
    from src.infrastructure.security import jwt_handler

    with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET_KEY": ""}):
        with pytest.raises(RuntimeError, match="JWT_SECRET_KEY é obrigatória em ambiente de produção"):
            import importlib
            importlib.reload(jwt_handler)

    with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET_KEY": "saas_super_secret_dev_key_12345!"}):
        with pytest.raises(RuntimeError, match="não pode ser usada em produção"):
            import importlib
            importlib.reload(jwt_handler)

    # Restaura módulo em dev
    with patch.dict(os.environ, {"ENVIRONMENT": "development", "JWT_SECRET_KEY": "saas_super_secret_dev_key_12345!"}):
        import importlib
        importlib.reload(jwt_handler)


def test_brecha_5_limite_tamanho_payload_xml(client: TestClient):
    """
    Upload de arquivo XML superior a 5MB deve retornar HTTP 413 Payload Too Large.
    """
    prefix = random.randint(100000, 999999)
    email_dono = f"dono_{prefix}@varejo.com"
    senha = "senha_segura_123"

    client.post("/auth/register", json={
        "nome_fantasia": f"Varejo {prefix}",
        "razao_social": f"Varejo S/A {prefix}",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Carlos Dono",
        "dono_email": email_dono,
        "dono_senha": senha
    })
    res_login = client.post("/auth/login", json={"email": email_dono, "senha": senha})
    headers_dono = {"Authorization": f"Bearer {res_login.json()['access_token']}"}

    # Cria arquivo simulado de 5.2 MB
    xml_grande = b"<nfeProc>" + (b"A" * (5 * 1024 * 1024 + 200)) + b"</nfeProc>"
    files = {"file": ("nfe_gigante.xml", io.BytesIO(xml_grande), "application/xml")}

    res = client.post("/estoque/importar-xml", files=files, headers=headers_dono)
    assert res.status_code == 413
    assert "excede o tamanho máximo permitido" in res.json()["detail"]
