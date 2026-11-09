from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.domain.entities.usuario import Usuario
from src.infrastructure.database.models import (
    CaixaOperacaoModel,
    CaixaTurnoModel,
    FinanceiroLancamentoModel,
    LojaModel,
    PagamentoVendaModel,
    VendaModel,
)
from src.infrastructure.database.session import get_db
from src.infrastructure.web.authorization import exigir_acesso_loja, verificar_modulo_ativo
from src.infrastructure.web.dependencies import get_current_user
from src.infrastructure.web.schemas import (
    AbrirCaixaRequest,
    CaixaTurnoResponse,
    FecharCaixaRequest,
    OperacaoCaixaRequest,
    OperacaoCaixaResponse,
    TurnoFechadoHistoricoResponse,
)

router = APIRouter(
    prefix="/caixa",
    tags=["Frente de Caixa & Turnos"],
    dependencies=[Depends(verificar_modulo_ativo("pdv"))],
)


@router.get("/turno-atual", response_model=CaixaTurnoResponse)
def obter_turno_atual(
    loja_id: UUID = Query(..., description="ID da loja física"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> CaixaTurnoResponse:
    """
    Retorna o turno de caixa atualmente aberto para a loja física especificada.
    Caso não exista turno aberto, retorna aberto=False.
    """
    exigir_acesso_loja(loja_id, current_user)

    turno = (
        db.query(CaixaTurnoModel)
        .filter(
            CaixaTurnoModel.loja_id == loja_id,
            CaixaTurnoModel.aberto.is_(True),
        )
        .first()
    )

    if not turno:
        return CaixaTurnoResponse(
            id=None,
            aberto=False,
            operador_nome=current_user.nome,
            data_abertura=None,
            fundo_inicial=0.0,
            operacoes=[],
            loja_id=loja_id,
        )

    return CaixaTurnoResponse(
        id=turno.id,
        aberto=turno.aberto,
        operador_nome=turno.operador_nome,
        data_abertura=turno.data_abertura,
        fundo_inicial=turno.fundo_inicial,
        operacoes=[OperacaoCaixaResponse.model_validate(op) for op in turno.operacoes],
        loja_id=turno.loja_id,
    )


@router.post("/abrir", response_model=CaixaTurnoResponse, status_code=status.HTTP_201_CREATED)
def abrir_caixa(
    request: AbrirCaixaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> CaixaTurnoResponse:
    """
    Abre um novo turno de caixa com fundo de troco inicial no servidor.
    Impede abertura caso já exista outro turno ativo na mesma loja física.
    """
    exigir_acesso_loja(request.loja_id, current_user)

    loja = db.query(LojaModel).filter(LojaModel.id == request.loja_id).first()
    if not loja:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loja física não encontrada.")

    turno_existente = (
        db.query(CaixaTurnoModel)
        .filter(
            CaixaTurnoModel.loja_id == request.loja_id,
            CaixaTurnoModel.aberto.is_(True),
        )
        .first()
    )
    if turno_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um turno de caixa aberto para esta loja física. Encerre o turno atual antes de abrir outro.",
        )

    novo_turno = CaixaTurnoModel(
        tenant_id=current_user.tenant_id,
        loja_id=request.loja_id,
        usuario_id=current_user.id,
        operador_nome=current_user.nome,
        aberto=True,
        fundo_inicial=request.fundo_inicial,
        data_abertura=datetime.now(timezone.utc),
    )
    try:
        db.add(novo_turno)
        db.flush()

        op_abertura = CaixaOperacaoModel(
            turno_id=novo_turno.id,
            tenant_id=current_user.tenant_id,
            loja_id=request.loja_id,
            usuario_id=current_user.id,
            tipo="ABERTURA",
            valor=request.fundo_inicial,
            motivo="Abertura de caixa e fundo de troco inicial",
            data_hora=datetime.now(timezone.utc),
            operador_nome=current_user.nome,
        )
        db.add(op_abertura)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um turno de caixa aberto para esta loja física. Encerre o turno atual antes de abrir outro.",
        )
    db.refresh(novo_turno)

    return CaixaTurnoResponse(
        id=novo_turno.id,
        aberto=novo_turno.aberto,
        operador_nome=novo_turno.operador_nome,
        data_abertura=novo_turno.data_abertura,
        fundo_inicial=novo_turno.fundo_inicial,
        operacoes=[OperacaoCaixaResponse.model_validate(op_abertura)],
        loja_id=novo_turno.loja_id,
    )


@router.post("/operacoes", response_model=OperacaoCaixaResponse, status_code=status.HTTP_201_CREATED)
def registrar_operacao_caixa(
    request: OperacaoCaixaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> OperacaoCaixaResponse:
    """
    Registra uma sangria ou suprimento no turno ativo e gera lançamento no livro financeiro.
    """
    loja_id = request.loja_id or current_user.loja_atribuida_id
    if not loja_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O loja_id é obrigatório para registrar movimentações de caixa.",
        )

    exigir_acesso_loja(loja_id, current_user)

    turno = (
        db.query(CaixaTurnoModel)
        .filter(
            CaixaTurnoModel.loja_id == loja_id,
            CaixaTurnoModel.aberto.is_(True),
        )
        .with_for_update()
        .first()
    )
    if not turno or not turno.aberto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há turno de caixa aberto para esta loja física. Abra o turno antes de realizar movimentações.",
        )

    agora = datetime.now(timezone.utc)
    op = CaixaOperacaoModel(
        turno_id=turno.id,
        tenant_id=current_user.tenant_id,
        loja_id=loja_id,
        usuario_id=current_user.id,
        tipo=request.tipo,
        valor=request.valor,
        motivo=request.motivo,
        data_hora=agora,
        operador_nome=current_user.nome,
    )
    db.add(op)

    if request.tipo == "SANGRIA":
        turno.total_sangrias += request.valor
        lancamento = FinanceiroLancamentoModel(
            loja_id=loja_id,
            tipo="DESPESA",
            valor=request.valor,
            categoria="Sangria de Caixa (Cofre)",
            status_pagamento="PAGO",
            tenant_id=current_user.tenant_id,
            data_pagamento=agora,
        )
        db.add(lancamento)
    elif request.tipo == "SUPRIMENTO":
        turno.total_suprimentos += request.valor
        lancamento = FinanceiroLancamentoModel(
            loja_id=loja_id,
            tipo="RECEITA",
            valor=request.valor,
            categoria="Suprimento de Caixa (Troco)",
            status_pagamento="PAGO",
            tenant_id=current_user.tenant_id,
            data_pagamento=agora,
        )
        db.add(lancamento)

    db.commit()
    db.refresh(op)
    return OperacaoCaixaResponse.model_validate(op)


@router.post("/fechar")
def fechar_caixa(
    request: FecharCaixaRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    """
    Realiza o fechamento cego de caixa no servidor:
    Calcula todas as vendas em dinheiro efetuadas desde a abertura do turno,
    apura saldo esperado, registra a diferença física e arquiva o encerramento.
    """
    exigir_acesso_loja(request.loja_id, current_user)

    turno = (
        db.query(CaixaTurnoModel)
        .filter(
            CaixaTurnoModel.loja_id == request.loja_id,
            CaixaTurnoModel.aberto.is_(True),
        )
        .with_for_update()
        .first()
    )
    if not turno or not turno.aberto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há turno de caixa aberto para encerramento nesta loja física.",
        )

    # 1. Total de vendas em dinheiro ocorridas durante o turno
    vendas = (
        db.query(VendaModel)
        .filter(
            VendaModel.loja_id == request.loja_id,
            VendaModel.status.in_(["PAGO", "CONCLUIDA"]),
            VendaModel.data_venda >= turno.data_abertura,
        )
        .all()
    )

    vendas_dinheiro = 0.0
    for v in vendas:
        if v.forma_pagamento == "DINHEIRO":
            vendas_dinheiro += v.valor_total
        elif v.forma_pagamento == "MULTIPLO":
            pagamentos = (
                db.query(PagamentoVendaModel)
                .filter(
                    PagamentoVendaModel.venda_id == v.id,
                    PagamentoVendaModel.forma_pagamento == "DINHEIRO",
                )
                .all()
            )
            vendas_dinheiro += sum(p.valor for p in pagamentos)

    vendas_dinheiro = round(vendas_dinheiro, 2)
    saldo_esperado = round(
        turno.fundo_inicial + vendas_dinheiro + turno.total_suprimentos - turno.total_sangrias,
        2,
    )
    diferenca = round(request.saldo_informado - saldo_esperado, 2)
    agora = datetime.now(timezone.utc)

    op_fechamento = CaixaOperacaoModel(
        turno_id=turno.id,
        tenant_id=current_user.tenant_id,
        loja_id=request.loja_id,
        usuario_id=current_user.id,
        tipo="FECHAMENTO",
        valor=request.saldo_informado,
        motivo=f"Fechamento de caixa. Saldo esperado: R$ {saldo_esperado:.2f}. Diferença: R$ {diferenca:.2f}{' - ' + request.observacao if request.observacao else ''}",
        data_hora=agora,
        operador_nome=current_user.nome,
    )
    db.add(op_fechamento)

    turno.aberto = False
    turno.data_fechamento = agora
    turno.total_vendas_dinheiro = vendas_dinheiro
    turno.saldo_esperado = saldo_esperado
    turno.saldo_informado = request.saldo_informado
    turno.diferenca = diferenca
    turno.observacao = request.observacao

    db.commit()
    db.refresh(turno)

    return {
        "diferenca": diferenca,
        "saldo_esperado": saldo_esperado,
        "saldo_informado": request.saldo_informado,
        "resumo": CaixaTurnoResponse(
            id=turno.id,
            aberto=False,
            operador_nome=turno.operador_nome,
            data_abertura=turno.data_abertura,
            fundo_inicial=turno.fundo_inicial,
            operacoes=[OperacaoCaixaResponse.model_validate(op) for op in turno.operacoes],
            loja_id=turno.loja_id,
        ),
    }


@router.get("/historico", response_model=list[TurnoFechadoHistoricoResponse])
def listar_historico_turnos(
    loja_id: UUID = Query(..., description="ID da loja física"),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[TurnoFechadoHistoricoResponse]:
    """
    Retorna o histórico de todos os turnos de PDV já encerrados para conferência de caixa.
    """
    exigir_acesso_loja(loja_id, current_user)

    turnos = (
        db.query(CaixaTurnoModel)
        .filter(
            CaixaTurnoModel.loja_id == loja_id,
            CaixaTurnoModel.aberto.is_(False),
        )
        .order_by(CaixaTurnoModel.data_fechamento.desc())
        .limit(50)
        .all()
    )

    return [
        TurnoFechadoHistoricoResponse(
            id=t.id,
            loja_id=t.loja_id,
            operador_nome=t.operador_nome,
            data_abertura=t.data_abertura,
            data_fechamento=t.data_fechamento,
            fundo_inicial=t.fundo_inicial,
            total_vendas_dinheiro=t.total_vendas_dinheiro,
            total_suprimentos=t.total_suprimentos,
            total_sangrias=t.total_sangrias,
            saldo_esperado=t.saldo_esperado,
            saldo_informado=t.saldo_informado,
            diferenca=t.diferenca,
            observacao=t.observacao,
            operacoes=[OperacaoCaixaResponse.model_validate(op) for op in t.operacoes],
        )
        for t in turnos
    ]
