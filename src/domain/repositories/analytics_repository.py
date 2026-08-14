from abc import ABC, abstractmethod
from datetime import datetime
from uuid import UUID


class AnalyticsRepository(ABC):
    """
    Contrato (Interface) para consultas analíticas de Business Intelligence.
    Todas as operações respeitam o isolamento multi-tenant global.
    """

    @abstractmethod
    def obter_resumo_vendas(
        self,
        tenant_id: UUID,
        loja_id: UUID | None = None,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None,
    ) -> tuple[float, int, float]:
        """
        Retorna (faturamento_bruto, numero_vendas, cmv) no período informado.
        Faturamento e CMV consideram somente vendas não canceladas.
        """

    @abstractmethod
    def obter_estoque_critico_e_rupturas(
        self,
        tenant_id: UUID,
        loja_id: UUID | None = None,
    ) -> tuple[int, int]:
        """
        Retorna (quantidade_de_saldos_em_estoque_critico, quantidade_de_rupturas).
        Estoque crítico: saldo <= estoque_minimo do produto.
        Ruptura: saldo == 0.
        """

    @abstractmethod
    def obter_faturamento_por_produto(
        self,
        tenant_id: UUID,
        loja_id: UUID | None = None,
        data_inicio: datetime | None = None,
        data_fim: datetime | None = None,
    ) -> list[tuple[UUID, str, str, float]]:
        """
        Retorna a lista de tuplas (produto_id, nome, sku, faturamento) do período,
        agregando o faturamento dos itens de vendas não canceladas por produto.
        """
