from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import DomainException
from src.infrastructure.database.repositorios_concrete import (
    RepositorioAnalyticsSQLAlchemy,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.web.authorization import exigir_acesso_loja
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.schemas import (
    CurvaABCItemResponse,
    DashboardResponse,
)
from src.use_cases.analytics.consultar_curva_abc import (
    ConsultarCurvaABC,
    ConsultarCurvaABCInput,
)
from src.use_cases.analytics.consultar_dashboard import (
    ConsultarDashboard,
    ConsultarDashboardInput,
)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics & Business Intelligence"]
)


@router.get("/dashboard", response_model=DashboardResponse, status_code=status.HTTP_200_OK)
def consultar_dashboard(
    loja_id: UUID | None = None,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> DashboardResponse:
    """
    Retorna os KPIs consolidados do painel analítico: faturamento bruto,
    número de vendas, ticket médio, CMV, margem de lucro, itens em estoque
    crítico e rupturas. Garante isolamento de filial para gerentes.
    """
    if loja_id:
        exigir_acesso_loja(loja_id, current_user)
    elif current_user.role == "GERENTE":
        loja_id = current_user.loja_atribuida_id

    analytics_repo = RepositorioAnalyticsSQLAlchemy(db)

    use_case = ConsultarDashboard(analytics_repo=analytics_repo)

    input_data = ConsultarDashboardInput(
        tenant_id=current_user.tenant_id,
        loja_id=loja_id,
        data_inicio=data_inicio,
        data_fim=data_fim,
    )

    try:
        output = use_case.executar(input_data)
        return DashboardResponse.model_validate(output.indicadores)
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/curva-abc", response_model=list[CurvaABCItemResponse], status_code=status.HTTP_200_OK)
def consultar_curva_abc(
    loja_id: UUID | None = None,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> list[CurvaABCItemResponse]:
    """
    Calcula a Curva ABC (Princípio de Pareto) por produto, classificando os
    itens em classes A (80%), B (15%) e C (5%) do faturamento acumulado.
    """
    if loja_id:
        exigir_acesso_loja(loja_id, current_user)
    elif current_user.role == "GERENTE":
        loja_id = current_user.loja_atribuida_id

    analytics_repo = RepositorioAnalyticsSQLAlchemy(db)

    use_case = ConsultarCurvaABC(analytics_repo=analytics_repo)

    input_data = ConsultarCurvaABCInput(
        tenant_id=current_user.tenant_id,
        loja_id=loja_id,
        data_inicio=data_inicio,
        data_fim=data_fim,
    )

    try:
        output = use_case.executar(input_data)
        return [CurvaABCItemResponse.model_validate(item) for item in output.itens]
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
