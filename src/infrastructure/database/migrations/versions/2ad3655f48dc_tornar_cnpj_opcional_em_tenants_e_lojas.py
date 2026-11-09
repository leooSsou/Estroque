"""tornar_cnpj_opcional_em_tenants_e_lojas

Revision ID: 2ad3655f48dc
Revises: e7b9c1d2e3f4
Create Date: 2026-11-09 10:06:04.194199

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '2ad3655f48dc'
down_revision: Union[str, Sequence[str], None] = 'e7b9c1d2e3f4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('tenants', 'cnpj', existing_type=sa.String(length=14), nullable=True)
    op.alter_column('lojas', 'cnpj', existing_type=sa.String(length=14), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('lojas', 'cnpj', existing_type=sa.String(length=14), nullable=False)
    op.alter_column('tenants', 'cnpj', existing_type=sa.String(length=14), nullable=False)
