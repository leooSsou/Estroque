from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from src.infrastructure.database.models import (
    DevolucaoModel,
    EstoqueSaldoModel,
    FinanceiroLancamentoModel,
    ItemDevolucaoModel,
    ItemVendaModel,
    ProdutoModel,
    VendaModel,
)


@dataclass(frozen=True)
class DashboardAnalyticsInput:
    tenant_id: UUID
    loja_id: Optional[UUID] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None

@dataclass(frozen=True)
class DashboardAnalyticsOutput:
    ticket_medio: float
    faturamento_bruto: float
    faturamento_liquido: float
    desconto_total: float
    cmv: float
    lucro_liquido: float
    margem_lucro: float
    estoque_critico_count: int
    ruptura_count: int
    total_devolucoes: float = 0.0

class GerarDashboardAnalytics:
    """
    Caso de Uso: Gerar KPIs analíticos do Dashboard consolidando vendas, custos, devoluções/reembolsos e despesas.
    """
    def __init__(self, db: Session) -> None:
        self.db = db

    def executar(self, input_data: DashboardAnalyticsInput) -> DashboardAnalyticsOutput:
        tenant_id = input_data.tenant_id
        self.db.info["tenant_id"] = tenant_id

        # 1. Base Query para Vendas (desconsidera canceladas)
        vendas_query = self.db.query(VendaModel).filter(
            VendaModel.tenant_id == tenant_id,
            ~VendaModel.status.in_(["CANCELADA", "CANCELADO"])
        )
        if input_data.loja_id:
            vendas_query = vendas_query.filter(VendaModel.loja_id == input_data.loja_id)
        if input_data.data_inicio:
            vendas_query = vendas_query.filter(VendaModel.data_venda >= input_data.data_inicio)
        if input_data.data_fim:
            vendas_query = vendas_query.filter(VendaModel.data_venda <= input_data.data_fim)

        vendas = vendas_query.all()
        vendas_ids = [v.id for v in vendas]

        faturamento_bruto = 0.0
        cmv_bruto = 0.0
        desconto_total = sum(v.desconto for v in vendas)

        if vendas_ids:
            # Busca itens e junta com produtos para calcular custo
            itens = self.db.query(ItemVendaModel, ProdutoModel.preco_custo).join(
                ProdutoModel, ItemVendaModel.produto_id == ProdutoModel.id
            ).filter(ItemVendaModel.venda_id.in_(vendas_ids)).all()

            for item, preco_custo in itens:
                faturamento_bruto += item.quantidade * item.preco_unitario
                cmv_bruto += item.quantidade * (preco_custo or 0.0)

        # 2. Devoluções e Reembolsos do período/loja
        devolucoes_query = self.db.query(DevolucaoModel).filter(
            DevolucaoModel.tenant_id == tenant_id
        )
        if input_data.loja_id:
            devolucoes_query = devolucoes_query.filter(DevolucaoModel.loja_id == input_data.loja_id)
        if input_data.data_inicio:
            devolucoes_query = devolucoes_query.filter(DevolucaoModel.data_devolucao >= input_data.data_inicio)
        if input_data.data_fim:
            devolucoes_query = devolucoes_query.filter(DevolucaoModel.data_devolucao <= input_data.data_fim)

        devolucoes = devolucoes_query.all()
        devolucoes_ids = [d.id for d in devolucoes]
        total_devolucoes = sum(d.valor_total for d in devolucoes)

        cmv_devolvido = 0.0
        if devolucoes_ids:
            itens_dev = self.db.query(ItemDevolucaoModel, ProdutoModel.preco_custo).join(
                ProdutoModel, ItemDevolucaoModel.produto_id == ProdutoModel.id
            ).filter(ItemDevolucaoModel.devolucao_id.in_(devolucoes_ids)).all()

            for item_dev, preco_custo in itens_dev:
                cmv_devolvido += item_dev.quantidade * (preco_custo or 0.0)

        cmv = max(0.0, cmv_bruto - cmv_devolvido)
        faturamento_liquido = max(0.0, faturamento_bruto - desconto_total - total_devolucoes)

        # Vendas retidas / efetivas (exclui vendas 100% devolvidas do cálculo de ticket médio)
        vendas_efetivas = [v for v in vendas if v.status != "DEVOLVIDA"]
        ticket_medio = round(faturamento_liquido / len(vendas_efetivas), 2) if vendas_efetivas else 0.0

        # 3. Query de Despesas Operacionais (exclui saídas de reembolso para não deduzir duas vezes da DRE)
        despesas_query = self.db.query(FinanceiroLancamentoModel).filter(
            FinanceiroLancamentoModel.tenant_id == tenant_id,
            FinanceiroLancamentoModel.tipo == "DESPESA",
            ~FinanceiroLancamentoModel.categoria.ilike("%Reembolso%")
        )
        if input_data.loja_id:
            despesas_query = despesas_query.filter(FinanceiroLancamentoModel.loja_id == input_data.loja_id)
        if input_data.data_inicio:
            despesas_query = despesas_query.filter(FinanceiroLancamentoModel.data_lancamento >= input_data.data_inicio)
        if input_data.data_fim:
            despesas_query = despesas_query.filter(FinanceiroLancamentoModel.data_lancamento <= input_data.data_fim)

        despesas_totais = sum(d.valor for d in despesas_query.all())

        # Lucro Líquido
        lucro_liquido = round(faturamento_liquido - cmv - despesas_totais, 2)
        margem_lucro = round((lucro_liquido / faturamento_liquido) * 100, 2) if faturamento_liquido > 0 else 0.0

        # 4. Diagnóstico de Estoque (Estoque Crítico e Rupturas)
        estoque_query = self.db.query(EstoqueSaldoModel).filter(EstoqueSaldoModel.tenant_id == tenant_id)
        if input_data.loja_id:
            estoque_query = estoque_query.filter(EstoqueSaldoModel.loja_id == input_data.loja_id)

        saldos = estoque_query.all()
        ruptura_count = sum(1 for s in saldos if s.quantidade == 0)
        estoque_critico_count = sum(1 for s in saldos if 0 < s.quantidade < 10)

        return DashboardAnalyticsOutput(
            ticket_medio=ticket_medio,
            faturamento_bruto=round(faturamento_bruto, 2),
            faturamento_liquido=round(faturamento_liquido, 2),
            desconto_total=round(desconto_total, 2),
            cmv=round(cmv, 2),
            lucro_liquido=lucro_liquido,
            margem_lucro=margem_lucro,
            estoque_critico_count=estoque_critico_count,
            ruptura_count=ruptura_count,
            total_devolucoes=round(total_devolucoes, 2)
        )
