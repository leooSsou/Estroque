from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    ClienteNaoEncontradoException,
    EstoqueInsuficienteException,
    LimiteCreditoExcedidoException,
    LojaNaoEncontradaException,
    ProdutoNaoEncontradoException,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioClienteSQLAlchemy,
    RepositorioDevolucaoSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioFinanceiroLancamentoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioVendaSQLAlchemy,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.web.authorization import exigir_acesso_loja
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.schemas import (
    DevolucaoResponse,
    RegistrarDevolucaoRequest,
    RegistrarVendaRequest,
    VendaResponse,
)
from src.use_cases.estoque.estornar_venda import EstornarVenda, EstornarVendaInput
from src.use_cases.estoque.registrar_devolucao import (
    ItemDevolucaoInput,
    RegistrarDevolucao,
    RegistrarDevolucaoInput,
)
from src.use_cases.estoque.registrar_venda import (
    RegistrarVendaAdministrativa,
    RegistrarVendaAdministrativaInput,
    RegistrarVendaItemInput,
    RegistrarVendaPagamentoInput,
)

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

    pagamentos_input = (
        [RegistrarVendaPagamentoInput(forma_pagamento=p.forma_pagamento, valor=p.valor) for p in request.pagamentos]
        if request.pagamentos
        else None
    )

    input_data = RegistrarVendaAdministrativaInput(
        loja_id=request.loja_id,
        usuario_id=current_user.id,
        cliente_id=request.cliente_id,
        forma_pagamento=request.forma_pagamento,
        desconto=request.desconto,
        itens=itens_input,
        tenant_id=current_user.tenant_id,
        pagamentos=pagamentos_input,
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


@router.get("", response_model=list[VendaResponse], status_code=status.HTTP_200_OK)
def listar_vendas(
    loja_id: UUID | None = None,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> list[VendaResponse]:
    """
    Lista as vendas do tenant, com filtros opcionais de loja e período.
    """
    # Enforça restrição de gerente
    if current_user.role == "GERENTE":
        loja_id = current_user.loja_atribuida_id
    elif loja_id:
        exigir_acesso_loja(loja_id, current_user)

    venda_repo = RepositorioVendaSQLAlchemy(db)
    vendas = venda_repo.listar_todas(
        current_user.tenant_id,
        loja_id=loja_id,
        data_inicio=data_inicio,
        data_fim=data_fim
    )
    return [VendaResponse.model_validate(v) for v in vendas]


@router.post("/{id}/estornar", response_model=VendaResponse, status_code=status.HTTP_200_OK)
def estornar_venda(
    id: UUID,
    motivo: str = "Estorno no caixa",
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> VendaResponse:
    """
    Estorna uma venda realizada, cancelando o status, devolvendo produtos ao estoque
    com lock pessimista e recompondo saldo de crediário.
    """
    venda_repo = RepositorioVendaSQLAlchemy(db)
    venda = venda_repo.obter_por_id(id, current_user.tenant_id)
    if not venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada.")

    # Enforça isolamento de loja física para GERENTE
    exigir_acesso_loja(venda.loja_id, current_user)

    use_case = EstornarVenda(
        venda_repo=venda_repo,
        financeiro_repo=RepositorioFinanceiroLancamentoSQLAlchemy(db),
        cliente_repo=RepositorioClienteSQLAlchemy(db),
        saldo_repo=RepositorioEstoqueSaldoSQLAlchemy(db),
        movimentacao_repo=RepositorioEstoqueMovimentacaoSQLAlchemy(db),
    )

    try:
        resultado = use_case.executar(EstornarVendaInput(
            venda_id=id,
            tenant_id=current_user.tenant_id,
            motivo=motivo
        ))
        return VendaResponse.model_validate(resultado.venda)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{id}/devolver", response_model=DevolucaoResponse, status_code=status.HTTP_201_CREATED)
def registrar_devolucao_venda(
    id: UUID,
    request: RegistrarDevolucaoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> DevolucaoResponse:
    """
    Registra a devolução ou troca (parcial ou total) dos itens de uma venda realizada.
    Recompõe o estoque físico (se indicado), trata a resolução financeira (Vale-Crédito,
    Reembolso no Caixa ou Abatimento no Crediário) e atualiza o status da venda.
    """
    venda_repo = RepositorioVendaSQLAlchemy(db)
    venda = venda_repo.obter_por_id(id, current_user.tenant_id)
    if not venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada.")

    exigir_acesso_loja(venda.loja_id, current_user)

    use_case = RegistrarDevolucao(
        venda_repo=venda_repo,
        devolucao_repo=RepositorioDevolucaoSQLAlchemy(db),
        saldo_repo=RepositorioEstoqueSaldoSQLAlchemy(db),
        movimentacao_repo=RepositorioEstoqueMovimentacaoSQLAlchemy(db),
        cliente_repo=RepositorioClienteSQLAlchemy(db),
        financeiro_repo=RepositorioFinanceiroLancamentoSQLAlchemy(db),
    )

    itens_input = [
        ItemDevolucaoInput(
            item_venda_id=item.item_venda_id,
            quantidade=item.quantidade,
            retornar_ao_estoque=item.retornar_ao_estoque,
            condicao=item.condicao,
        )
        for item in request.itens
    ]

    try:
        resultado = use_case.executar(RegistrarDevolucaoInput(
            venda_id=id,
            usuario_id=current_user.id,
            tipo_resolucao=request.tipo_resolucao,
            motivo=request.motivo,
            itens=itens_input,
            tenant_id=current_user.tenant_id,
            tipo=request.tipo,
        ))
        return DevolucaoResponse.model_validate(resultado.devolucao)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{id}/devolucoes", response_model=list[DevolucaoResponse], status_code=status.HTTP_200_OK)
def listar_devolucoes_venda(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> list[DevolucaoResponse]:
    """
    Lista todas as devoluções e trocas realizadas para uma determinada venda.
    """
    venda_repo = RepositorioVendaSQLAlchemy(db)
    venda = venda_repo.obter_por_id(id, current_user.tenant_id)
    if not venda:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada.")

    exigir_acesso_loja(venda.loja_id, current_user)

    devolucao_repo = RepositorioDevolucaoSQLAlchemy(db)
    devolucoes = devolucao_repo.listar_por_venda(id, current_user.tenant_id)
    return [DevolucaoResponse.model_validate(d) for d in devolucoes]


@router.get("/devolucoes/todas", response_model=list[DevolucaoResponse], status_code=status.HTTP_200_OK)
def listar_todas_devolucoes(
    loja_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> list[DevolucaoResponse]:
    """
    Lista todas as devoluções do tenant, respeitando isolamento de loja física para gerentes.
    """
    if current_user.role == "GERENTE":
        loja_id = current_user.loja_atribuida_id
    elif loja_id:
        exigir_acesso_loja(loja_id, current_user)

    devolucao_repo = RepositorioDevolucaoSQLAlchemy(db)
    devolucoes = devolucao_repo.listar_por_tenant(current_user.tenant_id, loja_id=loja_id)
    return [DevolucaoResponse.model_validate(d) for d in devolucoes]
