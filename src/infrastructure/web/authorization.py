from uuid import UUID

from fastapi import HTTPException, status

from src.domain.entities.usuario import Usuario


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
