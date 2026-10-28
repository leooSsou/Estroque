import random
from uuid import UUID, uuid4

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.infrastructure.database.models import UsuarioModel
from src.infrastructure.security.jwt_handler import criar_token_acesso


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
def superadmin_setup(client: TestClient, db_session):
    prefix = random.randint(100000, 999999)
    email_admin = f"superadmin_{prefix}@estroque.com"
    senha = "admin_password_123"

    res_reg = client.post("/auth/register", json={
        "nome_fantasia": f"Plataforma Matriz {prefix}",
        "razao_social": f"Plataforma Central {prefix} Ltda",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Super Administrador",
        "dono_email": email_admin,
        "dono_senha": senha
    })
    assert res_reg.status_code == 201, res_reg.text
    tenant_admin_id = res_reg.json()["tenant_id"]
    admin_id = res_reg.json()["dono_id"]

    # Promove o usuário diretamente no banco para ADMIN_SAAS
    db_session.info["ignore_tenant_filter"] = True
    user_db = db_session.query(UsuarioModel).filter(UsuarioModel.id == UUID(admin_id)).first()
    user_db.role = "ADMIN_SAAS"
    db_session.commit()
    db_session.info.pop("ignore_tenant_filter", None)

    token = criar_token_acesso(sub=str(admin_id), tenant_id=str(tenant_admin_id), role="ADMIN_SAAS")
    admin_headers = {"Authorization": f"Bearer {token}"}

    return {
        "admin_headers": admin_headers,
        "admin_id": admin_id,
        "admin_email": email_admin,
        "admin_senha": senha,
        "tenant_admin_id": tenant_admin_id,
    }


@pytest.fixture
def cliente_tenant_setup(client: TestClient):
    prefix = random.randint(100000, 999999)
    email = f"cliente_{prefix}@empresa.com"
    senha = "cliente_pass_123"

    res = client.post("/auth/register", json={
        "nome_fantasia": f"Loja Cliente {prefix}",
        "razao_social": f"Empresa Cliente {prefix} Ltda",
        "cnpj": gerar_cnpj(),
        "dono_nome": "Cliente Dono",
        "dono_email": email,
        "dono_senha": senha
    })
    assert res.status_code == 201, res.text
    tenant_id = res.json()["tenant_id"]
    dono_id = res.json()["dono_id"]

    login_res = client.post("/auth/login", json={"email": email, "senha": senha})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    return {
        "tenant_id": tenant_id,
        "dono_id": dono_id,
        "email": email,
        "senha": senha,
        "headers": {"Authorization": f"Bearer {token}"},
    }


def test_superadmin_controle_acesso_rbac(client: TestClient, superadmin_setup, cliente_tenant_setup):
    admin_headers = superadmin_setup["admin_headers"]
    cliente_headers = cliente_tenant_setup["headers"]

    # 1. Requisição não autenticada deve retornar 401
    res_sem_auth = client.get("/admin/dashboard")
    assert res_sem_auth.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Usuário DONO comum deve receber 403 Forbidden
    res_dono = client.get("/admin/dashboard", headers=cliente_headers)
    assert res_dono.status_code == status.HTTP_403_FORBIDDEN

    # 3. Super Admin deve receber 200 OK
    res_admin = client.get("/admin/dashboard", headers=admin_headers)
    assert res_admin.status_code == status.HTTP_200_OK
    assert "total_tenants" in res_admin.json()


def test_superadmin_listar_e_filtrar_tenants(client: TestClient, superadmin_setup, cliente_tenant_setup):
    admin_headers = superadmin_setup["admin_headers"]
    tenant_id = cliente_tenant_setup["tenant_id"]

    # Lista todos os tenants
    res = client.get("/admin/tenants", headers=admin_headers)
    assert res.status_code == status.HTTP_200_OK
    tenants = res.json()
    assert len(tenants) >= 2
    assert any(t["id"] == tenant_id for t in tenants)

    # Detalhe de um tenant
    res_detalhe = client.get(f"/admin/tenants/{tenant_id}", headers=admin_headers)
    assert res_detalhe.status_code == status.HTTP_200_OK
    assert res_detalhe.json()["id"] == tenant_id

    # Tenant inexistente
    res_404 = client.get(f"/admin/tenants/{uuid4()}", headers=admin_headers)
    assert res_404.status_code == status.HTTP_404_NOT_FOUND


def test_superadmin_suspender_e_reativar_tenant(client: TestClient, superadmin_setup, cliente_tenant_setup):
    admin_headers = superadmin_setup["admin_headers"]
    tenant_id = cliente_tenant_setup["tenant_id"]
    email = cliente_tenant_setup["email"]
    senha = cliente_tenant_setup["senha"]

    # Super admin suspende o tenant
    res_susp = client.patch(
        f"/admin/tenants/{tenant_id}/status",
        json={"ativo": False},
        headers=admin_headers
    )
    assert res_susp.status_code == status.HTTP_200_OK
    assert res_susp.json()["ativo"] is False

    # Login do usuário do tenant deve falhar com 403 Forbidden
    res_login_bloq = client.post("/auth/login", json={"email": email, "senha": senha})
    assert res_login_bloq.status_code == status.HTTP_403_FORBIDDEN
    assert "suspenso ou inativo" in res_login_bloq.json()["detail"].lower()

    # Super admin reativa o tenant
    res_reativ = client.patch(
        f"/admin/tenants/{tenant_id}/status",
        json={"ativo": True},
        headers=admin_headers
    )
    assert res_reativ.status_code == status.HTTP_200_OK
    assert res_reativ.json()["ativo"] is True

    # Login volta a funcionar
    res_login_ok = client.post("/auth/login", json={"email": email, "senha": senha})
    assert res_login_ok.status_code == status.HTTP_200_OK
    assert "access_token" in res_login_ok.json()


def test_superadmin_alterar_plano_e_limites(client: TestClient, superadmin_setup, cliente_tenant_setup):
    admin_headers = superadmin_setup["admin_headers"]
    tenant_id = cliente_tenant_setup["tenant_id"]
    cliente_headers = cliente_tenant_setup["headers"]

    # 1. Altera plano para STARTER (limite_lojas=1, limite_usuarios=2)
    res_plano = client.patch(
        f"/admin/tenants/{tenant_id}/plano",
        json={"plano": "STARTER", "limite_lojas": 1, "limite_usuarios": 2},
        headers=admin_headers
    )
    assert res_plano.status_code == status.HTTP_200_OK
    data = res_plano.json()
    assert data["plano"] == "STARTER"
    assert data["limite_lojas"] == 1
    assert data["limite_usuarios"] == 2

    # 2. Cria a 1ª loja com sucesso
    res_loja1 = client.post("/lojas/", json={
        "nome": "Loja Filial 1",
        "cnpj": gerar_cnpj(),
        "endereco": "Av Principal, 10"
    }, headers=cliente_headers)
    assert res_loja1.status_code == status.HTTP_201_CREATED
    loja1_id = res_loja1.json()["id"]

    # 3. Tenta criar a 2ª loja e é barrado pelo limite do plano
    res_loja2 = client.post("/lojas/", json={
        "nome": "Loja Filial 2",
        "cnpj": gerar_cnpj(),
        "endereco": "Av Secundária, 20"
    }, headers=cliente_headers)
    assert res_loja2.status_code == status.HTTP_400_BAD_REQUEST
    assert "limite de lojas" in res_loja2.json()["detail"].lower()

    # 4. Cria 1 colaborador (total 2 usuários incluindo o dono)
    user_email_1 = f"colab1_{random.randint(1000, 9999)}@empresa.com"
    res_user1 = client.post("/auth/usuarios", json={
        "nome": "Colaborador 1",
        "email": user_email_1,
        "senha": "senha123",
        "role": "GERENTE",
        "loja_atribuida_id": loja1_id
    }, headers=cliente_headers)
    assert res_user1.status_code == status.HTTP_201_CREATED

    # 5. Tenta criar o 2º colaborador (total excederia o limite de 2 usuários)
    user_email_2 = f"colab2_{random.randint(1000, 9999)}@empresa.com"
    res_user2 = client.post("/auth/usuarios", json={
        "nome": "Colaborador 2",
        "email": user_email_2,
        "senha": "senha123",
        "role": "GERENTE",
        "loja_atribuida_id": loja1_id
    }, headers=cliente_headers)
    assert res_user2.status_code == status.HTTP_400_BAD_REQUEST
    assert "limite de usuários" in res_user2.json()["detail"].lower()

    # 6. Super admin faz upgrade do plano para ENTERPRISE (limite 50 lojas, 100 usuários)
    res_upgrade = client.patch(
        f"/admin/tenants/{tenant_id}/plano",
        json={"plano": "ENTERPRISE"},
        headers=admin_headers
    )
    assert res_upgrade.status_code == status.HTTP_200_OK
    assert res_upgrade.json()["plano"] == "ENTERPRISE"
    assert res_upgrade.json()["limite_lojas"] == 50
    assert res_upgrade.json()["limite_usuarios"] == 100

    # 7. Agora a 2ª loja e o 2º colaborador passam com sucesso
    res_loja2_ok = client.post("/lojas/", json={
        "nome": "Loja Filial 2",
        "cnpj": gerar_cnpj(),
        "endereco": "Av Secundária, 20"
    }, headers=cliente_headers)
    assert res_loja2_ok.status_code == status.HTTP_201_CREATED

    res_user2_ok = client.post("/auth/usuarios", json={
        "nome": "Colaborador 2",
        "email": user_email_2,
        "senha": "senha123",
        "role": "GERENTE",
        "loja_atribuida_id": loja1_id
    }, headers=cliente_headers)
    assert res_user2_ok.status_code == status.HTTP_201_CREATED


def test_superadmin_dashboard_kpis(client: TestClient, superadmin_setup):
    admin_headers = superadmin_setup["admin_headers"]

    res = client.get("/admin/dashboard", headers=admin_headers)
    assert res.status_code == status.HTTP_200_OK
    metricas = res.json()

    assert "total_tenants" in metricas
    assert "tenants_ativos" in metricas
    assert "tenants_suspensos" in metricas
    assert "total_lojas" in metricas
    assert "total_usuarios" in metricas
    assert "mrr_estimado" in metricas
    assert "gmv_total" in metricas
    assert "total_vendas" in metricas
    assert metricas["total_tenants"] >= 1
    assert metricas["mrr_estimado"] >= 0.0


def test_superadmin_obter_detalhes_completos_tenant(
    client: TestClient, superadmin_setup, cliente_tenant_setup
):
    admin_headers = superadmin_setup["admin_headers"]
    cliente_headers = cliente_tenant_setup["headers"]
    tenant_id = cliente_tenant_setup["tenant_id"]

    # Cria uma filial e um colaborador no tenant do cliente
    res_loja = client.post(
        "/lojas/",
        json={"nome": "Filial Detalhes", "cnpj": gerar_cnpj(), "endereco": "Rua 10"},
        headers=cliente_headers,
    )
    assert res_loja.status_code == status.HTTP_201_CREATED
    loja_id = res_loja.json()["id"]

    colab_email = f"colab_{random.randint(1000, 9999)}@detalhes.com"
    res_colab = client.post(
        "/auth/usuarios",
        json={
            "nome": "Gerente Filial",
            "email": colab_email,
            "senha": "senha_segura_123",
            "role": "GERENTE",
            "loja_atribuida_id": loja_id,
        },
        headers=cliente_headers,
    )
    assert res_colab.status_code == status.HTTP_201_CREATED

    # Consulta visão 360° como Super Admin
    res = client.get(f"/admin/tenants/{tenant_id}/detalhes", headers=admin_headers)
    assert res.status_code == status.HTTP_200_OK
    detalhes = res.json()

    assert detalhes["id"] == tenant_id
    assert "nome_fantasia" in detalhes
    assert "cnpj" in detalhes
    assert "plano" in detalhes
    assert len(detalhes["lojas"]) >= 1
    assert any(loja["nome"] == "Filial Detalhes" for loja in detalhes["lojas"])
    assert len(detalhes["usuarios"]) >= 2  # Dono + Gerente
    assert any(u["email"] == colab_email for u in detalhes["usuarios"])
    assert "total_produtos" in detalhes
    assert "total_vendas_qtd" in detalhes


def test_superadmin_impersonar_tenant_e_acessar_loja(
    client: TestClient, superadmin_setup, cliente_tenant_setup
):
    admin_headers = superadmin_setup["admin_headers"]
    tenant_id = cliente_tenant_setup["tenant_id"]

    # 1. Super-Admin solicita impersonation do tenant
    res_imp = client.post(
        f"/admin/tenants/{tenant_id}/impersonate",
        headers=admin_headers,
    )
    assert res_imp.status_code == status.HTTP_200_OK
    dados_imp = res_imp.json()

    assert "access_token" in dados_imp
    assert dados_imp["token_type"] == "bearer"
    assert dados_imp["tenant_id"] == tenant_id
    assert dados_imp["impersonated_by_email"] == superadmin_setup["admin_email"]

    # 2. Usa o token gerado para navegar nos dados do inquilino (ex: consultar lojas ou produtos)
    token_suporte = dados_imp["access_token"]
    headers_suporte = {"Authorization": f"Bearer {token_suporte}"}

    res_lojas_suporte = client.get("/lojas/", headers=headers_suporte)
    assert res_lojas_suporte.status_code == status.HTTP_200_OK
    lojas = res_lojas_suporte.json()
    assert isinstance(lojas, list)

    # 3. Usuário comum (DONO de loja normal) NÃO pode impersonar outros tenants
    cliente_headers = cliente_tenant_setup["headers"]
    outro_tenant_id = str(uuid4())
    res_negado = client.post(
        f"/admin/tenants/{outro_tenant_id}/impersonate",
        headers=cliente_headers,
    )
    assert res_negado.status_code == status.HTTP_403_FORBIDDEN

