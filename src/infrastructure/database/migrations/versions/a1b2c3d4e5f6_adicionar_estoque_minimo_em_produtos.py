"""adicionar estoque_minimo em produtos

Revision ID: a1b2c3d4e5f6
Revises: d8a55bfa7e37
Create Date: 2026-08-14 12:10:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: str | Sequence[str] | None = 'd8a55bfa7e37'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'produtos',
        sa.Column('estoque_minimo', sa.Integer(), nullable=False, server_default='0')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('produtos', 'estoque_minimo')
