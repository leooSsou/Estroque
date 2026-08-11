from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.cliente import Cliente


class ClienteRepository(ABC):
    """
    Interface/Contrato abstrato para persistência de Clientes.
    """
    
    @abstractmethod
    def salvar(self, cliente: Cliente) -> Cliente:
        """
        Salva ou atualiza um Cliente na persistência.
        Retorna a entidade salva.
        """

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Cliente | None:
        """
        Busca um Cliente cadastrado pelo ID e tenant_id.
        """

    @abstractmethod
    def obter_por_documento(self, documento: str, tenant_id: UUID) -> Cliente | None:
        """
        Busca um Cliente cadastrado pelo CPF/CNPJ (documento) e tenant_id.
        """

    @abstractmethod
    def listar_todos(self, tenant_id: UUID) -> list[Cliente]:
        """
        Lista todos os clientes cadastrados para um determinado Tenant.
        """
