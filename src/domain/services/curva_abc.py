from uuid import UUID

from src.domain.entities.analytics import CurvaABCItem


class CurvaABCService:
    """
    Serviço de domínio puro que aplica o Princípio de Pareto na classificação
    dos produtos pela representatividade acumulada de faturamento:
      - Classe A: até 80% do faturamento acumulado.
      - Classe B: de 80% até 95% do faturamento acumulado.
      - Classe C: os 5% restantes.
    """

    LIMIAR_A = 80.0
    LIMIAR_B = 95.0

    @staticmethod
    def classificar_curva_abc(faturamento_por_produto: list[tuple[UUID, str, str, float]]) -> list[CurvaABCItem]:
        """
        Recebe uma lista de tuplas (produto_id, nome, sku, faturamento) e retorna
        os itens ordenados do maior para o menor faturamento, com o percentual
        acumulado e a classe Pareto (A/B/C).
        """
        if not faturamento_por_produto:
            return []

        total_faturamento = sum(item[3] for item in faturamento_por_produto)
        if total_faturamento <= 0:
            return [
                CurvaABCItem(
                    produto_id=item[0],
                    nome=item[1],
                    sku=item[2],
                    faturamento=item[3],
                    percentual_acumulado=0.0,
                    classe="C",
                )
                for item in faturamento_por_produto
            ]

        ordenados = sorted(faturamento_por_produto, key=lambda item: item[3], reverse=True)

        itens_classificados: list[CurvaABCItem] = []
        acumulado = 0.0

        for produto_id, nome, sku, faturamento in ordenados:
            acumulado += faturamento
            percentual_acumulado = round((acumulado / total_faturamento) * 100, 2)

            if percentual_acumulado <= CurvaABCService.LIMIAR_A:
                classe = "A"
            elif percentual_acumulado <= CurvaABCService.LIMIAR_B:
                classe = "B"
            else:
                classe = "C"

            itens_classificados.append(
                CurvaABCItem(
                    produto_id=produto_id,
                    nome=nome,
                    sku=sku,
                    faturamento=faturamento,
                    percentual_acumulado=percentual_acumulado,
                    classe=classe,
                )
            )

        return itens_classificados
