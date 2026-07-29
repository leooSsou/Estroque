from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user
from src.domain.entities.usuario import Usuario
from src.infrastructure.web.schemas import AuditarEstoqueRequest, AuditarEstoqueResponse
from src.use_cases.estoque.auditar_estoque import AuditarEstoqueLoja, AuditarEstoqueInput, ItemAuditoriaInput
from src.infrastructure.database.repositorios_concrete import (
    RepositorioAuditoriaFisicaSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy
)
from src.domain.exceptions.business import DomainException

router = APIRouter(
    prefix="/estoque",
    tags=["Estoque - Auditoria Física"]
)

@router.post("/auditar", response_model=AuditarEstoqueResponse, status_code=status.HTTP_201_CREATED)
def auditar_estoque(
    request: AuditarEstoqueRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Realiza a auditoria física de estoque de uma loja.
    Compara a contagem física com o saldo em sistema e gera ajustes (entradas/saídas).
    """
    auditoria_repo = RepositorioAuditoriaFisicaSQLAlchemy(db)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    movimentacao_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db)
    loja_repo = RepositorioLojaSQLAlchemy(db)
    produto_repo = RepositorioProdutoSQLAlchemy(db)

    use_case = AuditarEstoqueLoja(
        auditoria_repo=auditoria_repo,
        saldo_repo=saldo_repo,
        movimentacao_repo=movimentacao_repo,
        loja_repo=loja_repo,
        produto_repo=produto_repo
    )

    itens_input = [
        ItemAuditoriaInput(produto_id=i.produto_id, quantidade_fisica=i.quantidade_fisica)
        for i in request.itens
    ]

    input_data = AuditarEstoqueInput(
        loja_id=request.loja_id,
        tenant_id=current_user.tenant_id,
        itens_contados=itens_input
    )

    try:
        resultado = use_case.executar(input_data)
        db.commit()
        return resultado
    except DomainException as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
