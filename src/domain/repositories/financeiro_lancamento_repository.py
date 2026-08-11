from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID

from src.domain.entities.financeiro_lancamento import FinanceiroLancamento


class FinanceiroLancamentoRepository(ABC):
    """
    Contrato (Interface) para o repositório de lançamentos financeiros.
    """
    @abstractmethod
    def salvar(self, lancamento: FinanceiroLancamento) -> FinanceiroLancamento:
        """Persiste ou atualiza um lançamento financeiro."""

    @abstractmethod
    def obter_por_id(self, id: UUID, tenant_id: UUID) -> FinanceiroLancamento | None:
        """Obtém um lançamento pelo seu ID e tenant_id."""

    @abstractmethod
    def listar_por_filtros(
        self,
        tenant_id: UUID,
        loja_id: UUID | None = None,
        tipo: str | None = None,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None
    ) -> list[FinanceiroLancamento]:
        """Lista os lançamentos aplicando filtros opcionais."""
