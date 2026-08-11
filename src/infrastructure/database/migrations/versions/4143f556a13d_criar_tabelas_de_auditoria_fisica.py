"""criar tabelas de auditoria fisica

Revision ID: 4143f556a13d
Revises: f60703ae87f2
Create Date: 2026-07-27 19:29:24.055849

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '4143f556a13d'
down_revision: str | Sequence[str] | None = 'f60703ae87f2'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'auditorias_fisicas',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('loja_id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('data_auditoria', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['loja_id'], ['lojas.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_table(
        'auditoria_fisica_itens',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('auditoria_id', sa.Uuid(), nullable=False),
        sa.Column('produto_id', sa.Uuid(), nullable=False),
        sa.Column('quantidade_fisica', sa.Integer(), nullable=False),
        sa.Column('quantidade_sistema', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['auditoria_id'], ['auditorias_fisicas.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('auditoria_fisica_itens')
    op.drop_table('auditorias_fisicas')
