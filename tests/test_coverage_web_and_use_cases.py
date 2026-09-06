import random
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy.orm import Session

from src.domain.entities.cliente import Cliente
from src.domain.entities.loja import Loja
from src.domain.entities.produto import Produto
from src.domain.entities.tenant import Tenant
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    ClienteNaoEncontradoException,
    FornecedorNaoEncontradoException,
    LojaNaoEncontradaException,
    ProdutoNaoEncontradoException,
    TenantNaoEncontradoException,
    TransferenciaNaoEncontradaException,
)
from src.domain.services.nfe_parser import NFeParserService
from src.infrastructure.database.repositorios_concrete import (
    RepositorioAuditoriaFisicaSQLAlchemy,
    RepositorioClienteSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioFinanceiroLancamentoSQLAlchemy,
    RepositorioFornecedorSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioTenantSQLAlchemy,
    RepositorioTransferenciaEstoqueSQLAlchemy,
    RepositorioUsuarioSQLAlchemy,
    RepositorioVendaSQLAlchemy,
)
from src.infrastructure.security.jwt_handler import ALGORITHM, SECRET_KEY, decodificar_token_acesso
from src.infrastructure.security.password import BcryptServicoCriptografia
from src.infrastructure.services.email_service import ConsoleEmailService
from src.infrastructure.tasks.fechamento_diario import enviar_fechamento_diario_todos_tenants
from src.use_cases.analytics.gerar_curva_abc import CurvaABCInput, GerarCurvaABC
from src.use_cases.analytics.gerar_dashboard import DashboardAnalyticsInput, GerarDashboardAnalytics
from src.use_cases.autenticacao.autenticar_usuario import AutenticarUsuario, AutenticarUsuarioInput
from src.use_cases.catalogo.gerenciar_cliente import ObterCliente
from src.use_cases.catalogo.gerenciar_fornecedor import AtualizarFornecedor, AtualizarFornecedorInput, ObterFornecedor
from src.use_cases.catalogo.gerenciar_produto import AtualizarProduto, AtualizarProdutoInput
from src.use_cases.estoque.auditar_estoque import AuditarEstoqueInput, AuditarEstoqueLoja, ItemAuditoriaInput
from src.use_cases.estoque.confirmar_recebimento import ConfirmarRecebimento, ConfirmarRecebimentoInput
from src.use_cases.estoque.despachar_transferencia import DespacharTransferencia, DespacharTransferenciaInput
from src.use_cases.estoque.registrar_movimentacao import (
    RegistrarMovimentacaoEstoque,
    RegistrarMovimentacaoEstoqueInput,
)
from src.use_cases.estoque.registrar_venda import (
    RegistrarVendaAdministrativa,
    RegistrarVendaAdministrativaInput,
    RegistrarVendaItemInput,
)
from src.use_cases.estoque.solicitar_transferencia import SolicitarTransferencia, SolicitarTransferenciaInput

VALID_CPF = "52998224725"


def gerar_cnpj() -> str:
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


def criar_tenant_e_token(client: TestClient, prefix: str) -> tuple[str, str, dict]:
    cnpj = gerar_cnpj()
    email = f"{prefix}.{uuid4().hex[:6]}@teste.com"
    res = client.post("/auth/register", json={
        "nome_fantasia": f"Tenant {prefix}",
        "razao_social": f"Tenant {prefix} SA",
        "cnpj": cnpj,
        "dono_nome": "Dono Teste",
        "dono_email": email,
        "dono_senha": "senha_segura_123"
    })
    assert res.status_code == 201
    dados = res.json()

    res_login = client.post("/auth/login", json={
        "email": email,
        "senha": "senha_segura_123"
    })
    token = res_login.json()["access_token"]
    return token, dados["tenant_id"], dados


def test_web_vendas_endpoints(client: TestClient):
    token, tenant_id, _ = criar_tenant_e_token(client, "vendas")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Cria Loja e Produto
    res_loja = client.post("/lojas/", headers=headers, json={
        "nome": "Loja Vendas",
        "cnpj": gerar_cnpj(),
        "endereco": "Rua das Vendas 100"
    })
    loja_id = res_loja.json()["id"]

    res_prod = client.post("/produtos/", headers=headers, json={
        "nome": "Produto Teste Venda",
        "sku": f"VND-{uuid4().hex[:6]}",
        "preco_custo": 10.0,
        "preco_venda": 25.0,
        "markup": 1.5
    })
    prod_id = res_prod.json()["id"]

    # Entrada no estoque via /estoque/movimentar
    res_mov = client.post("/estoque/movimentar", headers=headers, json={
        "loja_id": loja_id,
        "produto_id": prod_id,
        "tipo": "ENTRADA",
        "quantidade": 100,
        "motivo": "Estoque Inicial"
    })
    assert res_mov.status_code == 200

    # Registra venda
    res_venda = client.post("/vendas/", headers=headers, json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "desconto": 5.0,
        "itens": [{"produto_id": prod_id, "quantidade": 2}]
    })
    assert res_venda.status_code == 201
    venda_id = res_venda.json()["id"]

    # GET /vendas/{id} sucesso e 404
    res_get = client.get(f"/vendas/{venda_id}", headers=headers)
    assert res_get.status_code == 200
    assert res_get.json()["id"] == venda_id

    res_404 = client.get(f"/vendas/{uuid4()}", headers=headers)
    assert res_404.status_code == 404

    # GET /vendas sem filtro e com filtro de loja
    res_list = client.get("/vendas", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) >= 1

    res_list_loja = client.get(f"/vendas?loja_id={loja_id}", headers=headers)
    assert res_list_loja.status_code == 200

    # POST /vendas com erro 422 (desconto > subtotal)
    res_err = client.post("/vendas/", headers=headers, json={
        "loja_id": loja_id,
        "forma_pagamento": "PIX",
        "desconto": 1000.0,
        "itens": [{"produto_id": prod_id, "quantidade": 1}]
    })
    assert res_err.status_code == 422


def test_web_catalogo_404_and_422(client: TestClient):
    token, tenant_id, _ = criar_tenant_e_token(client, "cat404")
    headers = {"Authorization": f"Bearer {token}"}
    fake_id = str(uuid4())

    # Clientes 404 e 422
    assert client.get(f"/clientes/{fake_id}", headers=headers).status_code == 404
    assert client.put(f"/clientes/{fake_id}", headers=headers, json={
        "nome": "Novo",
        "email": "novo@teste.com",
        "ativo": True,
        "limite_credito": 100.0,
        "saldo_devedor_crediario": 0.0
    }).status_code == 404

    # Fornecedores 404
    assert client.get(f"/fornecedores/{fake_id}", headers=headers).status_code == 404
    assert client.put(f"/fornecedores/{fake_id}", headers=headers, json={
        "nome_fantasia": "Novo",
        "razao_social": "Novo SA",
        "ativo": True
    }).status_code == 404

    # Produtos 404
    assert client.get(f"/produtos/{fake_id}", headers=headers).status_code == 404
    assert client.put(f"/produtos/{fake_id}", headers=headers, json={
        "nome": "Prod",
        "preco_custo": 10.0,
        "preco_venda": 20.0,
        "markup": 1.0,
        "ativo": True
    }).status_code == 404

    # Lojas 404
    assert client.get(f"/lojas/{fake_id}", headers=headers).status_code == 404
    assert client.put(f"/lojas/{fake_id}", headers=headers, json={
        "nome": "Loja Nova",
        "endereco": "End Novo",
        "ativo": True
    }).status_code == 404

    # Transferencias 404
    assert client.get(f"/estoque/transferencias/{fake_id}", headers=headers).status_code == 404
    assert client.post(f"/estoque/transferencias/{fake_id}/despachar", headers=headers).status_code == 404
    assert client.post(f"/estoque/transferencias/{fake_id}/receber", headers=headers, json={"quantidade_recebida": 10}).status_code == 404

    # Transferencias listagem
    res_transf_list = client.get("/estoque/transferencias", headers=headers)
    assert res_transf_list.status_code == 200

    # Auditoria 404
    res_aud_404 = client.post("/estoque/auditar", headers=headers, json={
        "loja_id": fake_id,
        "itens": [{"produto_id": fake_id, "quantidade_fisica": 10}]
    })
    assert res_aud_404.status_code == 404

    # Financeiro despesas 404
    res_desp_404 = client.post("/financeiro/despesas", headers=headers, json={
        "loja_id": fake_id,
        "valor": 100.0,
        "categoria": "Luz",
        "status_pagamento": "PAGO"
    })
    assert res_desp_404.status_code == 404

    # Financeiro listagem lancamentos com data inválida
    res_fin_inv = client.get("/financeiro/lancamentos?data_inicio=data_invalida", headers=headers)
    assert res_fin_inv.status_code == 422


def test_web_nfe_import_validations(client: TestClient):
    token, _, _ = criar_tenant_e_token(client, "nfeval")
    headers = {"Authorization": f"Bearer {token}"}

    # Arquivo não XML
    res_txt = client.post(
        "/estoque/importar-xml",
        headers=headers,
        files={"file": ("doc.txt", b"conteudo de texto", "text/plain")}
    )
    assert res_txt.status_code == 400

    # Arquivo vazio
    res_empty = client.post(
        "/estoque/importar-xml",
        headers=headers,
        files={"file": ("nota.xml", b"", "application/xml")}
    )
    assert res_empty.status_code == 422

    # Loja inexistente
    res_loja_404 = client.post(
        f"/estoque/importar-xml?loja_id={uuid4()}",
        headers=headers,
        files={"file": ("nota.xml", b"<xml></xml>", "application/xml")}
    )
    assert res_loja_404.status_code == 404

    # XML corrompido
    res_corrompido = client.post(
        "/estoque/importar-xml",
        headers=headers,
        files={"file": ("nota.xml", b"<nfe>corrompido", "application/xml")}
    )
    assert res_corrompido.status_code == 422

    # Erro genérico do use case
    with patch("src.infrastructure.web.estoque_nfe.ImportarEstoqueNFe.executar", side_effect=RuntimeError("boom")):
        res_generic = client.post(
            "/estoque/importar-xml",
            headers=headers,
            files={"file": ("nota.xml", b"<xml></xml>", "application/xml")}
        )
        assert res_generic.status_code == 400
        assert "Falha ao processar a NF-e" in res_generic.json()["detail"]


def test_auth_dependencies_and_jwt_validation(client: TestClient):
    # Missing sub or tenant_id
    token_no_sub = jwt.encode({"tenant_id": str(uuid4()), "role": "DONO"}, SECRET_KEY, algorithm=ALGORITHM)
    res1 = client.get("/auth/me", headers={"Authorization": f"Bearer {token_no_sub}"})
    assert res1.status_code == 401

    # Non-UUID sub
    token_invalid_sub = jwt.encode({"sub": "not-a-uuid", "tenant_id": str(uuid4()), "role": "DONO"}, SECRET_KEY, algorithm=ALGORITHM)
    res2 = client.get("/auth/me", headers={"Authorization": f"Bearer {token_invalid_sub}"})
    assert res2.status_code == 401

    # User not in database
    token_unknown_user = jwt.encode({"sub": str(uuid4()), "tenant_id": str(uuid4()), "role": "DONO"}, SECRET_KEY, algorithm=ALGORITHM)
    res3 = client.get("/auth/me", headers={"Authorization": f"Bearer {token_unknown_user}"})
    assert res3.status_code == 401

    # Token missing role claim in jwt_handler
    token_no_role = jwt.encode({"sub": str(uuid4()), "tenant_id": str(uuid4())}, SECRET_KEY, algorithm=ALGORITHM)
    with pytest.raises(ValueError, match="claim obrigatória 'role'"):
        decodificar_token_acesso(token_no_role)


def test_nfe_parser_service_edge_cases():
    # 1. XML sem infNFe
    xml_sem_inf = "<nfeProc><outro></outro></nfeProc>"
    with pytest.raises(ValueError, match="tag <infNFe> não encontrada"):
        NFeParserService.parse_xml(xml_sem_inf)

    # 2. XML sem emit
    xml_sem_emit = "<nfeProc><NFe><infNFe></infNFe></NFe></nfeProc>"
    with pytest.raises(ValueError, match="tag <emit> do emitente não encontrada"):
        NFeParserService.parse_xml(xml_sem_emit)

    # 3. XML emit sem CNPJ
    xml_sem_cnpj = "<nfeProc><NFe><infNFe><emit><xNome>Forn</xNome></emit></infNFe></NFe></nfeProc>"
    with pytest.raises(ValueError, match="CNPJ do emitente da NF-e inválido ou ausente"):
        NFeParserService.parse_xml(xml_sem_cnpj)

    # 4. XML sem det
    xml_sem_det = f"<nfeProc><NFe><infNFe><emit><CNPJ>{gerar_cnpj()}</CNPJ></emit></infNFe></NFe></nfeProc>"
    with pytest.raises(ValueError, match="Nenhum item/produto foi encontrado"):
        NFeParserService.parse_xml(xml_sem_det)

    # 5. XML com det sem prod ou com quantidade inválida
    cnpj = gerar_cnpj()
    xml_det_sem_prod = f"""
    <nfeProc>
      <NFe>
        <infNFe>
          <emit><CNPJ>{cnpj}</CNPJ><xNome>Forn Teste</xNome></emit>
          <det nItem="1">
            <outro>nada</outro>
          </det>
          <det nItem="2">
            <prod>
              <cProd>ITEM1</cProd>
              <xProd>Produto Valido</xProd>
              <qCom>invalid_qty</qCom>
              <vUnCom>invalid_price</vUnCom>
            </prod>
          </det>
        </infNFe>
      </NFe>
    </nfeProc>
    """
    with pytest.raises(ValueError, match="não possui itens válidos com quantidade positiva"):
        NFeParserService.parse_xml(xml_det_sem_prod)


def test_use_cases_edge_cases(db_session: Session):
    db_session.info["ignore_tenant_filter"] = True
    tenant_repo = RepositorioTenantSQLAlchemy(db_session)
    usuario_repo = RepositorioUsuarioSQLAlchemy(db_session)
    loja_repo = RepositorioLojaSQLAlchemy(db_session)
    prod_repo = RepositorioProdutoSQLAlchemy(db_session)
    cli_repo = RepositorioClienteSQLAlchemy(db_session)
    forn_repo = RepositorioFornecedorSQLAlchemy(db_session)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db_session)
    transf_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db_session)
    mov_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db_session)
    venda_repo = RepositorioVendaSQLAlchemy(db_session)

    t = tenant_repo.salvar(Tenant(nome_fantasia="T UC", razao_social="T UC SA", cnpj=gerar_cnpj()))
    loja = loja_repo.salvar(Loja(nome="L UC", cnpj=gerar_cnpj(), endereco="End", tenant_id=t.id))
    loja_inativa = loja_repo.salvar(Loja(nome="L Inativa", cnpj=gerar_cnpj(), endereco="End", tenant_id=t.id, ativo=False))
    prod = prod_repo.salvar(Produto(nome="P UC", sku=f"PUC-{uuid4().hex[:4]}", preco_custo=10.0, preco_venda=20.0, markup=1.0, tenant_id=t.id))
    prod_inativo = prod_repo.salvar(Produto(nome="P Inativo", sku=f"PIN-{uuid4().hex[:4]}", preco_custo=10.0, preco_venda=20.0, markup=1.0, tenant_id=t.id, ativo=False))
    usr = usuario_repo.salvar(Usuario(nome="Dono", email=f"dono.{uuid4().hex[:6]}@uc.com", senha_hash="hash", role="DONO", tenant_id=t.id))

    # 1. AutenticarUsuario quando tenant foi deletado
    crypto = BcryptServicoCriptografia()
    fake_user = Usuario(nome="U Fake", email="fake@test.com", senha_hash=crypto.gerar_hash("senha"), role="DONO", tenant_id=uuid4())
    class MockUserRepo:
        def obter_por_email(self, email):
            return fake_user
    uc_auth = AutenticarUsuario(MockUserRepo(), tenant_repo, crypto)
    with pytest.raises(TenantNaoEncontradoException):
        uc_auth.executar(AutenticarUsuarioInput(email="fake@test.com", senha_plana="senha"))

    # 2. ObterCliente e Fornecedor not found
    with pytest.raises(ClienteNaoEncontradoException):
        ObterCliente(cli_repo).executar(uuid4(), t.id)
    with pytest.raises(FornecedorNaoEncontradoException):
        ObterFornecedor(forn_repo).executar(uuid4(), t.id)
    with pytest.raises(FornecedorNaoEncontradoException):
        AtualizarFornecedor(forn_repo).executar(AtualizarFornecedorInput(id=uuid4(), nome_fantasia="F", razao_social="F", ativo=True, tenant_id=t.id))
    with pytest.raises(ProdutoNaoEncontradoException):
        AtualizarProduto(prod_repo).executar(AtualizarProdutoInput(id=uuid4(), nome="P", preco_custo=10.0, preco_venda=20.0, markup=1.0, ativo=True, tenant_id=t.id))

    # 3. SolicitarTransferencia erros
    uc_solicitar = SolicitarTransferencia(loja_repo, prod_repo, transf_repo)
    with pytest.raises(LojaNaoEncontradaException):
        uc_solicitar.executar(SolicitarTransferenciaInput(loja_origem_id=uuid4(), loja_destino_id=loja.id, produto_id=prod.id, quantidade=1, solicitado_por_id=usr.id, tenant_id=t.id))
    with pytest.raises(ValueError, match="origem está inativa"):
        uc_solicitar.executar(SolicitarTransferenciaInput(loja_origem_id=loja_inativa.id, loja_destino_id=loja.id, produto_id=prod.id, quantidade=1, solicitado_por_id=usr.id, tenant_id=t.id))
    with pytest.raises(LojaNaoEncontradaException):
        uc_solicitar.executar(SolicitarTransferenciaInput(loja_origem_id=loja.id, loja_destino_id=uuid4(), produto_id=prod.id, quantidade=1, solicitado_por_id=usr.id, tenant_id=t.id))
    with pytest.raises(ValueError, match="destino está inativa"):
        uc_solicitar.executar(SolicitarTransferenciaInput(loja_origem_id=loja.id, loja_destino_id=loja_inativa.id, produto_id=prod.id, quantidade=1, solicitado_por_id=usr.id, tenant_id=t.id))
    with pytest.raises(ProdutoNaoEncontradoException):
        uc_solicitar.executar(SolicitarTransferenciaInput(loja_origem_id=loja.id, loja_destino_id=loja.id, produto_id=uuid4(), quantidade=1, solicitado_por_id=usr.id, tenant_id=t.id))
    with pytest.raises(ValueError, match="produto informado está inativo"):
        uc_solicitar.executar(SolicitarTransferenciaInput(loja_origem_id=loja.id, loja_destino_id=loja.id, produto_id=prod_inativo.id, quantidade=1, solicitado_por_id=usr.id, tenant_id=t.id))

    # 4. Despachar e Confirmar Recebimento transferencia não encontrada
    with pytest.raises(TransferenciaNaoEncontradaException):
        DespacharTransferencia(transf_repo, saldo_repo, mov_repo).executar(DespacharTransferenciaInput(transferencia_id=uuid4(), aprovado_por_id=usr.id, tenant_id=t.id))
    with pytest.raises(TransferenciaNaoEncontradaException):
        ConfirmarRecebimento(transf_repo, saldo_repo, mov_repo).executar(ConfirmarRecebimentoInput(transferencia_id=uuid4(), aprovado_por_id=usr.id, quantidade_recebida=1, tenant_id=t.id))

    # 5. AuditarEstoque erros e novo saldo
    auditoria_repo = RepositorioAuditoriaFisicaSQLAlchemy(db_session)
    uc_audit = AuditarEstoqueLoja(auditoria_repo, saldo_repo, mov_repo, loja_repo, prod_repo)
    with pytest.raises(LojaNaoEncontradaException):
        uc_audit.executar(AuditarEstoqueInput(loja_id=uuid4(), tenant_id=t.id, itens_contados=[ItemAuditoriaInput(produto_id=prod.id, quantidade_fisica=10)]))
    with pytest.raises(ValueError, match="ao menos um item contado"):
        uc_audit.executar(AuditarEstoqueInput(loja_id=loja.id, tenant_id=t.id, itens_contados=[]))
    with pytest.raises(ProdutoNaoEncontradoException):
        uc_audit.executar(AuditarEstoqueInput(loja_id=loja.id, tenant_id=t.id, itens_contados=[ItemAuditoriaInput(produto_id=uuid4(), quantidade_fisica=10)]))

    # Auditar criando saldo novo (quando não existia saldo anterior)
    res_audit = uc_audit.executar(AuditarEstoqueInput(loja_id=loja.id, tenant_id=t.id, itens_contados=[ItemAuditoriaInput(produto_id=prod.id, quantidade_fisica=15)]))
    assert res_audit.auditoria is not None

    # 6. RegistrarMovimentacao tipo inválido
    uc_mov = RegistrarMovimentacaoEstoque(saldo_repo, mov_repo, loja_repo, prod_repo)
    with pytest.raises(ValueError, match="obrigatoriamente 'ENTRADA' ou 'SAIDA'"):
        uc_mov.executar(RegistrarMovimentacaoEstoqueInput(loja_id=loja.id, produto_id=prod.id, tipo="AJUSTE", quantidade=5, motivo="M", tenant_id=t.id))

    # 7. RegistrarVenda produto inativo e crediario cliente inativo
    cli_inativo = cli_repo.salvar(Cliente(nome="Cli Inativo", email="inativo@c.com", documento=VALID_CPF, tenant_id=t.id, ativo=False))
    uc_venda = RegistrarVendaAdministrativa(
        venda_repo=venda_repo,
        financeiro_repo=RepositorioFinanceiroLancamentoSQLAlchemy(db_session),
        loja_repo=loja_repo,
        cliente_repo=cli_repo,
        produto_repo=prod_repo,
        saldo_repo=saldo_repo,
        movimentacao_repo=mov_repo
    )
    
    with pytest.raises(ProdutoNaoEncontradoException):
        uc_venda.executar(RegistrarVendaAdministrativaInput(loja_id=loja.id, usuario_id=usr.id, cliente_id=None, forma_pagamento="PIX", desconto=0.0, tenant_id=t.id, itens=[RegistrarVendaItemInput(produto_id=prod_inativo.id, quantidade=1)]))
    with pytest.raises(ValueError, match="cliente_id é obrigatório para vendas realizadas no crediário"):
        uc_venda.executar(RegistrarVendaAdministrativaInput(loja_id=loja.id, usuario_id=usr.id, cliente_id=None, forma_pagamento="CREDIARIO", desconto=0.0, tenant_id=t.id, itens=[RegistrarVendaItemInput(produto_id=prod.id, quantidade=1)]))
    with pytest.raises(ClienteNaoEncontradoException):
        uc_venda.executar(RegistrarVendaAdministrativaInput(loja_id=loja.id, usuario_id=usr.id, cliente_id=cli_inativo.id, forma_pagamento="CREDIARIO", desconto=0.0, tenant_id=t.id, itens=[RegistrarVendaItemInput(produto_id=prod.id, quantidade=1)]))

    # 8. Curva ABC e Dashboard com filtros de loja e datas
    agora = datetime.now(timezone.utc)
    curva_abc = GerarCurvaABC(db_session).executar(CurvaABCInput(tenant_id=t.id, loja_id=loja.id, data_inicio=agora - timedelta(days=5), data_fim=agora + timedelta(days=5)))
    assert curva_abc.itens == []

    dash = GerarDashboardAnalytics(db_session).executar(DashboardAnalyticsInput(tenant_id=t.id, loja_id=loja.id, data_inicio=agora - timedelta(days=5), data_fim=agora + timedelta(days=5)))
    assert dash.faturamento_bruto == 0.0

    # 9. Fechamento diário com tenant sem dono e com db=None
    _ = tenant_repo.salvar(Tenant(nome_fantasia="Sem Dono", razao_social="Sem Dono SA", cnpj=gerar_cnpj()))
    msg = enviar_fechamento_diario_todos_tenants(db_session)
    assert "Processado fechamento" in msg

    # EmailService console
    email_service = ConsoleEmailService()
    assert email_service.enviar_email("dest@test.com", "Assunto", "<p>Html</p>") is True
