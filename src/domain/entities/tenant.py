import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from src.domain.utils.validation import validar_cnpj

PLANOS_PERMITIDOS = {"STARTER", "PRO", "ENTERPRISE"}


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
    ativo: bool = True
    plano: str = "PRO"
    limite_lojas: int = 5
    limite_usuarios: int = 10

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

        if not isinstance(self.ativo, bool):
            raise ValueError("O campo ativo deve ser um booleano.")

        if not isinstance(self.plano, str) or self.plano.upper() not in PLANOS_PERMITIDOS:
            raise ValueError(f"O plano deve ser um dos seguintes: {', '.join(sorted(PLANOS_PERMITIDOS))}.")
        object.__setattr__(self, "plano", self.plano.upper())

        if not isinstance(self.limite_lojas, int) or self.limite_lojas <= 0:
            raise ValueError("O limite de lojas deve ser um número inteiro positivo.")

        if not isinstance(self.limite_usuarios, int) or self.limite_usuarios <= 0:
            raise ValueError("O limite de usuários deve ser um número inteiro positivo.")


