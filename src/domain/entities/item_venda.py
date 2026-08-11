from dataclasses import dataclass, field
from uuid import UUID, uuid4


@dataclass(frozen=True)
class ItemVenda:
    """
    Entidade de domínio pura que representa um item pertencente a uma Venda.
    """
    produto_id: UUID
    quantidade: int
    preco_unitario: float
    tenant_id: UUID
    id: UUID = field(default_factory=uuid4)

    def __post_init__(self) -> None:
        if not isinstance(self.produto_id, UUID):
            raise ValueError("O produto_id deve ser um UUID válido.")
        if not isinstance(self.quantidade, int) or self.quantidade <= 0:
            raise ValueError("A quantidade deve ser um número inteiro maior que zero.")
        if not isinstance(self.preco_unitario, (int, float)) or self.preco_unitario <= 0:
            raise ValueError("O preço unitário deve ser maior que zero.")
        if not isinstance(self.tenant_id, UUID):
            raise ValueError("O tenant_id deve ser um UUID válido.")
