from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.domain.entities.tenant import Tenant
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    DomainException,
    TenantNaoEncontradoException,
)
from src.domain.repositories.tenant_repository import TenantRepository
from src.infrastructure.database.models import (
    LojaModel,
    ProdutoModel,
    TenantModel,
    UsuarioModel,
    VendaModel,
)
from src.infrastructure.security.jwt_handler import criar_token_acesso

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


@dataclass(frozen=True)
class LojaResumoItem:
    id: UUID
    nome: str
    cnpj: str
    endereco: str | None


@dataclass(frozen=True)
class UsuarioResumoItem:
    id: UUID
    nome: str
    email: str
    role: str
    loja_atribuida_id: UUID | None
    loja_nome: str | None


@dataclass(frozen=True)
class TenantDetalhesCompletosOutput:
    id: UUID
    nome_fantasia: str
    razao_social: str
    cnpj: str
    data_cadastro: datetime
    ativo: bool
    plano: str
    limite_lojas: int
    limite_usuarios: int
    total_produtos: int
    total_vendas_qtd: int
    total_vendas_valor: float
    lojas: list[LojaResumoItem]
    usuarios: list[UsuarioResumoItem]


@dataclass(frozen=True)
class ImpersonateOutput:
    access_token: str
    token_type: str
    tenant_id: UUID
    tenant_nome: str
    usuario_id: UUID
    usuario_nome: str
    usuario_email: str
    usuario_role: str
    loja_id: UUID | None
    loja_nome: str | None
    impersonated_by_id: UUID
    impersonated_by_email: str


class ObterDetalhesTenantSuperAdmin:
    """
    Caso de Uso: Retorna uma visão 360° detalhada do Tenant para o Super-Admin.
    """
    def __init__(self, db: Session, tenant_repo: TenantRepository) -> None:
        self.db = db
        self.tenant_repo = tenant_repo

    def executar(self, tenant_id: UUID) -> TenantDetalhesCompletosOutput:
        self.db.info["ignore_tenant_filter"] = True
        try:
            tenant = self.tenant_repo.obter_por_id(tenant_id)
            if not tenant:
                raise TenantNaoEncontradoException(str(tenant_id))

            lojas_models = (
                self.db.query(LojaModel)
                .filter(LojaModel.tenant_id == tenant_id)
                .order_by(LojaModel.nome.asc())
                .all()
            )
            lojas_map = {loja.id: loja.nome for loja in lojas_models}
            lojas_resumo = [
                LojaResumoItem(
                    id=loja.id,
                    nome=loja.nome,
                    cnpj=loja.cnpj,
                    endereco=loja.endereco,
                )
                for loja in lojas_models
            ]

            usuarios_models = (
                self.db.query(UsuarioModel)
                .filter(UsuarioModel.tenant_id == tenant_id)
                .order_by(UsuarioModel.nome.asc())
                .all()
            )
            usuarios_resumo = [
                UsuarioResumoItem(
                    id=u.id,
                    nome=u.nome,
                    email=u.email,
                    role=u.role,
                    loja_atribuida_id=u.loja_atribuida_id,
                    loja_nome=lojas_map.get(u.loja_atribuida_id) if u.loja_atribuida_id else None,
                )
                for u in usuarios_models
            ]

            total_produtos = (
                self.db.query(func.count(ProdutoModel.id))
                .filter(ProdutoModel.tenant_id == tenant_id)
                .scalar()
                or 0
            )

            vendas_stats = (
                self.db.query(
                    func.count(VendaModel.id),
                    func.coalesce(func.sum(VendaModel.valor_total - VendaModel.desconto), 0.0),
                )
                .filter(VendaModel.tenant_id == tenant_id, VendaModel.status != "CANCELADA")
                .first()
            )
            total_vendas_qtd = vendas_stats[0] if vendas_stats else 0
            total_vendas_valor = float(vendas_stats[1]) if vendas_stats else 0.0

            return TenantDetalhesCompletosOutput(
                id=tenant.id,
                nome_fantasia=tenant.nome_fantasia,
                razao_social=tenant.razao_social,
                cnpj=tenant.cnpj,
                data_cadastro=tenant.data_cadastro,
                ativo=tenant.ativo,
                plano=tenant.plano,
                limite_lojas=tenant.limite_lojas,
                limite_usuarios=tenant.limite_usuarios,
                total_produtos=total_produtos,
                total_vendas_qtd=total_vendas_qtd,
                total_vendas_valor=total_vendas_valor,
                lojas=lojas_resumo,
                usuarios=usuarios_resumo,
            )
        finally:
            self.db.info.pop("ignore_tenant_filter", None)


class ImpersonarTenant:
    """
    Caso de Uso: Permitir ao Super-Admin autenticar-se e assumir a conta de um Tenant
    para fins de suporte, diagnóstico e auditoria.
    """
    def __init__(self, db: Session, tenant_repo: TenantRepository) -> None:
        self.db = db
        self.tenant_repo = tenant_repo

    def executar(self, admin_user: Usuario, tenant_id: UUID) -> ImpersonateOutput:
        if admin_user.role != "ADMIN_SAAS":
            raise DomainException("Apenas administradores da plataforma (ADMIN_SAAS) podem assumir a sessão de inquilinos.")

        self.db.info["ignore_tenant_filter"] = True
        try:
            tenant = self.tenant_repo.obter_por_id(tenant_id)
            if not tenant:
                raise TenantNaoEncontradoException(str(tenant_id))

            usuarios = (
                self.db.query(UsuarioModel)
                .filter(UsuarioModel.tenant_id == tenant_id)
                .all()
            )
            if not usuarios:
                raise DomainException("O inquilino não possui usuários cadastrados para acesso de suporte.")

            alvo = next((u for u in usuarios if u.role == "DONO"), usuarios[0])

            loja = (
                self.db.query(LojaModel)
                .filter(LojaModel.tenant_id == tenant_id)
                .first()
            )

            claims_extras = {
                "impersonated_by": str(admin_user.id),
                "impersonator_email": admin_user.email,
                "is_impersonating": True,
                "tenant_nome": tenant.nome_fantasia,
                "target_user_name": alvo.nome,
            }

            token = criar_token_acesso(
                sub=str(alvo.id),
                tenant_id=str(tenant.id),
                role=alvo.role,
                claims_extras=claims_extras,
            )

            return ImpersonateOutput(
                access_token=token,
                token_type="bearer",
                tenant_id=tenant.id,
                tenant_nome=tenant.nome_fantasia,
                usuario_id=alvo.id,
                usuario_nome=alvo.nome,
                usuario_email=alvo.email,
                usuario_role=alvo.role,
                loja_id=loja.id if loja else None,
                loja_nome=loja.nome if loja else None,
                impersonated_by_id=admin_user.id,
                impersonated_by_email=admin_user.email,
            )
        finally:
            self.db.info.pop("ignore_tenant_filter", None)

