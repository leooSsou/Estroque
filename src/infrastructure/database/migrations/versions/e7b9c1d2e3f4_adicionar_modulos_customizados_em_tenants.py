"""adicionar_modulos_customizados_em_tenants

Revision ID: e7b9c1d2e3f4
Revises: 0a1caaa86939
Create Date: 2026-11-05 12:15:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e7b9c1d2e3f4'
down_revision: Union[str, Sequence[str], None] = '0a1caaa86939'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: adiciona modulos_customizados em tenants."""
    op.add_column(
        'tenants',
        sa.Column('modulos_customizados', sa.JSON(), nullable=True, server_default='{}')
    )


def downgrade() -> None:
    """Downgrade schema: remove modulos_customizados de tenants."""
    op.drop_column('tenants', 'modulos_customizados')
