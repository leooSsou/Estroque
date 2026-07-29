from abc import ABC, abstractmethod
from typing import Optional, List
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
        pass

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Optional[TransferenciaEstoque]:
        """
        Busca uma transferência por ID e tenant_id.
        """
        pass

    @abstractmethod
    def listar_por_loja_origem(self, loja_origem_id: UUID, tenant_id: UUID) -> List[TransferenciaEstoque]:
        """
        Lista transferências originadas de uma loja.
        """
        pass

    @abstractmethod
    def listar_por_loja_destino(self, loja_destino_id: UUID, tenant_id: UUID) -> List[TransferenciaEstoque]:
        """
        Lista transferências destinadas a uma loja.
        """
        pass

    @abstractmethod
    def listar_todas(self, tenant_id: UUID) -> List[TransferenciaEstoque]:
        """
        Lista todas as transferências do tenant.
        """
        pass
