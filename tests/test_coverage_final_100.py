import importlib
import os
import random
from unittest.mock import MagicMock, patch
from uuid import uuid4

import defusedxml.ElementTree as ET
import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy.orm import Session

import src.infrastructure.database.session as session_module
import src.infrastructure.web.limiter as limiter_module
import src.infrastructure.web.main as main_module
from src.domain.entities.fornecedor import Fornecedor
from src.domain.entities.loja import Loja
from src.domain.entities.produto import Produto
from src.domain.entities.tenant import Tenant
from src.domain.entities.transferencia_estoque import TransferenciaEstoque
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    DomainException,
    LojaNaoEncontradaException,
    TransferenciaNaoEncontradaException,
)
from src.domain.services.nfe_parser import EmitenteNFe, ItemNFe, NFeDados, NFeParserService
from src.infrastructure.database.repositorios_concrete import (
    RepositorioClienteSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioFinanceiroLancamentoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioTenantSQLAlchemy,
    RepositorioTransferenciaEstoqueSQLAlchemy,
    RepositorioUsuarioSQLAlchemy,
    RepositorioVendaSQLAlchemy,
)
from src.infrastructure.security.jwt_handler import ALGORITHM, SECRET_KEY
from src.infrastructure.security.password import BcryptServicoCriptografia
from src.infrastructure.tasks.fechamento_diario import enviar_fechamento_diario_todos_tenants
from src.use_cases.analytics.gerar_curva_abc import CurvaABCInput, GerarCurvaABC
from src.use_cases.estoque.importar_nfe import ImportarEstoqueNFe, ImportarNFeInput
from src.use_cases.estoque.registrar_venda import (
    RegistrarVendaAdministrativa,
    RegistrarVendaAdministrativaInput,
    RegistrarVendaItemInput,
)

VALID_CNPJ_BASE = "112223330001"
VALID_CPF = "12345678909"


def gerar_cnpj() -> str:
    n = [random.randint(0, 9) for _ in range(8)] + [0, 0, 0, 1]
    d1 = sum(x * y for x, y in zip(n, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])) % 11
    d1 = 0 if d1 < 2 else 11 - d1
    n.append(d1)
    d2 = sum(x * y for x, y in zip(n, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])) % 11
    d2 = 0 if d2 < 2 else 11 - d2
    n.append(d2)
    return "".join(map(str, n))


def test_nfe_parser_security_forbidden():
    with patch("defusedxml.ElementTree.fromstring", side_effect=ET.DTDForbidden("DTD forbidden", "base", "sysid")):
        with pytest.raises(ValueError, match="XML inválido por motivos de segurança"):
            NFeParserService.parse_xml("<xml></xml>")


def test_session_database_url_empty():
    with patch.dict(os.environ, {"DATABASE_URL": ""}):
        with pytest.raises(ValueError, match="DATABASE_URL"):
            importlib.reload(session_module)
    importlib.reload(session_module)


def test_limiter_module_production_mode():
    with patch.dict(os.environ, {"TESTING": "False", "REDIS_HOST": "redis", "REDIS_PORT": "6379"}):
        importlib.reload(limiter_module)
        assert "redis://" in limiter_module.storage_uri
    with patch.dict(os.environ, {"TESTING": "True"}):
        importlib.reload(limiter_module)
        assert limiter_module.storage_uri == "memory://"


def test_main_cors_origins_configured():
    with patch.dict(os.environ, {"CORS_ORIGINS": "http://site1.com,http://site2.com"}):
        importlib.reload(main_module)
        assert "http://site1.com" in main_module.allow_origins
    with patch.dict(os.environ, {"CORS_ORIGINS": ""}):
        importlib.reload(main_module)


def test_fechamento_diario_db_none():
    with patch("src.infrastructure.tasks.fechamento_diario.SessionLocal") as mock_session_factory:
        mock_db = MagicMock()
        mock_session_factory.return_value = mock_db
        mock_db.query.return_value.all.return_value = []
        msg = enviar_fechamento_diario_todos_tenants(db=None)
        assert "Processado fechamento para 0 tenants" in msg
        mock_db.close.assert_called_once()


def test_gerente_role_query_filters_and_views(client: TestClient, db_session: Session):
    tenant_repo = RepositorioTenantSQLAlchemy(db_session)
    loja_repo = RepositorioLojaSQLAlchemy(db_session)
    usuario_repo = RepositorioUsuarioSQLAlchemy(db_session)
    prod_repo = RepositorioProdutoSQLAlchemy(db_session)
    transf_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db_session)

    t = tenant_repo.salvar(Tenant(nome_fantasia="T Ger", razao_social="T Ger SA", cnpj=gerar_cnpj()))
    loja1 = loja_repo.salvar(Loja(nome="L1", cnpj=gerar_cnpj(), endereco="End1", tenant_id=t.id))
    loja2 = loja_repo.salvar(Loja(nome="L2", cnpj=gerar_cnpj(), endereco="End2", tenant_id=t.id))
    prod = prod_repo.salvar(Produto(nome="P1", sku=f"SKU-{uuid4().hex[:4]}", preco_custo=10.0, preco_venda=20.0, markup=1.0, tenant_id=t.id))

    crypto = BcryptServicoCriptografia()
    gerente = usuario_repo.salvar(Usuario(
        nome="Gerente",
        email=f"gerente.{uuid4().hex[:6]}@ger.com",
        senha_hash=crypto.gerar_hash("senha123"),
        role="GERENTE",
        tenant_id=t.id,
        loja_atribuida_id=loja1.id
    ))

    token = jwt.encode(
        {"sub": str(gerente.id), "tenant_id": str(t.id), "role": "GERENTE"},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Analytics Dashboard com GERENTE
    res_dash = client.get("/analytics/dashboard", headers=headers)
    assert res_dash.status_code == 200

    # 2. Analytics Curva ABC com GERENTE
    res_abc = client.get("/analytics/curva-abc", headers=headers)
    assert res_abc.status_code == 200

    # 3. Estoque Movimentacoes com GERENTE
    res_mov = client.get("/estoque/movimentacoes", headers=headers)
    assert res_mov.status_code == 200

    # 4. Vendas com GERENTE
    res_vendas = client.get("/vendas", headers=headers)
    assert res_vendas.status_code == 200

    # 5. Transferencias com GERENTE (listar e obter por id)
    transf = transf_repo.salvar(TransferenciaEstoque(
        loja_origem_id=loja1.id,
        loja_destino_id=loja2.id,
        produto_id=prod.id,
        quantidade=5,
        solicitado_por_id=gerente.id,
        tenant_id=t.id
    ))
    res_transf_list = client.get("/estoque/transferencias", headers=headers)
    assert res_transf_list.status_code == 200
    assert len(res_transf_list.json()) >= 1

    res_transf_get = client.get(f"/estoque/transferencias/{transf.id}", headers=headers)
    assert res_transf_get.status_code == 200

    # 6. Financeiro Lancamentos com GERENTE
    res_fin = client.get("/financeiro/lancamentos", headers=headers)
    assert res_fin.status_code == 200


def test_web_routes_value_error_and_domain_exception_handling(client: TestClient, db_session: Session):
    tenant_repo = RepositorioTenantSQLAlchemy(db_session)
    loja_repo = RepositorioLojaSQLAlchemy(db_session)
    usuario_repo = RepositorioUsuarioSQLAlchemy(db_session)
    prod_repo = RepositorioProdutoSQLAlchemy(db_session)
    transf_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db_session)

    t = tenant_repo.salvar(Tenant(nome_fantasia="T Err", razao_social="T Err SA", cnpj=gerar_cnpj()))
    loja = loja_repo.salvar(Loja(nome="L Err", cnpj=gerar_cnpj(), endereco="End", tenant_id=t.id))
    prod = prod_repo.salvar(Produto(nome="P Err", sku=f"SKU-{uuid4().hex[:4]}", preco_custo=10.0, preco_venda=20.0, markup=1.0, tenant_id=t.id))
    usr = usuario_repo.salvar(Usuario(
        nome="Dono Err",
        email=f"dono.{uuid4().hex[:6]}@err.com",
        senha_hash="hash",
        role="DONO",
        tenant_id=t.id
    ))

    token = jwt.encode(
        {"sub": str(usr.id), "tenant_id": str(t.id), "role": "DONO"},
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Auth register ValueError -> 422
    with patch("src.infrastructure.web.auth.CriarTenant.executar", side_effect=ValueError("Erro valor auth")):
        res = client.post("/auth/register", json={
            "nome_fantasia": "Empresa",
            "razao_social": "Empresa SA",
            "cnpj": gerar_cnpj(),
            "dono_nome": "Dono",
            "dono_email": f"novo.{uuid4().hex[:6]}@emp.com",
            "dono_senha": "senha123"
        })
        assert res.status_code == 422
        assert res.json()["detail"] == "Erro valor auth"

    # 2. Clientes Criar e Atualizar ValueError -> 422
    with patch("src.infrastructure.web.clientes.CriarCliente.executar", side_effect=ValueError("Erro valor cli")):
        res = client.post("/clientes/", json={
            "nome": "Cliente Teste",
            "documento": VALID_CPF,
            "email": "c@test.com"
        }, headers=headers)
        assert res.status_code == 422

    cli_id = uuid4()
    with patch("src.infrastructure.web.clientes.AtualizarCliente.executar", side_effect=ValueError("Erro valor cli")):
        res = client.put(f"/clientes/{cli_id}", json={
            "nome": "Cliente Teste",
            "email": "c@test.com",
            "ativo": True
        }, headers=headers)
        assert res.status_code == 422

    # 3. Fornecedor Atualizar ValueError -> 422
    forn_id = uuid4()
    with patch("src.infrastructure.web.fornecedores.AtualizarFornecedor.executar", side_effect=ValueError("Erro valor forn")):
        res = client.put(f"/fornecedores/{forn_id}", json={
            "nome_fantasia": "Forn",
            "razao_social": "Forn SA",
            "ativo": True
        }, headers=headers)
        assert res.status_code == 422

    # 4. Loja Criar e Atualizar ValueError -> 422
    with patch("src.infrastructure.web.lojas.CriarLoja.executar", side_effect=ValueError("Erro valor loja")):
        res = client.post("/lojas/", json={
            "nome": "Loja Nova",
            "cnpj": gerar_cnpj(),
            "endereco": "End"
        }, headers=headers)
        assert res.status_code == 422

    with patch("src.infrastructure.web.lojas.AtualizarLoja.executar", side_effect=ValueError("Erro valor loja")):
        res = client.put(f"/lojas/{loja.id}", json={
            "nome": "Loja Nova",
            "endereco": "End",
            "ativo": True
        }, headers=headers)
        assert res.status_code == 422

    # 5. Produto Atualizar ValueError -> 422
    with patch("src.infrastructure.web.produtos.AtualizarProduto.executar", side_effect=ValueError("Erro valor prod")):
        res = client.put(f"/produtos/{prod.id}", json={
            "nome": "P Atualizado",
            "preco_custo": 10.0,
            "preco_venda": 20.0,
            "markup": 1.0,
            "ativo": True
        }, headers=headers)
        assert res.status_code == 422

    # 6. Estoque Movimentar ValueError -> 422
    with patch("src.infrastructure.web.estoque.RegistrarMovimentacaoEstoque.executar", side_effect=ValueError("Erro valor mov")):
        res = client.post("/estoque/movimentar", json={
            "loja_id": str(loja.id),
            "produto_id": str(prod.id),
            "tipo": "ENTRADA",
            "quantidade": 1,
            "motivo": "M"
        }, headers=headers)
        assert res.status_code == 422

    # 7. Estoque Auditar DomainException & ValueError -> 400
    with patch("src.infrastructure.web.estoque_auditoria.AuditarEstoqueLoja.executar", side_effect=DomainException("Erro domain audit")):
        res = client.post("/estoque/auditar", json={
            "loja_id": str(loja.id),
            "itens": [{"produto_id": str(prod.id), "quantidade_fisica": 10}]
        }, headers=headers)
        assert res.status_code == 400

    with patch("src.infrastructure.web.estoque_auditoria.AuditarEstoqueLoja.executar", side_effect=ValueError("Erro valor audit")):
        res = client.post("/estoque/auditar", json={
            "loja_id": str(loja.id),
            "itens": [{"produto_id": str(prod.id), "quantidade_fisica": 10}]
        }, headers=headers)
        assert res.status_code == 400

    # 8. Estoque NFe Upload File read exception -> 400
    from tempfile import SpooledTemporaryFile
    with patch.object(SpooledTemporaryFile, "read", side_effect=IOError("Falha de leitura do disco")):
        res = client.post("/estoque/importar-xml", headers=headers, files={"file": ("nota.xml", b"<xml></xml>", "application/xml")})
        assert res.status_code == 400
        assert "Erro ao ler o arquivo enviado" in res.json()["detail"]

    # 9. Financeiro Despesas DomainException (400) & ValueError (422)
    with patch("src.infrastructure.web.financeiro.RegistrarDespesaLoja.executar", side_effect=DomainException("Erro domain desp")):
        res = client.post("/financeiro/despesas", json={
            "loja_id": str(loja.id),
            "valor": 50.0,
            "categoria": "ALUGUEL",
            "status_pagamento": "PAGO"
        }, headers=headers)
        assert res.status_code == 400

    with patch("src.infrastructure.web.financeiro.RegistrarDespesaLoja.executar", side_effect=ValueError("Erro valor desp")):
        res = client.post("/financeiro/despesas", json={
            "loja_id": str(loja.id),
            "valor": 50.0,
            "categoria": "ALUGUEL",
            "status_pagamento": "PAGO"
        }, headers=headers)
        assert res.status_code == 422

    # 10. Financeiro Lancamentos DomainException -> 400
    with patch("src.infrastructure.web.financeiro.ListarLancamentosFinanceiros.executar", side_effect=DomainException("Erro domain fin")):
        res = client.get("/financeiro/lancamentos", headers=headers)
        assert res.status_code == 400

    # 11. Transferencias solicitar: LojaNaoEncontradaException -> 404
    with patch("src.infrastructure.web.transferencias.SolicitarTransferencia.executar", side_effect=LojaNaoEncontradaException("Loja inex")):
        res = client.post("/estoque/transferencias", json={
            "loja_origem_id": str(loja.id),
            "loja_destino_id": str(loja.id),
            "produto_id": str(prod.id),
            "quantidade": 1
        }, headers=headers)
        assert res.status_code == 404

    # 12. Transferencias despachar: TransferenciaNaoEncontradaException (404) & ValueError (422)
    loja2 = loja_repo.salvar(Loja(nome="L Dest Err", cnpj=gerar_cnpj(), endereco="End2", tenant_id=t.id))
    transf = transf_repo.salvar(TransferenciaEstoque(
        loja_origem_id=loja.id,
        loja_destino_id=loja2.id,
        produto_id=prod.id,
        quantidade=1,
        solicitado_por_id=usr.id,
        tenant_id=t.id
    ))

    with patch("src.infrastructure.web.transferencias.DespacharTransferencia.executar", side_effect=TransferenciaNaoEncontradaException("Transf inex")):
        res = client.post(f"/estoque/transferencias/{transf.id}/despachar", headers=headers)
        assert res.status_code == 404

    with patch("src.infrastructure.web.transferencias.DespacharTransferencia.executar", side_effect=ValueError("Erro valor desp")):
        res = client.post(f"/estoque/transferencias/{transf.id}/despachar", headers=headers)
        assert res.status_code == 422

    # 13. Transferencias receber: TransferenciaNaoEncontradaException -> 404
    with patch("src.infrastructure.web.transferencias.ConfirmarRecebimento.executar", side_effect=TransferenciaNaoEncontradaException("Transf inex")):
        res = client.post(f"/estoque/transferencias/{transf.id}/receber", json={"quantidade_recebida": 1}, headers=headers)
        assert res.status_code == 404


def test_use_cases_specific_branches(db_session: Session):
    db_session.info["ignore_tenant_filter"] = True
    tenant_repo = RepositorioTenantSQLAlchemy(db_session)
    loja_repo = RepositorioLojaSQLAlchemy(db_session)
    usuario_repo = RepositorioUsuarioSQLAlchemy(db_session)
    prod_repo = RepositorioProdutoSQLAlchemy(db_session)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db_session)
    mov_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db_session)
    venda_repo = RepositorioVendaSQLAlchemy(db_session)
    fin_repo = RepositorioFinanceiroLancamentoSQLAlchemy(db_session)

    t = tenant_repo.salvar(Tenant(nome_fantasia="T UC2", razao_social="T UC2 SA", cnpj=gerar_cnpj()))
    loja = loja_repo.salvar(Loja(nome="L UC2", cnpj=gerar_cnpj(), endereco="End", tenant_id=t.id))
    prod = prod_repo.salvar(Produto(nome="P UC2", sku=f"PUC2-{uuid4().hex[:4]}", preco_custo=10.0, preco_venda=20.0, markup=1.0, tenant_id=t.id))
    usr = usuario_repo.salvar(Usuario(nome="Dono", email=f"dono.{uuid4().hex[:6]}@uc2.com", senha_hash="hash", role="DONO", tenant_id=t.id))

    # 1. GerarCurvaABC: total_geral == 0.0 com itens retornados -> Classe C (linhas 85-97)
    mock_db = MagicMock()
    mock_db.info = {}
    mock_venda = MagicMock(id=uuid4())
    mock_q1 = MagicMock()
    mock_q1.filter.return_value = mock_q1
    mock_q1.all.return_value = [mock_venda]

    mock_q2 = MagicMock()
    mock_q2.join.return_value = mock_q2
    mock_q2.filter.return_value = mock_q2
    mock_q2.all.return_value = [(prod.id, prod.nome, prod.sku, 2, 0.0)]

    def query_router(*args):
        if len(args) == 1:
            return mock_q1
        return mock_q2

    mock_db.query.side_effect = query_router
    out_abc = GerarCurvaABC(mock_db).executar(CurvaABCInput(tenant_id=t.id))
    assert len(out_abc.itens) == 1
    assert out_abc.itens[0].classe == "C"

    # 2. ImportarEstoqueNFe: denominador <= 0 ao recalcular custo médio (linha 118)
    class MockSaldoRepo:
        def listar_todos(self, *args, **kwargs):
            return []
        def obter_por_loja_e_produto_com_lock(self, *args, **kwargs):
            return None
        def salvar(self, *args, **kwargs):
            pass

    class MockProdRepo:
        def obter_por_sku(self, *args, **kwargs):
            return Produto(nome="P Existente", sku="SKU-EXIST", preco_custo=10.0, preco_venda=20.0, markup=1.0, tenant_id=t.id)
        def salvar(self, p, *args, **kwargs):
            return p

    class MockFornRepo:
        def obter_por_cnpj(self, *args, **kwargs):
            return Fornecedor(nome_fantasia="F", razao_social="F", cnpj="11111111000191", tenant_id=t.id)

    class MockLojaRepo:
        def obter_por_id(self, *args, **kwargs):
            return None

    class MockMovRepo:
        def salvar(self, *args, **kwargs):
            pass

    uc_nfe = ImportarEstoqueNFe(MockFornRepo(), MockProdRepo(), MockSaldoRepo(), MockLojaRepo(), MockMovRepo())
    with patch("src.use_cases.estoque.importar_nfe.NFeParserService.parse_xml") as mock_parse:
        mock_parse.return_value = NFeDados(
            emitente=EmitenteNFe(
                cnpj="11111111000191",
                razao_social="Forn SA",
                nome_fantasia="Forn"
            ),
            itens=[
                ItemNFe(
                    codigo_produto="SKU-EXIST",
                    codigo_barras=None,
                    nome="Desc",
                    quantidade=0.0,  # Denominador será 0 + 0 = 0 -> aciona linha 118
                    valor_unitario=35.0
                )
            ]
        )
        res_nfe = uc_nfe.executar(ImportarNFeInput(xml_content=b"<xml></xml>", tenant_id=t.id))
        assert len(res_nfe.itens_processados) == 1
        assert res_nfe.itens_processados[0].produto.preco_custo == 35.0

    # 3. RegistrarVendaAdministrativa: saldo is None e quantidade == 0 (linha 162)
    uc_venda = RegistrarVendaAdministrativa(
        venda_repo=venda_repo,
        financeiro_repo=fin_repo,
        loja_repo=loja_repo,
        cliente_repo=RepositorioClienteSQLAlchemy(db_session),
        produto_repo=prod_repo,
        saldo_repo=saldo_repo,
        movimentacao_repo=mov_repo
    )
    with patch.object(mov_repo, "salvar"), \
         patch.object(venda_repo, "salvar") as mock_venda_salvar, \
         patch.object(fin_repo, "salvar"), \
         patch("src.use_cases.estoque.registrar_venda.ItemVenda"), \
         patch("src.use_cases.estoque.registrar_venda.EstoqueMovimentacao"), \
         patch("src.use_cases.estoque.registrar_venda.Venda"), \
         patch("src.use_cases.estoque.registrar_venda.FinanceiroLancamento"):
        mock_venda_obj = MagicMock()
        mock_venda_salvar.return_value = mock_venda_obj
        venda_out = uc_venda.executar(RegistrarVendaAdministrativaInput(
            loja_id=loja.id,
            usuario_id=usr.id,
            cliente_id=None,
            forma_pagamento="DINHEIRO",
            desconto=0.0,
            tenant_id=t.id,
            itens=[RegistrarVendaItemInput(produto_id=prod.id, quantidade=0)]
        ))
        assert venda_out.venda is not None
