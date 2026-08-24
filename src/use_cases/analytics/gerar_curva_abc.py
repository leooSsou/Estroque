from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from src.infrastructure.database.models import ItemVendaModel, ProdutoModel, VendaModel


@dataclass(frozen=True)
class CurvaABCInput:
    tenant_id: UUID
    loja_id: Optional[UUID] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None

@dataclass(frozen=True)
class CurvaABCItem:
    produto_id: UUID
    nome: str
    sku: str
    faturamento: float
    percentual: float
    percentual_acumulado: float
    classe: str  # "A", "B" ou "C"

@dataclass(frozen=True)
class CurvaABCOutput:
    itens: List[CurvaABCItem]

class GerarCurvaABC:
    """
    Caso de Uso: Calcular a representatividade acumulada de faturamento de cada produto
    e classificá-los em classes A (80%), B (15%) e C (5%).
    """
    def __init__(self, db: Session) -> None:
        self.db = db

    def executar(self, input_data: CurvaABCInput) -> CurvaABCOutput:
        tenant_id = input_data.tenant_id
        self.db.info["tenant_id"] = tenant_id

        # 1. Base Query para obter vendas do período/loja
        vendas_query = self.db.query(VendaModel).filter(VendaModel.tenant_id == tenant_id)
        if input_data.loja_id:
            vendas_query = vendas_query.filter(VendaModel.loja_id == input_data.loja_id)
        if input_data.data_inicio:
            vendas_query = vendas_query.filter(VendaModel.data_venda >= input_data.data_inicio)
        if input_data.data_fim:
            vendas_query = vendas_query.filter(VendaModel.data_venda <= input_data.data_fim)

        vendas_ids = [v.id for v in vendas_query.all()]

        if not vendas_ids:
            return CurvaABCOutput(itens=[])

        # 2. Busca itens de venda e calcula receita por produto
        itens = self.db.query(
            ItemVendaModel.produto_id,
            ProdutoModel.nome,
            ProdutoModel.sku,
            ItemVendaModel.quantidade,
            ItemVendaModel.preco_unitario
        ).join(
            ProdutoModel, ItemVendaModel.produto_id == ProdutoModel.id
        ).filter(ItemVendaModel.venda_id.in_(vendas_ids)).all()

        receita_por_produto = {}
        for produto_id, nome, sku, qtd, preco_un in itens:
            receita = qtd * preco_un
            if produto_id not in receita_por_produto:
                receita_por_produto[produto_id] = {
                    "nome": nome,
                    "sku": sku,
                    "faturamento": 0.0
                }
            receita_por_produto[produto_id]["faturamento"] += receita

        # 3. Calcula total geral
        total_geral = sum(p["faturamento"] for p in receita_por_produto.values())

        if total_geral == 0.0:
            # Se não houver faturamento positivo, coloca todos na classe C
            itens_abc = [
                CurvaABCItem(
                    produto_id=pid,
                    nome=p["nome"],
                    sku=p["sku"],
                    faturamento=0.0,
                    percentual=0.0,
                    percentual_acumulado=0.0,
                    classe="C"
                )
                for pid, p in receita_por_produto.items()
            ]
            return CurvaABCOutput(itens=itens_abc)

        # 4. Ordena produtos por faturamento em ordem decrescente
        sorted_produtos = sorted(
            receita_por_produto.items(),
            key=lambda x: x[1]["faturamento"],
            reverse=True
        )

        # 5. Calcula percentuais acumulados e classifica em A, B ou C
        itens_abc = []
        acumulado = 0.0

        for pid, p in sorted_produtos:
            faturamento = p["faturamento"]
            percentual = (faturamento / total_geral) * 100
            
            # Limite acumulado anterior a este produto
            acumulado_anterior = acumulado
            acumulado += faturamento
            percentual_acumulado = (acumulado / total_geral) * 100

            # Classificação Pareto
            # Classe A: até acumular 80% do faturamento total
            # Classe B: até acumular 95% (80% + 15%)
            # Classe C: restante (5%)
            # Usando acumulado_anterior para classificar o produto que cruza a fronteira
            percentual_anterior_pct = (acumulado_anterior / total_geral) * 100
            if percentual_anterior_pct < 80.0:
                classe = "A"
            elif percentual_anterior_pct < 95.0:
                classe = "B"
            else:
                classe = "C"

            itens_abc.append(
                CurvaABCItem(
                    produto_id=pid,
                    nome=p["nome"],
                    sku=p["sku"],
                    faturamento=round(faturamento, 2),
                    percentual=round(percentual, 2),
                    percentual_acumulado=round(percentual_acumulado, 2),
                    classe=classe
                )
            )

        return CurvaABCOutput(itens=itens_abc)
