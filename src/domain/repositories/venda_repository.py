from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.venda import Venda


class VendaRepository(ABC):
    """
    Interface de repositório abstrata para operações com a entidade Venda.
    """
    @abstractmethod
    def salvar(self, venda: Venda) -> Venda:
        pass

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Venda | None:
        pass

    @abstractmethod
    def listar_todas(self, tenant_id: UUID, loja_id: UUID | None = None) -> list[Venda]:
        pass
