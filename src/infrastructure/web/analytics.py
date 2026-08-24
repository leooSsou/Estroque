from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
from datetime import datetime

from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user
from src.domain.entities.usuario import Usuario
from src.infrastructure.web.schemas import DashboardAnalyticsResponse, CurvaABCOResponse
from src.use_cases.analytics.gerar_dashboard import GerarDashboardAnalytics, DashboardAnalyticsInput
from src.use_cases.analytics.gerar_curva_abc import GerarCurvaABC, CurvaABCInput
from src.infrastructure.web.authorization import exigir_acesso_loja

router = APIRouter(prefix="/analytics", tags=["Business Intelligence & Analytics"])

@router.get("/dashboard", response_model=DashboardAnalyticsResponse, status_code=status.HTTP_200_OK)
def obter_dashboard(
    loja_id: Optional[UUID] = None,
    data_inicio: Optional[datetime] = None,
    data_fim: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> DashboardAnalyticsResponse:
    """
    Retorna os KPIs consolidados de faturamento, custos e diagnóstico de estoque do inquilino.
    Garante isolamento de filial física para gerentes.
    """
    if loja_id:
        exigir_acesso_loja(loja_id, current_user)
    elif current_user.role == "GERENTE":
        loja_id = current_user.loja_atribuida_id

    use_case = GerarDashboardAnalytics(db)
    input_data = DashboardAnalyticsInput(
        tenant_id=current_user.tenant_id,
        loja_id=loja_id,
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    
    output = use_case.executar(input_data)
    return DashboardAnalyticsResponse.model_validate(output)


@router.get("/curva-abc", response_model=CurvaABCOResponse, status_code=status.HTTP_200_OK)
def obter_curva_abc(
    loja_id: Optional[UUID] = None,
    data_inicio: Optional[datetime] = None,
    data_fim: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> CurvaABCOResponse:
    """
    Retorna os produtos vendidos classificados de acordo com a Curva ABC (Pareto).
    Garante isolamento de filial física para gerentes.
    """
    if loja_id:
        exigir_acesso_loja(loja_id, current_user)
    elif current_user.role == "GERENTE":
        loja_id = current_user.loja_atribuida_id

    use_case = GerarCurvaABC(db)
    input_data = CurvaABCInput(
        tenant_id=current_user.tenant_id,
        loja_id=loja_id,
        data_inicio=data_inicio,
        data_fim=data_fim
    )

    output = use_case.executar(input_data)
    return CurvaABCOResponse.model_validate(output)
