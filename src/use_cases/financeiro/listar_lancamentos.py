from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.domain.entities.financeiro_lancamento import FinanceiroLancamento
from src.domain.repositories.financeiro_lancamento_repository import (
    FinanceiroLancamentoRepository,
)


@dataclass(frozen=True)
class ListarLancamentosInput:
    tenant_id: UUID
    loja_id: UUID | None = None
    tipo: str | None = None
    data_inicio: datetime | None = None
    data_fim: datetime | None = None

@dataclass(frozen=True)
class ListarLancamentosOutput:
    lancamentos: list[FinanceiroLancamento]

class ListarLancamentosFinanceiros:
    """
    Caso de Uso: Consultar lançamentos do fluxo de caixa filtrados por loja,
    tipo e período de datas de forma isolada multi-tenant.
    """
    def __init__(self, financeiro_repo: FinanceiroLancamentoRepository) -> None:
        self.financeiro_repo = financeiro_repo

    def executar(self, input_data: ListarLancamentosInput) -> ListarLancamentosOutput:
        lancamentos = self.financeiro_repo.listar_por_filtros(
            tenant_id=input_data.tenant_id,
            loja_id=input_data.loja_id,
            tipo=input_data.tipo,
            data_inicio=input_data.data_inicio,
            data_fim=input_data.data_fim
        )
        return ListarLancamentosOutput(lancamentos=lancamentos)
