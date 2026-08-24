from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.estoque_movimentacao import EstoqueMovimentacao
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.transferencia_estoque import TransferenciaEstoque
from src.domain.exceptions.business import TransferenciaNaoEncontradaException
from src.domain.repositories.estoque_movimentacao_repository import (
    EstoqueMovimentacaoRepository,
)
from src.domain.repositories.estoque_saldo_repository import EstoqueSaldoRepository
from src.domain.repositories.transferencia_estoque_repository import (
    TransferenciaEstoqueRepository,
)


@dataclass(frozen=True)
class ConfirmarRecebimentoInput:
    transferencia_id: UUID
    aprovado_por_id: UUID
    quantidade_recebida: int
    tenant_id: UUID
    justificativa: str | None = None

class ConfirmarRecebimento:
    """
    Caso de Uso: Confirmar o recebimento de uma transferência de estoque.
    Aplica lock pessimista na loja de destino, adiciona a quantidade física recebida ao estoque
    e registra a entrada correspondente no ledger de movimentações.
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

    def executar(self, input_data: ConfirmarRecebimentoInput) -> TransferenciaEstoque:
        # 1. Recupera a transferência com lock pessimista e valida BOLA
        transferencia = self.transferencia_repo.obter_por_id_com_lock(
            input_data.transferencia_id, input_data.tenant_id
        )
        if not transferencia:
            raise TransferenciaNaoEncontradaException(str(input_data.transferencia_id))

        # 2. Transiciona o estado no domínio (valida se está em DESPACHADO, calcula se é RECEBIDO/DIVERGENTE)
        transferencia_recebida = transferencia.receber(
            aprovado_por_id=input_data.aprovado_por_id,
            quantidade_recebida=input_data.quantidade_recebida,
            justificativa=input_data.justificativa
        )

        # 3. Obtém com lock o saldo da loja de destino
        saldo_destino = self.saldo_repo.obter_por_loja_e_produto_com_lock(
            loja_id=transferencia.loja_destino_id,
            produto_id=transferencia.produto_id,
            tenant_id=input_data.tenant_id
        )

        # 4. Se não existir saldo registrado para a loja de destino, inicializa um com quantidade 0
        if not saldo_destino:
            saldo_destino = EstoqueSaldo(
                loja_id=transferencia.loja_destino_id,
                produto_id=transferencia.produto_id,
                quantidade=0,
                tenant_id=input_data.tenant_id
            )

        # 5. Adiciona a quantidade recebida ao estoque de destino
        saldo_destino_atualizado = EstoqueSaldo(
            id=saldo_destino.id,
            loja_id=saldo_destino.loja_id,
            produto_id=saldo_destino.produto_id,
            quantidade=saldo_destino.quantidade + input_data.quantidade_recebida,
            tenant_id=saldo_destino.tenant_id
        )
        self.saldo_repo.salvar(saldo_destino_atualizado)

        # 6. Grava a entrada física no ledger (movimentações)
        motivo_prefix = "Recebimento" if transferencia_recebida.status == "RECEBIDO" else "Recebimento com Divergencia"
        movimentacao_entrada = EstoqueMovimentacao(
            loja_id=transferencia.loja_destino_id,
            produto_id=transferencia.produto_id,
            tipo="ENTRADA",
            quantidade=input_data.quantidade_recebida,
            motivo=f"{motivo_prefix} de Transferencia #{transferencia.id}",
            tenant_id=input_data.tenant_id
        )
        self.movimentacao_repo.salvar(movimentacao_entrada)

        # 7. Salva a transferência atualizada no banco
        return self.transferencia_repo.salvar(transferencia_recebida)
