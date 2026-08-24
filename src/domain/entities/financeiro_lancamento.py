from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4


@dataclass(frozen=True)
class FinanceiroLancamento:
    """
    Entidade de domínio pura que representa um lançamento financeiro (Receita/Despesa).
    """
    loja_id: UUID
    tipo: str  # "RECEITA" ou "DESPESA"
    valor: float
    categoria: str
    status_pagamento: str  # "PENDENTE" ou "PAGO"
    tenant_id: UUID
    id: UUID = field(default_factory=uuid4)
    data_lancamento: datetime = field(default_factory=datetime.utcnow)
    data_pagamento: datetime | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.loja_id, UUID):
            raise ValueError("O loja_id deve ser um UUID válido.")
        if self.tipo not in ("RECEITA", "DESPESA"):
            raise ValueError("O tipo de lançamento deve ser 'RECEITA' ou 'DESPESA'.")
        if not isinstance(self.valor, (int, float)) or self.valor <= 0:
            raise ValueError("O valor do lançamento deve ser um número maior que zero.")
        if not self.categoria or not self.categoria.strip():
            raise ValueError("A categoria é obrigatória.")
        if self.status_pagamento not in ("PENDENTE", "PAGO"):
            raise ValueError("O status de pagamento deve ser 'PENDENTE' ou 'PAGO'.")
        if not isinstance(self.tenant_id, UUID):
            raise ValueError("O tenant_id deve ser um UUID válido.")
        if self.status_pagamento == "PAGO" and not self.data_pagamento:
            # Se for PAGO e data_pagamento não informada, assume a data do lançamento
            object.__setattr__(self, "data_pagamento", self.data_lancamento)
