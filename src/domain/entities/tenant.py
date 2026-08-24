import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from src.domain.utils.validation import validar_cnpj


@dataclass(frozen=True)
class Tenant:
    """
    Entidade de domínio pura que representa uma empresa cliente do SaaS.
    """
    nome_fantasia: str
    razao_social: str
    cnpj: str
    id: UUID = field(default_factory=uuid4)
    data_cadastro: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        # Validação de tipos iniciais
        if not isinstance(self.nome_fantasia, str) or not self.nome_fantasia.strip():
            raise ValueError("O nome fantasia deve ser uma string não vazia.")
            
        if not isinstance(self.razao_social, str) or not self.razao_social.strip():
            raise ValueError("A razão social deve ser uma string não vazia.")

        if not isinstance(self.cnpj, str):
            raise ValueError("O CNPJ deve ser uma string.")

        # Remove qualquer caractere não numérico do CNPJ
        cnpj_limpo = re.sub(r"\D", "", self.cnpj)
        
        # Como o dataclass é frozen, usamos object.__setattr__ para mutar o campo após inicialização
        object.__setattr__(self, "cnpj", cnpj_limpo)
        
        # Validações matemáticas do CNPJ
        if not validar_cnpj(cnpj_limpo):
            raise ValueError("CNPJ inválido.")


