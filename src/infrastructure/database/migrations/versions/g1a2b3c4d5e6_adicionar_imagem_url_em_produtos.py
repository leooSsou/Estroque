"""adicionar imagem_url em produtos

Revision ID: g1a2b3c4d5e6
Revises: f2a3b4c5d6e7
Create Date: 2026-11-10 11:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'g1a2b3c4d5e6'
down_revision: str | Sequence[str] | None = 'f2a3b4c5d6e7'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('produtos', sa.Column('imagem_url', sa.Text(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('produtos', 'imagem_url')
