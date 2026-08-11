from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    DomainException,
    LojaNaoEncontradaException,
    ProdutoNaoEncontradoException,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioAuditoriaFisicaSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.schemas import AuditarEstoqueRequest, AuditarEstoqueResponse
from src.use_cases.estoque.auditar_estoque import (
    AuditarEstoqueInput,
    AuditarEstoqueLoja,
    ItemAuditoriaInput,
)

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
        return use_case.executar(input_data)
    except (LojaNaoEncontradaException, ProdutoNaoEncontradoException) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
