from typing import Optional, List

from pydantic import BaseModel, EmailStr, Field, ConfigDict
from uuid import UUID
from datetime import datetime


class RegisterRequest(BaseModel):
    """
    Schema para requisição de criação de Tenant e seu Usuário proprietário inicial.
    """
    nome_fantasia: str = Field(..., min_length=1, max_length=150, description="Nome comercial da rede de lojas.")
    razao_social: str = Field(..., min_length=1, max_length=150, description="Razão social jurídica oficial.")
    cnpj: str = Field(..., min_length=14, max_length=18, description="CNPJ (com ou sem pontuação).")
    dono_nome: str = Field(..., min_length=1, max_length=100, description="Nome completo do dono da conta.")
    dono_email: EmailStr = Field(..., description="E-mail de acesso do dono.")
    dono_senha: str = Field(..., min_length=6, max_length=100, description="Senha de acesso do dono (mínimo 6 caracteres).")

class RegisterResponse(BaseModel):
    """
    Schema para retorno do cadastro realizado com sucesso.
    """
    tenant_id: UUID
    nome_fantasia: str
    dono_id: UUID
    dono_email: str

    model_config = ConfigDict(from_attributes=True)

class LoginRequest(BaseModel):
    """
    Schema para requisição de autenticação de usuário.
    """
    email: EmailStr = Field(..., description="E-mail do usuário.")
    senha: str = Field(..., min_length=1, description="Senha do usuário.")

class LoginResponse(BaseModel):
    """
    Schema para retorno de autenticação bem-sucedida com token JWT.
    """
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    """
    Schema para retorno de dados do usuário autenticado.
    """
    id: UUID
    nome: str
    email: str
    role: str
    tenant_id: UUID
    loja_atribuida_id: UUID | None = None

    model_config = ConfigDict(from_attributes=True)


class LojaCreateRequest(BaseModel):
    """
    Schema para requisição de criação de uma nova Loja.
    """
    nome: str = Field(..., min_length=1, max_length=100, description="Nome da filial/loja.")
    cnpj: str = Field(..., min_length=14, max_length=18, description="CNPJ da filial/loja.")
    endereco: str = Field(..., min_length=1, max_length=255, description="Endereço físico completo.")


class LojaUpdateRequest(BaseModel):
    """
    Schema para requisição de atualização dos dados da Loja.
    """
    nome: str = Field(..., min_length=1, max_length=100, description="Nome da filial/loja.")
    endereco: str = Field(..., min_length=1, max_length=255, description="Endereço físico completo.")
    ativo: bool = Field(..., description="Status de atividade da loja.")


class LojaResponse(BaseModel):
    """
    Schema para retorno das informações de uma Loja.
    """
    id: UUID
    nome: str
    cnpj: str
    endereco: str
    tenant_id: UUID
    ativo: bool

    model_config = ConfigDict(from_attributes=True)


class ProdutoCreateRequest(BaseModel):
    """
    Schema para requisição de criação de um novo Produto.
    """
    nome: str = Field(..., min_length=1, max_length=150, description="Nome do produto.")
    sku: str = Field(..., min_length=1, max_length=50, description="SKU de identificação.")
    preco_custo: float = Field(..., ge=0.0, description="Preço de custo.")
    preco_venda: float = Field(..., ge=0.0, description="Preço de venda.")
    markup: float = Field(..., description="Markup do produto.")
    codigo_barras: Optional[str] = Field(None, max_length=50, description="Código de barras do produto.")
    fornecedor_id: Optional[UUID] = Field(None, description="ID do fornecedor associado.")


class ProdutoUpdateRequest(BaseModel):
    """
    Schema para requisição de atualização dos dados de um Produto.
    """
    nome: str = Field(..., min_length=1, max_length=150, description="Nome do produto.")
    preco_custo: float = Field(..., ge=0.0, description="Preço de custo.")
    preco_venda: float = Field(..., ge=0.0, description="Preço de venda.")
    markup: float = Field(..., description="Markup do produto.")
    codigo_barras: Optional[str] = Field(None, max_length=50, description="Código de barras do produto.")
    fornecedor_id: Optional[UUID] = Field(None, description="ID do fornecedor associado.")
    ativo: bool = Field(..., description="Status de atividade do produto.")


class ProdutoResponse(BaseModel):
    """
    Schema para retorno das informações de um Produto.
    """
    id: UUID
    nome: str
    sku: str
    preco_custo: float
    preco_venda: float
    markup: float
    tenant_id: UUID
    codigo_barras: Optional[str] = None
    fornecedor_id: Optional[UUID] = None
    ativo: bool

    model_config = ConfigDict(from_attributes=True)



class ClienteCreateRequest(BaseModel):
    """
    Schema para requisição de criação de um novo Cliente.
    """
    nome: str = Field(..., min_length=1, max_length=100, description="Nome do cliente.")
    email: EmailStr = Field(..., description="E-mail do cliente.")
    documento: str = Field(..., min_length=11, max_length=18, description="CPF ou CNPJ do cliente.")
    limite_credito: float = Field(default=0.0, ge=0.0, description="Limite de crédito do cliente.")


class ClienteUpdateRequest(BaseModel):
    """
    Schema para requisição de atualização dos dados de um Cliente.
    """
    nome: str = Field(..., min_length=1, max_length=100, description="Nome do cliente.")
    email: EmailStr = Field(..., description="E-mail do cliente.")
    ativo: bool = Field(..., description="Status de atividade do cliente.")
    limite_credito: float = Field(default=0.0, ge=0.0, description="Limite de crédito do cliente.")
    saldo_devedor_crediario: float = Field(default=0.0, ge=0.0, description="Saldo devedor do crediário.")


class ClienteResponse(BaseModel):
    """
    Schema para retorno das informações de um Cliente.
    """
    id: UUID
    nome: str
    email: str
    documento: str
    tenant_id: UUID
    ativo: bool
    limite_credito: float
    saldo_devedor_crediario: float

    model_config = ConfigDict(from_attributes=True)


class FornecedorCreateRequest(BaseModel):
    """
    Schema para requisição de criação de um novo Fornecedor.
    """
    nome_fantasia: str = Field(..., min_length=1, max_length=100, description="Nome fantasia.")
    razao_social: str = Field(..., min_length=1, max_length=100, description="Razão social.")
    cnpj: str = Field(..., min_length=14, max_length=18, description="CNPJ do fornecedor.")


class FornecedorUpdateRequest(BaseModel):
    """
    Schema para requisição de atualização dos dados de um Fornecedor.
    """
    nome_fantasia: str = Field(..., min_length=1, max_length=100, description="Nome fantasia.")
    razao_social: str = Field(..., min_length=1, max_length=100, description="Razão social.")
    ativo: bool = Field(..., description="Status de atividade do fornecedor.")


class FornecedorResponse(BaseModel):
    """
    Schema para retorno das informações de um Fornecedor.
    """
    id: UUID
    nome_fantasia: str
    razao_social: str
    cnpj: str
    tenant_id: UUID
    ativo: bool

    model_config = ConfigDict(from_attributes=True)


class MovimentacaoEstoqueRequest(BaseModel):
    """
    Schema para requisição de nova movimentação de estoque.
    """
    loja_id: UUID = Field(..., description="ID da loja física.")
    produto_id: UUID = Field(..., description="ID do produto.")
    tipo: str = Field(..., pattern="^(ENTRADA|SAIDA)$", description="Tipo de movimentação: ENTRADA ou SAIDA.")
    quantidade: int = Field(..., gt=0, le=1000000, description="Quantidade a ser movimentada (máximo 1.000.000).")
    motivo: str = Field(..., min_length=1, max_length=255, description="Motivo da movimentação.")


class MovimentacaoEstoqueResponse(BaseModel):
    """
    Schema para retorno de uma movimentação registrada (ledger).
    """
    id: UUID
    loja_id: UUID
    produto_id: UUID
    tipo: str
    quantidade: int
    motivo: str
    tenant_id: UUID
    data_movimentacao: datetime

    model_config = ConfigDict(from_attributes=True)


class EstoqueSaldoResponse(BaseModel):
    """
    Schema para retorno del saldo consolidado de estoque.
    """
    id: UUID
    loja_id: UUID
    produto_id: UUID
    quantidade: int
    tenant_id: UUID

    model_config = ConfigDict(from_attributes=True)


class RegistroMovimentacaoEstoqueResponse(BaseModel):
    """
    Schema para retorno de sucesso da movimentação com saldo atualizado e histórico registrado.
    """
    saldo: EstoqueSaldoResponse
    movimentacao: MovimentacaoEstoqueResponse

    model_config = ConfigDict(from_attributes=True)


class ItemImportadoNFeResponse(BaseModel):
    """
    Schema para retorno de cada item processado no XML de NF-e.
    """
    produto: ProdutoResponse
    quantidade_importada: float
    valor_unitario_nfe: float
    novo_produto_cadastrado: bool

    model_config = ConfigDict(from_attributes=True)


class ImportarNFeResponse(BaseModel):
    """
    Schema para resposta consolidada da importação de NF-e.
    """
    fornecedor: FornecedorResponse
    itens_processados: List[ItemImportadoNFeResponse]

    model_config = ConfigDict(from_attributes=True)


class TransferenciaEstoqueSolicitarRequest(BaseModel):
    """
    Schema para solicitação de uma nova transferência de estoque interlojas.
    """
    loja_origem_id: UUID = Field(..., description="ID da loja física remetente dos itens.")
    loja_destino_id: UUID = Field(..., description="ID da loja física destinatária.")
    produto_id: UUID = Field(..., description="ID do produto a ser transferido.")
    quantidade: int = Field(..., gt=0, le=1000000, description="Quantidade a ser transferida.")


class TransferenciaEstoqueReceberRequest(BaseModel):
    """
    Schema para confirmação de recebimento de transferência de estoque.
    """
    quantidade_recebida: int = Field(..., ge=0, le=1000000, description="Quantidade física recebida.")
    justificativa: Optional[str] = Field(None, max_length=255, description="Justificativa obrigatória em caso de divergência.")


class TransferenciaEstoqueResponse(BaseModel):
    """
    Schema de resposta para uma transferência de estoque.
    """
    id: UUID
    tenant_id: UUID
    loja_origem_id: UUID
    loja_destino_id: UUID
    produto_id: UUID
    quantidade: int
    status: str
    solicitado_por_id: UUID
    aprovado_por_id: Optional[UUID] = None
    justificativa: Optional[str] = None
    criado_em: datetime

    model_config = ConfigDict(from_attributes=True)


class ItemAuditoriaRequest(BaseModel):
    produto_id: UUID = Field(..., description="ID do produto.")
    quantidade_fisica: int = Field(..., ge=0, description="Quantidade física contada.")


class AuditarEstoqueRequest(BaseModel):
    loja_id: UUID = Field(..., description="ID da loja onde a auditoria ocorreu.")
    itens: List[ItemAuditoriaRequest] = Field(..., min_length=1, description="Lista de itens contados.")


class AuditoriaFisicaItemResponse(BaseModel):
    id: UUID
    produto_id: UUID
    quantidade_fisica: int
    quantidade_sistema: int

    model_config = ConfigDict(from_attributes=True)


class AuditoriaFisicaResponse(BaseModel):
    id: UUID
    loja_id: UUID
    tenant_id: UUID
    data_auditoria: Optional[datetime] = None
    itens: List[AuditoriaFisicaItemResponse]

    model_config = ConfigDict(from_attributes=True)


class AuditarEstoqueResponse(BaseModel):
    auditoria: AuditoriaFisicaResponse
    movimentacoes_geradas: List[MovimentacaoEstoqueResponse]

    model_config = ConfigDict(from_attributes=True)


class ItemVendaRequest(BaseModel):
    produto_id: UUID = Field(..., description="ID do produto vendido.")
    quantidade: int = Field(..., gt=0, description="Quantidade vendida.")


class RegistrarVendaRequest(BaseModel):
    loja_id: UUID = Field(..., description="ID da loja de origem da venda.")
    cliente_id: Optional[UUID] = Field(None, description="ID do cliente (obrigatório se forma_pagamento for CREDIARIO).")
    forma_pagamento: str = Field(..., description="Forma de pagamento (DINHEIRO, CARTAO_CREDITO, CARTAO_DEBITO, PIX, CREDIARIO).")
    desconto: float = Field(default=0.0, ge=0.0, description="Valor do desconto aplicado.")
    itens: List[ItemVendaRequest] = Field(..., min_length=1, description="Lista de produtos e quantidades.")


class ItemVendaResponse(BaseModel):
    id: UUID
    produto_id: UUID
    quantidade: int
    preco_unitario: float
    tenant_id: UUID

    model_config = ConfigDict(from_attributes=True)


class VendaResponse(BaseModel):
    id: UUID
    loja_id: UUID
    cliente_id: Optional[UUID] = None
    usuario_id: UUID
    status: str
    forma_pagamento: str
    valor_total: float
    desconto: float
    data_venda: Optional[datetime] = None
    tenant_id: UUID
    itens: List[ItemVendaResponse]

    model_config = ConfigDict(from_attributes=True)

