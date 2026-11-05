from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user


def exigir_permissao(user: Usuario, papeis_permitidos: list[str] | set[str]) -> None:
    """
    Exige que o usuário possua um dos papéis de permissão especificados.
    """
    if user.role not in papeis_permitidos:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Acesso negado: Perfil '{user.role}' não possui permissão para esta operação."
        )


def exigir_acesso_loja(loja_id: UUID, user: Usuario) -> None:
    """
    Exige que o usuário tenha acesso à loja especificada.
    Se o usuário for GERENTE, ele só tem acesso à sua loja_atribuida_id.
    DONO e ADMIN_SAAS possuem acesso irrestrito a todas as lojas do tenant.
    """
    if user.role == "GERENTE":
        if not user.loja_atribuida_id or user.loja_atribuida_id != loja_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: Gerente não possui permissão para acessar esta loja física."
            )

def verificar_acesso_transferencia(
    loja_origem_id: UUID,
    loja_destino_id: UUID,
    user: Usuario
) -> None:
    """
    Valida se um usuário do tipo GERENTE possui acesso a pelo menos uma das lojas
    envolvidas em uma transferência (origem ou destino).
    """
    if user.role == "GERENTE":
        if user.loja_atribuida_id not in (loja_origem_id, loja_destino_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: Gerente só pode interagir com transferências vinculadas à sua loja atribuída."
            )


def verificar_modulo_ativo(modulo: str):
    """
    Retorna uma dependência FastAPI que valida se o inquilino possui o módulo ativo
    (seja por contratação no plano base, ou por bônus concedido pelo SuperAdmin).
    ADMIN_SAAS tem acesso irrestrito a todos os módulos.
    """
    def dependency(
        current_user: Usuario = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> None:
        if current_user.role == "ADMIN_SAAS":
            return

        from src.domain.constants.modulos import CATALOGO_MODULOS, MODULOS_PADRAO_POR_PLANO
        from src.infrastructure.database.models import TenantModel

        tenant = db.query(TenantModel).filter(TenantModel.id == current_user.tenant_id).first()
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inquilino não encontrado."
            )

        custom = tenant.modulos_customizados if isinstance(tenant.modulos_customizados, dict) else {}
        if modulo in custom:
            ativo = bool(custom[modulo])
        else:
            plano_upper = tenant.plano.upper() if tenant.plano else "PRO"
            padrao = MODULOS_PADRAO_POR_PLANO.get(plano_upper, MODULOS_PADRAO_POR_PLANO["PRO"])
            ativo = modulo in padrao

        if not ativo:
            meta = CATALOGO_MODULOS.get(modulo, {})
            nome_modulo = meta.get("nome", modulo)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Módulo '{nome_modulo}' não está habilitado para a sua empresa. Consulte o administrador para liberar o acesso.",
            )

    return dependency
