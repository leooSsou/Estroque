from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True)
class DashboardIndicadores:
    """
    Entidade de domínio pura com os KPIs consolidados do painel analítico.
    """
    faturamento_bruto: float
    numero_vendas: int
    ticket_medio: float
    cmv: float
    margem_lucro: float
    estoque_critico: int
    rupturas: int

    def __post_init__(self) -> None:
        if not isinstance(self.faturamento_bruto, (int, float)) or self.faturamento_bruto < 0:
            raise ValueError("O faturamento bruto deve ser maior ou igual a zero.")
        if not isinstance(self.numero_vendas, int) or self.numero_vendas < 0:
            raise ValueError("O número de vendas deve ser maior ou igual a zero.")
        if not isinstance(self.ticket_medio, (int, float)) or self.ticket_medio < 0:
            raise ValueError("O ticket médio deve ser maior ou igual a zero.")
        if not isinstance(self.cmv, (int, float)) or self.cmv < 0:
            raise ValueError("O CMV deve ser maior ou igual a zero.")
        if not isinstance(self.margem_lucro, (int, float)):
            raise ValueError("A margem de lucro deve ser um número real.")
        if not isinstance(self.estoque_critico, int) or self.estoque_critico < 0:
            raise ValueError("O total de itens em estoque crítico deve ser maior ou igual a zero.")
        if not isinstance(self.rupturas, int) or self.rupturas < 0:
            raise ValueError("O total de rupturas deve ser maior ou igual a zero.")


@dataclass(frozen=True)
class CurvaABCItem:
    """
    Entidade de domínio pura com a participação de faturamento de um produto na Curva ABC.
    """
    produto_id: UUID
    nome: str
    sku: str
    faturamento: float
    percentual_acumulado: float
    classe: str

    def __post_init__(self) -> None:
        if not isinstance(self.produto_id, UUID):
            raise ValueError("O produto_id deve ser um UUID válido.")
        if not isinstance(self.nome, str) or not self.nome.strip():
            raise ValueError("O nome do produto é obrigatório.")
        if not isinstance(self.sku, str) or not self.sku.strip():
            raise ValueError("O SKU do produto é obrigatório.")
        if not isinstance(self.faturamento, (int, float)) or self.faturamento < 0:
            raise ValueError("O faturamento do produto deve ser maior ou igual a zero.")
        if not isinstance(self.percentual_acumulado, (int, float)):
            raise ValueError("O percentual acumulado deve ser um número real.")
        if self.classe not in ("A", "B", "C"):
            raise ValueError("A classe da Curva ABC deve ser 'A', 'B' ou 'C'.")
