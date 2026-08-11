
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    EstoqueInsuficienteException,
    LojaNaoEncontradaException,
    ProdutoNaoEncontradoException,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.schemas import (
    EstoqueSaldoResponse,
    MovimentacaoEstoqueRequest,
    MovimentacaoEstoqueResponse,
    RegistroMovimentacaoEstoqueResponse,
)
from src.use_cases.estoque.registrar_movimentacao import (
    RegistrarMovimentacaoEstoque,
    RegistrarMovimentacaoEstoqueInput,
)

router = APIRouter(prefix="/estoque", tags=["Estoque"])


@router.post("/movimentar", response_model=RegistroMovimentacaoEstoqueResponse, status_code=status.HTTP_200_OK)
def movimentar_estoque(
    request: MovimentacaoEstoqueRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> RegistroMovimentacaoEstoqueResponse:
    """
    Realiza uma movimentação (ENTRADA/SAIDA) de estoque respeitando lock pessimista e tenant.
    """
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    movimentacao_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db)
    loja_repo = RepositorioLojaSQLAlchemy(db)
    produto_repo = RepositorioProdutoSQLAlchemy(db)

    from src.infrastructure.web.authorization import exigir_acesso_loja
    exigir_acesso_loja(request.loja_id, current_user)

    use_case = RegistrarMovimentacaoEstoque(saldo_repo, movimentacao_repo, loja_repo, produto_repo)

    input_data = RegistrarMovimentacaoEstoqueInput(
        loja_id=request.loja_id,
        produto_id=request.produto_id,
        tipo=request.tipo,
        quantidade=request.quantidade,
        motivo=request.motivo,
        tenant_id=current_user.tenant_id,
    )

    try:
        output = use_case.executar(input_data)
        return RegistroMovimentacaoEstoqueResponse(
            saldo=EstoqueSaldoResponse.model_validate(output.saldo),
            movimentacao=MovimentacaoEstoqueResponse.model_validate(output.movimentacao),
        )
    except (LojaNaoEncontradaException, ProdutoNaoEncontradoException) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EstoqueInsuficienteException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("/saldos", response_model=list[EstoqueSaldoResponse])
def listar_saldos(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[EstoqueSaldoResponse]:
    """
    Lista todos os saldos consolidados de estoque vinculados ao Tenant do usuário logado.
    """
    repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    saldos = repo.listar_todos(current_user.tenant_id)
    if current_user.role == "GERENTE":
        saldos = [s for s in saldos if s.loja_id == current_user.loja_atribuida_id]
    return [EstoqueSaldoResponse.model_validate(s) for s in saldos]


@router.get("/movimentacoes", response_model=list[MovimentacaoEstoqueResponse])
def listar_movimentacoes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[MovimentacaoEstoqueResponse]:
    """
    Retorna o histórico imutável (ledger) de movimentações de estoque vinculados ao Tenant.
    """
    repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db)
    movs = repo.listar_todas(current_user.tenant_id)
    if current_user.role == "GERENTE":
        movs = [m for m in movs if m.loja_id == current_user.loja_atribuida_id]
    return [MovimentacaoEstoqueResponse.model_validate(m) for m in movs]
