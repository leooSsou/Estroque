from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4

from src.domain.entities.item_venda import ItemVenda
from src.domain.entities.pagamento_venda import PagamentoVenda


@dataclass(frozen=True)
class Venda:
    """
    Entidade de domínio pura que representa uma Venda Administrativa.
    Suporta pagamento único ou múltiplo (Split Payment).
    """
    loja_id: UUID
    usuario_id: UUID  # Vendedor
    status: str       # PENDENTE, PAGO, CANCELADO
    forma_pagamento: str  # DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO, PIX, CREDIARIO, MULTIPLO
    valor_total: float
    desconto: float
    tenant_id: UUID
    itens: list[ItemVenda]
    cliente_id: UUID | None = None
    pagamentos: list[PagamentoVenda] = field(default_factory=list)
    id: UUID = field(default_factory=uuid4)
    data_venda: datetime | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.loja_id, UUID):
            raise ValueError("O loja_id deve ser um UUID válido.")
        if not isinstance(self.usuario_id, UUID):
            raise ValueError("O usuario_id deve ser um UUID válido.")
        if self.status not in ("PENDENTE", "PAGO", "CANCELADO", "CANCELADA", "PARCIALMENTE_DEVOLVIDA", "DEVOLVIDA"):
            raise ValueError("Status inválido.")
        if self.forma_pagamento not in ("DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "CREDIARIO", "CREDITO_LOJA", "MULTIPLO"):
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
        if self.cliente_id and not isinstance(self.cliente_id, UUID):
            raise ValueError("O cliente_id deve ser um UUID válido.")

        # Validação de pagamentos (Split Payment)
        if self.pagamentos:
            if not all(isinstance(p, PagamentoVenda) for p in self.pagamentos):
                raise ValueError("Todos os pagamentos da venda devem ser instâncias de PagamentoVenda.")
            soma_pagamentos = round(sum(p.valor for p in self.pagamentos), 2)
            if round(self.valor_total, 2) != soma_pagamentos:
                raise ValueError(
                    f"A soma dos pagamentos ({soma_pagamentos}) deve ser exatamente igual ao total líquido da venda ({self.valor_total})."
                )
            tem_crediario = any(p.forma_pagamento == "CREDIARIO" for p in self.pagamentos)
            if tem_crediario and not self.cliente_id:
                raise ValueError("O cliente_id é obrigatório para vendas com parcela em crediário.")
            tem_credito_loja = any(p.forma_pagamento == "CREDITO_LOJA" for p in self.pagamentos)
            if tem_credito_loja and not self.cliente_id:
                raise ValueError("O cliente_id é obrigatório para vendas com parcela em crédito da loja.")
        else:
            if self.forma_pagamento == "CREDIARIO" and not self.cliente_id:
                raise ValueError("O cliente_id é obrigatório para vendas realizadas no crediário.")
            if self.forma_pagamento == "CREDITO_LOJA" and not self.cliente_id:
                raise ValueError("O cliente_id é obrigatório para vendas pagas com crédito da loja.")
