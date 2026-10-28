"""criar_tabelas_devolucoes_e_credito_loja

Revision ID: d6e99fc2b358
Revises: 68fc55bf2c85
Create Date: 2026-10-28 14:06:21.750725

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd6e99fc2b358'
down_revision: Union[str, Sequence[str], None] = '68fc55bf2c85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('clientes', sa.Column('credito_loja', sa.Float(), nullable=False, server_default='0.0'))

    op.create_table(
        'devolucoes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('venda_id', sa.Uuid(), nullable=False),
        sa.Column('loja_id', sa.Uuid(), nullable=False),
        sa.Column('usuario_id', sa.Uuid(), nullable=False),
        sa.Column('cliente_id', sa.Uuid(), nullable=True),
        sa.Column('tipo', sa.String(length=20), nullable=False, server_default='DEVOLUCAO'),
        sa.Column('tipo_resolucao', sa.String(length=30), nullable=False),
        sa.Column('valor_total', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('motivo', sa.String(length=255), nullable=False),
        sa.Column('data_devolucao', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['cliente_id'], ['clientes.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['loja_id'], ['lojas.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['venda_id'], ['vendas.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'itens_devolucao',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('devolucao_id', sa.Uuid(), nullable=False),
        sa.Column('item_venda_id', sa.Uuid(), nullable=False),
        sa.Column('produto_id', sa.Uuid(), nullable=False),
        sa.Column('quantidade', sa.Integer(), nullable=False),
        sa.Column('preco_unitario', sa.Float(), nullable=False),
        sa.Column('valor_total', sa.Float(), nullable=False),
        sa.Column('retornar_ao_estoque', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('condicao', sa.String(length=20), nullable=False, server_default='PERFEITO'),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(['devolucao_id'], ['devolucoes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['item_venda_id'], ['itens_venda.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['produto_id'], ['produtos.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('itens_devolucao')
    op.drop_table('devolucoes')
    op.drop_column('clientes', 'credito_loja')
