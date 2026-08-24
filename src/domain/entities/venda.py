from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4

from src.domain.entities.item_venda import ItemVenda


@dataclass(frozen=True)
class Venda:
    """
    Entidade de domínio pura que representa uma Venda Administrativa.
    """
    loja_id: UUID
    usuario_id: UUID  # Vendedor
    status: str       # PENDENTE, PAGO, CANCELADO
    forma_pagamento: str  # DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO, PIX, CREDIARIO
    valor_total: float
    desconto: float
    tenant_id: UUID
    itens: list[ItemVenda]
    cliente_id: UUID | None = None
    id: UUID = field(default_factory=uuid4)
    data_venda: datetime | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.loja_id, UUID):
            raise ValueError("O loja_id deve ser um UUID válido.")
        if not isinstance(self.usuario_id, UUID):
            raise ValueError("O usuario_id deve ser um UUID válido.")
        if self.status not in ("PENDENTE", "PAGO", "CANCELADO"):
            raise ValueError("Status inválido.")
        if self.forma_pagamento not in ("DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "CREDIARIO"):
            raise ValueError("Forma de pagamento inválida.")
        if not isinstance(self.valor_total, (int, float)) or self.valor_total < 0:
            raise ValueError("O valor total da venda deve ser maior ou igual a zero.")
        if not isinstance(self.desconto, (int, float)) or self.desconto < 0:
            raise ValueError("O desconto deve ser maior ou igual a zero.")
        if not isinstance(self.tenant_id, UUID):
            raise ValueError("O tenant_id deve ser um UUID válido.")
        if not isinstance(self.itens, list) or len(self.itens) == 0:
            raise ValueError("Uma venda deve conter pelo menos um item.")
        if not all(isinstance(item, ItemVenda) for item in self.itens):
            raise ValueError("Todos os itens da venda devem ser instâncias de ItemVenda.")
        if self.forma_pagamento == "CREDIARIO" and not self.cliente_id:
            raise ValueError("O cliente_id é obrigatório para vendas realizadas no crediário.")
        if self.cliente_id and not isinstance(self.cliente_id, UUID):
            raise ValueError("O cliente_id deve ser um UUID válido.")
