import pytest
import os
import random
from concurrent.futures import ThreadPoolExecutor, as_completed
from fastapi.testclient import TestClient
from uuid import uuid4, UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.infrastructure.database.models import (
    Base,
    TenantModel,
    LojaModel,
    ProdutoModel,
    EstoqueSaldoModel,
    EstoqueMovimentacaoModel,
    TransferenciaEstoqueModel,
)
from src.domain.entities.tenant import Tenant
from src.domain.entities.loja import Loja
from src.domain.entities.produto import Produto
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.usuario import Usuario
from src.domain.entities.transferencia_estoque import TransferenciaEstoque
from src.domain.exceptions.business import EstoqueInsuficienteException, TransferenciaNaoEncontradaException

from src.infrastructure.database.repositorios_concrete import (
    RepositorioTenantSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioTransferenciaEstoqueSQLAlchemy,
    RepositorioUsuarioSQLAlchemy,
)

from src.use_cases.estoque.solicitar_transferencia import SolicitarTransferencia, SolicitarTransferenciaInput
from src.use_cases.estoque.despachar_transferencia import DespacharTransferencia, DespacharTransferenciaInput
from src.use_cases.estoque.confirmar_recebimento import ConfirmarRecebimento, ConfirmarRecebimentoInput

def gerar_cnpj_valido() -> str:
    """
    Gera um CNPJ matematicamente válido para passar pelas validações de domínio.
    """
    base = [random.randint(0, 9) for _ in range(12)]
    
    # 1º dígito verificador
    pesos1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s1 = sum(base[i] * pesos1[i] for i in range(12))
    r1 = s1 % 11
    d1 = 0 if r1 < 2 else 11 - r1
    base.append(d1)
    
    # 2º dígito verificador
    pesos2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    s2 = sum(base[i] * pesos2[i] for i in range(13))
    r2 = s2 % 11
    d2 = 0 if r2 < 2 else 11 - r2
    base.append(d2)
    
    return "".join(map(str, base))


def registrar_e_autenticar(client: TestClient, prefix: str) -> str:
    """
    Auxiliar para registrar um tenant com CNPJ e e-mail únicos e retornar o token de acesso JWT.
    """
    cnpj = gerar_cnpj_valido()
    email = f"{prefix.lower()}_{uuid4().hex[:8]}@email.com"
    
    reg = client.post("/auth/register", json={
        "nome_fantasia": f"{prefix} Rede",
        "razao_social": f"{prefix} Razao Social S/A",
        "cnpj": cnpj,
        "dono_nome": f"Dono {prefix}",
        "dono_email": email,
        "dono_senha": "senha_segura_123"
    })
    assert reg.status_code == 201
    
    login = client.post("/auth/login", json={
        "email": email,
        "senha": "senha_segura_123"
    })
    assert login.status_code == 200
    return login.json()["access_token"]


def test_fluxo_transferencia_completo_sucesso(client: TestClient) -> None:
    """
    Testa o fluxo completo de transferência de estoque com sucesso via API:
    Solicitar -> Despachar (débito de origem) -> Receber (crédito de destino).
    """
    token_a = registrar_e_autenticar(client, "TransfA")
    headers = {"Authorization": f"Bearer {token_a}"}

    # 1. Criar Lojas
    res_origem = client.post("/lojas/", json={
        "nome": "Loja Origem", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco O"
    }, headers=headers)
    assert res_origem.status_code == 201
    loja_origem_id = res_origem.json()["id"]

    res_destino = client.post("/lojas/", json={
        "nome": "Loja Destino", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco D"
    }, headers=headers)
    assert res_destino.status_code == 201
    loja_destino_id = res_destino.json()["id"]

    # 2. Criar Produto
    res_prod = client.post("/produtos/", json={
        "nome": "Notebook Pro", "sku": f"NOTE-{uuid4().hex[:6]}",
        "preco_custo": 4000.0, "preco_venda": 6000.0, "markup": 0.5
    }, headers=headers)
    assert res_prod.status_code == 201
    produto_id = res_prod.json()["id"]

    # 3. Adicionar estoque inicial na loja origem
    client.post("/estoque/movimentar", json={
        "loja_id": loja_origem_id, "produto_id": produto_id,
        "tipo": "ENTRADA", "quantidade": 50, "motivo": "Estoque Inicial"
    }, headers=headers)

    # 4. Solicitar Transferência de 20 unidades
    res_trans = client.post("/estoque/transferencias", json={
        "loja_origem_id": loja_origem_id,
        "loja_destino_id": loja_destino_id,
        "produto_id": produto_id,
        "quantidade": 20
    }, headers=headers)
    assert res_trans.status_code == 201
    transferencia_id = res_trans.json()["id"]
    assert res_trans.json()["status"] == "SOLICITADO"

    # 5. Despachar a Transferência
    res_desp = client.post(f"/estoque/transferencias/{transferencia_id}/despachar", headers=headers)
    assert res_desp.status_code == 200
    assert res_desp.json()["status"] == "DESPACHADO"

    # Verifica se deduziu do saldo de origem (50 - 20 = 30)
    res_saldos = client.get("/estoque/saldos", headers=headers)
    origem_saldo = [s for s in res_saldos.json() if s["loja_id"] == loja_origem_id][0]
    assert origem_saldo["quantidade"] == 30

    # 6. Confirmar Recebimento (quantidade exata de 20)
    res_rec = client.post(f"/estoque/transferencias/{transferencia_id}/receber", json={
        "quantidade_recebida": 20
    }, headers=headers)
    assert res_rec.status_code == 200
    assert res_rec.json()["status"] == "RECEBIDO"

    # Verifica se creditou na loja de destino (20)
    res_saldos = client.get("/estoque/saldos", headers=headers)
    destino_saldo = [s for s in res_saldos.json() if s["loja_id"] == loja_destino_id][0]
    assert destino_saldo["quantidade"] == 20


def test_fluxo_transferencia_com_divergencia_sucesso(client: TestClient) -> None:
    """
    Testa o fluxo de recebimento de transferência de estoque com divergência com sucesso
    quando uma justificativa é fornecida.
    """
    token_a = registrar_e_autenticar(client, "TransfDiv")
    headers = {"Authorization": f"Bearer {token_a}"}

    res_origem = client.post("/lojas/", json={
        "nome": "Loja O", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco O"
    }, headers=headers)
    loja_origem_id = res_origem.json()["id"]

    res_destino = client.post("/lojas/", json={
        "nome": "Loja D", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco D"
    }, headers=headers)
    loja_destino_id = res_destino.json()["id"]

    res_prod = client.post("/produtos/", json={
        "nome": "Mouse Gamer", "sku": f"MOUSE-{uuid4().hex[:6]}",
        "preco_custo": 100.0, "preco_venda": 150.0, "markup": 0.5
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    # Adicionar estoque inicial na loja origem
    client.post("/estoque/movimentar", json={
        "loja_id": loja_origem_id, "produto_id": produto_id,
        "tipo": "ENTRADA", "quantidade": 50, "motivo": "Estoque Inicial"
    }, headers=headers)

    # Solicitar
    res_trans = client.post("/estoque/transferencias", json={
        "loja_origem_id": loja_origem_id,
        "loja_destino_id": loja_destino_id,
        "produto_id": produto_id,
        "quantidade": 20
    }, headers=headers)
    transferencia_id = res_trans.json()["id"]

    # Despachar
    client.post(f"/estoque/transferencias/{transferencia_id}/despachar", headers=headers)

    # Receber com divergência (18/20) informando justificativa -> Sucesso (DIVERGENTE)
    res_rec = client.post(f"/estoque/transferencias/{transferencia_id}/receber", json={
        "quantidade_recebida": 18,
        "justificativa": "2 unidades extraviadas na transportadora"
    }, headers=headers)
    assert res_rec.status_code == 200
    assert res_rec.json()["status"] == "DIVERGENTE"
    assert res_rec.json()["justificativa"] == "2 unidades extraviadas na transportadora"

    # Verifica se creditou somente as 18 unidades recebidas no destino
    res_saldos = client.get("/estoque/saldos", headers=headers)
    destino_saldo = [s for s in res_saldos.json() if s["loja_id"] == loja_destino_id][0]
    assert destino_saldo["quantidade"] == 18


def test_fluxo_transferencia_receber_sem_justificativa_deve_falhar(client: TestClient) -> None:
    """
    Garante que receber com quantidade divergente sem justificar retorna HTTP 422.
    """
    token_a = registrar_e_autenticar(client, "TransfNoJust")
    headers = {"Authorization": f"Bearer {token_a}"}

    res_origem = client.post("/lojas/", json={
        "nome": "Loja O", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco O"
    }, headers=headers)
    loja_origem_id = res_origem.json()["id"]

    res_destino = client.post("/lojas/", json={
        "nome": "Loja D", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco D"
    }, headers=headers)
    loja_destino_id = res_destino.json()["id"]

    res_prod = client.post("/produtos/", json={
        "nome": "Fone", "sku": f"FONE-{uuid4().hex[:6]}",
        "preco_custo": 100.0, "preco_venda": 150.0, "markup": 0.5
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    # Adicionar estoque inicial na loja origem
    client.post("/estoque/movimentar", json={
        "loja_id": loja_origem_id, "produto_id": produto_id,
        "tipo": "ENTRADA", "quantidade": 50, "motivo": "Estoque Inicial"
    }, headers=headers)

    # Solicitar
    res_trans = client.post("/estoque/transferencias", json={
        "loja_origem_id": loja_origem_id,
        "loja_destino_id": loja_destino_id,
        "produto_id": produto_id,
        "quantidade": 20
    }, headers=headers)
    transferencia_id = res_trans.json()["id"]

    # Despachar
    client.post(f"/estoque/transferencias/{transferencia_id}/despachar", headers=headers)

    # Tenta receber com divergência (18/20) sem justificativa -> Falha (HTTP 422)
    res_fail = client.post(f"/estoque/transferencias/{transferencia_id}/receber", json={
        "quantidade_recebida": 18
    }, headers=headers)
    assert res_fail.status_code == 422


def test_transferencia_loja_origem_e_destino_iguais_deve_falhar(client: TestClient) -> None:
    token_a = registrar_e_autenticar(client, "TransfIguais")
    headers = {"Authorization": f"Bearer {token_a}"}

    res_origem = client.post("/lojas/", json={
        "nome": "Loja O", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco O"
    }, headers=headers)
    loja_id = res_origem.json()["id"]

    res_prod = client.post("/produtos/", json={
        "nome": "Fone Ouvido", "sku": f"FONE-{uuid4().hex[:6]}",
        "preco_custo": 50.0, "preco_venda": 100.0, "markup": 1.0
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    res_trans = client.post("/estoque/transferencias", json={
        "loja_origem_id": loja_id,
        "loja_destino_id": loja_id,
        "produto_id": produto_id,
        "quantidade": 10
    }, headers=headers)
    assert res_trans.status_code == 422


def test_despacho_estoque_insuficiente_deve_falhar(client: TestClient) -> None:
    token_a = registrar_e_autenticar(client, "TransfInsuf")
    headers = {"Authorization": f"Bearer {token_a}"}

    res_origem = client.post("/lojas/", json={
        "nome": "Loja O", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco O"
    }, headers=headers)
    loja_origem_id = res_origem.json()["id"]

    res_destino = client.post("/lojas/", json={
        "nome": "Loja D", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco D"
    }, headers=headers)
    loja_destino_id = res_destino.json()["id"]

    res_prod = client.post("/produtos/", json={
        "nome": "Cabo HDMI", "sku": f"HDMI-{uuid4().hex[:6]}",
        "preco_custo": 20.0, "preco_venda": 40.0, "markup": 1.0
    }, headers=headers)
    produto_id = res_prod.json()["id"]

    # Adicionar apenas 5 unidades
    client.post("/estoque/movimentar", json={
        "loja_id": loja_origem_id, "produto_id": produto_id,
        "tipo": "ENTRADA", "quantidade": 5, "motivo": "Estoque Inicial"
    }, headers=headers)

    # Solicitar 10 unidades
    res_trans = client.post("/estoque/transferencias", json={
        "loja_origem_id": loja_origem_id,
        "loja_destino_id": loja_destino_id,
        "produto_id": produto_id,
        "quantidade": 10
    }, headers=headers)
    transferencia_id = res_trans.json()["id"]

    # Tenta despachar -> Falha (HTTP 400 - Estoque Insuficiente)
    res_desp = client.post(f"/estoque/transferencias/{transferencia_id}/despachar", headers=headers)
    assert res_desp.status_code == 400


def test_bola_transferencias_ler_alheia_deve_retornar_404(client: TestClient) -> None:
    token_a = registrar_e_autenticar(client, "BolaA1")
    token_b = registrar_e_autenticar(client, "BolaB1")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    res_origem_b = client.post("/lojas/", json={
        "nome": "Loja B1", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco B"
    }, headers=headers_b)
    loja_origem_b_id = res_origem_b.json()["id"]

    res_destino_b = client.post("/lojas/", json={
        "nome": "Loja B2", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco B"
    }, headers=headers_b)
    loja_destino_b_id = res_destino_b.json()["id"]

    res_prod_b = client.post("/produtos/", json={
        "nome": "Teclado", "sku": f"TECLADO-{uuid4().hex[:6]}",
        "preco_custo": 80.0, "preco_venda": 120.0, "markup": 0.5
    }, headers=headers_b)
    produto_b_id = res_prod_b.json()["id"]

    res_trans_b = client.post("/estoque/transferencias", json={
        "loja_origem_id": loja_origem_b_id,
        "loja_destino_id": loja_destino_b_id,
        "produto_id": produto_b_id,
        "quantidade": 5
    }, headers=headers_b)
    trans_b_id = res_trans_b.json()["id"]

    # Tenant A tenta ler transferência do Tenant B -> HTTP 404
    res_get = client.get(f"/estoque/transferencias/{trans_b_id}", headers=headers_a)
    assert res_get.status_code == 404


def test_bola_transferencias_despachar_alheia_deve_retornar_404(client: TestClient) -> None:
    token_a = registrar_e_autenticar(client, "BolaA2")
    token_b = registrar_e_autenticar(client, "BolaB2")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    res_origem_b = client.post("/lojas/", json={
        "nome": "Loja B1", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco B"
    }, headers=headers_b)
    loja_origem_b_id = res_origem_b.json()["id"]

    res_destino_b = client.post("/lojas/", json={
        "nome": "Loja B2", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco B"
    }, headers=headers_b)
    loja_destino_b_id = res_destino_b.json()["id"]

    res_prod_b = client.post("/produtos/", json={
        "nome": "Teclado", "sku": f"TECLADO-{uuid4().hex[:6]}",
        "preco_custo": 80.0, "preco_venda": 120.0, "markup": 0.5
    }, headers=headers_b)
    produto_b_id = res_prod_b.json()["id"]

    res_trans_b = client.post("/estoque/transferencias", json={
        "loja_origem_id": loja_origem_b_id,
        "loja_destino_id": loja_destino_b_id,
        "produto_id": produto_b_id,
        "quantidade": 5
    }, headers=headers_b)
    trans_b_id = res_trans_b.json()["id"]

    # Tenant A tenta despachar transferência do Tenant B -> HTTP 404
    res_desp = client.post(f"/estoque/transferencias/{trans_b_id}/despachar", headers=headers_a)
    assert res_desp.status_code == 404


def test_bola_transferencias_receber_alheia_deve_retornar_404(client: TestClient) -> None:
    token_a = registrar_e_autenticar(client, "BolaA3")
    token_b = registrar_e_autenticar(client, "BolaB3")
    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    res_origem_b = client.post("/lojas/", json={
        "nome": "Loja B1", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco B"
    }, headers=headers_b)
    loja_origem_b_id = res_origem_b.json()["id"]

    res_destino_b = client.post("/lojas/", json={
        "nome": "Loja B2", "cnpj": gerar_cnpj_valido(), "endereco": "Endereco B"
    }, headers=headers_b)
    loja_destino_b_id = res_destino_b.json()["id"]

    res_prod_b = client.post("/produtos/", json={
        "nome": "Teclado", "sku": f"TECLADO-{uuid4().hex[:6]}",
        "preco_custo": 80.0, "preco_venda": 120.0, "markup": 0.5
    }, headers=headers_b)
    produto_b_id = res_prod_b.json()["id"]

    res_trans_b = client.post("/estoque/transferencias", json={
        "loja_origem_id": loja_origem_b_id,
        "loja_destino_id": loja_destino_b_id,
        "produto_id": produto_b_id,
        "quantidade": 5
    }, headers=headers_b)
    trans_b_id = res_trans_b.json()["id"]

    # Tenant A tenta receber transferência do Tenant B -> HTTP 404
    res_rec = client.post(f"/estoque/transferencias/{trans_b_id}/receber", json={"quantidade_recebida": 5}, headers=headers_a)
    assert res_rec.status_code == 404


# --- TESTES DE CONCORRÊNCIA ---

pg_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres_password@postgres:5432/gerenciador_saas")
pg_engine = create_engine(pg_url)
PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

try:
    with pg_engine.connect() as conn:
        postgres_available = True
except Exception:
    postgres_available = False

pytestmark = pytest.mark.skipif(
    not postgres_available,
    reason="PostgreSQL não está disponível para testar concorrência"
)


def test_concorrencia_despacho_duplo_da_mesma_transferencia():
    """
    Testa se duas requisições simultâneas de despacho da mesma transferência
    são controladas para que apenas uma execute e reduza o estoque.
    """
    Base.metadata.create_all(bind=pg_engine)
    session = PgSessionLocal()
    session.info["ignore_tenant_filter"] = True

    tenant_id = uuid4()
    
    # Repositórios
    repo_tenant = RepositorioTenantSQLAlchemy(session)
    repo_loja = RepositorioLojaSQLAlchemy(session)
    repo_produto = RepositorioProdutoSQLAlchemy(session)
    repo_saldo = RepositorioEstoqueSaldoSQLAlchemy(session)
    repo_usuario = RepositorioUsuarioSQLAlchemy(session)

    # Cria Tenant
    cnpj_tenant = gerar_cnpj_valido()
    tenant = repo_tenant.salvar(Tenant(
        nome_fantasia="Saas",
        razao_social=f"Saas {tenant_id}",
        cnpj=cnpj_tenant
    ))

    loja_origem = repo_loja.salvar(Loja(
        nome="Loja O",
        cnpj=gerar_cnpj_valido(),
        endereco="Endereco O",
        tenant_id=tenant.id
    ))
    loja_destino = repo_loja.salvar(Loja(
        nome="Loja D",
        cnpj=gerar_cnpj_valido(),
        endereco="Endereco D",
        tenant_id=tenant.id
    ))

    # Cria Produto
    produto = repo_produto.salvar(Produto(
        nome="Prod",
        sku=f"SKU-{uuid4().hex[:6]}",
        preco_custo=10.0,
        preco_venda=20.0,
        markup=1.0,
        tenant_id=tenant.id
    ))

    # Cria Usuário DONO (não exige loja)
    usuario = repo_usuario.salvar(Usuario(
        nome="Operador",
        email=f"user_{uuid4().hex[:8]}@test.com",
        senha_hash="hash",
        role="DONO",
        tenant_id=tenant.id
    ))

    # Define estoque inicial de 100 na origem
    repo_saldo.salvar(EstoqueSaldo(
        loja_id=loja_origem.id,
        produto_id=produto.id,
        quantidade=100,
        tenant_id=tenant.id
    ))
    session.commit()

    # Cria transferência
    repo_trans = RepositorioTransferenciaEstoqueSQLAlchemy(session)
    trans = repo_trans.salvar(TransferenciaEstoque(
        loja_origem_id=loja_origem.id,
        loja_destino_id=loja_destino.id,
        produto_id=produto.id,
        quantidade=30,
        solicitado_por_id=usuario.id,
        tenant_id=tenant.id,
        status="SOLICITADO"
    ))
    session.commit()
    session.close()

    # Executa despachos simultâneos
    results = []

    def task():
        db = PgSessionLocal()
        db.info["ignore_tenant_filter"] = True
        try:
            r_trans = RepositorioTransferenciaEstoqueSQLAlchemy(db)
            r_saldo = RepositorioEstoqueSaldoSQLAlchemy(db)
            r_mov = RepositorioEstoqueMovimentacaoSQLAlchemy(db)
            use_case = DespacharTransferencia(r_trans, r_saldo, r_mov)
            use_case.executar(DespacharTransferenciaInput(
                transferencia_id=trans.id,
                aprovado_por_id=usuario.id,
                tenant_id=tenant.id
            ))
            db.commit()
            results.append("SUCCESS")
        except Exception as e:
            db.rollback()
            results.append(f"FAIL: {str(e)}")
        finally:
            db.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(task) for _ in range(2)]
        for f in as_completed(futures):
            f.result()

    # Apenas um despacho pode ter sucesso
    successes = [r for r in results if r == "SUCCESS"]
    assert len(successes) == 1

    # Verifica saldo final (deve ter deduzido exatamente uma vez: 100 - 30 = 70)
    db = PgSessionLocal()
    db.info["ignore_tenant_filter"] = True
    saldo = db.query(EstoqueSaldoModel).filter(
        EstoqueSaldoModel.loja_id == loja_origem.id,
        EstoqueSaldoModel.produto_id == produto.id
    ).first()
    assert saldo.quantidade == 70
    db.close()
