from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.venda import Venda


class VendaRepository(ABC):
    """
    Interface de repositório abstrata para operações com a entidade Venda.
    """
    @abstractmethod
    def salvar(self, venda: Venda) -> Venda:
        """Salva uma nova venda ou atualiza venda existente."""

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Venda | None:
        """Obtém uma venda pelo seu ID e tenant_id."""

    @abstractmethod
    def listar_todas(self, tenant_id: UUID, loja_id: UUID | None = None) -> list[Venda]:
        """Lista vendas de um determinado Tenant, opcionalmente filtradas por Loja."""
