"""criar_tabela_pagamentos_venda

Revision ID: 68fc55bf2c85
Revises: d8a55bfa7e37
Create Date: 2026-10-27 20:23:37.054266

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '68fc55bf2c85'
down_revision: str | Sequence[str] | None = 'd8a55bfa7e37'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'pagamentos_venda',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('venda_id', sa.Uuid(), nullable=False),
        sa.Column('forma_pagamento', sa.String(length=20), nullable=False),
        sa.Column('valor', sa.Float(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['venda_id'], ['vendas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pagamentos_venda_tenant_id'), 'pagamentos_venda', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_pagamentos_venda_venda_id'), 'pagamentos_venda', ['venda_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_pagamentos_venda_venda_id'), table_name='pagamentos_venda')
    op.drop_index(op.f('ix_pagamentos_venda_tenant_id'), table_name='pagamentos_venda')
    op.drop_table('pagamentos_venda')
