from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4


@dataclass(frozen=True)
class TransferenciaEstoque:
    """
    Entidade de Domínio representando uma transferência de estoque interlojas.
    """
    loja_origem_id: UUID
    loja_destino_id: UUID
    produto_id: UUID
    quantidade: int
    solicitado_por_id: UUID
    id: UUID = field(default_factory=uuid4)
    tenant_id: UUID | None = None
    status: str = "SOLICITADO"
    aprovado_por_id: UUID | None = None
    justificativa: str | None = None
    criado_em: datetime | None = None

    def __post_init__(self):
        if self.quantidade <= 0:
            raise ValueError("A quantidade da transferência deve ser maior que zero.")
        if self.loja_origem_id == self.loja_destino_id:
            raise ValueError("As lojas de origem e destino devem ser diferentes.")
        
        valid_statuses = {"SOLICITADO", "DESPACHADO", "RECEBIDO", "DIVERGENTE"}
        if self.status not in valid_statuses:
            raise ValueError(f"Status de transferência inválido: {self.status}")

    def despachar(self, aprovado_por_id: UUID) -> "TransferenciaEstoque":
        """
        Retorna uma nova instância no estado DESPACHADO, registrando o usuário que aprovou a saída.
        """
        if self.status != "SOLICITADO":
            raise ValueError(f"Não é possível despachar uma transferência no status {self.status}.")
        
        return TransferenciaEstoque(
            id=self.id,
            tenant_id=self.tenant_id,
            loja_origem_id=self.loja_origem_id,
            loja_destino_id=self.loja_destino_id,
            produto_id=self.produto_id,
            quantidade=self.quantidade,
            solicitado_por_id=self.solicitado_por_id,
            status="DESPACHADO",
            aprovado_por_id=aprovado_por_id,
            justificativa=self.justificativa,
            criado_em=self.criado_em
        )

    def receber(self, aprovado_por_id: UUID, quantidade_recebida: int, justificativa: str | None = None) -> "TransferenciaEstoque":
        """
        Retorna uma nova instância no estado RECEBIDO ou DIVERGENTE com base na contagem recebida.
        """
        if self.status != "DESPACHADO":
            raise ValueError(f"Não é possível receber uma transferência no status {self.status}.")
        if quantidade_recebida < 0:
            raise ValueError("A quantidade recebida não pode ser negativa.")
        if quantidade_recebida > self.quantidade:
            raise ValueError("A quantidade recebida não pode ser maior que a quantidade despachada.")
        
        novo_status = "RECEBIDO" if quantidade_recebida == self.quantidade else "DIVERGENTE"
        if novo_status == "DIVERGENTE" and (not justificativa or not justificativa.strip()):
            raise ValueError("Justificativa é obrigatória em caso de divergência no recebimento.")

        return TransferenciaEstoque(
            id=self.id,
            tenant_id=self.tenant_id,
            loja_origem_id=self.loja_origem_id,
            loja_destino_id=self.loja_destino_id,
            produto_id=self.produto_id,
            quantidade=self.quantidade,
            solicitado_por_id=self.solicitado_por_id,
            status=novo_status,
            aprovado_por_id=aprovado_por_id,
            justificativa=justificativa.strip() if justificativa else None,
            criado_em=self.criado_em
        )
