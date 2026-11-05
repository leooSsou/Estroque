import random
from uuid import UUID

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from src.domain.constants.modulos import (
    CATALOGO_MODULOS,
    MODULOS_PADRAO_POR_PLANO,
    calcular_modulos_tenant,
    obter_modulos_ativos_map,
)
from src.domain.entities.tenant import Tenant
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

    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"Plataforma Central {prefix}",
            "razao_social": f"Plataforma Central {prefix} Ltda",
            "cnpj": gerar_cnpj(),
            "dono_nome": "Super Administrador",
            "dono_email": email_admin,
            "dono_senha": senha,
        },
    )
    assert res_reg.status_code == 201, res_reg.text
    tenant_admin_id = res_reg.json()["tenant_id"]
    admin_id = res_reg.json()["dono_id"]

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
        "tenant_admin_id": tenant_admin_id,
    }


@pytest.fixture
def starter_tenant_setup(client: TestClient, superadmin_setup):
    prefix = random.randint(100000, 999999)
    email = f"starter_{prefix}@cliente.com"
    senha = "cliente_pass_123"
    cnpj_tenant = gerar_cnpj()

    res_reg = client.post(
        "/auth/register",
        json={
            "nome_fantasia": f"Cliente Starter {prefix}",
            "razao_social": f"Cliente Starter {prefix} ME",
            "cnpj": cnpj_tenant,
            "dono_nome": "Dono Starter",
            "dono_email": email,
            "dono_senha": senha,
        },
    )
    assert res_reg.status_code == 201, res_reg.text
    tenant_id = res_reg.json()["tenant_id"]
    dono_id = res_reg.json()["dono_id"]

    # Login como dono do tenant starter
    res_login = client.post("/auth/login", json={"email": email, "senha": senha})
    assert res_login.status_code == 200, res_login.text
    token = res_login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Criar loja matriz
    res_loja = client.post(
        "/lojas/",
        json={"nome": "Loja Matriz Starter", "cnpj": cnpj_tenant, "endereco": "Rua Central, 100"},
        headers=headers,
    )
    assert res_loja.status_code == 201, res_loja.text
    loja_id = res_loja.json()["id"]

    # Rebaixa para plano STARTER via SuperAdmin
    res_plano = client.patch(
        f"/admin/tenants/{tenant_id}/plano",
        json={"plano": "STARTER", "limite_lojas": 1, "limite_usuarios": 2},
        headers=superadmin_setup["admin_headers"],
    )
    assert res_plano.status_code == 200, res_plano.text

    return {
        "tenant_id": tenant_id,
        "dono_id": dono_id,
        "loja_id": loja_id,
        "headers": headers,
    }


# ==============================================================================
# 1. TESTES DE DOMÍNIO E REGRAS DE NEGÓCIO
# ==============================================================================


def test_catalogo_modulos_e_padroes_por_plano():
    """Valida que todos os módulos do catálogo estão definidos com metadados e rotas."""
    chaves_esperadas = {
        "pdv",
        "nfe",
        "financeiro",
        "transferencias",
        "auditoria",
        "contatos",
        "analytics",
        "grade",
    }
    assert set(CATALOGO_MODULOS.keys()) == chaves_esperadas

    # STARTER possui apenas PDV e Contatos por padrão
    assert "pdv" in MODULOS_PADRAO_POR_PLANO["STARTER"]
    assert "nfe" not in MODULOS_PADRAO_POR_PLANO["STARTER"]
    assert "grade" not in MODULOS_PADRAO_POR_PLANO["STARTER"]

    # PRO possui nfe, transferencias, auditoria, grade
    assert "nfe" in MODULOS_PADRAO_POR_PLANO["PRO"]
    assert "grade" in MODULOS_PADRAO_POR_PLANO["PRO"]

    # ENTERPRISE possui tudo liberado
    assert len(MODULOS_PADRAO_POR_PLANO["ENTERPRISE"]) == len(CATALOGO_MODULOS)


def test_calcular_modulos_tenant_origens():
    """Valida o cálculo de origem: PLANO, BONUS, BLOQUEADO, DESATIVADO."""
    # Tenant STARTER sem customizações
    detalhes = calcular_modulos_tenant("STARTER", {})
    mapa = {d["chave"]: d for d in detalhes}

    assert mapa["pdv"]["ativo"] is True
    assert mapa["pdv"]["origem"] == "PLANO"

    assert mapa["nfe"]["ativo"] is False
    assert mapa["nfe"]["origem"] == "DESATIVADO"

    # Tenant STARTER com NFE liberado como bônus e PDV bloqueado
    custom = {"nfe": True, "pdv": False}
    detalhes_custom = calcular_modulos_tenant("STARTER", custom)
    mapa_custom = {d["chave"]: d for d in detalhes_custom}

    assert mapa_custom["nfe"]["ativo"] is True
    assert mapa_custom["nfe"]["origem"] == "BONUS"

    assert mapa_custom["pdv"]["ativo"] is False
    assert mapa_custom["pdv"]["origem"] == "BLOQUEADO"

    # Mapa direto de booleanos
    ativos = obter_modulos_ativos_map("STARTER", custom)
    assert ativos["nfe"] is True
    assert ativos["pdv"] is False


def test_tenant_entity_modulos_validation():
    """Valida que a entidade Tenant rejeita módulos inexistentes ou tipos inválidos."""
    cnpj_valido = gerar_cnpj()

    # Customização válida
    t = Tenant(
        nome_fantasia="Loja X",
        razao_social="Loja X Ltda",
        cnpj=cnpj_valido,
        modulos_customizados={"nfe": True, "grade": False},
    )
    assert t.modulos_customizados == {"nfe": True, "grade": False}

    # Chave inválida
    with pytest.raises(ValueError, match="inválido"):
        Tenant(
            nome_fantasia="Loja Invalida",
            razao_social="Loja Invalida Ltda",
            cnpj=cnpj_valido,
            modulos_customizados={"modulo_fantasma": True},
        )

    # Valor não booleano
    with pytest.raises(ValueError, match="booleano"):
        Tenant(
            nome_fantasia="Loja Invalida",
            razao_social="Loja Invalida Ltda",
            cnpj=cnpj_valido,
            modulos_customizados={"nfe": "sim"},  # type: ignore
        )


# ==============================================================================
# 2. TESTES DE API SUPERADMIN (CATÁLOGO E ATUALIZAÇÃO DE MÓDULOS)
# ==============================================================================


def test_superadmin_obter_catalogo_modulos(client: TestClient, superadmin_setup):
    """GET /admin/modulos/catalogo deve retornar o dicionário de módulos e planos padrão."""
    res = client.get("/admin/modulos/catalogo", headers=superadmin_setup["admin_headers"])
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert "modulos" in data
    assert "planos_padrao" in data
    assert "pdv" in data["modulos"]
    assert "nfe" in data["modulos"]
    assert "grade" in data["modulos"]


def test_superadmin_consultar_e_atualizar_modulos_tenant(
    client: TestClient, superadmin_setup, starter_tenant_setup
):
    """SuperAdmin pode consultar e conceder bônus / bloquear módulos de qualquer tenant."""
    tenant_id = starter_tenant_setup["tenant_id"]

    # 1. Consulta inicial (STARTER possui apenas PDV e Contatos)
    res_get = client.get(
        f"/admin/tenants/{tenant_id}/modulos",
        headers=superadmin_setup["admin_headers"],
    )
    assert res_get.status_code == status.HTTP_200_OK
    data_get = res_get.json()
    assert data_get["plano"] == "STARTER"
    assert data_get["modulos_customizados"] == {}

    mod_pdv = next(m for m in data_get["modulos"] if m["chave"] == "pdv")
    assert mod_pdv["ativo"] is True
    assert mod_pdv["origem"] == "PLANO"

    mod_nfe = next(m for m in data_get["modulos"] if m["chave"] == "nfe")
    assert mod_nfe["ativo"] is False
    assert mod_nfe["origem"] == "DESATIVADO"

    # 2. Concede bônus de NF-e e Grade ao cliente STARTER
    res_patch = client.patch(
        f"/admin/tenants/{tenant_id}/modulos",
        json={"modulos": {"nfe": True, "grade": True}},
        headers=superadmin_setup["admin_headers"],
    )
    assert res_patch.status_code == status.HTTP_200_OK
    data_patch = res_patch.json()
    assert data_patch["modulos_customizados"] == {"nfe": True, "grade": True}

    mod_nfe_novo = next(m for m in data_patch["modulos"] if m["chave"] == "nfe")
    assert mod_nfe_novo["ativo"] is True
    assert mod_nfe_novo["origem"] == "BONUS"

    mod_grade_novo = next(m for m in data_patch["modulos"] if m["chave"] == "grade")
    assert mod_grade_novo["ativo"] is True
    assert mod_grade_novo["origem"] == "BONUS"


def test_seguranca_nao_superadmin_nao_pode_alterar_modulos(
    client: TestClient, starter_tenant_setup
):
    """Usuário comum ou DONO de tenant não pode alterar permissões de módulos."""
    tenant_id = starter_tenant_setup["tenant_id"]
    headers = starter_tenant_setup["headers"]

    res = client.patch(
        f"/admin/tenants/{tenant_id}/modulos",
        json={"modulos": {"nfe": True}},
        headers=headers,
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN


# ==============================================================================
# 3. TESTES DE ENFORCEMENT DE ROTAS E AUTENTICAÇÃO
# ==============================================================================


def test_auth_me_retorna_modulos_ativos(
    client: TestClient, starter_tenant_setup, superadmin_setup
):
    """GET /auth/me deve retornar a árvore calculada de módulos ativos."""
    # 1. Tenant Starter comum
    res = client.get("/auth/me", headers=starter_tenant_setup["headers"])
    assert res.status_code == status.HTTP_200_OK
    me = res.json()
    assert "modulos_ativos" in me
    assert me["modulos_ativos"]["pdv"] is True
    assert me["modulos_ativos"]["nfe"] is False
    assert me["modulos_ativos"]["grade"] is False

    # 2. Usuário ADMIN_SAAS sempre tem todos os módulos liberados
    res_admin = client.get("/auth/me", headers=superadmin_setup["admin_headers"])
    assert res_admin.status_code == status.HTTP_200_OK
    me_admin = res_admin.json()
    assert all(me_admin["modulos_ativos"].values())


def test_route_guard_bloqueia_rota_sem_modulo_e_libera_com_bonus(
    client: TestClient, starter_tenant_setup, superadmin_setup
):
    """Garante que a rota protegida por verificar_modulo_ativo bloqueia acesso sem o módulo e libera com o bônus."""
    tenant_id = starter_tenant_setup["tenant_id"]
    headers = starter_tenant_setup["headers"]

    # 1. Rota de NFE (/estoque/importar-xml): Starter tenta acessar sem ter NFE
    res_bloqueado = client.post(
        "/estoque/importar-xml",
        data={"loja_id": starter_tenant_setup["loja_id"]},
        headers=headers,
    )
    assert res_bloqueado.status_code == status.HTTP_403_FORBIDDEN
    assert "nf-e" in res_bloqueado.json()["detail"].lower()

    # 2. Rota de Grade (/produtos/grade): Starter tenta criar grade sem ter o módulo
    res_grade_bloqueado = client.post(
        "/produtos/grade",
        json={
            "nome": "Camiseta Teste",
            "sku_base": "CAM",
            "preco_custo": 20.0,
            "preco_venda": 40.0,
            "markup": 100.0,
            "atributos": [{"nome": "Tamanho", "valores": ["P", "M"]}],
        },
        headers=headers,
    )
    assert res_grade_bloqueado.status_code == status.HTTP_403_FORBIDDEN
    assert "grade" in res_grade_bloqueado.json()["detail"].lower()

    # 3. SuperAdmin concede bônus de 'nfe' e 'grade' para este tenant
    res_patch = client.patch(
        f"/admin/tenants/{tenant_id}/modulos",
        json={"modulos": {"nfe": True, "grade": True}},
        headers=superadmin_setup["admin_headers"],
    )
    assert res_patch.status_code == status.HTTP_200_OK

    # 4. Agora o tenant tenta novamente acessar a rota de grade: deve passar pelo guard
    res_grade_liberado = client.post(
        "/produtos/grade",
        json={
            "nome": "Camiseta Teste",
            "sku_base": "CAM",
            "preco_custo": 20.0,
            "preco_venda": 40.0,
            "markup": 100.0,
            "atributos": [{"nome": "Tamanho", "valores": ["P", "M"]}],
        },
        headers=headers,
    )
    # Não deve ser 403 Forbidden!
    assert res_grade_liberado.status_code in (status.HTTP_201_CREATED, status.HTTP_200_OK)

    # 5. ADMIN_SAAS tem bypass total mesmo em rotas de módulo
    res_admin_grade = client.post(
        "/produtos/grade",
        json={
            "nome": "Camiseta Admin",
            "sku_base": "CADM",
            "preco_custo": 10.0,
            "preco_venda": 20.0,
            "markup": 100.0,
            "atributos": [{"nome": "Cor", "valores": ["Azul"]}],
        },
        headers=superadmin_setup["admin_headers"],
    )
    assert res_admin_grade.status_code != status.HTTP_403_FORBIDDEN
