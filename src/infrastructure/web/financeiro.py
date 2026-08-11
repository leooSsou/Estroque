from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    DomainException,
    LojaNaoEncontradaException,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioFinanceiroLancamentoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.web.authorization import exigir_acesso_loja
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.schemas import (
    FinanceiroLancamentoResponse,
    RegistrarDespesaRequest,
)
from src.use_cases.financeiro.listar_lancamentos import (
    ListarLancamentosFinanceiros,
    ListarLancamentosInput,
)
from src.use_cases.financeiro.registrar_despesa import (
    RegistrarDespesaInput,
    RegistrarDespesaLoja,
)

router = APIRouter(
    prefix="/financeiro",
    tags=["Gestão Financeira & Caixa"]
)

@router.post("/despesas", response_model=FinanceiroLancamentoResponse, status_code=status.HTTP_201_CREATED)
def registrar_despesa(
    request: RegistrarDespesaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> FinanceiroLancamentoResponse:
    """
    Registra uma despesa operacional de forma manual para uma loja física.
    Aplica controles de BOLA/BFLA se o usuário for um gerente.
    """
    # Enforça isolamento de filial física para GERENTE
    exigir_acesso_loja(request.loja_id, current_user)

    financeiro_repo = RepositorioFinanceiroLancamentoSQLAlchemy(db)
    loja_repo = RepositorioLojaSQLAlchemy(db)

    use_case = RegistrarDespesaLoja(
        financeiro_repo=financeiro_repo,
        loja_repo=loja_repo
    )

    input_data = RegistrarDespesaInput(
        loja_id=request.loja_id,
        valor=request.valor,
        categoria=request.categoria,
        status_pagamento=request.status_pagamento,
        tenant_id=current_user.tenant_id,
        data_pagamento=request.data_pagamento
    )

    try:
        output = use_case.executar(input_data)
        return FinanceiroLancamentoResponse.model_validate(output.lancamento)
    except LojaNaoEncontradaException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("/lancamentos", response_model=list[FinanceiroLancamentoResponse], status_code=status.HTTP_200_OK)
def listar_lancamentos(
    loja_id: UUID | None = None,
    tipo: str | None = None,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> list[FinanceiroLancamentoResponse]:
    """
    Lista e filtra os lançamentos de fluxo de caixa (receitas/despesas) do inquilino.
    Garante isolamento de filial para gerentes.
    """
    # Enforça isolamento de filial física para GERENTE
    if loja_id:
        exigir_acesso_loja(loja_id, current_user)
    elif current_user.role == "GERENTE":
        loja_id = current_user.loja_atribuida_id

    financeiro_repo = RepositorioFinanceiroLancamentoSQLAlchemy(db)

    use_case = ListarLancamentosFinanceiros(financeiro_repo=financeiro_repo)

    input_data = ListarLancamentosInput(
        tenant_id=current_user.tenant_id,
        loja_id=loja_id,
        tipo=tipo,
        data_inicio=data_inicio,
        data_fim=data_fim
    )

    try:
        output = use_case.executar(input_data)
        return [FinanceiroLancamentoResponse.model_validate(lancamento) for lancamento in output.lancamentos]
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
