from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    LojaNaoEncontradaException,
    ProdutoNaoEncontradoException,
    EstoqueInsuficienteException,
    TransferenciaNaoEncontradaException,
)

from src.infrastructure.database.repositorios_concrete import (
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioTransferenciaEstoqueSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
)

from src.use_cases.estoque.solicitar_transferencia import SolicitarTransferencia, SolicitarTransferenciaInput
from src.use_cases.estoque.despachar_transferencia import DespacharTransferencia, DespacharTransferenciaInput
from src.use_cases.estoque.confirmar_recebimento import ConfirmarRecebimento, ConfirmarRecebimentoInput

from src.infrastructure.web.schemas import (
    TransferenciaEstoqueSolicitarRequest,
    TransferenciaEstoqueReceberRequest,
    TransferenciaEstoqueResponse,
)

router = APIRouter(prefix="/estoque/transferencias", tags=["Transferências de Estoque"])

@router.post("", response_model=TransferenciaEstoqueResponse, status_code=status.HTTP_201_CREATED)
def solicitar_transferencia(
    request: TransferenciaEstoqueSolicitarRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> TransferenciaEstoqueResponse:
    """
    Solicita uma nova transferência de estoque interlojas.
    """
    loja_repo = RepositorioLojaSQLAlchemy(db)
    produto_repo = RepositorioProdutoSQLAlchemy(db)
    transferencia_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db)

    from src.infrastructure.web.authorization import verificar_acesso_transferencia
    verificar_acesso_transferencia(request.loja_origem_id, request.loja_destino_id, current_user)

    use_case = SolicitarTransferencia(loja_repo, produto_repo, transferencia_repo)
    input_data = SolicitarTransferenciaInput(
        loja_origem_id=request.loja_origem_id,
        loja_destino_id=request.loja_destino_id,
        produto_id=request.produto_id,
        quantidade=request.quantidade,
        solicitado_por_id=current_user.id,
        tenant_id=current_user.tenant_id
    )

    try:
        output = use_case.executar(input_data)
        return TransferenciaEstoqueResponse.model_validate(output)
    except (LojaNaoEncontradaException, ProdutoNaoEncontradoException) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.post("/{id}/despachar", response_model=TransferenciaEstoqueResponse, status_code=status.HTTP_200_OK)
def despachar_transferencia(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> TransferenciaEstoqueResponse:
    """
    Registra o envio físico dos itens da loja de origem, debitando as quantidades do estoque.
    """
    transferencia_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    movimentacao_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db)

    transferencia = transferencia_repo.obter_por_id(id, current_user.tenant_id)
    if not transferencia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transferência não encontrada.")
    from src.infrastructure.web.authorization import verificar_acesso_transferencia
    verificar_acesso_transferencia(transferencia.loja_origem_id, transferencia.loja_destino_id, current_user)

    use_case = DespacharTransferencia(transferencia_repo, saldo_repo, movimentacao_repo)
    input_data = DespacharTransferenciaInput(
        transferencia_id=id,
        aprovado_por_id=current_user.id,
        tenant_id=current_user.tenant_id
    )

    try:
        output = use_case.executar(input_data)
        return TransferenciaEstoqueResponse.model_validate(output)
    except TransferenciaNaoEncontradaException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EstoqueInsuficienteException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.post("/{id}/receber", response_model=TransferenciaEstoqueResponse, status_code=status.HTTP_200_OK)
def confirmar_recebimento(
    id: UUID,
    request: TransferenciaEstoqueReceberRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> TransferenciaEstoqueResponse:
    """
    Confirma a chegada dos itens na loja destino, incrementando as quantidades e tratando divergências.
    """
    transferencia_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    movimentacao_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db)

    transferencia = transferencia_repo.obter_por_id(id, current_user.tenant_id)
    if not transferencia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transferência não encontrada.")
    from src.infrastructure.web.authorization import verificar_acesso_transferencia
    verificar_acesso_transferencia(transferencia.loja_origem_id, transferencia.loja_destino_id, current_user)

    use_case = ConfirmarRecebimento(transferencia_repo, saldo_repo, movimentacao_repo)
    input_data = ConfirmarRecebimentoInput(
        transferencia_id=id,
        aprovado_por_id=current_user.id,
        quantidade_recebida=request.quantidade_recebida,
        justificativa=request.justificativa,
        tenant_id=current_user.tenant_id
    )

    try:
        output = use_case.executar(input_data)
        return TransferenciaEstoqueResponse.model_validate(output)
    except TransferenciaNaoEncontradaException as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("", response_model=List[TransferenciaEstoqueResponse], status_code=status.HTTP_200_OK)
def listar_todas(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> List[TransferenciaEstoqueResponse]:
    """
    Lista todas as transferências de estoque do tenant logado.
    """
    transferencia_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db)
    results = transferencia_repo.listar_todas(current_user.tenant_id)
    if current_user.role == "GERENTE":
        results = [
            r for r in results
            if current_user.loja_atribuida_id in (r.loja_origem_id, r.loja_destino_id)
        ]
    return [TransferenciaEstoqueResponse.model_validate(r) for r in results]


@router.get("/{id}", response_model=TransferenciaEstoqueResponse, status_code=status.HTTP_200_OK)
def obter_por_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> TransferenciaEstoqueResponse:
    """
    Obtém uma transferência de estoque específica por ID.
    """
    transferencia_repo = RepositorioTransferenciaEstoqueSQLAlchemy(db)
    transferencia = transferencia_repo.obter_por_id(id, current_user.tenant_id)
    if not transferencia:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transferência não encontrada.")
    from src.infrastructure.web.authorization import verificar_acesso_transferencia
    verificar_acesso_transferencia(transferencia.loja_origem_id, transferencia.loja_destino_id, current_user)
    return TransferenciaEstoqueResponse.model_validate(transferencia)
