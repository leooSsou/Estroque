from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID

from src.domain.entities.cliente import Cliente
from src.domain.entities.devolucao import Devolucao, ItemDevolucao
from src.domain.entities.estoque_movimentacao import EstoqueMovimentacao
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.entities.financeiro_lancamento import FinanceiroLancamento
from src.domain.entities.venda import Venda
from src.domain.repositories.cliente_repository import ClienteRepository
from src.domain.repositories.devolucao_repository import DevolucaoRepository
from src.domain.repositories.estoque_movimentacao_repository import (
    EstoqueMovimentacaoRepository,
)
from src.domain.repositories.estoque_saldo_repository import EstoqueSaldoRepository
from src.domain.repositories.financeiro_lancamento_repository import (
    FinanceiroLancamentoRepository,
)
from src.domain.repositories.venda_repository import VendaRepository


@dataclass(frozen=True)
class ItemDevolucaoInput:
    item_venda_id: UUID
    quantidade: int
    retornar_ao_estoque: bool = True
    condicao: str = "PERFEITO"


@dataclass(frozen=True)
class RegistrarDevolucaoInput:
    venda_id: UUID
    usuario_id: UUID
    tipo_resolucao: str  # CREDITO_LOJA, REEMBOLSO_CAIXA, ABATIMENTO_CREDIARIO
    motivo: str
    itens: list[ItemDevolucaoInput]
    tenant_id: UUID
    tipo: str = "DEVOLUCAO"  # DEVOLUCAO ou TROCA


@dataclass(frozen=True)
class RegistrarDevolucaoOutput:
    devolucao: Devolucao
    venda: Venda
    cliente: Cliente | None = None
    mensagem: str = ""


class RegistrarDevolucao:
    """
    Caso de Uso: Registrar Devolução ou Troca Parcial de Venda
    Gerencia o retorno de itens, recomposição de estoque com lock pessimista,
    resoluções financeiras (Vale-Crédito, Reembolso ou Abatimento) e atualização
    do status da venda.
    """

    def __init__(
        self,
        venda_repo: VendaRepository,
        devolucao_repo: DevolucaoRepository,
        saldo_repo: EstoqueSaldoRepository,
        movimentacao_repo: EstoqueMovimentacaoRepository,
        cliente_repo: ClienteRepository,
        financeiro_repo: FinanceiroLancamentoRepository,
    ) -> None:
        self.venda_repo = venda_repo
        self.devolucao_repo = devolucao_repo
        self.saldo_repo = saldo_repo
        self.movimentacao_repo = movimentacao_repo
        self.cliente_repo = cliente_repo
        self.financeiro_repo = financeiro_repo

    def executar(self, input_data: RegistrarDevolucaoInput) -> RegistrarDevolucaoOutput:
        venda = self.venda_repo.obter_por_id(input_data.venda_id, input_data.tenant_id)
        if not venda:
            raise ValueError(f"Venda #{input_data.venda_id} não encontrada.")

        if venda.status in ("CANCELADA", "CANCELADO"):
            raise ValueError(f"Não é permitido realizar devoluções em uma venda {venda.status}.")

        if not input_data.itens or len(input_data.itens) == 0:
            raise ValueError("Ao menos um item deve ser selecionado para devolução.")

        mapa_itens_venda = {item.id: item for item in venda.itens}
        itens_devolucao_entidade: list[ItemDevolucao] = []

        # 1. Validação de cada item devolvido e cálculo de valores
        for item_in in input_data.itens:
            if item_in.item_venda_id not in mapa_itens_venda:
                raise ValueError(
                    f"O item de venda #{item_in.item_venda_id} não pertence à venda #{venda.id}."
                )

            item_venda = mapa_itens_venda[item_in.item_venda_id]
            ja_devolvido = self.devolucao_repo.obter_total_devolvido_por_item_venda(
                item_venda.id, input_data.tenant_id
            )
            disponivel_para_devolucao = item_venda.quantidade - ja_devolvido

            if item_in.quantidade <= 0:
                raise ValueError("A quantidade devolvida deve ser maior que zero.")

            if item_in.quantidade > disponivel_para_devolucao:
                raise ValueError(
                    f"Quantidade solicitada ({item_in.quantidade}) excede o saldo restante "
                    f"disponível para devolução ({disponivel_para_devolucao}) do produto #{item_venda.produto_id}."
                )

            valor_total_item = round(item_in.quantidade * item_venda.preco_unitario, 2)
            itens_devolucao_entidade.append(
                ItemDevolucao(
                    item_venda_id=item_venda.id,
                    produto_id=item_venda.produto_id,
                    quantidade=item_in.quantidade,
                    preco_unitario=item_venda.preco_unitario,
                    valor_total=valor_total_item,
                    retornar_ao_estoque=item_in.retornar_ao_estoque,
                    condicao=item_in.condicao,
                    tenant_id=input_data.tenant_id,
                )
            )

        valor_total_devolucao = round(sum(i.valor_total for i in itens_devolucao_entidade), 2)

        # 2. Recomposição Física de Estoque (com lock pessimista)
        for item_dev in itens_devolucao_entidade:
            if item_dev.retornar_ao_estoque:
                saldo = self.saldo_repo.obter_por_loja_e_produto_com_lock(
                    venda.loja_id, item_dev.produto_id, input_data.tenant_id
                )
                qtd_atual = saldo.quantidade if saldo else 0
                nova_qtd = qtd_atual + item_dev.quantidade

                if saldo:
                    saldo_atualizado = EstoqueSaldo(
                        id=saldo.id,
                        loja_id=saldo.loja_id,
                        produto_id=saldo.produto_id,
                        quantidade=nova_qtd,
                        tenant_id=saldo.tenant_id,
                    )
                else:
                    saldo_atualizado = EstoqueSaldo(
                        loja_id=venda.loja_id,
                        produto_id=item_dev.produto_id,
                        quantidade=nova_qtd,
                        tenant_id=input_data.tenant_id,
                    )
                self.saldo_repo.salvar(saldo_atualizado)

                # Registra movimentação de entrada no estoque
                mov = EstoqueMovimentacao(
                    loja_id=venda.loja_id,
                    produto_id=item_dev.produto_id,
                    tipo="ENTRADA",
                    quantidade=item_dev.quantidade,
                    motivo=f"Devolução de venda #{venda.id} ({input_data.motivo})",
                    tenant_id=input_data.tenant_id,
                )
                self.movimentacao_repo.salvar(mov)

        # 3. Tratamento da Resolução Financeira
        cliente_atualizado: Cliente | None = None
        if input_data.tipo_resolucao in {"CREDITO_LOJA", "ABATIMENTO_CREDIARIO"}:
            if not venda.cliente_id:
                raise ValueError(
                    f"A resolução '{input_data.tipo_resolucao}' requer que a venda possua um cliente associado."
                )

            cliente = self.cliente_repo.obter_por_id(venda.cliente_id, input_data.tenant_id)
            if not cliente:
                raise ValueError("Cliente associado à venda não foi encontrado.")

            if input_data.tipo_resolucao == "CREDITO_LOJA":
                novo_credito = round(cliente.credito_loja + valor_total_devolucao, 2)
                cliente_atualizado = Cliente(
                    id=cliente.id,
                    nome=cliente.nome,
                    email=cliente.email,
                    documento=cliente.documento,
                    tenant_id=cliente.tenant_id,
                    ativo=cliente.ativo,
                    limite_credito=cliente.limite_credito,
                    saldo_devedor_crediario=cliente.saldo_devedor_crediario,
                    credito_loja=novo_credito,
                )
            elif input_data.tipo_resolucao == "ABATIMENTO_CREDIARIO":
                novo_saldo_devedor = max(
                    0.0, round(cliente.saldo_devedor_crediario - valor_total_devolucao, 2)
                )
                cliente_atualizado = Cliente(
                    id=cliente.id,
                    nome=cliente.nome,
                    email=cliente.email,
                    documento=cliente.documento,
                    tenant_id=cliente.tenant_id,
                    ativo=cliente.ativo,
                    limite_credito=cliente.limite_credito,
                    saldo_devedor_crediario=novo_saldo_devedor,
                    credito_loja=cliente.credito_loja,
                )

            self.cliente_repo.salvar(cliente_atualizado)

        elif input_data.tipo_resolucao == "REEMBOLSO_CAIXA":
            agora = datetime.now(timezone.utc)
            despesa = FinanceiroLancamento(
                loja_id=venda.loja_id,
                tipo="DESPESA",
                valor=valor_total_devolucao,
                categoria="Reembolso / Devolução de Venda",
                status_pagamento="PAGO",
                data_lancamento=agora,
                data_pagamento=agora,
                tenant_id=input_data.tenant_id,
            )
            self.financeiro_repo.salvar(despesa)

        # 4. Salva a Devolução
        devolucao = Devolucao(
            venda_id=venda.id,
            loja_id=venda.loja_id,
            usuario_id=input_data.usuario_id,
            cliente_id=venda.cliente_id,
            tipo=input_data.tipo,
            tipo_resolucao=input_data.tipo_resolucao,
            valor_total=valor_total_devolucao,
            motivo=input_data.motivo,
            tenant_id=input_data.tenant_id,
            itens=itens_devolucao_entidade,
        )
        devolucao_salva = self.devolucao_repo.salvar(devolucao)

        # 5. Avalia Status Consolidado da Venda (Totalmente Devolvida vs Parcialmente)
        totalmente_devolvida = True
        for iv in venda.itens:
            total_dev = self.devolucao_repo.obter_total_devolvido_por_item_venda(
                iv.id, input_data.tenant_id
            )
            if total_dev < iv.quantidade:
                totalmente_devolvida = False
                break

        novo_status = "DEVOLVIDA" if totalmente_devolvida else "PARCIALMENTE_DEVOLVIDA"
        venda_atualizada = Venda(
            id=venda.id,
            loja_id=venda.loja_id,
            usuario_id=venda.usuario_id,
            cliente_id=venda.cliente_id,
            status=novo_status,
            forma_pagamento=venda.forma_pagamento,
            valor_total=venda.valor_total,
            desconto=venda.desconto,
            tenant_id=venda.tenant_id,
            itens=venda.itens,
            pagamentos=venda.pagamentos,
            data_venda=venda.data_venda,
        )
        self.venda_repo.salvar(venda_atualizada)

        return RegistrarDevolucaoOutput(
            devolucao=devolucao_salva,
            venda=venda_atualizada,
            cliente=cliente_atualizado,
            mensagem=(
                f"{input_data.tipo.title()} de R$ {valor_total_devolucao:.2f} registrada com sucesso. "
                f"Venda #{venda.id} agora está {novo_status}."
            ),
        )
