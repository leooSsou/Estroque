"""criar_tabelas_caixa_turnos_e_operacoes

Revision ID: c1a2b3d4e5f6
Revises: 2ad3655f48dc
Create Date: 2026-11-09 11:15:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'c1a2b3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '2ad3655f48dc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: cria tabelas de caixa_turnos e caixa_operacoes."""
    op.create_table(
        'caixa_turnos',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('loja_id', sa.Uuid(), nullable=False),
        sa.Column('usuario_id', sa.Uuid(), nullable=False),
        sa.Column('operador_nome', sa.String(length=100), nullable=False),
        sa.Column('aberto', sa.Boolean(), server_default='1', nullable=False),
        sa.Column('fundo_inicial', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('data_abertura', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('data_fechamento', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_vendas_dinheiro', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('total_suprimentos', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('total_sangrias', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('saldo_esperado', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('saldo_informado', sa.Float(), nullable=True),
        sa.Column('diferenca', sa.Float(), nullable=True),
        sa.Column('observacao', sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['loja_id'], ['lojas.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_caixa_turnos_tenant_id'), 'caixa_turnos', ['tenant_id'], unique=False)
    op.create_index(op.f('ix_caixa_turnos_loja_id'), 'caixa_turnos', ['loja_id'], unique=False)

    op.create_table(
        'caixa_operacoes',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('turno_id', sa.Uuid(), nullable=False),
        sa.Column('tenant_id', sa.Uuid(), nullable=False),
        sa.Column('loja_id', sa.Uuid(), nullable=False),
        sa.Column('usuario_id', sa.Uuid(), nullable=False),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('valor', sa.Float(), nullable=False),
        sa.Column('motivo', sa.String(length=255), nullable=False),
        sa.Column('data_hora', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('operador_nome', sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(['turno_id'], ['caixa_turnos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['loja_id'], ['lojas.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['usuario_id'], ['usuarios.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_caixa_operacoes_turno_id'), 'caixa_operacoes', ['turno_id'], unique=False)
    op.create_index(op.f('ix_caixa_operacoes_tenant_id'), 'caixa_operacoes', ['tenant_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_caixa_operacoes_tenant_id'), table_name='caixa_operacoes')
    op.drop_index(op.f('ix_caixa_operacoes_turno_id'), table_name='caixa_operacoes')
    op.drop_table('caixa_operacoes')
    op.drop_index(op.f('ix_caixa_turnos_loja_id'), table_name='caixa_turnos')
    op.drop_index(op.f('ix_caixa_turnos_tenant_id'), table_name='caixa_turnos')
    op.drop_table('caixa_turnos')
