from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.domain.entities.analytics import DashboardIndicadores
from src.domain.repositories.analytics_repository import AnalyticsRepository


@dataclass(frozen=True)
class ConsultarDashboardInput:
    tenant_id: UUID
    loja_id: UUID | None = None
    data_inicio: datetime | None = None
    data_fim: datetime | None = None


@dataclass(frozen=True)
class ConsultarDashboardOutput:
    indicadores: DashboardIndicadores


class ConsultarDashboard:
    """
    Caso de Uso: Consolidar os KPIs do painel analítico do inquilino.
    Calcula faturamento bruto, número de vendas, ticket médio, CMV,
    margem de lucro, itens em estoque crítico e rupturas.
    """
    def __init__(self, analytics_repo: AnalyticsRepository) -> None:
        self.analytics_repo = analytics_repo

    def executar(self, input_data: ConsultarDashboardInput) -> ConsultarDashboardOutput:
        faturamento_bruto, numero_vendas, cmv = self.analytics_repo.obter_resumo_vendas(
            tenant_id=input_data.tenant_id,
            loja_id=input_data.loja_id,
            data_inicio=input_data.data_inicio,
            data_fim=input_data.data_fim,
        )
        estoque_critico, rupturas = self.analytics_repo.obter_estoque_critico_e_rupturas(
            tenant_id=input_data.tenant_id,
            loja_id=input_data.loja_id,
        )

        ticket_medio = round(faturamento_bruto / numero_vendas, 2) if numero_vendas > 0 else 0.0
        margem_lucro = round(((faturamento_bruto - cmv) / faturamento_bruto) * 100, 2) if faturamento_bruto > 0 else 0.0

        indicadores = DashboardIndicadores(
            faturamento_bruto=faturamento_bruto,
            numero_vendas=numero_vendas,
            ticket_medio=ticket_medio,
            cmv=cmv,
            margem_lucro=margem_lucro,
            estoque_critico=estoque_critico,
            rupturas=rupturas,
        )

        return ConsultarDashboardOutput(indicadores=indicadores)