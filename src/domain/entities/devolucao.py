from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4

TIPOS_DEVOLUCAO = {"DEVOLUCAO", "TROCA"}
TIPOS_RESOLUCAO = {"CREDITO_LOJA", "REEMBOLSO_CAIXA", "ABATIMENTO_CREDIARIO"}
CONDICOES_ITEM = {"PERFEITO", "AVARIADO"}


@dataclass(frozen=True)
class ItemDevolucao:
    """
    Entidade de domínio pura que representa um item devolvido ou trocado.
    """
    item_venda_id: UUID
    produto_id: UUID
    quantidade: int
    preco_unitario: float
    valor_total: float
    tenant_id: UUID
    retornar_ao_estoque: bool = True
    condicao: str = "PERFEITO"
    devolucao_id: UUID | None = None
    id: UUID = field(default_factory=uuid4)

    def __post_init__(self) -> None:
        if not isinstance(self.item_venda_id, UUID):
            raise ValueError("O item_venda_id deve ser um UUID válido.")
        if not isinstance(self.produto_id, UUID):
            raise ValueError("O produto_id deve ser um UUID válido.")
        if not isinstance(self.quantidade, int) or self.quantidade <= 0:
            raise ValueError("A quantidade devolvida deve ser um número inteiro maior que zero.")
        if not isinstance(self.preco_unitario, (int, float)) or self.preco_unitario <= 0:
            raise ValueError("O preço unitário deve ser maior que zero.")
        if not isinstance(self.valor_total, (int, float)) or self.valor_total < 0:
            raise ValueError("O valor total do item devolvido deve ser maior ou igual a zero.")
        if self.condicao not in CONDICOES_ITEM:
            raise ValueError(f"Condição de item inválida: {self.condicao}. Permitidas: {CONDICOES_ITEM}")
        if not isinstance(self.tenant_id, UUID):
            raise ValueError("O tenant_id deve ser um UUID válido.")
        if self.devolucao_id and not isinstance(self.devolucao_id, UUID):
            raise ValueError("O devolucao_id deve ser um UUID válido.")
        if not isinstance(self.id, UUID):
            raise ValueError("O id deve ser um UUID válido.")


@dataclass(frozen=True)
class Devolucao:
    """
    Entidade de domínio pura que representa uma devolução ou troca de venda (total ou parcial).
    """
    venda_id: UUID
    loja_id: UUID
    usuario_id: UUID
    tipo: str
    tipo_resolucao: str
    valor_total: float
    motivo: str
    tenant_id: UUID
    itens: list[ItemDevolucao]
    cliente_id: UUID | None = None
    data_devolucao: datetime | None = None
    id: UUID = field(default_factory=uuid4)

    def __post_init__(self) -> None:
        if not isinstance(self.venda_id, UUID):
            raise ValueError("O venda_id deve ser um UUID válido.")
        if not isinstance(self.loja_id, UUID):
            raise ValueError("O loja_id deve ser um UUID válido.")
        if not isinstance(self.usuario_id, UUID):
            raise ValueError("O usuario_id deve ser um UUID válido.")
        if self.cliente_id and not isinstance(self.cliente_id, UUID):
            raise ValueError("O cliente_id deve ser um UUID válido.")
        if self.tipo not in TIPOS_DEVOLUCAO:
            raise ValueError(f"Tipo de devolução inválido: {self.tipo}. Permitidos: {TIPOS_DEVOLUCAO}")
        if self.tipo_resolucao not in TIPOS_RESOLUCAO:
            raise ValueError(f"Tipo de resolução inválido: {self.tipo_resolucao}. Permitidos: {TIPOS_RESOLUCAO}")
        if not isinstance(self.valor_total, (int, float)) or self.valor_total <= 0:
            raise ValueError("O valor total da devolução deve ser maior que zero.")
        if not isinstance(self.motivo, str) or not self.motivo.strip():
            raise ValueError("O motivo da devolução deve ser informado.")
        if not isinstance(self.tenant_id, UUID):
            raise ValueError("O tenant_id deve ser um UUID válido.")
        if not isinstance(self.id, UUID):
            raise ValueError("O id deve ser um UUID válido.")
        if not isinstance(self.itens, list) or len(self.itens) == 0:
            raise ValueError("A devolução deve conter pelo menos um item devolvido.")
        if not all(isinstance(item, ItemDevolucao) for item in self.itens):
            raise ValueError("Todos os itens devem ser instâncias de ItemDevolucao.")

        soma_itens = round(sum(item.valor_total for item in self.itens), 2)
        if round(self.valor_total, 2) != soma_itens:
            raise ValueError(
                f"O valor total da devolução ({self.valor_total}) deve ser igual à soma dos itens ({soma_itens})."
            )

        if self.tipo_resolucao in {"CREDITO_LOJA", "ABATIMENTO_CREDIARIO"} and not self.cliente_id:
            raise ValueError(f"A resolução '{self.tipo_resolucao}' exige a identificação do cliente.")
