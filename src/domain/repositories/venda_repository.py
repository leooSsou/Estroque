from abc import ABC, abstractmethod
from uuid import UUID
from typing import Optional, List
from src.domain.entities.venda import Venda

class VendaRepository(ABC):
    """
    Interface de repositório abstrata para operações com a entidade Venda.
    """
    @abstractmethod
    def salvar(self, venda: Venda) -> Venda:
        pass

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Optional[Venda]:
        pass

    @abstractmethod
    def listar_todas(self, tenant_id: UUID, loja_id: Optional[UUID] = None) -> List[Venda]:
        pass
