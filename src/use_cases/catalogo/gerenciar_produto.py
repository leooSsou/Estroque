import itertools
from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.produto import Produto
from src.domain.exceptions.business import (
    ProdutoNaoEncontradoException,
    SkuProdutoEmUsoException,
)
from src.domain.repositories.estoque_saldo_repository import EstoqueSaldoRepository
from src.domain.repositories.produto_repository import ProdutoRepository


@dataclass(frozen=True)
class CriarProdutoInput:
    nome: str
    sku: str
    preco_custo: float
    preco_venda: float
    markup: float
    tenant_id: UUID
    codigo_barras: str | None = None
    fornecedor_id: UUID | None = None
    produto_pai_id: UUID | None = None
    variacoes: dict[str, str] | None = None


@dataclass(frozen=True)
class CriarProdutoOutput:
    produto: Produto


class CriarProduto:
    """
    Caso de Uso: Criar um novo Produto no catálogo.
    """
    def __init__(self, produto_repo: ProdutoRepository) -> None:
        self.produto_repo = produto_repo

    def executar(self, input_data: CriarProdutoInput) -> CriarProdutoOutput:
        # 1. Verifica se já existe outro produto com o mesmo SKU para o tenant
        produto_existente = self.produto_repo.obter_por_sku(input_data.sku, input_data.tenant_id)
        if produto_existente:
            raise SkuProdutoEmUsoException(input_data.sku)

        # 2. Instancia a entidade de domínio Produto
        produto = Produto(
            nome=input_data.nome,
            sku=input_data.sku,
            preco_custo=input_data.preco_custo,
            preco_venda=input_data.preco_venda,
            markup=input_data.markup,
            tenant_id=input_data.tenant_id,
            codigo_barras=input_data.codigo_barras,
            fornecedor_id=input_data.fornecedor_id,
            produto_pai_id=input_data.produto_pai_id,
            variacoes=input_data.variacoes
        )

        # 3. Salva no banco
        produto_salvo = self.produto_repo.salvar(produto)

        return CriarProdutoOutput(produto=produto_salvo)


@dataclass(frozen=True)
class ObterProdutoOutput:
    produto: Produto


class ObterProduto:
    """
    Caso de Uso: Obter detalhes de um Produto pelo ID.
    """
    def __init__(self, produto_repo: ProdutoRepository) -> None:
        self.produto_repo = produto_repo

    def executar(self, produto_id: UUID, tenant_id: UUID) -> ObterProdutoOutput:
        produto = self.produto_repo.obter_por_id(produto_id, tenant_id)
        if not produto:
            raise ProdutoNaoEncontradoException(str(produto_id))

        return ObterProdutoOutput(produto=produto)


@dataclass(frozen=True)
class ListarProdutosOutput:
    produtos: list[Produto]


class ListarProdutos:
    """
    Caso de Uso: Listar todos os Produtos de um Tenant (com suporte a busca textual por nome, SKU ou código de barras).
    """
    def __init__(self, produto_repo: ProdutoRepository) -> None:
        self.produto_repo = produto_repo

    def executar(
        self,
        tenant_id: UUID,
        termo_busca: str | None = None,
        apenas_pais: bool = False
    ) -> ListarProdutosOutput:
        if apenas_pais:
            produtos = self.produto_repo.listar_pais(tenant_id, termo=termo_busca)
        else:
            produtos = self.produto_repo.listar_todos(tenant_id, termo=termo_busca)
        return ListarProdutosOutput(produtos=produtos)


@dataclass(frozen=True)
class AtualizarProdutoInput:
    id: UUID
    nome: str
    preco_custo: float
    preco_venda: float
    markup: float
    ativo: bool
    tenant_id: UUID
    codigo_barras: str | None = None
    fornecedor_id: UUID | None = None
    variacoes: dict[str, str] | None = None


@dataclass(frozen=True)
class AtualizarProdutoOutput:
    produto: Produto


class AtualizarProduto:
    """
    Caso de Uso: Atualizar dados de um Produto.
    """
    def __init__(self, produto_repo: ProdutoRepository) -> None:
        self.produto_repo = produto_repo

    def executar(self, input_data: AtualizarProdutoInput) -> AtualizarProdutoOutput:
        # 1. Recupera o produto existente
        produto = self.produto_repo.obter_por_id(input_data.id, input_data.tenant_id)
        if not produto:
            raise ProdutoNaoEncontradoException(str(input_data.id))

        # 2. Cria nova instância (SKU e Tenant permanecem imutáveis)
        produto_atualizado = Produto(
            nome=input_data.nome,
            sku=produto.sku,
            preco_custo=input_data.preco_custo,
            preco_venda=input_data.preco_venda,
            markup=input_data.markup,
            tenant_id=produto.tenant_id,
            codigo_barras=input_data.codigo_barras if input_data.codigo_barras is not None else produto.codigo_barras,
            fornecedor_id=input_data.fornecedor_id if input_data.fornecedor_id is not None else produto.fornecedor_id,
            produto_pai_id=produto.produto_pai_id,
            variacoes=input_data.variacoes if input_data.variacoes is not None else produto.variacoes,
            id=produto.id,
            ativo=input_data.ativo
        )

        # 3. Salva no banco
        produto_salvo = self.produto_repo.salvar(produto_atualizado)

        return AtualizarProdutoOutput(produto=produto_salvo)


@dataclass(frozen=True)
class AtributoGradeInput:
    nome: str
    valores: list[str]


@dataclass(frozen=True)
class CriarProdutoComGradeInput:
    nome: str
    sku_base: str
    preco_custo: float
    preco_venda: float
    markup: float
    tenant_id: UUID
    atributos: list[AtributoGradeInput]
    fornecedor_id: UUID | None = None
    codigo_barras_base: str | None = None
    loja_id: UUID | None = None
    estoque_inicial_por_variacao: int = 0


@dataclass(frozen=True)
class CriarProdutoComGradeOutput:
    produto_pai: Produto
    variacoes: list[Produto]


class CriarProdutoComGrade:
    """
    Caso de Uso: Criar um Produto Pai e gerar em lote todas as variações através
    do produto cartesiano dos atributos (Tamanho, Cor, Voltagem, etc.).
    """
    def __init__(
        self,
        produto_repo: ProdutoRepository,
        saldo_repo: EstoqueSaldoRepository | None = None
    ) -> None:
        self.produto_repo = produto_repo
        self.saldo_repo = saldo_repo

    def executar(self, input_data: CriarProdutoComGradeInput) -> CriarProdutoComGradeOutput:
        # 1. Validação básica dos atributos
        if not input_data.atributos or len(input_data.atributos) == 0:
            raise ValueError("Ao menos um atributo de grade deve ser informado.")

        atributos_limpos = []
        for a in input_data.atributos:
            nome_attr = a.nome.strip()
            valores_attr = [v.strip() for v in a.valores if isinstance(v, str) and v.strip()]
            if not nome_attr or not valores_attr:
                raise ValueError(f"Atributo '{a.nome}' deve possuir nome e pelo menos um valor válido.")
            atributos_limpos.append((nome_attr, valores_attr))

        # 2. Verifica se SKU base já existe
        sku_base = input_data.sku_base.strip().upper()
        if self.produto_repo.obter_por_sku(sku_base, input_data.tenant_id):
            raise SkuProdutoEmUsoException(sku_base)

        # 3. Produto cartesiano das variações
        listas_de_pares = [[(nome_a, val) for val in vals] for nome_a, vals in atributos_limpos]
        combinacoes = list(itertools.product(*listas_de_pares))

        if len(combinacoes) > 100:
            raise ValueError("O número total de variações geradas não pode exceder 100.")
        if len(combinacoes) == 0:
            raise ValueError("Nenhuma variação válida pôde ser gerada a partir dos atributos informados.")

        # 4. Verifica unicidade dos SKUs filhos calculados
        filhos_a_criar = []
        for idx, combo in enumerate(combinacoes, start=1):
            variacoes_dict = {attr_n: val for attr_n, val in combo}
            desc_str = " / ".join([val for _, val in combo])
            values_slug = "-".join([val.upper().replace(" ", "") for _, val in combo])
            sku_filho = f"{sku_base}-{values_slug}"

            if self.produto_repo.obter_por_sku(sku_filho, input_data.tenant_id):
                raise SkuProdutoEmUsoException(sku_filho)

            barcode_filho = (
                f"{input_data.codigo_barras_base}-{idx}"
                if input_data.codigo_barras_base
                else None
            )

            filhos_a_criar.append((sku_filho, desc_str, variacoes_dict, barcode_filho))

        # 5. Salva produto pai
        produto_pai = Produto(
            nome=input_data.nome.strip(),
            sku=sku_base,
            preco_custo=input_data.preco_custo,
            preco_venda=input_data.preco_venda,
            markup=input_data.markup,
            tenant_id=input_data.tenant_id,
            codigo_barras=input_data.codigo_barras_base,
            fornecedor_id=input_data.fornecedor_id,
            produto_pai_id=None,
            variacoes=None
        )
        pai_salvo = self.produto_repo.salvar(produto_pai)

        # 6. Salva filhos
        entidades_filhos = [
            Produto(
                nome=f"{input_data.nome.strip()} - {desc_str}",
                sku=sku_f,
                preco_custo=input_data.preco_custo,
                preco_venda=input_data.preco_venda,
                markup=input_data.markup,
                tenant_id=input_data.tenant_id,
                codigo_barras=barcode_f,
                fornecedor_id=input_data.fornecedor_id,
                produto_pai_id=pai_salvo.id,
                variacoes=var_dict
            )
            for sku_f, desc_str, var_dict, barcode_f in filhos_a_criar
        ]
        filhos_salvos = self.produto_repo.salvar_em_lote(entidades_filhos)

        # 7. Inicializa estoque nas variações se solicitado
        if (
            self.saldo_repo is not None
            and input_data.loja_id is not None
            and input_data.estoque_inicial_por_variacao > 0
        ):
            for f in filhos_salvos:
                saldo = EstoqueSaldo(
                    loja_id=input_data.loja_id,
                    produto_id=f.id,
                    tenant_id=input_data.tenant_id,
                    quantidade=input_data.estoque_inicial_por_variacao
                )
                self.saldo_repo.salvar(saldo)

        return CriarProdutoComGradeOutput(produto_pai=pai_salvo, variacoes=filhos_salvos)


@dataclass(frozen=True)
class AdicionarVariacaoInput:
    produto_pai_id: UUID
    tenant_id: UUID
    variacoes: dict[str, str]
    sku: str | None = None
    codigo_barras: str | None = None
    preco_custo: float | None = None
    preco_venda: float | None = None
    markup: float | None = None


@dataclass(frozen=True)
class AdicionarVariacaoOutput:
    variacao: Produto


class AdicionarVariacao:
    """
    Caso de Uso: Adiciona uma variação individual a um produto pai existente.
    """
    def __init__(self, produto_repo: ProdutoRepository) -> None:
        self.produto_repo = produto_repo

    def executar(self, input_data: AdicionarVariacaoInput) -> AdicionarVariacaoOutput:
        pai = self.produto_repo.obter_por_id(input_data.produto_pai_id, input_data.tenant_id)
        if not pai:
            raise ProdutoNaoEncontradoException(str(input_data.produto_pai_id))
        if pai.produto_pai_id is not None:
            raise ValueError("Não é permitido adicionar uma variação a outro produto que já seja variação.")

        if not input_data.variacoes or not isinstance(input_data.variacoes, dict):
            raise ValueError("As variações devem ser um dicionário não vazio de atributos.")

        desc_str = " / ".join([str(v) for v in input_data.variacoes.values()])
        values_slug = "-".join([str(v).upper().replace(" ", "") for v in input_data.variacoes.values()])
        sku = input_data.sku or f"{pai.sku}-{values_slug}"

        if self.produto_repo.obter_por_sku(sku, input_data.tenant_id):
            raise SkuProdutoEmUsoException(sku)

        custo = input_data.preco_custo if input_data.preco_custo is not None else pai.preco_custo
        venda = input_data.preco_venda if input_data.preco_venda is not None else pai.preco_venda
        markup = input_data.markup if input_data.markup is not None else pai.markup

        variacao = Produto(
            nome=f"{pai.nome} - {desc_str}",
            sku=sku,
            preco_custo=custo,
            preco_venda=venda,
            markup=markup,
            tenant_id=input_data.tenant_id,
            codigo_barras=input_data.codigo_barras,
            fornecedor_id=pai.fornecedor_id,
            produto_pai_id=pai.id,
            variacoes=input_data.variacoes
        )

        variacao_salva = self.produto_repo.salvar(variacao)
        return AdicionarVariacaoOutput(variacao=variacao_salva)


@dataclass(frozen=True)
class ListarVariacoesProdutoOutput:
    variacoes: list[Produto]


class ListarVariacoesProduto:
    """
    Caso de Uso: Listar variações vinculadas a um produto pai.
    """
    def __init__(self, produto_repo: ProdutoRepository) -> None:
        self.produto_repo = produto_repo

    def executar(self, produto_pai_id: UUID, tenant_id: UUID) -> ListarVariacoesProdutoOutput:
        variacoes = self.produto_repo.listar_variacoes(produto_pai_id, tenant_id)
        return ListarVariacoesProdutoOutput(variacoes=variacoes)

