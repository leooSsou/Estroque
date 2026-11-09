"""criar_tabelas_webhook_events_e_idempotencia

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-11-09 14:05:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'f2a3b4c5d6e7'
down_revision: str | Sequence[str] | None = 'e1f2a3b4c5d6'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Tabela webhook_events
    op.create_table(
        'webhook_events',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_id', sa.String(255), nullable=False, unique=True),
        sa.Column('gateway', sa.String(50), nullable=False, server_default='stripe'),
        sa.Column('tipo', sa.String(100), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='RECEBIDO'),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_webhook_events_event_id', 'webhook_events', ['event_id'], unique=True)

    # 2. Tabela idempotency_keys
    op.create_table(
        'idempotency_keys',
        sa.Column('id', sa.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', sa.UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('chave', sa.String(255), nullable=False),
        sa.Column('rota', sa.String(100), nullable=False),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('status_code', sa.Integer(), nullable=False),
        sa.Column('response_body', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.UniqueConstraint('tenant_id', 'rota', 'chave', name='uq_idempotency_tenant_rota_chave'),
    )
    op.create_index('ix_idempotency_keys_tenant_id', 'idempotency_keys', ['tenant_id'])
    op.create_index('ix_idempotency_keys_chave', 'idempotency_keys', ['chave'])

    # Habilita RLS se estiver rodando no PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;")
        op.execute("DROP POLICY IF EXISTS idempotency_keys_tenant_isolation_policy ON idempotency_keys;")
        op.execute("""
            CREATE POLICY idempotency_keys_tenant_isolation_policy ON idempotency_keys
            AS PERMISSIVE
            FOR ALL
            USING (
                current_setting('app.is_admin_saas', true) = 'true'
                OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            )
            WITH CHECK (
                current_setting('app.is_admin_saas', true) = 'true'
                OR tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
            );
        """)


def downgrade() -> None:
    op.drop_table('idempotency_keys')
    op.drop_table('webhook_events')
