from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from src.domain.entities.cliente import Cliente
from src.domain.entities.financeiro_lancamento import FinanceiroLancamento
from src.domain.exceptions.business import (
    ClienteNaoEncontradoException,
    DocumentoClienteEmUsoException,
    DomainException,
    LojaNaoEncontradaException,
)
from src.domain.repositories.cliente_repository import ClienteRepository
from src.domain.repositories.financeiro_lancamento_repository import (
    FinanceiroLancamentoRepository,
)
from src.domain.repositories.loja_repository import LojaRepository


@dataclass(frozen=True)
class CriarClienteInput:
    nome: str
    email: str
    documento: str
    tenant_id: UUID
    limite_credito: float = 0.0


@dataclass(frozen=True)
class CriarClienteOutput:
    cliente: Cliente


class CriarCliente:
    """
    Caso de Uso: Criar um novo Cliente.
    """
    def __init__(self, cliente_repo: ClienteRepository) -> None:
        self.cliente_repo = cliente_repo

    def executar(self, input_data: CriarClienteInput) -> CriarClienteOutput:
        # 1. Verifica se já existe outro cliente com o mesmo documento para o tenant
        cliente_existente = self.cliente_repo.obter_por_documento(input_data.documento, input_data.tenant_id)
        if cliente_existente:
            raise DocumentoClienteEmUsoException(input_data.documento)

        # 2. Instancia a entidade de domínio Cliente
        cliente = Cliente(
            nome=input_data.nome,
            email=input_data.email,
            documento=input_data.documento,
            tenant_id=input_data.tenant_id,
            limite_credito=input_data.limite_credito
        )

        # 3. Salva no banco
        cliente_salvo = self.cliente_repo.salvar(cliente)

        return CriarClienteOutput(cliente=cliente_salvo)


@dataclass(frozen=True)
class ObterClienteOutput:
    cliente: Cliente


class ObterCliente:
    """
    Caso de Uso: Obter detalhes de um Cliente pelo ID.
    """
    def __init__(self, cliente_repo: ClienteRepository) -> None:
        self.cliente_repo = cliente_repo

    def executar(self, cliente_id: UUID, tenant_id: UUID) -> ObterClienteOutput:
        cliente = self.cliente_repo.obter_por_id(cliente_id, tenant_id)
        if not cliente:
            raise ClienteNaoEncontradoException(str(cliente_id))

        return ObterClienteOutput(cliente=cliente)


@dataclass(frozen=True)
class ListarClientesOutput:
    clientes: list[Cliente]


class ListarClientes:
    """
    Caso de Uso: Listar todos os Clientes de um Tenant.
    """
    def __init__(self, cliente_repo: ClienteRepository) -> None:
        self.cliente_repo = cliente_repo

    def executar(self, tenant_id: UUID) -> ListarClientesOutput:
        clientes = self.cliente_repo.listar_todos(tenant_id)
        return ListarClientesOutput(clientes=clientes)


@dataclass(frozen=True)
class AtualizarClienteInput:
    id: UUID
    nome: str
    email: str
    ativo: bool
    tenant_id: UUID
    limite_credito: float = 0.0
    saldo_devedor_crediario: float = 0.0


@dataclass(frozen=True)
class AtualizarClienteOutput:
    cliente: Cliente


class AtualizarCliente:
    """
    Caso de Uso: Atualizar dados de um Cliente.
    """
    def __init__(self, cliente_repo: ClienteRepository) -> None:
        self.cliente_repo = cliente_repo

    def executar(self, input_data: AtualizarClienteInput) -> AtualizarClienteOutput:
        # 1. Recupera o cliente existente
        cliente = self.cliente_repo.obter_por_id(input_data.id, input_data.tenant_id)
        if not cliente:
            raise ClienteNaoEncontradoException(str(input_data.id))

        # 2. Cria nova instância (documento e tenant permanecem imutáveis)
        cliente_atualizado = Cliente(
            nome=input_data.nome,
            email=input_data.email,
            documento=cliente.documento,
            tenant_id=cliente.tenant_id,
            id=cliente.id,
            ativo=input_data.ativo,
            limite_credito=input_data.limite_credito,
            saldo_devedor_crediario=input_data.saldo_devedor_crediario
        )

        # 3. Salva no banco
        cliente_salvo = self.cliente_repo.salvar(cliente_atualizado)

        return AtualizarClienteOutput(cliente=cliente_salvo)


@dataclass(frozen=True)
class ReceberCrediarioInput:
    cliente_id: UUID
    loja_id: UUID
    valor: float
    tenant_id: UUID


@dataclass(frozen=True)
class ReceberCrediarioOutput:
    cliente: Cliente
    lancamento: FinanceiroLancamento


class ReceberCrediarioCliente:
    """
    Caso de Uso: Dar baixa (total ou parcial) no saldo devedor de crediário de um cliente
    e registrar a entrada financeira (RECEITA PAGO) no caixa da loja.
    """
    def __init__(
        self,
        cliente_repo: ClienteRepository,
        financeiro_repo: FinanceiroLancamentoRepository,
        loja_repo: LojaRepository,
    ) -> None:
        self.cliente_repo = cliente_repo
        self.financeiro_repo = financeiro_repo
        self.loja_repo = loja_repo

    def executar(self, input_data: ReceberCrediarioInput) -> ReceberCrediarioOutput:
        loja = self.loja_repo.obter_por_id(input_data.loja_id, input_data.tenant_id)
        if not loja:
            raise LojaNaoEncontradaException(str(input_data.loja_id))

        cliente = self.cliente_repo.obter_por_id(input_data.cliente_id, input_data.tenant_id)
        if not cliente:
            raise ClienteNaoEncontradoException(str(input_data.cliente_id))

        if input_data.valor <= 0:
            raise ValueError("O valor recebido deve ser maior que zero.")

        if input_data.valor > round(cliente.saldo_devedor_crediario + 0.001, 2):
            raise DomainException("O valor recebido não pode ser maior que o saldo devedor atual do cliente.")

        novo_saldo = max(0.0, round(cliente.saldo_devedor_crediario - input_data.valor, 2))
        cliente_atualizado = Cliente(
            nome=cliente.nome,
            email=cliente.email,
            documento=cliente.documento,
            tenant_id=cliente.tenant_id,
            id=cliente.id,
            ativo=cliente.ativo,
            limite_credito=cliente.limite_credito,
            saldo_devedor_crediario=novo_saldo,
        )
        cliente_salvo = self.cliente_repo.salvar(cliente_atualizado)

        lancamento = FinanceiroLancamento(
            loja_id=input_data.loja_id,
            tipo="RECEITA",
            valor=round(input_data.valor, 2),
            categoria="Recebimento de Crediário",
            status_pagamento="PAGO",
            tenant_id=input_data.tenant_id,
            data_pagamento=datetime.utcnow(),
        )
        lancamento_salvo = self.financeiro_repo.salvar(lancamento)

        return ReceberCrediarioOutput(cliente=cliente_salvo, lancamento=lancamento_salvo)

