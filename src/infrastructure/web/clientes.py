from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    ClienteNaoEncontradoException,
    DocumentoClienteEmUsoException,
    DomainException,
    LojaNaoEncontradaException,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioClienteSQLAlchemy,
    RepositorioFinanceiroLancamentoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.web.authorization import exigir_acesso_loja, verificar_modulo_ativo
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.idempotency import (
    processar_idempotencia_antes,
    salvar_idempotencia_depois,
)
from src.infrastructure.web.schemas import (
    ClienteCreateRequest,
    ClienteResponse,
    ClienteUpdateRequest,
    ReceberCrediarioRequest,
)
from src.use_cases.catalogo.gerenciar_cliente import (
    AtualizarCliente,
    AtualizarClienteInput,
    CriarCliente,
    CriarClienteInput,
    ListarClientes,
    ObterCliente,
    ReceberCrediarioCliente,
    ReceberCrediarioInput,
)

router = APIRouter(
    prefix="/clientes",
    tags=["Clientes"],
    dependencies=[Depends(verificar_modulo_ativo("contatos"))],
)

@router.post("/", response_model=ClienteResponse, status_code=status.HTTP_201_CREATED)
def criar_cliente(
    request: ClienteCreateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ClienteResponse:
    """
    Cadastra um novo Cliente vinculado ao Tenant do usuário logado.
    """
    repo = RepositorioClienteSQLAlchemy(db)
    use_case = CriarCliente(repo)
    
    input_data = CriarClienteInput(
        nome=request.nome,
        email=request.email,
        documento=request.documento,
        tenant_id=current_user.tenant_id,
        limite_credito=request.limite_credito
    )
    
    try:
        output = use_case.executar(input_data)
        return ClienteResponse.model_validate(output.cliente)
    except DocumentoClienteEmUsoException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/", response_model=list[ClienteResponse])
def listar_clientes(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> list[ClienteResponse]:
    """
    Retorna a lista de clientes cadastrados para o Tenant ativo.
    """
    repo = RepositorioClienteSQLAlchemy(db)
    use_case = ListarClientes(repo)
    
    output = use_case.executar(tenant_id=current_user.tenant_id)
    return [ClienteResponse.model_validate(c) for c in output.clientes]


@router.get("/{cliente_id}", response_model=ClienteResponse)
def obter_cliente(
    cliente_id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ClienteResponse:
    """
    Busca um cliente específico pelo ID respeitando o isolamento do Tenant.
    """
    repo = RepositorioClienteSQLAlchemy(db)
    use_case = ObterCliente(repo)
    
    try:
        output = use_case.executar(cliente_id=cliente_id, tenant_id=current_user.tenant_id)
        return ClienteResponse.model_validate(output.cliente)
    except ClienteNaoEncontradoException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{cliente_id}", response_model=ClienteResponse)
def atualizar_cliente(
    cliente_id: UUID,
    request: ClienteUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ClienteResponse:
    """
    Atualiza dados de um cliente existente (documento e tenant imutáveis).
    Saldos de crediário e crédito em loja são geridos estritamente por operações fiscais/financeiras.
    Alteração de limite de crédito é restrita a DONO e ADMIN_SAAS.
    """
    repo = RepositorioClienteSQLAlchemy(db)
    cliente_existente = repo.obter_por_id(cliente_id, current_user.tenant_id)

    # SEC-05: Apenas DONO ou ADMIN_SAAS podem alterar limite de crédito
    if cliente_existente:
        if request.limite_credito != cliente_existente.limite_credito and current_user.role not in {"DONO", "ADMIN_SAAS"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Acesso negado: Apenas o proprietário (DONO) pode alterar o limite de crédito de clientes.",
            )
        saldo_devedor = cliente_existente.saldo_devedor_crediario
        credito_loja = cliente_existente.credito_loja
    else:
        saldo_devedor = 0.0
        credito_loja = 0.0

    use_case = AtualizarCliente(repo)

    # Saldos financeiros permanecem protegidos pelo servidor
    input_data = AtualizarClienteInput(
        id=cliente_id,
        nome=request.nome,
        email=request.email,
        ativo=request.ativo,
        tenant_id=current_user.tenant_id,
        limite_credito=request.limite_credito,
        saldo_devedor_crediario=saldo_devedor,
        credito_loja=credito_loja,
    )

    try:
        output = use_case.executar(input_data)
        return ClienteResponse.model_validate(output.cliente)
    except ClienteNaoEncontradoException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.post("/{cliente_id}/receber-crediario", response_model=ClienteResponse, status_code=status.HTTP_200_OK)
def receber_crediario(
    cliente_id: UUID,
    request: ReceberCrediarioRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
) -> ClienteResponse:
    """
    Registra o recebimento (total ou parcial) do saldo devedor de crediário de um cliente
    e lança automaticamente a receita paga no caixa da loja informada.
    Suporta repetição idempotente segura via header 'Idempotency-Key'.
    """
    exigir_acesso_loja(request.loja_id, current_user)

    corpo_dict = {"cliente_id": str(cliente_id), **request.model_dump(mode="json")}
    cache_response = processar_idempotencia_antes(
        db=db,
        tenant_id=current_user.tenant_id,
        rota=f"/clientes/{cliente_id}/receber-crediario",
        chave=idempotency_key,
        corpo_requisicao=corpo_dict,
    )
    if cache_response is not None:
        return ClienteResponse.model_validate(cache_response)

    cliente_repo = RepositorioClienteSQLAlchemy(db)
    financeiro_repo = RepositorioFinanceiroLancamentoSQLAlchemy(db)
    loja_repo = RepositorioLojaSQLAlchemy(db)

    use_case = ReceberCrediarioCliente(
        cliente_repo=cliente_repo,
        financeiro_repo=financeiro_repo,
        loja_repo=loja_repo,
    )

    input_data = ReceberCrediarioInput(
        cliente_id=cliente_id,
        loja_id=request.loja_id,
        valor=request.valor,
        tenant_id=current_user.tenant_id,
    )

    try:
        output = use_case.executar(input_data)
        response_data = ClienteResponse.model_validate(output.cliente).model_dump(mode="json")
        salvar_idempotencia_depois(
            db=db,
            tenant_id=current_user.tenant_id,
            rota=f"/clientes/{cliente_id}/receber-crediario",
            chave=idempotency_key,
            corpo_requisicao=corpo_dict,
            status_code=status.HTTP_200_OK,
            response_body=response_data,
        )
        return ClienteResponse.model_validate(response_data)
    except (ClienteNaoEncontradoException, LojaNaoEncontradaException) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except DomainException as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

