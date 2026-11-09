import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import UUID, uuid4

from src.domain.constants.modulos import CATALOGO_MODULOS
from src.domain.utils.validation import validar_cnpj

PLANOS_PERMITIDOS = {"STARTER", "PRO", "ENTERPRISE"}


@dataclass(frozen=True)
class Tenant:
    """
    Entidade de domínio pura que representa uma empresa cliente do SaaS.
    """
    nome_fantasia: str
    razao_social: str
    cnpj: str | None = None
    id: UUID = field(default_factory=uuid4)
    data_cadastro: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    ativo: bool = True
    plano: str = "PRO"
    limite_lojas: int = 5
    limite_usuarios: int = 10
    modulos_customizados: dict[str, bool] = field(default_factory=dict)

    def __post_init__(self) -> None:
        # Validação de tipos iniciais
        if not isinstance(self.nome_fantasia, str) or not self.nome_fantasia.strip():
            raise ValueError("O nome fantasia deve ser uma string não vazia.")
            
        if not isinstance(self.razao_social, str) or not self.razao_social.strip():
            raise ValueError("A razão social deve ser uma string não vazia.")

        if self.cnpj is not None and str(self.cnpj).strip():
            if not isinstance(self.cnpj, str):
                raise ValueError("O CNPJ deve ser uma string.")
            cnpj_limpo = re.sub(r"\D", "", self.cnpj)
            if not cnpj_limpo:
                object.__setattr__(self, "cnpj", None)
            else:
                if not validar_cnpj(cnpj_limpo):
                    raise ValueError("CNPJ inválido.")
                object.__setattr__(self, "cnpj", cnpj_limpo)
        else:
            object.__setattr__(self, "cnpj", None)

        if not isinstance(self.ativo, bool):
            raise ValueError("O campo ativo deve ser um booleano.")

        if not isinstance(self.plano, str) or self.plano.upper() not in PLANOS_PERMITIDOS:
            raise ValueError(f"O plano deve ser um dos seguintes: {', '.join(sorted(PLANOS_PERMITIDOS))}.")
        object.__setattr__(self, "plano", self.plano.upper())

        if not isinstance(self.limite_lojas, int) or self.limite_lojas <= 0:
            raise ValueError("O limite de lojas deve ser um número inteiro positivo.")

        if not isinstance(self.limite_usuarios, int) or self.limite_usuarios <= 0:
            raise ValueError("O limite de usuários deve ser um número inteiro positivo.")

        if not isinstance(self.modulos_customizados, dict):
            raise ValueError("O campo modulos_customizados deve ser um dicionário.")

        for k, v in self.modulos_customizados.items():
            if k not in CATALOGO_MODULOS:
                raise ValueError(f"Módulo '{k}' inválido. Módulos válidos: {', '.join(sorted(CATALOGO_MODULOS.keys()))}.")
            if not isinstance(v, bool):
                raise ValueError(f"O valor para o módulo '{k}' deve ser um booleano.")


