from datetime import datetime, timedelta
from src.infrastructure.tasks.celery_app import celery_app
from src.infrastructure.database.session import SessionLocal
from src.infrastructure.database.models import TenantModel, UsuarioModel
from src.use_cases.analytics.gerar_dashboard import GerarDashboardAnalytics, DashboardAnalyticsInput
from src.infrastructure.services.email_service import ConsoleEmailService

from src.infrastructure.services.email_service import ConsoleEmailService
from sqlalchemy.orm import Session
from typing import Optional

@celery_app.task
def enviar_fechamento_diario_todos_tenants(db: Optional[Session] = None) -> str:
    """
    Tarefa periódica agendada para consolidar faturamento e status operacional
    de todos os tenants e disparar relatórios diários aos donos.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
    email_service = ConsoleEmailService()
    processados = 0

    try:
        # Desliga o filtro de tenant para listar todos os tenants cadastrados
        db.info["ignore_tenant_filter"] = True
        tenants = db.query(TenantModel).all()

        for tenant in tenants:
            # Busca o dono do tenant para envio do e-mail
            dono = db.query(UsuarioModel).filter(
                UsuarioModel.tenant_id == tenant.id,
                UsuarioModel.role == "DONO"
            ).first()

            if not dono:
                continue

            # Define período (últimas 24 horas)
            data_fim = datetime.utcnow()
            data_inicio = data_fim - timedelta(days=1)

            # Ativa filtro de tenant do SQLAlchemy para este tenant específico
            db.info["ignore_tenant_filter"] = False
            db.info["tenant_id"] = tenant.id

            use_case = GerarDashboardAnalytics(db)
            input_data = DashboardAnalyticsInput(
                tenant_id=tenant.id,
                data_inicio=data_inicio,
                data_fim=data_fim
            )

            # Consolida as métricas
            stats = use_case.executar(input_data)

            # Monta o corpo do relatório HTML
            html_content = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #2c3e50; text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                            Fechamento Diário: {tenant.nome_fantasia}
                        </h2>
                        <p style="font-size: 14px; color: #7f8c8d; text-align: center;">
                            Período: {data_inicio.strftime('%d/%m/%Y %H:%M')} até {data_fim.strftime('%d/%m/%Y %H:%M')} (UTC)
                        </p>
                        
                        <h3 style="color: #2980b9; margin-top: 20px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px;">
                            📊 Resumo Financeiro
                        </h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <tr>
                                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f2f2f2;">Faturamento Bruto:</td>
                                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f2f2f2;">R$ {stats.faturamento_bruto:.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f2f2f2;">Descontos Aplicados:</td>
                                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f2f2f2; color: #e74c3c;">- R$ {stats.desconto_total:.2f}</td>
                            </tr>
                            <tr style="background-color: #f9f9f9;">
                                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f2f2f2;">Faturamento Líquido:</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; border-bottom: 1px solid #f2f2f2; color: #2ecc71;">R$ {stats.faturamento_liquido:.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f2f2f2;">Custo de Mercadorias (CMV):</td>
                                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f2f2f2; color: #e67e22;">- R$ {stats.cmv:.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f2f2f2;">Despesas Operacionais:</td>
                                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f2f2f2; color: #e74c3c;">- R$ {stats.lucro_liquido - (stats.faturamento_liquido - stats.cmv):.2f}</td>
                            </tr>
                            <tr style="background-color: #ecf0f1;">
                                <td style="padding: 8px; font-weight: bold; border-bottom: 2px solid #bdc3c7;">Lucro Líquido:</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; border-bottom: 2px solid #bdc3c7; color: { '#27ae60' if stats.lucro_liquido >= 0 else '#c0392b' };">R$ {stats.lucro_liquido:.2f}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f2f2f2;">Margem de Lucro:</td>
                                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #f2f2f2;">{stats.margem_lucro:.2f}%</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Ticket Médio:</td>
                                <td style="padding: 8px; text-align: right;">R$ {stats.ticket_medio:.2f}</td>
                            </tr>
                        </table>

                        <h3 style="color: #2980b9; margin-top: 30px; border-bottom: 1px solid #ecf0f1; padding-bottom: 5px;">
                            📦 Diagnóstico de Estoque
                        </h3>
                        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                            <tr>
                                <td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #f2f2f2;">Produtos em Ruptura (Zerados):</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; border-bottom: 1px solid #f2f2f2; color: { '#e74c3c' if stats.ruptura_count > 0 else '#7f8c8d' };">{stats.ruptura_count}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold;">Produtos com Estoque Crítico (< 10 un):</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; color: { '#e67e22' if stats.estoque_critico_count > 0 else '#7f8c8d' };">{stats.estoque_critico_count}</td>
                            </tr>
                        </table>

                        <p style="margin-top: 30px; font-size: 12px; color: #bdc3c7; text-align: center; border-top: 1px solid #eee; padding-top: 10px;">
                            Este é um e-mail automático enviado pelo Gerenciador de Lojas SaaS. Não responda a este e-mail.
                        </p>
                    </div>
                </body>
            </html>
            """

            # Dispara e-mail fictício
            assunto = f"Fechamento Diário - {tenant.nome_fantasia}"
            email_service.enviar_email(dono.email, assunto, html_content)
            processados += 1

            # Retorna a flag global para listar o próximo tenant
            db.info["ignore_tenant_filter"] = True

        return f"Processado fechamento para {processados} tenants com sucesso."
    finally:
        if should_close:
            db.close()
