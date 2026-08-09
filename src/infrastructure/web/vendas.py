from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List, Optional

from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user
from src.domain.entities.usuario import Usuario
from src.infrastructure.web.schemas import RegistrarVendaRequest, VendaResponse
from src.use_cases.estoque.registrar_venda import (
    RegistrarVendaAdministrativa,
    RegistrarVendaAdministrativaInput,
    RegistrarVendaItemInput,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioVendaSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioClienteSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioFinanceiroLancamentoSQLAlchemy,
)
from src.domain.exceptions.business import (
    LojaNaoEncontradaException,
    ClienteNaoEncontradoException,
    ProdutoNaoEncontradoException,
    EstoqueInsuficienteException,
    LimiteCreditoExcedidoException,
)
from src.infrastructure.web.authorization import exigir_acesso_loja

router = APIRouter(
    prefix="/vendas",
    tags=["Vendas Administrativas"]
)

@router.post("", response_model=VendaResponse, status_code=status.HTTP_201_CREATED)
def registrar_venda(
    request: RegistrarVendaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> VendaResponse:
    """
    Registra uma nova venda administrativa na loja física do tenant.
    Deduz estoque físico e valida limites de crédito/crediário.
    """
    # Enforça isolamento de loja física para GERENTE
    exigir_acesso_loja(request.loja_id, current_user)

    venda_repo = RepositorioVendaSQLAlchemy(db)
    financeiro_repo = RepositorioFinanceiroLancamentoSQLAlchemy(db)
    loja_repo = RepositorioLojaSQLAlchemy(db)
    cliente_repo = RepositorioClienteSQLAlchemy(db)
    produto_repo = RepositorioProdutoSQLAlchemy(db)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    mov_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db)

    use_case = RegistrarVendaAdministrativa(
        venda_repo=venda_repo,
        financeiro_repo=financeiro_repo,
        loja_repo=loja_repo,
        cliente_repo=cliente_repo,
        produto_repo=produto_repo,
        saldo_repo=saldo_repo,
        movimentacao_repo=mov_repo
    )

    itens_input = [
        RegistrarVendaItemInput(produto_id=i.produto_id, quantidade=i.quantidade)
        for i in request.itens
    ]

    input_data = RegistrarVendaAdministrativaInput(
        loja_id=request.loja_id,
        usuario_id=current_user.id,
        cliente_id=request.cliente_id,
        forma_pagamento=request.forma_pagamento,
        desconto=request.desconto,
        itens=itens_input,
        tenant_id=current_user.tenant_id
    )

    try:
        output = use_case.executar(input_data)
        return VendaResponse.model_validate(output.venda)
    except (LojaNaoEncontradaException, ClienteNaoEncontradoException, ProdutoNaoEncontradoException) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except EstoqueInsuficienteException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except LimiteCreditoExcedidoException as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("/{id}", response_model=VendaResponse, status_code=status.HTTP_200_OK)
def obter_venda_por_id(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> VendaResponse:
    """
    Obtém uma venda específica do tenant. Enforça limites de gerente.
    """
    venda_repo = RepositorioVendaSQLAlchemy(db)
    venda = venda_repo.obter_por_id(id, current_user.tenant_id)
    if not venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada.")

    # Enforça isolamento de loja física para GERENTE
    exigir_acesso_loja(venda.loja_id, current_user)

    return VendaResponse.model_validate(venda)


@router.get("", response_model=List[VendaResponse], status_code=status.HTTP_200_OK)
def listar_vendas(
    loja_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> List[VendaResponse]:
    """
    Lista as vendas do tenant, com filtros opcionais de loja.
    """
    # Enforça restrição de gerente
    if current_user.role == "GERENTE":
        loja_id = current_user.loja_atribuida_id

    venda_repo = RepositorioVendaSQLAlchemy(db)
    vendas = venda_repo.listar_todas(current_user.tenant_id, loja_id=loja_id)
    return [VendaResponse.model_validate(v) for v in vendas]
