import os
import random
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.domain.entities.cliente import Cliente
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import LimiteCreditoExcedidoException
from src.infrastructure.database.models import (
    Base,
    CaixaOperacaoModel,
    CaixaTurnoModel,
    ClienteModel,
    EstoqueMovimentacaoModel,
    EstoqueSaldoModel,
    FinanceiroLancamentoModel,
    ItemVendaModel,
    LojaModel,
    PagamentoVendaModel,
    ProdutoModel,
    TenantModel,
    UsuarioModel,
    VendaModel,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioClienteSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioFinanceiroLancamentoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioUsuarioSQLAlchemy,
    RepositorioVendaSQLAlchemy,
)
from src.infrastructure.web.auth import UsuarioCreateRequest, criar_usuario_equipe
from src.infrastructure.web.caixa import (
    AbrirCaixaRequest,
    FecharCaixaRequest,
    OperacaoCaixaRequest,
    abrir_caixa,
    fechar_caixa,
    registrar_operacao_caixa,
)
from src.use_cases.estoque.estornar_venda import EstornarVenda, EstornarVendaInput
from src.use_cases.estoque.registrar_venda import (
    RegistrarVendaAdministrativa,
    RegistrarVendaAdministrativaInput,
    RegistrarVendaItemInput,
    RegistrarVendaPagamentoInput,
)


def gerar_cnpj_valido() -> str:
    """Gera um CNPJ matematicamente válido."""
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


def gerar_cpf_valido() -> str:
    """Gera um CPF matematicamente válido."""
    n = [random.randint(0, 9) for _ in range(9)]
    soma1 = sum(n[i] * (10 - i) for i in range(9))
    d1 = (soma1 * 10) % 11
    if d1 == 10:
        d1 = 0
    soma2 = sum((n + [d1])[i] * (11 - i) for i in range(10))
    d2 = (soma2 * 10) % 11
    if d2 == 10:
        d2 = 0
    return "".join(map(str, n + [d1, d2]))


# Conexão com o banco de dados PostgreSQL real para suportar locks pessimistas e índices parciais
pg_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres_password@postgres:5432/gerenciador_saas")
pg_engine = create_engine(pg_url)
PgSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)

# Verifica se o PostgreSQL está acessível
try:
    with pg_engine.connect() as conn:
        postgres_available = not pg_url.startswith("sqlite")
except Exception:
    postgres_available = False

pytestmark = pytest.mark.skipif(
    not postgres_available,
    reason="PostgreSQL não está disponível para testar concorrência real (requer contêineres Docker ativos)",
)


@pytest.fixture(scope="module", autouse=True)
def setup_pg_concorrencia_tables():
    """Garante que as tabelas existem no PostgreSQL real uma única vez por módulo de teste."""
    if postgres_available:
        Base.metadata.create_all(bind=pg_engine)


@pytest.fixture
def setup_pg_concorrencia_completo():
    """
    Cria estrutura base (Tenant, Loja, Usuário Dono, Produto com Saldo) no PostgreSQL real.
    Garante limpeza de todos os dados criados no final de cada teste.
    """
    session = PgSessionLocal()
    session.info["ignore_tenant_filter"] = True

    cnpj_tenant = gerar_cnpj_valido()
    cnpj_loja = gerar_cnpj_valido()

    tenant_model = TenantModel(
        nome_fantasia="SaaS Race Condition Test",
        razao_social=f"SaaS Race Condition Test Ltda {uuid4().hex[:8]}",
        cnpj=cnpj_tenant,
        limite_usuarios=2,
        limite_lojas=2,
        plano="PRO",
    )
    session.add(tenant_model)
    session.flush()

    dono_model = UsuarioModel(
        tenant_id=tenant_model.id,
        nome="Dono Teste Concorrencia",
        email=f"dono_{uuid4().hex[:8]}@teste.com",
        senha_hash="$2b$12$DUMMYHASHDUMMYHASHDUMMYHASHDUMMYHASHDUMMYHASHDUMMYHA",
        role="DONO",
    )
    session.add(dono_model)
    session.flush()

    loja_model = LojaModel(
        tenant_id=tenant_model.id,
        nome="Filial Concorrencia Teste",
        cnpj=cnpj_loja,
        endereco="Av Concorrencia, 100",
    )
    session.add(loja_model)
    session.flush()

    produto_model = ProdutoModel(
        tenant_id=tenant_model.id,
        nome="Produto Race Test",
        sku=f"RACE-{uuid4().hex[:6]}",
        preco_custo=50.0,
        preco_venda=100.0,
        markup=100.0,
        ativo=True,
    )
    session.add(produto_model)
    session.flush()

    saldo_model = EstoqueSaldoModel(
        tenant_id=tenant_model.id,
        loja_id=loja_model.id,
        produto_id=produto_model.id,
        quantidade=100,
    )
    session.add(saldo_model)

    session.commit()

    tenant_id = tenant_model.id
    dono_id = dono_model.id
    loja_id = loja_model.id
    produto_id = produto_model.id

    session.close()

    yield {
        "tenant_id": tenant_id,
        "dono_id": dono_id,
        "loja_id": loja_id,
        "produto_id": produto_id,
    }

    # Limpeza pós-teste
    clean_session = PgSessionLocal()
    clean_session.info["ignore_tenant_filter"] = True
    clean_session.query(PagamentoVendaModel).filter(PagamentoVendaModel.tenant_id == tenant_id).delete()
    clean_session.query(ItemVendaModel).filter(ItemVendaModel.tenant_id == tenant_id).delete()
    clean_session.query(FinanceiroLancamentoModel).filter(FinanceiroLancamentoModel.tenant_id == tenant_id).delete()
    clean_session.query(VendaModel).filter(VendaModel.tenant_id == tenant_id).delete()
    clean_session.query(CaixaOperacaoModel).filter(CaixaOperacaoModel.tenant_id == tenant_id).delete()
    clean_session.query(CaixaTurnoModel).filter(CaixaTurnoModel.tenant_id == tenant_id).delete()
    clean_session.query(EstoqueMovimentacaoModel).filter(EstoqueMovimentacaoModel.tenant_id == tenant_id).delete()
    clean_session.query(EstoqueSaldoModel).filter(EstoqueSaldoModel.tenant_id == tenant_id).delete()
    clean_session.query(ProdutoModel).filter(ProdutoModel.tenant_id == tenant_id).delete()
    clean_session.query(ClienteModel).filter(ClienteModel.tenant_id == tenant_id).delete()
    clean_session.query(UsuarioModel).filter(UsuarioModel.tenant_id == tenant_id).delete()
    clean_session.query(LojaModel).filter(LojaModel.tenant_id == tenant_id).delete()
    clean_session.query(TenantModel).filter(TenantModel.id == tenant_id).delete()
    clean_session.commit()
    clean_session.close()


def test_concorrencia_abertura_turno_caixa(setup_pg_concorrencia_completo):
    """
    RC-01: Dispara 2 requisições simultâneas de abertura de turno para a mesma loja.
    Com a constraint de índice parcial (loja_id WHERE aberto = true), exatamente 1 tem efeito
    e a outra falha com erro 400 (turno já aberto).
    """
    ctx = setup_pg_concorrencia_completo
    loja_id = ctx["loja_id"]
    tenant_id = ctx["tenant_id"]
    dono_id = ctx["dono_id"]

    usuario_dono = Usuario(
        id=dono_id,
        tenant_id=tenant_id,
        nome="Dono Teste",
        email="dono@teste.com",
        senha_hash="dummy",
        role="DONO",
    )

    def tentar_abrir():
        thread_session = PgSessionLocal()
        thread_session.info["tenant_id"] = tenant_id
        try:
            req = AbrirCaixaRequest(loja_id=loja_id, fundo_inicial=100.0)
            res = abrir_caixa(request=req, db=thread_session, current_user=usuario_dono)
            return "SUCESSO", res.id
        except Exception as e:
            thread_session.rollback()
            return "ERRO", str(e)
        finally:
            thread_session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(tentar_abrir) for _ in range(2)]
        resultados = [f.result() for f in futs]

    sucessos = [r for r in resultados if r[0] == "SUCESSO"]
    erros = [r for r in resultados if r[0] == "ERRO"]

    assert len(sucessos) == 1, f"Deveria haver exatamente 1 sucesso, obteve: {resultados}"
    assert len(erros) == 1, f"Deveria haver exatamente 1 erro, obteve: {resultados}"
    assert "Já existe um turno de caixa aberto" in erros[0][1]

    # Verifica no banco se existe rigorosamente 1 turno aberto
    check_session = PgSessionLocal()
    check_session.info["tenant_id"] = tenant_id
    turnos_abertos = (
        check_session.query(CaixaTurnoModel)
        .filter(CaixaTurnoModel.loja_id == loja_id, CaixaTurnoModel.aberto.is_(True))
        .all()
    )
    assert len(turnos_abertos) == 1
    check_session.close()


def test_concorrencia_fechamento_turno_caixa(setup_pg_concorrencia_completo):
    """
    RC-02: Dispara 2 requisições simultâneas de fechamento do mesmo turno aberto.
    Com o lock pessimista (.with_for_update()), exatamente 1 requisição encerra o turno
    e a outra falha com erro 400 (turno já fechado / não encontrado).
    """
    ctx = setup_pg_concorrencia_completo
    loja_id = ctx["loja_id"]
    tenant_id = ctx["tenant_id"]
    dono_id = ctx["dono_id"]

    usuario_dono = Usuario(
        id=dono_id,
        tenant_id=tenant_id,
        nome="Dono Teste",
        email="dono@teste.com",
        senha_hash="dummy",
        role="DONO",
    )

    # 1. Abre um turno primeiro
    setup_session = PgSessionLocal()
    setup_session.info["tenant_id"] = tenant_id
    abrir_caixa(
        request=AbrirCaixaRequest(loja_id=loja_id, fundo_inicial=50.0),
        db=setup_session,
        current_user=usuario_dono,
    )
    setup_session.close()

    def tentar_fechar():
        thread_session = PgSessionLocal()
        thread_session.info["tenant_id"] = tenant_id
        try:
            req = FecharCaixaRequest(loja_id=loja_id, saldo_informado=50.0, observacao="Fechamento concorrente")
            res = fechar_caixa(request=req, db=thread_session, current_user=usuario_dono)
            return "SUCESSO", res
        except Exception as e:
            thread_session.rollback()
            return "ERRO", str(e)
        finally:
            thread_session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(tentar_fechar) for _ in range(2)]
        resultados = [f.result() for f in futs]

    sucessos = [r for r in resultados if r[0] == "SUCESSO"]
    erros = [r for r in resultados if r[0] == "ERRO"]

    assert len(sucessos) == 1, f"Deveria haver exatamente 1 sucesso: {resultados}"
    assert len(erros) == 1, f"Deveria haver exatamente 1 erro: {resultados}"
    assert "Não há turno de caixa aberto para encerramento" in erros[0][1]

    # Verifica que o turno está fechado
    check_session = PgSessionLocal()
    check_session.info["tenant_id"] = tenant_id
    turnos_abertos = (
        check_session.query(CaixaTurnoModel)
        .filter(CaixaTurnoModel.loja_id == loja_id, CaixaTurnoModel.aberto.is_(True))
        .all()
    )
    assert len(turnos_abertos) == 0
    check_session.close()


def test_concorrencia_sangria_suprimento_caixa(setup_pg_concorrencia_completo):
    """
    RC-03: Dispara 2 sangrias simultâneas de R$ 30,00 no mesmo turno de caixa.
    Com o lock pessimista (.with_for_update()), ambas serializam sem lost update:
    total_sangrias acumula R$ 60,00 e duas operações são registradas.
    """
    ctx = setup_pg_concorrencia_completo
    loja_id = ctx["loja_id"]
    tenant_id = ctx["tenant_id"]
    dono_id = ctx["dono_id"]

    usuario_dono = Usuario(
        id=dono_id,
        tenant_id=tenant_id,
        nome="Dono Teste",
        email="dono@teste.com",
        senha_hash="dummy",
        role="DONO",
    )

    # 1. Abre um turno
    setup_session = PgSessionLocal()
    setup_session.info["tenant_id"] = tenant_id
    turno = abrir_caixa(
        request=AbrirCaixaRequest(loja_id=loja_id, fundo_inicial=200.0),
        db=setup_session,
        current_user=usuario_dono,
    )
    turno_id = turno.id
    setup_session.close()

    def registrar_sangria():
        thread_session = PgSessionLocal()
        thread_session.info["tenant_id"] = tenant_id
        try:
            req = OperacaoCaixaRequest(loja_id=loja_id, tipo="SANGRIA", valor=30.0, motivo="Sangria concorrente")
            res = registrar_operacao_caixa(request=req, db=thread_session, current_user=usuario_dono)
            return "SUCESSO", res.id
        except Exception as e:
            thread_session.rollback()
            return "ERRO", str(e)
        finally:
            thread_session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(registrar_sangria) for _ in range(2)]
        resultados = [f.result() for f in futs]

    erros = [r for r in resultados if r[0] == "ERRO"]
    assert len(erros) == 0, f"Nenhuma sangria válida deveria falhar: {erros}"

    # Verifica saldo acumulado no turno
    check_session = PgSessionLocal()
    check_session.info["tenant_id"] = tenant_id
    turno_atual = check_session.query(CaixaTurnoModel).filter(CaixaTurnoModel.id == turno_id).first()
    assert turno_atual.total_sangrias == 60.0
    check_session.close()


def test_concorrencia_venda_limite_crediario(setup_pg_concorrencia_completo):
    """
    RC-04: Dispara 2 vendas simultâneas no crediário de R$ 80,00 cada para um cliente com limite R$ 100,00.
    Com o lock pessimista (obter_por_id_com_lock), exatamente 1 venda é aprovada
    e a outra falha com LimiteCreditoExcedidoException.
    """
    ctx = setup_pg_concorrencia_completo
    loja_id = ctx["loja_id"]
    tenant_id = ctx["tenant_id"]
    dono_id = ctx["dono_id"]
    produto_id = ctx["produto_id"]

    # Cria cliente com limite R$ 100,00 e saldo devedor R$ 0,00
    init_session = PgSessionLocal()
    init_session.info["tenant_id"] = tenant_id
    repo_cli = RepositorioClienteSQLAlchemy(init_session)
    cliente = repo_cli.salvar(
        Cliente(
            nome="Cliente Crediario Race",
            email="crediario_race@teste.com",
            documento=gerar_cpf_valido(),
            tenant_id=tenant_id,
            limite_credito=100.0,
            saldo_devedor_crediario=0.0,
            credito_loja=0.0,
            ativo=True,
        )
    )
    cliente_id = cliente.id
    init_session.commit()
    init_session.close()

    def executar_venda_crediario():
        thread_session = PgSessionLocal()
        thread_session.info["tenant_id"] = tenant_id
        try:
            v_repo = RepositorioVendaSQLAlchemy(thread_session)
            f_repo = RepositorioFinanceiroLancamentoSQLAlchemy(thread_session)
            l_repo = RepositorioLojaSQLAlchemy(thread_session)
            c_repo = RepositorioClienteSQLAlchemy(thread_session)
            p_repo = RepositorioProdutoSQLAlchemy(thread_session)
            s_repo = RepositorioEstoqueSaldoSQLAlchemy(thread_session)
            m_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(thread_session)

            use_case = RegistrarVendaAdministrativa(
                venda_repo=v_repo,
                financeiro_repo=f_repo,
                loja_repo=l_repo,
                cliente_repo=c_repo,
                produto_repo=p_repo,
                saldo_repo=s_repo,
                movimentacao_repo=m_repo,
            )

            input_data = RegistrarVendaAdministrativaInput(
                tenant_id=tenant_id,
                loja_id=loja_id,
                usuario_id=dono_id,
                cliente_id=cliente_id,
                itens=[RegistrarVendaItemInput(produto_id=produto_id, quantidade=1)],
                desconto=20.0,  # Preço produto 100 - 20 = 80
                pagamentos=[RegistrarVendaPagamentoInput(forma_pagamento="CREDIARIO", valor=80.0)],
            )
            res = use_case.executar(input_data)
            thread_session.commit()
            return "SUCESSO", res.venda.id
        except LimiteCreditoExcedidoException as e:
            thread_session.rollback()
            return "LIMITE_EXCEDIDO", str(e)
        except Exception as e:
            thread_session.rollback()
            return "OUTRO_ERRO", str(e)
        finally:
            thread_session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(executar_venda_crediario) for _ in range(2)]
        resultados = [f.result() for f in futs]

    sucessos = [r for r in resultados if r[0] == "SUCESSO"]
    excedidos = [r for r in resultados if r[0] == "LIMITE_EXCEDIDO"]

    assert len(sucessos) == 1, f"Apenas 1 venda deveria suceder: {resultados}"
    assert len(excedidos) == 1, f"A 2ª venda deveria falhar por limite: {resultados}"

    # Confere saldo devedor do cliente no banco
    check_session = PgSessionLocal()
    check_session.info["tenant_id"] = tenant_id
    repo_cli_check = RepositorioClienteSQLAlchemy(check_session)
    cli_final = repo_cli_check.obter_por_id(cliente_id, tenant_id)
    assert cli_final.saldo_devedor_crediario == 80.0
    check_session.close()


def test_concorrencia_venda_saldo_credito_loja(setup_pg_concorrencia_completo):
    """
    RC-05: Dispara 2 vendas simultâneas usando R$ 60,00 de crédito da loja para um cliente que possui apenas R$ 100,00.
    Com o lock pessimista (obter_por_id_com_lock), exatamente 1 venda é aprovada
    e a outra falha com ValueError ("Saldo de crédito em loja insuficiente").
    """
    ctx = setup_pg_concorrencia_completo
    loja_id = ctx["loja_id"]
    tenant_id = ctx["tenant_id"]
    dono_id = ctx["dono_id"]
    produto_id = ctx["produto_id"]

    # Cria cliente com saldo de crédito R$ 100,00
    init_session = PgSessionLocal()
    init_session.info["tenant_id"] = tenant_id
    repo_cli = RepositorioClienteSQLAlchemy(init_session)
    cliente = repo_cli.salvar(
        Cliente(
            nome="Cliente Credito Race",
            email="credito_race@teste.com",
            documento=gerar_cpf_valido(),
            tenant_id=tenant_id,
            limite_credito=0.0,
            saldo_devedor_crediario=0.0,
            credito_loja=100.0,
            ativo=True,
        )
    )
    cliente_id = cliente.id
    init_session.commit()
    init_session.close()

    def executar_venda_credito():
        thread_session = PgSessionLocal()
        thread_session.info["tenant_id"] = tenant_id
        try:
            v_repo = RepositorioVendaSQLAlchemy(thread_session)
            f_repo = RepositorioFinanceiroLancamentoSQLAlchemy(thread_session)
            l_repo = RepositorioLojaSQLAlchemy(thread_session)
            c_repo = RepositorioClienteSQLAlchemy(thread_session)
            p_repo = RepositorioProdutoSQLAlchemy(thread_session)
            s_repo = RepositorioEstoqueSaldoSQLAlchemy(thread_session)
            m_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(thread_session)

            use_case = RegistrarVendaAdministrativa(
                venda_repo=v_repo,
                financeiro_repo=f_repo,
                loja_repo=l_repo,
                cliente_repo=c_repo,
                produto_repo=p_repo,
                saldo_repo=s_repo,
                movimentacao_repo=m_repo,
            )

            input_data = RegistrarVendaAdministrativaInput(
                tenant_id=tenant_id,
                loja_id=loja_id,
                usuario_id=dono_id,
                cliente_id=cliente_id,
                itens=[RegistrarVendaItemInput(produto_id=produto_id, quantidade=1)],
                desconto=40.0,  # Preço 100 - 40 = 60
                pagamentos=[RegistrarVendaPagamentoInput(forma_pagamento="CREDITO_LOJA", valor=60.0)],
            )
            res = use_case.executar(input_data)
            thread_session.commit()
            return "SUCESSO", res.venda.id
        except ValueError as e:
            thread_session.rollback()
            return "VALOR_INSUFICIENTE", str(e)
        except Exception as e:
            thread_session.rollback()
            return "OUTRO_ERRO", str(e)
        finally:
            thread_session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(executar_venda_credito) for _ in range(2)]
        resultados = [f.result() for f in futs]

    sucessos = [r for r in resultados if r[0] == "SUCESSO"]
    insuficientes = [r for r in resultados if r[0] == "VALOR_INSUFICIENTE"]

    assert len(sucessos) == 1, f"Apenas 1 venda com crédito deveria suceder: {resultados}"
    assert len(insuficientes) == 1, f"A 2ª venda deveria falhar por crédito insuficiente: {resultados}"
    assert "Saldo de crédito em loja insuficiente" in insuficientes[0][1]

    # Confere saldo de crédito restante no cliente (100 - 60 = 40)
    check_session = PgSessionLocal()
    check_session.info["tenant_id"] = tenant_id
    repo_cli_check = RepositorioClienteSQLAlchemy(check_session)
    cli_final = repo_cli_check.obter_por_id(cliente_id, tenant_id)
    assert cli_final.credito_loja == 40.0
    check_session.close()


def test_concorrencia_estorno_duplo_venda(setup_pg_concorrencia_completo):
    """
    RC-06: Dispara 2 requisições simultâneas para estornar a mesma venda.
    Com o lock pessimista (obter_por_id_com_lock), exatamente 1 estorno é processado
    e a outra falha com ValueError ("A venda já se encontra CANCELADA").
    O estoque é restituído exatamente uma vez.
    """
    ctx = setup_pg_concorrencia_completo
    loja_id = ctx["loja_id"]
    tenant_id = ctx["tenant_id"]
    dono_id = ctx["dono_id"]
    produto_id = ctx["produto_id"]

    # 1. Cria uma venda de 5 unidades
    init_session = PgSessionLocal()
    init_session.info["tenant_id"] = tenant_id
    v_repo = RepositorioVendaSQLAlchemy(init_session)
    f_repo = RepositorioFinanceiroLancamentoSQLAlchemy(init_session)
    l_repo = RepositorioLojaSQLAlchemy(init_session)
    c_repo = RepositorioClienteSQLAlchemy(init_session)
    p_repo = RepositorioProdutoSQLAlchemy(init_session)
    s_repo = RepositorioEstoqueSaldoSQLAlchemy(init_session)
    m_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(init_session)

    use_case = RegistrarVendaAdministrativa(
        venda_repo=v_repo,
        financeiro_repo=f_repo,
        loja_repo=l_repo,
        cliente_repo=c_repo,
        produto_repo=p_repo,
        saldo_repo=s_repo,
        movimentacao_repo=m_repo,
    )

    venda_res = use_case.executar(
        RegistrarVendaAdministrativaInput(
            tenant_id=tenant_id,
            loja_id=loja_id,
            usuario_id=dono_id,
            cliente_id=None,
            itens=[RegistrarVendaItemInput(produto_id=produto_id, quantidade=5)],
            forma_pagamento="DINHEIRO",
        )
    )
    venda_id = venda_res.venda.id
    init_session.commit()
    init_session.close()

    # Confere estoque debitado (100 - 5 = 95)
    check_session = PgSessionLocal()
    check_session.info["tenant_id"] = tenant_id
    s_check = RepositorioEstoqueSaldoSQLAlchemy(check_session).obter_por_loja_e_produto(loja_id, produto_id, tenant_id)
    assert s_check.quantidade == 95
    check_session.close()

    def executar_estorno():
        thread_session = PgSessionLocal()
        thread_session.info["tenant_id"] = tenant_id
        try:
            vr = RepositorioVendaSQLAlchemy(thread_session)
            fr = RepositorioFinanceiroLancamentoSQLAlchemy(thread_session)
            cr = RepositorioClienteSQLAlchemy(thread_session)
            sr = RepositorioEstoqueSaldoSQLAlchemy(thread_session)
            mr = RepositorioEstoqueMovimentacaoSQLAlchemy(thread_session)

            uc_estorno = EstornarVenda(
                venda_repo=vr,
                financeiro_repo=fr,
                cliente_repo=cr,
                saldo_repo=sr,
                movimentacao_repo=mr,
            )
            res = uc_estorno.executar(EstornarVendaInput(venda_id=venda_id, tenant_id=tenant_id))
            thread_session.commit()
            return "SUCESSO", res.mensagem
        except ValueError as e:
            thread_session.rollback()
            return "ERRO_VALOR", str(e)
        except Exception as e:
            thread_session.rollback()
            return "OUTRO_ERRO", str(e)
        finally:
            thread_session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(executar_estorno) for _ in range(2)]
        resultados = [f.result() for f in futs]

    sucessos = [r for r in resultados if r[0] == "SUCESSO"]
    erros = [r for r in resultados if r[0] == "ERRO_VALOR"]

    assert len(sucessos) == 1, f"Apenas 1 estorno deveria suceder: {resultados}"
    assert len(erros) == 1, f"O 2º estorno deveria falhar: {resultados}"
    assert "já se encontra CANCELADA" in erros[0][1]

    # Confere que o saldo retornou exatamente para 100 (95 + 5), não 105
    check_pos = PgSessionLocal()
    check_pos.info["tenant_id"] = tenant_id
    s_pos = RepositorioEstoqueSaldoSQLAlchemy(check_pos).obter_por_loja_e_produto(loja_id, produto_id, tenant_id)
    assert s_pos.quantidade == 100
    check_pos.close()


def test_concorrencia_limite_colaboradores_tenant(setup_pg_concorrencia_completo):
    """
    RC-07: Tenant com limite_usuarios = 2 possui 1 dono.
    2 requisições simultâneas tentam cadastrar um novo colaborador.
    Com o lock pessimista no Tenant (obter_por_id_com_lock), exatamente 1 colaborador é cadastrado
    e a outra falha com erro 400 (LimitePlanoAtingidoException).
    """
    ctx = setup_pg_concorrencia_completo
    loja_id = ctx["loja_id"]
    tenant_id = ctx["tenant_id"]
    dono_id = ctx["dono_id"]

    usuario_dono = Usuario(
        id=dono_id,
        tenant_id=tenant_id,
        nome="Dono Teste",
        email="dono@teste.com",
        senha_hash="dummy",
        role="DONO",
    )

    def tentar_criar_colaborador(idx: int):
        thread_session = PgSessionLocal()
        thread_session.info["tenant_id"] = tenant_id
        try:
            req = UsuarioCreateRequest(
                nome=f"Colaborador {idx}",
                email=f"colab_{idx}_{uuid4().hex[:6]}@teste.com",
                senha="senha_segura_123",
                role="GERENTE",
                loja_atribuida_id=loja_id,
            )
            res = criar_usuario_equipe(data=req, db=thread_session, current_user=usuario_dono)
            return "SUCESSO", res.id
        except Exception as e:
            thread_session.rollback()
            return "ERRO", str(e)
        finally:
            thread_session.close()

    with ThreadPoolExecutor(max_workers=2) as executor:
        futs = [executor.submit(tentar_criar_colaborador, i) for i in range(2)]
        resultados = [f.result() for f in futs]

    sucessos = [r for r in resultados if r[0] == "SUCESSO"]
    erros = [r for r in resultados if r[0] == "ERRO"]

    assert len(sucessos) == 1, f"Apenas 1 usuário deveria ser criado: {resultados}"
    assert len(erros) == 1, f"O 2º deveria falhar por limite de plano: {resultados}"
    assert "Limite do plano atingido" in erros[0][1]

    # Verifica total de usuários no tenant (dono + 1 colaborador = 2)
    check_session = PgSessionLocal()
    check_session.info["tenant_id"] = tenant_id
    total = len(RepositorioUsuarioSQLAlchemy(check_session).listar_por_tenant(tenant_id))
    assert total == 2
    check_session.close()
