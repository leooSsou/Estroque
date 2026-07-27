import re
from dataclasses import dataclass, field
from uuid import UUID, uuid4
from src.domain.utils.validation import validar_cnpj

@dataclass(frozen=True)
class Loja:
    """
    Entidade de domínio pura que representa uma filial física de um Tenant.
    """
    nome: str
    cnpj: str
    endereco: str
    tenant_id: UUID
    id: UUID = field(default_factory=uuid4)
    ativo: bool = True

    def __post_init__(self) -> None:
        # Validação de tipos iniciais
        if not isinstance(self.nome, str) or not self.nome.strip():
            raise ValueError("O nome da loja deve ser uma string não vazia.")
        object.__setattr__(self, "nome", self.nome.strip())
            
        if not isinstance(self.cnpj, str):
            raise ValueError("O CNPJ deve ser uma string.")
            
        if not isinstance(self.endereco, str) or not self.endereco.strip():
            raise ValueError("O endereço deve ser uma string não vazia.")
        object.__setattr__(self, "endereco", self.endereco.strip())

        if not isinstance(self.tenant_id, UUID):
            raise ValueError("O tenant_id deve ser um UUID válido.")
            
        if not isinstance(self.ativo, bool):
            raise ValueError("O campo ativo deve ser um booleano.")

        # Remove qualquer caractere não numérico do CNPJ
        cnpj_limpo = re.sub(r"\D", "", self.cnpj)
        object.__setattr__(self, "cnpj", cnpj_limpo)
        
        # Validações matemáticas do CNPJ
        if not validar_cnpj(cnpj_limpo):
            raise ValueError("CNPJ inválido.")

