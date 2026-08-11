from abc import ABC, abstractmethod
from uuid import UUID

from src.domain.entities.transferencia_estoque import TransferenciaEstoque


class TransferenciaEstoqueRepository(ABC):
    """
    Interface/Contrato abstrato para persistência de transferências de estoque.
    """
    
    @abstractmethod
    def salvar(self, transferencia: TransferenciaEstoque) -> TransferenciaEstoque:
        """
        Salva ou atualiza uma transferência de estoque.
        """

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> TransferenciaEstoque | None:
        """
        Busca uma transferência por ID e tenant_id.
        """

    @abstractmethod
    def obter_por_id_com_lock(
        self, id: UUID, tenant_id: UUID
    ) -> TransferenciaEstoque | None:
        """
        Busca uma transferência por ID e tenant_id aplicando trava pessimista
        (SELECT FOR UPDATE) para impedir transições de estado concorrentes.
        """

    @abstractmethod
    def listar_por_loja_origem(self, loja_origem_id: UUID, tenant_id: UUID) -> list[TransferenciaEstoque]:
        """
        Lista transferências originadas de uma loja.
        """

    @abstractmethod
    def listar_por_loja_destino(self, loja_destino_id: UUID, tenant_id: UUID) -> list[TransferenciaEstoque]:
        """
        Lista transferências destinadas a uma loja.
        """

    @abstractmethod
    def listar_todas(self, tenant_id: UUID) -> list[TransferenciaEstoque]:
        """
        Lista todas as transferências do tenant.
        """
