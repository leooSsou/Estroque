from uuid import uuid4

import pytest

from src.domain.entities.auditoria_fisica import AuditoriaFisica, AuditoriaFisicaItem
from src.domain.entities.cliente import Cliente
from src.domain.entities.estoque_movimentacao import EstoqueMovimentacao
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.financeiro_lancamento import FinanceiroLancamento
from src.domain.entities.fornecedor import Fornecedor
from src.domain.entities.item_venda import ItemVenda
from src.domain.entities.loja import Loja
from src.domain.entities.produto import Produto
from src.domain.entities.tenant import Tenant
from src.domain.entities.transferencia_estoque import TransferenciaEstoque
from src.domain.entities.usuario import Usuario
from src.domain.entities.venda import Venda
from src.domain.exceptions.business import (
    FornecedorNaoEncontradoException,
    TenantNaoEncontradoException,
    TransferenciaNaoEncontradaException,
    UsuarioNaoEncontradoException,
)

VALID_CPF = "52998224725"
VALID_CNPJ = "12345678000195"


def test_cliente_validation_branches():
    tenant_id = uuid4()

    # Nome inválido
    with pytest.raises(ValueError, match="nome do cliente"):
        Cliente(nome="", email="c@test.com", documento=VALID_CPF, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="nome do cliente"):
        Cliente(nome=123, email="c@test.com", documento=VALID_CPF, tenant_id=tenant_id)  # type: ignore

    # Email inválido
    with pytest.raises(ValueError, match="e-mail deve ser uma string não vazia"):
        Cliente(nome="Cliente", email="", documento=VALID_CPF, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="e-mail deve ser uma string não vazia"):
        Cliente(nome="Cliente", email=123, documento=VALID_CPF, tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="E-mail inválido"):
        Cliente(nome="Cliente", email="invalido", documento=VALID_CPF, tenant_id=tenant_id)

    # Documento inválido
    with pytest.raises(ValueError, match="documento deve ser uma string"):
        Cliente(nome="Cliente", email="c@test.com", documento=123, tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="CPF \\(11 dígitos\\) ou CNPJ"):
        Cliente(nome="Cliente", email="c@test.com", documento="12345", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="CPF inválido"):
        Cliente(nome="Cliente", email="c@test.com", documento="11111111111", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="CPF inválido"):
        # Primeiro digito errado
        Cliente(nome="Cliente", email="c@test.com", documento="52998224715", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="CPF inválido"):
        # Segundo digito errado
        Cliente(nome="Cliente", email="c@test.com", documento="52998224724", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="CNPJ inválido"):
        Cliente(nome="Cliente", email="c@test.com", documento="12345678000100", tenant_id=tenant_id)

    # Tenant ID inválido
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        Cliente(nome="Cliente", email="c@test.com", documento=VALID_CPF, tenant_id="invalid")  # type: ignore

    # Ativo inválido
    with pytest.raises(ValueError, match="campo ativo deve ser um booleano"):
        Cliente(nome="Cliente", email="c@test.com", documento=VALID_CPF, tenant_id=tenant_id, ativo="sim")  # type: ignore

    # Limite crédito e saldo inválidos
    with pytest.raises(ValueError, match="limite de crédito deve ser um número"):
        Cliente(nome="Cliente", email="c@test.com", documento=VALID_CPF, tenant_id=tenant_id, limite_credito=-1)
    with pytest.raises(ValueError, match="limite de crédito deve ser um número"):
        Cliente(nome="Cliente", email="c@test.com", documento=VALID_CPF, tenant_id=tenant_id, limite_credito="cem")  # type: ignore
    with pytest.raises(ValueError, match="saldo devedor do crediário"):
        Cliente(nome="Cliente", email="c@test.com", documento=VALID_CPF, tenant_id=tenant_id, saldo_devedor_crediario=-1)
    with pytest.raises(ValueError, match="saldo devedor do crediário"):
        Cliente(nome="Cliente", email="c@test.com", documento=VALID_CPF, tenant_id=tenant_id, saldo_devedor_crediario="zero")  # type: ignore

    # Cliente válido com CNPJ
    cliente_cnpj = Cliente(nome="Empresa Cliente", email="cli@corp.com", documento=VALID_CNPJ, tenant_id=tenant_id)
    assert cliente_cnpj.documento == VALID_CNPJ


def test_venda_validation_branches():
    tenant_id = uuid4()
    loja_id = uuid4()
    usuario_id = uuid4()
    produto_id = uuid4()
    item = ItemVenda(produto_id=produto_id, quantidade=2, preco_unitario=10.0, tenant_id=tenant_id)

    with pytest.raises(ValueError, match="loja_id deve ser um UUID"):
        Venda(loja_id="invalid", usuario_id=usuario_id, status="PAGO", forma_pagamento="PIX", valor_total=20.0, desconto=0.0, tenant_id=tenant_id, itens=[item])  # type: ignore
    with pytest.raises(ValueError, match="usuario_id deve ser um UUID"):
        Venda(loja_id=loja_id, usuario_id="invalid", status="PAGO", forma_pagamento="PIX", valor_total=20.0, desconto=0.0, tenant_id=tenant_id, itens=[item])  # type: ignore
    with pytest.raises(ValueError, match="Status inválido"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="UNKNOWN", forma_pagamento="PIX", valor_total=20.0, desconto=0.0, tenant_id=tenant_id, itens=[item])
    with pytest.raises(ValueError, match="Forma de pagamento inválida"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="PAGO", forma_pagamento="CHEQUE", valor_total=20.0, desconto=0.0, tenant_id=tenant_id, itens=[item])
    with pytest.raises(ValueError, match="valor total da venda"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="PAGO", forma_pagamento="PIX", valor_total=-10.0, desconto=0.0, tenant_id=tenant_id, itens=[item])
    with pytest.raises(ValueError, match="desconto deve ser maior ou igual a zero"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="PAGO", forma_pagamento="PIX", valor_total=20.0, desconto=-5.0, tenant_id=tenant_id, itens=[item])
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="PAGO", forma_pagamento="PIX", valor_total=20.0, desconto=0.0, tenant_id="invalid", itens=[item])  # type: ignore
    with pytest.raises(ValueError, match="pelo menos um item"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="PAGO", forma_pagamento="PIX", valor_total=20.0, desconto=0.0, tenant_id=tenant_id, itens=[])
    with pytest.raises(ValueError, match="Todos os itens da venda devem ser instâncias"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="PAGO", forma_pagamento="PIX", valor_total=20.0, desconto=0.0, tenant_id=tenant_id, itens=["not_item"])  # type: ignore
    with pytest.raises(ValueError, match="cliente_id é obrigatório para vendas realizadas no crediário"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="PAGO", forma_pagamento="CREDIARIO", valor_total=20.0, desconto=0.0, tenant_id=tenant_id, itens=[item], cliente_id=None)
    with pytest.raises(ValueError, match="cliente_id deve ser um UUID"):
        Venda(loja_id=loja_id, usuario_id=usuario_id, status="PAGO", forma_pagamento="PIX", valor_total=20.0, desconto=0.0, tenant_id=tenant_id, itens=[item], cliente_id="invalid")  # type: ignore


def test_auditoria_fisica_validation_branches():
    produto_id = uuid4()
    loja_id = uuid4()
    tenant_id = uuid4()

    # Item validation
    with pytest.raises(ValueError, match="produto_id deve ser um UUID"):
        AuditoriaFisicaItem(produto_id="invalid", quantidade_fisica=10, quantidade_sistema=5)  # type: ignore
    with pytest.raises(ValueError, match="quantidade_fisica deve ser um número inteiro"):
        AuditoriaFisicaItem(produto_id=produto_id, quantidade_fisica=-1, quantidade_sistema=5)
    with pytest.raises(ValueError, match="quantidade_sistema deve ser um número inteiro"):
        AuditoriaFisicaItem(produto_id=produto_id, quantidade_fisica=10, quantidade_sistema=-2)

    item = AuditoriaFisicaItem(produto_id=produto_id, quantidade_fisica=10, quantidade_sistema=5)
    assert item.divergencia == 5

    # Auditoria validation
    with pytest.raises(ValueError, match="loja_id deve ser um UUID"):
        AuditoriaFisica(loja_id="invalid", tenant_id=tenant_id, itens=[item])  # type: ignore
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        AuditoriaFisica(loja_id=loja_id, tenant_id="invalid", itens=[item])  # type: ignore
    with pytest.raises(ValueError, match="fornecidos como uma lista"):
        AuditoriaFisica(loja_id=loja_id, tenant_id=tenant_id, itens="item")  # type: ignore
    with pytest.raises(ValueError, match="do tipo AuditoriaFisicaItem"):
        AuditoriaFisica(loja_id=loja_id, tenant_id=tenant_id, itens=["item"])  # type: ignore
    with pytest.raises(ValueError, match="pelo menos um item"):
        AuditoriaFisica(loja_id=loja_id, tenant_id=tenant_id, itens=[])


def test_produto_validation_branches():
    tenant_id = uuid4()
    with pytest.raises(ValueError, match="nome do produto"):
        Produto(nome="", sku="SKU1", preco_custo=10, preco_venda=20, markup=1.0, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="SKU do produto"):
        Produto(nome="P", sku="", preco_custo=10, preco_venda=20, markup=1.0, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="preço de custo"):
        Produto(nome="P", sku="SKU1", preco_custo=-1, preco_venda=20, markup=1.0, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="preço de venda"):
        Produto(nome="P", sku="SKU1", preco_custo=10, preco_venda=-1, markup=1.0, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="markup deve ser um número"):
        Produto(nome="P", sku="SKU1", preco_custo=10, preco_venda=20, markup="invalid", tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        Produto(nome="P", sku="SKU1", preco_custo=10, preco_venda=20, markup=1.0, tenant_id="invalid")  # type: ignore
    with pytest.raises(ValueError, match="código de barras deve ser uma string"):
        Produto(nome="P", sku="SKU1", preco_custo=10, preco_venda=20, markup=1.0, tenant_id=tenant_id, codigo_barras=123)  # type: ignore
    with pytest.raises(ValueError, match="fornecedor_id deve ser um UUID"):
        Produto(nome="P", sku="SKU1", preco_custo=10, preco_venda=20, markup=1.0, tenant_id=tenant_id, fornecedor_id="invalid")  # type: ignore
    with pytest.raises(ValueError, match="campo ativo deve ser um booleano"):
        Produto(nome="P", sku="SKU1", preco_custo=10, preco_venda=20, markup=1.0, tenant_id=tenant_id, ativo="sim")  # type: ignore

    with pytest.raises(ValueError, match="Preço de custo não pode ser negativo"):
        Produto.calcular_preco_venda(preco_custo=-10, markup=0.5)


def test_financeiro_lancamento_branches():
    loja_id = uuid4()
    tenant_id = uuid4()

    with pytest.raises(ValueError, match="loja_id deve ser um UUID"):
        FinanceiroLancamento(loja_id="invalid", tipo="RECEITA", valor=100.0, categoria="Vendas", status_pagamento="PAGO", tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="tipo de lançamento"):
        FinanceiroLancamento(loja_id=loja_id, tipo="OUTRO", valor=100.0, categoria="Vendas", status_pagamento="PAGO", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="valor do lançamento"):
        FinanceiroLancamento(loja_id=loja_id, tipo="RECEITA", valor=0.0, categoria="Vendas", status_pagamento="PAGO", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="categoria é obrigatória"):
        FinanceiroLancamento(loja_id=loja_id, tipo="RECEITA", valor=100.0, categoria="", status_pagamento="PAGO", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="status de pagamento"):
        FinanceiroLancamento(loja_id=loja_id, tipo="RECEITA", valor=100.0, categoria="Vendas", status_pagamento="CANCELADO", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        FinanceiroLancamento(loja_id=loja_id, tipo="RECEITA", valor=100.0, categoria="Vendas", status_pagamento="PAGO", tenant_id="invalid")  # type: ignore

    # Se for PAGO e data_pagamento omitida, preenche automaticamente
    lanc = FinanceiroLancamento(loja_id=loja_id, tipo="RECEITA", valor=100.0, categoria="Vendas", status_pagamento="PAGO", tenant_id=tenant_id)
    assert lanc.data_pagamento == lanc.data_lancamento


def test_fornecedor_branches():
    tenant_id = uuid4()

    with pytest.raises(ValueError, match="nome fantasia"):
        Fornecedor(nome_fantasia="", razao_social="R", cnpj=VALID_CNPJ, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="razão social"):
        Fornecedor(nome_fantasia="F", razao_social="", cnpj=VALID_CNPJ, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="CNPJ deve ser uma string"):
        Fornecedor(nome_fantasia="F", razao_social="R", cnpj=123, tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="CNPJ inválido"):
        Fornecedor(nome_fantasia="F", razao_social="R", cnpj="12345", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        Fornecedor(nome_fantasia="F", razao_social="R", cnpj=VALID_CNPJ, tenant_id="invalid")  # type: ignore
    with pytest.raises(ValueError, match="campo ativo deve ser um booleano"):
        Fornecedor(nome_fantasia="F", razao_social="R", cnpj=VALID_CNPJ, tenant_id=tenant_id, ativo="sim")  # type: ignore


def test_item_venda_branches():
    tenant_id = uuid4()
    produto_id = uuid4()

    with pytest.raises(ValueError, match="produto_id deve ser um UUID"):
        ItemVenda(produto_id="invalid", quantidade=1, preco_unitario=10.0, tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="quantidade deve ser um número inteiro maior que zero"):
        ItemVenda(produto_id=produto_id, quantidade=0, preco_unitario=10.0, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="preço unitário deve ser maior que zero"):
        ItemVenda(produto_id=produto_id, quantidade=1, preco_unitario=0.0, tenant_id=tenant_id)
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        ItemVenda(produto_id=produto_id, quantidade=1, preco_unitario=10.0, tenant_id="invalid")  # type: ignore


def test_loja_and_tenant_branches():
    tenant_id = uuid4()

    with pytest.raises(ValueError, match="nome da loja"):
        Loja(nome="", cnpj=VALID_CNPJ, endereco="Rua 1", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="CNPJ deve ser uma string"):
        Loja(nome="Loja", cnpj=123, endereco="Rua 1", tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="endereço deve ser uma string não vazia"):
        Loja(nome="Loja", cnpj=VALID_CNPJ, endereco="", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        Loja(nome="Loja", cnpj=VALID_CNPJ, endereco="Rua 1", tenant_id="invalid")  # type: ignore
    with pytest.raises(ValueError, match="campo ativo deve ser um booleano"):
        Loja(nome="Loja", cnpj=VALID_CNPJ, endereco="Rua 1", tenant_id=tenant_id, ativo="yes")  # type: ignore
    with pytest.raises(ValueError, match="CNPJ inválido"):
        Loja(nome="Loja", cnpj="12345", endereco="Rua 1", tenant_id=tenant_id)

    with pytest.raises(ValueError, match="nome fantasia"):
        Tenant(nome_fantasia="", razao_social="R", cnpj=VALID_CNPJ)
    with pytest.raises(ValueError, match="razão social"):
        Tenant(nome_fantasia="T", razao_social="", cnpj=VALID_CNPJ)
    with pytest.raises(ValueError, match="CNPJ deve ser uma string"):
        Tenant(nome_fantasia="T", razao_social="R", cnpj=123)  # type: ignore
    with pytest.raises(ValueError, match="CNPJ inválido"):
        Tenant(nome_fantasia="T", razao_social="R", cnpj="12345")


def test_transferencia_estoque_branches():
    loja_origem = uuid4()
    loja_destino = uuid4()
    produto_id = uuid4()
    solicitante_id = uuid4()
    aprovador_id = uuid4()

    with pytest.raises(ValueError, match="quantidade da transferência"):
        TransferenciaEstoque(loja_origem_id=loja_origem, loja_destino_id=loja_destino, produto_id=produto_id, quantidade=0, solicitado_por_id=solicitante_id)
    with pytest.raises(ValueError, match="lojas de origem e destino devem ser diferentes"):
        TransferenciaEstoque(loja_origem_id=loja_origem, loja_destino_id=loja_origem, produto_id=produto_id, quantidade=5, solicitado_por_id=solicitante_id)
    with pytest.raises(ValueError, match="Status de transferência inválido"):
        TransferenciaEstoque(loja_origem_id=loja_origem, loja_destino_id=loja_destino, produto_id=produto_id, quantidade=5, solicitado_por_id=solicitante_id, status="INVALID")

    transf = TransferenciaEstoque(loja_origem_id=loja_origem, loja_destino_id=loja_destino, produto_id=produto_id, quantidade=5, solicitado_por_id=solicitante_id)
    
    with pytest.raises(ValueError, match="Não é possível receber uma transferência no status"):
        transf.receber(aprovado_por_id=aprovador_id, quantidade_recebida=5)

    transf_despachada = transf.despachar(aprovado_por_id=aprovador_id)
    assert transf_despachada.status == "DESPACHADO"

    with pytest.raises(ValueError, match="Não é possível despachar uma transferência no status"):
        transf_despachada.despachar(aprovado_por_id=aprovador_id)

    with pytest.raises(ValueError, match="quantidade recebida não pode ser negativa"):
        transf_despachada.receber(aprovado_por_id=aprovador_id, quantidade_recebida=-1)
    with pytest.raises(ValueError, match="quantidade recebida não pode ser maior"):
        transf_despachada.receber(aprovado_por_id=aprovador_id, quantidade_recebida=10)
    with pytest.raises(ValueError, match="Justificativa é obrigatória em caso de divergência"):
        transf_despachada.receber(aprovado_por_id=aprovador_id, quantidade_recebida=3, justificativa="")

    transf_div = transf_despachada.receber(aprovado_por_id=aprovador_id, quantidade_recebida=3, justificativa="Itens quebrados")
    assert transf_div.status == "DIVERGENTE"
    assert transf_div.justificativa == "Itens quebrados"


def test_usuario_branches():
    tenant_id = uuid4()
    loja_id = uuid4()

    with pytest.raises(ValueError, match="nome do usuário"):
        Usuario(nome="", email="u@test.com", senha_hash="hash", role="DONO", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="e-mail deve ser uma string"):
        Usuario(nome="U", email=123, senha_hash="hash", role="DONO", tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="formato do e-mail"):
        Usuario(nome="U", email="email..invalido@test.com", senha_hash="hash", role="DONO", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="Perfil .* inválido"):
        Usuario(nome="U", email="u@test.com", senha_hash="hash", role="SUPERADMIN", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="hash da senha deve ser uma string não vazia"):
        Usuario(nome="U", email="u@test.com", senha_hash="", role="DONO", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="GERENTE devem estar associados a uma loja"):
        Usuario(nome="U", email="u@test.com", senha_hash="hash", role="GERENTE", tenant_id=tenant_id, loja_atribuida_id=None)
    with pytest.raises(ValueError, match="não devem ter uma loja específica atribuída"):
        Usuario(nome="U", email="u@test.com", senha_hash="hash", role="DONO", tenant_id=tenant_id, loja_atribuida_id=loja_id)


def test_estoque_movimentacao_and_saldo_branches():
    loja_id = uuid4()
    produto_id = uuid4()
    tenant_id = uuid4()

    # Movimentacao
    with pytest.raises(ValueError, match="loja_id deve ser um UUID"):
        EstoqueMovimentacao(loja_id="invalid", produto_id=produto_id, tipo="ENTRADA", quantidade=1, motivo="M", tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="produto_id deve ser um UUID"):
        EstoqueMovimentacao(loja_id=loja_id, produto_id="invalid", tipo="ENTRADA", quantidade=1, motivo="M", tenant_id=tenant_id)  # type: ignore
    with pytest.raises(ValueError, match="tipo de movimentação deve ser obrigatoriamente"):
        EstoqueMovimentacao(loja_id=loja_id, produto_id=produto_id, tipo="PERDA", quantidade=1, motivo="M", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="quantidade de movimentação deve ser um número inteiro maior que zero"):
        EstoqueMovimentacao(loja_id=loja_id, produto_id=produto_id, tipo="ENTRADA", quantidade=0, motivo="M", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="não pode exceder 1.000.000 unidades"):
        EstoqueMovimentacao(loja_id=loja_id, produto_id=produto_id, tipo="ENTRADA", quantidade=2_000_000, motivo="M", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="motivo da movimentação deve ser uma string não vazia"):
        EstoqueMovimentacao(loja_id=loja_id, produto_id=produto_id, tipo="ENTRADA", quantidade=10, motivo="", tenant_id=tenant_id)
    with pytest.raises(ValueError, match="tenant_id deve ser um UUID"):
        EstoqueMovimentacao(loja_id=loja_id, produto_id=produto_id, tipo="ENTRADA", quantidade=10, motivo="M", tenant_id="invalid")  # type: ignore
    with pytest.raises(ValueError, match="id deve ser um UUID"):
        EstoqueMovimentacao(loja_id=loja_id, produto_id=produto_id, tipo="ENTRADA", quantidade=10, motivo="M", tenant_id=tenant_id, id="invalid")  # type: ignore
    with pytest.raises(ValueError, match="data_movimentacao deve ser um objeto datetime"):
        EstoqueMovimentacao(loja_id=loja_id, produto_id=produto_id, tipo="ENTRADA", quantidade=10, motivo="M", tenant_id=tenant_id, data_movimentacao="invalid")  # type: ignore

    # Saldo
    with pytest.raises(ValueError, match="id deve ser um UUID"):
        EstoqueSaldo(loja_id=loja_id, produto_id=produto_id, quantidade=10, tenant_id=tenant_id, id="invalid")  # type: ignore


def test_business_exceptions_direct_instances():
    ex1 = TenantNaoEncontradoException("tenant-123")
    assert "tenant-123" in str(ex1)

    ex2 = UsuarioNaoEncontradoException("user-456")
    assert "user-456" in str(ex2)

    ex3 = FornecedorNaoEncontradoException("forn-789")
    assert "forn-789" in str(ex3)

    ex4 = TransferenciaNaoEncontradaException("transf-000")
    assert "transf-000" in str(ex4)
