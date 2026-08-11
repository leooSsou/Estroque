from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.estoque_movimentacao import EstoqueMovimentacao


class EstoqueMovimentacaoRepository(ABC):
    """
    Interface/Contrato abstrato para persistência do histórico (ledger) de movimentações de estoque.
    """

    @abstractmethod
    def salvar(self, movimentacao: EstoqueMovimentacao) -> EstoqueMovimentacao:
        """
        Registra uma movimentação no ledger de estoque.
        """

    @abstractmethod
    def listar_por_loja_e_produto(
        self, loja_id: UUID, produto_id: UUID, tenant_id: UUID
    ) -> list[EstoqueMovimentacao]:
        """
        Recupera o histórico de movimentações de um produto em uma loja específica.
        """

    @abstractmethod
    def listar_todas(self, tenant_id: UUID) -> list[EstoqueMovimentacao]:
        """
        Recupera todas as movimentações do tenant.
        """
