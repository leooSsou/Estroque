from dataclasses import dataclass
from uuid import UUID

from src.domain.entities.auditoria_fisica import AuditoriaFisica, AuditoriaFisicaItem
from src.domain.entities.estoque_movimentacao import EstoqueMovimentacao
from src.domain.entities.estoque_saldo import EstoqueSaldo
from src.domain.exceptions.business import (
    LojaNaoEncontradaException,
    ProdutoNaoEncontradoException,
)
from src.domain.repositories.auditoria_fisica_repository import (
    AuditoriaFisicaRepository,
)
from src.domain.repositories.estoque_movimentacao_repository import (
    EstoqueMovimentacaoRepository,
)
from src.domain.repositories.estoque_saldo_repository import EstoqueSaldoRepository
from src.domain.repositories.loja_repository import LojaRepository
from src.domain.repositories.produto_repository import ProdutoRepository


@dataclass(frozen=True)
class ItemAuditoriaInput:
    produto_id: UUID
    quantidade_fisica: int

@dataclass(frozen=True)
class AuditarEstoqueInput:
    loja_id: UUID
    tenant_id: UUID
    itens_contados: list[ItemAuditoriaInput]

@dataclass(frozen=True)
class AuditarEstoqueOutput:
    auditoria: AuditoriaFisica
    movimentacoes_geradas: list[EstoqueMovimentacao]

class AuditarEstoqueLoja:
    """
    Caso de Uso: Realiza a auditoria física de estoque de uma loja.
    Compara as contagens físicas com os saldos lógicos (usando travas pessimistas),
    gera movimentações de ajuste (perda ou ganho) se houver divergência,
    e persiste o registro imutável da auditoria.
    """
    def __init__(
        self,
        auditoria_repo: AuditoriaFisicaRepository,
        saldo_repo: EstoqueSaldoRepository,
        movimentacao_repo: EstoqueMovimentacaoRepository,
        loja_repo: LojaRepository,
        produto_repo: ProdutoRepository,
    ) -> None:
        self.auditoria_repo = auditoria_repo
        self.saldo_repo = saldo_repo
        self.movimentacao_repo = movimentacao_repo
        self.loja_repo = loja_repo
        self.produto_repo = produto_repo

    def executar(self, input_data: AuditarEstoqueInput) -> AuditarEstoqueOutput:
        loja = self.loja_repo.obter_por_id(input_data.loja_id, input_data.tenant_id)
        if not loja:
            raise LojaNaoEncontradaException(str(input_data.loja_id))

        if not input_data.itens_contados:
            raise ValueError("A auditoria precisa ter ao menos um item contado.")

        itens_auditoria = []
        movimentacoes = []

        for item_input in input_data.itens_contados:
            produto = self.produto_repo.obter_por_id(item_input.produto_id, input_data.tenant_id)
            if not produto:
                raise ProdutoNaoEncontradoException(str(item_input.produto_id))

            # Obtém o saldo travando a linha correspondente
            saldo = self.saldo_repo.obter_por_loja_e_produto_com_lock(
                input_data.loja_id, item_input.produto_id, input_data.tenant_id
            )
            
            quantidade_sistema = saldo.quantidade if saldo else 0
            quantidade_fisica = item_input.quantidade_fisica

            # Cria o item de auditoria
            item_audit = AuditoriaFisicaItem(
                produto_id=item_input.produto_id,
                quantidade_fisica=quantidade_fisica,
                quantidade_sistema=quantidade_sistema
            )
            itens_auditoria.append(item_audit)

            # Verifica divergências
            divergencia = item_audit.divergencia
            if divergencia != 0:
                tipo_mov = "ENTRADA" if divergencia > 0 else "SAIDA"
                motivo = "AUDITORIA: Sobra de Estoque" if divergencia > 0 else "AUDITORIA: Perda/Ajuste"
                qtde_mov = abs(divergencia)
                
                # Registra o histórico da movimentação
                mov = EstoqueMovimentacao(
                    loja_id=input_data.loja_id,
                    produto_id=item_input.produto_id,
                    tipo=tipo_mov,
                    quantidade=qtde_mov,
                    motivo=motivo,
                    tenant_id=input_data.tenant_id
                )
                mov_salva = self.movimentacao_repo.salvar(mov)
                movimentacoes.append(mov_salva)

                # Atualiza ou cria o Saldo de Estoque
                if saldo:
                    saldo_atualizado = EstoqueSaldo(
                        id=saldo.id,
                        loja_id=saldo.loja_id,
                        produto_id=saldo.produto_id,
                        quantidade=quantidade_fisica,
                        tenant_id=saldo.tenant_id
                    )
                else:
                    saldo_atualizado = EstoqueSaldo(
                        loja_id=input_data.loja_id,
                        produto_id=item_input.produto_id,
                        quantidade=quantidade_fisica,
                        tenant_id=input_data.tenant_id
                    )
                self.saldo_repo.salvar(saldo_atualizado)

        auditoria = AuditoriaFisica(
            loja_id=input_data.loja_id,
            tenant_id=input_data.tenant_id,
            itens=itens_auditoria
        )
        auditoria_salva = self.auditoria_repo.salvar(auditoria)

        return AuditarEstoqueOutput(auditoria=auditoria_salva, movimentacoes_geradas=movimentacoes)
