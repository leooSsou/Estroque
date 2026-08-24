from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4


@dataclass(frozen=True)
class AuditoriaFisicaItem:
    """
    Entidade de domínio pura que representa um item dentro de uma auditoria física de estoque.
    """
    produto_id: UUID
    quantidade_fisica: int
    quantidade_sistema: int
    id: UUID = field(default_factory=uuid4)
    
    @property
    def divergencia(self) -> int:
        return self.quantidade_fisica - self.quantidade_sistema
        
    def __post_init__(self) -> None:
        if not isinstance(self.produto_id, UUID):
            raise ValueError("O produto_id deve ser um UUID válido.")
        if not isinstance(self.quantidade_fisica, int) or self.quantidade_fisica < 0:
            raise ValueError("A quantidade_fisica deve ser um número inteiro maior ou igual a zero.")
        if not isinstance(self.quantidade_sistema, int) or self.quantidade_sistema < 0:
            raise ValueError("A quantidade_sistema deve ser um número inteiro maior ou igual a zero.")

@dataclass(frozen=True)
class AuditoriaFisica:
    """
    Entidade de domínio pura que representa uma Auditoria (Inventário) Física de uma loja.
    """
    loja_id: UUID
    tenant_id: UUID
    itens: list[AuditoriaFisicaItem]
    id: UUID = field(default_factory=uuid4)
    data_auditoria: datetime | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.loja_id, UUID):
            raise ValueError("O loja_id deve ser um UUID válido.")
        if not isinstance(self.tenant_id, UUID):
            raise ValueError("O tenant_id deve ser um UUID válido.")
        if not isinstance(self.itens, list):
            raise ValueError("Os itens devem ser fornecidos como uma lista.")
        if not all(isinstance(item, AuditoriaFisicaItem) for item in self.itens):
            raise ValueError("Todos os elementos da lista de itens devem ser do tipo AuditoriaFisicaItem.")
        if len(self.itens) == 0:
            raise ValueError("Uma auditoria deve conter pelo menos um item.")
