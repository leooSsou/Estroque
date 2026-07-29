import pytest
from uuid import uuid4
from unittest.mock import Mock

from src.domain.entities.auditoria_fisica import AuditoriaFisica, AuditoriaFisicaItem
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.loja import Loja
from src.domain.entities.produto import Produto
from src.use_cases.estoque.auditar_estoque import (
    AuditarEstoqueLoja,
    AuditarEstoqueInput,
    ItemAuditoriaInput
)
from src.domain.exceptions.business import LojaNaoEncontradaException, ProdutoNaoEncontradoException

def test_auditar_estoque_sobra_e_perda():
    loja_id = uuid4()
    tenant_id = uuid4()
    produto_perda_id = uuid4()
    produto_sobra_id = uuid4()
    produto_ok_id = uuid4()

    auditoria_repo = Mock()
    saldo_repo = Mock()
    movimentacao_repo = Mock()
    loja_repo = Mock()
    produto_repo = Mock()

    # Mocks
    loja_repo.obter_por_id.return_value = Loja(nome="Loja 1", cnpj="02188445000172", endereco="Rua A", tenant_id=tenant_id, id=loja_id)
    produto_repo.obter_por_id.return_value = Produto(nome="Prod", sku="123", preco_custo=10.0, preco_venda=20.0, markup=2.0, tenant_id=tenant_id)
    
    # Saldos mockados:
    # produto_perda: sistema tem 10, fisico vai ser 8 (perda de 2)
    # produto_sobra: sistema tem 5, fisico vai ser 7 (sobra de 2)
    # produto_ok: sistema tem 3, fisico vai ser 3 (ok)
    def mock_obter_saldo(l_id, p_id, t_id):
        if p_id == produto_perda_id:
            return EstoqueSaldo(loja_id=l_id, produto_id=p_id, quantidade=10, tenant_id=t_id)
        elif p_id == produto_sobra_id:
            return EstoqueSaldo(loja_id=l_id, produto_id=p_id, quantidade=5, tenant_id=t_id)
        elif p_id == produto_ok_id:
            return EstoqueSaldo(loja_id=l_id, produto_id=p_id, quantidade=3, tenant_id=t_id)
        return None

    saldo_repo.obter_por_loja_e_produto_com_lock.side_effect = mock_obter_saldo
    
    auditoria_repo.salvar.side_effect = lambda x: x
    movimentacao_repo.salvar.side_effect = lambda x: x

    use_case = AuditarEstoqueLoja(auditoria_repo, saldo_repo, movimentacao_repo, loja_repo, produto_repo)
    
    input_data = AuditarEstoqueInput(
        loja_id=loja_id,
        tenant_id=tenant_id,
        itens_contados=[
            ItemAuditoriaInput(produto_id=produto_perda_id, quantidade_fisica=8),
            ItemAuditoriaInput(produto_id=produto_sobra_id, quantidade_fisica=7),
            ItemAuditoriaInput(produto_id=produto_ok_id, quantidade_fisica=3)
        ]
    )

    output = use_case.executar(input_data)

    assert len(output.auditoria.itens) == 3
    assert len(output.movimentacoes_geradas) == 2

    # Verifica se salvou a perda (quantidade 2, SAIDA)
    movs_saida = [m for m in output.movimentacoes_geradas if m.produto_id == produto_perda_id]
    assert len(movs_saida) == 1
    assert movs_saida[0].tipo == "SAIDA"
    assert movs_saida[0].quantidade == 2
    assert "Perda" in movs_saida[0].motivo

    # Verifica se salvou a sobra (quantidade 2, ENTRADA)
    movs_entrada = [m for m in output.movimentacoes_geradas if m.produto_id == produto_sobra_id]
    assert len(movs_entrada) == 1
    assert movs_entrada[0].tipo == "ENTRADA"
    assert movs_entrada[0].quantidade == 2
    assert "Sobra" in movs_entrada[0].motivo

    # Verifica chamadas ao repositório de saldo
    assert saldo_repo.salvar.call_count == 2 # 1 atualizacao de perda e 1 de sobra

def test_auditar_estoque_loja_nao_encontrada():
    loja_id = uuid4()
    tenant_id = uuid4()
    
    auditoria_repo = Mock()
    saldo_repo = Mock()
    movimentacao_repo = Mock()
    loja_repo = Mock()
    produto_repo = Mock()

    loja_repo.obter_por_id.return_value = None

    use_case = AuditarEstoqueLoja(auditoria_repo, saldo_repo, movimentacao_repo, loja_repo, produto_repo)
    
    with pytest.raises(LojaNaoEncontradaException):
        use_case.executar(AuditarEstoqueInput(
            loja_id=loja_id, tenant_id=tenant_id, itens_contados=[ItemAuditoriaInput(produto_id=uuid4(), quantidade_fisica=1)]
        ))
