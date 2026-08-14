from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.domain.entities.analytics import CurvaABCItem
from src.domain.repositories.analytics_repository import AnalyticsRepository
from src.domain.services.curva_abc import CurvaABCService


@dataclass(frozen=True)
class ConsultarCurvaABCInput:
    tenant_id: UUID
    loja_id: UUID | None = None
    data_inicio: datetime | None = None
    data_fim: datetime | None = None


@dataclass(frozen=True)
class ConsultarCurvaABCOutput:
    itens: list[CurvaABCItem]


class ConsultarCurvaABC:
    """
    Caso de Uso: Calcular a Curva ABC (Princípio de Pareto) por produto,
    classificando os itens em classes A (80%), B (15%) e C (5%) do faturamento acumulado.
    """
    def __init__(self, analytics_repo: AnalyticsRepository) -> None:
        self.analytics_repo = analytics_repo

    def executar(self, input_data: ConsultarCurvaABCInput) -> ConsultarCurvaABCOutput:
        faturamento_por_produto = self.analytics_repo.obter_faturamento_por_produto(
            tenant_id=input_data.tenant_id,
            loja_id=input_data.loja_id,
            data_inicio=input_data.data_inicio,
            data_fim=input_data.data_fim,
        )

        itens = CurvaABCService.classificar_curva_abc(faturamento_por_produto)
        return ConsultarCurvaABCOutput(itens=itens)