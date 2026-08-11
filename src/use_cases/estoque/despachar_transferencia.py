from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.estoque_movimentacao import EstoqueMovimentacao
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.transferencia_estoque import TransferenciaEstoque
from src.domain.exceptions.business import (
    EstoqueInsuficienteException,
    TransferenciaNaoEncontradaException,
)
from src.domain.repositories.estoque_movimentacao_repository import (
    EstoqueMovimentacaoRepository,
)
from src.domain.repositories.estoque_saldo_repository import EstoqueSaldoRepository
from src.domain.repositories.transferencia_estoque_repository import (
    TransferenciaEstoqueRepository,
)


@dataclass(frozen=True)
class DespacharTransferenciaInput:
    transferencia_id: UUID
    aprovado_por_id: UUID
    tenant_id: UUID

class DespacharTransferencia:
    """
    Caso de Uso: Despachar uma transferência de estoque.
    Aplica lock pessimista na loja de origem, deduz a quantidade física do estoque
    e registra a saída correspondente no ledger de movimentações.
    """
    def __init__(
        self,
        transferencia_repo: TransferenciaEstoqueRepository,
        saldo_repo: EstoqueSaldoRepository,
        movimentacao_repo: EstoqueMovimentacaoRepository
    ) -> None:
        self.transferencia_repo = transferencia_repo
        self.saldo_repo = saldo_repo
        self.movimentacao_repo = movimentacao_repo

    def executar(self, input_data: DespacharTransferenciaInput) -> TransferenciaEstoque:
        # 1. Recupera a transferência com lock pessimista e valida BOLA
        transferencia = self.transferencia_repo.obter_por_id_com_lock(
            input_data.transferencia_id, input_data.tenant_id
        )
        if not transferencia:
            raise TransferenciaNaoEncontradaException(str(input_data.transferencia_id))

        # 2. Transiciona o estado no domínio (valida se está em SOLICITADO)
        transferencia_despachada = transferencia.despachar(input_data.aprovado_por_id)

        # 3. Obtém com lock o saldo da loja de origem
        saldo_origem = self.saldo_repo.obter_por_loja_e_produto_com_lock(
            loja_id=transferencia.loja_origem_id,
            produto_id=transferencia.produto_id,
            tenant_id=input_data.tenant_id
        )

        # 4. Valida se há estoque suficiente
        qtd_disponivel = saldo_origem.quantidade if saldo_origem else 0
        if qtd_disponivel < transferencia.quantidade:
            raise EstoqueInsuficienteException(
                produto_id=str(transferencia.produto_id),
                loja_id=str(transferencia.loja_origem_id),
                disponivel=qtd_disponivel,
                solicitado=transferencia.quantidade
            )

        # 5. Deduz do estoque da loja de origem
        assert saldo_origem is not None
        saldo_origem_atualizado = EstoqueSaldo(
            id=saldo_origem.id,
            loja_id=saldo_origem.loja_id,
            produto_id=saldo_origem.produto_id,
            quantidade=qtd_disponivel - transferencia.quantidade,
            tenant_id=saldo_origem.tenant_id
        )
        self.saldo_repo.salvar(saldo_origem_atualizado)

        # 6. Grava a saída física no ledger (movimentações)
        movimentacao_saida = EstoqueMovimentacao(
            loja_id=transferencia.loja_origem_id,
            produto_id=transferencia.produto_id,
            tipo="SAIDA",
            quantidade=transferencia.quantidade,
            motivo=f"Despacho de Transferencia #{transferencia.id}",
            tenant_id=input_data.tenant_id
        )
        self.movimentacao_repo.salvar(movimentacao_saida)

        # 7. Salva a transferência atualizada no banco
        return self.transferencia_repo.salvar(transferencia_despachada)
