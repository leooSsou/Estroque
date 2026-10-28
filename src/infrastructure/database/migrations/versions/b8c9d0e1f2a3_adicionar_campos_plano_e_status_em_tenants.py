"""adicionar_campos_plano_e_status_em_tenants

Revision ID: b8c9d0e1f2a3
Revises: a7e8f9b1c2d3
Create Date: 2026-10-28 15:52:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b8c9d0e1f2a3'
down_revision: Union[str, Sequence[str], None] = 'a7e8f9b1c2d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'tenants',
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true')
    )
    op.add_column(
        'tenants',
        sa.Column('plano', sa.String(length=20), nullable=False, server_default='PRO')
    )
    op.add_column(
        'tenants',
        sa.Column('limite_lojas', sa.Integer(), nullable=False, server_default='5')
    )
    op.add_column(
        'tenants',
        sa.Column('limite_usuarios', sa.Integer(), nullable=False, server_default='10')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('tenants', 'limite_usuarios')
    op.drop_column('tenants', 'limite_lojas')
    op.drop_column('tenants', 'plano')
    op.drop_column('tenants', 'ativo')
