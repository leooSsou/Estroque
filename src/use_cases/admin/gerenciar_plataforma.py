import re
from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from src.domain.constants.modulos import calcular_modulos_tenant, obter_modulos_ativos_map
from src.domain.entities.loja import Loja
from src.domain.entities.tenant import Tenant
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    CnpjEmUsoException,
    CnpjLojaEmUsoException,
    DomainException,
    EmailEmUsoException,
    LimitePlanoAtingidoException,
    TenantNaoEncontradoException,
)
from src.domain.repositories.loja_repository import LojaRepository
from src.domain.repositories.tenant_repository import TenantRepository
from src.domain.repositories.usuario_repository import UsuarioRepository
from src.infrastructure.database.models import (
    LojaModel,
    PlanoConfigModel,
    ProdutoModel,
    TenantModel,
    UsuarioModel,
    VendaModel,
)
from src.use_cases.autenticacao.autenticar_usuario import ServicoCriptografia

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
class PlanoConfigItem:
    id: str
    nome: str
    descricao: str
    preco_mensal: float
    limite_lojas: int
    limite_usuarios: int
    recursos: list[str]
    badge_variant: str
    destaque: bool


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
    modulos_customizados: dict[str, bool] = field(default_factory=dict)
    modulos_ativos: dict[str, bool] = field(default_factory=dict)


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
                modulos_cust = t.modulos_customizados if isinstance(t.modulos_customizados, dict) else {}
                modulos_at = obter_modulos_ativos_map(t.plano, modulos_cust)
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
                        modulos_customizados=modulos_cust,
                        modulos_ativos=modulos_at,
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
            modulos_customizados=tenant.modulos_customizados,
        )

        return self.tenant_repo.salvar(tenant_atualizado)


class AlterarPlanoTenant:
    """
    Caso de Uso: Alterar o plano comercial e os limites do Tenant.
    """
    def __init__(self, tenant_repo: TenantRepository, db: Session | None = None) -> None:
        self.tenant_repo = tenant_repo
        self.db = db

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
        if self.db:
            try:
                self.db.info["ignore_tenant_filter"] = True
                cfg = self.db.query(PlanoConfigModel).filter(PlanoConfigModel.id == plano_upper).first()
                if cfg:
                    padrao_lojas = cfg.limite_lojas
                    padrao_usuarios = cfg.limite_usuarios
            finally:
                self.db.info.pop("ignore_tenant_filter", None)

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
            modulos_customizados=tenant.modulos_customizados,
        )

        return self.tenant_repo.salvar(tenant_atualizado)


class AtualizarModulosTenant:
    """
    Caso de Uso: Atualiza a personalização de módulos/funcionalidades ativas para um inquilino.
    Permite conceder bônus ou restringir recursos de forma granular.
    """
    def __init__(self, tenant_repo: TenantRepository) -> None:
        self.tenant_repo = tenant_repo

    def executar(self, tenant_id: UUID, modulos: dict[str, bool]) -> Tenant:
        tenant = self.tenant_repo.obter_por_id(tenant_id)
        if not tenant:
            raise TenantNaoEncontradoException(str(tenant_id))

        tenant_atualizado = Tenant(
            id=tenant.id,
            nome_fantasia=tenant.nome_fantasia,
            razao_social=tenant.razao_social,
            cnpj=tenant.cnpj,
            data_cadastro=tenant.data_cadastro,
            ativo=tenant.ativo,
            plano=tenant.plano,
            limite_lojas=tenant.limite_lojas,
            limite_usuarios=tenant.limite_usuarios,
            modulos_customizados=modulos,
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

            planos_configs = self.db.query(PlanoConfigModel).all()
            precos_map = {p.id.upper(): float(p.preco_mensal) for p in planos_configs}
            if not precos_map:
                precos_map = PLANOS_PRECOS

            mrr_estimado = sum(
                precos_map.get((t.plano or "PRO").upper(), 0.0)
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


class ListarPlanosSuperAdmin:
    """
    Caso de Uso: Listar as configurações dos planos comerciais da plataforma.
    Se a tabela estiver vazia, efetua o seed inicial com os planos padrão.
    """
    def __init__(self, db: Session) -> None:
        self.db = db

    def executar(self) -> list[PlanoConfigItem]:
        self.db.info["ignore_tenant_filter"] = True
        try:
            planos = self.db.query(PlanoConfigModel).order_by(PlanoConfigModel.preco_mensal.asc()).all()
            if not planos:
                defaults = [
                    PlanoConfigModel(
                        id="STARTER",
                        nome="Starter",
                        descricao="Pequenos comércios",
                        preco_mensal=99.0,
                        limite_lojas=1,
                        limite_usuarios=2,
                        recursos=[
                            "Até 1 filial (loja matriz)",
                            "Até 2 colaboradores",
                            "PDV e Frente de Caixa",
                            "Gestão Básica de Produtos e Estoque",
                        ],
                        badge_variant="neutral",
                        destaque=False,
                    ),
                    PlanoConfigModel(
                        id="PRO",
                        nome="Pro (Mais Popular)",
                        descricao="Empresas em expansão",
                        preco_mensal=249.0,
                        limite_lojas=5,
                        limite_usuarios=10,
                        recursos=[
                            "Até 5 filiais integradas",
                            "Até 10 colaboradores",
                            "Transferências de Estoque entre lojas",
                            "Entrada e Importação de NF-e",
                            "Emissão de Vendas e PDV Avançado",
                        ],
                        badge_variant="purple",
                        destaque=True,
                    ),
                    PlanoConfigModel(
                        id="ENTERPRISE",
                        nome="Enterprise",
                        descricao="Grandes redes e franquias",
                        preco_mensal=799.0,
                        limite_lojas=50,
                        limite_usuarios=100,
                        recursos=[
                            "Até 50 filiais",
                            "Até 100 colaboradores",
                            "Curva ABC e Inteligência de Estoque",
                            "Auditorias físicas com Ledger em tempo real",
                            "Suporte prioritário e limites escaláveis",
                        ],
                        badge_variant="emerald",
                        destaque=False,
                    ),
                ]
                self.db.add_all(defaults)
                self.db.commit()
                planos = defaults

            return [
                PlanoConfigItem(
                    id=p.id,
                    nome=p.nome,
                    descricao=p.descricao,
                    preco_mensal=float(p.preco_mensal),
                    limite_lojas=p.limite_lojas,
                    limite_usuarios=p.limite_usuarios,
                    recursos=list(p.recursos or []),
                    badge_variant=p.badge_variant,
                    destaque=p.destaque,
                )
                for p in planos
            ]
        finally:
            self.db.info.pop("ignore_tenant_filter", None)


class AtualizarPlanoSuperAdmin:
    """
    Caso de Uso: Atualizar valores, limites e recursos liberados de um plano comercial.
    """
    def __init__(self, db: Session) -> None:
        self.db = db

    def executar(
        self,
        plano_id: str,
        preco_mensal: float,
        limite_lojas: int,
        limite_usuarios: int,
        recursos: list[str],
        nome: str | None = None,
        descricao: str | None = None,
        destaque: bool | None = None,
    ) -> PlanoConfigItem:
        if preco_mensal < 0:
            raise ValueError("O preço mensal do plano não pode ser negativo.")
        if limite_lojas < 1:
            raise ValueError("O limite de lojas deve ser no mínimo 1.")
        if limite_usuarios < 1:
            raise ValueError("O limite de usuários deve ser no mínimo 1.")

        self.db.info["ignore_tenant_filter"] = True
        try:
            plano = self.db.query(PlanoConfigModel).filter(PlanoConfigModel.id == plano_id.upper()).first()
            if not plano:
                raise ValueError(f"Plano '{plano_id}' não encontrado.")

            plano.preco_mensal = preco_mensal
            plano.limite_lojas = limite_lojas
            plano.limite_usuarios = limite_usuarios
            plano.recursos = recursos
            if nome:
                plano.nome = nome
            if descricao:
                plano.descricao = descricao
            if destaque is not None:
                plano.destaque = destaque

            self.db.commit()
            self.db.refresh(plano)

            return PlanoConfigItem(
                id=plano.id,
                nome=plano.nome,
                descricao=plano.descricao,
                preco_mensal=float(plano.preco_mensal),
                limite_lojas=plano.limite_lojas,
                limite_usuarios=plano.limite_usuarios,
                recursos=list(plano.recursos or []),
                badge_variant=plano.badge_variant,
                destaque=plano.destaque,
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
    modulos_customizados: dict[str, bool] = field(default_factory=dict)
    modulos: list[dict] = field(default_factory=list)


class ObterDetalhesTenantSuperAdmin:
    """
    Caso de Uso: Retorna uma visão 360° do Tenant para o Super-Admin (LGPD compliant).
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
            lojas_resumo = [
                LojaResumoItem(
                    id=loja.id,
                    nome=loja.nome,
                    cnpj=loja.cnpj,
                    endereco=loja.endereco,
                )
                for loja in lojas_models
            ]

            # LGPD Compliance: Super-Admin visualiza apenas o Dono/Responsável da conta,
            # sem expor lista de funcionários, colaboradores ou operadores de caixa
            usuarios_models = (
                self.db.query(UsuarioModel)
                .filter(UsuarioModel.tenant_id == tenant_id, UsuarioModel.role == "DONO")
                .order_by(UsuarioModel.nome.asc())
                .all()
            )
            usuarios_resumo = [
                UsuarioResumoItem(
                    id=u.id,
                    nome=u.nome,
                    email=u.email,
                    role=u.role,
                    loja_atribuida_id=None,
                    loja_nome=None,
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

            modulos_custom = tenant.modulos_customizados if isinstance(tenant.modulos_customizados, dict) else {}
            modulos_info = calcular_modulos_tenant(tenant.plano, modulos_custom)

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
                modulos_customizados=modulos_custom,
                modulos=modulos_info,
            )
        finally:
            self.db.info.pop("ignore_tenant_filter", None)


@dataclass(frozen=True)
class CadastrarTenantSuperAdminInput:
    nome_fantasia: str
    razao_social: str
    cnpj: str
    plano: str
    dono_nome: str
    dono_email: str
    dono_senha_plana: str
    limite_lojas: int | None = None
    limite_usuarios: int | None = None
    nome_loja: str | None = None
    endereco_loja: str | None = None


class CadastrarTenantSuperAdmin:
    """
    Caso de Uso: Super-Admin cadastra um novo inquilino (Tenant), sua Loja Matriz e o Dono inicial.
    """
    def __init__(
        self,
        tenant_repo: TenantRepository,
        usuario_repo: UsuarioRepository,
        loja_repo: LojaRepository,
        servico_cripto: ServicoCriptografia,
        db: Session | None = None,
    ) -> None:
        self.tenant_repo = tenant_repo
        self.usuario_repo = usuario_repo
        self.loja_repo = loja_repo
        self.servico_cripto = servico_cripto
        self.db = db

    def executar(self, input_data: CadastrarTenantSuperAdminInput) -> Tenant:
        # 1. Valida unicidade de CNPJ da empresa
        cnpj_limpo = re.sub(r"\D", "", input_data.cnpj)
        if self.tenant_repo.obter_por_cnpj(cnpj_limpo):
            raise CnpjEmUsoException(cnpj_limpo)

        # 2. Valida unicidade de e-mail do dono
        email_normalizado = input_data.dono_email.strip().lower()
        if self.usuario_repo.obter_por_email(email_normalizado):
            raise EmailEmUsoException(email_normalizado)

        # 3. Determina limites do plano escolhido
        plano_upper = (input_data.plano or "PRO").strip().upper()
        if plano_upper not in PLANOS_LIMITES_PADRAO:
            raise DomainException(f"Plano '{input_data.plano}' inválido.")

        padrao_lojas, padrao_usuarios = PLANOS_LIMITES_PADRAO[plano_upper]
        if self.db:
            try:
                self.db.info["ignore_tenant_filter"] = True
                cfg = self.db.query(PlanoConfigModel).filter(PlanoConfigModel.id == plano_upper).first()
                if cfg:
                    padrao_lojas = cfg.limite_lojas
                    padrao_usuarios = cfg.limite_usuarios
            finally:
                self.db.info.pop("ignore_tenant_filter", None)

        limite_lojas = input_data.limite_lojas if input_data.limite_lojas and input_data.limite_lojas > 0 else padrao_lojas
        limite_usuarios = input_data.limite_usuarios if input_data.limite_usuarios and input_data.limite_usuarios > 0 else padrao_usuarios

        # 4. Cria e salva a entidade Tenant
        tenant = Tenant(
            nome_fantasia=input_data.nome_fantasia,
            razao_social=input_data.razao_social or input_data.nome_fantasia,
            cnpj=input_data.cnpj,
            ativo=True,
            plano=plano_upper,
            limite_lojas=limite_lojas,
            limite_usuarios=limite_usuarios,
        )
        tenant_salvo = self.tenant_repo.salvar(tenant)

        # 5. Cria e salva a Loja Matriz inicial
        nome_loja = input_data.nome_loja or f"Matriz - {input_data.nome_fantasia}"
        endereco_loja = input_data.endereco_loja or "Matriz Principal"
        loja = Loja(
            nome=nome_loja,
            cnpj=input_data.cnpj,
            endereco=endereco_loja,
            tenant_id=tenant_salvo.id,
        )
        self.loja_repo.salvar(loja)

        # 6. Criptografa a senha e cria o Usuario DONO (DONO tem acesso global e loja_atribuida_id=None)
        senha_hash = self.servico_cripto.gerar_hash(input_data.dono_senha_plana)
        usuario = Usuario(
            nome=input_data.dono_nome,
            email=email_normalizado,
            senha_hash=senha_hash,
            role="DONO",
            tenant_id=tenant_salvo.id,
        )
        self.usuario_repo.salvar(usuario)

        return tenant_salvo


class CadastrarLojaSuperAdmin:
    """
    Caso de Uso: Super-Admin cadastra uma nova filial para um inquilino.
    """
    def __init__(
        self,
        tenant_repo: TenantRepository,
        loja_repo: LojaRepository,
    ) -> None:
        self.tenant_repo = tenant_repo
        self.loja_repo = loja_repo

    def executar(self, tenant_id: UUID, nome: str, cnpj: str, endereco: str | None = None) -> Loja:
        tenant = self.tenant_repo.obter_por_id(tenant_id)
        if not tenant:
            raise TenantNaoEncontradoException(str(tenant_id))

        lojas_existentes = self.loja_repo.listar_todas(tenant_id)
        if len(lojas_existentes) >= tenant.limite_lojas:
            raise LimitePlanoAtingidoException("lojas", tenant.limite_lojas)

        loja_existente = self.loja_repo.obter_por_cnpj(cnpj, tenant_id)
        if loja_existente:
            raise CnpjLojaEmUsoException(cnpj)

        loja = Loja(
            nome=nome,
            cnpj=cnpj,
            endereco=endereco or "Endereço Filial",
            tenant_id=tenant_id,
        )
        return self.loja_repo.salvar(loja)


