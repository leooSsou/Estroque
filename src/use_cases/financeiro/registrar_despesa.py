from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.domain.entities.financeiro_lancamento import FinanceiroLancamento
from src.domain.exceptions.business import (
    DomainException,
    LojaNaoEncontradaException,
)
from src.domain.repositories.financeiro_lancamento_repository import (
    FinanceiroLancamentoRepository,
)
from src.domain.repositories.loja_repository import LojaRepository


@dataclass(frozen=True)
class RegistrarDespesaInput:
    loja_id: UUID
    valor: float
    categoria: str
    status_pagamento: str  # "PENDENTE" ou "PAGO"
    tenant_id: UUID
    data_pagamento: datetime | None = None

@dataclass(frozen=True)
class RegistrarDespesaOutput:
    lancamento: FinanceiroLancamento

class RegistrarDespesaLoja:
    """
    Caso de Uso: Registrar despesas operacionais manuais de uma loja física
    garantindo o isolamento multi-tenant (BOLA).
    """
    def __init__(
        self,
        financeiro_repo: FinanceiroLancamentoRepository,
        loja_repo: LojaRepository
    ) -> None:
        self.financeiro_repo = financeiro_repo
        self.loja_repo = loja_repo

    def executar(self, input_data: RegistrarDespesaInput) -> RegistrarDespesaOutput:
        # 1. Verifica se a loja existe e pertence ao tenant (BOLA)
        loja = self.loja_repo.obter_por_id(input_data.loja_id, input_data.tenant_id)
        if not loja:
            raise LojaNaoEncontradaException(str(input_data.loja_id))

        # 2. Instancia a entidade de domínio
        lancamento = FinanceiroLancamento(
            loja_id=input_data.loja_id,
            tipo="DESPESA",
            valor=input_data.valor,
            categoria=input_data.categoria,
            status_pagamento=input_data.status_pagamento,
            tenant_id=input_data.tenant_id,
            data_pagamento=input_data.data_pagamento
        )

        # 3. Salva no banco
        lancamento_salvo = self.financeiro_repo.salvar(lancamento)

        return RegistrarDespesaOutput(lancamento=lancamento_salvo)


@dataclass(frozen=True)
class QuitarLancamentoInput:
    lancamento_id: UUID
    tenant_id: UUID


@dataclass(frozen=True)
class QuitarLancamentoOutput:
    lancamento: FinanceiroLancamento


class QuitarLancamentoFinanceiro:
    """
    Caso de Uso: Dar baixa em um lançamento financeiro pendente (PENDENTE -> PAGO).
    """
    def __init__(self, financeiro_repo: FinanceiroLancamentoRepository) -> None:
        self.financeiro_repo = financeiro_repo

    def executar(self, input_data: QuitarLancamentoInput) -> QuitarLancamentoOutput:
        lancamento = self.financeiro_repo.obter_por_id(input_data.lancamento_id, input_data.tenant_id)
        if not lancamento:
            raise DomainException("Lançamento financeiro não encontrado.")

        lancamento_atualizado = FinanceiroLancamento(
            id=lancamento.id,
            loja_id=lancamento.loja_id,
            tipo=lancamento.tipo,
            valor=lancamento.valor,
            categoria=lancamento.categoria,
            status_pagamento="PAGO",
            tenant_id=lancamento.tenant_id,
            data_lancamento=lancamento.data_lancamento,
            data_pagamento=lancamento.data_pagamento or datetime.utcnow(),
        )

        lancamento_salvo = self.financeiro_repo.salvar(lancamento_atualizado)
        return QuitarLancamentoOutput(lancamento=lancamento_salvo)

