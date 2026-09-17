from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.cliente import Cliente
from src.domain.entities.estoque_movimentacao import EstoqueMovimentacao
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.financeiro_lancamento import FinanceiroLancamento
from src.domain.entities.venda import Venda
from src.domain.repositories.cliente_repository import ClienteRepository
from src.domain.repositories.estoque_movimentacao_repository import EstoqueMovimentacaoRepository
from src.domain.repositories.estoque_saldo_repository import EstoqueSaldoRepository
from src.domain.repositories.financeiro_lancamento_repository import FinanceiroLancamentoRepository
from src.domain.repositories.venda_repository import VendaRepository


@dataclass(frozen=True)
class EstornarVendaInput:
    venda_id: UUID
    tenant_id: UUID
    motivo: str = "Estorno solicitado pelo operador de caixa"


@dataclass(frozen=True)
class EstornarVendaOutput:
    venda: Venda
    mensagem: str


class EstornarVenda:
    """
    Caso de Uso: Estornar Venda PDV
    Reverte a venda, cancela seu status, devolve os produtos ao estoque da filial
    com lock pessimista, recompõe o limite do crediário e registra compensação financeira.
    """
    def __init__(
        self,
        venda_repo: VendaRepository,
        financeiro_repo: FinanceiroLancamentoRepository,
        cliente_repo: ClienteRepository,
        saldo_repo: EstoqueSaldoRepository,
        movimentacao_repo: EstoqueMovimentacaoRepository,
    ) -> None:
        self.venda_repo = venda_repo
        self.financeiro_repo = financeiro_repo
        self.cliente_repo = cliente_repo
        self.saldo_repo = saldo_repo
        self.movimentacao_repo = movimentacao_repo

    def executar(self, input_data: EstornarVendaInput) -> EstornarVendaOutput:
        venda = self.venda_repo.obter_por_id(input_data.venda_id, input_data.tenant_id)
        if not venda:
            raise ValueError(f"Venda com ID {input_data.venda_id} não encontrada.")

        if venda.status in ("CANCELADA", "ESTORNADA"):
            raise ValueError(f"A venda #{venda.id} já se encontra {venda.status}.")

        # 1. Devolve os produtos ao estoque com lock pessimista
        for item in venda.itens:
            saldo = self.saldo_repo.obter_por_loja_e_produto_com_lock(
                venda.loja_id, item.produto_id, input_data.tenant_id
            )
            disponivel = saldo.quantidade if saldo else 0
            nova_quantidade = disponivel + item.quantidade

            if saldo:
                saldo_atualizado = EstoqueSaldo(
                    id=saldo.id,
                    loja_id=saldo.loja_id,
                    produto_id=saldo.produto_id,
                    quantidade=nova_quantidade,
                    tenant_id=saldo.tenant_id,
                )
            else:
                saldo_atualizado = EstoqueSaldo(
                    loja_id=venda.loja_id,
                    produto_id=item.produto_id,
                    quantidade=nova_quantidade,
                    tenant_id=input_data.tenant_id,
                )
            self.saldo_repo.salvar(saldo_atualizado)

            # Registra movimentação de ENTRADA por estorno no ledger
            mov = EstoqueMovimentacao(
                loja_id=venda.loja_id,
                produto_id=item.produto_id,
                tipo="ENTRADA",
                quantidade=item.quantidade,
                motivo=f"Estorno da Venda #{str(venda.id)[:8]}: {input_data.motivo}",
                tenant_id=input_data.tenant_id,
            )
            self.movimentacao_repo.salvar(mov)

        # 2. Se for crediário, recompõe o saldo devedor do cliente
        if venda.forma_pagamento == "CREDIARIO" and venda.cliente_id:
            cliente = self.cliente_repo.obter_por_id(venda.cliente_id, input_data.tenant_id)
            if cliente:
                novo_saldo_devedor = max(0.0, cliente.saldo_devedor_crediario - venda.valor_total)
                cliente_atualizado = Cliente(
                    id=cliente.id,
                    nome=cliente.nome,
                    email=cliente.email,
                    documento=cliente.documento,
                    tenant_id=cliente.tenant_id,
                    ativo=cliente.ativo,
                    limite_credito=cliente.limite_credito,
                    saldo_devedor_crediario=novo_saldo_devedor,
                )
                self.cliente_repo.salvar(cliente_atualizado)

        # 3. Atualiza status da venda para CANCELADA
        venda_estornada = Venda(
            id=venda.id,
            loja_id=venda.loja_id,
            usuario_id=venda.usuario_id,
            cliente_id=venda.cliente_id,
            status="CANCELADA",
            forma_pagamento=venda.forma_pagamento,
            valor_total=venda.valor_total,
            desconto=venda.desconto,
            tenant_id=venda.tenant_id,
            data_venda=venda.data_venda,
            itens=venda.itens,
        )
        venda_salva = self.venda_repo.salvar(venda_estornada)

        # 4. Registra compensação financeira (DESPESA de estorno)
        lancamento = FinanceiroLancamento(
            loja_id=venda.loja_id,
            tipo="DESPESA",
            valor=venda.valor_total,
            categoria="Estorno de Venda PDV",
            status_pagamento="PAGO",
            tenant_id=input_data.tenant_id,
        )
        self.financeiro_repo.salvar(lancamento)

        return EstornarVendaOutput(
            venda=venda_salva,
            mensagem="Venda estornada com sucesso e estoque restituído.",
        )
