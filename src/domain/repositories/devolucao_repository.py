from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.devolucao import Devolucao


class DevolucaoRepository(ABC):
    """
    Interface abstrata para persistência e consulta de Devoluções e Trocas.
    """

    @abstractmethod
    def salvar(self, devolucao: Devolucao) -> Devolucao:
        """Persiste uma nova devolução e seus itens."""
        pass

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Devolucao | None:
        """Obtém uma devolução pelo seu identificador único e tenant."""
        pass

    @abstractmethod
    def listar_por_venda(self, venda_id: UUID, tenant_id: UUID) -> list[Devolucao]:
        """Lista todas as devoluções já realizadas para uma determinada venda."""
        pass

    @abstractmethod
    def listar_por_tenant(
        self, tenant_id: UUID, loja_id: UUID | None = None
    ) -> list[Devolucao]:
        """Lista as devoluções do tenant com filtro opcional por loja."""
        pass

    @abstractmethod
    def obter_total_devolvido_por_item_venda(
        self, item_venda_id: UUID, tenant_id: UUID
    ) -> int:
        """Retorna o somatório de quantidades já devolvidas de um determinado item de venda."""
        pass
