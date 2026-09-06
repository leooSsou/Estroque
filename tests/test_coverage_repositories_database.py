import random
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from sqlalchemy.orm import Session

from src.domain.entities.auditoria_fisica import AuditoriaFisica, AuditoriaFisicaItem
from src.domain.entities.cliente import Cliente
from src.domain.entities.financeiro_lancamento import FinanceiroLancamento
from src.domain.entities.fornecedor import Fornecedor
from src.domain.entities.item_venda import ItemVenda
from src.domain.entities.loja import Loja
from src.domain.entities.produto import Produto
from src.domain.entities.tenant import Tenant
from src.domain.entities.transferencia_estoque import TransferenciaEstoque
from src.domain.entities.usuario import Usuario
from src.domain.entities.venda import Venda
from src.infrastructure.database.repositorios_concrete import (
    RepositorioAuditoriaFisicaSQLAlchemy,
    RepositorioClienteSQLAlchemy,
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
from src.infrastructure.database.session import get_db

VALID_CPF = "52998224725"


def gerar_cnpj_valido() -> str:
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


def test_tenant_and_usuario_repository_updates_and_none_paths(db_session: Session):
    db_session.info["ignore_tenant_filter"] = True
    tenant_repo = RepositorioTenantSQLAlchemy(db_session)
    usuario_repo = RepositorioUsuarioSQLAlchemy(db_session)

    # 1. Tenant None returns
    assert tenant_repo.obter_por_id(uuid4()) is None
    assert tenant_repo.obter_por_cnpj("00000000000000") is None

    # 2. Criar e atualizar Tenant
    cnpj_t = gerar_cnpj_valido()
    t = Tenant(nome_fantasia="Rede Alpha", razao_social="Rede Alpha Ltda", cnpj=cnpj_t)
    t_salvo = tenant_repo.salvar(t)

    t_atualizado = Tenant(
        id=t_salvo.id,
        nome_fantasia="Rede Alpha Modificada",
        razao_social="Rede Alpha Modificada SA",
        cnpj=cnpj_t,
        data_cadastro=t_salvo.data_cadastro
    )
    t_retorno = tenant_repo.salvar(t_atualizado)
    assert t_retorno.nome_fantasia == "Rede Alpha Modificada"

    # 3. Usuario None returns
    assert usuario_repo.obter_por_id(uuid4()) is None
    assert usuario_repo.obter_por_email("nao_existe@test.com") is None

    # 4. Criar e atualizar Usuario
    u = Usuario(
        nome="Admin Original",
        email=f"admin.{uuid4().hex[:6]}@alpha.com",
        senha_hash="hash123",
        role="DONO",
        tenant_id=t_salvo.id
    )
    u_salvo = usuario_repo.salvar(u)

    u_atualizado = Usuario(
        id=u_salvo.id,
        nome="Admin Nome Atualizado",
        email=f"admin.novo.{uuid4().hex[:6]}@alpha.com",
        senha_hash="hash456",
        role="DONO",
        tenant_id=t_salvo.id
    )
    u_retorno = usuario_repo.salvar(u_atualizado)
    assert u_retorno.nome == "Admin Nome Atualizado"


def test_catalogo_repositories_updates_and_filters(db_session: Session):
    db_session.info["ignore_tenant_filter"] = True
    tenant_repo = RepositorioTenantSQLAlchemy(db_session)
    loja_repo = RepositorioLojaSQLAlchemy(db_session)
    produto_repo = RepositorioProdutoSQLAlchemy(db_session)
    cliente_repo = RepositorioClienteSQLAlchemy(db_session)
    fornecedor_repo = RepositorioFornecedorSQLAlchemy(db_session)

    t = tenant_repo.salvar(Tenant(nome_fantasia="Tenant Cat", razao_social="Tenant Cat Ltda", cnpj=gerar_cnpj_valido()))

    # None returns
    assert loja_repo.obter_por_id(uuid4(), t.id) is None
    assert loja_repo.obter_por_cnpj("00000000000000", t.id) is None
    assert produto_repo.obter_por_id(uuid4(), t.id) is None
    assert produto_repo.obter_por_sku("SKU_INEXISTENTE", t.id) is None
    assert produto_repo.obter_por_codigo_barras("0000000000", t.id) is None
    assert cliente_repo.obter_por_id(uuid4(), t.id) is None
    assert cliente_repo.obter_por_documento("00000000000", t.id) is None
    assert fornecedor_repo.obter_por_id(uuid4(), t.id) is None
    assert fornecedor_repo.obter_por_cnpj("00000000000000", t.id) is None

    # Loja
    cnpj_loja = gerar_cnpj_valido()
    _ = loja_repo.salvar(Loja(nome="Filial Centro", cnpj=cnpj_loja, endereco="Rua 1", tenant_id=t.id))
    assert loja_repo.obter_por_cnpj(cnpj_loja, t.id) is not None

    # Fornecedor update
    forn = fornecedor_repo.salvar(Fornecedor(nome_fantasia="Forn 1", razao_social="Forn 1 Ltda", cnpj=gerar_cnpj_valido(), tenant_id=t.id))
    forn_up = Fornecedor(id=forn.id, nome_fantasia="Forn 1 Editado", razao_social="Forn 1 Editado SA", cnpj=forn.cnpj, tenant_id=t.id, ativo=False)
    forn_ret = fornecedor_repo.salvar(forn_up)
    assert forn_ret.nome_fantasia == "Forn 1 Editado"
    assert forn_ret.ativo is False

    # Cliente update
    cli = cliente_repo.salvar(Cliente(nome="Cliente A", email="clia@test.com", documento=VALID_CPF, tenant_id=t.id))
    cli_up = Cliente(id=cli.id, nome="Cliente A Alterado", email="clianovo@test.com", documento=cli.documento, tenant_id=t.id, limite_credito=500.0, saldo_devedor_crediario=150.0)
    cli_ret = cliente_repo.salvar(cli_up)
    assert cli_ret.limite_credito == 500.0
    assert cli_ret.saldo_devedor_crediario == 150.0

    # Produto update e busca por termo
    prod = produto_repo.salvar(Produto(nome="Feijao Carioca", sku=f"FEIJ-{uuid4().hex[:4]}", preco_custo=5.0, preco_venda=8.0, markup=0.6, tenant_id=t.id, codigo_barras="789101112"))
    _ = produto_repo.salvar(Produto(nome="Arroz Branco", sku=f"ARROZ-{uuid4().hex[:4]}", preco_custo=15.0, preco_venda=22.0, markup=0.46, tenant_id=t.id, codigo_barras="789101113"))
    
    # Atualiza produto
    prod_up = Produto(id=prod.id, nome="Feijao Preto Premium", sku=prod.sku, preco_custo=6.0, preco_venda=10.0, markup=0.66, tenant_id=t.id, codigo_barras="789101112", ativo=True)
    prod_ret = produto_repo.salvar(prod_up)
    assert prod_ret.nome == "Feijao Preto Premium"

    # Busca por termo (nome, sku, codigo_barras)
    res_nome = produto_repo.listar_todos(t.id, termo="Feijao")
    assert any(p.nome == "Feijao Preto Premium" for p in res_nome)

    res_sku = produto_repo.listar_todos(t.id, termo="ARROZ")
    assert len(res_sku) == 1

    res_cod = produto_repo.listar_todos(t.id, termo="789101113")
    assert len(res_cod) == 1


def test_transferencia_auditoria_and_venda_repository_branches(db_session: Session):
    db_session.info["ignore_tenant_filter"] = True
    tenant_repo = RepositorioTenantSQLAlchemy(db_session)
    loja_repo = RepositorioLojaSQLAlchemy(db_session)
    produto_repo = RepositorioProdutoSQLAlchemy(db_session)
    usuario_repo = RepositorioUsuarioSQLAlchemy(db_session)
    transf_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db_session)
    auditoria_repo = RepositorioAuditoriaFisicaSQLAlchemy(db_session)
    venda_repo = RepositorioVendaSQLAlchemy(db_session)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db_session)

    t = tenant_repo.salvar(Tenant(nome_fantasia="Tenant Ops", razao_social="Ops Ltda", cnpj=gerar_cnpj_valido()))
    loja1 = loja_repo.salvar(Loja(nome="Loja 1", cnpj=gerar_cnpj_valido(), endereco="End 1", tenant_id=t.id))
    loja2 = loja_repo.salvar(Loja(nome="Loja 2", cnpj=gerar_cnpj_valido(), endereco="End 2", tenant_id=t.id))
    prod = produto_repo.salvar(Produto(nome="Item A", sku=f"ITM-{uuid4().hex[:4]}", preco_custo=10.0, preco_venda=20.0, markup=1.0, tenant_id=t.id))
    usr = usuario_repo.salvar(Usuario(nome="Dono Ops", email=f"dono.{uuid4().hex[:6]}@ops.com", senha_hash="hash", role="DONO", tenant_id=t.id))

    # 1. EstoqueSaldo None returns
    assert saldo_repo.obter_por_loja_e_produto(uuid4(), uuid4(), t.id) is None
    assert saldo_repo.obter_por_loja_e_produto_com_lock(uuid4(), uuid4(), t.id) is None

    # 2. Transferencia: None returns, listar_origem, listar_destino, listar_todas
    assert transf_repo.obter_por_id(uuid4(), t.id) is None
    assert transf_repo.obter_por_id_com_lock(uuid4(), t.id) is None

    transf = transf_repo.salvar(TransferenciaEstoque(
        loja_origem_id=loja1.id,
        loja_destino_id=loja2.id,
        produto_id=prod.id,
        quantidade=10,
        solicitado_por_id=usr.id,
        tenant_id=t.id
    ))
    assert transf_repo.obter_por_id_com_lock(transf.id, t.id) is not None
    assert len(transf_repo.listar_por_loja_origem(loja1.id, t.id)) == 1
    assert len(transf_repo.listar_por_loja_destino(loja2.id, t.id)) == 1
    assert len(transf_repo.listar_todas(t.id)) == 1

    # 3. AuditoriaFisica: None return, e salvar com model existente
    assert auditoria_repo.obter_por_id(uuid4(), t.id) is None
    item_aud = AuditoriaFisicaItem(produto_id=prod.id, quantidade_fisica=12, quantidade_sistema=10)
    aud = AuditoriaFisica(loja_id=loja1.id, tenant_id=t.id, itens=[item_aud])
    aud_salva = auditoria_repo.salvar(aud)
    assert auditoria_repo.obter_por_id(aud_salva.id, t.id) is not None

    # Salva novamente para exercitar o branch else do salvar
    auditoria_repo.salvar(aud_salva)

    # 4. Venda: None return, update de venda existente, listar com e sem loja_id
    assert venda_repo.obter_por_id(uuid4(), t.id) is None
    item_venda = ItemVenda(produto_id=prod.id, quantidade=2, preco_unitario=20.0, tenant_id=t.id)
    venda = Venda(
        loja_id=loja1.id,
        usuario_id=usr.id,
        status="PENDENTE",
        forma_pagamento="PIX",
        valor_total=40.0,
        desconto=0.0,
        tenant_id=t.id,
        itens=[item_venda]
    )
    venda_salva = venda_repo.salvar(venda)
    assert venda_repo.obter_por_id(venda_salva.id, t.id) is not None

    # Atualiza a venda existente
    venda_atualizada = Venda(
        id=venda_salva.id,
        loja_id=loja1.id,
        usuario_id=usr.id,
        status="PAGO",
        forma_pagamento="CARTAO_CREDITO",
        valor_total=35.0,
        desconto=5.0,
        tenant_id=t.id,
        itens=venda_salva.itens,
        cliente_id=None
    )
    venda_ret = venda_repo.salvar(venda_atualizada)
    assert venda_ret.status == "PAGO"
    assert venda_ret.desconto == 5.0

    # Listar todas com e sem loja
    assert len(venda_repo.listar_todas(t.id)) == 1
    assert len(venda_repo.listar_todas(t.id, loja_id=loja1.id)) == 1
    assert len(venda_repo.listar_todas(t.id, loja_id=loja2.id)) == 0


def test_financeiro_repository_branches(db_session: Session):
    db_session.info["ignore_tenant_filter"] = True
    tenant_repo = RepositorioTenantSQLAlchemy(db_session)
    loja_repo = RepositorioLojaSQLAlchemy(db_session)
    fin_repo = RepositorioFinanceiroLancamentoSQLAlchemy(db_session)

    t = tenant_repo.salvar(Tenant(nome_fantasia="Tenant Fin", razao_social="Fin Ltda", cnpj=gerar_cnpj_valido()))
    loja = loja_repo.salvar(Loja(nome="Loja Fin", cnpj=gerar_cnpj_valido(), endereco="Av Fin", tenant_id=t.id))

    # None return
    assert fin_repo.obter_por_id(uuid4(), t.id) is None

    # Cria lancamento
    agora = datetime.now(timezone.utc)
    lanc = fin_repo.salvar(FinanceiroLancamento(
        loja_id=loja.id,
        tipo="DESPESA",
        valor=150.0,
        categoria="Aluguel",
        status_pagamento="PENDENTE",
        tenant_id=t.id,
        data_lancamento=agora
    ))
    assert fin_repo.obter_por_id(lanc.id, t.id) is not None

    # Atualiza lancamento existente
    lanc_up = FinanceiroLancamento(
        id=lanc.id,
        loja_id=loja.id,
        tipo="DESPESA",
        valor=200.0,
        categoria="Aluguel Reajustado",
        status_pagamento="PAGO",
        tenant_id=t.id,
        data_lancamento=agora,
        data_pagamento=agora
    )
    lanc_ret = fin_repo.salvar(lanc_up)
    assert lanc_ret.valor == 200.0
    assert lanc_ret.status_pagamento == "PAGO"

    # Teste de filtros com data_inicio e data_fim
    d_inicio = agora - timedelta(days=1)
    d_fim = agora + timedelta(days=1)

    todos = fin_repo.listar_por_filtros(t.id, loja_id=loja.id, tipo="DESPESA", data_inicio=d_inicio, data_fim=d_fim)
    assert len(todos) == 1

    vazio = fin_repo.listar_por_filtros(t.id, loja_id=loja.id, tipo="RECEITA")
    assert len(vazio) == 0


def test_session_get_db_commit_and_rollback():
    # Testa a função get_db() diretamente para cobrir commit e rollback
    db_gen = get_db()
    db = next(db_gen)
    assert db is not None
    try:
        next(db_gen)
    except StopIteration:
        pass

    # Testa rollback em caso de exceção
    db_gen_err = get_db()
    _ = next(db_gen_err)
    with pytest.raises(RuntimeError, match="Erro forcado"):
        db_gen_err.throw(RuntimeError("Erro forcado"))
