from abc import ABC, abstractmethod
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from src.domain.entities.financeiro_lancamento import FinanceiroLancamento

class FinanceiroLancamentoRepository(ABC):
    """
    Contrato (Interface) para o repositório de lançamentos financeiros.
    """
    @abstractmethod
    def salvar(self, lancamento: FinanceiroLancamento) -> FinanceiroLancamento:
        """Persiste ou atualiza um lançamento financeiro."""
        pass

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> Optional[FinanceiroLancamento]:
        """Obtém um lançamento pelo seu ID e tenant_id."""
        pass

    @abstractmethod
    def listar_por_filtros(
        self,
        tenant_id: UUID,
        loja_id: Optional[UUID] = None,
        tipo: Optional[str] = None,
        data_inicio: Optional[datetime] = None,
        data_fim: Optional[datetime] = None
    ) -> List[FinanceiroLancamento]:
        """Lista os lançamentos aplicando filtros opcionais."""
        pass
