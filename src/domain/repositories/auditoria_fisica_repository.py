from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from src.domain.entities.auditoria_fisica import AuditoriaFisica

class AuditoriaFisicaRepository(ABC):
    """
    Contrato (Interface) para o repositório de Auditoria Física de Estoque.
    """

    @abstractmethod
    def salvar(self, auditoria: AuditoriaFisica) -> AuditoriaFisica:
        """Salva uma nova auditoria física."""
        pass

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Optional[AuditoriaFisica]:
        """Obtém uma auditoria física pelo seu ID e tenant_id."""
        pass
