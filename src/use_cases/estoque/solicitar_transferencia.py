from dataclasses import dataclass
from uuid import UUID
from src.domain.entities.transferencia_estoque import TransferenciaEstoque
from src.domain.repositories.loja_repository import LojaRepository
from src.domain.repositories.produto_repository import ProdutoRepository
from src.domain.repositories.transferencia_estoque_repository import TransferenciaEstoqueRepository
from src.domain.exceptions.business import LojaNaoEncontradaException, ProdutoNaoEncontradoException

@dataclass(frozen=True)
class SolicitarTransferenciaInput:
    loja_origem_id: UUID
    loja_destino_id: UUID
    produto_id: UUID
    quantidade: int
    solicitado_por_id: UUID
    tenant_id: UUID

class SolicitarTransferencia:
    """
    Caso de Uso: Criar uma solicitação de transferência de estoque entre duas filiais.
    """
    def __init__(
        self,
        loja_repo: LojaRepository,
        produto_repo: ProdutoRepository,
        transferencia_repo: TransferenciaEstoqueRepository
    ) -> None:
        self.loja_repo = loja_repo
        self.produto_repo = produto_repo
        self.transferencia_repo = transferencia_repo

    def executar(self, input_data: SolicitarTransferenciaInput) -> TransferenciaEstoque:
        # 1. Valida Loja Origem (BOLA)
        loja_origem = self.loja_repo.obter_por_id(input_data.loja_origem_id, input_data.tenant_id)
        if not loja_origem:
            raise LojaNaoEncontradaException(str(input_data.loja_origem_id))
        if not loja_origem.ativo:
            raise ValueError("A loja de origem está inativa.")

        # 2. Valida Loja Destino (BOLA)
        loja_destino = self.loja_repo.obter_por_id(input_data.loja_destino_id, input_data.tenant_id)
        if not loja_destino:
            raise LojaNaoEncontradaException(str(input_data.loja_destino_id))
        if not loja_destino.ativo:
            raise ValueError("A loja de destino está inativa.")

        # 3. Valida Produto (BOLA)
        produto = self.produto_repo.obter_por_id(input_data.produto_id, input_data.tenant_id)
        if not produto:
            raise ProdutoNaoEncontradoException(str(input_data.produto_id))
        if not produto.ativo:
            raise ValueError("O produto informado está inativo.")

        # 4. Cria e persiste a transferência no status inicial SOLICITADO
        transferencia = TransferenciaEstoque(
            loja_origem_id=input_data.loja_origem_id,
            loja_destino_id=input_data.loja_destino_id,
            produto_id=input_data.produto_id,
            quantidade=input_data.quantidade,
            solicitado_por_id=input_data.solicitado_por_id,
            tenant_id=input_data.tenant_id,
            status="SOLICITADO"
        )
        return self.transferencia_repo.salvar(transferencia)
