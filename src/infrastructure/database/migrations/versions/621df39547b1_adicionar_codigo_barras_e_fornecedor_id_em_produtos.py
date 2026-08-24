"""adicionar codigo_barras e fornecedor_id em produtos

Revision ID: 621df39547b1
Revises: 510cf29436c0
Create Date: 2026-07-20 16:58:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '621df39547b1'
down_revision: str | Sequence[str] | None = '510cf29436c0'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('produtos', sa.Column('codigo_barras', sa.String(length=50), nullable=True))
    op.add_column('produtos', sa.Column('fornecedor_id', sa.Uuid(), nullable=True))
    op.create_foreign_key('fk_produtos_fornecedor_id', 'produtos', 'fornecedores', ['fornecedor_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_produtos_fornecedor_id', 'produtos', type_='foreignkey')
    op.drop_column('produtos', 'fornecedor_id')
    op.drop_column('produtos', 'codigo_barras')
