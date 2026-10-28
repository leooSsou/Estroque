from dataclasses import dataclass, field
from uuid import UUID, uuid4

FORMAS_PAGAMENTO_PERMITIDAS = {
    "DINHEIRO",
    "CARTAO_CREDITO",
    "CARTAO_DEBITO",
    "PIX",
    "CREDIARIO",
}


@dataclass(frozen=True)
class PagamentoVenda:
    """
    Entidade de domínio pura que representa uma parcela/forma de pagamento
    de uma Venda (suporte a Split Payment).
    """
    forma_pagamento: str
    valor: float
    tenant_id: UUID
    id: UUID = field(default_factory=uuid4)
    venda_id: UUID | None = None
    detalhes: dict | None = None

    def __post_init__(self) -> None:
        if self.forma_pagamento not in FORMAS_PAGAMENTO_PERMITIDAS:
            raise ValueError(f"Forma de pagamento inválida: {self.forma_pagamento}")
        if not isinstance(self.valor, (int, float)) or self.valor < 0:
            raise ValueError("O valor do pagamento deve ser maior ou igual a zero.")
        if not isinstance(self.tenant_id, UUID):
            raise ValueError("O tenant_id deve ser um UUID válido.")
        if self.id and not isinstance(self.id, UUID):
            raise ValueError("O id deve ser um UUID válido.")
        if self.venda_id and not isinstance(self.venda_id, UUID):
            raise ValueError("O venda_id deve ser um UUID válido.")
