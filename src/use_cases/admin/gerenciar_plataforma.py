from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.domain.entities.tenant import Tenant
from src.domain.exceptions.business import (
    DomainException,
    TenantNaoEncontradoException,
)
from src.domain.repositories.tenant_repository import TenantRepository
from src.infrastructure.database.models import (
    LojaModel,
    TenantModel,
    UsuarioModel,
    VendaModel,
)

PLANOS_PRECOS = {
    "STARTER": 99.0,
    "PRO": 249.0,
    "ENTERPRISE": 799.0,
}

PLANOS_LIMITES_PADRAO = {
    "STARTER": (1, 2),
    "PRO": (5, 10),
    "ENTERPRISE": (50, 100),
}


@dataclass(frozen=True)
class TenantSuperAdminItem:
    id: UUID
    nome_fantasia: str
    razao_social: str
    cnpj: str
    data_cadastro: datetime
    ativo: bool
    plano: str
    limite_lojas: int
    limite_usuarios: int
    total_lojas: int
    total_usuarios: int
    total_vendas_valor: float
    total_vendas_qtd: int


@dataclass(frozen=True)
class MetricasPlataformaOutput:
    total_tenants: int
    tenants_ativos: int
    tenants_suspensos: int
    total_lojas: int
    total_usuarios: int
    mrr_estimado: float
    gmv_total: float
    total_vendas: int


class ListarTenantsSuperAdmin:
    """
    Caso de Uso: Listar tenants para o painel de Super Admin com métricas consolidadas.
    """
    def __init__(self, db: Session, tenant_repo: TenantRepository) -> None:
        self.db = db
        self.tenant_repo = tenant_repo

    def executar(
        self, busca: str | None = None, apenas_ativos: bool | None = None
    ) -> list[TenantSuperAdminItem]:
        self.db.info["ignore_tenant_filter"] = True
        try:
            tenants = self.tenant_repo.listar_todos(busca=busca, apenas_ativos=apenas_ativos)

            # Agrega contagens de lojas por tenant
            lojas_query = (
                self.db.query(LojaModel.tenant_id, func.count(LojaModel.id))
                .group_by(LojaModel.tenant_id)
                .all()
            )
            lojas_map = {row[0]: row[1] for row in lojas_query}

            # Agrega contagens de usuários por tenant
            usuarios_query = (
                self.db.query(UsuarioModel.tenant_id, func.count(UsuarioModel.id))
                .group_by(UsuarioModel.tenant_id)
                .all()
            )
            usuarios_map = {row[0]: row[1] for row in usuarios_query}

            # Agrega vendas por tenant (desconsiderando canceladas)
            vendas_query = (
                self.db.query(
                    VendaModel.tenant_id,
                    func.count(VendaModel.id),
                    func.coalesce(func.sum(VendaModel.valor_total - VendaModel.desconto), 0.0),
                )
                .filter(VendaModel.status != "CANCELADA")
                .group_by(VendaModel.tenant_id)
                .all()
            )
            vendas_map = {row[0]: (row[1], float(row[2])) for row in vendas_query}

            resultado: list[TenantSuperAdminItem] = []
            for t in tenants:
                vendas_qtd, vendas_val = vendas_map.get(t.id, (0, 0.0))
                resultado.append(
                    TenantSuperAdminItem(
                        id=t.id,
                        nome_fantasia=t.nome_fantasia,
                        razao_social=t.razao_social,
                        cnpj=t.cnpj,
                        data_cadastro=t.data_cadastro,
                        ativo=t.ativo,
                        plano=t.plano,
                        limite_lojas=t.limite_lojas,
                        limite_usuarios=t.limite_usuarios,
                        total_lojas=lojas_map.get(t.id, 0),
                        total_usuarios=usuarios_map.get(t.id, 0),
                        total_vendas_valor=vendas_val,
                        total_vendas_qtd=vendas_qtd,
                    )
                )

            return resultado
        finally:
            self.db.info.pop("ignore_tenant_filter", None)


class AlterarStatusTenant:
    """
    Caso de Uso: Ativar ou suspender um inquilino/Tenant.
    """
    def __init__(self, tenant_repo: TenantRepository) -> None:
        self.tenant_repo = tenant_repo

    def executar(self, tenant_id: UUID, ativo: bool) -> Tenant:
        tenant = self.tenant_repo.obter_por_id(tenant_id)
        if not tenant:
            raise TenantNaoEncontradoException(str(tenant_id))

        tenant_atualizado = Tenant(
            id=tenant.id,
            nome_fantasia=tenant.nome_fantasia,
            razao_social=tenant.razao_social,
            cnpj=tenant.cnpj,
            data_cadastro=tenant.data_cadastro,
            ativo=ativo,
            plano=tenant.plano,
            limite_lojas=tenant.limite_lojas,
            limite_usuarios=tenant.limite_usuarios,
        )

        return self.tenant_repo.salvar(tenant_atualizado)


class AlterarPlanoTenant:
    """
    Caso de Uso: Alterar o plano comercial e os limites do Tenant.
    """
    def __init__(self, tenant_repo: TenantRepository) -> None:
        self.tenant_repo = tenant_repo

    def executar(
        self,
        tenant_id: UUID,
        plano: str,
        limite_lojas: int | None = None,
        limite_usuarios: int | None = None,
    ) -> Tenant:
        tenant = self.tenant_repo.obter_por_id(tenant_id)
        if not tenant:
            raise TenantNaoEncontradoException(str(tenant_id))

        plano_upper = plano.strip().upper()
        if plano_upper not in PLANOS_LIMITES_PADRAO:
            raise DomainException(f"Plano '{plano}' inválido. Planos permitidos: {', '.join(sorted(PLANOS_LIMITES_PADRAO.keys()))}.")

        padrao_lojas, padrao_usuarios = PLANOS_LIMITES_PADRAO[plano_upper]
        novo_limite_lojas = limite_lojas if limite_lojas is not None and limite_lojas > 0 else padrao_lojas
        novo_limite_usuarios = limite_usuarios if limite_usuarios is not None and limite_usuarios > 0 else padrao_usuarios

        tenant_atualizado = Tenant(
            id=tenant.id,
            nome_fantasia=tenant.nome_fantasia,
            razao_social=tenant.razao_social,
            cnpj=tenant.cnpj,
            data_cadastro=tenant.data_cadastro,
            ativo=tenant.ativo,
            plano=plano_upper,
            limite_lojas=novo_limite_lojas,
            limite_usuarios=novo_limite_usuarios,
        )

        return self.tenant_repo.salvar(tenant_atualizado)


class GerarMetricasPlataforma:
    """
    Caso de Uso: Consolidar métricas globais da plataforma para o painel de Super Admin.
    """
    def __init__(self, db: Session) -> None:
        self.db = db

    def executar(self) -> MetricasPlataformaOutput:
        self.db.info["ignore_tenant_filter"] = True
        try:
            tenants = self.db.query(TenantModel).all()
            total_tenants = len(tenants)
            tenants_ativos = sum(1 for t in tenants if t.ativo)
            tenants_suspensos = total_tenants - tenants_ativos

            total_lojas = self.db.query(func.count(LojaModel.id)).scalar() or 0
            total_usuarios = self.db.query(func.count(UsuarioModel.id)).scalar() or 0

            mrr_estimado = sum(
                PLANOS_PRECOS.get((t.plano or "PRO").upper(), 0.0)
                for t in tenants
                if t.ativo
            )

            vendas_stats = (
                self.db.query(
                    func.count(VendaModel.id),
                    func.coalesce(func.sum(VendaModel.valor_total - VendaModel.desconto), 0.0),
                )
                .filter(VendaModel.status != "CANCELADA")
                .first()
            )

            total_vendas = vendas_stats[0] if vendas_stats else 0
            gmv_total = float(vendas_stats[1]) if vendas_stats else 0.0

            return MetricasPlataformaOutput(
                total_tenants=total_tenants,
                tenants_ativos=tenants_ativos,
                tenants_suspensos=tenants_suspensos,
                total_lojas=total_lojas,
                total_usuarios=total_usuarios,
                mrr_estimado=mrr_estimado,
                gmv_total=gmv_total,
                total_vendas=total_vendas,
            )
        finally:
            self.db.info.pop("ignore_tenant_filter", None)
