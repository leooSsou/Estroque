from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.tenant import Tenant


class TenantRepository(ABC):
    """
    Interface/Contrato abstrato para persistência de Tenants.
    """
    
    @abstractmethod
    def salvar(self, tenant: Tenant) -> Tenant:
        """
        Salva ou atualiza um Tenant na persistência.
        Retorna a entidade salva (com ID e timestamps se aplicável).
        """

    @abstractmethod
    def obter_por_cnpj(self, cnpj: str) -> Tenant | None:
        """
        Busca um Tenant cadastrado pelo CNPJ.
        """

    @abstractmethod
    def obter_por_id(self, id: UUID) -> Tenant | None:
        """
        Busca um Tenant cadastrado pelo ID.
        """

    @abstractmethod
    def listar_todos(self, busca: str | None = None, apenas_ativos: bool | None = None) -> list[Tenant]:
        """
        Lista tenants com filtro opcional de busca (nome/razão social/cnpj) e status ativo.
        """
