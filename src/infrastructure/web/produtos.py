from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import (
    ProdutoNaoEncontradoException,
    SkuProdutoEmUsoException,
)
from src.infrastructure.database.repositorios_concrete import (
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.schemas import (
    AdicionarVariacaoRequest,
    ProdutoComGradeResponse,
    ProdutoCreateRequest,
    ProdutoGradeCreateRequest,
    ProdutoResponse,
    ProdutoUpdateRequest,
)
from src.use_cases.catalogo.gerenciar_produto import (
    AdicionarVariacao,
    AdicionarVariacaoInput,
    AtributoGradeInput,
    AtualizarProduto,
    AtualizarProdutoInput,
    CriarProduto,
    CriarProdutoComGrade,
    CriarProdutoComGradeInput,
    CriarProdutoInput,
    ListarProdutos,
    ListarVariacoesProduto,
    ObterProduto,
)

router = APIRouter(prefix="/produtos", tags=["Produtos"])

@router.post("/", response_model=ProdutoResponse, status_code=status.HTTP_201_CREATED)
def criar_produto(
    request: ProdutoCreateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ProdutoResponse:
    """
    Cadastra um novo Produto vinculado ao Tenant do usuário logado.
    """
    repo = RepositorioProdutoSQLAlchemy(db)
    use_case = CriarProduto(repo)
    
    input_data = CriarProdutoInput(
        nome=request.nome,
        sku=request.sku,
        preco_custo=request.preco_custo,
        preco_venda=request.preco_venda,
        markup=request.markup,
        tenant_id=current_user.tenant_id,
        codigo_barras=request.codigo_barras,
        fornecedor_id=request.fornecedor_id
    )

    
    try:
        output = use_case.executar(input_data)
        return ProdutoResponse.model_validate(output.produto)
    except SkuProdutoEmUsoException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.post("/grade", response_model=ProdutoComGradeResponse, status_code=status.HTTP_201_CREATED)
def criar_produto_com_grade(
    request: ProdutoGradeCreateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ProdutoComGradeResponse:
    """
    Cadastra um novo Produto Pai e gera automaticamente a grade de variações
    através do produto cartesiano dos atributos (Tamanho, Cor, Voltagem, etc.).
    """
    produto_repo = RepositorioProdutoSQLAlchemy(db)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    use_case = CriarProdutoComGrade(produto_repo, saldo_repo)

    atributos_input = [
        AtributoGradeInput(nome=a.nome, valores=a.valores)
        for a in request.atributos
    ]

    input_data = CriarProdutoComGradeInput(
        nome=request.nome,
        sku_base=request.sku_base,
        preco_custo=request.preco_custo,
        preco_venda=request.preco_venda,
        markup=request.markup,
        tenant_id=current_user.tenant_id,
        atributos=atributos_input,
        codigo_barras_base=request.codigo_barras_base,
        fornecedor_id=request.fornecedor_id,
        loja_id=request.loja_id,
        estoque_inicial_por_variacao=request.estoque_inicial_por_variacao
    )

    try:
        output = use_case.executar(input_data)
        return ProdutoComGradeResponse(
            produto_pai=ProdutoResponse.model_validate(output.produto_pai),
            variacoes=[ProdutoResponse.model_validate(v) for v in output.variacoes]
        )
    except SkuProdutoEmUsoException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/", response_model=list[ProdutoResponse])
def listar_produtos(
    busca: str | None = None,
    apenas_pais: bool = Query(False, description="Se True, retorna apenas produtos que não são variações filhas."),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> list[ProdutoResponse]:
    """
    Retorna a lista de produtos cadastrados para o Tenant ativo, com filtro opcional por busca (Nome, SKU, Código de Barras).
    Permite filtrar apenas produtos pais para telas de catálogo resumidas.
    """
    repo = RepositorioProdutoSQLAlchemy(db)
    use_case = ListarProdutos(repo)
    
    output = use_case.executar(
        tenant_id=current_user.tenant_id,
        termo_busca=busca,
        apenas_pais=apenas_pais
    )
    return [ProdutoResponse.model_validate(p) for p in output.produtos]


@router.get("/{produto_id}/variacoes", response_model=list[ProdutoResponse])
def listar_variacoes_do_produto(
    produto_id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> list[ProdutoResponse]:
    """
    Retorna todas as variações filhas ativas vinculadas a um produto pai específico.
    """
    repo = RepositorioProdutoSQLAlchemy(db)
    use_case = ListarVariacoesProduto(repo)
    output = use_case.executar(produto_pai_id=produto_id, tenant_id=current_user.tenant_id)
    return [ProdutoResponse.model_validate(v) for v in output.variacoes]


@router.post("/{produto_id}/variacoes", response_model=ProdutoResponse, status_code=status.HTTP_201_CREATED)
def adicionar_variacao_ao_produto(
    produto_id: UUID,
    request: AdicionarVariacaoRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ProdutoResponse:
    """
    Adiciona uma nova variação individual a um produto pai existente.
    """
    repo = RepositorioProdutoSQLAlchemy(db)
    use_case = AdicionarVariacao(repo)

    input_data = AdicionarVariacaoInput(
        produto_pai_id=produto_id,
        tenant_id=current_user.tenant_id,
        variacoes=request.variacoes,
        sku=request.sku,
        codigo_barras=request.codigo_barras,
        preco_custo=request.preco_custo,
        preco_venda=request.preco_venda,
        markup=request.markup
    )

    try:
        output = use_case.executar(input_data)
        return ProdutoResponse.model_validate(output.variacao)
    except ProdutoNaoEncontradoException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except SkuProdutoEmUsoException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )


@router.get("/{produto_id}", response_model=ProdutoResponse)
def obter_produto(
    produto_id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ProdutoResponse:
    """
    Busca um produto específico pelo ID respeitando o isolamento do Tenant.
    """
    repo = RepositorioProdutoSQLAlchemy(db)
    use_case = ObterProduto(repo)
    
    try:
        output = use_case.executar(produto_id=produto_id, tenant_id=current_user.tenant_id)
        return ProdutoResponse.model_validate(output.produto)
    except ProdutoNaoEncontradoException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/{produto_id}", response_model=ProdutoResponse)
def atualizar_produto(
    produto_id: UUID,
    request: ProdutoUpdateRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ProdutoResponse:
    """
    Atualiza dados de um produto existente (SKU e Tenant imutáveis).
    """
    repo = RepositorioProdutoSQLAlchemy(db)
    use_case = AtualizarProduto(repo)
    
    input_data = AtualizarProdutoInput(
        id=produto_id,
        nome=request.nome,
        preco_custo=request.preco_custo,
        preco_venda=request.preco_venda,
        markup=request.markup,
        codigo_barras=request.codigo_barras,
        fornecedor_id=request.fornecedor_id,
        ativo=request.ativo,
        tenant_id=current_user.tenant_id
    )

    
    try:
        output = use_case.executar(input_data)
        return ProdutoResponse.model_validate(output.produto)
    except ProdutoNaoEncontradoException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
