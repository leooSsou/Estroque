from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.cliente import Cliente
from src.domain.entities.estoque_movimentacao import EstoqueMovimentacao
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.financeiro_lancamento import FinanceiroLancamento
from src.domain.entities.item_venda import ItemVenda
from src.domain.entities.venda import Venda
from src.domain.exceptions.business import (
    ClienteNaoEncontradoException,
    EstoqueInsuficienteException,
    LimiteCreditoExcedidoException,
    LojaNaoEncontradaException,
    ProdutoNaoEncontradoException,
)
from src.domain.repositories.cliente_repository import ClienteRepository
from src.domain.repositories.estoque_movimentacao_repository import (
    EstoqueMovimentacaoRepository,
)
from src.domain.repositories.estoque_saldo_repository import EstoqueSaldoRepository
from src.domain.repositories.financeiro_lancamento_repository import (
    FinanceiroLancamentoRepository,
)
from src.domain.repositories.loja_repository import LojaRepository
from src.domain.repositories.produto_repository import ProdutoRepository
from src.domain.repositories.venda_repository import VendaRepository


@dataclass(frozen=True)
class RegistrarVendaItemInput:
    produto_id: UUID
    quantidade: int

@dataclass(frozen=True)
class RegistrarVendaAdministrativaInput:
    loja_id: UUID
    usuario_id: UUID
    cliente_id: UUID | None
    forma_pagamento: str
    desconto: float
    itens: list[RegistrarVendaItemInput]
    tenant_id: UUID

@dataclass(frozen=True)
class RegistrarVendaAdministrativaOutput:
    venda: Venda

class RegistrarVendaAdministrativa:
    """
    Caso de Uso: Registrar Venda Administrativa
    Valida a loja, cliente, produtos, limites de crediário, executa lock pessimista nos saldos
    de estoque, debita as quantidades físicas e gera movimentações de saída.
    """
    def __init__(
        self,
        venda_repo: VendaRepository,
        financeiro_repo: FinanceiroLancamentoRepository,
        loja_repo: LojaRepository,
        cliente_repo: ClienteRepository,
        produto_repo: ProdutoRepository,
        saldo_repo: EstoqueSaldoRepository,
        movimentacao_repo: EstoqueMovimentacaoRepository,
    ) -> None:
        self.venda_repo = venda_repo
        self.financeiro_repo = financeiro_repo
        self.loja_repo = loja_repo
        self.cliente_repo = cliente_repo
        self.produto_repo = produto_repo
        self.saldo_repo = saldo_repo
        self.movimentacao_repo = movimentacao_repo

    def executar(self, input_data: RegistrarVendaAdministrativaInput) -> RegistrarVendaAdministrativaOutput:
        # 1. Valida Loja (BOLA)
        loja = self.loja_repo.obter_por_id(input_data.loja_id, input_data.tenant_id)
        if not loja:
            raise LojaNaoEncontradaException(str(input_data.loja_id))

        # 2. Pré-carrega e valida os produtos da venda
        itens_venda = []
        valor_total_bruto = 0.0

        for item_input in input_data.itens:
            produto = self.produto_repo.obter_por_id(item_input.produto_id, input_data.tenant_id)
            if not produto or not produto.ativo:
                raise ProdutoNaoEncontradoException(str(item_input.produto_id))
            
            subtotal = produto.preco_venda * item_input.quantidade
            valor_total_bruto += subtotal
            
            itens_venda.append(
                ItemVenda(
                    produto_id=item_input.produto_id,
                    quantidade=item_input.quantidade,
                    preco_unitario=produto.preco_venda,
                    tenant_id=input_data.tenant_id
                )
            )

        # 3. Calcula total líquido
        valor_total_liquido = valor_total_bruto - input_data.desconto
        if valor_total_liquido < 0:
            raise ValueError("O desconto não pode ser maior que o valor total bruto dos produtos.")

        # 4. Se for crediário, valida o cliente e o limite de crédito
        if input_data.forma_pagamento == "CREDIARIO":
            if not input_data.cliente_id:
                raise ValueError("O cliente_id é obrigatório para vendas realizadas no crediário.")
            
            cliente = self.cliente_repo.obter_por_id(input_data.cliente_id, input_data.tenant_id)
            if not cliente or not cliente.ativo:
                raise ClienteNaoEncontradoException(str(input_data.cliente_id))

            novo_saldo_devedor = cliente.saldo_devedor_crediario + valor_total_liquido
            if novo_saldo_devedor > cliente.limite_credito:
                raise LimiteCreditoExcedidoException(
                    cliente_id=str(cliente.id),
                    limite=cliente.limite_credito,
                    saldo_atual=cliente.saldo_devedor_crediario,
                    solicitado=valor_total_liquido
                )

            # Atualiza saldo devedor do cliente
            cliente_atualizado = Cliente(
                id=cliente.id,
                nome=cliente.nome,
                email=cliente.email,
                documento=cliente.documento,
                tenant_id=cliente.tenant_id,
                ativo=cliente.ativo,
                limite_credito=cliente.limite_credito,
                saldo_devedor_crediario=novo_saldo_devedor
            )
            self.cliente_repo.salvar(cliente_atualizado)

        # 5. Lock pessimista nos saldos de estoque e débito
        for item_input in input_data.itens:
            saldo = self.saldo_repo.obter_por_loja_e_produto_com_lock(
                input_data.loja_id, item_input.produto_id, input_data.tenant_id
            )
            disponivel = saldo.quantidade if saldo else 0
            
            if disponivel < item_input.quantidade:
                raise EstoqueInsuficienteException(
                    produto_id=str(item_input.produto_id),
                    loja_id=str(input_data.loja_id),
                    disponivel=disponivel,
                    solicitado=item_input.quantidade
                )
            
            nova_quantidade = disponivel - item_input.quantidade
            
            if saldo:
                saldo_atualizado = EstoqueSaldo(
                    id=saldo.id,
                    loja_id=saldo.loja_id,
                    produto_id=saldo.produto_id,
                    quantidade=nova_quantidade,
                    tenant_id=saldo.tenant_id
                )
            else:
                saldo_atualizado = EstoqueSaldo(
                    loja_id=input_data.loja_id,
                    produto_id=item_input.produto_id,
                    quantidade=nova_quantidade,
                    tenant_id=input_data.tenant_id
                )
            self.saldo_repo.salvar(saldo_atualizado)

            # Registra movimentação de saída no ledger
            mov = EstoqueMovimentacao(
                loja_id=input_data.loja_id,
                produto_id=item_input.produto_id,
                tipo="SAIDA",
                quantidade=item_input.quantidade,
                motivo="Venda administrativa",
                tenant_id=input_data.tenant_id
            )
            self.movimentacao_repo.salvar(mov)

        # 6. Salva a Venda
        # Para vendas no crediário, o status inicial é PENDENTE. Para as demais formas, é PAGO.
        status_inicial = "PENDENTE" if input_data.forma_pagamento == "CREDIARIO" else "PAGO"
        
        venda = Venda(
            loja_id=input_data.loja_id,
            usuario_id=input_data.usuario_id,
            cliente_id=input_data.cliente_id,
            status=status_inicial,
            forma_pagamento=input_data.forma_pagamento,
            valor_total=valor_total_liquido,
            desconto=input_data.desconto,
            tenant_id=input_data.tenant_id,
            itens=itens_venda
        )
        venda_salva = self.venda_repo.salvar(venda)

        # 7. Registra Lançamento Financeiro Automático (RECEITA)
        status_pagamento = "PENDENTE" if venda_salva.status == "PENDENTE" else "PAGO"
        lancamento = FinanceiroLancamento(
            loja_id=venda_salva.loja_id,
            tipo="RECEITA",
            valor=venda_salva.valor_total,
            categoria="Venda de Produtos",
            status_pagamento=status_pagamento,
            tenant_id=venda_salva.tenant_id,
            data_lancamento=venda_salva.data_venda,
            data_pagamento=venda_salva.data_venda if status_pagamento == "PAGO" else None
        )
        self.financeiro_repo.salvar(lancamento)
        
        return RegistrarVendaAdministrativaOutput(venda=venda_salva)
