"""adicionar_grade_e_variacoes_em_produtos

Revision ID: a7e8f9b1c2d3
Revises: d6e99fc2b358
Create Date: 2026-10-28 15:20:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a7e8f9b1c2d3'
down_revision: Union[str, Sequence[str], None] = 'd6e99fc2b358'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'produtos',
        sa.Column('produto_pai_id', sa.Uuid(), nullable=True)
    )
    op.add_column(
        'produtos',
        sa.Column('variacoes', sa.JSON(), nullable=True)
    )
    op.create_foreign_key(
        'fk_produtos_produto_pai_id_produtos',
        'produtos',
        'produtos',
        ['produto_pai_id'],
        ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_produtos_produto_pai_id_produtos', 'produtos', type_='foreignkey')
    op.drop_column('produtos', 'variacoes')
    op.drop_column('produtos', 'produto_pai_id')
