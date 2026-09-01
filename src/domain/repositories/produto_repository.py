from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.produto import Produto


class ProdutoRepository(ABC):
    """
    Interface/Contrato abstrato para persistência de Produtos.
    """
    
    @abstractmethod
    def salvar(self, produto: Produto) -> Produto:
        """
        Salva ou atualiza um Produto na persistência.
        Retorna a entidade salva.
        """

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Produto | None:
        """
        Busca um Produto cadastrado pelo ID e tenant_id.
        """

    @abstractmethod
    def obter_por_sku(self, sku: str, tenant_id: UUID) -> Produto | None:
        """
        Busca um Produto cadastrado pelo SKU e tenant_id.
        """

    @abstractmethod
    def obter_por_codigo_barras(self, codigo_barras: str, tenant_id: UUID) -> Produto | None:
        """
        Busca um Produto cadastrado pelo código de barras e tenant_id.
        """

    @abstractmethod
    def listar_todos(self, tenant_id: UUID, termo: str | None = None) -> list[Produto]:
        """
        Lista produtos cadastrados para um determinado Tenant, opcionalmente filtrando por termo (nome, SKU ou código de barras).
        """

