from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
from uuid import UUID, uuid4
from typing import Optional

from src.infrastructure.database.session import get_db
from src.infrastructure.web.dependencies import get_current_user
from src.domain.entities.usuario import Usuario
from src.domain.exceptions.business import LojaNaoEncontradaException
from src.infrastructure.database.repositorios_concrete import (
    RepositorioFornecedorSQLAlchemy,
    RepositorioProdutoSQLAlchemy,
    RepositorioEstoqueSaldoSQLAlchemy,
    RepositorioLojaSQLAlchemy,
    RepositorioEstoqueMovimentacaoSQLAlchemy,
)
from src.use_cases.estoque.importar_nfe import ImportarEstoqueNFe, ImportarNFeInput
from src.infrastructure.web.schemas import ImportarNFeResponse

router = APIRouter(prefix="/estoque", tags=["Estoque & NF-e"])

@router.post("/importar-xml", response_model=ImportarNFeResponse, status_code=status.HTTP_200_OK)
def importar_xml_nfe(
    file: UploadFile = File(..., description="Arquivo XML da Nota Fiscal Eletrônica (NF-e v4.00)"),
    loja_id: Optional[UUID] = Query(None, description="ID da loja física para registrar as entradas físicas de estoque"),
    markup_padrao: float = Query(0.5, ge=0.0, description="Markup padrão para cálculo de preço de novos produtos"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
) -> ImportarNFeResponse:
    """
    Realiza o upload e o processamento de um XML de NF-e.
    Auto-cadastra/atualiza Fornecedor e Produtos, recalculando Custo Médio e Preço de Venda.
    """
    if not file.filename or not file.filename.lower().endswith(".xml"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo enviado deve possuir a extensão .xml"
        )

    try:
        xml_bytes = file.file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erro ao ler o arquivo enviado: {str(e)}"
        )

    fornecedor_repo = RepositorioFornecedorSQLAlchemy(db)
    produto_repo = RepositorioProdutoSQLAlchemy(db)
    saldo_repo = RepositorioEstoqueSaldoSQLAlchemy(db)
    loja_repo = RepositorioLojaSQLAlchemy(db)
    movimentacao_repo = RepositorioEstoqueMovimentacaoSQLAlchemy(db)
    use_case = ImportarEstoqueNFe(fornecedor_repo, produto_repo, saldo_repo, loja_repo, movimentacao_repo)

    input_data = ImportarNFeInput(
        xml_content=xml_bytes,
        tenant_id=current_user.tenant_id,
        loja_id=loja_id,
        markup_padrao=markup_padrao
    )

    try:
        output = use_case.executar(input_data)
        return ImportarNFeResponse.model_validate(output)
    except LojaNaoEncontradaException as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Falha ao processar a NF-e: erro interno no servidor."
        )
