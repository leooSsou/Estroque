
from collections import defaultdict
from datetime import datetime, timezone
from uuid import UUID

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
        saldo_ant = (
            (output.saldo.quantidade - request.quantidade)
            if request.tipo == "ENTRADA"
            else (output.saldo.quantidade + request.quantidade)
        )
        return RegistroMovimentacaoEstoqueResponse(
            saldo=EstoqueSaldoResponse.model_validate(output.saldo),
            movimentacao=MovimentacaoEstoqueResponse(
                id=output.movimentacao.id,
                loja_id=output.movimentacao.loja_id,
                produto_id=output.movimentacao.produto_id,
                tipo=output.movimentacao.tipo,
                quantidade=output.movimentacao.quantidade,
                motivo=output.movimentacao.motivo,
                tenant_id=output.movimentacao.tenant_id,
                data_movimentacao=output.movimentacao.data_movimentacao or datetime.now(timezone.utc),
                saldo_anterior=saldo_ant,
                saldo_resultante=output.saldo.quantidade,
            ),
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
    Calcula dinamicamente saldo_anterior e saldo_resultante para garantir rastreabilidade completa.
    """
    repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    movs = repo.listar_todas(current_user.tenant_id)
    if current_user.role == "GERENTE":
        movs = [m for m in movs if m.loja_id == current_user.loja_atribuida_id]

    saldos = saldo_repo.listar_todos(current_user.tenant_id)
    saldo_map = {(s.loja_id, s.produto_id): s.quantidade for s in saldos}

    movs_por_par: dict[tuple[UUID, UUID], list] = defaultdict(list)
    for m in movs:
        movs_por_par[(m.loja_id, m.produto_id)].append(m)

    indices_originais = {m.id: i for i, m in enumerate(movs)}
    respostas_por_id: dict[UUID, MovimentacaoEstoqueResponse] = {}

    for (loja_id, produto_id), grupo in movs_por_par.items():
        grupo_sorted = sorted(
            grupo,
            key=lambda x: indices_originais[x.id],
        )
        s_atual = saldo_map.get((loja_id, produto_id), 0)
        for mov in grupo_sorted:
            s_resultante = s_atual
            if mov.tipo == "ENTRADA":
                s_anterior = s_atual - mov.quantidade
            else:
                s_anterior = s_atual + mov.quantidade
            s_atual = s_anterior

            respostas_por_id[mov.id] = MovimentacaoEstoqueResponse(
                id=mov.id,
                loja_id=mov.loja_id,
                produto_id=mov.produto_id,
                tipo=mov.tipo,
                quantidade=mov.quantidade,
                motivo=mov.motivo,
                tenant_id=mov.tenant_id,
                data_movimentacao=mov.data_movimentacao or datetime.now(timezone.utc),
                saldo_anterior=s_anterior,
                saldo_resultante=s_resultante,
            )

    return [respostas_por_id[m.id] for m in movs if m.id in respostas_por_id]
