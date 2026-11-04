from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    DomainException,
    TenantNaoEncontradoException,
)
from src.infrastructure.database.repositorios_concrete import RepositorioTenantSQLAlchemy
from src.infrastructure.database.session import get_db
from src.infrastructure.web.authorization import exigir_permissao
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.schemas import (
    AlterarPlanoTenantRequest,
    AlterarStatusTenantRequest,
    AtualizarPlanoConfigRequest,
    PlanoConfigResponse,
    PlataformaDashboardResponse,
    TenantAdminResponse,
    TenantDetalhesCompletosResponse,
)
from src.use_cases.admin.gerenciar_plataforma import (
    AlterarPlanoTenant,
    AlterarStatusTenant,
    AtualizarPlanoSuperAdmin,
    GerarMetricasPlataforma,
    ListarPlanosSuperAdmin,
    ListarTenantsSuperAdmin,
    ObterDetalhesTenantSuperAdmin,
)

router = APIRouter(prefix="/admin", tags=["Super Admin"])


@router.get("/dashboard", response_model=PlataformaDashboardResponse)
def obter_metricas_dashboard(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> PlataformaDashboardResponse:
    """
    Retorna métricas consolidadas da plataforma para visualização do Super Admin.
    """
    exigir_permissao(current_user, ["ADMIN_SAAS"])
    use_case = GerarMetricasPlataforma(db)
    metricas = use_case.executar()
    return PlataformaDashboardResponse.model_validate(metricas)


@router.get("/tenants", response_model=list[TenantAdminResponse])
def listar_tenants(
    busca: str | None = Query(None, description="Filtro por nome, razão social ou CNPJ"),
    apenas_ativos: bool | None = Query(None, description="Filtrar por status ativo/inativo"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[TenantAdminResponse]:
    """
    Lista todos os clientes (tenants) da plataforma com métricas de uso e faturamento.
    """
    exigir_permissao(current_user, ["ADMIN_SAAS"])
    tenant_repo = RepositorioTenantSQLAlchemy(db)
    use_case = ListarTenantsSuperAdmin(db, tenant_repo)
    tenants = use_case.executar(busca=busca, apenas_ativos=apenas_ativos)
    return [TenantAdminResponse.model_validate(t) for t in tenants]


@router.get("/tenants/{tenant_id}", response_model=TenantAdminResponse)
def obter_tenant_detalhes(
    tenant_id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> TenantAdminResponse:
    """
    Obtém os detalhes consolidados de um tenant específico.
    """
    exigir_permissao(current_user, ["ADMIN_SAAS"])
    tenant_repo = RepositorioTenantSQLAlchemy(db)
    use_case = ListarTenantsSuperAdmin(db, tenant_repo)
    tenants = use_case.executar()
    tenant = next((t for t in tenants if t.id == tenant_id), None)
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tenant com identificador '{tenant_id}' não foi encontrado.",
        )
    return TenantAdminResponse.model_validate(tenant)


@router.patch("/tenants/{tenant_id}/status", response_model=TenantAdminResponse)
def alterar_status_tenant(
    tenant_id: UUID,
    request: AlterarStatusTenantRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> TenantAdminResponse:
    """
    Ativa ou suspende o tenant. Quando suspenso, usuários do tenant não conseguem logar.
    """
    exigir_permissao(current_user, ["ADMIN_SAAS"])
    tenant_repo = RepositorioTenantSQLAlchemy(db)
    use_case = AlterarStatusTenant(tenant_repo)
    try:
        use_case.executar(tenant_id, request.ativo)
        # Retorna o item completo consolidado
        listar_uc = ListarTenantsSuperAdmin(db, tenant_repo)
        tenants = listar_uc.executar()
        item = next((t for t in tenants if t.id == tenant_id), None)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant com identificador '{tenant_id}' não foi encontrado.",
            )
        return TenantAdminResponse.model_validate(item)
    except TenantNaoEncontradoException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.patch("/tenants/{tenant_id}/plano", response_model=TenantAdminResponse)
def alterar_plano_tenant(
    tenant_id: UUID,
    request: AlterarPlanoTenantRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> TenantAdminResponse:
    """
    Altera o plano comercial e limites de lojas/usuários do tenant.
    """
    exigir_permissao(current_user, ["ADMIN_SAAS"])
    tenant_repo = RepositorioTenantSQLAlchemy(db)
    use_case = AlterarPlanoTenant(tenant_repo, db=db)
    try:
        use_case.executar(
            tenant_id=tenant_id,
            plano=request.plano,
            limite_lojas=request.limite_lojas,
            limite_usuarios=request.limite_usuarios,
        )
        listar_uc = ListarTenantsSuperAdmin(db, tenant_repo)
        tenants = listar_uc.executar()
        item = next((t for t in tenants if t.id == tenant_id), None)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Tenant com identificador '{tenant_id}' não foi encontrado.",
            )
        return TenantAdminResponse.model_validate(item)
    except TenantNaoEncontradoException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except (DomainException, ValueError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/tenants/{tenant_id}/detalhes", response_model=TenantDetalhesCompletosResponse)
def obter_detalhes_completos_tenant(
    tenant_id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> TenantDetalhesCompletosResponse:
    """
    Retorna uma visão 360° detalhada do Tenant para o Super-Admin (Lojas, Usuários e Resumo).
    """
    exigir_permissao(current_user, ["ADMIN_SAAS"])
    tenant_repo = RepositorioTenantSQLAlchemy(db)
    use_case = ObterDetalhesTenantSuperAdmin(db, tenant_repo)
    try:
        detalhes = use_case.executar(tenant_id)
        return TenantDetalhesCompletosResponse.model_validate(detalhes)
    except TenantNaoEncontradoException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/planos", response_model=list[PlanoConfigResponse])
def listar_planos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[PlanoConfigResponse]:
    """
    Lista todos os planos comerciais e suas configurações de limites e recursos liberados.
    """
    exigir_permissao(current_user, ["ADMIN_SAAS"])
    use_case = ListarPlanosSuperAdmin(db)
    planos = use_case.executar()
    return [PlanoConfigResponse.model_validate(p) for p in planos]


@router.put("/planos/{plano_id}", response_model=PlanoConfigResponse)
def atualizar_plano(
    plano_id: str,
    request: AtualizarPlanoConfigRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> PlanoConfigResponse:
    """
    Atualiza valor, limites e recursos liberados de um plano comercial da plataforma.
    """
    exigir_permissao(current_user, ["ADMIN_SAAS"])
    use_case = AtualizarPlanoSuperAdmin(db)
    try:
        plano = use_case.executar(
            plano_id=plano_id,
            preco_mensal=request.preco_mensal,
            limite_lojas=request.limite_lojas,
            limite_usuarios=request.limite_usuarios,
            recursos=request.recursos,
            nome=request.nome,
            descricao=request.descricao,
            destaque=request.destaque,
        )
        return PlanoConfigResponse.model_validate(plano)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


